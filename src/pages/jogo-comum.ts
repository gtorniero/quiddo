// Pedaços de tela usados pelo anfitrião e pelo jogador.
import type { BaseState, RankRow } from '../../shared/protocol';
import { LETRAS, esc, fmt } from '../lib/dom';
import { avatarSvg } from '../lib/avatar-art';
import { OLHO, simbolo } from '../lib/simbolos';

export function brandBar(s: BaseState) {
  const logo = s.brand.logo ? `<img src="/api/salas/${s.code}/logo?v=${s.brand.logo}" alt="Logo de ${esc(s.brand.name || 'quem organiza')}">` : '';
  const name = s.brand.name ? `<b>${esc(s.brand.name)}</b>` : '';
  return logo || name ? `<div class="brand">${logo}${name}</div>` : '';
}

/** Cabeçalho da pergunta com cronômetro e barra. Os ids são atualizados pelo relógio da página. */
export function questionHead(s: BaseState) {
  const q = s.question!;
  return `<div class="meta"><span class="pill">Pergunta ${s.qIndex + 1} de ${s.total}</span>${
    s.phase === 'question' ? `<span class="timer" aria-hidden="true">${OLHO}<b id="tempo">${q.tl}</b></span>` : ''
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
      return `<div class="${cls}">${simbolo(k)}<span class="lt">${LETRAS[k]}</span><span>${esc(o)}${rev && k === s.correct ? '<span class="sr"> (resposta certa)</span>' : ''}</span>${n}</div>`;
    })
    .join('')}</div>`;
}

/** Moedinha dos pontos. Decorativa. */
export const MOEDA =
  '<svg class="moeda" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10" fill="#FFC83D" stroke="#0E2A22" stroke-width="2.5"/><circle cx="12" cy="12" r="5.6" fill="none" stroke="#C98B00" stroke-width="2"/></svg>';

const calmo = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Ranking. Mostra sempre os valores finais; animateRank() faz a contagem e a subida em cima deles. */
export function rankList(rows: RankRow[], me = '', animate = false) {
  return `<div class="rank${animate ? ' anim' : ''}">${rows
    .map(
      (r) =>
        `<div class="${r.id === me ? 'me' : ''}" data-rank="${r.rank}" data-prev="${r.prevRank}"><i>${r.rank}</i><span class="who">${avatarSvg(r.avatar, 36)}${esc(r.nick)}${r.id === me ? ' (você)' : ''}${
          r.prevRank && r.prevRank > r.rank ? `<span class="up" aria-label="subiu ${r.prevRank - r.rank}">▲${r.prevRank - r.rank}</span>` : ''
        }</span><em>${r.delta ? `${MOEDA}+${fmt(r.delta)}` : ''}</em><b class="pts" data-from="${r.score - r.delta}" data-to="${r.score}">${fmt(r.score)}</b></div>`,
    )
    .join('')}</div>`;
}

