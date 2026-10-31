// Desenhos de cada visual entre as rodadas: o relógio do "Prepare-se" e a cortina que atravessa a TV.
// Floresta é o de sempre (olho do tucano e cortina de folhas). Os outros trocam o desenho, não o ritmo:
// o anel (#anel, pathLength 100) esvazia em 3 s no tempo do servidor e o número fica no meio.
import type { Visual } from '../../shared/protocol';

const INK = '#0E2A22';

/** Anel que esvazia: trilho + anel. Igual em todos, só mudam as cores e o raio. */
const anel = (trilho: string, cor: string, r = 105, cx = 150, cy = 150) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${trilho}" stroke-width="14"/><circle class="anel" id="anel" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${cor}" stroke-width="14" stroke-linecap="round" pathLength="100" stroke-dasharray="100 200" transform="rotate(-90 ${cx} ${cy})"/>`;

/** Miolo claro onde o número aparece (contraste com a tinta). */
const miolo = (r = 62, cx = 150, cy = 150) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="${INK}" stroke-width="4"/>`;

const postit = (x: number, y: number, s: number, rot: number, cor: string) =>
  `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}" fill="${cor}" stroke="${INK}" stroke-width="3"/><path d="M${-s / 2 + 6} ${-s / 6} h${s - 14} M${-s / 2 + 6} ${s / 8} h${s - 22}" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" opacity=".55"/></g>`;

const coracao = (x: number, y: number, s: number, cor: string, rot = 0) =>
  `<path transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" d="M0 16 L-16 0 a9 9 0 0 1 16 -12 a9 9 0 0 1 16 12Z" fill="${cor}" stroke="${INK}" stroke-width="${2.4 / s}" stroke-linejoin="round"/>`;

const estrela = (x: number, y: number, s: number, cor: string) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -11 l3.2 6.8 7.6 1 -5.6 5.2 1.4 7.4 -6.6 -3.6 -6.6 3.6 1.4 -7.4 -5.6 -5.2 7.6 -1z" fill="${cor}" stroke="${INK}" stroke-width="${2 / s}" stroke-linejoin="round"/>`;

