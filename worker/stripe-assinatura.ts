import {captureCheckout} from './meta-adapter.mjs';
// Stripe Billing da Quiddo. Nenhum dado das salas ou dos jogadores passa por este modulo.
import StripeClient from 'stripe';
import type { CobrancaEnv } from './cobranca';
import { campaignOrigin } from '../shared/campaign';
import { PRECOS, centavos } from '../shared/precos.mjs';

export interface CompraStripe {
  ref: string; ordem: string; email: string; valor: string; modo: string;
  tipo?: string | null; stripe_price?: string | null; codigo: string | null;
  plano: string | null; status: string; expira: string | null;
}
interface AssinaturaDB {
  id: string; ref: string; customer: string; status: string; price: string;
  paid_until: number; cancel_at_period_end: number; modo: string; risk: string; checked_at: number;
}
export interface AssinaturaPublica {
  status: string; renova: boolean; ate: string; teste: boolean; podeGerenciar: boolean;
}
export type PlanoAssinatura = 'mensal' | 'anual';
export type AcessoStripe = { codigo: string; plano: PlanoAssinatura; expira: string };
const planoCompra = (c: Pick<CompraStripe, 'plano'>): PlanoAssinatura => (c.plano === 'anual' ? 'anual' : 'mensal');
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const idOf = (value: unknown): string => typeof value === 'string' ? value : value && typeof value === 'object' && 'id' in value ? String(value.id) : '';
const codigoNovo = () => 'QD-' + [4, 4].map(n => [...crypto.getRandomValues(new Uint8Array(n))].map(v => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[v % 32]).join('')).join('-');
export const stripeAmbiente = (env: CobrancaEnv): 'teste' | 'ligada' | null => {
  const key = String(env.STRIPE_KEY || '').trim();
  return env.COBRANCA === 'ligada' ? (/^[sr]k_live_/.test(key) ? 'ligada' : null) : (/^[sr]k_test_/.test(key) ? 'teste' : null);
};
export const mensalConfigurado = (env: CobrancaEnv) => !!(stripeAmbiente(env) && env.STRIPE_PRICE_MENSAL && env.STRIPE_WEBHOOK_SECRET && env.STRIPE_PORTAL_CONFIG);
export const anualConfigurado = (env: CobrancaEnv) => mensalConfigurado(env) && !!env.STRIPE_PRICE_ANUAL;
const client = (env: CobrancaEnv) => new StripeClient(String(env.STRIPE_KEY).trim(), { apiVersion: '2026-09-30.endive', httpClient: StripeClient.createFetchHttpClient(), maxNetworkRetries: 1, timeout: 12000 });
export async function tabelasStripe(db: D1Database) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS qd_assinaturas (id TEXT PRIMARY KEY, ref TEXT NOT NULL UNIQUE, customer TEXT NOT NULL, status TEXT NOT NULL, price TEXT NOT NULL, paid_until INTEGER NOT NULL DEFAULT 0, cancel_at_period_end INTEGER NOT NULL DEFAULT 0, modo TEXT NOT NULL, risk TEXT NOT NULL DEFAULT '', checked_at INTEGER NOT NULL DEFAULT 0)"),
    db.prepare('CREATE INDEX IF NOT EXISTS qd_assinaturas_customer ON qd_assinaturas(customer, modo)'),
    // email e a identidade verificada da conta Quiddo, nao uma copia editavel do perfil Stripe.
    db.prepare('CREATE TABLE IF NOT EXISTS qd_clientes_stripe (email TEXT NOT NULL, modo TEXT NOT NULL, customer TEXT NOT NULL UNIQUE, PRIMARY KEY(email, modo))'),
    // Renovações pagas, para relatório (receita recorrente). Sem e-mail: liga à compra original pela ref.
    db.prepare('CREATE TABLE IF NOT EXISTS qd_renovacoes (invoice TEXT PRIMARY KEY, assinatura TEXT NOT NULL, ref TEXT NOT NULL, plano TEXT NOT NULL, valor_centavos INTEGER NOT NULL, pago INTEGER NOT NULL, modo TEXT NOT NULL)'),
  ]);
}
function validatePrice(price: StripeClient.Price, value: number, mode: string, plano: PlanoAssinatura = 'mensal') {
  return price.active && price.livemode === (mode === 'ligada') && price.currency === 'brl' && price.unit_amount === value && price.recurring?.interval === (plano === 'anual' ? 'year' : 'month') && price.recurring.interval_count === 1 && price.recurring.usage_type === 'licensed';
}
async function customerFor(env: CobrancaEnv, email: string, mode: string, stripe: StripeClient) {
  const db = env.DB!;
  const found = await db.prepare('SELECT customer FROM qd_clientes_stripe WHERE email=? AND modo=?').bind(email, mode).first<{ customer: string }>();
  if (found) return found.customer;
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email)))].map(v => v.toString(16).padStart(2, '0')).join('');
  const c = await stripe.customers.create({ email, metadata: { app: 'quiddo' } }, { idempotencyKey: 'quiddo-customer:' + mode + ':' + hash });
  if (c.livemode !== (mode === 'ligada')) throw new Error('ambiente');
  await db.prepare('INSERT OR IGNORE INTO qd_clientes_stripe(email,modo,customer) VALUES (?,?,?)').bind(email, mode, c.id).run();
  return (await db.prepare('SELECT customer FROM qd_clientes_stripe WHERE email=? AND modo=?').bind(email, mode).first<{ customer: string }>())!.customer;
}

