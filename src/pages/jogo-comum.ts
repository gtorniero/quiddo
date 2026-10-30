// Pedaços de tela usados pelo anfitrião e pelo jogador.
import type { Acerto, BaseState, RankRow, Visual } from '../../shared/protocol';
import { PREP_MS } from '../../shared/game';
import { LETRAS, esc, fmt } from '../lib/dom';
import { avatarSvg, comMoldura } from '../lib/avatar-art';
import type { Moldura } from '../lib/avatar-art';
import { OLHO, simbolo } from '../lib/simbolos';
import { VISUAIS } from '../data/visuais';
import { contaVisual, cortinaVisual } from '../lib/visuais-arte';

export function brandBar(s: BaseState) {
  const logo = s.brand.logo ? `<img src="/api/salas/${s.code}/logo?v=${s.brand.logo}" alt="Logo de ${esc(s.brand.name || 'quem organiza')}">` : '';
  const name = s.brand.name ? `<b>${esc(s.brand.name)}</b>` : '';
  return logo || name ? `<div class="brand">${logo}${name}</div>` : '';
}

/** Ainda está no "Prepare-se"? `now` no relógio do servidor. */
export const preparando = (s: BaseState, now: number) => s.phase === 'question' && now < s.startsAt;

/** Olho do tucano grande da contagem do "Prepare-se": o anel amarelo esvazia em 3 s e o número fica na pupila. */
const OLHO_CONTA = `<div class="olho-conta" aria-hidden="true"><svg viewBox="0 0 300 300" focusable="false"><circle cx="150" cy="150" r="136" fill="#13A07A" stroke="#0E2A22" stroke-width="8"/><circle cx="150" cy="150" r="105" fill="none" stroke="#0E6B50" stroke-width="14"/><circle class="anel" id="anel" cx="150" cy="150" r="105" fill="none" stroke="#FFC83D" stroke-width="14" stroke-linecap="round" pathLength="100" stroke-dasharray="100 200" transform="rotate(-90 150 150)"/><circle cx="150" cy="150" r="88" fill="#5BC0EB" stroke="#0E2A22" stroke-width="7"/><circle cx="150" cy="150" r="62" fill="#fff" stroke="#0E2A22" stroke-width="4"/></svg><b class="prep-n" id="prep">4</b></div>`;

/** Selo "×2" que cai na tela antes da pergunta que vale o dobro. */
const CARIMBO_X2 = '<div class="x2" aria-hidden="true"><span>×2</span></div>';

/**
 * Tela do "Prepare-se": a pergunta aparece e o olho do tucano conta 3, 2, 1 antes das respostas.
 * Na última pergunta, "Última pergunta!" cai do alto e, na TV, os 3 primeiros aparecem nervosos (`top3`).
 */
export function prepare(s: BaseState, top3: RankRow[] = []) {
  const q = s.question!;
  const ultima = s.total > 1 && s.qIndex === s.total - 1;
  const tipo = q.tipo === 'quem' ? 'Quem é mais provável' : q.tipo === 'opiniao' ? 'Opinião: não tem resposta certa' : '';
  const titulo = ultima
    ? `<div class="ultima"><span>Última</span> <span>pergunta!</span></div>${q.dobro ? '<div class="dobro-selo pequeno">Vale o dobro. Tudo pode mudar.</div>' : '<p class="ultima-sub">Tudo pode mudar.</p>'}`
    : q.dobro
      ? `<div class="selo-linha">${CARIMBO_X2}<div class="dobro-selo">Essa vale o dobro!</div></div>`
      : tipo
        ? `<div class="tipo-selo">${tipo}</div>`
        : '';
  const v = s.visual || 'floresta';
  const conta = v === 'floresta' ? OLHO_CONTA : contaVisual(v);
  const nervosos = ultima && top3.length ? `<div class="nervosos" aria-hidden="true">${top3.map((r) => `<span class="nervoso">${avatarSvg(r.avatar, 72)}<small>${r.rank}º ${esc(r.nick)}</small></span>`).join('')}</div>` : '';
  return `<section class="stage center prep${q.dobro && !ultima ? ' treme-tela' : ''}${ultima ? ' final-clima' : ''}"><span class="pill">Pergunta ${s.qIndex + 1} de ${s.total}</span>${titulo}<div class="qt">${esc(q.t)}</div>${conta}<p class="prep-txt" role="status">${esc(VISUAIS[v].prep)}</p>${nervosos}</section>`;
}

