// "Meus quizzes": guardados no navegador do anfitrião. Importar e exportar em JSON.
import type { Brand, Question, Theme } from '../../shared/protocol';
import { IMG_RE, LIMITS, cleanText } from '../../shared/rules';
import { pacote } from '../data/pacotes';
import { store, uid } from './storage';

/** Pergunta no editor. `vf` marca as de verdadeiro ou falso (respostas fixas). */
export type Pergunta = Question & { vf?: boolean };

export interface Quiz {
  id: string;
  titulo: string;
  tema: Theme;
  tempo: number; // segundos de cada pergunta, o mesmo para todas: 10, 15, 20 ou 30
  dobroUltima?: boolean; // a última pergunta com resposta certa vale o dobro
  marca: Brand & { ultima?: string };
  logo: string;
  perguntas: Pergunta[];
  atualizado: number;
}

export function novoQuiz(tema: Theme = 'corp'): Quiz {
  return {
    id: uid(),
    titulo: tema === 'corp' ? 'Quiz da equipe' : tema === 'escola' ? 'Quiz da turma' : 'Quiz da galera',
    tema,
    tempo: 20,
    marca: { name: '', color: '' },
    logo: '',
    perguntas: pacote(tema),
    atualizado: Date.now(),
  };
}

const TEMPOS = LIMITS.times as readonly number[];

/** Quizzes salvos por versões antigas não têm `tempo`: usa o da primeira pergunta. */
function normalizar(q: Quiz): Quiz {
  if (!TEMPOS.includes(q.tempo)) q.tempo = TEMPOS.includes(q.perguntas[0]?.tl) ? q.perguntas[0].tl : 20;
  if (q.tema !== 'festa' && q.tema !== 'escola') q.tema = 'corp';
  return q;
}

export const listar = () =>
  store
    .get<Quiz[]>('quizzes', [])
    .map(normalizar)
    .sort((a, b) => b.atualizado - a.atualizado);

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
  const q = novoQuiz(d.tema === 'festa' || d.tema === 'escola' ? d.tema : 'corp');
  q.titulo = cleanText(d.titulo, 60) || 'Quiz importado';
  q.marca = { name: cleanText(d.marca?.name, LIMITS.brandName), color: /^#[0-9a-f]{6}$/i.test(d.marca?.color || '') ? d.marca!.color : '' };
  q.logo = typeof d.logo === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(d.logo) && d.logo.length <= LIMITS.logoBytes ? d.logo : '';
  q.perguntas = d.perguntas.slice(0, LIMITS.maxQuestions).map((p) => {
    const o = Array.isArray(p?.o) ? p.o.slice(0, 4).map((x) => String(x ?? '').slice(0, LIMITS.answerText)) : [];
    while (o.length < 2) o.push('');
    const c = Number.isInteger(p?.c) && p.c >= 0 && p.c < o.length ? p.c : 0;
    const tl = TEMPOS.includes(p?.tl) ? p.tl : 20;
    const out: Pergunta = { t: String(p?.t ?? '').slice(0, LIMITS.questionText), o, c, tl };
    if (p?.tipo === 'opiniao' || p?.tipo === 'quem') {
      out.tipo = p.tipo;
      out.c = -1;
      if (p.tipo === 'quem') out.o = [];
    }
    if (p?.vf) {
      out.vf = true;
      out.o = ['Verdadeiro', 'Falso'];
      out.c = p.c === 1 ? 1 : 0;
    }
    if (typeof p?.img === 'string' && p.img.length <= LIMITS.imgBytes && IMG_RE.test(p.img)) out.img = p.img;
    return out;
  });
  q.tempo = TEMPOS.includes(Number(d.tempo)) ? Number(d.tempo) : 0;
  q.dobroUltima = d.dobroUltima === true;
  return normalizar(q);
}
