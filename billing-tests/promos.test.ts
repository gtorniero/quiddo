import {describe,it,expect} from 'vitest';
import {DatabaseSync} from 'node:sqlite';
import {promoTables,promoHash,redeemPromo} from '../worker/promos.mjs';
import {adminPromos} from '../worker/promos-admin';
import {rotaCobranca,codigoValido} from '../worker/cobranca';
function database(){const sqlite=new DatabaseSync(':memory:');const prepare=(sql:string,values:any[]=[]):any=>({bind:(...v:any[])=>prepare(sql,v),first:async()=>sqlite.prepare(sql).get(...values)||null,all:async()=>({results:sqlite.prepare(sql).all(...values)}),run:async()=>({meta:{changes:sqlite.prepare(sql).run(...values).changes}})});return {db:{prepare,batch:async(s:any[])=>Promise.all(s.map(x=>x.run()))} as unknown as D1Database,sqlite};}
const req=(code='BTW-FIXTURE-12345678',origin='https://www.quiddo.com.br')=>new Request('https://www.quiddo.com.br/api/promo',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1','Content-Type':'application/json'},body:JSON.stringify({codigo:code,email:'guest@example.com'})});
async function fixture(){const {db,sqlite}=database();await promoTables(db);await db.prepare('CREATE TABLE compras (ref TEXT PRIMARY KEY,ordem TEXT,email TEXT,status TEXT,codigo TEXT,criado TEXT,pago TEXT,valor TEXT,modo TEXT,plano TEXT,expira TEXT,tipo TEXT,stripe_price TEXT)').run();await db.prepare('INSERT INTO promo_codes(id,hash,label,sites,created) VALUES (?,?,?,?,?)').bind('code',await promoHash('BTW-FIXTURE-12345678'),'Friends','["quiddo","sportdna","retrozap"]',Date.now()).run();return {db,sqlite};}
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
 const call=(origin:string,emailCookie=true,sites=['quiddo'])=>new Request('https://www.quiddo.com.br/api/promos/admin',{method:'POST',headers:{Origin:origin,Cookie:emailCookie?'qd_sessao='+token:''},body:JSON.stringify({action:'create',label:'Partner',sites})});
 expect((await adminPromos(call('https://evil.example'),env)).status).toBe(403);
 expect((await adminPromos(call('https://www.quiddo.com.br',false),env)).status).toBe(403);
 expect((await adminPromos(call('https://www.quiddo.com.br',true,['sportdna:unknown']),env)).status).toBe(400);
 const r=await adminPromos(call('https://www.quiddo.com.br',true,['sportdna:surf-report']),env);expect(r.status).toBe(200);const b=await r.json() as any;expect(b.codigo).toMatch(/^BTW-[A-F0-9]{32}$/);
 const list=await (await adminPromos(new Request('https://www.quiddo.com.br/api/promos/admin',{headers:{Cookie:'qd_sessao='+token}}),env)).json() as any;
 expect(JSON.stringify(list)).not.toContain(b.codigo);expect(list.codigos).toHaveLength(2);expect(list.codigos.find((c:any)=>c.label==='Partner').sites).toBe('["sportdna:surf-report"]');
});}

it('accepts a six-character invitation with ampersand',async()=>{const {db}=await fixture();await db.prepare('UPDATE promo_codes SET hash=?').bind(await promoHash('AB&XYZ')).run();const g=await redeemPromo(db,req(),'quiddo','semana','ab&xyz','guest@example.com');expect(g.id).toBeTruthy();});

it('restricts a Surf campaign to exactly that product without granting other access',async()=>{const {db,sqlite}=await fixture();await db.prepare('UPDATE promo_codes SET sites=?').bind('["sportdna:surf-report"]').run();for(const [site,product] of [['sportdna','racket-report'],['sportdna','run-report'],['sportdna','racket-comparator'],['quiddo','semana'],['retrozap','premium']])await expect(redeemPromo(db,req(),site,product,'BTW-FIXTURE-12345678','guest@example.com')).rejects.toThrow();expect(sqlite.prepare('SELECT COUNT(*) n FROM promo_grants').get()?.n).toBe(0);expect((await redeemPromo(db,req(),'sportdna','surf-report','BTW-FIXTURE-12345678','guest@example.com')).id).toBeTruthy();});

it('monthly campaign grants 30 days and AI only to its verified recipient; retry never extends',async()=>{
 const {db,sqlite}=await fixture();await db.prepare('UPDATE promo_codes SET sites=?').bind('["quiddo:mensal"]').run();
 const env={DB:db,PROMOS:db,COBRANCA:'ligada'};
 const {promotionEntitlement}=await import('../worker/pdf-quiz/entitlement.mjs');
 const response=await rotaCobranca(req(),env,'/api/promo');expect(response?.status).toBe(200);
 const access=await response!.json() as any;expect(access.plano).toBe('mensal');expect(Date.parse(access.expira)-Date.now()).toBeGreaterThan(30*86400000-10000);expect(await codigoValido(env,access.codigo)).toBe(true);
 const first=await promotionEntitlement(env,'guest@example.com');expect(first).toMatchObject({kind:'promotion',plan:'mensal'});expect(first!.end-first!.start).toBe(30*86400000);
 expect(await promotionEntitlement(env,'other@example.com')).toBe(null);
 expect(await promotionEntitlement({...env,COBRANCA:'simulacao'},'guest@example.com')).toBe(null);
 const again=await (await rotaCobranca(req(),env,'/api/promo'))!.json();expect(again).toEqual(access);expect(await promotionEntitlement(env,'guest@example.com')).toEqual(first);
 await db.prepare('UPDATE promo_codes SET active=0').run();expect(await promotionEntitlement(env,'guest@example.com')).toEqual(first);
 expect((await rotaCobranca(req(),env,'/api/promo'))?.status).toBe(400);
 expect(await promotionEntitlement(env,'guest@example.com',first!.end)).toBe(null);
 expect(sqlite.prepare('SELECT COUNT(*) n FROM compras').get()?.n).toBe(1);
});
it('legacy week cannot claim monthly AI through a forged purchase or product argument',async()=>{
 const {db}=await fixture();const env={DB:db,PROMOS:db,COBRANCA:'ligada'};
 await expect(redeemPromo(db,req(),'quiddo','mensal','BTW-FIXTURE-12345678','guest@example.com')).rejects.toThrow();
 await rotaCobranca(req(),env,'/api/promo');
 const {promotionEntitlement}=await import('../worker/pdf-quiz/entitlement.mjs');
 expect(await promotionEntitlement(env,'guest@example.com')).toBe(null);
 await db.prepare("UPDATE compras SET plano='mensal',expira=?").bind(new Date(Date.now()+30*86400000).toISOString()).run();
 expect(await promotionEntitlement(env,'guest@example.com')).toBe(null);
});
