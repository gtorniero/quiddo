import {promoHash,promoTables} from './promos.mjs';
export interface PromoServiceEnv {
 PROMOS?:D1Database; DB?:D1Database; PROMO_RETROZAP?:D1Database; PROMO_SPORTDNA?:D1Database; BTW_PROMOS_TOKEN?:string;
}
const json=(o:unknown,status=200)=>Response.json(o,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});
const fail=(status:number,message:string):never=>{throw Object.assign(new Error(message),{status});};
const scopes=['quiddo','retrozap','sportdna','sportdna:surf-report','sportdna:racket-report','sportdna:run-report','sportdna:racket-comparator'];
const idOk=(s:unknown):s is string=>typeof s==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(s);
const cursor=(v:string|null)=>{if(!v)return null;try{const c=JSON.parse(atob(v));if(!Array.isArray(c)||c.length!==2||!Number.isSafeInteger(c[0])||!idOk(c[1]))throw Error();return c as [number,string];}catch{return fail(400,'Página inválida.');}};
async function identities(env:PromoServiceEnv,grants:any[]){
 const found=new Map<string,any>(),sources:Record<string,string>={};
 for(const site of ['quiddo','retrozap','sportdna']){
  const ids=grants.filter(g=>g.site===site).map(g=>g.id);if(!ids.length)continue;
  const db=site==='quiddo'?env.DB:site==='retrozap'?env.PROMO_RETROZAP:env.PROMO_SPORTDNA;
  if(!db){sources[site]='unavailable';continue;}
  try{
   const placeholders=ids.map(()=>'?').join(',');
   const sql=site==='quiddo'?`SELECT substr(ref,7) grant_id,email,status,expira FROM compras WHERE tipo='promo' AND ref IN (${placeholders})`:site==='retrozap'?`SELECT grant_id,email FROM promo_acessos WHERE grant_id IN (${placeholders})`:`SELECT p.grant_id,p.email,o.state status FROM promo_order_emails p JOIN orders o ON o.id=p.order_id WHERE p.grant_id IN (${placeholders}) AND o.provider='promo' ORDER BY o.created_at DESC`;
   const rows=(await db.prepare(sql).bind(...(site==='quiddo'?ids.map(id=>'promo:'+id):ids)).all<any>()).results;
   for(const row of rows){
    const email=String(row.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)||email.length>120)continue;
    const old=found.get(row.grant_id);
    if(old&&old.email!==email){found.set(row.grant_id,{email:null,identity_status:'conflict',access_status:'unknown'});continue;}
    if(old?.identity_status==='conflict')continue;
    // Multiple SPORT orders are one grant. Any paid order still authorizes that grant.
    const paid=site==='retrozap'||['paid','pago'].includes(row.status);
    const expires=row.expira?Date.parse(row.expira):null;
    const active=paid&&(expires===null||expires>Date.now());
    found.set(row.grant_id,{email,identity_status:'matched',access_status:site==='retrozap'?'granted':active||old?.access_status==='active'?'active':expires!==null&&expires<=Date.now()?'expired':'inactive',expires});
   }
   sources[site]='available';
  }catch{sources[site]='unavailable';}
 }
 return {found,sources};
}
async function read(env:PromoServiceEnv,url:URL){
 const db=env.PROMOS!,c=cursor(url.searchParams.get('cursor')),campaign=url.searchParams.get('campaign');
 if([...url.searchParams.keys()].some(k=>!['cursor','campaign'].includes(k)))fail(400,'Filtro inválido.');
 const args:any[]=[],where:string[]=[];
 if(campaign){if(!idOk(campaign))fail(400,'Campanha inválida.');where.push('code_id=?');args.push(campaign);if(!await db.prepare('SELECT id FROM promo_codes WHERE id=?').bind(campaign).first())fail(404,'Campanha não encontrada.');}
 if(c){where.push('(created < ? OR (created = ? AND id < ?))');args.push(c[0],c[0],c[1]);}
 const limit=50;
 if(campaign){
  const rows=(await db.prepare('SELECT id,site,product,created FROM promo_grants WHERE '+where.join(' AND ')+' ORDER BY created DESC,id DESC LIMIT ?').bind(...args,limit+1).all<any>()).results;
  const page=rows.slice(0,limit),{found,sources}=await identities(env,page),last=page.at(-1);
  const totals=await db.prepare('SELECT COUNT(*) redemptions,COUNT(DISTINCT recipient) people FROM promo_grants WHERE code_id=?').bind(campaign).first();
  return {redemptions:page.map(g=>({...g,...(found.get(g.id)||{email:null,identity_status:sources[g.site]==='unavailable'?'unavailable':'not_found',access_status:'unknown'})})),sources,totals,next_cursor:rows.length>limit?btoa(JSON.stringify([last.created,last.id])):null,checked_at:new Date().toISOString()};
 }
 const rows=(await db.prepare('SELECT c.id,c.label,c.sites,c.active,c.expires,c.created,(SELECT COUNT(*) FROM promo_grants g WHERE g.code_id=c.id) redemptions,(SELECT COUNT(DISTINCT recipient) FROM promo_grants g WHERE g.code_id=c.id) people FROM promo_codes c'+(where.length?' WHERE '+where.join(' AND '):'')+' ORDER BY created DESC,id DESC LIMIT ?').bind(...args,limit+1).all<any>()).results;
 const page=rows.slice(0,limit),last=page.at(-1);
 return {campaigns:page.map(r=>({...r,sites:JSON.parse(r.sites)})),next_cursor:rows.length>limit?btoa(JSON.stringify([last.created,last.id])):null,checked_at:new Date().toISOString()};
}
async function mutate(db:D1Database,b:any){
 if(!b||typeof b!=='object'||Array.isArray(b))fail(400,'Pedido inválido.');
 if(b.action==='toggle'){
  if(!idOk(b.id)||typeof b.active!=='boolean')fail(400,'Pedido inválido.');
  if(!await db.prepare('SELECT id FROM promo_codes WHERE id=?').bind(b.id).first())fail(404,'Campanha não encontrada.');
  await db.prepare('UPDATE promo_codes SET active=? WHERE id=?').bind(b.active?1:0,b.id).run();return {ok:true,id:b.id,active:b.active};
 }
 if(b.action!=='create'||!idOk(b.request_id))fail(400,'Pedido inválido.');
 const label=typeof b.label==='string'?b.label.trim():'',codigo=typeof b.codigo==='string'?b.codigo.trim().toUpperCase():'';
 if(!label||label.length>80||!/^[A-Z0-9&_-]{6,80}$/.test(codigo)||!Array.isArray(b.sites)||!b.sites.length||b.sites.length>7||b.sites.some((s:unknown)=>typeof s!=='string'||!scopes.includes(s)))fail(400,'Confira nome, código e produtos.');
 const sites=[...new Set(b.sites)].sort(),expires=b.expires===null||b.expires===undefined||b.expires===''?null:typeof b.expires==='string'?Date.parse(b.expires):NaN;
 if(expires!==null&&(!Number.isFinite(expires)||expires<=Date.now()))fail(400,'Confira a validade.');
 const hash=await promoHash(codigo),payloadHash=await promoHash(JSON.stringify({label,sites,expires,hash}));
 await db.prepare('CREATE TABLE IF NOT EXISTS promo_admin_requests (id TEXT PRIMARY KEY,payload_hash TEXT NOT NULL,code_id TEXT NOT NULL)').run();
 const prior=await db.prepare('SELECT payload_hash,code_id FROM promo_admin_requests WHERE id=?').bind(b.request_id).first<any>();
 if(prior){const saved=await db.prepare('SELECT hash FROM promo_codes WHERE id=?').bind(prior.code_id).first<any>();if(prior.payload_hash!==payloadHash||saved?.hash!==hash)fail(409,'Pedido já usado com outros dados.');return {ok:true,id:prior.code_id,codigo,replayed:true};}
 if(await db.prepare('SELECT id FROM promo_codes WHERE hash=?').bind(hash).first())fail(409,'Este código já existe. Escolha outro código.');
 const id=b.request_id;
 await db.batch([
  db.prepare('INSERT OR IGNORE INTO promo_codes(id,hash,label,sites,expires,created) VALUES (?,?,?,?,?,?)').bind(id,hash,label,JSON.stringify(sites),expires,Date.now()),
  db.prepare('INSERT OR IGNORE INTO promo_admin_requests(id,payload_hash,code_id) VALUES (?,?,?)').bind(id,payloadHash,id)]);
 const saved=await db.prepare('SELECT r.payload_hash,c.hash FROM promo_admin_requests r JOIN promo_codes c ON c.id=r.code_id WHERE r.id=?').bind(id).first<any>();
 if(!saved||saved.payload_hash!==payloadHash||saved.hash!==hash)fail(409,'Pedido conflitante. Atualize antes de tentar novamente.');
 return {ok:true,id,codigo};
}
export async function servicePromos(req:Request,env:PromoServiceEnv){
 try{
  const supplied=req.headers.get('Authorization')||'';
  if(!env.BTW_PROMOS_TOKEN||env.BTW_PROMOS_TOKEN.length<32||await promoHash(supplied)!==await promoHash('Bearer '+env.BTW_PROMOS_TOKEN))return json({erro:'Acesso não autorizado.'},401);
  // This credential is server-to-server only, never a browser/CORS alternative.
  if(req.headers.has('Origin')||req.headers.has('Cookie'))return json({erro:'Acesso de serviço necessário.'},403);
  if(!env.PROMOS)return json({erro:'Base de cupons indisponível.'},503);
  if(!['GET','POST'].includes(req.method))return json({erro:'Método inválido.'},405);
  await promoTables(env.PROMOS);
  if(req.method==='GET')return json(await read(env,new URL(req.url)));
  if(Number(req.headers.get('Content-Length')||0)>4096)fail(413,'Pedido muito grande.');
  const reader=req.body?.getReader();if(!reader)fail(400,'Pedido inválido.');let size=0,text='';const decoder=new TextDecoder();
  for(;;){const {done,value}=await reader!.read();if(done)break;size+=value.length;if(size>4096){await reader!.cancel();fail(413,'Pedido muito grande.');}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();
  let body;try{body=JSON.parse(text);}catch{return json({erro:'Pedido inválido.'},400);}
  return json(await mutate(env.PROMOS,body));
 }catch(e){const err=e as Error&{status?:number};return json({erro:err.status?err.message:'Não foi possível consultar ou salvar os cupons.'},err.status||503);}
}
