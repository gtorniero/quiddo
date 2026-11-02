// Cobrança do Quiddo, no mesmo modelo do Retrozap. Grátis: salas de até 10 pessoas. Pago: salas de até 200,
// quantos jogos quiser, no plano Mensal (30 dias) ou no Passe 7 dias. Quem paga recebe um código QD-XXXX-XXXX,
// guardado no navegador, que também serve em outro aparelho até o fim do plano.
//   Pix: Mercado Pago (segredo MP_TOKEN). Cartão, Apple Pay e Google Pay: Stripe Checkout (segredo STRIPE_KEY).
//   Variável COBRANCA (wrangler.jsonc):
//     "simulacao" = vale para todos, mas o Pix é de mentira (aprova sozinho) e o cartão não aparece;
//     "teste" = só vale com ?teste_cobranca=1 e, sem MP_TOKEN, o Pix é simulado;
//     "ligada" = cobrança de verdade para todos; "desligada" = sem limite e sem cobrança.
//   Preços: variáveis PRECO_MENSAL e PRECO_SEMANA (padrão 25.99 e 15.99), iguais no Pix e no cartão.
// Ver compras: Cloudflare > D1 > quiddo > Console:  SELECT * FROM compras ORDER BY criado DESC;
// Só passam por aqui o e-mail de quem paga, o identificador da compra e o código. Nada do quiz.

import { emailDaSessao } from './login';

export interface CobrancaEnv {
  DB?: D1Database;
  COBRANCA?: string;
  MP_TOKEN?: string;
  STRIPE_KEY?: string;
  PRECO_MENSAL?: string;
  PRECO_SEMANA?: string;
  CODIGOS_AMIGOS?: string;
  MP_API?: string;
  MP_PAY_API?: string;
  STRIPE_API?: string;
}

export type Modo = 'ligada' | 'simulacao' | 'teste' | 'desligada';
export type Plano = 'mensal' | 'semana';

const PLANOS: Record<Plano, { nome: string; dias: number; padrao: string }> = {
  mensal: { nome: 'Mensal', dias: 30, padrao: '25.99' },
  semana: { nome: 'Passe 7 dias', dias: 7, padrao: '15.99' },
};
const planoDe = (v: unknown): Plano => (v === 'semana' ? 'semana' : 'mensal');

const MP_ORDERS = 'https://api.mercadopago.com/v1/orders';
const MP_PAY = 'https://api.mercadopago.com/v1/payments';
const STRIPE = 'https://api.stripe.com/v1/checkout/sessions';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const CODIGO_RE = /^QD-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export const modo = (env: CobrancaEnv): Modo =>
  env.COBRANCA === 'ligada' || env.COBRANCA === 'simulacao' || env.COBRANCA === 'desligada' ? env.COBRANCA : 'teste';