/** O Mensal exige conta; o Passe continua avulso. A simulacao publica nunca envia dinheiro ao Stripe. */
export async function checkoutMensal(req: Request, env: CobrancaEnv, email: string, volta: string, pedido: Record<string, unknown>, plano: PlanoAssinatura = 'mensal'): Promise<Response> {
  if (!env.DB || !(plano === 'anual' ? anualConfigurado(env) : mensalConfigurado(env)) || env.COBRANCA === 'desligada') return json({ erro: 'indisponivel' }, 503);
  if (env.COBRANCA !== 'ligada' && pedido.testeCobranca !== true) return json({ erro: 'teste' }, 403);
  if (!email) return json({ erro: 'login', login: true }, 401);
  if (req.headers.get('Origin') !== new URL(req.url).origin) return json({ erro: 'origem' }, 403);
  const db = env.DB, mode = stripeAmbiente(env)!;
  await tabelasStripe(db);
  const stripe = client(env), amount = centavos(PRECOS[plano]);
  if (!Number.isSafeInteger(amount) || amount < 100) return json({ erro: 'preco' }, 503);
  try {
    const price = await stripe.prices.retrieve((plano === 'anual' ? env.STRIPE_PRICE_ANUAL : env.STRIPE_PRICE_MENSAL)!);
    if (!validatePrice(price, amount, mode, plano)) return json({ erro: 'preco' }, 503);
    const customer = await customerFor(env, email, mode, stripe);
    const existing = await db.prepare("SELECT id FROM qd_assinaturas WHERE customer=? AND modo=? AND status NOT IN ('canceled','incomplete_expired') LIMIT 1").bind(customer, mode).first<{ id: string }>();
    if (existing) return json({ erro: 'assinatura_existente', gerenciar: true }, 409);
    const recent = await db.prepare("SELECT COUNT(*) AS n FROM compras WHERE email=? AND tipo='assinatura' AND criado>?").bind(email, new Date(Date.now() - 3600e3).toISOString()).first<{ n: number }>();
    if ((recent?.n || 0) >= 5) return json({ erro: 'muitos' }, 429);
    const ref = crypto.randomUUID(), origin = new URL(req.url).origin; await captureCheckout(env,ref,pedido.meta);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription', customer, client_reference_id: ref, locale: 'pt-BR',
      allowed_payment_method_types: ['card'],
      line_items: [{ price: price.id, quantity: 1 }], integration_identifier: plano === 'anual' ? 'quiddo_yearly_rqnvpska' : 'quiddo_monthly_rqnvpska',
      success_url: `${origin}${volta}?pagamento=ok&ref=${ref}`, cancel_url: `${origin}${volta}?pagamento=volta`,
    }, { idempotencyKey: ref });
    if (session.livemode !== (mode === 'ligada') || !session.url?.startsWith('https://checkout.stripe.com/')) return json({ erro: 'stripe' }, 502);
    await db.prepare("INSERT INTO compras(ref,ordem,email,status,criado,valor,modo,plano,tipo,stripe_price,origem) VALUES (?,?,?,'pendente',?,?,?,?,'assinatura',?,?)")
      .bind(ref, 'stripe:' + session.id, email, new Date().toISOString(), (amount / 100).toFixed(2), mode, plano, price.id, campaignOrigin(pedido.origem) || null).run();
    return json({ ref, url: session.url, recorrente: true });
  } catch { return json({ erro: 'stripe' }, 502); }
}

