import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
const require=createRequire(import.meta.url);
const esbuild=await import(require.resolve('esbuild',{paths:[require.resolve('wrangler')]}));
const {Miniflare,convertV4MiniflareOptions}=await import(process.env.MINIFLARE_TEST_MODULE || 'miniflare');

test('administrator text generation uses real handler and ledger without subscription; replay is free and outsiders denied',async()=>{
 const code=`export {PdfBudget} from './worker/pdf-quiz/budget.mjs';
 import {PdfAccount} from './worker/pdf-quiz/account.mjs';
 import {administratorEntitlement} from './worker/pdf-quiz/entitlement.mjs';
 import {PdfError} from './worker/pdf-quiz/core.mjs';
 import {fixture} from './tests-pdf/fixtures.mjs';
 // Only the billing/provider boundaries are fixtures; handler and SQLite ledger are unchanged.
 export class AdminAccount extends PdfAccount {
  async settings(){return fixture({billing:null});}
  async entitlement(email){const ent=administratorEntitlement(this.env,email);if(!ent)throw new PdfError('denied','Forbidden',403);return ent;}
 }
 export default {fetch(req,env){return env.ACCOUNTS.get(env.ACCOUNTS.idFromName('owner')).fetch(req);}};`;
 await fs.mkdir('build',{recursive:true});
 await esbuild.build({stdin:{contents:code,resolveDir:process.cwd()},outfile:'build/admin-text-test.mjs',bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const options={modules:true,scriptPath:'build/admin-text-test.mjs',compatibilityDate:'2026-05-01',host:'127.0.0.1',port:0,durableObjects:{ACCOUNTS:{className:'AdminAccount',useSQLite:true},PDF_BUDGET:{className:'PdfBudget',useSQLite:true}},bindings:{PDF_STAGE:'isolated',PDF_ADMIN_ENABLED:'true',PROMO_ADMIN_EMAIL:'owner@example.com'}};
 const mf=new Miniflare(convertV4MiniflareOptions?convertV4MiniflareOptions(options):options);
 const call=async(id,email='owner@example.com')=>{const r=await mf.dispatchFetch('http://localhost/api/pdf/generate-text',{method:'POST',headers:{'x-qd-pdf-owner':email,'content-type':'text/plain','idempotency-key':id},body:'Regras de atendimento da empresa fictícia Vento'});return {status:r.status,data:await r.json()};};
 try{
  await mf.ready;
  assert.equal((await call(crypto.randomUUID(),'other@example.com')).status,403);
  const id=crypto.randomUUID(),first=await call(id);assert.equal(first.status,200,JSON.stringify(first.data));assert.equal(first.data.result.source,'text');
  const replay=await call(id);assert.equal(replay.data.replayed,true);assert.deepEqual(replay.data.result,first.data.result);
  for(let n=0;n<3;n++)assert.equal((await call(crypto.randomUUID())).status,200);
  const r=await mf.dispatchFetch('http://localhost/api/pdf/status',{headers:{'x-qd-pdf-owner':'owner@example.com'}});
  const status=await r.json();assert.equal(status.limit,null);assert.equal(status.used,4);assert.equal(status.paidPeriod.kind,'administrator');
 }finally{await mf.dispose();}
});