const tok = (env: CobrancaEnv) => String(env.MP_TOKEN || '').trim().replace(/^['"]|['"]$/g, '').replace(/^Bearer\s+/i, '').trim();
const stripeKey = (env: CobrancaEnv) => String(env.STRIPE_KEY || '').trim();
const stripeTeste = (env: CobrancaEnv) => /^(sk|rk)_test_/.test(stripeKey(env));
const preco = (env: CobrancaEnv, p: Plano) => String((p === 'mensal' ? env.PRECO_MENSAL : env.PRECO_SEMANA) || PLANOS[p].padrao);
const virgula = (v: string) => Number(v).toFixed(2).replace('.', ',');
// Pix simulado: na simulação, ou no modo teste sem token do Mercado Pago (para ver o fluxo antes de ligar a conta)
const pixSimulado = (env: CobrancaEnv) => modo(env) === 'simulacao' || (modo(env) === 'teste' && !tok(env));
// na simulação o cartão não aparece, mesmo com a chave do Stripe
const cartaoPronto = (env: CobrancaEnv) => !!stripeKey(env) && modo(env) !== 'simulacao';
const aleatorio = (n: number) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');

let colunas = false;
async function tabela(db: D1Database) {
  await db
    .prepare('CREATE TABLE IF NOT EXISTS compras (ref TEXT PRIMARY KEY, ordem TEXT, email TEXT, status TEXT, codigo TEXT, criado TEXT, pago TEXT, valor TEXT, modo TEXT)')
    .run();
  if (colunas) return;
  // plano e validade entraram depois: em bancos antigos, acrescenta as colunas (se já existem, dá erro e segue)
  for (const c of ['plano TEXT', 'expira TEXT']) await db.prepare(`ALTER TABLE compras ADD COLUMN ${c}`).run().catch(() => {});
  colunas = true;
}

interface Ordem {
  status?: string;
  status_detail?: string;
  transactions?: { payments?: { status?: string; status_detail?: string }[] };
}
const foiPago = (o: Ordem | null) =>
  !!o &&
  (o.status === 'approved' ||
    o.status === 'processed' ||
    /accredited|approved/.test(o.status_detail || '') ||
    (o.transactions?.payments || []).some((p) => p.status === 'processed' || /accredited|approved/.test(p.status_detail || '')));

async function consultaOrdem(env: CobrancaEnv, id: string, criado: string): Promise<Ordem | null> {
  if (id.startsWith('sim:')) return Date.now() - Date.parse(criado) > 4000 ? { status: 'approved' } : { status: 'pending' };
  if (id.startsWith('stripe:')) {
    const r = await fetch(`${env.STRIPE_API || STRIPE}/${encodeURIComponent(id.slice(7))}`, { headers: { Authorization: `Bearer ${stripeKey(env)}` } });
    const s = r.ok ? ((await r.json()) as { payment_status?: string }) : null;
    return s ? { status: s.payment_status === 'paid' ? 'approved' : 'pending' } : null;
  }
  // "pay:123" = API clássica de pagamentos; senão, order da API de Orders
  const url = id.startsWith('pay:') ? `${env.MP_PAY_API || MP_PAY}/${encodeURIComponent(id.slice(4))}` : `${env.MP_API || MP_ORDERS}/${encodeURIComponent(id)}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${tok(env)}` } });
  return r.ok ? ((await r.json()) as Ordem) : null;
}

interface Compra {
  ref: string;
  ordem: string;
  status: string;
  codigo: string | null;
  criado: string;
  plano: string | null;
  expira: string | null;
}

type Acesso = { codigo: string; plano: Plano; expira: string };

/** Marca como paga e cria o código (uma vez só), válido pelos dias do plano. Devolve null se ainda não pagou. */
async function confirma(env: CobrancaEnv, ref: string): Promise<Acesso | null> {
  const db = env.DB!;
  const c = await db.prepare('SELECT * FROM compras WHERE ref = ?').bind(ref).first<Compra>();
  if (!c) return null;
  const plano = planoDe(c.plano);
  if (c.status === 'pago') return c.codigo ? { codigo: c.codigo, plano, expira: c.expira || '' } : null;
  if (!foiPago(await consultaOrdem(env, c.ordem, c.criado))) return null;
  const codigo = `QD-${aleatorio(4)}-${aleatorio(4)}`;
  const agora = new Date();
  const expira = new Date(agora.getTime() + PLANOS[plano].dias * 86400e3).toISOString();
  await db
    .prepare("UPDATE compras SET status = 'pago', codigo = ?, pago = ?, expira = ? WHERE ref = ? AND status != 'pago'")
    .bind(codigo, agora.toISOString(), expira, ref)
    .run();
  const l = await db.prepare('SELECT codigo, expira FROM compras WHERE ref = ?').bind(ref).first<{ codigo: string; expira: string }>();
  return { codigo: l?.codigo || codigo, plano, expira: l?.expira || expira };
}

/** O código vale? Usado pela API e pela sala, na hora de abrir ou liberar mais gente. */
export async function codigoValido(env: CobrancaEnv, raw: unknown): Promise<boolean> {
  const codigo = String(raw || '').trim().toUpperCase().slice(0, 40);
  if (!codigo) return false;
  const amigos = String(env.CODIGOS_AMIGOS || '')
    .toUpperCase()
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  if (amigos.includes(codigo)) return true;
  if (!CODIGO_RE.test(codigo) || !env.DB) return false;
  await tabela(env.DB);
  return !!(await acessoDo(env, codigo));
}

