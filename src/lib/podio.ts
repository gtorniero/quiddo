// Pódio do fim do jogo: cena em camadas (céu, fundo, árvores, chão), coisas caindo do céu sem parar,
// degraus de verdade com textura e o cartão redondo do bicho de cada um em cima.
// Amigos & família e Escola são festivos; Corporativo é sóbrio (palco escuro, holofotes, dourado).
import type { RankRow, Theme } from '../../shared/protocol';
import { avatarSvg, comMoldura } from './avatar-art';
import { esc, fmt } from './dom';

const INK = '#0E2A22';

/** Árvore de copa redonda (ipê amarelo, ipê roxo ou verde). */
function arvore(x: number, y: number, s: number, copa: string, sombra: string) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-7 0 L-5 -70 Q0 -78 5 -70 L7 0Z" fill="#6B4A2E" stroke="${INK}" stroke-width="4"/>
    <path d="M0 -50 L-22 -82 M2 -60 L24 -88" stroke="#6B4A2E" stroke-width="7" stroke-linecap="round"/>
    <circle cx="-30" cy="-92" r="30" fill="${sombra}" stroke="${INK}" stroke-width="4"/>
    <circle cx="30" cy="-96" r="32" fill="${sombra}" stroke="${INK}" stroke-width="4"/>
    <circle cx="0" cy="-122" r="40" fill="${copa}" stroke="${INK}" stroke-width="4"/>
    <circle cx="-28" cy="-100" r="26" fill="${copa}"/><circle cx="28" cy="-104" r="26" fill="${copa}"/>
    <circle cx="-12" cy="-132" r="6" fill="#fff" opacity=".35"/><circle cx="14" cy="-112" r="4" fill="#fff" opacity=".3"/>
  </g>`;
}

/** Palmeira. */
function palmeira(x: number, y: number, s: number) {
  const folha = (r: number) =>
    `<path d="M0 -150 Q${40 * Math.cos(r)} ${-150 + 40 * Math.sin(r) - 20} ${80 * Math.cos(r)} ${-150 + 80 * Math.sin(r) + 10}" stroke="#2E8B57" stroke-width="14" fill="none" stroke-linecap="round"/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-8 0 Q-14 -80 0 -150 Q6 -80 8 0Z" fill="#A0744B" stroke="${INK}" stroke-width="4"/>
    ${[-2.8, -2.2, -1.6, -1.0, -0.4].map(folha).join('')}
    <circle cx="-6" cy="-146" r="7" fill="#7A5232"/><circle cx="6" cy="-144" r="7" fill="#7A5232"/>
  </g>`;
}

/** Fio de bandeirinhas de um lado ao outro. */
function bandeirinhas(y: number, cores: string[]) {
  let out = `<path d="M-20 ${y} Q600 ${y + 70} 1220 ${y}" stroke="${INK}" stroke-width="3" fill="none"/>`;
  for (let i = 0; i < 24; i++) {
    const x = -10 + i * 52;
    const t = (x + 20) / 1240;
    const cy = y + 140 * t * (1 - t); // acompanha a curva do fio
    out += `<path d="M${x} ${cy} l26 0 l-13 26z" fill="${cores[i % cores.length]}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
  }
  return out;
}

/** Cenas do pódio. Corporativo tem palco próprio; Escola é o álbum de figurinhas;
 *  Amigos & família reveza entre a mata à noite, a chuva de ipê e a praia no fim de tarde. */
export type Cena = 'corp' | 'mata' | 'ipe' | 'praia' | 'album';

const FESTA: Cena[] = ['mata', 'ipe', 'praia'];

/** A cena sai do código da sala: a TV e todos os celulares mostram a mesma, e cada sala nova pode trocar. */
export function cenaDoPodio(tema: Theme, code: string): Cena {
  if (tema === 'corp') return 'corp';
  if (tema === 'escola') return 'album';
  let h = 0;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FESTA[h % FESTA.length];
}

