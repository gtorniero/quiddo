import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import {PDFDocument} from '../vendor/pdf-lib.js';
import {fixture,renew} from './fixtures.mjs';
import {MONTHLY_PRICE} from '../worker/pdf-quiz/core.mjs';

const {Miniflare,convertV4MiniflareOptions}=await import(process.env.MINIFLARE_TEST_MODULE || 'miniflare');
const stage='http://localhost';
const pdfDoc=await PDFDocument.create();
pdfDoc.addPage().drawText('Documento ficticio do teste de renovacao.');
const pdf=Buffer.from(await pdfDoc.save());
for(const split of [false,true])test('isolated webhook refills '+(split?'separate':'shared')+' credits once per paid cycle',async()=>{
 const gate=randomUUID(),secret='whsec_'+randomUUID(),first=fixture(),next=renew(first);
 const sub=first.billing.subscription.id;
 let billing=first.billing;
 for(const period of [first,next])period.billing.subscription.items.data[0].price.active=true;
 const stripeFixture=async req=>{
   const url=new URL(req.url);
   if(url.origin==='https://api.stripe.com'&&url.pathname==='/v1/subscriptions/'+sub) return Response.json({...billing.subscription,latest_invoice:billing.invoice});
   return Response.json({error:'unmatched_test_endpoint'},500);
 };
 const options={modules:true,scriptPath:'build/pdf-stage.mjs',compatibilityDate:'2026-05-01',host:'127.0.0.1',port:0,outboundService:stripeFixture,
   durableObjects:{PDF_ACCOUNTS:{className:'PdfAccount',useSQLite:true},PDF_BUDGET:{className:'PdfBudget',useSQLite:true}},d1Databases:{DB:'stripe-renewal-local'},
   bindings:{PDF_STAGE:'isolated',PDF_STRIPE_TEST:'true',PDF_SPLIT_CREDITS:String(split),PDF_ENABLED:'true',COBRANCA:'simulacao',STAGING_ACCESS_TOKEN:gate,STRIPE_KEY:'rk_test_fixture',STRIPE_WEBHOOK_SECRET:secret,STRIPE_PRICE_MENSAL:MONTHLY_PRICE,STRIPE_PORTAL_CONFIG:'bpc_fixture'},
   serviceBindings:{ASSETS:async()=>new Response('isolated assets')}};
 const mf=new Miniflare(convertV4MiniflareOptions?convertV4MiniflareOptions(options):options);
 let cookie='';
 async function call(path,{body,type='application/json',id,signature,webhook=false,expected=200}={}){
   const r=await mf.dispatchFetch(stage+path,{method:body===undefined?'GET':'POST',body:body===undefined?undefined:typeof body==='string'||Buffer.isBuffer(body)?body:JSON.stringify(body),headers:{
    ...(webhook?{}:{origin:stage,authorization:'Bearer '+gate,cookie}),...(body!==undefined?{'content-type':type}:{}),...(id?{'idempotency-key':id}:{}),...(signature?{'stripe-signature':signature}:{}),
   }});
   const data=await r.json();
   assert.equal(r.status,expected,path+' '+JSON.stringify(data));
   if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];
   return data;
 }
 async function event(invoice,{expected=200,live=false,sign=true}={}){
   const body=JSON.stringify({id:'evt_'+(invoice.id||'init'),object:'event',type:'invoice.paid',livemode:live,data:{object:invoice}});
   const now=Math.floor(Date.now()/1000);
   const sig=createHmac('sha256',secret).update(now+'.'+body).digest('hex');
   return call('/api/stripe-webhook-test',{body,signature:sign?`t=${now},v1=${sig}`:null,expected,webhook:true});
 }
 const status=(expected=200)=>call('/api/pdf/status',{expected});
 const generatePdf=(expected=200)=>call('/api/pdf/generate?pages=1',{body:pdf,type:'application/pdf',id:randomUUID(),expected});
 const generate=(expected=200)=>call('/api/pdf/generate-text',{body:'Quiz de família',type:'text/plain',id:randomUUID(),expected});
 try {
   await mf.ready;
   await event(first.billing.invoice,{sign:false,expected:401});
   await event(first.billing.invoice,{live:true,expected:400});
   await event({id:'in_bootstrap'});
   const db=await mf.getD1Database('DB');
   const email='renovacao@quiddo.example',customer=first.billing.customer;
   await db.batch([
    db.prepare("INSERT INTO compras(ref,ordem,email,valor,modo,tipo,stripe_price,plano,status) VALUES (?,?,?,?, 'teste','assinatura',?,'mensal','pendente')").bind('ref_stripe_stage','stripe:cs_test_fixture',email,'15.99',MONTHLY_PRICE),
    db.prepare("INSERT INTO qd_clientes_stripe(email,modo,customer) VALUES (?,'teste',?)").bind(email,customer),
    db.prepare("INSERT INTO qd_assinaturas(id,ref,customer,status,price,modo) VALUES (?,?,?,'active',?,'teste')").bind(sub,'ref_stripe_stage',customer,MONTHLY_PRICE),
   ]);
   const login=await call('/api/login',{body:{email}});
   await call('/api/login/codigo',{body:{email,codigo:login.codigo}});
   first.quiz.questions[0].page=1;
   await call('/__staging/fixture',{body:{providerMode:'mock',quiz:first.quiz}});
   assert.equal((await status(409)).code,'webhook_pending');
   await event(first.billing.invoice);
   const starting=await status();
   assert.equal(starting.remaining,2);
   if(split){
     assert.deepEqual([starting.balances.text.remaining,starting.balances.pdf.remaining],[5,2]);
     await generatePdf();await generatePdf();
     await generatePdf(429);
     assert.equal((await status()).balances.text.remaining,5);
     for(let n=0;n<5;n++)await generate();
   }else{await generate();await generatePdf();}
   assert.equal((await status()).remaining,0);
   await generate(429);
   billing=next.billing;
   await call('/__staging/fixture',{body:{providerMode:'mock',quiz:first.quiz,now:next.now}});
   assert.equal((await status(409)).code,'webhook_pending');
   await event(next.billing.invoice);
   const renewed=await status();
   assert.equal(renewed.remaining,2);
   if(split)assert.deepEqual([renewed.balances.text.remaining,renewed.balances.pdf.remaining],[5,2]);
   assert.equal((await db.prepare('SELECT paid_until FROM qd_assinaturas WHERE id=?').bind(sub).first()).paid_until,next.billing.invoice.lines.data[0].period.end);
   await generate();
   await event(next.billing.invoice);
   const afterReplay=await status();
   if(split)assert.deepEqual([afterReplay.balances.text.remaining,afterReplay.balances.pdf.remaining],[4,2]);
   else assert.equal(afterReplay.remaining,1);
 }finally{await mf.dispose();}
},{timeout:30000});

