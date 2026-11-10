import {stripeTestKey} from '../stripe-test-mode.mjs';
import {MONTHLY_PRICE,paidEntitlement,PdfError,idOf} from './core.mjs';

// Called only with the session identity forwarded by pdfRoute, never a client field.
export function administratorEntitlement(env,email,now=Date.now()) {
  const owner=env.PROMO_ADMIN_EMAIL?.trim().toLowerCase();
  if(env.PDF_ADMIN_ENABLED!=='true' || !owner || typeof email!=='string' || email.trim().toLowerCase()!==owner)return null;
  const date=new Date(now),start=Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),1),end=Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1);
  return {kind:'administrator',start,end,invoice:'admin:'+start};
}

export async function entitlementFromStripe(env,email,now=Date.now()) {
  const test=env.PDF_STAGE==='isolated' && env.PDF_STRIPE_TEST==='true' && env.COBRANCA==='simulacao';
  const mode=test?'teste':'ligada';
  const key=test?env.STRIPE_KEY:env.STRIPE_LIVE_KEY;
  const price=test?env.STRIPE_PRICE_MENSAL:MONTHLY_PRICE;
  // Test credentials are accepted only by the isolated Worker.
  if (!env.DB || (test ? !/^price_[a-zA-Z0-9_]+$/.test(price||'') || !stripeTestKey(env)
    : env.COBRANCA!=='ligada' || env.STRIPE_PRECO_MENSAL_ID!==price || !/^[sr]k_live_/.test(key||''))) {
    throw new PdfError('unavailable','A geração por PDF ainda não está disponível.',503);
  }
  const row=await env.DB.prepare("SELECT a.*,c.email,c.tipo,c.plano,c.stripe_price FROM qd_assinaturas a JOIN compras c ON c.ref=a.ref JOIN qd_clientes_stripe m ON m.email=c.email AND m.customer=a.customer AND m.modo=a.modo WHERE c.email=? AND a.modo=? AND c.modo=? AND c.tipo='assinatura' AND c.plano='mensal' AND a.price=? AND c.stripe_price=? ORDER BY a.paid_until DESC LIMIT 1").bind(email,mode,mode,price,price).first();
  if (!row || row.risk) throw new PdfError('monthly_required','A geração por PDF é exclusiva do plano mensal pago.',403);
  const response=await fetch('https://api.stripe.com/v1/subscriptions/'+encodeURIComponent(row.id)+'?expand%5B%5D=latest_invoice',{
    headers:{Authorization:'Bearer '+key,'Stripe-Version':'2026-09-30.endive'},signal:AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new PdfError('billing_unavailable','Não foi possível confirmar o ciclo pago. Tente novamente.',503);
  const subscription=await response.json();
  if (subscription.id!==row.id || idOf(subscription.customer)!==row.customer) throw new PdfError('monthly_required','Não foi possível confirmar o titular.',403);
  const entitlement=paidEntitlement({subscription,invoice:subscription.latest_invoice,customer:row.customer,risk:row.risk,expectedPrice:price,live:!test},now);
  // The staging acceptance depends on actual webhook persistence, not only the Stripe read.
  if (test && row.paid_until*1000<entitlement.end) throw new PdfError('webhook_pending','Aguardando a fatura paga no webhook de teste.',409);
  return entitlement;
}