function cenaCorp() {
  return `<svg class="cenario" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="pc-ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16201d"/><stop offset="1" stop-color="#2a3632"/></linearGradient>
        <radialGradient id="pc-luz" cx="0.5" cy="0" r="0.9"><stop offset="0" stop-color="#fff6e6" stop-opacity=".5"/><stop offset="1" stop-color="#fff6e6" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="1200" height="600" fill="url(#pc-ceu)"/>
      <g fill="#33413c">${[40, 120, 190, 300, 380, 470, 760, 840, 930, 1010, 1100].map((x, i) => `<rect x="${x}" y="${300 - (i % 4) * 40}" width="${60 + (i % 3) * 18}" height="${300 + (i % 4) * 40}"/>`).join('')}</g>
      <g fill="#c9a24a" opacity=".35">${Array.from({ length: 40 }, (_, i) => `<rect x="${50 + ((i * 97) % 1100)}" y="${330 + ((i * 53) % 200)}" width="8" height="10"/>`).join('')}</g>
      <path d="M380 0 L180 600 L520 600Z" fill="url(#pc-luz)" class="holofote"/>
      <path d="M820 0 L680 600 L1020 600Z" fill="url(#pc-luz)" class="holofote h2"/>
      <rect y="560" width="1200" height="40" fill="#121a17"/>
      <rect y="556" width="1200" height="4" fill="#c9a24a"/>
    </svg>`;
}

