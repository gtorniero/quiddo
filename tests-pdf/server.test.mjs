import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const {Miniflare}=await import(process.env.MINIFLARE_TEST_MODULE || 'miniflare');
import {PDFDocument} from '../vendor/pdf-lib.js';
import {fixture,renew} from './fixtures.mjs';
async function sample(pages){const doc=await PDFDocument.create();for(let n=0;n<pages;n++)doc.addPage().drawText('Fictional test page '+(n+1));return Buffer.from(await doc.save());}
const pdf=await sample(52);const scan=await sample(8);
const origin='http://localhost',gate=crypto.randomUUID()+crypto.randomUUID();
const evidence={kind:'Local Cloudflare workerd + SQLite Durable Objects; provider and billing fixtures',cases:[],started:new Date().toISOString()};
let mf; let fixtureIP=1;
async function call(path,{cookie='',body,method=body===undefined?'GET':'POST',headers={},auth=true}={}){
 const r=await mf.dispatchFetch(origin+path,{method,headers:{...(auth?{authorization:'Bearer '+gate}:{}),origin,cookie,...headers},body:body===undefined?undefined:typeof body==='object'&&!Buffer.isBuffer(body)?JSON.stringify(body):body});
 const d=await r.json().catch(()=>null);return {status:r.status,data:d,cookie:r.headers.get('set-cookie')?.split(';')[0]||''};
}
async function user(name){const email=name+'@quiddo.example';const a=await call('/api/login',{body:{email},headers:{'cf-connecting-ip':'192.0.2.'+(fixtureIP++)}});assert.equal(a.status,200);const b=await call('/api/login/codigo',{body:{email,codigo:a.data.codigo}});assert.equal(b.status,200);return b.cookie;}
const seed=(cookie,s)=>call('/__staging/fixture',{cookie,body:s});
const status=cookie=>call('/api/pdf/status',{cookie});
const generate=(cookie,id=crypto.randomUUID(),pages='2-51',bytes=pdf,extra={})=>call('/api/pdf/generate?pages='+encodeURIComponent(pages),{cookie,body:bytes,headers:{'content-type':'application/pdf','idempotency-key':id,...extra}});
function record(name,details){evidence.cases.push({name,passed:true,...details});}