/** Validade e sempre o periodo efetivamente pago. Uma fatura falha nao estende o acesso. */
export function acessoAssinatura(a: Pick<AssinaturaDB, 'status' | 'paid_until' | 'risk'>, now = Date.now()) {
  return !a.risk && ['active', 'past_due'].includes(a.status) && a.paid_until * 1000 > now;
}
async function compraDaAssinatura(env: CobrancaEnv, subscription: string, stripe: StripeClient): Promise<CompraStripe | null> {
  const db = env.DB!;
  const mapped = await db.prepare('SELECT ref FROM qd_assinaturas WHERE id=?').bind(subscription).first<{ ref: string }>();
  if (mapped) return db.prepare('SELECT * FROM compras WHERE ref=?').bind(mapped.ref).first<CompraStripe>();
  // Evento fora de ordem: resolve a assinatura pela sessao Checkout que esta gravada em compras.
  const sessions = await stripe.checkout.sessions.list({ subscription, limit: 100 });
  for (const session of sessions.data) {
    if (!session.client_reference_id) continue;
    const c = await db.prepare("SELECT * FROM compras WHERE ref=? AND ordem=? AND tipo='assinatura'").bind(session.client_reference_id, 'stripe:' + session.id).first<CompraStripe>();
    if (c && session.mode === 'subscription' && session.livemode === (c.modo === 'ligada')) return c;
  }
  return null;
}
function fimDoPeriodoPago(sub: StripeClient.Subscription, purchase: CompraStripe, customer: string): number {
  const invoice = sub.latest_invoice && typeof sub.latest_invoice === 'object' ? sub.latest_invoice : null;
  const amount = Math.round(Number(purchase.valor) * 100);
  if (!invoice || invoice.livemode !== (purchase.modo === 'ligada') || idOf(invoice.customer) !== customer ||
    invoice.status !== 'paid' || invoice.currency !== 'brl' || invoice.amount_paid < amount ||
    idOf(invoice.parent?.subscription_details?.subscription) !== sub.id || invoice.lines?.has_more) return 0;
  // A assinatura pode mudar de periodo antes da nova fatura ser paga.
  // Somente a linha integral paga do mesmo produto e titular estende o acesso.
  const lines = (invoice.lines?.data || []).filter(line =>
    idOf(line.pricing?.price_details?.price) === purchase.stripe_price &&
    idOf(line.parent?.subscription_item_details?.subscription) === sub.id &&
    line.parent?.subscription_item_details?.proration === false && line.quantity === 1 && line.amount >= amount);
  if (lines.length !== 1) return 0;
  const period = lines[0].period, item = sub.items.data[0];
  if (!period || !Number.isSafeInteger(period.start) || !Number.isSafeInteger(period.end) || period.end <= period.start ||
    period.start !== item.current_period_start || period.end !== item.current_period_end) return 0;
  return period.end;
}
export async function reconciliarAssinatura(env: CobrancaEnv, subscriptionId: string, force = false): Promise<AssinaturaDB | null> {
  if (!env.DB || !mensalConfigurado(env)) return null;
  const db = env.DB; await tabelasStripe(db);
  const prior = await db.prepare('SELECT * FROM qd_assinaturas WHERE id=?').bind(subscriptionId).first<AssinaturaDB>();
  if (!force && prior && Date.now() - prior.checked_at < 60000) return prior;
  const stripe = client(env), purchase = await compraDaAssinatura(env, subscriptionId, stripe);
  if (!purchase || purchase.modo !== stripeAmbiente(env) || !purchase.stripe_price) return null;
  const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['latest_invoice'] });
  const item = sub.items?.data?.[0], price = item?.price;
  if (sub.livemode !== (purchase.modo === 'ligada') || sub.items.data.length !== 1 || item.quantity !== 1 || price.id !== purchase.stripe_price || !validatePrice({ ...price, active: true }, Math.round(Number(purchase.valor) * 100), purchase.modo, planoCompra(purchase))) {
    if (prior) await db.prepare("UPDATE qd_assinaturas SET risk='incompativel',checked_at=? WHERE id=?").bind(Date.now(), subscriptionId).run();
    return null;
  }
  const customer = idOf(sub.customer);
  const expectedCustomer = await db.prepare('SELECT customer FROM qd_clientes_stripe WHERE email=? AND modo=?').bind(purchase.email, purchase.modo).first<{ customer: string }>();
  if (!expectedCustomer || expectedCustomer.customer !== customer) return null;
  const paidUntil = Math.max(prior?.paid_until || 0, fimDoPeriodoPago(sub, purchase, customer));
  const risk = prior?.risk || '';
  await db.prepare("INSERT INTO qd_assinaturas(id,ref,customer,status,price,paid_until,cancel_at_period_end,modo,risk,checked_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,paid_until=MAX(qd_assinaturas.paid_until,excluded.paid_until),cancel_at_period_end=excluded.cancel_at_period_end,checked_at=excluded.checked_at")
    .bind(sub.id, purchase.ref, customer, sub.status, price.id, paidUntil, (sub.cancel_at_period_end || sub.cancel_at) ? 1 : 0, purchase.modo, risk, Date.now()).run();
  const state = (await db.prepare('SELECT * FROM qd_assinaturas WHERE id=?').bind(sub.id).first<AssinaturaDB>())!;
  const expiry = paidUntil ? new Date(paidUntil * 1000).toISOString() : new Date().toISOString();
  if (acessoAssinatura(state)) {
    await db.prepare("UPDATE compras SET codigo=COALESCE(codigo,?),status='pago',pago=COALESCE(pago,?),expira=? WHERE ref=?").bind(codigoNovo(), new Date().toISOString(), expiry, purchase.ref).run();
  } else await db.prepare("UPDATE compras SET status='suspenso',expira=? WHERE ref=?").bind(expiry, purchase.ref).run();
  return state;
}
export async function confirmarAssinatura(env: CobrancaEnv, purchase: CompraStripe): Promise<AcessoStripe | null> {
  if (!env.DB || !mensalConfigurado(env) || purchase.modo !== stripeAmbiente(env)) return null;
  const mapped = await env.DB.prepare('SELECT id FROM qd_assinaturas WHERE ref=? AND modo=?').bind(purchase.ref, purchase.modo).first<{ id: string }>();
  if (mapped) {
    const state = await reconciliarAssinatura(env, mapped.id);
    if (!state || !acessoAssinatura(state)) return null;
    const row = await env.DB.prepare('SELECT codigo,expira FROM compras WHERE ref=?').bind(purchase.ref).first<{ codigo: string; expira: string }>();
    return row?.codigo ? { codigo: row.codigo, plano: planoCompra(purchase), expira: row.expira } : null;
  }
  const stripe = client(env);
  const s = await stripe.checkout.sessions.retrieve(purchase.ordem.slice(7));
  if (s.id !== purchase.ordem.slice(7) || s.client_reference_id !== purchase.ref || s.mode !== 'subscription' || s.currency !== 'brl' || s.amount_total !== Math.round(Number(purchase.valor) * 100) || s.livemode !== (purchase.modo === 'ligada')) return null;
  const subscription = idOf(s.subscription); if (!subscription) return null;
  const state = await reconciliarAssinatura(env, subscription);
  if (!state || !acessoAssinatura(state)) return null;
  const row = await env.DB.prepare('SELECT codigo,expira FROM compras WHERE ref=?').bind(purchase.ref).first<{ codigo: string; expira: string }>();
  return row?.codigo ? { codigo: row.codigo, plano: planoCompra(purchase), expira: row.expira } : null;
}
export async function situacaoAssinatura(env: CobrancaEnv, email: string): Promise<AssinaturaPublica | null> {
  if (!env.DB || !mensalConfigurado(env)) return null;
  await tabelasStripe(env.DB);
  const a = await env.DB.prepare('SELECT a.* FROM qd_assinaturas a JOIN compras c ON c.ref=a.ref WHERE c.email=? AND a.modo=? ORDER BY a.checked_at DESC LIMIT 1').bind(email, stripeAmbiente(env)).first<AssinaturaDB>();
  if (!a) return null;
  let current = a;
  try { current = (await reconciliarAssinatura(env, a.id)) || a; } catch { /* a validade paga continua sendo o limite, inclusive durante indisponibilidade */ }
  return { status: current.risk ? 'revisao' : current.status, renova: !current.cancel_at_period_end && !['canceled', 'incomplete_expired'].includes(current.status), ate: current.paid_until ? new Date(current.paid_until * 1000).toISOString() : '', teste: current.modo === 'teste', podeGerenciar: true };
}
export async function portalAssinatura(req: Request, env: CobrancaEnv, email: string): Promise<Response> {
  if (!env.DB || !mensalConfigurado(env)) return json({ erro: 'indisponivel' }, 503);
  if (!email) return json({ erro: 'login' }, 401);
  if (req.headers.get('Origin') !== new URL(req.url).origin) return json({ erro: 'origem' }, 403);
  await tabelasStripe(env.DB);
  const row = await env.DB.prepare('SELECT customer FROM qd_clientes_stripe WHERE email=? AND modo=?').bind(email, stripeAmbiente(env)).first<{ customer: string }>();
  if (!row) return json({ erro: 'assinatura' }, 404);
  try {
    const p = await client(env).billingPortal.sessions.create({ customer: row.customer, configuration: env.STRIPE_PORTAL_CONFIG, return_url: new URL(req.url).origin + '/conta' });
    return json({ url: p.url });
  } catch { return json({ erro: 'stripe' }, 502); }
}

