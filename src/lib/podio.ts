// Pódio do fim do jogo: cena em camadas (céu, fundo, árvores, chão), coisas caindo do céu sem parar,
// degraus de verdade com textura e o cartão redondo do bicho de cada um em cima.
// Amigos & família e Escola são festivos; Corporativo é sóbrio (palco escuro, holofotes, dourado).
import type { RankRow, Theme, Visual } from '../../shared/protocol';
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

/** Cenas do pódio. Cada visual tem a sua; na Floresta (o padrão), Corporativo tem palco próprio e
 *  Amigos & família e Escola revezam entre a mata à noite, a chuva de ipê e a praia no fim de tarde. */
export type Cena = 'corp' | 'mata' | 'ipe' | 'praia' | 'album' | 'escritorio' | 'cinema' | 'sala' | 'lua' | 'amor';

const FESTA: Cena[] = ['mata', 'ipe', 'praia'];

const DO_VISUAL: Record<Exclude<Visual, 'floresta'>, Cena> = { escritorio: 'escritorio', entretenimento: 'cinema', sala: 'sala', album: 'album', espaco: 'lua', amor: 'amor' };

/** A cena sai do visual e do código da sala: a TV e todos os celulares mostram a mesma, e cada sala nova pode trocar. */
export function cenaDoPodio(tema: Theme, code: string, visual: Visual = 'floresta'): Cena {
  if (visual !== 'floresta') return DO_VISUAL[visual];
  if (tema === 'corp') return 'corp';
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


/** Escritório descolado: parede lilás, neon, telão com gráfico subindo, escorregador, pufes e plantas. */
function cenaEscritorio() {
  const pendente = (x: number, c: string, d: number) =>
    `<g transform="translate(${x} 0)"><g class="pendente" style="animation-delay:-${d}s"><path d="M0 0 V70" stroke="${INK}" stroke-width="4"/><path d="M-30 100 Q0 54 30 100Z" fill="${c}" stroke="${INK}" stroke-width="4"/><ellipse cx="0" cy="104" rx="14" ry="6" fill="#FFF6C8"/></g></g>`;
  const planta = (x: number, y: number, s: number, vaso: string) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><g class="folhagem"><path d="M0 -40 Q-60 -90 -50 -150 Q-10 -110 0 -40Z M0 -40 Q50 -100 70 -140 Q60 -70 0 -40Z M0 -40 Q-10 -120 10 -180 Q30 -110 0 -40Z" fill="#19B37D" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/></g><path d="M-34 -44 h68 l-8 44 h-52Z" fill="${vaso}" stroke="${INK}" stroke-width="4"/></g>`;
  return `<svg class="cenario" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
    <rect width="1200" height="600" fill="#F4F1FF"/>
    <g opacity=".5">${Array.from({ length: 60 }, (_, i) => `<circle cx="${(i % 12) * 100 + 50}" cy="${Math.floor(i / 12) * 90 + 40}" r="4" fill="#C9C1F2"/>`).join('')}</g>
    <path d="M0 0 H1200 V40 H0Z" fill="#4C6FFF"/><path d="M0 40 H1200" stroke="${INK}" stroke-width="4"/>
    ${pendente(220, '#FF5C8A', 0)}${pendente(980, '#FFC23D', 1.2)}
    <g transform="translate(420 70)"><rect width="360" height="200" rx="14" fill="#1E1B3A" stroke="${INK}" stroke-width="6"/>
      <g class="grafico">${[0, 1, 2, 3, 4].map((i) => `<rect x="${40 + i * 62}" y="${160 - (i + 1) * 24}" width="40" height="${(i + 1) * 24}" rx="4" fill="${['#FF5C8A', '#FFC23D', '#19B37D', '#8FA6FF', '#4C6FFF'][i]}"/>`).join('')}</g>
      <path class="seta-sobe" d="M40 150 L120 112 L190 122 L320 40" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round" pathLength="100"/><path d="M300 36 L322 38 L318 60" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
    <text class="neon" x="160" y="200" font-family="Fraunces, Georgia, serif" font-style="italic" font-weight="900" font-size="44" fill="#FF5C8A" stroke="#fff" stroke-width="1.5" transform="rotate(-6 160 200)">Mandou bem, time!</text>
    ${[[860, 110, '#FFC23D', -8], [920, 170, '#7FE0B5', 6], [990, 120, '#8FA6FF', -4], [1060, 180, '#FF8FB0', 8]].map(([x, y, c, r]) => `<rect x="${x}" y="${y}" width="54" height="54" fill="${c}" stroke="${INK}" stroke-width="3" transform="rotate(${r} ${Number(x) + 27} ${Number(y) + 27})"/>`).join('')}
    <g stroke="${INK}" stroke-width="5" stroke-linejoin="round"><path d="M40 560 C70 460 120 380 200 330 L230 330 C160 380 110 470 90 560Z" fill="#FFC23D"/><path d="M196 330 V560 M236 330 V560" stroke-width="6"/><path d="M196 380 h40 M196 430 h40 M196 480 h40 M196 530 h40" stroke-width="4"/></g>
    <rect y="540" width="1200" height="60" fill="#E8C9A0"/><path d="M0 540 H1200" stroke="${INK}" stroke-width="5"/>
    <g stroke="#D4AF83" stroke-width="3">${Array.from({ length: 12 }, (_, i) => `<path d="M${i * 110} 540 V600"/>`).join('')}</g>
    <g stroke="${INK}" stroke-width="5"><ellipse cx="1060" cy="530" rx="80" ry="44" fill="#FF5C8A"/><ellipse cx="1150" cy="540" rx="60" ry="34" fill="#4C6FFF"/><ellipse cx="300" cy="540" rx="58" ry="32" fill="#19B37D"/></g>
    ${planta(1180, 520, 1.1, '#FFC23D')}${planta(130, 548, 0.9, '#8FA6FF')}
  </svg>`;
}

/** Noite de estreia: cortinas vermelhas, letreiro de lâmpadas, holofotes e tapete vermelho. */
function cenaCinema() {
  const lamp = Array.from({ length: 22 }, (_, i) => {
    const a = Math.PI + (i / 21) * Math.PI;
    return `<circle class="lampada" style="animation-delay:-${(i % 3) * 0.3}s" cx="${600 + 330 * Math.cos(a)}" cy="${250 + 150 * Math.sin(a)}" r="9" fill="#F5B800" stroke="${INK}" stroke-width="3"/>`;
  }).join('');
  const dobra = (x: number, w: number, lado: 1 | -1) =>
    Array.from({ length: 5 }, (_, i) => `<path d="M${x + lado * i * w} 0 q${lado * 10} 300 0 600 h${lado * w} q${lado * -10} -300 0 -600z" fill="${i % 2 ? '#A81B2E' : '#D7263D'}" stroke="${INK}" stroke-width="4"/>`).join('');
  return `<svg class="cenario" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
    <defs><radialGradient id="pk-luz" cx="0.5" cy="0" r="0.9"><stop offset="0" stop-color="#FFF3C4" stop-opacity=".55"/><stop offset="1" stop-color="#FFF3C4" stop-opacity="0"/></radialGradient></defs>
    <rect width="1200" height="600" fill="#121216"/>
    <path d="M600 250 m-330 0 a330 150 0 0 1 660 0" fill="#1F1F25" stroke="#F5B800" stroke-width="6"/>${lamp}
    <text x="600" y="190" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="900" font-size="54" fill="#F5F0E6">Em cartaz</text>
    <path d="M430 0 L260 600 L560 600Z" fill="url(#pk-luz)" class="holofote"/><path d="M770 0 L640 600 L940 600Z" fill="url(#pk-luz)" class="holofote h2"/>
    ${dobra(-40, 48, 1)}${dobra(1240, 48, -1)}
    <path d="M0 0 H1200 V46 Q600 80 0 46Z" fill="#A81B2E" stroke="${INK}" stroke-width="4"/>
    <path d="M440 560 L380 600 H820 L760 560Z" fill="#D7263D" stroke="${INK}" stroke-width="4"/>
    <rect y="556" width="1200" height="44" fill="#1A1A1E"/><path d="M380 600 L440 556 H760 L820 600Z" fill="#D7263D" stroke="${INK}" stroke-width="4"/>
    <g stroke="${INK}" stroke-width="4"><path d="M300 470 q50 30 100 0" fill="none" stroke="#F5B800" stroke-width="7"/><path d="M800 470 q50 30 100 0" fill="none" stroke="#F5B800" stroke-width="7"/>
      ${[300, 400, 800, 900].map((x) => `<rect x="${x - 7}" y="462" width="14" height="96" fill="#F5B800"/><circle cx="${x}" cy="458" r="12" fill="#F5B800"/>`).join('')}</g>
    <g class="flash"><circle cx="180" cy="420" r="16" fill="#fff" opacity=".9"/></g><g class="flash f2"><circle cx="1030" cy="400" r="16" fill="#fff" opacity=".9"/></g>
  </svg>`;
}

/** Sala de aula: lousa com "Parabéns, turma!" em giz, aviãozinho de papel e estrelas na parede. */
function cenaSala() {
  return `<svg class="cenario" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
    <rect width="1200" height="600" fill="#E9D3AE"/>
    <rect x="70" y="30" width="1060" height="300" rx="10" fill="#2E4A3A" stroke="#6B4A2E" stroke-width="16"/>
    <rect x="70" y="330" width="1060" height="14" fill="#8A6038" stroke="${INK}" stroke-width="3"/><rect x="180" y="322" width="44" height="8" rx="3" fill="#F2F2EA"/><rect x="250" y="324" width="30" height="7" rx="3" fill="#FFE066"/>
    <text x="600" y="150" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-style="italic" font-weight="900" font-size="72" fill="#F2F2EA" opacity=".92">Parabéns, turma!</text>
    <path class="giz" d="M370 180 Q600 214 830 176" stroke="#FFE066" stroke-width="5" fill="none" stroke-linecap="round" pathLength="100"/>
    <g fill="none" stroke="#F2F2EA" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".7"><path d="M150 90 l12 26 l28 4 l-20 20 l5 28 l-25 -13 l-25 13 l5 -28 l-20 -20 l28 -4z"/><path d="M960 240 q20 -24 40 0 t40 0 t40 0"/><path d="M180 250 h60 M210 220 v60"/><path d="M990 70 l60 40 M1050 70 l-60 40"/></g>
    <g class="aviao"><g transform="translate(0 70)"><path d="M0 0 L56 12 L0 24 L12 12Z" fill="#fff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M12 12 L56 12" stroke="${INK}" stroke-width="2.5"/></g></g>
    <rect y="540" width="1200" height="60" fill="#A07850"/><path d="M0 540 H1200" stroke="${INK}" stroke-width="5"/>
    <g stroke="#8A6038" stroke-width="3">${Array.from({ length: 10 }, (_, i) => `<path d="M${i * 130 + 40} 540 L${i * 130} 600"/>`).join('')}</g>
  </svg>`;
}

/** Espaço: céu de estrelas, a Terra girando, foguete decolando e o chão da Lua. */
function cenaLua() {
  return `<svg class="cenario" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
    <defs><clipPath id="pl-terra"><circle r="64"/></clipPath></defs>
    <rect width="1200" height="600" fill="#0B1033"/>
    <g fill="#fff">${Array.from({ length: 40 }, (_, i) => `<circle class="estrela-pisca" style="animation-delay:-${(i * 0.41) % 3}s" cx="${(i * 137) % 1180 + 10}" cy="${(i * 71) % 380 + 10}" r="${i % 3 ? 1.8 : 3}"/>`).join('')}</g>
    <g transform="translate(1010 120)"><circle r="64" fill="#1E7FD6" stroke="${INK}" stroke-width="5"/><g clip-path="url(#pl-terra)"><g class="terra"><path d="M-64 -16 q32 -32 64 -10 q16 28 -20 36 q-28 6 -44 -26Z M16 10 q28 -10 42 12 q-10 32 -36 26Z M-32 36 q22 6 16 22 q-20 4 -22 -16Z" fill="#13A07A"/></g></g><circle r="64" fill="none" stroke="${INK}" stroke-width="5"/></g>
    <g transform="translate(150 470)"><g class="foguete"><path d="M-22 34 Q-26 -12 0 -48 Q26 -12 22 34Z" fill="#F2F2EA" stroke="${INK}" stroke-width="5"/><circle cy="-6" r="10" fill="#5BC0EB" stroke="${INK}" stroke-width="4"/><path d="M-22 16 L-38 42 L-22 36Z M22 16 L38 42 L22 36Z" fill="#E5383B" stroke="${INK}" stroke-width="4"/><path class="chama" d="M-11 38 Q0 80 11 38Z" fill="#FFC83D" stroke="#FF7A1A" stroke-width="4"/></g></g>
    <g class="cometa"><path d="M900 40 l90 -40" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="900" cy="40" r="5" fill="#fff"/></g>
    <path d="M0 500 Q300 460 600 485 T1200 475 V600 H0Z" fill="#C7CED6" stroke="${INK}" stroke-width="5"/>
    <g fill="#A9B1BA" stroke="${INK}" stroke-width="3"><ellipse cx="110" cy="540" rx="44" ry="11"/><ellipse cx="980" cy="530" rx="58" ry="13"/><ellipse cx="1110" cy="570" rx="26" ry="7"/><ellipse cx="300" cy="575" rx="22" ry="6"/></g>
    <g transform="translate(860 470)"><path d="M0 0 V-110" stroke="#F2F2EA" stroke-width="5"/><path class="bandeira-lua" d="M3 -110 h56 v36 h-56Z" fill="#E5383B" stroke="${INK}" stroke-width="3"/>${'<path d="M31 -102 l3 6.5 7 1 -5 5 1.2 7 -6.2 -3.4 -6.2 3.4 1.2 -7 -5 -5 7 -1z" fill="#FFC83D"/>'}</g>
  </svg>`;
}

/** Amor: varal de corações, balões em forma de coração e chão cor-de-rosa. */
function cenaAmor() {
  const cor = (x: number, y: number, s: number, c: string) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 16 L-16 0 a9 9 0 0 1 16 -12 a9 9 0 0 1 16 12Z" fill="${c}" stroke="${INK}" stroke-width="${2.5 / s}" stroke-linejoin="round"/>`;
  const balao = (x: number, y: number, s: number, c: string, d: number) =>
    `<g transform="translate(${x} ${y})"><g class="balao-cor" style="animation-delay:-${d}s"><path d="M0 ${60 * s} Q-8 ${110 * s} 4 ${170 * s}" stroke="${INK}" stroke-width="3" fill="none"/>${cor(0, 0, 3.4 * s, c)}<path d="M-26 -20 q8 -12 20 -10" transform="scale(${s})" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" opacity=".6"/></g></g>`;
  let varal = '<path d="M-20 30 Q600 150 1220 30" stroke="#5A1027" stroke-width="4" fill="none"/>';
  for (let i = 0; i < 16; i++) {
    const x = 20 + i * 76;
    const t = (x + 20) / 1240;
    varal += cor(x, 30 + 240 * t * (1 - t) + 14, 1.3, ['#E5383B', '#FF8FB1', '#FFFFFF'][i % 3]);
  }
  return `<svg class="cenario" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
    <rect width="1200" height="600" fill="#FFE3EA"/>
    <g opacity=".35">${Array.from({ length: 18 }, (_, i) => cor((i * 173) % 1180 + 10, (i * 97) % 380 + 120, 0.8, '#FF8FB1')).join('')}</g>
    <g class="varal">${varal}</g>
    ${balao(140, 250, 1, '#E5383B', 0)}${balao(1060, 230, 0.85, '#FF8FB1', 1.4)}${balao(1150, 330, 0.6, '#E5383B', 0.7)}
    <rect y="540" width="1200" height="60" fill="#F7C1CF"/><path d="M0 540 H1200" stroke="#5A1027" stroke-width="5"/>
  </svg>`;
}

function cenario(cena: Cena): string {
  return { corp: cenaCorp, mata: cenaMata, ipe: cenaIpe, praia: cenaPraia, album: cenaAlbum, escritorio: cenaEscritorio, cinema: cenaCinema, sala: cenaSala, lua: cenaLua, amor: cenaAmor }[cena]();
}

/** Coisas caindo (ou voando) sem parar atrás dos degraus: vaga-lumes na mata, flores no ipê,
 *  estrelas e confete no álbum, serpentinas douradas no corporativo. A praia fica só com o vento. */
function chuva(cena: Cena): string {
  if (cena === 'praia' || cena === 'lua') return cena === 'lua' ? chuvaLua() : '';
  const CORES: Partial<Record<Cena, string[]>> = {
    corp: ['#c9a24a', '#e8d9a8', '#ffffff'],
    album: ['#2B59C3', '#FFC83D', '#E5383B', '#7B4FD6', '#13A07A'],
    escritorio: ['#4C6FFF', '#FF5C8A', '#FFC23D', '#19B37D', '#8FA6FF'],
    cinema: ['#F5B800', '#F5F0E6', '#D7263D'],
    sala: ['#FFE066', '#F2F2EA', '#FF8FB1', '#8FB2F2'],
    amor: ['#E5383B', '#FF8FB1', '#FFFFFF', '#B3262A'],
  };
  const cores = CORES[cena] || ['#FFC83D', '#FFB000', '#FFE08A'];
  const n = cena === 'corp' || cena === 'cinema' ? 26 : cena === 'mata' ? 22 : 36;
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
    const tipo =
      cena === 'corp' ? 'fita' : cena === 'ipe' ? 'flor' : cena === 'amor' ? (i % 3 ? 'coracao' : 'papel') : cena === 'cinema' ? (i % 3 ? 'fita' : 'estrela') : i % 4 === 0 ? 'estrela' : 'papel';
    out += `<i class="${tipo}" style="left:${left}%;animation-duration:${dur}s;animation-delay:${delay}s;--c:${cores[i % cores.length]}"></i>`;
  }
  return `<div class="chuva" aria-hidden="true">${out}</div>`;
}