/** Plano e validade de um código pago e ainda válido. Com a cobrança ligada, códigos de teste e simulação não valem. */
async function acessoDo(env: CobrancaEnv, codigo: string): Promise<Acesso | null> {
  if (!env.DB) return null;
  await tabela(env.DB);
  const filtro = modo(env) === 'ligada' ? " AND modo = 'ligada'" : '';
  const l = await env.DB.prepare(`SELECT plano, expira FROM compras WHERE codigo = ? AND status = 'pago' AND (expira IS NULL OR expira > ?)${filtro}`)
    .bind(codigo, new Date().toISOString())
    .first<{ plano: string | null; expira: string | null }>();
  return l ? { codigo, plano: planoDe(l.plano), expira: l.expira || '' } : null;
}

/** Plano em dia mais longo comprado com este e-mail. */
async function acessoPorEmail(env: CobrancaEnv, email: string): Promise<Acesso | null> {
  if (!env.DB) return null;
  await tabela(env.DB);
  const filtro = modo(env) === 'ligada' ? " AND modo = 'ligada'" : '';
  const l = await env.DB.prepare(`SELECT codigo FROM compras WHERE email = ? AND status = 'pago' AND (expira IS NULL OR expira > ?)${filtro} ORDER BY expira DESC LIMIT 1`)
    .bind(email, new Date().toISOString())
    .first<{ codigo: string }>();
  return l?.codigo ? acessoDo(env, l.codigo) : null;
}

/** A cobrança vale para este pedido? No modo teste, só quando o site manda testeCobranca. */
export const cobrancaVale = (env: CobrancaEnv, testeCobranca: unknown) =>
  modo(env) === 'ligada' || modo(env) === 'simulacao' || (modo(env) === 'teste' && testeCobranca === true);

async function lerJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function emailDe(c: Record<string, unknown> | null) {
  const e = String(c?.email || '')
    .trim()
    .toLowerCase()
    .slice(0, 120);
  return EMAIL_RE.test(e) ? e : '';
}

