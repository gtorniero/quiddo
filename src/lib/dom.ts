// Ajudantes pequenos de DOM. As telas montam HTML em texto, então tudo que vem de usuário passa por esc().
const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const esc = (t: unknown) => String(t ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);

export const LETRAS = ['A', 'B', 'C', 'D'];

export const fmt = (n: number) => n.toLocaleString('pt-BR');

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Troca o conteúdo de um elemento mantendo o foco e a rolagem quando possível. */
export function patch(el: HTMLElement, html: string) {
  const active = document.activeElement as HTMLElement | null;
  const key = active && active.dataset ? active.dataset.focus : undefined;
  const y = window.scrollY;
  el.innerHTML = html;
  if (key) {
    const again = el.querySelector<HTMLElement>(`[data-focus="${key}"]`);
    if (again) again.focus({ preventScroll: true });
  }
  window.scrollTo(0, y);
}
