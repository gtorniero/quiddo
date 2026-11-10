import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { createHash, createHmac } from 'node:crypto';
import { codigoValido, rotaCobranca, type CobrancaEnv } from '../worker/cobranca';
import { acessoAssinatura, mensalConfigurado, reconciliarAssinatura, tabelasStripe } from '../worker/stripe-assinatura';
import { entitlementFromStripe } from '../worker/pdf-quiz/entitlement.mjs';
import { Ledger } from '../worker/pdf-quiz/ledger.mjs';
import { fixture } from '../tests-pdf/fixtures.mjs';

const ORIGIN = 'https://www.quiddo.com.br';
it.each(['mensal','anual'])('signed %s webhook bridges paid identity to shared AI credits and renewal without external calls', async (plan) => {
 const f = fixture().billing;
 if(plan==='anual'){const item=f.subscription.items.data[0];item.price.id='price_1UXtqY134hMOoEZVGgIdzQ7a';item.price.unit_amount=15600;item.price.recurring.interval='year';item.current_period_end=item.current_period_start+365*86400;f.invoice.amount_paid=15600;f.invoice.lines.data[0].amount=15600;f.invoice.lines.data[0].period.end=item.current_period_end;f.invoice.lines.data[0].pricing.price_details.price=item.price.id;}
 const data = JSON.parse(JSON.stringify(f).replaceAll(f.subscription.id,'sub_quiddo').replaceAll(f.customer,'cus_quiddo'));
 sub = data.subscription; invoice = data.invoice;
 sub.livemode=true; sub.items.data[0].price.livemode=true; invoice.livemode=true;
 sub.latest_invoice=invoice; session.livemode=true;
 const priceId=sub.items.data[0].price.id;
 Object.assign(env,{COBRANCA:'ligada',STRIPE_LIVE_KEY:['rk','live','fixture'].join('_'),STRIPE_PRECO_MENSAL_ID:'price_1UXtp0134hMOoEZV4zpJZiw6',STRIPE_PRECO_ANUAL_ID:'price_1UXtqY134hMOoEZVGgIdzQ7a',STRIPE_LIVE_WEBHOOK_SECRET:SECRET,STRIPE_LIVE_PORTAL_CONFIG:'bpc_fixture'});
 await seedPurchase();
 sqlite.prepare("UPDATE compras SET modo='ligada',stripe_price=?,plano=?,valor=?").run(priceId,plan,plan==='anual'?'156.00':'15.99');
 sqlite.prepare("UPDATE qd_clientes_stripe SET modo='ligada'").run();
 expect((await webhook('checkout.session.completed',session,true))!.status).toBe(200);
 expect(read('SELECT * FROM qd_assinaturas')).toMatchObject({customer:'cus_quiddo',modo:'ligada',risk:''});
 const storage={sql:{exec:(sql:string,...values:any[])=>{
  const statement=sqlite.prepare(sql);
  if(/^SELECT/i.test(sql))return statement.all(...values);
  statement.run(...values);return [];
 }},transactionSync:(fn:()=>any)=>{sqlite.exec('BEGIN');try{const result=fn();sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 const ledger=new Ledger(storage);
 const ent=await entitlementFromStripe(env,EMAIL);
 expect(ledger.status(ent,Date.now()).remaining).toBe(3);
 for(const source of ['pdf','text','pdf-third']){
  const reservation=ledger.reserve(source,source,ent,Date.now());
  ledger.complete(reservation,{source},await entitlementFromStripe(env,EMAIL),Date.now());
 }
 expect(ledger.status(ent,Date.now()).remaining).toBe(0);
 await webhook('invoice.paid',invoice,true);
 expect(ledger.status(await entitlementFromStripe(env,EMAIL),Date.now()).remaining).toBe(0);
 expect(()=>ledger.reserve('fourth','fourth',ent,Date.now())).toThrow();
 expect(ledger.reserve('text','text',ent,Date.now()).replay.result).toEqual({source:'text'});
 await expect(entitlementFromStripe(env,'other@example.com')).rejects.toMatchObject({status:403});
 if(plan==='anual'){vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(ent.end+1000);const mid=await entitlementFromStripe(env,EMAIL);expect(mid.invoice).toBe(ent.invoice);expect(ledger.status(mid,Date.now()).remaining).toBe(3);}
 const start=sub.items.data[0].current_period_end,end=start+(plan==='anual'?365:30)*86400;
 Object.assign(sub.items.data[0],{current_period_start:start,current_period_end:end});
 Object.assign(invoice,{id:'in_next',status:'open',amount_paid:0});
 invoice.lines.data[0].period={start,end};sub.status='past_due';
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(start*1000+1000);
 expect((await webhook('invoice.payment_failed',invoice,true))!.status).toBe(200);
 await expect(entitlementFromStripe(env,EMAIL)).rejects.toMatchObject({status:403});
 Object.assign(invoice,{status:'paid',amount_paid:plan==='anual'?15600:1599});sub.status='active';
 expect((await webhook('invoice.paid',invoice,true))!.status).toBe(200);
 const next=await entitlementFromStripe(env,EMAIL);
 expect(ledger.status(next,Date.now()).remaining).toBe(3);
 expect(ledger.history()).toHaveLength(3);
 sub.cancel_at_period_end=true;
 await webhook('customer.subscription.updated',sub,true);
 expect(ledger.status(await entitlementFromStripe(env,EMAIL),Date.now()).remaining).toBe(3);
 sub.status='canceled';await webhook('customer.subscription.deleted',sub,true);
 await expect(entitlementFromStripe(env,EMAIL)).rejects.toMatchObject({status:403});
 expect(apiCalls.every(c=>c.method==='GET')).toBe(true);
});
const REF = '11111111-1111-4111-8111-111111111111';
const EMAIL = 'quiddo-qa@example.com';
const TOKEN = '1'.repeat(64);
const TEST_KEY = ['rk', 'test', 'fixture'].join('_');
const SECRET = 'unit-test-webhook';
let sqlite: DatabaseSync, env: CobrancaEnv;
let sub: Record<string, any>, session: Record<string, any>, invoice: Record<string, any>;
let apiCalls: { path: string; method: string; body: URLSearchParams }[];
let checkoutMode = 'subscription';
const request = (path: string, body: unknown = {}, authenticated = true, origin = ORIGIN) => new Request(ORIGIN + path, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...(authenticated ? { Cookie: 'qd_sessao=' + TOKEN } : {}) }, body: JSON.stringify(body) });
const response = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
const read = (sql: string) => sqlite.prepare(sql).get() as Record<string, any> | undefined;
function d1(db: DatabaseSync): D1Database {
 const prepare = (sql: string, values: any[] = []): any => ({
  bind: (...v: any[]) => prepare(sql, v),
  first: async () => db.prepare(sql).get(...values) || null,
  all: async () => ({ success: true, results: db.prepare(sql).all(...values), meta: {} }),
  run: async () => { const r = db.prepare(sql).run(...values); return { success: true, results: [], meta: { changes: r.changes } }; },
 });
 return { prepare, batch: async (statements: any[]) => { const out = []; for (const s of statements) out.push(await s.run()); return out; } } as unknown as D1Database;
}
const price = () => ({ id: 'price_qd_month_test', object: 'price', active: true, livemode: false, currency: 'brl', unit_amount: 1599, recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed' } });
async function api(input: string | URL | Request, options?: RequestInit) {
 const url = new URL(String(input)), method = options?.method || 'GET', body = new URLSearchParams(String(options?.body || ''));
 apiCalls.push({ path: url.pathname, method, body });
 if (url.pathname === '/v1/prices/price_qd_month_test') return response(price());
 if (url.pathname === '/v1/prices/price_qd_year_test') return response({ ...price(), id: 'price_qd_year_test', unit_amount: 15600, recurring: { interval: 'year', interval_count: 1, usage_type: 'licensed' } });
 if (url.pathname === '/v1/customers' && method === 'POST') return response({ id: 'cus_quiddo', object: 'customer', livemode: false });
 if (url.pathname === '/v1/checkout/sessions' && method === 'POST') return response({ ...session, client_reference_id: body.get('client_reference_id'), mode: body.get('mode'), url: 'https://checkout.stripe.com/c/pay/unit' });
 if (url.pathname === '/v1/checkout/sessions' && method === 'GET') return response({ object: 'list', data: [session], has_more: false });
 if (url.pathname === '/v1/checkout/sessions/cs_quiddo') return response(session);
 if (url.pathname === '/v1/subscriptions/sub_quiddo') return response(sub);
 if (url.pathname === '/v1/charges/ch_quiddo') return response({ id: 'ch_quiddo', livemode: false, payment_intent: 'pi_quiddo', refunded: true, amount_refunded: 1599 });
 if (url.pathname === '/v1/invoice_payments') return response({ object: 'list', data: [{ id: 'inpay_unit', invoice: invoice.id }], has_more: false });
 if (url.pathname.startsWith('/v1/invoices/')) return response(invoice);
 if (url.pathname === '/v1/billing_portal/sessions') return response({ id: 'bps_unit', url: 'https://billing.stripe.com/p/session/unit' });
 throw new Error('Unmocked endpoint ' + method + ' ' + url.pathname + ' ' + checkoutMode);
}
async function seedPurchase() {
 sqlite.prepare("INSERT INTO compras(ref,ordem,email,status,criado,valor,modo,plano,tipo,stripe_price) VALUES (?,?,?,'pendente',?,'15.99','teste','mensal','assinatura','price_qd_month_test')").run(REF, 'stripe:cs_quiddo', EMAIL, new Date().toISOString());
 sqlite.prepare('INSERT INTO qd_clientes_stripe(email,modo,customer) VALUES (?,?,?)').run(EMAIL, 'teste', 'cus_quiddo');
}
async function webhook(type: string, object: unknown, live = false, valid = true) {
 const body = JSON.stringify({ id: 'evt_unit', object: 'event', livemode: live, type, data: { object } }), ts = Math.floor(Date.now() / 1000);
 const sig = valid ? createHmac('sha256', SECRET).update(ts + '.' + body).digest('hex') : '0'.repeat(64);
 return rotaCobranca(new Request(ORIGIN + '/api/stripe-webhook', { method: 'POST', headers: { 'stripe-signature': `t=${ts},v1=${sig}` }, body }), env, '/api/stripe-webhook');
}
beforeEach(async () => {
 vi.useRealTimers(); sqlite = new DatabaseSync(':memory:');
 sqlite.exec("CREATE TABLE compras(ref TEXT PRIMARY KEY,ordem TEXT,email TEXT,status TEXT,codigo TEXT,criado TEXT,pago TEXT,valor TEXT,modo TEXT,plano TEXT,expira TEXT,tipo TEXT,stripe_price TEXT); CREATE TABLE sessoes(token TEXT PRIMARY KEY,email TEXT,criado INTEGER,expira INTEGER, simulado INTEGER NOT NULL DEFAULT 1)");
 sqlite.prepare('INSERT INTO sessoes (token, email, criado, expira) VALUES (?,?,?,?)').run(createHash('sha256').update(TOKEN).digest('hex'), EMAIL, Date.now(), Date.now() + 86400e3);
 env = { DB: d1(sqlite), COBRANCA: 'simulacao', STRIPE_KEY: TEST_KEY, STRIPE_PRICE_MENSAL: 'price_qd_month_test', STRIPE_WEBHOOK_SECRET: SECRET, STRIPE_PORTAL_CONFIG: 'bpc_quiddo_test' };
 await tabelasStripe(env.DB!);
 const end = Math.floor(Date.now() / 1000) + 30 * 86400;
 invoice = { id: 'in_quiddo', object: 'invoice', status: 'paid', currency: 'brl', amount_paid: 1599, parent: { type: 'subscription_details', subscription_details: { subscription: 'sub_quiddo' } } };
 sub = { id: 'sub_quiddo', object: 'subscription', customer: 'cus_quiddo', status: 'active', livemode: false, cancel_at_period_end: false, latest_invoice: invoice, items: { data: [{ id: 'si_quiddo', quantity: 1, price: price(), current_period_end: end }] } };
 session = { id: 'cs_quiddo', object: 'checkout.session', client_reference_id: REF, mode: 'subscription', livemode: false, currency: 'brl', amount_total: 1599, subscription: 'sub_quiddo', customer: 'cus_quiddo', status: 'complete', payment_status: 'paid' };
 apiCalls = []; checkoutMode = 'subscription'; vi.stubGlobal('fetch', vi.fn(api));
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); sqlite.close(); });

describe('Quiddo Stripe mensal', () => {
 it('preserves public simulation and exposes test card only for explicit tester', async () => {
  const normal = await rotaCobranca(new Request(ORIGIN + '/api/cobranca'), env, '/api/cobranca');
  const tester = await rotaCobranca(new Request(ORIGIN + '/api/cobranca?teste_cobranca=1'), env, '/api/cobranca');
  expect((await normal!.json() as any).cartao).toBe(false); expect((await tester!.json() as any).cartao).toBe(true);
  expect(apiCalls).toHaveLength(0);
 });
 it('requires verified account and an explicit test request', async () => {
  expect((await rotaCobranca(request('/api/cartao', { email: EMAIL, plano: 'mensal', testeCobranca: true }, false), env, '/api/cartao'))!.status).toBe(401);
  expect((await rotaCobranca(request('/api/cartao', { email: EMAIL, plano: 'mensal' }), env, '/api/cartao'))!.status).not.toBe(200);
  expect(apiCalls).toHaveLength(0);
 });
 it('creates mode subscription at the server price for the logged-in identity', async () => {
  const r = await rotaCobranca(request('/api/cartao', { email: 'other@example.com', plano: 'mensal', testeCobranca: true, price: 1 }), env, '/api/cartao');
  expect(r!.status).toBe(200);
  const call = apiCalls.find(x => x.path === '/v1/checkout/sessions' && x.method === 'POST')!;
  expect(call.body.get('mode')).toBe('subscription'); expect(call.body.get('line_items[0][price]')).toBe('price_qd_month_test');
  expect(call.body.get('allowed_payment_method_types[0]')).toBe('card');
  expect(read('SELECT email,tipo,modo FROM compras')).toMatchObject({ email: EMAIL, tipo: 'assinatura', modo: 'teste' });
  expect(apiCalls.find(x => x.path === '/v1/customers')!.body.get('email')).toBe(EMAIL);
 });
 it('does not allow a live key in test or a test key in production', async () => {
  expect(mensalConfigurado({ ...env, STRIPE_KEY: ['rk','live','fixture'].join('_') })).toBe(false);
  expect(mensalConfigurado({ ...env, COBRANCA: 'ligada' })).toBe(false);
  env.COBRANCA = 'ligada';
  expect((await rotaCobranca(request('/api/cartao', { plano: 'mensal', testeCobranca: true }), env, '/api/cartao'))!.status).toBe(503);
  expect(apiCalls).toHaveLength(0);
 });
 it('keeps the seven-day pass one-time with its original price', async () => {
  checkoutMode = 'payment';
  const r = await rotaCobranca(request('/api/cartao', { email: EMAIL, plano: 'semana', testeCobranca: true }, false), env, '/api/cartao');
  expect(r!.status).toBe(200);
  const call = apiCalls.find(x => x.path === '/v1/checkout/sessions' && x.method === 'POST')!;
  expect(call.body.get('mode')).toBe('payment'); expect(call.body.get('line_items[0][price_data][unit_amount]')).toBe('1299');
 });
 it('signed checkout confirms first period and repeated events keep one access code', async () => {
  await seedPurchase(); expect((await webhook('checkout.session.completed', session))!.status).toBe(200);
  const first = read('SELECT codigo,expira FROM compras')!; expect(first.codigo).toMatch(/^QD-/);
  expect((await webhook('checkout.session.completed', session))!.status).toBe(200);
  expect(read('SELECT codigo,expira FROM compras')).toEqual(first);
  expect(await codigoValido(env, first.codigo)).toBe(true);
 });
 it('an active subscription without a paid invoice does not grant access', async () => {
  await seedPurchase(); sub.latest_invoice = { ...invoice, status: 'open', amount_paid: 0 };
  await webhook('customer.subscription.created', sub);
  expect(read('SELECT status,codigo FROM compras')).toMatchObject({ status: 'suspenso', codigo: null });
 });
 it('paid renewal extends expiry once without replacing the code', async () => {
  await seedPurchase(); await webhook('checkout.session.completed', session); const before = read('SELECT codigo,expira FROM compras')!;
  sub.items.data[0].current_period_end += 30 * 86400; invoice = { ...invoice, id: 'in_renewal' }; sub.latest_invoice = invoice;
  await webhook('invoice.paid', invoice); await webhook('invoice.paid', invoice);
  const after = read('SELECT codigo,expira FROM compras')!; expect(after.codigo).toBe(before.codigo); expect(Date.parse(after.expira)).toBeGreaterThan(Date.parse(before.expira));
 });
 it('failed renewal cannot extend the last paid-through date', async () => {
  await seedPurchase(); await webhook('checkout.session.completed', session); const before = read('SELECT codigo,expira FROM compras')!;
  sub.status = 'past_due'; sub.items.data[0].current_period_end += 30 * 86400; sub.latest_invoice = { ...invoice, status: 'open', amount_paid: 0 };
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(Date.parse(before.expira) + 1000);
  await webhook('invoice.payment_failed', sub.latest_invoice);
  expect(read('SELECT expira FROM compras')!.expira).toBe(before.expira); expect(await codigoValido(env, before.codigo)).toBe(false);
 });
 it.each(['period_end', 'cancel_at'])('scheduled cancellation via %s retains paid access; actual cancellation revokes it', async (kind) => {
  await seedPurchase(); await webhook('checkout.session.completed', session); const code = read('SELECT codigo FROM compras')!.codigo;
  if (kind === 'period_end') sub.cancel_at_period_end = true; else sub.cancel_at = sub.items.data[0].current_period_end;
  await webhook('customer.subscription.updated', sub); expect(await codigoValido(env, code)).toBe(true);
  expect(read('SELECT cancel_at_period_end FROM qd_assinaturas')!.cancel_at_period_end).toBe(1);
  const account = await rotaCobranca(new Request(ORIGIN + '/api/conta', { headers: { Cookie: 'qd_sessao=' + TOKEN } }), env, '/api/conta');
  expect((await account!.json() as any).assinatura.renova).toBe(false);
  sub.status = 'canceled'; await webhook('customer.subscription.deleted', sub); expect(await codigoValido(env, code)).toBe(false);
 });
 it.each(['charge.refunded','charge.dispute.created','radar.early_fraud_warning.created'])('risk event %s revokes access and a later invoice cannot clear it', async (kind) => {
  await seedPurchase(); await webhook('checkout.session.completed', session); const code = read('SELECT codigo FROM compras')!.codigo;
  const object = kind === 'charge.refunded' ? { id: 'ch_quiddo', refunded: true, amount_refunded: 1599 } : { id: 'risk_unit', charge: 'ch_quiddo' };
  expect((await webhook(kind, object))!.status).toBe(200); expect(await codigoValido(env, code)).toBe(false);
  await webhook('invoice.paid', invoice); expect(await codigoValido(env, code)).toBe(false);
 });
 it('forged signature and wrong mode never change entitlement', async () => {
  await seedPurchase(); expect((await webhook('checkout.session.completed', session, false, false))!.status).toBe(401);
  expect((await webhook('checkout.session.completed', session, true))!.status).toBe(400);
  expect(read('SELECT status,codigo FROM compras')).toMatchObject({ status: 'pendente', codigo: null });
 });
 it('wrong product, amount, mode or customer cannot unlock a subscription', async () => {
  await seedPurchase(); sub.items.data[0].price = { ...price(), id: 'price_other_brand' }; expect(await reconciliarAssinatura(env, 'sub_quiddo', true)).toBeNull();
  sub.items.data[0].price = { ...price(), unit_amount: 100 }; expect(await reconciliarAssinatura(env, 'sub_quiddo', true)).toBeNull();
  sub.items.data[0].price = price(); sub.livemode = true; expect(await reconciliarAssinatura(env, 'sub_quiddo', true)).toBeNull();
  sub.livemode = false; sub.customer = 'cus_other'; expect(await reconciliarAssinatura(env, 'sub_quiddo', true)).toBeNull();
  expect(read('SELECT codigo FROM compras')!.codigo).toBeNull();
 });
 it('portal requires login, same origin and the server-owned customer', async () => {
  await seedPurchase();
  expect((await rotaCobranca(request('/api/assinatura/portal', {}, false), env, '/api/assinatura/portal'))!.status).toBe(401);
  expect((await rotaCobranca(request('/api/assinatura/portal', {}, true, 'https://other.example'), env, '/api/assinatura/portal'))!.status).toBe(403);
  const r = await rotaCobranca(request('/api/assinatura/portal', { customer: 'cus_victim' }), env, '/api/assinatura/portal'); expect(r!.status).toBe(200);
  const call = apiCalls.find(x => x.path === '/v1/billing_portal/sessions')!;
  expect(call.body.get('customer')).toBe('cus_quiddo'); expect(call.body.get('configuration')).toBe('bpc_quiddo_test');
 });
 it('blocks duplicate subscriptions for an existing subscriber', async () => {
  await seedPurchase(); await webhook('checkout.session.completed', session); apiCalls = [];
  const r = await rotaCobranca(request('/api/cartao', { plano: 'mensal', testeCobranca: true }), env, '/api/cartao'); expect(r!.status).toBe(409);
  expect(apiCalls.filter(c => c.path === '/v1/checkout/sessions' && c.method === 'POST')).toHaveLength(0);
 });
 it('risk, expiry and unpaid status fail closed in the entitlement predicate', () => {
  expect(acessoAssinatura({ status: 'active', paid_until: Date.now()/1000 + 100, risk: '' })).toBe(true);
  for (const a of [{ status: 'active', paid_until: Date.now()/1000 - 1, risk: '' }, { status: 'incomplete', paid_until: Date.now()/1000 + 100, risk: '' }, { status: 'active', paid_until: Date.now()/1000 + 100, risk: 'disputa' }]) expect(acessoAssinatura(a)).toBe(false);
 });
});

 describe('ativação mensal em produção', () => {
 it('não usa credenciais de teste como fallback de produção', async () => {
  env.COBRANCA = 'ligada';
  const r = await rotaCobranca(new Request(ORIGIN + '/api/cobranca'), env, '/api/cobranca');
  const c = await r!.json() as any;
  expect(c.cartao).toBe(false); expect(c.pix).toBe(false);
  expect(c.planos.map((p: any) => p.id)).toEqual(['semana','mensal']);
 });
 it('oferece mensal e avulso no cartão e recusa Pix no servidor', async () => {
  Object.assign(env, { COBRANCA: 'ligada', STRIPE_LIVE_KEY: ['rk','live','fixture'].join('_'), STRIPE_LIVE_PRICE_MENSAL:'price_live', STRIPE_LIVE_PORTAL_CONFIG:'bpc_live', STRIPE_LIVE_WEBHOOK_SECRET:'unit-live' });
  const r = await rotaCobranca(new Request(ORIGIN + '/api/cobranca'), env, '/api/cobranca');
  const c = await r!.json() as any;
  expect(c).toMatchObject({ cartao:true, cartaoTeste:false, pix:false, assinaturaMensal:true });
  expect(c.planos.map((p: any) => p.id)).toEqual(['semana','mensal']);
  expect((await rotaCobranca(request('/api/pix', { plano:'mensal' }), env, '/api/pix'))!.status).toBe(503);
  expect(apiCalls).toHaveLength(0);
 });
});

describe('Pix avulso e oferta com desconto', () => {
 it('expõe Pix quando configurado mas recusa Mensal por Pix', async () => {
  Object.assign(env, {COBRANCA:'ligada',MP_TOKEN:'mp-unit'});
  const c=await (await rotaCobranca(new Request(ORIGIN+'/api/cobranca'),env,'/api/cobranca'))!.json() as any;
  expect(c.pix).toBe(true);
  const r=await rotaCobranca(request('/api/pix',{plano:'mensal',email:EMAIL}),env,'/api/pix');
  expect(r!.status).toBe(400); expect(apiCalls).toHaveLength(0);
 });
 it('recusa desconto no cartão sem validar sala e anfitrião',async()=>{
  env.COBRANCA='teste';
  const r=await rotaCobranca(request('/api/cartao',{plano:'oferta',testeCobranca:true,email:EMAIL,sala:'ABCD',hostKey:'errado'}),env,'/api/cartao',async()=>false);
  expect(r!.status).toBe(403);expect(apiCalls).toHaveLength(0);
 });
 it('cobra R$9,99 no cartão para oferta validada e mantém 7 dias',async()=>{
  env.COBRANCA='teste';
  const valid=vi.fn(async()=>true);
  const r=await rotaCobranca(request('/api/cartao',{plano:'oferta',testeCobranca:true,email:EMAIL,sala:'ABCD',hostKey:'certo',valor:1}),env,'/api/cartao',valid);
  expect(r!.status).toBe(200);expect(valid).toHaveBeenCalledWith('ABCD','certo');
  const call=apiCalls.find(x=>x.method==='POST'&&x.path==='/v1/checkout/sessions')!;
  expect(call.body.get('line_items[0][price_data][unit_amount]')).toBe('999');expect(call.body.get('mode')).toBe('payment');
  expect(read('SELECT plano,valor FROM compras')).toMatchObject({plano:'oferta',valor:'9.99'});
 });
 it('gera Pix avulso pelo preço do servidor',async()=>{
  Object.assign(env,{COBRANCA:'ligada',MP_TOKEN:'mp-unit'});
  vi.stubGlobal('fetch',vi.fn(async(_url,init)=>{const b=JSON.parse(String(init.body));expect(b.total_amount).toBe('12.99');return response({id:'ORDUNIT',transactions:{payments:[{payment_method:{qr_code:'pix-unit'}}]}})}));
  const r=await rotaCobranca(request('/api/pix',{plano:'semana',email:EMAIL,valor:1}),env,'/api/pix');
  expect(r!.status).toBe(200);expect(await r!.json()).toMatchObject({qr:'pix-unit'});
  expect(read('SELECT plano,valor FROM compras')).toMatchObject({plano:'semana',valor:'12.99'});
 });
});

describe('Quiddo Stripe anual', () => {
 it('só oferece o Anual com o preço anual configurado', async () => {
  const sem = await (await rotaCobranca(new Request(ORIGIN + '/api/cobranca?teste_cobranca=1'), env, '/api/cobranca'))!.json() as any;
  expect(sem.planos.map((p: any) => p.id)).toEqual(['semana', 'mensal']);
  env.STRIPE_PRICE_ANUAL = 'price_qd_year_test';
  const com = await (await rotaCobranca(new Request(ORIGIN + '/api/cobranca?teste_cobranca=1'), env, '/api/cobranca'))!.json() as any;
  expect(com.planos.map((p: any) => [p.id, p.preco])).toEqual([['semana', '12,99'], ['mensal', '15,99'], ['anual', '156,00']]);
 });
 it('cria a assinatura anual no preço anual do servidor e grava o plano', async () => {
  env.STRIPE_PRICE_ANUAL = 'price_qd_year_test';
  const r = await rotaCobranca(request('/api/cartao', { plano: 'anual', testeCobranca: true }), env, '/api/cartao');
  expect(r!.status).toBe(200);
  const call = apiCalls.find(x => x.path === '/v1/checkout/sessions' && x.method === 'POST')!;
  expect(call.body.get('mode')).toBe('subscription'); expect(call.body.get('line_items[0][price]')).toBe('price_qd_year_test');
  expect(read('SELECT plano,valor,tipo FROM compras')).toMatchObject({ plano: 'anual', valor: '156.00', tipo: 'assinatura' });
 });
 it('recusa o Anual no Pix e quando o preço do Stripe não bate', async () => {
  env.STRIPE_PRICE_ANUAL = 'price_qd_year_test';
  expect((await rotaCobranca(request('/api/pix', { email: EMAIL, plano: 'anual' }), env, '/api/pix'))!.status).toBe(400);
  env.PRECO_ANUAL = '120.00';
  expect((await rotaCobranca(request('/api/cartao', { plano: 'anual', testeCobranca: true }), env, '/api/cartao'))!.status).toBe(503);
 });
});