async function riscoDaCobranca(env: CobrancaEnv, chargeId: string, risk: string): Promise<void> {
  const stripe = client(env), charge = await stripe.charges.retrieve(chargeId);
  if (charge.livemode !== (stripeAmbiente(env) === 'ligada')) return;
  const pi = idOf(charge.payment_intent); if (!pi) return;
  const payments = await stripe.invoicePayments.list({ payment: { type: 'payment_intent', payment_intent: pi }, limit: 100 });
  // Cobrancas avulsas (Passe) tambem deixam de liberar acesso depois de reembolso ou disputa.
  const sessions = await stripe.checkout.sessions.list({ payment_intent: pi, limit: 100 });
  for (const s of sessions.data) await env.DB!.prepare("UPDATE compras SET status='suspenso' WHERE ordem=? AND modo=? AND (tipo IS NULL OR tipo!='assinatura')").bind('stripe:' + s.id, stripeAmbiente(env)).run();
  for (const payment of payments.data) {
    const invoice = await stripe.invoices.retrieve(idOf(payment.invoice));
    const subscription = idOf(invoice.parent?.subscription_details?.subscription); if (!subscription) continue;
    const state = await reconciliarAssinatura(env, subscription, true); if (!state) continue;
    await env.DB!.prepare('UPDATE qd_assinaturas SET risk=? WHERE id=?').bind(risk, subscription).run();
    await env.DB!.prepare("UPDATE compras SET status='suspenso' WHERE ref=?").bind(state.ref).run();
  }
}
/**
 * Renovação paga (não a primeira cobrança, que já é a compra). Só para relatório: não libera acesso
 * (quem libera é reconciliarAssinatura) e não vai para a Meta.
 */
