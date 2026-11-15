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

/** Visual Futebol: bola, apito, chuteira e luva de goleiro no lugar dos símbolos da natureza. */
const FUTEBOL = [
  '<circle cx="12" cy="12" r="10.5"/><path d="M12 7.2l4.4 3.2-1.7 5.1H9.3l-1.7-5.1Z" fill="var(--cut, #fff)"/><path d="M12 7.2V2.5M16.4 10.4l4.3-1.4M14.7 15.5l2.7 3.8M9.3 15.5l-2.7 3.8M7.6 10.4L3.3 9" stroke="var(--cut, #fff)" stroke-width="1.6" fill="none"/>',
  '<path d="M2 8.5h11.5a6.2 6.2 0 1 1-6.2 6.2V12H3a1 1 0 0 1-1-1Z"/><circle cx="13.5" cy="14.7" r="2.4" fill="var(--cut, #fff)"/><path d="M15.5 4.5l1.6-2.2M18.4 6.6l2.5-1M12.6 4.2V1.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>',
  '<path d="M1.5 8.5c2.5.4 4.6-.4 5.6-2.6l3.4 1.4c-.4 2.4 1.4 3.9 4.3 4.3 3.6.5 6.6 2 7.1 5v1.6H1.5Z"/><path d="M3 19.6v1.6M7 19.6v1.6M11 19.6v1.6M15 19.6v1.6M19 19.6v1.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M9.6 9.4l1.4 1.4M11.4 8.4l1.4 1.4" stroke="var(--cut, #fff)" stroke-width="1.3" stroke-linecap="round"/>',
  '<path d="M5 13V6.5a1.6 1.6 0 0 1 3.2 0V11V4.3a1.6 1.6 0 0 1 3.2 0V11V5a1.6 1.6 0 0 1 3.2 0v6.5V8a1.6 1.6 0 0 1 3.2 0v7.4c0 4.3-2.8 7.1-6.6 7.1S5 19.7 5 16Z"/><path d="M6 18.4h11" stroke="var(--cut, #fff)" stroke-width="1.6"/>',
];

/** SVG do símbolo da resposta k (0 a 3), na cor do texto atual. Decorativo. */
export function simbolo(k: number, cls = 'sym', visual?: string): string {
  const s = SIMBOLOS[k] || SIMBOLOS[0];
  const arte = visual === 'futebol' ? FUTEBOL[k] || FUTEBOL[0] : PATHS[s];
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${arte}</svg>`;
}

/** Olho do tucano, usado como cronômetro. O número fica por cima, num elemento à parte. */
export const OLHO =
  '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle cx="50" cy="50" r="44" fill="#13A07A" stroke="#0E2A22" stroke-width="6"/><circle cx="50" cy="50" r="31" fill="#5BC0EB" stroke="#0E2A22" stroke-width="5"/><circle cx="50" cy="50" r="22" fill="#fff"/></svg>';
