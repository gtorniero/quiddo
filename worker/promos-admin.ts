import {emailDaSessao,loginSimulado,type LoginEnv} from './login';
import {promoTables,promoHash} from './promos.mjs';
const json=(o:unknown,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Robots-Tag':'noindex','X-Content-Type-Options':'nosniff'}});
export async function adminPromos(req:Request,env:LoginEnv){
 const owner=env.PROMO_ADMIN_EMAIL?.trim().toLowerCase();
 if(!owner||loginSimulado(env)||(await emailDaSessao(req,env))!==owner)return json({erro:'Entre com a conta administradora do Quiddo.'},403);
 if(!env.PROMOS)return json({erro:'Painel ainda não conectado.'},503);
 try{
 await promoTables(env.PROMOS);
 if(req.method==='GET')return json({codigos:(await env.PROMOS.prepare('SELECT c.id,c.label,c.sites,c.active,c.expires,c.created,(SELECT COUNT(*) FROM promo_grants g WHERE g.code_id=c.id) AS resgates FROM promo_codes c ORDER BY c.created DESC LIMIT 500').all()).results});
 if(req.method!=='POST')return json({erro:'Método inválido.'},405);
 if(req.headers.get('Origin')!==new URL(req.url).origin)return json({erro:'Origem inválida.'},403);
 const text=await req.text();if(text.length>2048)return json({erro:'Pedido muito grande.'},413);
 const b=JSON.parse(text);
 if(b.action==='toggle'){
 if(typeof b.id!=='string'||typeof b.active!=='boolean')return json({erro:'Pedido inválido.'},400);
 await env.PROMOS.prepare('UPDATE promo_codes SET active=? WHERE id=?').bind(b.active?1:0,b.id).run();return json({ok:true});
 }
 if(b.action!=='create')return json({erro:'Ação inválida.'},400);
 const label=String(b.label||'').trim().slice(0,80),sites=Array.isArray(b.sites)?[...new Set(b.sites)].filter(x=>['quiddo','retrozap','sportdna'].includes(String(x))):[];
 const expires=b.expires?Date.parse(b.expires):null;
 if(!label||!sites.length||(expires!==null&&(!Number.isFinite(expires)||expires<=Date.now())))return json({erro:'Confira nome, sites e validade.'},400);
 const custom=String(b.codigo||'').trim().toUpperCase();
 if(custom&&!/^[A-Z0-9&_-]{6,80}$/.test(custom))return json({erro:'Use de 6 a 80 letras, números, &, hífen ou sublinhado.'},400);
 const codigo=custom||'BTW-'+crypto.randomUUID().replaceAll('-','').toUpperCase();
 if(await env.PROMOS.prepare('SELECT id FROM promo_codes WHERE hash=?').bind(await promoHash(codigo)).first())return json({erro:'Este código já existe. Use outro ou reative o existente.'},409);
 await env.PROMOS.prepare('INSERT INTO promo_codes(id,hash,label,sites,expires,created) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),await promoHash(codigo),label,JSON.stringify(sites),expires,Date.now()).run();
 return json({ok:true,codigo});
 }catch{return json({erro:'Não foi possível concluir. Tente novamente.'},503);}
}
