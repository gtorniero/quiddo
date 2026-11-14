// Server-only purchase delivery. Never include tokens, answers, reports or raw emails.
export const BRANDS=Object.freeze({retrozap:{pixel:'1522604139713675',origin:'https://retrozap.com.br',prefix:'retrozap-venda:'},quiddo:{pixel:'39663521416595790',origin:'https://www.quiddo.com.br',prefix:'quiddo:purchase:',leadPrefix:'quiddo:lead:',leadPath:'/criar'},sportdna:{pixel:'1109514848506414',origin:'https://sportdna.com.br',prefix:'sportdna:purchase:'}});
const CONTENT_ID=/^[a-z0-9-]{1,40}$/,CATEGORY=/^[a-z_]{1,30}$/;
export async function hash(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(b=>b.toString(16).padStart(2,'0')).join('')}
export function consentContext(raw,now=Date.now()){
 if(raw?.marketing!==true||raw.version!==1||!Number.isFinite(raw.at)||raw.at>now||now-raw.at>180*86400000)return null;
 if(typeof raw.subject!=='string'||!/^[a-f0-9-]{36}$/.test(raw.subject))return null;
 const c={marketing:true,version:1,at:raw.at,subject:raw.subject};
 for(const key of ['fbp','fbc'])if(typeof raw[key]==='string'&&/^fb\.\d\.\d{10,13}\.[A-Za-z0-9_-]{1,200}$/.test(raw[key]))c[key]=raw[key];
 return c;
}
const initialized=new WeakMap();
export async function schema(db){if(initialized.has(db))return initialized.get(db);const init=db.batch([
 db.prepare('CREATE TABLE IF NOT EXISTS btw_meta_consent (id TEXT PRIMARY KEY, brand TEXT NOT NULL, context TEXT NOT NULL, created INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0)'),
 db.prepare("CREATE TABLE IF NOT EXISTS btw_meta_outbox (id TEXT PRIMARY KEY, brand TEXT NOT NULL, payload TEXT NOT NULL, created INTEGER NOT NULL, next_try INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, state TEXT NOT NULL DEFAULT 'pending', lease INTEGER NOT NULL DEFAULT 0, last_status INTEGER, error_code INTEGER)")]);initialized.set(db,init);try{await init}catch(error){initialized.delete(db);throw error}}
