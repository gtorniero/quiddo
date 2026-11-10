import {MONTHLY_PRICE,paidEntitlement,PdfError,idOf} from './core.mjs';

// Called only with the session identity forwarded by pdfRoute, never a client field.
export function administratorEntitlement(env,email,now=Date.now()) {
  const owner=env.PROMO_ADMIN_EMAIL?.trim().toLowerCase();
  if(env.PDF_ADMIN_ENABLED!=='true' || !owner || typeof email!=='string' || email.trim().toLowerCase()!==owner)return null;
  const date=new Date(now),start=Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),1),end=Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1);
  return {kind:'administrator',start,end,invoice:'admin:'+start};
}

export async function entitlementFromStripe(env,email,now=Date.now()) {
  // Fail closed. Never accept a code, browser plan label, courtesy access, or simulated session.
  if (env.COBRANCA!=='ligada' || !env.DB || env.STRIPE_PRECO_MENSAL_ID!==MONTHLY_PRICE || !/^[sr]k_live_/.test(env.STRIPE_LIVE_KEY||'')) throw new PdfError('unavailable','A geração por PDF ainda não está disponível.',503);
  const row=await env.DB.prepare("SELECT a.*,c.email,c.tipo,c.plano,c.stripe_price FROM qd_assinaturas a JOIN compras c ON c.ref=a.ref JOIN qd_clientes_stripe m ON m.email=c.email AND m.customer=a.customer AND m.modo=a.modo WHERE c.email=? AND a.modo='ligada' AND c.modo='ligada' AND c.tipo='assinatura' AND c.plano='mensal' AND a.price=? AND c.stripe_price=? ORDER BY a.paid_until DESC LIMIT 1").bind(email,MONTHLY_PRICE,MONTHLY_PRICE).first();
  if (!row || row.risk) throw new PdfError('monthly_required','A geração por PDF é exclusiva do plano mensal pago.',403);
  const response=await fetch('https://api.stripe.com/v1/subscriptions/'+encodeURIComponent(row.id)+'?expand%5B%5D=latest_invoice',{
    headers:{Authorization:'Bearer '+env.STRIPE_LIVE_KEY,'Stripe-Version':'2026-09-30.endive'},signal:AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new PdfError('billing_unavailable','Não foi possível confirmar o ciclo pago. Tente novamente.',503);
  const subscription=await response.json();
  if (subscription.id!==row.id || idOf(subscription.customer)!==row.customer) throw new PdfError('monthly_required','Não foi possível confirmar o titular.',403);
  return paidEntitlement({subscription,invoice:subscription.latest_invoice,customer:row.customer,risk:row.risk,live:true},now);
}
