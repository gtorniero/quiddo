import {capture,enqueue,drain,revoke,schema} from './meta-capi.mjs';
export async function captureCheckout(env,id,meta){if(env.META_CAPI_ENABLED!=='true')return;try{await capture(env.DB,'quiddo',id,meta)}catch{console.warn('meta_consent_capture_failed')}}
export async function runMeta(env){if(env.META_CAPI_ENABLED!=='true')return;try{
 await schema(env.DB);
 const rows=await env.DB.prepare("SELECT p.ref id,p.valor value,p.email email,p.pago paid_at FROM compras p JOIN btw_meta_consent c ON c.id=p.ref WHERE c.brand='quiddo' AND c.revoked=0 AND p.status='pago' AND p.modo='ligada' AND CAST(p.valor AS REAL)>0"+" AND NOT EXISTS (SELECT 1 FROM btw_meta_outbox o WHERE o.id=p.ref) ORDER BY c.created LIMIT 2").all();
 for(const r of rows.results||[])await enqueue(env.DB,'quiddo',{id:r.id,paid:true,live:true,free:false,cents:Math.round(Number(r.value)*100),paidAt:typeof r.paid_at==='string'?Date.parse(r.paid_at):r.paid_at,email:r.email,emailMatching:env.META_EMAIL_MATCHING==='true'});
 await env.DB.prepare("UPDATE btw_meta_outbox SET state='revoked',payload='{}' WHERE state='pending' AND id NOT IN (SELECT id FROM ("+"SELECT p.ref id,p.valor value,p.email email,p.pago paid_at FROM compras p JOIN btw_meta_consent c ON c.id=p.ref WHERE c.brand='quiddo' AND c.revoked=0 AND p.status='pago' AND p.modo='ligada' AND CAST(p.valor AS REAL)>0"+"))").run();
 await drain(env.DB,env,'quiddo');
}catch{console.warn('meta_delivery_check_failed')}}
export async function metaRoute(request,env){
 if(request.method!=='POST'||new URL(request.url).pathname!=='/api/meta/revoke')return null;
 const origin=request.headers.get('Origin');if(!["https://quiddo.com.br", "https://www.quiddo.com.br"].includes(origin))return new Response(null,{status:403});
 if(Number(request.headers.get('Content-Length')||0)>2048)return new Response(null,{status:413});
 try{const text=await request.text();if(text.length>2048)return new Response(null,{status:413});const body=JSON.parse(text);await revoke(env.DB,'quiddo',body.subject);return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}})}catch{return new Response(null,{status:400})}
}
