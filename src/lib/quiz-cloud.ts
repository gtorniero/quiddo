import type { Quiz } from './quiz';
import { store, uid } from './storage';
import { sincronizaConta } from './conta';
export interface CloudMeta {
  versao?: number;
  somenteNuvem?: boolean;
  quantidade?: number;
  pendente?: boolean;
  conflito?: boolean;
}
let owner = '';
let online = true;
const chains = new Map<string, Promise<void>>();
const errors = new Map<string, string>();
const knownVersions = new Map<string, number>();
export const baseVersion = (quiz: Quiz) => knownVersions.get(owner + ':' + quiz.id) ?? quiz.versao ?? 0;
const key = (email: string) => (email ? 'quizzes-conta:' + email : 'quizzes');
const read = (email = owner) => store.get<Quiz[]>(key(email), []);
const write = (rows: Quiz[], email = owner) => store.set(key(email), rows);
const changed = () => window.dispatchEvent(new Event('qd:quiz-sync'));
export const contaDosQuizzes = () => owner;
export const quizRows = () => read();
export const quizCurrentKey = () => (owner ? 'quiz-atual:' + owner : 'atual');
export const saveRows = (rows: Quiz[]) => write(rows);
export const localQuizzes = () => store.get<Quiz[]>('quizzes', []);
const headers = (email: string, extra: Record<string, string> = {}) => ({ 'X-Quiddo-Conta': email, ...extra });
export async function prepararBiblioteca() {
  const account = await sincronizaConta();
  owner = account.email || '';
  online = account.confirmada === true;
  if (!owner || !online) return;
  try {
    const r = await fetch('/api/quizzes', { headers: headers(owner), signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw Error();
    const data = (await r.json()) as {
      quizzes: { id: string; version: number; titulo: string; tema: Quiz['tema']; quantidade: number; atualizado: number }[];
    };
    const cached = read(),
      rows: Quiz[] = [];
    for (const remote of data.quizzes) {
      const local = cached.find((x) => x.id === remote.id);
      knownVersions.set(owner + ':' + remote.id, local?.pendente ? local.versao || 0 : remote.version);
      if (local?.pendente) {
        if ((local.versao || 0) !== remote.version) local.conflito = true;
        rows.push(local);
      } else if (local && !local.somenteNuvem && local.versao === remote.version) rows.push(local);
      else
        rows.push({
          id: remote.id,
          titulo: remote.titulo,
          tema: remote.tema,
          tempo: 15,
          marca: { name: '', color: '' },
          logo: '',
          perguntas: [],
          atualizado: remote.atualizado,
          versao: remote.version,
          somenteNuvem: true,
          quantidade: remote.quantidade,
        });
    }
    rows.push(...cached.filter((x) => x.pendente && !rows.some((y) => y.id === x.id)));
    write(rows);
    const current = store.get<string>(quizCurrentKey(), '');
    const first = rows.find((x) => x.id === current) || rows[0];
    if (first?.somenteNuvem) await carregarQuiz(first.id);
    for (const q of read()) if (q.pendente && !q.conflito) queueSave(q);
  } catch {
    online = false;
  }
}
export async function carregarQuiz(id: string): Promise<Quiz> {
  const local = read().find((x) => x.id === id);
  if (local && !local.somenteNuvem && (local.pendente || !owner)) return local;
  if (!owner) {
    if (local) return local;
    throw Error('Quiz não encontrado.');
  }
  const email = owner,
    r = await fetch('/api/quizzes/' + encodeURIComponent(id), { headers: headers(email), signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw Error(r.status === 401 ? 'Entre novamente para abrir seus quizzes.' : 'Não foi possível abrir o quiz. Tente novamente.');
  const data = (await r.json()) as { quiz: Quiz; version: number };
  if (owner !== email) throw Error('A conta mudou. Abra o editor novamente.');
  const q = { ...data.quiz, versao: data.version };
  knownVersions.set(email + ':' + id, data.version);
  write([...read().filter((x) => x.id !== id), q]);
  return q;
}
export function queueSave(quiz: Quiz) {
  if (!owner) return;
  const email = owner,
    id = quiz.id,
    snapshot = structuredClone(quiz),
    chainKey = email + ':' + id;
  const previous = chains.get(chainKey) || Promise.resolve();
  const next = previous
    .catch(() => {})
    .then(async () => {
      const rows = read(email),
        local = rows.find((x) => x.id === id);
      if (!local || local.conflito) return;
      try {
        const r = await fetch('/api/quizzes/' + encodeURIComponent(id), {
          method: 'PUT',
          signal: AbortSignal.timeout(30000),
          headers: headers(email, {
            'Content-Type': 'application/json',
            'If-Match': String(knownVersions.get(chainKey) ?? snapshot.versao ?? 0),
          }),
          body: JSON.stringify(snapshot),
        });
        if (r.status === 409) {
          void trackOnce('quiz_save_error', chainKey + ':conflict', {storage:'cloud',error_category:'conflict'});
          const current = read(email);
          const q = current.find((x) => x.id === id);
          if (q) q.conflito = true;
          write(current, email);
          errors.set(chainKey, 'Este quiz mudou em outro aparelho. Sua edição está preservada neste navegador.');
          return;
        }
        if (!r.ok)
          throw Error(
            r.status === 401 || r.status === 403
              ? 'Entre novamente com a mesma conta para salvar.'
              : 'Sem conexão com a conta. Sua edição está neste navegador.',
          );
        const result = (await r.json()) as { version: number; atualizado: number };
        void trackOnce('quiz_save', chainKey + ':cloud', {storage:'cloud'});
        knownVersions.set(chainKey, result.version);
        const current = read(email),
          q = current.find((x) => x.id === id);
        if (q) {
          q.versao = result.version;
          if (JSON.stringify(documentContent(q)) === JSON.stringify(documentContent(snapshot))) {
            q.pendente = false;
            q.atualizado = result.atualizado;
          }
          write(current, email);
        }
        errors.delete(chainKey);
        online = true;
      } catch (e) {
        void trackOnce('quiz_save_error', chainKey + ':error', {storage:'cloud',error_category:e instanceof TypeError ? 'network' : 'rejected'});
        errors.set(chainKey, e instanceof Error ? e.message : 'Não foi possível salvar na conta.');
      } finally {
        if (owner === email) changed();
      }
    });
  chains.set(chainKey, next);
  void next.finally(() => {
    if (chains.get(chainKey) === next) chains.delete(chainKey);
  });
}
function documentContent(q: Quiz) {
  const { versao: _v, somenteNuvem: _s, quantidade: _q, pendente: _p, conflito: _c, atualizado: _a, ...document } = q;
  return document;
}
export function syncStatus(id: string) {
  if (!owner) return { text: 'Salvo neste navegador', conflict: false, retry: false };
  const q = read().find((x) => x.id === id),
    error = errors.get(owner + ':' + id);
  if (q?.conflito) return { text: 'Este quiz mudou em outro aparelho. Sua edição está preservada.', conflict: true, retry: false };
  if (error) return { text: error, conflict: false, retry: true };
  if (q?.pendente)
    return {
      text: online ? 'Salvando na sua conta…' : 'Sem conexão. Sua edição está guardada neste navegador.',
      conflict: false,
      retry: !online,
    };
  return { text: 'Salvo na sua conta · disponível em outros aparelhos', conflict: false, retry: false };
}
export async function deleteCloudQuiz(id: string) {
  if (!owner) {
    write(read().filter((x) => x.id !== id));
    return;
  }
  const email = owner;
  await chains.get(email + ':' + id);
  const q = read(email).find((x) => x.id === id);
  if (!q) return;
  if (!q.versao && q.pendente) {
    write(
      read(email).filter((x) => x.id !== id),
      email,
    );
    return;
  }
  const r = await fetch('/api/quizzes/' + id, {
    method: 'DELETE',
    signal: AbortSignal.timeout(8000),
    headers: headers(email, { 'If-Match': String(knownVersions.get(email + ':' + id) ?? q.versao ?? 0) }),
  });
  if (!r.ok)
    throw Error(
      r.status === 409
        ? 'Este quiz mudou em outro aparelho. Reabra antes de excluir.'
        : 'Não foi possível excluir na conta. Tente novamente.',
    );
  write(
    read(email).filter((x) => x.id !== id),
    email,
  );
}
export async function copyConflict(q: Quiz) {
  const copy: Quiz = {
    ...structuredClone(q),
    id: uid(),
    titulo: q.titulo.slice(0, 48) + ' (cópia)',
    versao: 0,
    pendente: true,
    conflito: false,
    somenteNuvem: false,
    atualizado: Date.now(),
  };
  if (!write([...read(), copy])) throw Error('Sem espaço para guardar a cópia. Exporte seu quiz antes de continuar.');
  queueSave(copy);
  // The original can be refreshed only after the edited copy is safely retained locally.
  try {
    const original = read().find((x) => x.id === q.id);
    if (original) {
      original.pendente = false;
      original.conflito = false;
      original.somenteNuvem = true;
      write(read().map((x) => (x.id === q.id ? original : x)));
    }
    await carregarQuiz(q.id);
  } catch {
    /* Edited copy remains independent. */
  }
  return copy;
}
export function importarLocais(ids: string[]) {
  if (!owner) throw Error('Entre na sua conta primeiro.');
  const mappings = store.get<Record<string, string>>('quiz-importados:' + owner, {});
  let first: Quiz | undefined;
  for (const original of localQuizzes().filter((x) => ids.includes(x.id))) {
    if (mappings[original.id]) continue;
    const q: Quiz = { ...structuredClone(original), id: uid(), versao: 0, pendente: true, conflito: false, somenteNuvem: false };
    if (!write([...read(), q])) throw Error('Sem espaço para preparar a cópia. Exporte seus quizzes.');
    mappings[original.id] = q.id;
    store.set('quiz-importados:' + owner, mappings);
    queueSave(q);
    first ||= q;
  }
  return first;
}
export function idsLocaisImportados() {
  return store.get<Record<string, string>>('quiz-importados:' + owner, {});
}
export async function flushQuizSaves() {
  await Promise.all([...chains.values()]);
}
if (typeof window !== 'undefined')
  window.addEventListener('online', () => {
    online = true;
    for (const q of read()) if (q.pendente && !q.conflito) queueSave(q);
  });
if (typeof window !== 'undefined')
  window.addEventListener('qd:account-out', () => {
    owner = '';
    changed();
  });
import { trackOnce } from './measurement';
