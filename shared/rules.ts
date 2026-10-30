// Regras do jogo que valem dos dois lados: limites, pontuação, códigos e validação.
import type { Brand, CreateRoomBody, Question, Theme, Visual } from './protocol';

export const LIMITS = {
  maxPlayers: 200,
  maxQuestions: 50,
  questionText: 200,
  answerText: 80,
  nick: 18,
  brandName: 40,
  logoBytes: 400_000, // tamanho máximo da data URL do logo
  imgBytes: 260_000, // tamanho máximo da data URL de cada imagem de pergunta
  imgTotal: 8_000_000, // soma das imagens de um quiz
  times: [10, 15, 20, 30],
} as const;

// Sem 0, O, 1 e I, que se confundem na hora de digitar.
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{4}$/;

export function randomCode(rand: () => number = Math.random): string {
  let c = '';
  for (let i = 0; i < 4; i++) c += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  return c;
}

export function normalizeCode(raw: string): string {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);
}

/** Pontos de uma resposta certa: de 500 (no último instante) a 1000 (na hora). A rapidez sempre vale ponto. */
export function points(ms: number, limitSeconds: number): number {
  const limit = limitSeconds * 1000;
  return Math.round(500 + 500 * Math.max(0, 1 - Math.max(0, ms) / limit));
}

export function cleanText(s: unknown, max: number): string {
  return String(s ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export function cleanNick(s: unknown): string {
  return cleanText(s, LIMITS.nick);
}

/** Uma pergunta está pronta quando tem texto, ao menos 2 respostas e a certa preenchida. */
export function isReady(q: Question): boolean {
  if (!q.t.trim()) return false;
  if (q.tipo === 'quem') return true;
  const filled = q.o.filter((o) => o.trim());
  if (q.tipo === 'opiniao') return filled.length >= 2;
  return filled.length >= 2 && !!(q.o[q.c] || '').trim();
}

/** Tira respostas vazias e reajusta o índice da certa. Devolve null se a pergunta não estiver pronta. */
export function compactQuestion(q: Question): Question | null {
  if (!isReady(q)) return null;
  const o: string[] = [];
  let c = 0;
  if (q.tipo !== 'quem')
    q.o.forEach((ans, i) => {
      if (!ans.trim()) return;
      if (i === q.c) c = o.length;
      o.push(ans.trim());
    });
  const out: Question = { t: q.t.trim(), o, c: q.tipo === 'opiniao' || q.tipo === 'quem' ? -1 : c, tl: q.tl };
  if (q.tipo === 'opiniao' || q.tipo === 'quem') out.tipo = q.tipo;
  else if (q.dobro) out.dobro = true;
  if (q.img) out.img = q.img;
  return out;
}

export const IMG_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Visuais de cada modo, na ordem do editor. Floresta vem primeiro e é o padrão. */
export const VISUAIS_DO_MODO: Record<Theme, Visual[]> = {
  corp: ['floresta', 'escritorio', 'entretenimento'],
  festa: ['floresta', 'entretenimento', 'espaco', 'amor'],
  escola: ['floresta', 'sala', 'album', 'espaco', 'entretenimento'],
};

/** O visual pedido, se ele existe no modo; senão, Floresta. */
export function visualDoModo(theme: Theme, v: unknown): Visual {
  return VISUAIS_DO_MODO[theme].includes(v as Visual) ? (v as Visual) : 'floresta';
}

/** Valida o que o anfitrião manda para abrir a sala. Lança Error com mensagem em português. */
export function validateCreate(body: unknown): CreateRoomBody {
  const b = (body || {}) as Partial<CreateRoomBody>;
  const theme: Theme = b.theme === 'festa' || b.theme === 'escola' ? b.theme : 'corp';
  if (!Array.isArray(b.questions)) throw new Error('Quiz sem perguntas.');
  const questions: Question[] = [];
  for (const raw of b.questions.slice(0, LIMITS.maxQuestions)) {
    const r = (raw || {}) as Partial<Question>;
    const o = Array.isArray(r.o) ? r.o.slice(0, 4).map((x) => cleanText(x, LIMITS.answerText)) : [];
    const tl = (LIMITS.times as readonly number[]).includes(Number(r.tl)) ? Number(r.tl) : 15;
    const c = Number.isInteger(r.c) && (r.c as number) >= 0 && (r.c as number) < o.length ? (r.c as number) : 0;
    const tipo = r.tipo === 'opiniao' || r.tipo === 'quem' ? r.tipo : undefined;
    const img = typeof r.img === 'string' && r.img.length <= LIMITS.imgBytes && IMG_RE.test(r.img) ? r.img : undefined;
    const q = compactQuestion({ t: cleanText(r.t, LIMITS.questionText), o, c, tl, img, tipo, dobro: r.dobro === true });
    if (q) questions.push(q);
  }
  if (!questions.length) throw new Error('Nenhuma pergunta pronta.');
  if (questions.reduce((n, q) => n + (q.img ? q.img.length : 0), 0) > LIMITS.imgTotal) throw new Error('Imagens demais neste quiz. Tire algumas e tente de novo.');
  const rb = (b.brand || {}) as Partial<Brand>;
  const brand: Brand = {
    name: cleanText(rb.name, LIMITS.brandName),
    color: HEX.test(String(rb.color || '')) ? String(rb.color) : '',
  };
  let logo = typeof b.logo === 'string' ? b.logo : '';
  // Amigos & família não leva marca: nem nome, nem cor, nem logo
  if (theme === 'festa') {
    brand.name = '';
    brand.color = '';
    logo = '';
  }
  if (logo && (!IMG_RE.test(logo) || logo.length > LIMITS.logoBytes)) {
    throw new Error('Logo inválido ou grande demais.');
  }
  return { questions, theme, visual: visualDoModo(theme, b.visual), brand, logo };
}