/** Cabeçalho da pergunta com cronômetro e barra. Os ids são atualizados pelo relógio da página. */
export function questionHead(s: BaseState) {
  const q = s.question!;
  return `<div class="meta"><span class="pill">Pergunta ${s.qIndex + 1} de ${s.total}</span>${q.dobro ? '<span class="pill dobro">Vale o dobro</span>' : ''}${
    s.phase === 'question' ? `<span class="timer" aria-hidden="true">${OLHO}<b id="tempo">${q.tl}</b></span>` : ''
  }</div>${s.phase === 'question' ? '<div class="bar" aria-hidden="true"><i id="barra"></i></div>' : ''}<div class="qt">${esc(q.t)}</div>${
    q.img ? `<img class="qimg" src="/api/salas/${s.code}/img/${s.qIndex}?v=${q.img}" alt="Imagem da pergunta">` : ''
  }`;
}

/** Atualiza o cronômetro. `now` já no relógio do servidor. */
export function tick(s: BaseState | null, now: number) {
  if (!s || s.phase !== 'question' || !s.question) return;
  if (now < s.startsAt) {
    const falta = s.startsAt - now;
    const n = document.getElementById('prep');
    const vai = VISUAIS[s.visual || 'floresta'].vai;
    const v = falta < 350 ? vai : String(Math.max(1, Math.ceil(falta / 1000)));
    if (n && n.textContent !== v) {
      n.textContent = v;
      n.classList.toggle('bora', v === vai);
      n.animate?.([{ transform: 'scale(1.5)', opacity: 0.3 }, { transform: 'scale(1)', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.3,1.4,.5,1)' });
    }
    // o anel do olho esvazia no tempo do servidor, mesmo se a tela abriu no meio da contagem
    const anel = document.getElementById('anel');
    if (anel && !anel.dataset.ok) {
      anel.dataset.ok = '1';
      anel.style.animationDelay = `${-Math.max(0, PREP_MS - falta)}ms`;
      anel.classList.add('corre');
    }
    return;
  }
  const left = Math.max(0, s.endsAt - now);
  const t = document.getElementById('tempo');
  const b = document.getElementById('barra');
  if (t) t.textContent = String(Math.ceil(left / 1000));
  if (b) b.style.transform = `scaleX(${left / (s.question.tl * 1000)})`;
}

export function answersStatic(s: BaseState, mine: number | null = null) {
  const q = s.question!;
  if (q.tipo !== 'quiz') return opiniaoResultado(s, mine);
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
/** Resultado das perguntas de opinião: barras com quantos votaram em cada opção, sem certa nem errada. */
function opiniaoResultado(s: BaseState, mine: number | null) {
  const q = s.question!;
  const counts = s.counts;
  if (!counts) {
    // antes da revelação (TV durante a pergunta)
    if (q.tipo === 'quem') {
      const avs = q.oa || [];
      return `<div class="quem-sala" aria-hidden="true">${avs.slice(0, 40).map((a) => avatarSvg(a, 48)).join('')}${avs.length > 40 ? `<span>+${avs.length - 40}</span>` : ''}</div>`;
    }
    return `<div class="answers">${q.o.map((o, k) => `<div class="ans c${k}">${simbolo(k)}<span class="lt">${LETRAS[k]}</span><span>${esc(o)}</span><span></span></div>`).join('')}</div>`;
  }
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  let idx = q.o.map((_, k) => k);
  if (q.tipo === 'quem') idx = idx.filter((k) => counts[k] > 0).sort((a, b) => counts[b] - counts[a]).slice(0, 5);
  if (!idx.length) return '<p class="hint">Ninguém votou.</p>';
  return `<div class="votos">${idx
    .map((k, i) => {
      const pct = Math.round((counts[k] / total) * 100);
      const rosto = q.tipo === 'quem' && q.oa ? avatarSvg(q.oa[k], 44) : `<span class="lt c${k}">${LETRAS[k]}</span>`;
      return `<div class="voto${mine === k ? ' meu' : ''}${q.tipo === 'quem' && i === 0 ? ' top' : ''}" style="--p:${pct}%">${rosto}<span class="voto-txt">${esc(q.o[k])}${mine === k ? ' <small>(seu voto)</small>' : ''}</span><b>${counts[k]} ${counts[k] === 1 ? 'voto' : 'votos'} · ${pct}%</b></div>`;
    })
    .join('')}</div>`;
}

/** Sequência que já vale a moldura de fogo. */
export const FOGO = 3;

/** Moldura de conquista de uma linha do ranking: fogo (sequência) > raio (mais rápido da pergunta) > louros (1º lugar). */
export function molduraDe(r: RankRow, rapido = ''): Moldura | null {
  if (r.streak >= FOGO) return 'fogo';
  if (rapido && r.id === rapido) return 'rapido';
  if (r.rank === 1 && r.score > 0) return 'lider';
  return null;
}

const subiu = (r: RankRow) =>
  r.prevRank && r.prevRank > r.rank ? `<span class="up" aria-label="subiu ${r.prevRank - r.rank}">Subiu ${r.prevRank - r.rank}!</span>` : '';

export function rankList(rows: RankRow[], me = '', animate = false, rapido = '') {
  return `<div class="rank${animate ? ' anim' : ''}">${rows
    .map(
      (r) =>
        `<div class="${r.id === me ? 'me' : ''}" data-rank="${r.rank}" data-prev="${r.prevRank}"><i>${r.rank}</i><span class="who">${comMoldura(avatarSvg(r.avatar, 36), molduraDe(r, rapido))}${esc(r.nick)}${r.id === me ? ' (você)' : ''}${subiu(r)}</span><em>${r.delta ? `${MOEDA}+${fmt(r.delta)}` : ''}</em><b class="pts" data-from="${r.score - r.delta}" data-to="${r.score}">${fmt(r.score)}</b></div>`,
    )
    .join('')}</div>`;
}

/** Ranking da TV em forma de pista: cada bicho corre da pontuação antiga até a nova, rumo à bandeira. */
export function rankPista(rows: RankRow[], rapido = '') {
  const max = Math.max(1, ...rows.map((r) => r.score));
  const pct = (n: number) => `${Math.round((Math.max(0, n) / max) * 1000) / 10}%`;
  return `<div class="rank anim pista">${rows
    .map(
      (r) =>
        `<div data-rank="${r.rank}" data-prev="${r.prevRank}"><i>${r.rank}</i><span class="who">${esc(r.nick)}${subiu(r)}</span><span class="raia" aria-hidden="true"><span class="corredor" style="--de:${pct(r.score - r.delta)};--ate:${pct(r.score)}">${comMoldura(avatarSvg(r.avatar, 52), molduraDe(r, rapido))}</span><svg class="bandeira" viewBox="0 0 40 48" focusable="false"><path d="M4 46 V4" stroke="#0E2A22" stroke-width="5" stroke-linecap="round"/><path d="M6 4 h30 l-6 9 l6 9 h-30Z" fill="#FFC83D" stroke="#0E2A22" stroke-width="3" stroke-linejoin="round"/></svg></span><em>${r.delta ? `${MOEDA}+${fmt(r.delta)}` : ''}</em><b class="pts" data-from="${r.score - r.delta}" data-to="${r.score}">${fmt(r.score)}</b></div>`,
    )
    .join('')}</div>`;
}

/** Ranking da TV em colunas: as 5 primeiras crescem com a pontuação e a figurinha de cada um sobe junto. */
export function rankColunas(rows: RankRow[], rapido = '') {
  const top = rows.slice(0, 5);
  const max = Math.max(1, ...top.map((r) => r.score));
  const giro = ['-5deg', '5deg', '-4deg', '6deg', '-6deg'];
  return `<ol class="colunas" aria-label="Os primeiros do ranking">${top
    .map(
      (r, i) =>
        `<li style="--h:${Math.max(14, Math.round((r.score / max) * 100))}%;--i:${i}"><span class="col-fig fig" style="--r:${giro[i]}">${comMoldura(avatarSvg(r.avatar, 76), molduraDe(r, rapido))}</span><span class="col-barra r${r.rank}"><b>${fmt(r.score)}</b></span><span class="col-nome">${r.rank}º ${esc(r.nick)}</span></li>`,
    )
    .join('')}</ol>`;
}

/** Faixa "Fulano está pegando fogo": quem tem a maior sequência de acertos (a partir de 3). */
export function fogoFaixa(rows: RankRow[]) {
  const f = rows.filter((r) => r.streak >= FOGO).sort((a, b) => b.streak - a.streak || a.rank - b.rank)[0];
  if (!f) return '';
  return `<div class="fogo-faixa" role="status"><span class="fogo-av">${comMoldura(avatarSvg(f.avatar, 64), 'fogo')}</span><span><small>${esc(f.nick)} está</small><b>pegando fogo</b></span><span class="fogo-n"><b>${f.streak}</b><small>acertos seguidos</small></span></div>`;
}

/** Tempo de resposta em segundos, com vírgula. */
export const segundos = (ms: number) => (ms / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' s';

/** Depois da revelação, na TV: os bichos de quem acertou entram em fila e o mais rápido ganha o destaque. */
export function revelacaoTv(acertaram: Acerto[], total: number) {
  if (!total) return '<div class="acertos"><p class="small">Ninguém acertou essa. Bora para a próxima!</p></div>';
  const mostra = acertaram.slice(0, 10);
  const fila = `<div class="fila-acertos"><span class="tag">Acertaram</span><div class="fila">${mostra
    .map((a, i) => `<span class="fila-av" style="--i:${i}">${avatarSvg(a.avatar, 52)}</span>`)
    .join('')}${total > mostra.length ? `<span class="fila-mais" style="--i:${mostra.length}">+${total - mostra.length}</span>` : ''}</div></div>`;
  const r = acertaram[0];
  const rapido = r
    ? `<div class="rapido"><span class="rapido-av">${comMoldura(avatarSvg(r.avatar, 92), 'rapido')}</span><div class="rapido-txt"><span class="tag">Mais rápido no gatilho</span><b>${esc(r.nick)}</b><span class="relogio">${segundos(r.ms)}</span></div><ol class="rapido-top">${acertaram
        .slice(1, 3)
        .map((a, i) => `<li><b>${i + 2}º</b> ${esc(a.nick)} <span>${segundos(a.ms)}</span></li>`)
        .join('')}</ol></div>`
    : '';
  return `<div class="acertos">${fila}${rapido}</div>`;
}

/** Moldura na troca de pergunta, só nas bordas da tela (folhas na Floresta, o desenho do visual nos outros): o meio fica livre para a contagem. */
export function cortina(visual: Visual = 'floresta') {
  if (calmo()) return;
  document.querySelector('.cortina')?.remove();
  const c = document.createElement('div');
  c.className = 'cortina cortina-' + visual;
  c.setAttribute('aria-hidden', 'true');
  if (visual !== 'floresta') {
    c.innerHTML = cortinaVisual(visual);
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 1900);
    return;
  }
  c.innerHTML = `<svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" focusable="false"><g stroke="#0E2A22" stroke-width="6">
    <path d="M-80 640 C-110 380 60 120 340 50 C380 330 220 560 -80 640Z" fill="#13A07A"/><path d="M-60 620 C40 430 170 230 330 70" fill="none"/>
    <path d="M160 680 C90 420 260 150 560 90 C610 360 470 610 160 680Z" fill="#0F8A68"/><path d="M180 660 C280 480 400 300 550 110" fill="none"/>
    <path d="M440 700 C370 420 560 120 880 60 C930 340 780 620 440 700Z" fill="#13A07A"/><path d="M460 680 C560 500 700 280 870 80" fill="none"/>
    <path d="M700 660 C650 400 830 100 1100 20 C1150 300 1010 600 700 660Z" fill="#2E8B57"/>
    <path d="M40 -60 C200 30 290 170 270 290 C130 250 40 120 40 -60Z" fill="#2E8B57"/>
    <path d="M600 -80 C760 0 830 140 790 260 C650 220 580 80 600 -80Z" fill="#0F8A68"/>
    <path d="M820 330 C820 330 790 365 790 383 A30 30 0 0 0 850 383 C850 365 820 330 820 330Z" fill="#1E7FD6"/>
    <circle cx="380" cy="330" r="30" fill="#FF7A1A"/>
  </g><g stroke="#0E2A22" stroke-width="4" fill="#E5383B"><circle cx="620" cy="400" r="22"/><circle cx="645" cy="418" r="22"/><circle cx="636" cy="447" r="22"/><circle cx="604" cy="447" r="22"/><circle cx="595" cy="418" r="22"/></g><circle cx="620" cy="428" r="13" fill="#FFC83D" stroke="#0E2A22" stroke-width="4"/></svg>`;
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 1900);
}

/** Palmas para quem ficou fora do pódio: o bicho aplaude os três primeiros. */
export function aplaude(avatar: string) {
  return `<div class="aplaude" aria-hidden="true">${avatarSvg(avatar, 110, false, { vivo: true })}<span class="palmas"><i></i><i></i></span></div>`;
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

/** Topo do cartão de foto: logo do Quiddo, nome do evento e data. */
export function fotoCabeca(s: BaseState) {
  const data = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  const logo = s.brand.logo ? `<img class="foto-logo-marca" src="/api/salas/${s.code}/logo?v=${s.brand.logo}" alt="Logo de ${esc(s.brand.name || 'quem organiza')}">` : '';
  return `<div class="foto-topo"><span class="foto-quiddo"><img class="logo-cor" src="/marca/quiddo-cor.svg" alt="Quiddo" width="120" height="36"><img class="logo-mono" src="/marca/quiddo-mono.svg" alt="Quiddo" width="120" height="36"></span>${logo}<span class="foto-evento"><b>${esc(s.brand.name || 'Pódio da rodada')}</b><span>${data}</span></span></div>`;
}

/** Frase do suspense acima do pódio. */
export function podiumTitle(rows: RankRow[], step: number, visual: Visual = 'floresta') {
  if (!rows.length) return 'Fim do quiz';
  if (step >= 4) return esc(VISUAIS[visual].campeao).replace('{n}', () => esc(rows[0].nick));
  return ['Quem subiu no pódio?', 'Em 3º lugar…', 'Em 2º lugar…', 'E quem venceu foi…'][step];
}

/** Os 10 primeiros, para todo mundo, depois do pódio. As linhas entram uma a uma, do 1º ao 10º. */
export function top10(rows: RankRow[], me = '') {
  const dez = rows.slice(0, 10);
  if (!dez.length) return '';
  return `<section class="panel top10" aria-labelledby="h-top10"><h2 id="h-top10">Os 10 primeiros</h2><ol class="top10-lista">${dez
    .map(
      (r, i) =>
        `<li class="${r.id === me ? 'me ' : ''}${r.rank <= 3 ? 'r' + r.rank : ''}" style="--i:${i}"><i>${r.rank}º</i><span class="who">${comMoldura(avatarSvg(r.avatar, 40), r.rank === 1 ? 'lider' : null)}<b>${esc(r.nick)}${r.id === me ? ' (você)' : ''}</b></span><b class="pts">${fmt(r.score)}<small> pts</small></b></li>`,
    )
    .join('')}</ol></section>`;
}

/** Passos do suspense do pódio, em milissegundos desde o fim do jogo. */
export const PASSOS_PODIO = [0, 1800, 3800, 5800, 8200];

/** Confete em cima da tela, por ~3 s. */
export function confete(sobrio = false) {
  if (calmo()) return;
  const cores = sobrio ? ['#d9b45a', '#e8d9a8', '#ffffff', '#c7ced6'] : ['#13A07A', '#FF7A1A', '#FFC83D', '#E5383B', '#1E7FD6', '#7B4FD6'];
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