test('split balances preserve old text debits after content deletion and preserve PDF debits',async()=>{
 const {DatabaseSync}=await import('node:sqlite');
 const {Ledger}=await import('../worker/pdf-quiz/ledger.mjs');
 const db=new DatabaseSync(':memory:');
 try{
   db.exec("CREATE TABLE pdf_jobs (id TEXT PRIMARY KEY,fingerprint TEXT NOT NULL,cycle TEXT NOT NULL,state TEXT NOT NULL,attempt TEXT NOT NULL,lease INTEGER NOT NULL,result TEXT,error TEXT,created INTEGER NOT NULL)");
   db.exec("CREATE TABLE pdf_attempts (id TEXT PRIMARY KEY,job TEXT NOT NULL,detail TEXT NOT NULL)");
   const insert=db.prepare("INSERT INTO pdf_jobs VALUES (?,?,'1-100','delivered',?,0,?,NULL,1)");
   insert.run('pdf','pdf','a-pdf',JSON.stringify({title:'PDF'}));
   insert.run('text','text','a-text',JSON.stringify({source:'text'}));
   insert.run('deleted','deleted','a-deleted',JSON.stringify({deleted:true}));
   db.prepare('INSERT INTO pdf_attempts VALUES (?,?,?)').run('a-deleted','deleted',JSON.stringify({source:'text'}));
   const ledger=new Ledger({sql:{exec(query,...params){
     const statement=db.prepare(query);
     if(/^(SELECT|PRAGMA)\b/i.test(query))return statement.all(...params);
     statement.run(...params);return [];
   }},transactionSync(fn){
     db.exec('BEGIN');
     try{const result=fn();db.exec('COMMIT');return result;}
     catch(error){db.exec('ROLLBACK');throw error;}
   }},{split:true});
   const status=ledger.status({start:1,end:100,invoice:'cycle'},10);
   assert.deepEqual([status.balances.text.remaining,status.balances.pdf.remaining],[3,1]);
 }finally{db.close();}
});