/** Rotas /api/cobranca, /api/pix, /api/pix/status, /api/cartao, /api/acesso e os avisos dos dois serviços. */
export async function rotaCobranca(req: Request, env: CobrancaEnv, caminho: string): Promise<Response | null> {
  const db = env.DB;

  // GET /api/conta: e-mail de quem está logado e o plano em dia ligado a ele
  if (caminho === '/api/conta') {
    const email = await emailDaSessao(req, env);
    if (!email) return json({ email: null, acesso: null });
    return json({ email, acesso: await acessoPorEmail(env, email) });
  }

  // GET /api/cobranca: o site pergunta se a cobrança está valendo e quais meios estão prontos
  if (caminho === '/api/cobranca') {
    return json({
      modo: modo(env),
      pix: !!db && (!!tok(env) || pixSimulado(env)),
      pixSimulado: pixSimulado(env),
      cartao: !!db && cartaoPronto(env),
      cartaoTeste: stripeTeste(env),
      planos: (Object.keys(PLANOS) as Plano[]).map((id) => ({ id, nome: PLANOS[id].nome, dias: PLANOS[id].dias, preco: virgula(preco(env, id)) })),
      gratis: 10,
      pago: 200,
    });
  }
  if (req.method !== 'POST') return null;

  // POST /api/pix {email}: cria o Pix e devolve o QR
  if (caminho === '/api/pix') {
    if (!db || !(tok(env) || pixSimulado(env))) return json({ erro: 'indisponivel' }, 503);
    if (modo(env) === 'desligada') return json({ erro: 'desligada' }, 403);
    const pedido = await lerJson(req);
    // logado, a compra fica no e-mail da conta
    const email = (await emailDaSessao(req, env)) || emailDe(pedido);
    if (!email) return json({ erro: 'email' }, 400);
    const plano = planoDe(pedido?.plano);
    await tabela(db);
    const ref = crypto.randomUUID();
    const valor = preco(env, plano);
    const agora = new Date().toISOString();
    const inserir = 'INSERT INTO compras (ref, ordem, email, status, criado, valor, modo, plano) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    if (pixSimulado(env)) {
      await db.prepare(inserir).bind(ref, 'sim:' + ref, email, 'pendente', agora, valor, modo(env) === 'simulacao' ? 'simulacao' : 'teste', plano).run();
      return json({ ref, qr: '00020126580014BR.GOV.BCB.PIX0136quiddo-pix-de-teste-nao-pague5204000053039865802BR5906QUIDDO6009SAO PAULO', qr64: '', link: '', simulado: true });
    }
    const corpo = {
      type: 'online',
      processing_mode: 'automatic',
      total_amount: valor,
      external_reference: ref,
      description: `Quiddo ${PLANOS[plano].nome}: salas com até 200 pessoas`,
      payer: { email },
      transactions: { payments: [{ amount: valor, payment_method: { id: 'pix', type: 'bank_transfer' }, expiration_time: 'PT30M' }] },
    };
    const cab = { 'content-type': 'application/json', accept: 'application/json', Authorization: `Bearer ${tok(env)}` };
    let ordem = '';
    let pm: { qr_code?: string; qr_code_base64?: string; ticket_url?: string } = {};
    // 1) API de Orders; 2) se falhar, a API clássica de pagamentos
    let r = await fetch(env.MP_API || MP_ORDERS, { method: 'POST', headers: { ...cab, 'X-Idempotency-Key': ref }, body: JSON.stringify(corpo) });
    let o = (await r.json().catch(() => null)) as { id?: string; transactions?: { payments?: { payment_method?: typeof pm }[] }; point_of_interaction?: { transaction_data?: typeof pm } } | null;
    if (r.ok && o?.id) {
      ordem = o.id;
      pm = o.transactions?.payments?.[0]?.payment_method || {};
    } else {
      const classico = {
        transaction_amount: Number(valor),
        description: corpo.description,
        payment_method_id: 'pix',
        external_reference: ref,
        payer: { email },
        date_of_expiration: new Date(Date.now() + 30 * 60e3).toISOString().replace('Z', '-00:00'),
      };
      r = await fetch(env.MP_PAY_API || MP_PAY, { method: 'POST', headers: { ...cab, 'X-Idempotency-Key': ref + '-p' }, body: JSON.stringify(classico) });
      o = (await r.json().catch(() => null)) as typeof o;
      if (r.ok && o?.id) {
        ordem = 'pay:' + o.id;
        pm = o.point_of_interaction?.transaction_data || {};
      }
    }
    if (!ordem) {
      console.log('mercado pago erro', r.status, JSON.stringify(o).slice(0, 300));
      return json({ erro: 'mp' }, 502);
    }
    await db.prepare(inserir).bind(ref, ordem, email, 'pendente', agora, valor, modo(env), plano).run();
    return json({ ref, qr: pm.qr_code || '', qr64: pm.qr_code_base64 || '', link: pm.ticket_url || '' });
  }

  // POST /api/pix/status {ref}: o site pergunta a cada poucos segundos se já pagou (vale para Pix e cartão)
  if (caminho === '/api/pix/status') {
    if (!db) return json({ erro: 'indisponivel' }, 503);
    const c = await lerJson(req);
    const ref = String(c?.ref || '').slice(0, 60);
    if (!ref) return json({ erro: 'pedido' }, 400);
    await tabela(db);
    const a = await confirma(env, ref);
    return json(a ? { pago: true, ...a } : { pago: false });
  }

  // POST /api/cartao {email, volta}: cria a página de pagamento do Stripe (cartão, Apple Pay, Google Pay)
  if (caminho === '/api/cartao') {
    if (!db || !cartaoPronto(env)) return json({ erro: 'indisponivel' }, 503);
    if (modo(env) === 'desligada') return json({ erro: 'desligada' }, 403);
    const c = await lerJson(req);
    const email = (await emailDaSessao(req, env)) || emailDe(c);
    if (!email) return json({ erro: 'email' }, 400);
    await tabela(db);
    const ref = crypto.randomUUID();
    const origem = new URL(req.url).origin;
    // volta para a página de onde a pessoa saiu (editor ou sala), sempre no mesmo site
    const volta = /^\/[A-Za-z0-9/_-]{0,40}$/.test(String(c?.volta || '')) ? String(c?.volta) : '/criar';
    // o Mensal no cartão ainda é cobrado como 30 dias avulsos; a renovação automática entra quando o Stripe for ligado
    const plano = planoDe(c?.plano);
    const valor = preco(env, plano);
    const f = new URLSearchParams({
      mode: 'payment',
      locale: 'pt-BR',
      customer_email: email,
      client_reference_id: ref,
      'metadata[ref]': ref,
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': 'brl',
      'line_items[0][price_data][unit_amount]': String(Math.round(Number(valor) * 100)),
      'line_items[0][price_data][product_data][name]': `Quiddo ${PLANOS[plano].nome}: salas com até 200 pessoas`,
      'line_items[0][price_data][product_data][description]': `Jogos ilimitados por ${PLANOS[plano].dias} dias, com o seu código em qualquer aparelho.`,
      success_url: `${origem}${volta}?pagamento=ok&ref=${ref}`,
      cancel_url: `${origem}${volta}?pagamento=volta`,
    });
    const r = await fetch(env.STRIPE_API || STRIPE, {
      method: 'POST',
      headers: { Authorization: `Bearer ${stripeKey(env)}`, 'content-type': 'application/x-www-form-urlencoded', 'Idempotency-Key': ref },
      body: f,
    });
    const s = (await r.json().catch(() => null)) as { id?: string; url?: string; error?: { message?: string } } | null;
    if (!r.ok || !s?.url || !s.id) {
      console.log('stripe erro', r.status, JSON.stringify(s?.error || s).slice(0, 300));
      return json({ erro: 'stripe', detalhe: stripeTeste(env) ? s?.error?.message : undefined }, 502);
    }
    await db
      .prepare('INSERT INTO compras (ref, ordem, email, status, criado, valor, modo, plano) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(ref, 'stripe:' + s.id, email, 'pendente', new Date().toISOString(), valor, stripeTeste(env) ? 'teste' : modo(env), plano)
      .run();
    return json({ ref, url: s.url });
  }

  // POST /api/acesso {codigo} ou {email}: confere um código digitado ou recupera o plano pelo e-mail do pagamento.
  // Pelo e-mail, só com login daquele e-mail (senão qualquer um pegaria o código de outra pessoa).
  if (caminho === '/api/acesso') {
    const c = await lerJson(req);
    const email = emailDe(c);
    if (email) {
      if ((await emailDaSessao(req, env)) !== email) return json({ ok: false, login: true });
      const a = await acessoPorEmail(env, email);
      return json(a ? { ok: true, ...a } : { ok: false });
    }
    const codigo = String(c?.codigo || '').trim().toUpperCase().slice(0, 40);
    if (!(await codigoValido(env, codigo))) return json({ ok: false, codigo });
    return json({ ok: true, ...((await acessoDo(env, codigo)) || { codigo, plano: 'mensal', expira: '' }) });
  }

  // avisos dos serviços (opcionais): a confirmação é sempre conferida direto na API de quem cobrou
  if (caminho === '/api/stripe-webhook' || caminho === '/api/mp-webhook') {
    if (!db) return json({ ok: true });
    const c = (await lerJson(req)) as { data?: { id?: string; object?: { id?: string } } } | null;
    await tabela(db);
    const id = String(caminho === '/api/stripe-webhook' ? c?.data?.object?.id || '' : c?.data?.id || '').slice(0, 120);
    if (!id) return json({ ok: true });
    const linha = await db.prepare('SELECT ref FROM compras WHERE ordem = ? OR ordem = ? OR ordem = ?').bind(id, 'pay:' + id, 'stripe:' + id).first<{ ref: string }>();
    if (linha) await confirma(env, linha.ref);
    return json({ ok: true });
  }

  return null;
}
