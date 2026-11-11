import {promoHash} from '../promos.mjs';
import {MONTHLY_PRICE,ANNUAL_PRICE,paidEntitlement,PdfError,idOf} from './core.mjs';

// Called only with the session identity forwarded by pdfRoute, never a client field.
export function administratorEntitlement(env,email,now=Date.now()) {
  const owner=env.PROMO_ADMIN_EMAIL?.trim().toLowerCase();
  if(env.PDF_ADMIN_ENABLED!=='true' || !owner || typeof email!=='string' || email.trim().toLowerCase()!==owner)return null;
  const date=new Date(now),start=Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),1),end=Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1);
  return {kind:'administrator',start,end,invoice:'admin:'+start};
}

export async function entitlementFromStripe(env,email,now=Date.now()) {
  // Stripe path fails closed. Courtesy grants are verified separately against both databases.
  if (env.COBRANCA!=='ligada' || !env.DB || env.STRIPE_PRECO_MENSAL_ID!==MONTHLY_PRICE || !/^[sr]k_live_/.test(env.STRIPE_LIVE_KEY||'')) throw new PdfError('unavailable','Quiz com IA ainda não está disponível.',503);
  const row=await env.DB.prepare("SELECT a.*,c.email,c.tipo,c.plano,c.stripe_price FROM qd_assinaturas a JOIN compras c ON c.ref=a.ref JOIN qd_clientes_stripe m ON m.email=c.email AND m.customer=a.customer AND m.modo=a.modo WHERE c.email=? AND a.modo='ligada' AND c.modo='ligada' AND c.tipo='assinatura' AND ((c.plano='mensal' AND a.price=? AND c.stripe_price=?) OR (c.plano='anual' AND a.price=? AND c.stripe_price=?)) ORDER BY a.paid_until DESC LIMIT 1").bind(email,MONTHLY_PRICE,MONTHLY_PRICE,ANNUAL_PRICE,ANNUAL_PRICE).first();
  if (!row || row.risk || (row.plano==='anual' && env.STRIPE_PRECO_ANUAL_ID!==ANNUAL_PRICE)) throw new PdfError('monthly_required','Quiz com IA está disponível nas assinaturas Mensal e Anual pagas.',403);
  const response=await fetch('https://api.stripe.com/v1/subscriptions/'+encodeURIComponent(row.id)+'?expand%5B%5D=latest_invoice',{
    headers:{Authorization:'Bearer '+env.STRIPE_LIVE_KEY,'Stripe-Version':'2026-09-30.endive'},signal:AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new PdfError('billing_unavailable','Não foi possível confirmar o ciclo pago. Tente novamente.',503);
  const subscription=await response.json();
  if (subscription.id!==row.id || idOf(subscription.customer)!==row.customer) throw new PdfError('monthly_required','Não foi possível confirmar o titular.',403);
  return paidEntitlement({subscription,invoice:subscription.latest_invoice,customer:row.customer,risk:row.risk,live:true,expectedPrice:row.plano==='anual'?ANNUAL_PRICE:MONTHLY_PRICE},now);
}

// Only a persisted monthly campaign grant, matched to the verified session owner,
// can unlock courtesy AI. Legacy seven-day invitations remain ineligible.
export async function promotionEntitlement(env,email,now=Date.now()) {
  if(env.COBRANCA!=='ligada'||!env.DB||!env.PROMOS||typeof email!=='string')return null;
  email=email.trim().toLowerCase();
  const rows=(await env.DB.prepare("SELECT ref,criado,expira FROM compras WHERE email=? AND tipo='promo' AND plano='mensal' AND status='pago' AND modo='ligada' AND valor='0' AND expira>? ORDER BY expira DESC LIMIT 20").bind(email,new Date(now).toISOString()).all()).results;
  for(const row of rows) {
    if(!row.ref.startsWith('promo:'))continue;
    const grant=await env.PROMOS.prepare("SELECT g.id,g.code_id,g.recipient,g.created,c.sites FROM promo_grants g JOIN promo_codes c ON c.id=g.code_id WHERE g.id=? AND g.site='quiddo' AND g.product='mensal'").bind(row.ref.slice(6)).first();
    if(!grant||!JSON.parse(grant.sites).includes('quiddo:mensal')||grant.recipient!==await promoHash(grant.code_id+':'+email))continue;
    const start=grant.created,end=start+30*86400000;
    if(start>now||end<=now||Date.parse(row.criado)!==start||Date.parse(row.expira)!==end)continue;
    return {kind:'promotion',plan:'mensal',start,end,invoice:'promo:'+grant.id};
  }
  return null;
}
