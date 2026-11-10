// Login sem senha: a pessoa digita o e-mail, recebe um código de 6 dígitos e entra.
// A sessão fica num cookie HttpOnly (qd_sessao), que o JavaScript da página não lê, válida por 30 dias.
//   E-mail: Resend (segredo RESEND_KEY; remetente na variável EMAIL_DE, ex.: "Quiddo <entrar@quiddo.com.br>").
//   Sem RESEND_KEY e com a cobrança fora do modo "ligada", o login é simulado: o código volta na resposta e
//   aparece na tela, para ver o caminho todo antes de ligar o e-mail.
// No banco ficam só o e-mail, o resumo (hash) do código e o resumo do token da sessão; nunca o código ou o token.
import { type CobrancaEnv, modo } from './cobranca';

export interface LoginEnv extends CobrancaEnv {
  RESEND_KEY?: string;
  EMAIL_DE?: string;
  RESEND_API?: string;
}

const RESEND = 'https://api.resend.com/emails';
const CODIGO_MS = 10 * 60 * 1000; // o código vale 10 minutos
const SESSAO_S = 30 * 24 * 60 * 60; // a sessão vale 30 dias
const MAX_TENTATIVAS = 5; // erros por código
const MAX_CODIGOS_EMAIL = 3; // códigos por e-mail a cada 15 minutos
const MAX_CODIGOS_IP = 10; // códigos por endereço de internet a cada hora
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const COOKIE = 'qd_sessao';

const json = (obj: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });

async function resumo(texto: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const emailOk = (v: unknown) => {
  const e = String(v || '')
    .trim()
    .toLowerCase()
    .slice(0, 120);
  return EMAIL_RE.test(e) ? e : '';
};

// e-mail de verdade só com a chave do Resend; sem ela, fora da cobrança ligada, o login é simulado
const emailPronto = (env: LoginEnv) => !!String(env.RESEND_KEY || '').trim();
export const loginSimulado = (env: LoginEnv) => !emailPronto(env) && modo(env) !== 'ligada';

let pronta = false;
async function tabelas(db: D1Database) {
  if (pronta) return;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS logins (id TEXT PRIMARY KEY, email TEXT, ip TEXT, codigo TEXT, criado INTEGER, tentativas INTEGER DEFAULT 0, usado INTEGER DEFAULT 0, simulado INTEGER NOT NULL DEFAULT 1)'),
    db.prepare('CREATE INDEX IF NOT EXISTS logins_email ON logins (email, criado)'),
    db.prepare('CREATE TABLE IF NOT EXISTS sessoes (token TEXT PRIMARY KEY, email TEXT, criado INTEGER, expira INTEGER, simulado INTEGER NOT NULL DEFAULT 1)'),
  ]);
  // As linhas anteriores à migração pertencem à simulação.
  for (const tabela of ['logins', 'sessoes']) {
    const colunas = await db.prepare(`PRAGMA table_info(${tabela})`).all<{ name: string }>();
    if (!colunas.results.some((coluna) => coluna.name === 'simulado')) {
      await db.prepare(`ALTER TABLE ${tabela} ADD COLUMN simulado INTEGER NOT NULL DEFAULT 1`).run();
    }
  }
  pronta = true;
}

function cookieDe(req: Request): string {
  const m = /(?:^|;\s*)qd_sessao=([a-f0-9]{64})/.exec(req.headers.get('cookie') || '');
  return m ? m[1] : '';
}

/** E-mail de quem está logado (pelo cookie), ou vazio. */
export async function emailDaSessao(req: Request, env: LoginEnv): Promise<string> {
  const token = cookieDe(req);
  if (!token || !env.DB) return '';
  await tabelas(env.DB);
  const l = await env.DB.prepare('SELECT email FROM sessoes WHERE token = ? AND expira > ? AND simulado = ?').bind(await resumo(token), Date.now(), loginSimulado(env) ? 1 : 0).first<{ email: string }>();
  return l?.email || '';
}

