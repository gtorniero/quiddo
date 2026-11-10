import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
const require=createRequire(import.meta.url);
const esbuild=await import(require.resolve('esbuild',{paths:[require.resolve('wrangler')]}));
const {Miniflare}=await import(process.env.MINIFLARE_TEST_MODULE || 'miniflare');
const code=`export {PdfBudget} from './worker/pdf-quiz/budget.mjs';
export default {async fetch(request,env){const a=await request.json(); const b=env.BUDGET.get(env.BUDGET.idFromName('persistent'));
try {if(a.op==='reserve') await b.reserve(a.id); if(a.op==='settle') await b.settle(a.id,a.cost,{}); return Response.json(await b.summary());}
catch {return Response.json({error:'budget_exhausted'},{status:503});}}};`;
await fs.mkdir('build',{recursive:true});
await esbuild.build({stdin:{contents:code,resolveDir:process.cwd()},outfile:'build/budget-test.mjs',bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers']});
async function runtime(limit){
 const mf=new Miniflare({modules:true,scriptPath:'build/budget-test.mjs',compatibilityDate:'2026-05-01',host:'127.0.0.1',port:0,durableObjects:{BUDGET:{className:'PdfBudget',useSQLite:true}},bindings:{PDF_BUDGET_USD:limit}});
 await mf.ready;
 return {mf,call: async body=>{const r=await mf.dispatchFetch('http://localhost/',{method:'POST',body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}};
}
test('persistent cost cap allows more than eight low-cost calls but reserves unknown costs and blocks overspending',async()=>{
 const {mf,call}=await runtime('1');
 try {
  for(let i=0;i<9;i++){
   assert.equal((await call({op:'reserve',id:'job-'+i})).status,200);
   assert.equal((await call({op:'settle',id:'job-'+i,cost:{usd:0.001}})).status,200);
  }
  const duplicate=await call({op:'reserve',id:'job-0'});assert.equal(duplicate.data.entries.length,9);
  const pending=await call({op:'reserve',id:'unknown'});assert.equal(pending.status,200);assert.equal(pending.data.available,false);
  assert.equal((await call({op:'reserve',id:'too-much'})).status,503);
  const missing=await call({op:'settle',id:'unknown',cost:null});assert.equal(missing.data.unreportedReserveUSD,0.55);
  const settled=await call({op:'settle',id:'unknown',cost:{usd:0.002}});assert.equal(settled.data.available,true);
  const race=await Promise.all([call({op:'reserve',id:'parallel-a'}),call({op:'reserve',id:'parallel-b'})]);assert.deepEqual(race.map(x=>x.status).sort(),[200,503]);
 } finally {await mf.dispose();}
});
test('invalid allowance fails closed and an oversized configuration is clamped to USD 1',async()=>{
 for(const value of ['0','-1','NaN','Infinity','100']){
  const {mf,call}=await runtime(value);
  try {const r=await call({op:'reserve',id:'probe'});assert.equal(r.status,value==='100'?200:503);if(value==='100')assert.equal(r.data.limitUSD,1);}
  finally {await mf.dispose();}
 }
});