/** Conta de `from` até `to` no texto do elemento. */
export function countUp(el: HTMLElement, from: number, to: number, delay = 0, dur = 1100) {
  if (calmo() || from === to) return;
  el.textContent = fmt(from);
  const t0 = performance.now() + delay;
  const step = (t: number) => {
    const k = Math.min(1, Math.max(0, (t - t0) / dur));
    el.textContent = fmt(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
    if (k < 1 && el.isConnected) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Moedinhas voando de um elemento para outro (dos "+pontos" para o placar). */
export function coins(from: Element, to: Element, n = 6, delay = 150) {
  if (calmo()) return;
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  for (let i = 0; i < n; i++) {
    const c = document.createElement('span');
    c.className = 'moeda-voa';
    c.innerHTML = MOEDA;
    c.style.left = a.left + a.width / 2 - 11 + 'px';
    c.style.top = a.top + a.height / 2 - 11 + 'px';
    document.body.appendChild(c);
    const arc = -30 - Math.random() * 30;
    const anim = c.animate(
      [
        { transform: 'translate(0,0) scale(.5)', opacity: 0 },
        { transform: `translate(${dx * 0.35}px, ${arc}px) scale(1.1)`, opacity: 1, offset: 0.35 },
        { transform: `translate(${dx}px, ${dy}px) scale(.7)`, opacity: 1 },
      ],
      { duration: 650, delay: delay + i * 110, easing: 'ease-in', fill: 'both' },
    );
    anim.onfinish = () => {
      c.remove();
      (to as HTMLElement).animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 160 });
    };
  }
}

/** Animação do ranking a cada pergunta: as moedinhas entram, o placar sobe e depois cada linha desliza para a posição nova. */
export function animateRank(root: HTMLElement) {
  if (calmo()) return;
  const rows = Array.from(root.querySelectorAll<HTMLElement>('.rank.anim > div'));
  if (!rows.length) return;
  const h = rows[0].offsetHeight + 8;
  const HOLD = 1500; // tempo das moedinhas antes de trocar as posições
  rows.forEach((row) => {
    const prev = Number(row.dataset.prev);
    const rank = Number(row.dataset.rank);
    if (prev && prev !== rank) {
      const shift = Math.max(-4, Math.min(4, prev - rank)) * h;
      row.animate([{ transform: `translateY(${shift}px)` }, { transform: 'translateY(0)' }], { duration: 900, easing: 'cubic-bezier(.2,.8,.2,1)', delay: HOLD, fill: 'backwards' });
    }
    const up = row.querySelector('.up');
    if (up) up.animate([{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 350, delay: HOLD + 700, fill: 'backwards' });
  });
  // mede depois de posicionar as linhas no lugar antigo
  rows.forEach((row, i) => {
    const b = row.querySelector<HTMLElement>('.pts');
    const em = row.querySelector<HTMLElement>('em');
    if (!b || !em) return;
    const from = Number(b.dataset.from);
    const to = Number(b.dataset.to);
    if (to <= from) return;
    const d = 100 + Math.min(i, 8) * 60;
    countUp(b, from, to, d + 250, 1000);
    coins(em, b, 5, d);
  });
}

/** Pódio. `step` revela do 3º para o 1º: 0 nenhum, 1 terceiro, 2 segundo, 3 suspense, 4 primeiro. */
export function podium(rows: RankRow[], step = 4, novo = -1) {
  const order = [rows[1], rows[0], rows[2]];
  const cls = ['p2', 'p1', 'p3'];
  const pos = [2, 1, 3];
  const shown = (place: number) => (place === 3 ? step >= 1 : place === 2 ? step >= 2 : step >= 4);
  return `<div class="podium">${order
    .map((r, i) => {
      if (!r) return '<div class="vazio"></div>';
      const place = pos[i];
      if (!shown(place)) return `<div class="${cls[i]} oculto${place === 1 && step === 3 ? ' tremendo' : ''}"><span class="q" aria-hidden="true">?</span><i>${place}º</i></div>`;
      return `<div class="${cls[i]}${place === novo ? ' novo' : ''}">${avatarSvg(r.avatar, i === 1 ? 96 : 72)}<i>${place}º</i><b>${esc(r.nick)}</b><span>${fmt(r.score)} pts</span></div>`;
    })
    .join('')}</div>`;
}

/** Topo do cartão de foto: logo do Quiddo, nome do evento e data. */
export function fotoCabeca(s: BaseState) {
  const data = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  const logo = s.brand.logo ? `<img class="foto-logo-marca" src="/api/salas/${s.code}/logo?v=${s.brand.logo}" alt="Logo de ${esc(s.brand.name || 'quem organiza')}">` : '';
  return `<div class="foto-topo"><span class="foto-quiddo"><img class="logo-cor" src="/marca/quiddo-cor.svg" alt="Quiddo" width="120" height="36"><img class="logo-mono" src="/marca/quiddo-mono.svg" alt="Quiddo" width="120" height="36"></span>${logo}<span class="foto-evento"><b>${esc(s.brand.name || 'Pódio da rodada')}</b><span>${data}</span></span></div>`;
}

/** Frase do suspense acima do pódio. */
export function podiumTitle(rows: RankRow[], step: number) {
  if (!rows.length) return 'Fim do quiz';
  if (step >= 4) return `${esc(rows[0].nick)} venceu!`;
  return ['Quem subiu no pódio?', 'Em 3º lugar…', 'Em 2º lugar…', 'E quem venceu foi…'][step];
}

/** Passos do suspense do pódio, em milissegundos desde o fim do jogo. */
export const PASSOS_PODIO = [0, 1800, 3800, 5800, 8200];

/** Confete em cima da tela, por ~3 s. */
export function confete() {
  if (calmo()) return;
  const cores = ['#13A07A', '#FF7A1A', '#FFC83D', '#E5383B', '#1E7FD6', '#7B4FD6'];
  const box = document.createElement('div');
  box.className = 'confete';
  box.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = cores[i % cores.length];
    p.style.animationDelay = Math.random() * 0.8 + 's';
    p.style.animationDuration = 2.2 + Math.random() * 1.6 + 's';
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 4800);
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
