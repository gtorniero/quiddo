// /{CODIGO}: entrada e tela do jogador, no celular.
import type { Page } from '../main';
import type { PlayerState, ServerMsg } from '../../shared/protocol';
import { LIMITS, cleanNick } from '../../shared/rules';
import { LETRAS, esc, fmt, patch } from '../lib/dom';
import { banner } from '../lib/layout';
import { navigate } from '../lib/nav';
import { RoomSocket } from '../lib/socket';
import { store, uid } from '../lib/storage';
import { applyTheme } from '../lib/theme';
import { answersStatic, brandBar, errorScreen, podium, questionHead, rankList, tick } from './jogo-comum';

interface Seat {
  pid: string;
  nick: string;
}

export function page(code: string): Page {
  return { title: `Sala ${code}`, compact: true, mount: (main) => mount(main, code) };
}

function mount(main: HTMLElement, code: string) {
  let seat = store.get<Seat | null>('jog:' + code, null);
  let sock: RoomSocket | null = null;
  let s: PlayerState | null = null;
  let sending: number | null = null; // resposta tocada, esperando o servidor confirmar
  let revealDrawAt = 0; // o sorteio aparece no celular depois da roleta da TV
  let drawTimer = 0;
  let clock = 0;

  const sair = () => {
    store.del('jog:' + code);
    navigate('/');
  };

  function form(err = '') {
    main.innerHTML = `<section class="panel"><div class="tag">Sala ${code}</div><h1>Qual é o seu apelido?</h1>
      <form id="fj" novalidate style="display:grid;gap:12px">
        <label for="nick">Seu apelido<input type="text" id="nick" maxlength="${LIMITS.nick}" value="${esc(store.get('nick', ''))}" autocomplete="nickname" placeholder="Como vai aparecer no ranking" aria-describedby="nick-err"></label>
        <button class="btn" type="submit">Entrar na sala</button>
      </form><p class="err" id="nick-err" role="alert">${esc(err)}</p>
      <p class="small">Sem cadastro. Seu apelido só aparece nesta rodada.</p></section>`;
    main.querySelector<HTMLInputElement>('#nick')!.focus();
  }

  function connect() {
    main.innerHTML = `<section class="panel center"><p class="muted dots">Entrando na sala ${code}</p></section>`;
    const me = seat!;
    sock = new RoomSocket({
      code,
      hello: () => ({ type: 'join', nick: me.nick, playerId: me.pid }),
      onStatus: (on) => banner(on ? '' : 'A conexão caiu, reconectando…'),
      onMessage,
    });
    clock = window.setInterval(() => sock && tick(s, sock.now()), 100);
  }

  function onMessage(m: ServerMsg) {
    if (m.type === 'error' || m.type === 'kicked' || m.type === 'closed') {
      const c = m.type === 'error' ? m.code : m.type;
      banner('');
      if (c === 'bad_nick') return form('Escreva um apelido para aparecer no ranking.');
      if (c !== 'not_found') store.del('jog:' + code);
      main.innerHTML = errorScreen(c, '<a class="btn auto" href="/entrar" data-link>Entrar em outra sala</a>');
      return;
    }
    if (m.type !== 'state' || m.role !== 'player') return;
    const prev = s;
    s = m;
    applyTheme(s.theme, s.brand.color);
    if (s.me.choice != null || s.phase !== 'question') sending = null;
    if (s.phase === 'final' && s.drawn.length && (!prev || prev.drawn.length < s.drawn.length)) {
      // espera a roleta da TV (~1,5 s) para não estragar a surpresa
      revealDrawAt = prev && prev.phase === 'final' ? Date.now() + 1600 : 0;
      clearTimeout(drawTimer);
      drawTimer = window.setTimeout(render, Math.max(0, revealDrawAt - Date.now()));
    }
    render();
    if (!prev || prev.phase !== s.phase || prev.qIndex !== s.qIndex) {
      window.scrollTo(0, 0);
      if (s.phase === 'question') main.querySelector<HTMLElement>('button.ans')?.focus({ preventScroll: true });
    }
  }

  function render() {
    if (!s) return;
    const screens = { lobby, question, reveal, ranking, final };
    patch(main, brandBar(s) + screens[s.phase](s) + `<p class="center small" style="display:grid"><button class="linkbtn" data-act="sair">Sair da sala</button></p>`);
    if (sock) tick(s, sock.now());
  }

  // ---------- telas ----------

  function lobby(s: PlayerState) {
    return `<section class="stage center"><div class="tag">Você está na sala ${code}</div><div class="big">${esc(s.me.nick)}</div>
      <p class="muted">Prontinho! Olhe para a tela: o quiz já vai começar.</p><p class="small">${s.playerCount} ${s.playerCount === 1 ? 'pessoa' : 'pessoas'} na sala</p></section>`;
  }

  function question(s: PlayerState) {
    const chosen = s.me.choice ?? sending;
    const q = s.question!;
    const buttons = q.o
      .map(
        (o, k) =>
          `<button class="ans c${k}${chosen != null && chosen !== k ? ' dim' : ''}${chosen === k ? ' mine' : ''}" data-act="ans" data-v="${k}" data-focus="a${k}"${chosen != null ? ' disabled' : ''}${
            chosen === k ? ' aria-pressed="true"' : ''
          }><span class="lt">${LETRAS[k]}</span><span>${esc(o)}</span><span></span></button>`,
      )
      .join('');
    return `<section class="stage">${questionHead(s)}<div class="answers" role="group" aria-label="Respostas">${buttons}</div>
      <p class="hint" role="status">${chosen != null ? (s.me.choice != null ? 'Resposta enviada. Espere a revelação.' : 'Enviando…') : s.scoring === 'fixed' ? 'Toque na sua resposta. Sem pressa: acertou, ganhou 1.000.' : 'Toque na sua resposta. Quanto mais rápido, mais pontos.'}</p></section>`;
  }

  function reveal(s: PlayerState) {
    const answered = s.me.choice != null;
    const ok = answered && s.me.choice === s.correct;
    return `<section class="stage">${questionHead(s)}<div class="verdict ${ok ? 'ok' : 'no'}" role="status">${answered ? (ok ? `Acertou! +${fmt(s.me.delta)}` : 'Errou') : 'Não respondeu'}</div>
      ${answersStatic(s, s.me.choice)}
      <p class="hint" style="font-size:19px">Você está em <b>${s.me.rank}º</b> de ${s.playerCount}, com ${fmt(s.me.score)} pontos.</p></section>`;
  }

  function ranking(s: PlayerState) {
    return `<section class="stage center"><div class="tag">Ranking</div><div class="big">${s.me.rank}º</div><p class="muted">de ${s.playerCount} · ${fmt(s.me.score)} pontos${s.me.delta ? ` · +${fmt(s.me.delta)} nesta rodada` : ''}</p></section>
      <section class="panel"><div class="tag">Os primeiros</div>${rankList(s.ranking, s.me.id)}</section>`;
  }

  function final(s: PlayerState) {
    const showDraw = s.drawn.length && Date.now() >= revealDrawAt;
    const last = showDraw ? s.drawn[s.drawn.length - 1] : null;
    const euSorteado = s.drawn.some((d) => d.id === s.me.id) && (last?.id !== s.me.id || showDraw);
    return `<section class="stage center"><div class="tag">Fim do quiz</div><div class="big">${s.me.rank}º lugar</div><p class="muted">${fmt(s.me.score)} pontos</p>${s.podium.length ? podium(s.podium) : ''}</section>
      ${
        last
          ? `<section class="stage center" role="status"><div class="tag">Sorteio de prêmios</div><div class="sorteio">${last.id === s.me.id ? 'Você foi sorteado!' : esc(last.nick)}</div>${
              last.id === s.me.id ? '<p class="muted">Procure o anfitrião para pegar o prêmio.</p>' : `<p class="muted">${euSorteado ? 'Você já foi sorteado antes nesta rodada.' : 'Ganhou o prêmio desta vez.'}</p>`
            }</section>`
          : ''
      }`;
  }

  // ---------- ações ----------

  const onSubmit = (e: Event) => {
    if ((e.target as HTMLElement).id !== 'fj') return;
    e.preventDefault();
    const nick = cleanNick(main.querySelector<HTMLInputElement>('#nick')!.value);
    if (!nick) return form('Escreva seu apelido para aparecer no ranking.');
    store.set('nick', nick);
    seat = { pid: uid(), nick };
    store.set('jog:' + code, seat);
    connect();
  };

  const onClick = (e: Event) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-act]');
    if (!b || b.disabled) return;
    if (b.dataset.act === 'sair') {
      if (confirm('Sair da sala? Você perde a vaga nesta rodada.')) sair();
      return;
    }
    if (b.dataset.act === 'ans' && s && s.phase === 'question' && s.me.choice == null && sending == null && sock) {
      sending = Number(b.dataset.v);
      sock.send({ type: 'answer', qIndex: s.qIndex, choice: sending });
      if (navigator.vibrate) navigator.vibrate(30);
      render();
    }
  };

  main.addEventListener('submit', onSubmit);
  main.addEventListener('click', onClick);
  if (seat) connect();
  else form();

  return () => {
    if (sock) sock.stop();
    clearInterval(clock);
    clearTimeout(drawTimer);
    main.removeEventListener('submit', onSubmit);
    main.removeEventListener('click', onClick);
  };
}
