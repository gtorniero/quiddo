/** Source evidence is editor metadata, never part of the public room protocol. */
export interface PdfSource { page: number; evidence: string; answer: string; topic: string; hash: string }
export function pdfSource(value: unknown): PdfSource | undefined {
  if (!value || typeof value !== 'object') return;
  const p = value as Record<string, unknown>;
  if (!Number.isSafeInteger(p.page) || Number(p.page) < 1 || Number(p.page) > 5000 ||
      typeof p.evidence !== 'string' || typeof p.answer !== 'string') return;
  return {
    page: Number(p.page), evidence: p.evidence.slice(0, 500), answer: p.answer.slice(0, 80),
    topic: typeof p.topic === 'string' ? p.topic.slice(0, 100) : '',
    hash: typeof p.hash === 'string' && /^[a-f0-9]{64}$/.test(p.hash) ? p.hash : '',
  };
}
