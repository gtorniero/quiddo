import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import type { LoginEnv } from '../worker/login';
let sqlite: DatabaseSync;
let rota: typeof import('../worker/login').rotaLogin;
let sessao: typeof import('../worker/login').emailDaSessao;
let env: LoginEnv;
const email = 'quiddo-qa@example.com';
function d1(db: DatabaseSync): D1Database {
  const prepare = (sql: string, values: unknown[] = []): any => ({
    bind: (...v: unknown[]) => prepare(sql, v),
    first: async () => db.prepare(sql).get(...values as any[]) || null,
    all: async () => ({ success: true, results: db.prepare(sql).all(...values as any[]), meta: {} }),
    run: async () => { const r = db.prepare(sql).run(...values as any[]); return { success: true, results: [], meta: { changes: r.changes } }; },
  });
  return { prepare, batch: async (ss: any[]) => { const out = []; for (const s of ss) out.push(await s.run()); return out; } } as unknown as D1Database;
}
async function post(path: string, data: unknown, e = env) {
  return (await rota(new Request(`https://quiddo.com.br${path}`, { method: 'POST', body: JSON.stringify(data) }), e, path))!;
}
beforeEach(async () => {
  vi.resetModules();
  ({ rotaLogin: rota, emailDaSessao: sessao } = await import('../worker/login'));
  sqlite = new DatabaseSync(':memory:');
  env = { DB: d1(sqlite), COBRANCA: 'simulacao' } as LoginEnv;
});
afterEach(() => { sqlite.close(); vi.unstubAllGlobals(); });
it('recusa código da simulação depois de ativar o e-mail', async () => {
  const { codigo } = await (await post('/api/login', { email })).json() as any;
  const response = await post('/api/login/codigo', { email, codigo }, { ...env, RESEND_KEY: 're_fixture' });
  expect(response.status).toBe(400);
});
it('recusa sessão da simulação depois de ativar o e-mail', async () => {
  const { codigo } = await (await post('/api/login', { email })).json() as any;
  const response = await post('/api/login/codigo', { email, codigo });
  const req = new Request('https://quiddo.com.br', { headers: { cookie: response.headers.get('set-cookie')! } });
  expect(await sessao(req, env)).toBe(email);
  expect(await sessao(req, { ...env, RESEND_KEY: 're_fixture' })).toBe('');
});
it('envia o código sem expô-lo, aceita uma vez e isola a sessão real', async () => {
  let codigo = '';
  vi.stubGlobal('fetch', vi.fn(async (_url, options) => {
    const payload = JSON.parse(options.body);
    codigo = payload.subject.match(/\d{6}/)[0];
    expect(payload.from).toBe('Quiddo <oi@quiddo.com.br>');
    return new Response('{}', { status: 200 });
  }));
  const real = { ...env, RESEND_KEY: 're_fixture', EMAIL_DE: 'Quiddo <oi@quiddo.com.br>' };
  const response = await post('/api/login', { email }, real);
  expect(await response.json()).toEqual({ ok: true });
  const login = await post('/api/login/codigo', { email, codigo }, real);
  expect(login.status).toBe(200);
  const req = new Request('https://quiddo.com.br', { headers: { cookie: login.headers.get('set-cookie')! } });
  expect(await sessao(req, real)).toBe(email);
  expect(await sessao(req, env)).toBe('');
  expect((await post('/api/login/codigo', { email, codigo }, real)).status).toBe(400);
});
it('migra sessões anteriores como simuladas sem apagar dados', async () => {
  sqlite.exec('CREATE TABLE sessoes (token TEXT PRIMARY KEY,email TEXT,criado INTEGER,expira INTEGER); CREATE TABLE logins (id TEXT PRIMARY KEY,email TEXT,ip TEXT,codigo TEXT,criado INTEGER,tentativas INTEGER DEFAULT 0,usado INTEGER DEFAULT 0)');
  sqlite.prepare('INSERT INTO sessoes VALUES (?,?,?,?)').run('antiga', email, Date.now(), Date.now()+10000);
  await post('/api/login', { email });
  expect(sqlite.prepare('SELECT simulado FROM sessoes WHERE token=?').get('antiga')?.simulado).toBe(1);
});
