// Símbolos das respostas: cada letra tem uma cor do logo e um símbolo da natureza brasileira.
// A letra continua sendo o identificador (A, B, C, D); o símbolo só reforça, para quem não distingue cores.
// Ordem e cores escolhidas para não repetir o conjunto de nenhum outro quiz: verde, laranja, azul, vermelho.

export const SIMBOLOS = ['folha', 'sol', 'gota', 'flor'] as const;
export type Simbolo = (typeof SIMBOLOS)[number];

const PATHS: Record<Simbolo, string> = {
  folha: '<path d="M3.5 20.5 C3 10 9 3.5 20.5 3.5 C20.5 15 14 21 3.5 20.5Z"/><path d="M5 19 L15 9" stroke="var(--cut, #fff)" stroke-width="1.8" stroke-linecap="round" fill="none"/>',
  sol: '<circle cx="12" cy="12" r="5.6"/><path d="M12 1.6v2.8M12 19.6v2.8M1.6 12h2.8M19.6 12h2.8M4.6 4.6l2 2M17.4 17.4l2 2M4.6 19.4l2-2M17.4 6.6l2-2" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"/>',
  gota: '<path d="M12 1.5 C12 1.5 4 10.5 4 15.2 A8 8 0 0 0 20 15.2 C20 10.5 12 1.5 12 1.5Z"/><path d="M8.2 15.5 A3.8 3.8 0 0 0 11 19" stroke="var(--cut, #fff)" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
  flor: '<circle cx="12" cy="5.6" r="4.4"/><circle cx="18.1" cy="10" r="4.4"/><circle cx="15.8" cy="17.2" r="4.4"/><circle cx="8.2" cy="17.2" r="4.4"/><circle cx="5.9" cy="10" r="4.4"/><circle cx="12" cy="12" r="3.2" fill="var(--cut, #fff)"/>',
};

/** SVG do símbolo da resposta k (0 a 3), na cor do texto atual. Decorativo. */
export function simbolo(k: number, cls = 'sym'): string {
  const s = SIMBOLOS[k] || SIMBOLOS[0];
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${PATHS[s]}</svg>`;
}

/** Olho do tucano, usado como cronômetro. O número fica por cima, num elemento à parte. */
export const OLHO =
  '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle cx="50" cy="50" r="44" fill="#13A07A" stroke="#0E2A22" stroke-width="6"/><circle cx="50" cy="50" r="31" fill="#5BC0EB" stroke="#0E2A22" stroke-width="5"/><circle cx="50" cy="50" r="22" fill="#fff"/></svg>';
