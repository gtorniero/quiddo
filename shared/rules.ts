// Regras do jogo que valem dos dois lados: limites, pontuação, códigos e validação.
import type { Brand, CreateRoomBody, Question, Scoring, Theme } from './protocol';

export const LIMITS = {
  maxPlayers: 200,
  maxQuestions: 50,
  questionText: 200,
  answerText: 80,
  nick: 18,
  brandName: 40,
  logoBytes: 400_000, // tamanho máximo da data URL do logo
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

/** Pontos de uma resposta certa: de 500 (no último instante) a 1000 (na hora). No modo "Sem pressa", sempre 1000. */
export function points(ms: number, limitSeconds: number, scoring: Scoring = 'speed'): number {
  if (scoring === 'fixed') return 1000;
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
  const filled = q.o.filter((o) => o.trim());
  return !!q.t.trim() && filled.length >= 2 && !!(q.o[q.c] || '').trim();
}

/** Tira respostas vazias e reajusta o índice da certa. Devolve null se a pergunta não estiver pronta. */
export function compactQuestion(q: Question): Question | null {
  if (!isReady(q)) return null;
  const o: string[] = [];
  let c = 0;
  q.o.forEach((ans, i) => {
    if (!ans.trim()) return;
    if (i === q.c) c = o.length;
    o.push(ans.trim());
  });
  return { t: q.t.trim(), o, c, tl: q.tl };
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Valida o que o anfitrião manda para abrir a sala. Lança Error com mensagem em português. */
export function validateCreate(body: unknown): CreateRoomBody {
  const b = (body || {}) as Partial<CreateRoomBody>;
  const theme: Theme = b.theme === 'festa' ? 'festa' : 'corp';
  const scoring: Scoring = b.scoring === 'fixed' ? 'fixed' : 'speed';
  if (!Array.isArray(b.questions)) throw new Error('Quiz sem perguntas.');
  const questions: Question[] = [];
  for (const raw of b.questions.slice(0, LIMITS.maxQuestions)) {
    const r = (raw || {}) as Partial<Question>;
    const o = Array.isArray(r.o) ? r.o.slice(0, 4).map((x) => cleanText(x, LIMITS.answerText)) : [];
    const tl = (LIMITS.times as readonly number[]).includes(Number(r.tl)) ? Number(r.tl) : 20;
    const c = Number.isInteger(r.c) && (r.c as number) >= 0 && (r.c as number) < o.length ? (r.c as number) : 0;
    const q = compactQuestion({ t: cleanText(r.t, LIMITS.questionText), o, c, tl });
    if (q) questions.push(q);
  }
  if (!questions.length) throw new Error('Nenhuma pergunta pronta.');
  const rb = (b.brand || {}) as Partial<Brand>;
  const brand: Brand = {
    name: cleanText(rb.name, LIMITS.brandName),
    color: HEX.test(String(rb.color || '')) ? String(rb.color) : '',
  };
  let logo = typeof b.logo === 'string' ? b.logo : '';
  if (logo && (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(logo) || logo.length > LIMITS.logoBytes)) {
    throw new Error('Logo inválido ou grande demais.');
  }
  return { questions, theme, scoring, brand, logo };
}