export async function capture(db,brand,id,raw){if(!BRANDS[brand]||typeof id!=='string'||!id||id.length>100)return;const c=consentContext(raw);if(!c)return;await schema(db);await db.prepare('INSERT OR IGNORE INTO btw_meta_consent(id,brand,context,created) VALUES (?,?,?,?)').bind(id,brand,JSON.stringify(c),Date.now()).run()}
export async function revoke(db,brand,subject){if(!BRANDS[brand]||typeof subject!=='string'||!/^[a-f0-9-]{36}$/.test(subject))return;await schema(db);await db.prepare("UPDATE btw_meta_consent SET revoked=1 WHERE brand=? AND json_extract(context,'$.subject')=?").bind(brand,subject).run();await db.prepare("UPDATE btw_meta_outbox SET state='revoked',payload='{}' WHERE state='pending' AND id IN (SELECT id FROM btw_meta_consent WHERE brand=? AND revoked=1)").bind(brand).run()}
export async function payload(brand,sale,context){
 const b=BRANDS[brand],c=consentContext(context);if(!b||!c||sale?.paid!==true||sale.live!==true||sale.free===true||typeof sale.id!=='string'||!sale.id||!Number.isSafeInteger(sale.cents)||sale.cents<=0||!Number.isFinite(sale.paidAt)||sale.paidAt>Date.now()+60000||Date.now()-sale.paidAt>7*86400000)return null;
 const user_data={};if(c.fbp)user_data.fbp=c.fbp;if(c.fbc)user_data.fbc=c.fbc;
 // Customer matching is enabled only by an explicit server configuration and marketing consent.
 if(sale.emailMatching===true&&/^[a-f0-9]{64}$/.test(context?.em||''))user_data.em=[context.em];
 if(sale.emailMatching===true&&typeof sale.email==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sale.email.trim()))user_data.em=[await hash(sale.email.trim().toLowerCase())];
 if(!Object.keys(user_data).length)return null;
 const custom_data={value:sale.cents/100,currency:'BRL'};
 // Plano comprado (IDs do catálogo de preços). Nunca código de acesso, e-mail ou dado do quiz.
 if(typeof sale.contentId==='string'&&CONTENT_ID.test(sale.contentId))Object.assign(custom_data,{content_ids:[sale.contentId],content_type:'product',num_items:1});
 if(typeof sale.category==='string'&&CATEGORY.test(sale.category))custom_data.content_category=sale.category;
 return {event_name:'Purchase',event_time:Math.floor(sale.paidAt/1000),event_id:await hash(b.prefix+sale.id),action_source:'website',event_source_url:b.origin+'/',user_data,custom_data};
}
/** Compra e, na primeira cobrança de uma assinatura, Subscribe com o mesmo event_id (a Meta deduplica por nome + id). */
export async function events(brand,sale,context){const purchase=await payload(brand,sale,context);if(!purchase)return null;return sale.subscribe===true?[purchase,{...purchase,event_name:'Subscribe'}]:[purchase]}
/** Lead da primeira sala aberta neste navegador. Só identificadores de anúncio permitidos (fbp/fbc), nunca e-mail. */
export async function leadPayload(brand,lead,context){
 const b=BRANDS[brand],c=consentContext(context);if(!b?.leadPrefix||!c||typeof lead?.id!=='string'||!/^[a-f0-9-]{36}$/.test(lead.id)||!Number.isFinite(lead.at)||lead.at>Date.now()+60000||Date.now()-lead.at>86400000)return null;
 const user_data={};if(c.fbp)user_data.fbp=c.fbp;if(c.fbc)user_data.fbc=c.fbc;if(!Object.keys(user_data).length)return null;
 const custom_data={currency:'BRL'};if(typeof lead.category==='string'&&CATEGORY.test(lead.category))custom_data.content_category=lead.category;
 return {event_name:'Lead',event_time:Math.floor(lead.at/1000),event_id:await hash(b.leadPrefix+lead.id),action_source:'website',event_source_url:b.origin+b.leadPath,user_data,custom_data};
}
export async function enqueueLead(db,brand,lead){await schema(db);const id='lead:'+lead?.id;const row=await db.prepare('SELECT * FROM btw_meta_consent WHERE id=? AND brand=? AND revoked=0').bind(id,brand).first();if(!row)return false;const event=await leadPayload(brand,lead,JSON.parse(row.context));if(!event)return false;await db.prepare('INSERT OR IGNORE INTO btw_meta_outbox(id,brand,payload,created,next_try) VALUES (?,?,?,?,?)').bind(id,brand,JSON.stringify(event),Date.now(),Date.now()).run();return true}
export async function enqueue(db,brand,sale){await schema(db);const row=await db.prepare('SELECT * FROM btw_meta_consent WHERE id=? AND brand=? AND revoked=0').bind(sale.id,brand).first();if(!row||row.created>sale.paidAt)return false;const list=await events(brand,sale,JSON.parse(row.context));if(!list)return false;await db.prepare('INSERT OR IGNORE INTO btw_meta_outbox(id,brand,payload,created,next_try) VALUES (?,?,?,?,?)').bind(sale.id,brand,JSON.stringify(list.length===1?list[0]:list),Date.now(),Date.now()).run();return true}
export async function drain(db,env,brand,fetcher=fetch){
 const b=BRANDS[brand];if(!b||env.META_CAPI_ENABLED!=='true'||!env.META_CAPI_TOKEN||!/^v\d+\.\d+$/.test(env.META_GRAPH_VERSION||''))return;
 await schema(db);const now=Date.now();
 await db.prepare("UPDATE btw_meta_outbox SET state='expired',payload='{}' WHERE state='pending' AND (created<? OR COALESCE(json_extract(payload,'$.event_time'),json_extract(payload,'$[0].event_time'))<?)").bind(now-86400000,Math.floor((now-86400000)/1000)).run();
 const rows=await db.prepare("SELECT o.* FROM btw_meta_outbox o JOIN btw_meta_consent c ON c.id=o.id AND c.brand=o.brand WHERE o.brand=? AND o.state='pending' AND o.next_try<=? AND o.lease<? AND c.revoked=0 ORDER BY o.next_try,o.created LIMIT 2").bind(brand,now,now).all();
 for(const row of rows.results||[]){
  const lock=await db.prepare("UPDATE btw_meta_outbox SET lease=?,attempts=attempts+1 WHERE id=? AND state='pending' AND lease<?").bind(now+60000,row.id,now).run();if(!lock.meta?.changes)continue;
  // Recheck revocation after acquiring the delivery lease.
  const consent=await db.prepare('SELECT revoked FROM btw_meta_consent WHERE id=?').bind(row.id).first();if(consent?.revoked!==0)continue;
  try{
   // Uma linha pode levar mais de um evento (Purchase + Subscribe); só conta como enviada se todos chegarem.
   const list=[].concat(JSON.parse(row.payload));const body={data:list};
   const response=await fetcher(`https://graph.facebook.com/${env.META_GRAPH_VERSION}/${b.pixel}/events`,{method:'POST',headers:{Authorization:'Bearer '+env.META_CAPI_TOKEN,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
   const result=await response.json().catch(()=>null);
   if(response.ok&&result?.events_received===list.length){await db.prepare("UPDATE btw_meta_outbox SET state='sent',payload='{}',lease=0,last_status=200,error_code=NULL WHERE id=?").bind(row.id).run()}
   else{const terminal=response.status>=400&&response.status<500&&![408,429].includes(response.status);await db.prepare('UPDATE btw_meta_outbox SET state=?,next_try=?,lease=0,last_status=?,error_code=? WHERE id=?').bind(terminal?'rejected':'pending',now+Math.min(3600000,30000*2**Math.min(row.attempts,7)),response.status,Number.isInteger(result?.error?.code)?result.error.code:null,row.id).run()}
  }catch{await db.prepare('UPDATE btw_meta_outbox SET next_try=?,lease=0 WHERE id=?').bind(now+Math.min(3600000,30000*2**Math.min(row.attempts,7)),row.id).run()}
 }
 await db.prepare("UPDATE btw_meta_outbox SET payload='{}' WHERE created<?").bind(now-7*86400000).run();
 await db.prepare('DELETE FROM btw_meta_consent WHERE created<?').bind(now-7*86400000).run();
}

export async function bindEmail(db,brand,id,email){if(typeof email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))return;const row=await db.prepare('SELECT context FROM btw_meta_consent WHERE id=? AND brand=? AND revoked=0').bind(id,brand).first();if(!row)return;const context=JSON.parse(row.context);context.em=await hash(email.trim().toLowerCase());await db.prepare('UPDATE btw_meta_consent SET context=? WHERE id=? AND revoked=0').bind(JSON.stringify(context),id).run()}