const CONTAS: Record<Exclude<Visual, 'floresta'>, string> = {
  // relógio de parede colorido, post-its colados em volta e a caneca de café soltando fumaça
  escritorio: `<circle cx="150" cy="150" r="136" fill="#FFC23D" stroke="${INK}" stroke-width="8"/>${anel('#FFE7A6', '#4C6FFF')}<circle cx="150" cy="150" r="88" fill="#FF5C8A" stroke="${INK}" stroke-width="7"/>${miolo()}
    ${postit(34, 40, 52, -12, '#7FE0B5')}${postit(262, 52, 46, 10, '#8FA6FF')}
    <g transform="translate(250 246)"><path d="M-26 -22 h46 v34 a20 20 0 0 1 -20 20 h-6 a20 20 0 0 1 -20 -20Z" fill="#fff" stroke="${INK}" stroke-width="5"/><path d="M20 -12 a12 12 0 0 1 0 22" fill="none" stroke="${INK}" stroke-width="5"/><path d="M-22 -14 h38" stroke="#7A4B2A" stroke-width="6"/><g class="fumaca" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"><path d="M-12 -30 q-6 -8 0 -16 q6 -8 0 -16"/><path d="M4 -30 q-6 -8 0 -16 q6 -8 0 -16"/></g></g>`,
  // contagem de filme antigo: mira, trilho escuro e anel vermelho
  entretenimento: `<circle cx="150" cy="150" r="136" fill="#1A1A1E" stroke="${INK}" stroke-width="8"/><path d="M150 18 V282 M18 150 H282" stroke="#5A5A62" stroke-width="3"/>${anel('#3A3A40', '#D7263D')}<circle cx="150" cy="150" r="88" fill="#F5F0E6" stroke="${INK}" stroke-width="7"/><circle cx="150" cy="150" r="76" fill="none" stroke="#F5B800" stroke-width="4" stroke-dasharray="6 8"/>${miolo()}
    <g transform="translate(46 254) rotate(-14)"><rect x="-30" y="-10" width="60" height="34" rx="3" fill="#1A1A1E" stroke="${INK}" stroke-width="4"/><g class="claquete"><rect x="-30" y="-24" width="60" height="13" fill="#F5F0E6" stroke="${INK}" stroke-width="4"/><path d="M-22 -24 l8 13 M-6 -24 l8 13 M10 -24 l8 13" stroke="${INK}" stroke-width="5"/></g></g>`,
  // relógio de lousa: moldura de madeira, giz amarelo e a maçã da professora
  sala: `<circle cx="150" cy="150" r="136" fill="#6B4A2E" stroke="${INK}" stroke-width="8"/><circle cx="150" cy="150" r="124" fill="#2E4A3A"/>${anel('#3E6250', '#FFE066')}<circle cx="150" cy="150" r="88" fill="#F2F2EA" stroke="${INK}" stroke-width="7"/>${miolo()}
    <g fill="none" stroke="#F2F2EA" stroke-width="3" stroke-linecap="round" opacity=".8"><path d="M58 92 l6 -12 l6 12 l-12 -8 h12z"/><path d="M226 222 q10 -12 20 0 t20 0"/></g>
    <g transform="translate(150 22)"><circle r="20" fill="#E5383B" stroke="${INK}" stroke-width="5"/><path d="M0 -20 q2 -10 8 -14" stroke="${INK}" stroke-width="4" fill="none"/><path d="M4 -24 q12 -8 18 2 q-10 6 -18 -2z" fill="#13A07A" stroke="${INK}" stroke-width="3"/></g>`,
  // pacotinho de figurinhas: anel amarelo e figurinhas voando em volta
  album: `<circle cx="150" cy="150" r="136" fill="#2B59C3" stroke="${INK}" stroke-width="8"/>${anel('#1F448F', '#FFC83D')}<circle cx="150" cy="150" r="88" fill="#FFFDF5" stroke="${INK}" stroke-width="7"/><circle cx="150" cy="150" r="78" fill="none" stroke="#E5383B" stroke-width="3" stroke-dasharray="4 7"/>${miolo()}
    <g transform="translate(40 52) rotate(-14)"><rect x="-22" y="-28" width="44" height="56" rx="6" fill="#fff" stroke="${INK}" stroke-width="4"/><rect x="-16" y="-22" width="32" height="34" rx="3" fill="#7FE0B5"/>${estrela(0, -5, 1, '#FFC83D')}</g>
    <g transform="translate(262 250) rotate(12)"><rect x="-22" y="-28" width="44" height="56" rx="6" fill="#fff" stroke="${INK}" stroke-width="4"/><rect x="-16" y="-22" width="32" height="34" rx="3" fill="#FF8FB1"/>${coracao(0, -6, 0.7, '#E5383B')}</g>`,
  // planeta com anel e foguete: o anel azul é o combustível acabando
  espaco: `<ellipse cx="150" cy="150" rx="150" ry="34" fill="none" stroke="#FFC83D" stroke-width="10" transform="rotate(-18 150 150)"/><circle cx="150" cy="150" r="136" fill="#7B4FD6" stroke="${INK}" stroke-width="8"/><circle cx="96" cy="74" r="12" fill="#6A3FC4"/><circle cx="218" cy="236" r="9" fill="#6A3FC4"/>${anel('#5B35B0', '#5BC0EB')}<circle cx="150" cy="150" r="88" fill="#0B1033" stroke="${INK}" stroke-width="7"/><g fill="#fff"><circle cx="104" cy="122" r="2.4"/><circle cx="196" cy="110" r="2"/><circle cx="188" cy="196" r="2.4"/><circle cx="110" cy="190" r="1.8"/></g>${miolo()}
    <g transform="translate(262 46) rotate(30)"><path d="M-12 18 Q-14 -6 0 -24 Q14 -6 12 18Z" fill="#F2F2EA" stroke="${INK}" stroke-width="4"/><circle cy="-4" r="5" fill="#5BC0EB" stroke="${INK}" stroke-width="3"/><path class="chama" d="M-6 20 Q0 40 6 20Z" fill="#FF7A1A" stroke="${INK}" stroke-width="2.5"/></g>`,
  // coração batendo, com anel branco
  amor: `<path d="M150 284 L28 160 A68 68 0 0 1 150 54 A68 68 0 0 1 272 160 Z" fill="#E5383B" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/><path d="M62 118 q14 -26 46 -30" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" opacity=".55"/>${anel('#B3262A', '#FFF6E6', 78, 150, 158)}<circle cx="150" cy="158" r="62" fill="#fff" stroke="${INK}" stroke-width="4"/>
    ${coracao(40, 40, 1.1, '#FF8FB1', -14)}${coracao(266, 34, 0.9, '#fff', 12)}`,
};