/** Mata à noite: lua, morros, copas escuras e vaga-lumes (a chuva desta cena). */
function cenaMata() {
  const copa = (x: number, y: number, r: number, c: string) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="#08261D" stroke-width="5"/>`;
  return `<svg class="cenario" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
    <rect width="1200" height="600" fill="#0E2A22"/>
    <g fill="#FFF6E6">${Array.from({ length: 26 }, (_, i) => `<circle class="estrela-pisca" style="animation-delay:-${(i * 0.37) % 3}s" cx="${(i * 149) % 1180 + 10}" cy="${(i * 67) % 260 + 14}" r="${i % 3 ? 1.8 : 2.6}"/>`).join('')}</g>
    <circle cx="980" cy="110" r="62" fill="#FFF6E6"/><circle cx="1004" cy="92" r="56" fill="#0E2A22"/>
    <path d="M0 380 Q180 290 380 350 T780 330 T1200 350 V600 H0Z" fill="#0B5D45" stroke="#08261D" stroke-width="5"/>
    ${copa(120, 360, 70, '#0A4A37')}${copa(200, 330, 56, '#0F6E52')}${copa(1060, 350, 74, '#0A4A37')}${copa(1140, 320, 58, '#0F6E52')}
    <path d="M0 470 Q300 430 600 460 T1200 450 V600 H0Z" fill="#0A4A37" stroke="#08261D" stroke-width="5"/>
    <rect y="545" width="1200" height="55" fill="#08261D"/>
  </svg>`;
}

/** Folhagem na frente do palco da mata, nos cantos, balançando. */
function folhasMata() {
  return `<svg class="folhas folhas-e" viewBox="0 0 200 220" aria-hidden="true" focusable="false"><g class="balanca"><path d="M0 220 Q20 70 120 50 Q150 130 0 220Z" fill="#13A07A" stroke="#08261D" stroke-width="5"/><path d="M6 214 Q50 130 112 60" stroke="#08261D" stroke-width="4" fill="none"/><path d="M0 220 Q-10 110 50 30 Q80 110 0 220Z" fill="#0F8A68" stroke="#08261D" stroke-width="5"/></g></svg>
    <svg class="folhas folhas-d" viewBox="0 0 200 220" aria-hidden="true" focusable="false"><g class="balanca b2"><path d="M200 220 Q180 70 80 50 Q50 130 200 220Z" fill="#13A07A" stroke="#08261D" stroke-width="5"/><path d="M194 214 Q150 130 88 60" stroke="#08261D" stroke-width="4" fill="none"/><path d="M200 220 Q210 100 144 20 Q116 110 200 220Z" fill="#0F8A68" stroke="#08261D" stroke-width="5"/></g></svg>`;
}

/** Tarde de festa entre ipês, com bandeirinhas. A chuva desta cena são flores de ipê. */
function cenaIpe() {
  const ceu = ['#ffd59e', '#fff6e6'];
  return `<svg class="cenario" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
    <defs><linearGradient id="pf-ceu-ipe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ceu[0]}"/><stop offset="1" stop-color="${ceu[1]}"/></linearGradient></defs>
    <rect width="1200" height="600" fill="url(#pf-ceu-ipe)"/>
    <g class="sol"><circle cx="980" cy="120" r="70" fill="#FFC83D" stroke="${INK}" stroke-width="5"/>
      ${Array.from({ length: 12 }, (_, i) => `<rect x="976" y="20" width="8" height="26" rx="4" fill="#FFC83D" stroke="${INK}" stroke-width="3" transform="rotate(${i * 30} 980 120)"/>`).join('')}</g>
    <g class="nuvens" fill="#fff" stroke="${INK}" stroke-width="4">
      <path d="M150 140 q10 -40 50 -30 q20 -30 60 -10 q40 -10 40 30 q20 20 -10 30 h-130 q-30 -5 -10 -20z"/>
      <path d="M600 90 q8 -30 40 -24 q16 -24 48 -8 q32 -8 32 24 q16 16 -8 24 h-104 q-24 -4 -8 -16z"/>
    </g>
    <path d="M0 400 Q200 300 420 380 T860 360 T1200 380 V600 H0Z" fill="#8fcf8a" stroke="${INK}" stroke-width="5"/>
    ${palmeira(90, 470, 1.15)}${arvore(250, 470, 1.0, '#FFC83D', '#E9A800')}${arvore(1080, 475, 1.1, '#B07CD8', '#8A55B8')}${arvore(930, 470, 0.8, '#FFC83D', '#E9A800')}${palmeira(1170, 480, 0.95)}
    <path d="M0 470 Q300 420 600 460 T1200 450 V600 H0Z" fill="#5fb36a" stroke="${INK}" stroke-width="5"/>
    <rect y="540" width="1200" height="60" fill="#3f9b55"/>
    <g fill="#2e7d32">${Array.from({ length: 30 }, (_, i) => `<path d="M${i * 41 + 8} 548 l5 -14 l5 14z"/>`).join('')}</g>
    ${bandeirinhas(18, ['#13A07A', '#FF7A1A', '#FFC83D', '#E5383B', '#1E7FD6'])}
  </svg>`;
}

/** Praia no fim de tarde: sol se pondo, ondas andando, coqueiros, pipas e gaivotas. */
function cenaPraia() {
  const onda = (y: number, cor: string, cls: string) =>
    `<path class="${cls}" d="M0 ${y} ${Array.from({ length: 34 }, () => 'q20 -10 40 0').join(' ')}" stroke="${cor}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  const pipa = (x: number, y: number, c: string, cls: string) =>
    `<g transform="translate(${x} ${y})"><g class="pipa ${cls}"><path d="M0 -30 L22 0 L0 30 L-22 0Z" fill="${c}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M0 -30 V30 M-22 0 H22" stroke="${INK}" stroke-width="2.5"/><path class="rabiola" d="M0 30 q12 20 0 40 q-12 20 0 40" stroke="${INK}" stroke-width="3" fill="none"/></g></g>`;
  return `<svg class="cenario" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
    <defs><linearGradient id="pp-ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF9A4D"/><stop offset="1" stop-color="#FFE3B3"/></linearGradient>
      <clipPath id="pp-mar"><rect x="0" y="330" width="1200" height="270"/></clipPath></defs>
    <rect width="1200" height="600" fill="url(#pp-ceu)"/>
    <g class="sol-poe"><circle cx="600" cy="330" r="150" fill="#FFC83D" stroke="${INK}" stroke-width="6"/></g>
    <rect x="0" y="330" width="1200" height="270" fill="#1E7FD6"/>
    <g clip-path="url(#pp-mar)">${onda(352, '#5BC0EB', 'onda')}${onda(392, '#FFF6E6', 'onda o2')}${onda(432, '#5BC0EB', 'onda o3')}</g>
    <path d="M0 330 H1200" stroke="${INK}" stroke-width="5"/>
    <path d="M0 480 Q300 440 600 470 T1200 455 V600 H0Z" fill="#F5D7A1" stroke="${INK}" stroke-width="5"/>
    <g fill="#E9C285">${Array.from({ length: 20 }, (_, i) => `<circle cx="${(i * 131) % 1180 + 10}" cy="${520 + ((i * 29) % 70)}" r="3"/>`).join('')}</g>
    <g class="coqueiro">${palmeira(80, 560, 1.4)}</g><g class="coqueiro c2">${palmeira(1130, 570, 1.2)}</g>
    ${pipa(230, 130, '#E5383B', '')}${pipa(960, 100, '#13A07A', 'p2')}
    <g class="gaivota"><path d="M0 0 Q9 -9 18 0 Q27 -9 36 0" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round" transform="translate(0 210)"/></g>
    <g class="gaivota g2"><path d="M0 0 Q7 -7 14 0 Q21 -7 28 0" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round" transform="translate(0 160)"/></g>
  </svg>`;
}