export async function registrarRenovacao(env: CobrancaEnv, invoice: StripeClient.Invoice, state: Pick<AssinaturaDB, 'id' | 'ref' | 'modo'>): Promise<boolean> {
  if (invoice.billing_reason !== 'subscription_cycle' || invoice.status !== 'paid' || invoice.currency !== 'brl' || !(invoice.amount_paid > 0) || invoice.livemode !== (state.modo === 'ligada')) return false;
  const compra = await env.DB!.prepare('SELECT plano FROM compras WHERE ref=?').bind(state.ref).first<{ plano: string | null }>();
  const pago = invoice.status_transitions?.paid_at || invoice.created;
  const r = await env.DB!.prepare('INSERT OR IGNORE INTO qd_renovacoes(invoice,assinatura,ref,plano,valor_centavos,pago,modo) VALUES (?,?,?,?,?,?,?)')
    .bind(invoice.id, state.id, state.ref, compra?.plano === 'anual' ? 'anual' : 'mensal', invoice.amount_paid, pago * 1000, state.modo).run();
  return !!r.meta?.changes;
}
/** Assinaturas exigem webhook assinado: renovacao, falha e cancelamento independem da pagina de retorno. */
export async function webhookStripe(req: Request, env: CobrancaEnv, confirmarAvulso: (ref: string) => Promise<unknown>): Promise<Response> {
  if (!env.DB || !env.STRIPE_WEBHOOK_SECRET || !stripeAmbiente(env)) return json({ erro: 'indisponivel' }, 503);
  if (!req.headers.get('stripe-signature')) return json({ erro: 'assinatura' }, 401);
  const raw = await req.text(); if (raw.length > 1024 * 1024) return json({ erro: 'tamanho' }, 413);
  const stripe = client(env); let event: StripeClient.Event;
  try { event = await stripe.webhooks.constructEventAsync(raw, req.headers.get('stripe-signature')!, env.STRIPE_WEBHOOK_SECRET, 300, StripeClient.createSubtleCryptoProvider()); }
  catch { return json({ erro: 'assinatura' }, 401); }
  if (event.livemode !== (stripeAmbiente(env) === 'ligada')) return json({ erro: 'ambiente' }, 400);
  await tabelasStripe(env.DB);
  try {
    const object = event.data.object;
    if (event.type.startsWith('checkout.session.')) {
      const s = object as StripeClient.Checkout.Session;
      const row = await env.DB.prepare('SELECT ref,tipo FROM compras WHERE ordem=?').bind('stripe:' + s.id).first<{ ref: string; tipo: string | null }>();
      if (row?.tipo === 'assinatura' && idOf(s.subscription)) await reconciliarAssinatura(env, idOf(s.subscription), true);
      else if (row) await confirmarAvulso(row.ref);
    } else if (event.type.startsWith('customer.subscription.')) {
      await reconciliarAssinatura(env, idOf(object), true);
    } else if (['invoice.paid', 'invoice.payment_failed', 'invoice.payment_action_required'].includes(event.type)) {
      const invoice = object as StripeClient.Invoice;
      const subscription = idOf(invoice.parent?.subscription_details?.subscription);
      const state = subscription ? await reconciliarAssinatura(env, subscription, true) : null;
      if (state && event.type === 'invoice.paid') await registrarRenovacao(env, invoice, state);
    } else if (event.type === 'charge.refunded') {
      const charge = object as StripeClient.Charge;
      if (charge.refunded || charge.amount_refunded > 0) await riscoDaCobranca(env, charge.id, 'reembolso');
    } else if (event.type === 'charge.dispute.created') {
      await riscoDaCobranca(env, idOf((object as StripeClient.Dispute).charge), 'disputa');
    } else if (event.type === 'radar.early_fraud_warning.created') {
      await riscoDaCobranca(env, idOf((object as StripeClient.Radar.EarlyFraudWarning).charge), 'revisao');
    }
    return json({ ok: true });
  } catch { return json({ erro: 'reconciliar' }, 503); }
}
