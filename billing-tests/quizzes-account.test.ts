import { beforeEach, it, expect, vi } from 'vitest';
import { TestDB, req } from './helpers/account-db';
let env: any, login: any, route: any;
beforeEach(async () => {
  vi.resetModules();
  env = { DB: new TestDB(), COBRANCA: 'simulacao' };
  login = (await import('../worker/login')).rotaLogin;
  route = (await import('../worker/quizzes')).rotaQuizzes;
});
async function session(email = 'owner@example.invalid', origin = 'https://www.quiddo.com.br') {
  const first = await login(req('/api/login', { email }, '', {}, 'POST', origin), env, '/api/login');
  const { codigo } = await first.json();
  const done = await login(req('/api/login/codigo', { email, codigo }, '', {}, 'POST', origin), env, '/api/login/codigo');
  return {
    cookie: done.headers
      .getSetCookie()
      .find((x: string) => x.includes('Max-Age=2592000'))!
      .split(';')[0],
    headers: done.headers,
  };
}
const doc = (id = 'quiz-one') => ({
  id,
  titulo: 'Festa',
  tema: 'festa',
  visual: 'floresta',
  tempo: 15,
  marca: { name: '', color: '' },
  logo: '',
  perguntas: [{ t: 'Rascunho', o: ['', ''], c: -1, tl: 15 }],
  atualizado: 1,
});
const call = (cookie: string, id = '', body?: unknown, version?: number, method?: string, extra: Record<string, string> = {}) => {
  const path = '/api/quizzes' + (id ? '/' + id : '');
  return route(req(path, body, cookie, { ...(version !== undefined ? { 'If-Match': String(version) } : {}), ...extra }, method), env, path);
};
it('requires a verified session for the library', async () => {
  expect((await call('')).status).toBe(401);
  expect((await call('', 'quiz-one', doc(), 0, 'PUT')).status).toBe(401);
});
it('isolates owners even when they use the same quiz id', async () => {
  const a = await session(),
    b = await session('other@example.invalid');
  expect((await call(a.cookie, 'quiz-one', doc(), 0, 'PUT')).status).toBe(200);
  expect((await call(b.cookie)).status).toBe(200);
  expect((await (await call(b.cookie)).json()).quizzes).toHaveLength(0);
  expect((await call(b.cookie, 'quiz-one')).status).toBe(404);
  expect((await call(b.cookie, 'quiz-one', undefined, 1, 'DELETE')).status).toBe(409);
  const bdoc = { ...doc(), titulo: 'Other owner' };
  expect((await call(b.cookie, 'quiz-one', bdoc, 0, 'PUT')).status).toBe(200);
  expect((await (await call(a.cookie, 'quiz-one')).json()).quiz.titulo).toBe('Festa');
});
it('makes the same complete document available to an independent login', async () => {
  const a = await session();
  const q = doc();
  q.logo = 'data:image/png;base64,AA==';
  (q.perguntas[0] as any).img = 'data:image/jpeg;base64,AA==';
  expect((await call(a.cookie, q.id, q, 0, 'PUT')).status).toBe(200);
  const b = await session();
  const loaded = await (await call(b.cookie, q.id)).json();
  expect(loaded.quiz.logo).toBe(q.logo);
  expect(loaded.quiz.perguntas[0].img).toContain('data:image/jpeg');
  expect(loaded.quiz.perguntas[0].c).toBe(-1);
  expect(JSON.stringify(await (await call(b.cookie)).json())).not.toContain('base64');
});
it('preserves PDF evidence across saving, editing and another login without disclosing it in the library index', async () => {
  const a = await session(), q = doc('pdf-one');
  const pdf = { page: 14, evidence: 'A cobertura é de 24 meses.', answer: '24 meses', topic: 'Garantia', hash: 'a'.repeat(64) };
  (q.perguntas[0] as any).pdf = pdf;
  expect((await call(a.cookie, q.id, q, 0, 'PUT')).status).toBe(200);
  const b = await session();
  const recovered = (await (await call(b.cookie, q.id)).json()).quiz;
  expect(recovered.perguntas[0].pdf).toEqual(pdf);
  recovered.perguntas[0].t = 'Pergunta revisada pelo titular';
  expect((await call(b.cookie, q.id, recovered, 1, 'PUT')).status).toBe(200);
  expect((await (await call(a.cookie, q.id)).json()).quiz.perguntas[0].pdf).toEqual(pdf);
  expect(JSON.stringify(await (await call(a.cookie)).json())).not.toContain(pdf.evidence);
  const other = await session('other@example.invalid');
  expect((await call(other.cookie, q.id)).status).toBe(404);
});
it('rejects stale saves without changing the winning content or images', async () => {
  const a = await session();
  await call(a.cookie, 'quiz-one', doc(), 0, 'PUT');
  const winner = { ...doc(), titulo: 'Newer', logo: 'data:image/png;base64,AA==' };
  expect((await call(a.cookie, 'quiz-one', winner, 1, 'PUT')).status).toBe(200);
  expect((await call(a.cookie, 'quiz-one', { ...doc(), titulo: 'Stale' }, 1, 'PUT')).status).toBe(409);
  const loaded = await (await call(a.cookie, 'quiz-one')).json();
  expect(loaded.version).toBe(2);
  expect(loaded.quiz.titulo).toBe('Newer');
  expect(loaded.quiz.logo).toBe(winner.logo);
});
it('deletion propagates and cannot be undone by a stale offline save', async () => {
  const a = await session();
  await call(a.cookie, 'quiz-one', doc(), 0, 'PUT');
  expect((await call(a.cookie, 'quiz-one', undefined, 1, 'DELETE')).status).toBe(200);
  expect((await call(a.cookie, 'quiz-one')).status).toBe(404);
  expect((await call(a.cookie, 'quiz-one', doc(), 1, 'PUT')).status).toBe(409);
  expect((await call(a.cookie, 'quiz-one', doc(), 0, 'PUT')).status).toBe(409);
  expect((await (await call(a.cookie)).json()).quizzes).toHaveLength(0);
});
it('refuses missing versions, forged origins, mismatched ids and stale account queues', async () => {
  const a = await session();
  expect((await call(a.cookie, 'quiz-one', doc(), undefined, 'PUT')).status).toBe(428);
  expect((await call(a.cookie, 'quiz-one', doc(), 0, 'PUT', { Origin: 'https://evil.invalid' })).status).toBe(403);
  expect((await call(a.cookie, 'quiz-one', { ...doc(), id: 'different' }, 0, 'PUT')).status).toBe(400);
  expect((await call(a.cookie, 'quiz-one', doc(), 0, 'PUT', { 'X-Quiddo-Conta': 'other@example.invalid' })).status).toBe(403);
});
it('validates data before writing and replaces removed images atomically', async () => {
  const a = await session();
  expect((await call(a.cookie, 'quiz-one', { ...doc(), logo: 'https://evil.invalid/x' }, 0, 'PUT')).status).toBe(400);
  const q = { ...doc(), logo: 'data:image/png;base64,AA==' };
  await call(a.cookie, 'quiz-one', q, 0, 'PUT');
  await call(a.cookie, 'quiz-one', doc(), 1, 'PUT');
  expect((await (await call(a.cookie, 'quiz-one')).json()).quiz.logo).toBe('');
  expect(env.DB.db.prepare('SELECT COUNT(*) n FROM qd_quiz_images').get().n).toBe(0);
});
it('shares a new session across the official hostnames and promotes valid legacy sessions', async () => {
  const a = await session('owner@example.invalid', 'https://quiddo.com.br');
  expect(a.headers.get('set-cookie')).toContain('Domain=quiddo.com.br');
  const before = env.DB.db.prepare('SELECT expira FROM sessoes').get().expira;
  const { canonicalResponse } = await import('../worker/canonical');
  const migrated = await canonicalResponse(req('/criar', undefined, a.cookie, {}, 'GET', 'https://quiddo.com.br'), env);
  expect(migrated!.headers.get('set-cookie')).toContain('Domain=quiddo.com.br');
  expect(env.DB.db.prepare('SELECT expira FROM sessoes').get().expira).toBe(before);
  expect(await canonicalResponse(req('/criar'), env)).toBe(null);
  expect(await migrated!.text()).toContain('Continuar com meus quizzes');
});
it('rejects cross-site browser transfers and prevents a destination outside Quiddo', async () => {
  const { canonicalResponse } = await import('../worker/canonical');
  const transfer = (origin: string, volta: string) =>
    new Request('https://www.quiddo.com.br/api/migrar-navegador', {
      method: 'POST',
      headers: { Origin: origin },
      body: new URLSearchParams({ dados: JSON.stringify({ quizzes: [doc()], volta }) }),
    });
  expect((await canonicalResponse(transfer('https://evil.invalid', '/criar'), env))!.status).toBe(403);
  expect((await canonicalResponse(transfer('https://quiddo.com.br', 'https://evil.invalid'), env))!.status).toBe(400);
  const valid = await canonicalResponse(transfer('https://quiddo.com.br', '/criar'), env);
  expect(valid!.status).toBe(200);
  expect(valid!.headers.get('Cache-Control')).toBe('no-store');
  expect(await valid!.text()).toContain('localStorage.setItem');
});
