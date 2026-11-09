import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { TestDB, req } from './helpers/account-db';
let env: any,
  login: any,
  route: any,
  billing: any,
  cookie = '',
  api: any,
  local: any,
  fetcher: any,
  failWrites = false;
const memory = () => {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => map.set(k, v),
    removeItem: (k: string) => map.delete(k),
  };
};
async function session(email = 'owner@example.invalid') {
  const r = await login(req('/api/login', { email }), env, '/api/login'),
    d = await r.json();
  const v = await login(req('/api/login/codigo', { email, codigo: d.codigo }), env, '/api/login/codigo');
  return v.headers
    .getSetCookie()
    .find((x: string) => x.includes('Max-Age=2592000'))!
    .split(';')[0];
}
beforeEach(async () => {
  vi.resetModules();
  env = { DB: new TestDB(), COBRANCA: 'simulacao' };
  login = (await import('../worker/login')).rotaLogin;
  route = (await import('../worker/quizzes')).rotaQuizzes;
  billing = (await import('../worker/cobranca')).rotaCobranca;
  cookie = await session();
  failWrites = false;
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('location', { search: '', pathname: '/criar', origin: 'https://www.quiddo.com.br' });
  vi.stubGlobal('localStorage', memory());
  fetcher = vi.fn(async (input: string, options: any = {}) => {
    if (failWrites && options.method === 'PUT') throw Error('offline');
    const path = new URL(input, 'https://www.quiddo.com.br').pathname;
    const r = req(path, options.body ? JSON.parse(options.body) : undefined, cookie, options.headers || {}, options.method || 'GET');
    return (await route(r, env, path)) || (await billing(r, env, path)) || (await login(r, env, path));
  });
  vi.stubGlobal('fetch', fetcher);
  api = await import('../src/lib/quiz-cloud');
  local = await import('../src/lib/quiz');
  await api.prepararBiblioteca();
});
afterEach(() => vi.unstubAllGlobals());
it('saves to account and loads in another browser storage without a local copy', async () => {
  const q = local.novoQuiz('festa');
  q.titulo = 'Across devices';
  local.salvar(q);
  await api.flushQuizSaves();
  expect(api.syncStatus(q.id).text).toContain('Salvo na sua conta');
  cookie = await session();
  vi.stubGlobal('localStorage', memory());
  await api.prepararBiblioteca();
  expect(local.atual().titulo).toBe('Across devices');
  expect(local.atual().perguntas).toEqual(q.perguntas);
});
it('serializes successive saves while keeping the latest edit', async () => {
  const q = local.novoQuiz();
  local.salvar(q);
  q.titulo = 'Second';
  local.salvar(q);
  q.titulo = 'Third';
  local.salvar(q);
  await api.flushQuizSaves();
  const path = '/api/quizzes/' + q.id;
  const r = await route(req(path, undefined, cookie), env, path);
  expect((await r.json()).quiz.titulo).toBe('Third');
  expect(api.syncStatus(q.id).conflict).toBe(false);
});
it('preserves offline edits and retries after the connection returns', async () => {
  const q = local.novoQuiz();
  failWrites = true;
  local.salvar(q);
  await api.flushQuizSaves();
  expect(api.syncStatus(q.id).retry).toBe(true);
  expect(local.atual().pendente).toBe(true);
  failWrites = false;
  window.dispatchEvent(new Event('online'));
  await api.flushQuizSaves();
  expect(api.syncStatus(q.id).text).toContain('Salvo na sua conta');
});
it('preserves both versions on conflict and allows saving the local edit as a separate copy', async () => {
  const q = local.novoQuiz();
  local.salvar(q);
  await api.flushQuizSaves();
  const path = '/api/quizzes/' + q.id;
  const current = local.atual();
  await route(req(path, { ...current, titulo: 'Won on other device' }, cookie, { 'If-Match': '1' }, 'PUT'), env, path);
  current.titulo = 'My offline changes';
  local.salvar(current);
  await api.flushQuizSaves();
  expect(api.syncStatus(q.id).conflict).toBe(true);
  const copied = await api.copyConflict(current);
  await api.flushQuizSaves();
  const original = await (await route(req(path, undefined, cookie), env, path)).json();
  expect(original.quiz.titulo).toBe('Won on other device');
  const copyPath = '/api/quizzes/' + copied.id;
  expect((await (await route(req(copyPath, undefined, cookie), env, copyPath)).json()).quiz.titulo).toContain('My offline changes');
  expect(copied.id).not.toBe(q.id);
});
it('imports only selected local drafts, keeps originals, and does not duplicate a repeated import', async () => {
  const a = local.novoQuiz(),
    b = local.novoQuiz();
  a.titulo = 'Mine';
  b.titulo = 'Not selected';
  localStorage.setItem('sr:quizzes', JSON.stringify([a, b]));
  api.importarLocais([a.id]);
  await api.flushQuizSaves();
  api.importarLocais([a.id]);
  await api.flushQuizSaves();
  expect(local.listar()).toHaveLength(1);
  expect(local.listar()[0].titulo).toBe('Mine');
  expect(JSON.parse(localStorage.getItem('sr:quizzes')!)).toHaveLength(2);
});
it('separates caches on account switch and refuses writes queued for the previous owner', async () => {
  const q = local.novoQuiz();
  q.titulo = 'Private owner A';
  local.salvar(q);
  cookie = await session('other@example.invalid');
  await api.flushQuizSaves();
  await api.prepararBiblioteca();
  expect(api.contaDosQuizzes()).toBe('other@example.invalid');
  expect(local.listar()).toHaveLength(0);
  expect(JSON.parse(localStorage.getItem('sr:quizzes-conta:owner@example.invalid')!)[0].titulo).toBe('Private owner A');
  expect((await (await route(req('/api/quizzes', undefined, cookie), env, '/api/quizzes')).json()).quizzes).toHaveLength(0);
});
it('does not report a failed local write as saved to the account', async () => {
  const q = local.novoQuiz();
  vi.stubGlobal('localStorage', {
    getItem: () => null,
    setItem: () => {
      throw Error('quota');
    },
    removeItem: () => {},
  });
  expect(local.salvar(q)).toBe(false);
  await api.flushQuizSaves();
  expect(fetcher.mock.calls.filter((x: any) => x[1]?.method === 'PUT')).toHaveLength(0);
});
it('does not adopt a newer version from shared browser cache behind a stale editor', async () => {
  const q = local.novoQuiz();
  local.salvar(q);
  await api.flushQuizSaves();
  const editor = structuredClone(local.atual()),
    path = '/api/quizzes/' + q.id;
  await route(req(path, { ...editor, titulo: 'Another tab won' }, cookie, { 'If-Match': '1' }, 'PUT'), env, path);
  localStorage.setItem('sr:quizzes-conta:owner@example.invalid', JSON.stringify([{ ...editor, titulo: 'Another tab won', versao: 2 }]));
  editor.titulo = 'Stale editor';
  local.salvar(editor);
  await api.flushQuizSaves();
  expect(api.syncStatus(q.id).conflict).toBe(true);
  expect((await (await route(req(path, undefined, cookie), env, path)).json()).quiz.titulo).toBe('Another tab won');
});
