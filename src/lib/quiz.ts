// "Meus quizzes": guardados no navegador do anfitrião. Importar e exportar em JSON.
import type { Brand, Question, Scoring, Theme } from '../../shared/protocol';
import { LIMITS, cleanText } from '../../shared/rules';
import { pacote } from '../data/pacotes';
import { store, uid } from './storage';

export interface Quiz {
  id: string;
  titulo: string;
  tema: Theme;
  pontuacao?: Scoring; // ausente = 'speed' (quizzes salvos antes da opção)
  nomes: [string, string];
  marca: Brand & { ultima?: string };
  logo: string;
  perguntas: Question[];
  atualizado: number;
}

export function novoQuiz(tema: Theme = 'corp'): Quiz {
  return {
    id: uid(),
    titulo: tema === 'corp' ? 'Quiz da equipe' : 'Quiz da turma',
    tema,
    pontuacao: 'speed',
    nomes: ['', ''],
    marca: { name: '', color: '' },
    logo: '',
    perguntas: pacote(tema),
    atualizado: Date.now(),
  };
}

export const listar = () => store.get<Quiz[]>('quizzes', []).sort((a, b) => b.atualizado - a.atualizado);

/** Salva o quiz. Devolve false se o navegador não tiver espaço (logo grande, muitos quizzes). */
export function salvar(q: Quiz): boolean {
  q.atualizado = Date.now();
  const todos = store.get<Quiz[]>('quizzes', []).filter((x) => x.id !== q.id);
  todos.push(q);
  store.set('atual', q.id);
  return store.set('quizzes', todos);
}

export function excluir(id: string) {
  store.set(
    'quizzes',
    store.get<Quiz[]>('quizzes', []).filter((x) => x.id !== id),
  );
}

export function atual(): Quiz {
  const id = store.get<string>('atual', '');
  const todos = listar();
  return todos.find((q) => q.id === id) || todos[0] || novoQuiz();
}

/** Troca {A} e {B} pelos nomes. */
export function preencher(q: Quiz, s: string): string {
  return s.replace(/\{A\}/g, q.nomes[0] || 'Pessoa 1').replace(/\{B\}/g, q.nomes[1] || 'Pessoa 2');
}

export function exportar(q: Quiz): string {
  const { id: _id, atualizado: _a, ...resto } = q;
  return JSON.stringify({ formato: 'quiddo/1', ...resto }, null, 2);
}

/** Lê um JSON exportado. Lança Error com mensagem em português se não for um quiz. */
export function importar(texto: string): Quiz {
  let d: Partial<Quiz> & { formato?: string };
  try {
    d = JSON.parse(texto);
  } catch {
    throw new Error('Esse arquivo não é um quiz da Quiddo.');
  }
  if (!d || !Array.isArray(d.perguntas)) throw new Error('Esse arquivo não é um quiz da Quiddo.');
  const q = novoQuiz(d.tema === 'festa' ? 'festa' : 'corp');
  q.titulo = cleanText(d.titulo, 60) || 'Quiz importado';
  q.pontuacao = d.pontuacao === 'fixed' ? 'fixed' : 'speed';
  q.nomes = [cleanText(d.nomes?.[0], LIMITS.nick), cleanText(d.nomes?.[1], LIMITS.nick)];
  q.marca = { name: cleanText(d.marca?.name, LIMITS.brandName), color: /^#[0-9a-f]{6}$/i.test(d.marca?.color || '') ? d.marca!.color : '' };
  q.logo = typeof d.logo === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(d.logo) && d.logo.length <= LIMITS.logoBytes ? d.logo : '';
  q.perguntas = d.perguntas.slice(0, LIMITS.maxQuestions).map((p) => {
    const o = Array.isArray(p?.o) ? p.o.slice(0, 4).map((x) => String(x ?? '').slice(0, LIMITS.answerText)) : [];
    while (o.length < 2) o.push('');
    const c = Number.isInteger(p?.c) && p.c >= 0 && p.c < o.length ? p.c : 0;
    const tl = (LIMITS.times as readonly number[]).includes(p?.tl) ? p.tl : 20;
    return { t: String(p?.t ?? '').slice(0, LIMITS.questionText), o, c, tl };
  });
  return q;
}