async function mandaEmail(env: LoginEnv, para: string, codigo: string): Promise<boolean> {
  const de = env.EMAIL_DE || 'Quiddo <entrar@quiddo.com.br>';
  const html = `<div style="font-family:Arial,sans-serif;font-size:16px;color:#0e2a22;max-width:420px">
    <p>Seu código para entrar no Quiddo:</p>
    <p style="font-size:34px;font-weight:bold;letter-spacing:6px;margin:16px 0">${codigo}</p>
    <p>Ele vale por 10 minutos. Se não foi você que pediu, é só ignorar este e-mail.</p>
    <p style="color:#4a5e56;font-size:13px">Quiddo · um projeto Beyond the Work</p></div>`;
  const r = await fetch(env.RESEND_API || RESEND, {
    method: 'POST',
    headers: { Authorization: `Bearer ${String(env.RESEND_KEY).trim()}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: de,
      to: [para],
      subject: `Seu código do Quiddo: ${codigo}`,
      html,
      text: `Seu código para entrar no Quiddo: ${codigo}\n\nEle vale por 10 minutos. Se não foi você que pediu, é só ignorar este e-mail.`,
    }),
  });
  if (!r.ok) console.log('resend erro', r.status);
  return r.ok;
}

async function lerJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Rotas /api/login, /api/login/codigo, /api/sessao e /api/sair. */
export async function rotaLogin(req: Request, env: LoginEnv, caminho: string): Promise<Response | null> {
  if (!caminho.startsWith('/api/login') && caminho !== '/api/sessao' && caminho !== '/api/sair') return null;
  const db = env.DB;
  if (!db) return json({ erro: 'indisponivel' }, 503);
  await tabelas(db);

  // GET /api/sessao: quem está logado (ou ninguém)
  if (caminho === '/api/sessao') return json({ email: (await emailDaSessao(req, env)) || null, simulado: loginSimulado(env) });

  if (req.method !== 'POST') return null;

  // POST /api/login {email}: manda o código
  if (caminho === '/api/login') {
    const email = emailOk((await lerJson(req))?.email);
    if (!email) return json({ erro: 'email' }, 400);
    if (!emailPronto(env) && !loginSimulado(env)) return json({ erro: 'indisponivel' }, 503);
    const agora = Date.now();
    const ip = req.headers.get('cf-connecting-ip') || '';
    const porEmail = await db.prepare('SELECT COUNT(*) AS n FROM logins WHERE email = ? AND criado > ?').bind(email, agora - 15 * 60e3).first<{ n: number }>();
    const porIp = ip ? await db.prepare('SELECT COUNT(*) AS n FROM logins WHERE ip = ? AND criado > ?').bind(ip, agora - 60 * 60e3).first<{ n: number }>() : null;
    if ((porEmail?.n || 0) >= MAX_CODIGOS_EMAIL || (porIp?.n || 0) >= MAX_CODIGOS_IP) return json({ erro: 'muitos' }, 429);
    const codigo = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
    const id = crypto.randomUUID();
    await db.prepare('INSERT INTO logins (id, email, ip, codigo, criado, simulado) VALUES (?, ?, ?, ?, ?, ?)').bind(id, email, ip, await resumo(id + codigo), agora, loginSimulado(env) ? 1 : 0).run();
    // limpeza: códigos com mais de um dia não servem para nada
    await db.prepare('DELETE FROM logins WHERE criado < ?').bind(agora - 86400e3).run();
    if (loginSimulado(env)) return json({ ok: true, simulado: true, codigo });
    if (!(await mandaEmail(env, email, codigo))) return json({ erro: 'envio' }, 502);
    return json({ ok: true });
  }

  // POST /api/login/codigo {email, codigo}: confere e abre a sessão
  if (caminho === '/api/login/codigo') {
    const c = await lerJson(req);
    const email = emailOk(c?.email);
    const codigo = String(c?.codigo || '').replace(/\D/g, '');
    if (!email || codigo.length !== 6) return json({ erro: 'codigo' }, 400);
    const agora = Date.now();
    const l = await db
      .prepare('SELECT id, codigo, tentativas FROM logins WHERE email = ? AND usado = 0 AND criado > ? AND simulado = ? ORDER BY criado DESC LIMIT 1')
      .bind(email, agora - CODIGO_MS, loginSimulado(env) ? 1 : 0)
      .first<{ id: string; codigo: string; tentativas: number }>();
    if (!l || l.tentativas >= MAX_TENTATIVAS) return json({ erro: 'expirado' }, 400);
    if ((await resumo(l.id + codigo)) !== l.codigo) {
      await db.prepare('UPDATE logins SET tentativas = tentativas + 1 WHERE id = ?').bind(l.id).run();
      return json({ erro: 'codigo', restam: Math.max(0, MAX_TENTATIVAS - l.tentativas - 1) }, 400);
    }
    await db.prepare('UPDATE logins SET usado = 1 WHERE id = ?').bind(l.id).run();
    const token = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('');
    await db.prepare('INSERT INTO sessoes (token, email, criado, expira, simulado) VALUES (?, ?, ?, ?, ?)').bind(await resumo(token), email, agora, agora + SESSAO_S * 1000, loginSimulado(env) ? 1 : 0).run();
    await db.prepare('DELETE FROM sessoes WHERE expira < ?').bind(agora).run();
    const official = ['quiddo.com.br', 'www.quiddo.com.br'].includes(new URL(req.url).hostname);
    const value = `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; ${official ? 'Domain=quiddo.com.br; ' : ''}Max-Age=${SESSAO_S}`;
    if (!official) return json({ ok: true, email }, 200, { 'set-cookie': value });
    // Clear the old host-only cookie first; then issue the shared-domain session.
    const response = json({ ok: true, email }, 200, { 'set-cookie': `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` });
    response.headers.append('set-cookie', value);
    return response;
  }

  // POST /api/sair: fecha a sessão
  if (caminho === '/api/sair') {
    const token = cookieDe(req);
    if (token) await db.prepare('DELETE FROM sessoes WHERE token = ?').bind(await resumo(token)).run();
    const response = json({ ok: true }, 200, { 'set-cookie': `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` });
    if (['quiddo.com.br', 'www.quiddo.com.br'].includes(new URL(req.url).hostname)) response.headers.append('set-cookie', `${COOKIE}=; Domain=quiddo.com.br; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
    return response;
  }
  return null;
}

/** Promote a valid old host-only session without exposing its token to page scripts. */
export async function compartilharSessao(req: Request, env: LoginEnv): Promise<Headers> {
 const headers=new Headers();
 if(new URL(req.url).hostname!=='quiddo.com.br'||!env.DB||!(await emailDaSessao(req,env)))return headers;
 const token=cookieDe(req);
 const row=await env.DB.prepare('SELECT expira FROM sessoes WHERE token=?').bind(await resumo(token)).first<{expira:number}>();
 if(!row)return headers;
 headers.append('set-cookie',`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
 headers.append('set-cookie',`${COOKIE}=${token}; Domain=quiddo.com.br; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.max(0,Math.floor((row.expira-Date.now())/1000))}`);
 return headers;
}
