import { IMG_RE, LIMITS, cleanText, visualDoModo } from './rules';
import type { Brand, Question, Theme, Visual } from './protocol';
import { pdfSource, type PdfSource } from './pdf-source';
export interface QuizDocument {
  id: string;
  titulo: string;
  tema: Theme;
  visual?: Visual;
  tempo: number;
  dobroUltima?: boolean;
  marca: Brand & { ultima?: string };
  logo: string;
  perguntas: (Question & { vf?: boolean; pdf?: PdfSource })[];
  atualizado: number;
}
export const QUIZ_ID = /^[A-Za-z0-9_-]{1,100}$/;
export const DOCUMENT_LIMIT = 9_000_000;
/** Accept incomplete drafts, but bound every field and image before persistence. Never replace legacy questions. */
export function quizDocument(raw: unknown): QuizDocument {
  if (!raw || typeof raw !== 'object') throw new Error('Quiz inválido.');
  const d = raw as Record<string, unknown>;
  if (!QUIZ_ID.test(String(d.id || '')) || !Array.isArray(d.perguntas) || d.perguntas.length > LIMITS.maxQuestions)
    throw new Error('Quiz inválido.');
  const tema: Theme = d.tema === 'festa' || d.tema === 'escola' ? d.tema : 'corp';
  const tempo = (LIMITS.times as readonly number[]).includes(Number(d.tempo)) ? Number(d.tempo) : 15;
  const b = (d.marca && typeof d.marca === 'object' ? d.marca : {}) as Record<string, unknown>;
  const color = (v: unknown) => (/^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v) : '');
  let imageSize = 0;
  const image = (v: unknown, max: number) => {
    if (!v) return '';
    if (typeof v !== 'string' || v.length > max || !IMG_RE.test(v)) throw new Error('Imagem inválida ou grande demais.');
    imageSize += v.length;
    return v;
  };
  const logo = image(d.logo, LIMITS.logoBytes);
  const perguntas = d.perguntas.map((rawQuestion: unknown) => {
    if (!rawQuestion || typeof rawQuestion !== 'object') throw new Error('Pergunta inválida.');
    const p = rawQuestion as Record<string, unknown>;
    if (!Array.isArray(p.o) || p.o.length > 4) throw new Error('Respostas inválidas.');
    const tipo: Question['tipo'] = p.tipo === 'opiniao' || p.tipo === 'quem' ? p.tipo : undefined;
    const o = p.o.map((x) => String(x ?? '').slice(0, LIMITS.answerText));
    const c = tipo ? -1 : Number.isInteger(p.c) && Number(p.c) >= 0 && Number(p.c) < o.length ? Number(p.c) : -1;
    const img = image(p.img, LIMITS.imgBytes);
    const pdf = pdfSource(p.pdf);
    return {
      t: String(p.t ?? '').slice(0, LIMITS.questionText),
      o,
      c,
      tl: tempo,
      ...(tipo ? { tipo } : {}),
      ...(p.vf === true ? { vf: true } : {}),
      ...(img ? { img } : {}),
      ...(pdf ? { pdf } : {}),
    };
  });
  if (imageSize > LIMITS.imgTotal) throw new Error('As imagens deste quiz passaram do limite.');
  return {
    id: String(d.id),
    titulo: cleanText(d.titulo, 60),
    tema,
    visual: visualDoModo(tema, d.visual as Visual),
    tempo,
    dobroUltima: d.dobroUltima === true,
    marca: { name: cleanText(b.name, LIMITS.brandName), color: color(b.color), ultima: color(b.ultima) },
    logo,
    perguntas,
    atualizado: Number(d.atualizado) || Date.now(),
  };
}