/** Escola: página de álbum de figurinhas, com pauta, margem vermelha e fita adesiva. */
function cenaAlbum() {
  return `<svg class="cenario" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
    <rect width="1200" height="600" fill="#FFFDF5"/>
    <g stroke="#C9D8F5" stroke-width="3">${Array.from({ length: 16 }, (_, i) => `<path d="M0 ${60 + i * 36} H1200"/>`).join('')}</g>
    <path d="M96 0 V600" stroke="#E5383B" stroke-opacity=".45" stroke-width="4"/>
    <g fill="#5BC0EB" fill-opacity=".55"><rect x="40" y="24" width="120" height="30" transform="rotate(-8 100 39)"/><rect x="1040" y="28" width="120" height="30" transform="rotate(7 1100 43)"/></g>
    <g fill="none" stroke="#2B59C3" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".55">
      <path d="M190 150 l12 26 l28 4 l-20 20 l5 28 l-25 -13 l-25 13 l5 -28 l-20 -20 l28 -4z"/>
      <path d="M1010 190 q30 -40 60 0 q-30 40 -60 0z"/>
      <path d="M980 120 q20 -20 40 0 t40 0"/>
    </g>
    <text x="150" y="300" font-family="Fraunces, Georgia, serif" font-weight="900" font-size="54" fill="#2B59C3" fill-opacity=".35" transform="rotate(-10 150 300)">A+</text>
    <rect y="560" width="1200" height="40" fill="#E9E1CC"/>
  </svg>`;
}

function cenario(cena: Cena): string {
  return { corp: cenaCorp, mata: cenaMata, ipe: cenaIpe, praia: cenaPraia, album: cenaAlbum }[cena]();
}

/** Coisas caindo (ou voando) sem parar atrás dos degraus: vaga-lumes na mata, flores no ipê,
 *  estrelas e confete no álbum, serpentinas douradas no corporativo. A praia fica só com o vento. */
function chuva(cena: Cena): string {
  if (cena === 'praia') return '';
  const cores =
    cena === 'corp' ? ['#c9a24a', '#e8d9a8', '#ffffff'] : cena === 'album' ? ['#2B59C3', '#FFC83D', '#E5383B', '#7B4FD6', '#13A07A'] : ['#FFC83D', '#FFB000', '#FFE08A'];
  const n = cena === 'corp' ? 26 : cena === 'mata' ? 22 : 36;
  let out = '';
  for (let i = 0; i < n; i++) {
    // posições e tempos fixos por índice: a cena fica igual em todas as telas e não "pula" ao redesenhar
    const left = (i * 37) % 100;
    const dur = 5 + ((i * 7) % 6);
    const delay = -((i * 13) % 11);
    if (cena === 'mata') {
      out += `<i class="vagalume" style="left:${left}%;top:${8 + ((i * 23) % 70)}%;animation-duration:${4 + (i % 4)}s,${1.4 + (i % 3) * 0.5}s;animation-delay:${delay}s,${-(i % 5) * 0.3}s"></i>`;
      continue;
    }
    const tipo = cena === 'corp' ? 'fita' : cena === 'ipe' ? 'flor' : i % 4 === 0 ? 'estrela' : 'papel';
    out += `<i class="${tipo}" style="left:${left}%;animation-duration:${dur}s;animation-delay:${delay}s;--c:${cores[i % cores.length]}"></i>`;
  }
  return `<div class="chuva" aria-hidden="true">${out}</div>`;
}