test('HTTP routes, real durable storage, quota, isolation, concurrency, renewal and failures',async()=>{
 mf=new Miniflare({modules:true,scriptPath:'build/pdf-stage.mjs',compatibilityDate:'2026-05-01',host:'127.0.0.1',port:0,
  durableObjects:{PDF_ACCOUNTS:{className:'PdfAccount',useSQLite:true},PDF_BUDGET:{className:'PdfBudget',useSQLite:true}},d1Databases:{DB:'pdf-isolated-test'},
  bindings:{PDF_STAGE:'isolated',PDF_ENABLED:'true',COBRANCA:'simulacao',STAGING_ACCESS_TOKEN:gate,PDF_BUDGET_USD:'1'},
  serviceBindings:{ASSETS:async()=>new Response('isolated assets')},log:undefined});
 try{
  await mf.ready;
  assert.equal((await call('/api/pdf/status',{auth:false})).status,401);
  assert.equal((await call('/api/pdf/status')).status,401);
  record('Private gate and session required');
  const owner=await user('monthly-main'),s=fixture();assert.equal((await seed(owner,s)).status,200);
  assert.equal((await call('/api/conta')).data.email,null);
  assert.equal((await call('/api/conta',{cookie:owner})).data.email,'monthly-main@quiddo.example');
  assert.equal((await status(owner)).data.remaining,2);
  const first=crypto.randomUUID(),a=await generate(owner,first);assert.equal(a.status,200,JSON.stringify(a.data));assert.equal(a.data.status,'delivered');
  assert.equal((await status(owner)).data.remaining,1);
  const again=await generate(owner,first);assert.deepEqual(again.data.result,a.data.result);assert.equal(again.data.replayed,true);
  const lost=await call('/api/pdf/jobs/'+first,{cookie:owner});assert.deepEqual(lost.data.result,a.data.result);
  assert.equal((await generate(owner,first,'2-3')).status,409);
  assert.equal((await status(owner)).data.remaining,1);
  const b=await generate(owner);assert.equal(b.status,200);
  assert.equal((await status(owner)).data.remaining,0);
  assert.equal((await generate(owner)).status,429);
  await call('/api/pdf/history',{cookie:owner});await call('/api/pdf/jobs/'+first,{cookie:owner});
  assert.equal((await status(owner)).data.remaining,0);
  const sameOwnerOtherBrowser=await user('monthly-main');assert.equal((await status(sameOwnerOtherBrowser)).data.remaining,0);
  const ev=await call('/__staging/evidence',{cookie:owner});assert.equal(ev.data.attempts.length,2);assert.ok(ev.data.attempts.every(x=>x.detail.selectedCount===50 && x.detail.selectedPages[0]===2 && x.detail.selectedPages[49]===51));
  record('2 → 1 → 0; third denied; retry and lost response identical; other browser same quota; exactly 50 selected pages',{ids:[first,b.data.id],remaining:0,serverEvidence:ev.data});
  const intruder=await user('other-owner');await seed(intruder,fixture());assert.equal((await call('/api/pdf/jobs/'+first,{cookie:intruder})).status,404);record('Other account cannot read saved delivery');
  const failure=await user('failures'),f=fixture({providerMode:'failure'});await seed(failure,f);const retryId=crypto.randomUUID();assert.equal((await generate(failure,retryId)).status,502);assert.equal((await status(failure)).data.remaining,2);
  f.providerMode='refusal';await seed(failure,f);assert.equal((await generate(failure,retryId)).status,422);assert.equal((await status(failure)).data.remaining,2);
  f.providerMode='malformed';await seed(failure,f);assert.equal((await generate(failure,retryId)).status,502);assert.equal((await status(failure)).data.remaining,2);
  f.providerMode='mock';await seed(failure,f);assert.equal((await generate(failure,retryId)).status,200);assert.equal((await status(failure)).data.remaining,1);
  record('Failure, refusal and invalid output debit zero; successful retry debits once');
  const race=await user('concurrent'),r=fixture();await seed(race,r);assert.equal((await generate(race)).status,200);r.providerMode='delayed';await seed(race,r);
  const pair=await Promise.all([generate(race),generate(race)]);assert.deepEqual(pair.map(x=>x.status).sort(),[200,429]);assert.equal((await status(race)).data.remaining,0);record('Two different requests compete for final credit; exactly one delivery',{statuses:pair.map(x=>x.status)});
  const dup=await user('duplicate-pending');await seed(dup,fixture({providerMode:'delayed'}));const dupId=crypto.randomUUID();const dupPair=await Promise.all([generate(dup,dupId),generate(dup,dupId)]);assert.deepEqual(dupPair.map(x=>x.status).sort(),[200,202]);assert.equal((await status(dup)).data.remaining,1);record('Concurrent identical key creates one delivery',{statuses:dupPair.map(x=>x.status)});
  const migration=structuredClone(s);migration.billing.subscription.id='sub_replacement';migration.billing.invoice.parent.subscription_details.subscription='sub_replacement';migration.billing.invoice.lines.data[0].parent.subscription_item_details.subscription='sub_replacement';migration.billing.invoice.id='in_replacement';await seed(owner,migration);assert.equal((await status(owner)).data.remaining,0);record('Replacement subscription in same paid period does not reset quota');
  const next=renew(migration);await seed(owner,next);assert.equal((await status(owner)).data.remaining,2);assert.equal((await call('/api/pdf/jobs/'+first,{cookie:owner})).status,200);assert.equal((await generate(owner)).status,200);assert.equal((await status(owner)).data.remaining,1);record('Simulated next paid cycle grants 2; previous delivery remains recoverable');
  const revoke=await user('revoked-during'),rv=fixture({providerMode:'delayed'});await seed(revoke,rv);const pending=generate(revoke);await new Promise(resolve=>setTimeout(resolve,150));rv.billing.risk='refund';await seed(revoke,rv);assert.equal((await pending).status,403);rv.billing.risk='';await seed(revoke,rv);assert.equal((await status(revoke)).data.remaining,2);record('Entitlement revoked during processing blocks delivery and preserves credit');
  const fencing=await user('expired-reservation'),fx=fixture({providerMode:'delayed'});await seed(fencing,fx);const fencedId=crypto.randomUUID();const oldAttempt=generate(fencing,fencedId);await new Promise(resolve=>setTimeout(resolve,150));fx.now=Date.now()+300000;await seed(fencing,fx);const newAttempt=generate(fencing,fencedId);const fenced=await Promise.all([oldAttempt,newAttempt]);assert.deepEqual(fenced.map(x=>x.status),[409,200]);assert.equal((await status(fencing)).data.remaining,1);record('Expired reservation reclaimed; stale attempt cannot overwrite or debit new delivery',{statuses:fenced.map(x=>x.status)});
  const validation=await user('invalid-input');await seed(validation,fixture());assert.equal((await generate(validation,crypto.randomUUID(),'1-51')).status,400);assert.equal((await generate(validation,crypto.randomUUID(),'1',Buffer.from('not a pdf'))).status,400);assert.equal((await generate(validation,crypto.randomUUID(),'1',pdf,{'content-type':'image/png'})).status,415);assert.equal((await status(validation)).data.remaining,2);record('51 selected pages, fake PDF and wrong format rejected before debit');
  const scanning=await user('scan');const sc=fixture();sc.quiz.questions[0].page=1;await seed(scanning,sc);const scanResult=await generate(scanning,crypto.randomUUID(),'1-8',scan);assert.equal(scanResult.status,200);record('Eight-page PDF parsed and selected on server; provider mocked',{pages:8});
  for(const plan of ['free','pass','courtesy','annual','unpaid']){
   const u=await user('plan-'+plan),x=fixture();if(['free','pass','courtesy'].includes(plan))x.billing=null;else if(plan==='annual')x.billing.subscription.items.data[0].price.recurring.interval='year';else x.billing.invoice.status='open';await seed(u,x);assert.equal((await generate(u)).status,403);record('Denied noneligible plan: '+plan);
  }
  const noKey=await user('no-key');await seed(noKey,fixture({providerMode:'real'}));assert.equal((await generate(noKey)).status,503);assert.equal((await status(noKey)).data.remaining,2);record('Missing provider key does not spend a subscriber credit');
  await call('/api/pdf/jobs/'+b.data.id,{cookie:owner,method:'DELETE'});assert.equal((await call('/api/pdf/jobs/'+b.data.id,{cookie:owner})).data.result.deleted,true);record('Content erasure keeps debit tombstone');
  const last=await call('/__staging/evidence',{cookie:owner});assert.equal(last.data.budget.entries.length,0);evidence.realProviderCalls=0;evidence.providerCostUSD=null;
 }finally{
  evidence.finished=new Date().toISOString();if(process.env.PDF_TEST_EVIDENCE)await fs.writeFile(process.env.PDF_TEST_EVIDENCE,JSON.stringify(evidence,null,2)+'\n');await mf?.dispose();
 }
},{timeout:120000});
