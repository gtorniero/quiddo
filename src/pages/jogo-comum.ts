// Pedaços de tela usados pelo anfitrião e pelo jogador.
import type { BaseState, RankRow } from '../../shared/protocol';
import { LETRAS, esc, fmt } from '../lib/dom';

export function brandBar(s: BaseState) {
  const logo = s.brand.logo ? `<img src="/api/salas/${s.code}/logo?v=${s.brand.logo}" alt="Logo de ${esc(s.brand.name || 'quem organiza')}">` : '';
  const name = s.brand.name ? `<b>${esc(s.brand.name)}</b>` : '';
  return logo || name ? `<div class="brand">${logo}${name}</div>` : '';
}

/** Cabeçalho da pergunta com cronômetro e barra. Os ids são atualizados pelo relógio da página. */
export function questionHead(s: BaseState) {
  const q = s.question!;
  return `<div class="meta"><span>Pergunta ${s.qIndex + 1} de ${s.total}</span>${
    s.phase === 'question' ? `<span aria-hidden="true"><b id="tempo">${q.tl}</b> s</span>` : ''
  }</div>${s.phase === 'question' ? '<div class="bar" aria-hidden="true"><i id="barra"></i></div>' : ''}<div class="qt">${esc(q.t)}</div>`;
}

/** Atualiza o cronômetro. `now` já no relógio do servidor. */
export function tick(s: BaseState | null, now: number) {
  if (!s || s.phase !== 'question' || !s.question) return;
  const left = Math.max(0, s.endsAt - now);
  const t = document.getElementById('tempo');
  const b = document.getElementById('barra');
  if (t) t.textContent = String(Math.ceil(left / 1000));
  if (b) b.style.transform = `scaleX(${left / (s.question.tl * 1000)})`;
}

export function answersStatic(s: BaseState, mine: number | null = null) {
  const q = s.question!;
  const rev = s.correct != null;
  return `<div class="answers">${q.o
    .map((o, k) => {
      const cls = `ans c${k}` + (rev ? (k === s.correct ? ' ok' : ' dim') : '') + (mine === k && !rev ? ' mine' : '');
      const n = rev && s.counts ? `<span class="n" aria-label="${s.counts[k]} ${s.counts[k] === 1 ? 'pessoa' : 'pessoas'}">${s.counts[k]}</span>` : '<span></span>';
      return `<div class="${cls}"><span class="lt">${LETRAS[k]}</span><span>${esc(o)}${rev && k === s.correct ? '<span class="sr"> (resposta certa)</span>' : ''}</span>${n}</div>`;
    })
    .join('')}</div>`;
}

export function rankList(rows: RankRow[], me = '', animate = false) {
  return `<div class="rank${animate ? ' anim' : ''}">${rows
    .map(
      (r) =>
        `<div class="${r.id === me ? 'me' : ''}" data-rank="${r.rank}" data-prev="${r.prevRank}"><i>${r.rank}</i><span class="who">${esc(r.nick)}${r.id === me ? ' (você)' : ''}${
          r.prevRank && r.prevRank > r.rank ? `<span class="up" aria-label="subiu ${r.prevRank - r.rank}">▲${r.prevRank - r.rank}</span>` : ''
        }</span><em>${r.delta ? '+' + fmt(r.delta) : ''}</em><b>${fmt(r.score)}</b></div>`,
    )
    .join('')}</div>`;
}

/** Animação de subida no ranking: cada linha começa na posição antiga e desliza para a nova. */
export function animateRank(root: HTMLElement) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const rows = root.querySelectorAll<HTMLElement>('.rank.anim > div');
  if (!rows.length) return;
  const h = rows[0].offsetHeight + 8;
  rows.forEach((row) => {
    const prev = Number(row.dataset.prev);
    const rank = Number(row.dataset.rank);
    if (!prev || prev === rank) return;
    const shift = Math.max(-4, Math.min(4, prev - rank)) * h;
    row.animate([{ transform: `translateY(${shift}px)` }, { transform: 'translateY(0)' }], { duration: 900, easing: 'cubic-bezier(.2,.8,.2,1)', delay: 150, fill: 'backwards' });
  });
}

export function podium(rows: RankRow[]) {
  const order = [rows[1], rows[0], rows[2]];
  const cls = ['p2', 'p1', 'p3'];
  const pos = [2, 1, 3];
  return `<div class="podium">${order
    .map((r, i) => (r ? `<div class="${cls[i]}"><i>${pos[i]}º</i><b>${esc(r.nick)}</b><span>${fmt(r.score)} pts</span></div>` : '<div></div>'))
    .join('')}</div>`;
}

export const ERROS: Record<string, [string, string]> = {
  not_found: ['Sala não encontrada', 'Confira o código. A sala some 2 horas depois do fim do jogo.'],
  started: ['O quiz já começou', 'Esta sala não aceita gente nova no meio do jogo. Peça para o anfitrião abrir uma rodada nova.'],
  full: ['A sala está cheia', 'Esta sala chegou ao limite de jogadores.'],
  kicked: ['Você saiu da sala', 'O anfitrião tirou você desta rodada.'],
  closed: ['A sala foi encerrada', 'O anfitrião encerrou esta rodada. Valeu por jogar!'],
  bad_key: ['Esta sala foi aberta em outro aparelho', 'Só o aparelho que abriu a sala pode comandar o jogo.'],
  bad_nick: ['Apelido inválido', 'Escreva um apelido de até 18 letras.'],
};

export function errorScreen(code: string, action: string) {
  const [t, d] = ERROS[code] || ['Algo deu errado', 'Tente de novo em instantes.'];
  return `<section class="panel center"><h1>${esc(t)}</h1><p class="muted">${esc(d)}</p>${action}</section>`;
}