/** Comemoração de cada lugar quando o pódio está completo: o 1º gira com coroa, o 2º dá pulinhos e o 3º balança. */
const FESTA_POS = ['', 'giro', 'pulinho', 'balanca'];

/**
 * Pódio completo. `step` revela do 3º para o 1º (0 nenhum, 1 terceiro, 2 segundo, 3 suspense, 4 primeiro);
 * `novo` é a posição que acabou de aparecer, para animar só ela. `code` escolhe a cena (ver cenaDoPodio).
 */
export function palco(rows: RankRow[], tema: Theme, step = 4, novo = -1, code = ''): string {
  const cena = cenaDoPodio(tema, code);
  const ordem: [RankRow | undefined, number][] = [
    [rows[1], 2],
    [rows[0], 1],
    [rows[2], 3],
  ];
  const visto = (pos: number) => (pos === 3 ? step >= 1 : pos === 2 ? step >= 2 : step >= 4);
  const giro = ['-5deg', '3deg', '6deg'];
  const degraus = ordem
    .map(([r, pos]) => {
      if (!r) return `<div class="degrau d${pos} vazio"></div>`;
      const show = visto(pos);
      const festa = step >= 4 ? ' ' + FESTA_POS[pos] : '';
      const coroa = pos === 1 && step >= 4 ? '<svg class="coroa-voa" viewBox="-34 -26 68 46" aria-hidden="true" focusable="false"><path d="M-26 12 L-29 -14 L-14 -1 L0 -20 L14 -1 L29 -14 L26 12Z" fill="#FFC83D" stroke="#0E2A22" stroke-width="4" stroke-linejoin="round"/><circle cx="0" cy="2" r="4" fill="#E5383B"/><circle cx="-15" cy="5" r="3" fill="#1E7FD6"/><circle cx="15" cy="5" r="3" fill="#13A07A"/></svg>' : '';
      const quem = show
        ? `<div class="boneco${pos === novo ? ' novo' : ''}${pos === 1 ? ' campeao' : ''}">${coroa}<div class="festa${festa}"><span class="fig" style="--r:${giro[pos - 1]}">${comMoldura(avatarSvg(r.avatar, 160, false, { vivo: true }), pos === 1 && step >= 4 ? 'lider' : null)}</span></div></div>`
        : `<div class="boneco oculto${pos === 1 && step === 3 ? ' tremendo' : ''}"><span aria-hidden="true">?</span></div>`;
      const placa = show ? `<b>${esc(r.nick)}</b><small>${fmt(r.score)} pts</small>` : '<b>&nbsp;</b><small>&nbsp;</small>';
      return `<div class="degrau d${pos}">${quem}<div class="bloco"><div class="tampa"></div><div class="frente"><span class="num">${pos}</span>${placa}</div></div></div>`;
    })
    .join('');
  const leitura = rows
    .slice(0, 3)
    .map((r, i) => (visto(i + 1) ? `${i + 1}º lugar: ${r.nick}, ${fmt(r.score)} pontos` : ''))
    .filter(Boolean)
    .join('. ');
  const frente = cena === 'mata' ? folhasMata() : '';
  const carimbo = cena === 'album' && step >= 4 ? '<div class="carimbo" aria-hidden="true">Nota 10</div>' : '';
  return `<div class="palco palco-${tema} cena-${cena}${step >= 4 ? ' completo' : ''}" role="img" aria-label="${esc(leitura || 'Pódio ainda escondido')}">${cenario(cena)}${chuva(cena)}<div class="degraus">${degraus}</div>${frente}${carimbo}</div>`;
}
