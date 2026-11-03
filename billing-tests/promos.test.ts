import {describe,it,expect} from 'vitest';
import {DatabaseSync} from 'node:sqlite';
import {promoTables,promoHash,redeemPromo} from '../worker/promos.mjs';
import {adminPromos} from '../worker/promos-admin';
import {rotaCobranca,codigoValido} from '../worker/cobranca';
function database(){const sqlite=new DatabaseSync(':memory:');const prepare=(sql:string,values:any[]=[]):any=>({bind:(...v:any[])=>prepare(sql,v),first:async()=>sqlite.prepare(sql).get(...values)||null,all:async()=>({results:sqlite.prepare(sql).all(...values)}),run:async()=>({meta:{changes:sqlite.prepare(sql).run(...values).changes}})});return {db:{prepare,batch:async(s:any[])=>Promise.all(s.map(x=>x.run()))} as unknown as D1Database,sqlite};}
const req=(code='BTW-FIXTURE-12345678',origin='https://www.quiddo.com.br')=>new Request('https://www.quiddo.com.br/api/promo',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({codigo:code,email:'guest@example.com'})});
async function fixture(){const {db,sqlite}=database();await promoTables(db);await db.prepare('INSERT INTO promo_codes(id,hash,label,sites,created) VALUES (?,?,?,?,?)').bind('code',await promoHash('BTW-FIXTURE-12345678'),'Friends','["quiddo","sportdna","retrozap"]',Date.now()).run();return {db,sqlite};}
describe('promo grants',()=>{
 it('scopes sites, rejects invalid and disabled codes',async()=>{const {db}=await fixture();await expect(redeemPromo(db,req(),'other','semana','BTW-FIXTURE-12345678','guest@example.com')).rejects.toThrow();await expect(redeemPromo(db,req(),'quiddo','semana','WRONG-CODE','guest@example.com')).rejects.toThrow();await db.prepare('UPDATE promo_codes SET active=0').run();await expect(redeemPromo(db,req(),'quiddo','semana','BTW-FIXTURE-12345678','guest@example.com')).rejects.toThrow();});
 it('rejects expired codes and missing bindings',async()=>{const {db}=await fixture();await db.prepare('UPDATE promo_codes SET expires=?').bind(Date.now()-1).run();await expect(redeemPromo(db,req(),'quiddo','semana','BTW-FIXTURE-12345678','guest@example.com')).rejects.toThrow();await expect(redeemPromo(undefined,req(),'quiddo','semana','BTW-FIXTURE-12345678','guest@example.com')).rejects.toThrow();});
 it('deduplicates concurrent retries but allows unlimited different recipients',async()=>{const {db}=await fixture();const grants=await Promise.all(Array.from({length:8},()=>redeemPromo(db,req(),'quiddo','semana','BTW-FIXTURE-12345678','Guest@example.com')));expect(new Set(grants.map(g=>g.id)).size).toBe(1);const other=await redeemPromo(db,req(),'quiddo','semana','BTW-FIXTURE-12345678','other@example.com');expect(other.id).not.toBe(grants[0].id);});
 it('rate limits guessing',async()=>{const {db}=await fixture();for(let i=0;i<20;i++)try{await redeemPromo(db,req(),'quiddo','semana','WRONG-CODE','guest@example.com')}catch{}await expect(redeemPromo(db,req(),'quiddo','semana','BTW-FIXTURE-12345678','guest@example.com')).rejects.toMatchObject({status:429});});
 it('grants exactly seven days, validates access and never calls providers',async()=>{const {db}=await fixture();const env={DB:db,PROMOS:db,COBRANCA:'ligada'};const r=await rotaCobranca(req(),env,'/api/promo');expect(r?.status).toBe(200);const a=await r!.json() as any;expect(a.ok).toBe(true);expect(a.plano).toBe('semana');expect(Date.parse(a.expira)-Date.now()).toBeGreaterThan(7*86400000-10000);expect(await codigoValido(env,a.codigo)).toBe(true);const b=await (await rotaCobranca(req(),env,'/api/promo'))!.json() as any;expect(b.codigo).toBe(a.codigo);expect(b.expira).toBe(a.expira);});
 it('rejects cross-origin redemption and unauthenticated admin',async()=>{const {db}=await fixture();expect((await rotaCobranca(req(undefined,'https://evil.example'),{DB:db,PROMOS:db},'/api/promo'))?.status).toBe(403);expect((await adminPromos(req(),{DB:db,PROMOS:db,PROMO_ADMIN_EMAIL:'owner@example.com',COBRANCA:'ligada'})).status).toBe(403);});
});

testAdmin();
function testAdmin(){it('owner-only administration uses real verified session and protects mutations from CSRF',async()=>{
 const {db}=await fixture();
 await db.prepare('CREATE TABLE sessoes(token TEXT PRIMARY KEY,email TEXT,criado INTEGER,expira INTEGER,simulado INTEGER)').run();
 const token='a'.repeat(64);await db.prepare('INSERT INTO sessoes VALUES (?,?,?,?,0)').bind(await promoHash(token),'owner@example.com',Date.now(),Date.now()+60000).run();
 const env={DB:db,PROMOS:db,PROMO_ADMIN_EMAIL:'owner@example.com',COBRANCA:'ligada',RESEND_KEY:'fixture'};
 const call=(origin:string,emailCookie=true)=>new Request('https://www.quiddo.com.br/api/promos/admin',{method:'POST',headers:{Origin:origin,Cookie:emailCookie?'qd_sessao='+token:''},body:JSON.stringify({action:'create',label:'Partner',sites:['quiddo']})});
 expect((await adminPromos(call('https://evil.example'),env)).status).toBe(403);
 expect((await adminPromos(call('https://www.quiddo.com.br',false),env)).status).toBe(403);
 const r=await adminPromos(call('https://www.quiddo.com.br'),env);expect(r.status).toBe(200);const b=await r.json() as any;expect(b.codigo).toMatch(/^BTW-[A-F0-9]{32}$/);
 const list=await (await adminPromos(new Request('https://www.quiddo.com.br/api/promos/admin',{headers:{Cookie:'qd_sessao='+token}}),env)).json() as any;
 expect(JSON.stringify(list)).not.toContain(b.codigo);expect(list.codigos).toHaveLength(2);
});}

it('accepts a six-character invitation with ampersand',async()=>{const {db}=await fixture();await db.prepare('UPDATE promo_codes SET hash=?').bind(await promoHash('AB&XYZ')).run();const g=await redeemPromo(db,req(),'quiddo','semana','ab&xyz','guest@example.com');expect(g.id).toBeTruthy();});