/** Desenho do relógio do "Prepare-se" de cada visual (Floresta usa o olho do tucano, em jogo-comum). */
export function contaVisual(v: Exclude<Visual, 'floresta'>) {
  return `<div class="olho-conta conta-${v}" aria-hidden="true"><svg viewBox="0 0 300 300" focusable="false">${CONTAS[v]}</svg><b class="prep-n" id="prep">5</b></div>`;
}

/** Posições fixas (sem sorteio) para espalhar peças pela cortina: mesmo desenho em todas as telas. */
function espalha(n: number, f: (x: number, y: number, i: number) => string) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const col = i % 6;
    const lin = Math.floor(i / 6);
    out += f(col * 175 + ((lin * 61) % 90) - 20, lin * 165 + ((col * 47) % 70) - 10, i);
  }
  return out;
}

const CORTINAS: Record<Exclude<Visual, 'floresta'>, string> = {
  escritorio: espalha(24, (x, y, i) => postit(x + 60, y + 60, 150, ((i * 37) % 30) - 15, ['#FFC23D', '#FF8FB0', '#8FA6FF', '#7FE0B5'][i % 4])),
  entretenimento: `<g stroke="${INK}" stroke-width="6">${Array.from({ length: 12 }, (_, i) => `<path d="M${i * 90 - 20} -20 q30 320 0 640 h90 q-30 -320 0 -640z" fill="${i % 2 ? '#A81B2E' : '#D7263D'}"/>`).join('')}</g>
    <g><rect x="-20" y="250" width="1100" height="100" fill="#1A1A1E" stroke="${INK}" stroke-width="6"/>${Array.from({ length: 28 }, (_, i) => `<rect x="${i * 40}" y="262" width="22" height="14" rx="3" fill="#F5F0E6"/><rect x="${i * 40}" y="324" width="22" height="14" rx="3" fill="#F5F0E6"/>`).join('')}</g>
    ${[120, 420, 720].map((x) => `<g transform="translate(${x} 300)"><circle r="44" fill="#F5B800" stroke="${INK}" stroke-width="5"/>${[0, 72, 144, 216, 288].map((a) => `<circle cx="${26 * Math.cos((a * Math.PI) / 180)}" cy="${26 * Math.sin((a * Math.PI) / 180)}" r="9" fill="#1A1A1E"/>`).join('')}</g>`).join('')}`,
  sala: espalha(24, (x, y, i) => {
    const r = ((i * 29) % 24) - 12;
    return `<g transform="translate(${x + 70} ${y + 80}) rotate(${r})"><rect x="-95" y="-120" width="190" height="240" fill="#FFFDF5" stroke="${INK}" stroke-width="4"/>${Array.from({ length: 8 }, (_, k) => `<path d="M-95 ${-90 + k * 28} H95" stroke="#C9D8F5" stroke-width="3"/>`).join('')}<path d="M-66 -120 V120" stroke="#E5383B" stroke-opacity=".55" stroke-width="3"/>${i % 5 === 2 ? `<path d="M-40 -30 L40 -10 L-40 10 L-24 -10Z" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>` : ''}</g>`;
  }),
  album: espalha(24, (x, y, i) => {
    const r = ((i * 31) % 26) - 13;
    const fundo = ['#7FE0B5', '#FFC83D', '#8FB2F2', '#FF8FB1', '#B07CD8'][i % 5];
    return `<g transform="translate(${x + 70} ${y + 80}) rotate(${r})"><rect x="-74" y="-96" width="148" height="192" rx="12" fill="#fff" stroke="${INK}" stroke-width="5"/><rect x="-62" y="-84" width="124" height="130" rx="8" fill="${fundo}" stroke="${INK}" stroke-width="3"/>${estrela(0, -20, 2.4, '#fff')}<rect x="-50" y="58" width="100" height="16" rx="8" fill="${INK}" opacity=".18"/></g>`;
  }),
  espaco: `<path d="M-40 640 C-60 300 40 -40 300 -40 C420 -40 470 60 560 30 C700 -20 820 -40 1060 0 L1060 640Z" fill="#0B1033" stroke="${INK}" stroke-width="6"/>
    <g fill="#fff">${Array.from({ length: 50 }, (_, i) => `<circle cx="${(i * 149) % 1000 + 10}" cy="${(i * 83) % 560 + 30}" r="${i % 4 ? 2.2 : 3.6}"/>`).join('')}</g>
    <g stroke="${INK}" stroke-width="5"><circle cx="240" cy="380" r="90" fill="#7B4FD6"/><ellipse cx="240" cy="380" rx="150" ry="28" fill="none" stroke="#FFC83D" stroke-width="12" transform="rotate(-14 240 380)"/><circle cx="760" cy="180" r="64" fill="#1E7FD6"/><circle cx="560" cy="470" r="38" fill="#FF7A1A"/></g>
    <g transform="translate(520 220) rotate(60)"><path d="M-30 50 Q-36 -20 0 -70 Q36 -20 30 50Z" fill="#F2F2EA" stroke="${INK}" stroke-width="6"/><circle cy="-10" r="14" fill="#5BC0EB" stroke="${INK}" stroke-width="5"/><path d="M-30 26 L-52 64 L-30 56Z M30 26 L52 64 L30 56Z" fill="#E5383B" stroke="${INK}" stroke-width="5"/><path d="M-16 54 Q0 120 16 54Z" fill="#FFC83D" stroke="#FF7A1A" stroke-width="5"/></g>`,
  amor: espalha(24, (x, y, i) => coracao(x + 70, y + 70, 5.4 + (i % 3) * 0.8, ['#E5383B', '#FF8FB1', '#B3262A', '#FFD1DC'][i % 4], ((i * 23) % 30) - 15)),
};

/** Desenho da cortina da troca de pergunta de cada visual (Floresta usa a de folhas, em jogo-comum). */
export function cortinaVisual(v: Exclude<Visual, 'floresta'>) {
  return `<svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" focusable="false">${CORTINAS[v]}</svg>`;
}

/** Miniatura do visual para o editor: o relógio do "Prepare-se" de cada um, sem animação. */
export function miniVisual(v: Visual) {
  const arte =
    v === 'floresta'
      ? `<circle cx="150" cy="150" r="136" fill="#13A07A" stroke="${INK}" stroke-width="8"/><circle cx="150" cy="150" r="105" fill="none" stroke="#FFC83D" stroke-width="14"/><circle cx="150" cy="150" r="88" fill="#5BC0EB" stroke="${INK}" stroke-width="7"/><circle cx="150" cy="150" r="62" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="150" cy="150" r="30" fill="${INK}"/>`
      : CONTAS[v].replace(' class="anel" id="anel"', '');
  return `<svg class="mini-visual" viewBox="-10 -10 320 320" aria-hidden="true" focusable="false">${arte}</svg>`;
}
