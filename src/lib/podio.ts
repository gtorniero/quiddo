// Pódio do fim do jogo: cena em camadas (céu, fundo, árvores, chão), coisas caindo do céu sem parar,
// degraus de verdade com textura e os bichos de corpo inteiro em cima.
// Amigos & família e Escola são festivos; Corporativo é sóbrio (palco escuro, holofotes, dourado).
import type { RankRow, Theme } from '../../shared/protocol';
import { bichoCorpo } from './avatar-art';
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

function cenario(tema: Theme): string {
  if (tema === 'corp') {
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
  const escola = tema === 'escola';
  const ceu = escola ? ['#bcd4ff', '#eef4ff'] : ['#ffd59e', '#fff6e6'];
  const morro1 = escola ? '#7fb27a' : '#8fcf8a';
  const morro2 = escola ? '#5a9a5e' : '#5fb36a';
  const chao = escola ? '#4f8a4f' : '#3f9b55';
  const bandeiras = escola ? ['#2B59C3', '#FFC83D', '#ffffff', '#E5383B'] : ['#13A07A', '#FF7A1A', '#FFC83D', '#E5383B', '#1E7FD6'];
  return `<svg class="cenario" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
    <defs><linearGradient id="pf-ceu-${tema}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ceu[0]}"/><stop offset="1" stop-color="${ceu[1]}"/></linearGradient></defs>
    <rect width="1200" height="600" fill="url(#pf-ceu-${tema})"/>
    <g class="sol"><circle cx="980" cy="120" r="70" fill="#FFC83D" stroke="${INK}" stroke-width="5"/>
      ${Array.from({ length: 12 }, (_, i) => `<rect x="976" y="20" width="8" height="26" rx="4" fill="#FFC83D" stroke="${INK}" stroke-width="3" transform="rotate(${i * 30} 980 120)"/>`).join('')}</g>
    <g class="nuvens" fill="#fff" stroke="${INK}" stroke-width="4">
      <path d="M150 140 q10 -40 50 -30 q20 -30 60 -10 q40 -10 40 30 q20 20 -10 30 h-130 q-30 -5 -10 -20z"/>
      <path d="M600 90 q8 -30 40 -24 q16 -24 48 -8 q32 -8 32 24 q16 16 -8 24 h-104 q-24 -4 -8 -16z"/>
    </g>
    <path d="M0 400 Q200 300 420 380 T860 360 T1200 380 V600 H0Z" fill="${morro1}" stroke="${INK}" stroke-width="5"/>
    ${palmeira(90, 470, 1.15)}${arvore(250, 470, 1.0, '#FFC83D', '#E9A800')}${arvore(1080, 475, 1.1, escola ? '#7B4FD6' : '#B07CD8', escola ? '#5A33B0' : '#8A55B8')}${palmeira(1170, 480, 0.95)}${arvore(930, 470, 0.8, '#5FB36A', '#3E8E41')}
    <path d="M0 470 Q300 420 600 460 T1200 450 V600 H0Z" fill="${morro2}" stroke="${INK}" stroke-width="5"/>
    <rect y="540" width="1200" height="60" fill="${chao}"/>
    <g fill="#2e7d32">${Array.from({ length: 30 }, (_, i) => `<path d="M${i * 41 + 8} 548 l5 -14 l5 14z"/>`).join('')}</g>
    ${bandeirinhas(18, bandeiras)}
  </svg>`;
}

/** Coisas caindo do céu sem parar: confete e folhas na festa, estrelas e confete na escola, serpentinas douradas no corporativo. */
function chuva(tema: Theme): string {
  const corp = tema === 'corp';
  const cores = corp ? ['#c9a24a', '#e8d9a8', '#ffffff'] : tema === 'escola' ? ['#2B59C3', '#FFC83D', '#E5383B', '#7B4FD6', '#13A07A'] : ['#13A07A', '#FF7A1A', '#FFC83D', '#E5383B', '#1E7FD6', '#FF5C8A'];
  const n = corp ? 26 : 44;
  let out = '';
  for (let i = 0; i < n; i++) {
    // posições e tempos fixos por índice: a cena fica igual em todas as telas e não "pula" ao redesenhar
    const left = (i * 37) % 100;
    const dur = 5 + ((i * 7) % 6);
    const delay = -((i * 13) % 11);
    const tipo = corp ? 'fita' : tema === 'escola' && i % 4 === 0 ? 'estrela' : i % 5 === 0 ? 'folha' : 'papel';
    out += `<i class="${tipo}" style="left:${left}%;animation-duration:${dur}s;animation-delay:${delay}s;--c:${cores[i % cores.length]}"></i>`;
  }
  return `<div class="chuva" aria-hidden="true">${out}</div>`;
}

/**
 * Pódio completo. `step` revela do 3º para o 1º (0 nenhum, 1 terceiro, 2 segundo, 3 suspense, 4 primeiro);
 * `novo` é a posição que acabou de aparecer, para animar só ela.
 */
export function palco(rows: RankRow[], tema: Theme, step = 4, novo = -1): string {
  const ordem: [RankRow | undefined, number][] = [
    [rows[1], 2],
    [rows[0], 1],
    [rows[2], 3],
  ];
  const visto = (pos: number) => (pos === 3 ? step >= 1 : pos === 2 ? step >= 2 : step >= 4);
  const degraus = ordem
    .map(([r, pos]) => {
      if (!r) return `<div class="degrau d${pos} vazio"></div>`;
      const show = visto(pos);
      const quem = show
        ? `<div class="boneco${pos === novo ? ' novo' : ''}${pos === 1 ? ' campeao' : ''}">${bichoCorpo(r.avatar, pos === 1)}</div>`
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
  return `<div class="palco palco-${tema}" role="img" aria-label="${esc(leitura || 'Pódio ainda escondido')}">${cenario(tema)}${chuva(tema)}<div class="degraus">${degraus}</div></div>`;
}