/** Espaço: estrelas cadentes atravessando o céu, em vez de coisas caindo. */
function chuvaLua() {
  let out = '';
  for (let i = 0; i < 8; i++) out += `<i class="cadente" style="left:${20 + ((i * 41) % 80)}%;top:${(i * 17) % 40}%;animation-delay:-${(i * 1.3) % 6}s"></i>`;
  return `<div class="chuva" aria-hidden="true">${out}</div>`;
}

/** Comemoração de cada lugar quando o pódio está completo: o 1º gira com coroa, o 2º dá pulinhos e o 3º balança. */
const FESTA_POS = ['', 'giro', 'pulinho', 'balanca'];

/**
 * Pódio completo. `step` revela do 3º para o 1º (0 nenhum, 1 terceiro, 2 segundo, 3 suspense, 4 primeiro);
 * `novo` é a posição que acabou de aparecer, para animar só ela. `code` escolhe a cena (ver cenaDoPodio).
 */
export function palco(rows: RankRow[], tema: Theme, step = 4, novo: number | number[] = -1, code = '', visual: Visual = 'floresta'): string {
  const novos = Array.isArray(novo) ? novo : [novo];
  const cena = cenaDoPodio(tema, code, visual);
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
        ? `<div class="boneco${novos.includes(pos) ? ' novo' : ''}${pos === 1 ? ' campeao' : ''}">${coroa}<div class="festa${festa}"><span class="fig" style="--r:${giro[pos - 1]}">${comMoldura(avatarSvg(r.avatar, 160, false, { vivo: true }), pos === 1 && step >= 4 ? 'lider' : null)}</span></div></div>`
        : `<div class="boneco oculto${pos === 1 && step === 3 ? ' tremendo' : ''}"><span aria-hidden="true">?</span></div>`;
      const placa = show ? `<b>${esc(r.nick)}</b><small>${fmt(r.score)} pts</small>` : '<b class="vazio">&nbsp;</b><small class="vazio">&nbsp;</small>';
      return `<div class="degrau d${pos}">${quem}<div class="bloco"><div class="tampa"></div><div class="frente"><span class="num">${pos}</span>${placa}</div></div></div>`;
    })
    .join('');
  const leitura = rows
    .slice(0, 3)
    .map((r, i) => (visto(i + 1) ? `${i + 1}º lugar: ${r.nick}, ${fmt(r.score)} pontos` : ''))
    .filter(Boolean)
    .join('. ');
  const frente = cena === 'mata' ? folhasMata() : '';
  const SELO: Partial<Record<Cena, string>> = { album: 'Nota 10', sala: 'Nota 10', cinema: 'Estreia', escritorio: 'Top do mês', lua: 'Na Lua!', amor: 'Amor!' };
  const carimbo = SELO[cena] && step >= 4 ? `<div class="carimbo" aria-hidden="true">${SELO[cena]}</div>` : '';
  return `<div class="palco palco-${visual === 'floresta' ? tema : 'visual'} cena-${cena}${step >= 4 ? ' completo' : ''}" role="img" aria-label="${esc(leitura || 'Pódio ainda escondido')}">${cenario(cena)}${chuva(cena)}<div class="degraus">${degraus}</div>${frente}${carimbo}</div>`;
}
