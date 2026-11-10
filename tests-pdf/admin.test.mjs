import test from 'node:test';
import assert from 'node:assert/strict';
import {administratorEntitlement} from '../worker/pdf-quiz/entitlement.mjs';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
const require=createRequire(import.meta.url);
const esbuild=await import(require.resolve('esbuild',{paths:[require.resolve('wrangler')]}));
const {Miniflare,convertV4MiniflareOptions}=await import(process.env.MINIFLARE_TEST_MODULE || 'miniflare');
test('admin requires explicit server flag and exact authenticated owner identity',()=>{
 const env={PROMO_ADMIN_EMAIL:'Owner@example.com',PDF_ADMIN_ENABLED:'true'},now=Date.UTC(2026,10,10);
 const ent=administratorEntitlement(env,'owner@example.com',now);
 assert.equal(ent.kind,'administrator');assert.equal(ent.start,Date.UTC(2026,10,1));assert.equal(ent.end,Date.UTC(2026,11,1));
 for(const email of [null,'','other@example.com','owner@example.com.attacker','owner+alias@example.com'])assert.equal(administratorEntitlement(env,email,now),null);
 assert.equal(administratorEntitlement({...env,PDF_ADMIN_ENABLED:'false'},'owner@example.com',now),null);
 assert.equal(administratorEntitlement({PDF_ADMIN_ENABLED:'true'},'owner@example.com',now),null);
});
test('admin ledger preserves retries and revocation, ordinary customers still have three credits',async()=>{
 const code=`import {DurableObject} from 'cloudflare:workers';import {Ledger} from './worker/pdf-quiz/ledger.mjs';
 export class LedgerTest extends DurableObject {async fetch(req){const a=await req.json();const l=new Ledger(this.ctx.storage);try {const ent={start:1,end:9999999999999,invoice:'test',...(a.admin?{kind:'administrator'}:{})};if(a.id){const r=l.reserve(a.id,a.id,ent,100);if(!r.replay)l.complete(r,{id:a.id},a.revoke?{...ent,kind:undefined}:ent,101);}return Response.json(l.status(ent,102));}catch(e){return Response.json({code:e.code},{status:e.status});}}}
 export default {fetch(req,env){return env.LEDGER.get(env.LEDGER.idFromName(new URL(req.url).pathname)).fetch(req)}};`;
 await fs.mkdir('build',{recursive:true});await esbuild.build({stdin:{contents:code,resolveDir:process.cwd()},outfile:'build/admin-test.mjs',bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const options={modules:true,scriptPath:'build/admin-test.mjs',compatibilityDate:'2026-05-01',host:'127.0.0.1',port:0,durableObjects:{LEDGER:{className:'LedgerTest',useSQLite:true}}};
 const mf=new Miniflare(convertV4MiniflareOptions ? convertV4MiniflareOptions(options) : options);
 const call=async(path,body)=>{const r=await mf.dispatchFetch('http://localhost/'+path,{method:'POST',body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 try{await mf.ready;
 for(let n=0;n<4;n++)assert.equal((await call('admin',{id:String(n),admin:true})).status,200);
 const replay=await call('admin',{id:'0',admin:true});assert.equal(replay.data.used,4);assert.equal(replay.data.limit,null);
 assert.equal((await call('revoke',{id:'0',admin:true,revoke:true})).status,409);
 assert.equal((await call('customer',{id:'0'})).status,200);assert.equal((await call('customer',{id:'1'})).status,200);assert.equal((await call('customer',{id:'2'})).status,200);assert.equal((await call('customer',{id:'3'})).status,429);
 }finally{await mf.dispose();}
});
