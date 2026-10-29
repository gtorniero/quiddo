// Tema (corp/festa) e cor da marca. A cor da marca substitui a cor principal do tema.
import type { Theme } from '../../shared/protocol';

export const THEME_ACC: Record<Theme, string> = { corp: '#18181B', festa: '#FF4F8B' };

const HEX = /^#([0-9a-f]{6})$/i;

function rgb(h: string): [number, number, number] | null {
  const m = HEX.exec(h || '');
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lum([r, g, b]: [number, number, number]) {
  const f = (v: number) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrast(a: string, b: string): number {
  const ra = rgb(a);
  const rb = rgb(b);
  if (!ra || !rb) return 1;
  const la = lum(ra);
  const lb = lum(rb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const hex = (c: number[]) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/** Escurece a cor até ter contraste 4.5:1 sobre o fundo (para usar a cor da marca em texto). */
function readable(c: string, bg: string): string {
  let cur = rgb(c);
  if (!cur) return c;
  for (let i = 0; i < 20 && contrast(hex(cur), bg) < 4.5; i++) cur = cur.map((v) => v * 0.85) as [number, number, number];
  return hex(cur);
}

/** Branco ou preto, o que tiver mais contraste com a cor do botão. */
export function inkFor(c: string): string {
  return contrast(c, '#ffffff') >= contrast(c, '#111111') ? '#FFFFFF' : '#111111';
}

export function applyTheme(theme: Theme, brandColor = '') {
  const root = document.documentElement;
  root.setAttribute('data-tema', theme);
  const st = root.style;
  for (const k of ['--acc', '--acc-ink', '--acc-text', '--acc-soft']) st.removeProperty(k);
  const c = rgb(brandColor);
  if (!c) return;
  const bg = theme === 'festa' ? '#ffffff' : '#f5f5f4';
  st.setProperty('--acc', brandColor);
  st.setProperty('--acc-ink', inkFor(brandColor));
  st.setProperty('--acc-text', readable(brandColor, bg));
  st.setProperty('--acc-soft', `rgba(${c[0]},${c[1]},${c[2]},.15)`);
}
