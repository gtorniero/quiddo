// Shared promotion storage. Codes stay server-side; unlimited recipients, idempotent grants.
export const promoError=(status,message)=>{throw Object.assign(new Error(message),{status})};
export const promoHash=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,'0')).join('');
export const promoEmail=v=>String(v||'').trim().toLowerCase();
export async function promoTables(db){
 if(!db)promoError(503,'Códigos temporariamente indisponíveis.');
 await db.batch([
 db.prepare('CREATE TABLE IF NOT EXISTS promo_codes (id TEXT PRIMARY KEY, hash TEXT UNIQUE NOT NULL, label TEXT NOT NULL, sites TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, expires INTEGER, created INTEGER NOT NULL)'),
 db.prepare('CREATE TABLE IF NOT EXISTS promo_grants (id TEXT PRIMARY KEY, code_id TEXT NOT NULL, site TEXT NOT NULL, product TEXT NOT NULL, recipient TEXT NOT NULL, created INTEGER NOT NULL, UNIQUE(code_id,site,product,recipient))'),
 db.prepare('CREATE TABLE IF NOT EXISTS promo_rate (id TEXT PRIMARY KEY, n INTEGER NOT NULL)')]);
}
export async function redeemPromo(db,request,site,product,raw,email){
 await promoTables(db);
 const bucket=Math.floor(Date.now()/600000), ip=request.headers.get('cf-connecting-ip')||'unknown';
 const rateId=bucket+':'+await promoHash(ip);
 const rate=await db.prepare('INSERT INTO promo_rate(id,n) VALUES (?,1) ON CONFLICT(id) DO UPDATE SET n=n+1 RETURNING n').bind(rateId).first();
 if(rate.n>20)promoError(429,'Muitas tentativas. Aguarde dez minutos.');
 await db.prepare('DELETE FROM promo_rate WHERE id < ?').bind((bucket-144)+':').run();
 email=promoEmail(email);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)||email.length>120)promoError(400,'Confira seu e-mail.');
 const code=String(raw||'').trim().toUpperCase();
 if(code.length<6||code.length>80)promoError(400,'Código inválido, vencido ou desativado.');
 const c=await db.prepare('SELECT * FROM promo_codes WHERE hash=? AND active=1 AND (expires IS NULL OR expires>?)').bind(await promoHash(code),Date.now()).first();
 if(!c||!JSON.parse(c.sites).some(scope=>scope===site||scope===site+':'+product))promoError(400,'Código inválido, vencido ou desativado.');
 const recipient=await promoHash(c.id+':'+email);
 // Atomic uniqueness means a retry never renews the same 7-day invitation.
 await db.prepare('INSERT OR IGNORE INTO promo_grants(id,code_id,site,product,recipient,created) SELECT ?,?,?,?,?,? FROM promo_codes WHERE id=? AND active=1 AND (expires IS NULL OR expires>?)').bind(crypto.randomUUID(),c.id,site,product,recipient,Date.now(),c.id,Date.now()).run();
 const g=await db.prepare('SELECT id,created FROM promo_grants WHERE code_id=? AND site=? AND product=? AND recipient=?').bind(c.id,site,product,recipient).first();
 if(!g)promoError(400,'Código indisponível.');
 return g;
}
