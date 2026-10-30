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
import { palco } from '../lib/podio';
import { BICHOS, CABECA, CORES_N, ROSTO, avatarName, encodeAvatar, parseAvatar, randomAvatar, startAvatar } from '../../shared/avatar';
import type { Avatar, Bicho, ItemCabeca, ItemRosto } from '../../shared/avatar';
import { CORES_AVATAR, avatarSvg, comMoldura } from '../lib/avatar-art';
import { simbolo } from '../lib/simbolos';
import { FOGO, MOEDA, PASSOS_PODIO, answersStatic, aplaude, prepare, preparando, brandBar, coins, confete, countUp, errorScreen, podiumTitle, questionHead, rankList, tick } from './jogo-comum';

interface Seat {
  pid: string;
  nick: string;
  avatar?: string;
}

/** Nome sugerido que cabe no apelido: "Capivara de Boné" ou só "Capivara". */
function sugestao(v: Avatar) {
  const n = avatarName(v);
  return n.length <= LIMITS.nick ? n : BICHOS[v.a];
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
  let passo = 4; // suspense do pódio, no mesmo ritmo da TV
  let passoTimers: number[] = [];
  let lastHtml = '';
  let prepTimer = 0;
  let av: Avatar = parseAvatar(store.get('avatar', '')) || startAvatar();
  let sugerido = ''; // o apelido que o site sugeriu; se a pessoa não mexeu, ele acompanha o visual

  const sair = () => {
    store.del('jog:' + code);
    navigate('/');
  };

  function picker() {
    const btn = (k: string, v: string | number, on: boolean, inner: string, label: string) =>
      `<button type="button" data-act="av" data-k="${k}" data-v="${v}" data-focus="av-${k}-${v}" aria-pressed="${on}" aria-label="${esc(label)}">${inner}</button>`;
    const bichos = (Object.keys(BICHOS) as Bicho[])
      .map((a) => btn('a', a, av.a === a, avatarSvg({ a, h: null, f: null, c: av.c }, 48), BICHOS[a]))
      .join('');
    const cab = [btn('h', '-', !av.h, 'Nada', 'Nada na cabeça')]
      .concat((Object.keys(CABECA) as ItemCabeca[]).map((h) => btn('h', h, av.h === h, esc(CABECA[h]), CABECA[h])))
      .join('');
    const ros = [btn('f', '-', !av.f, 'Nada', 'Nada no rosto')]
      .concat((Object.keys(ROSTO) as ItemRosto[]).map((f) => btn('f', f, av.f === f, esc(ROSTO[f]), ROSTO[f])))
      .join('');
    const cores = Array.from({ length: CORES_N }, (_, c) => btn('c', c, av.c === c, `<i style="background:${CORES_AVATAR[c]}"></i>`, `Fundo ${c + 1}`)).join('');
    return `<fieldset class="avset"><legend>Escolha o bicho</legend><div class="avgrid">${bichos}</div></fieldset>
      <fieldset class="avset"><legend>Na cabeça</legend><div class="chips">${cab}</div></fieldset>
      <fieldset class="avset"><legend>No rosto</legend><div class="chips">${ros}</div></fieldset>
      <fieldset class="avset"><legend>Cor de fundo</legend><div class="avcores">${cores}</div></fieldset>`;
  }

  /** Atualiza o personagem e, se a pessoa não escreveu outro apelido, a sugestão de nome. */
  /** Bicho escolhido, grande, com o botão de sortear. */
  const previa = () => `${avatarSvg(av, 120, true)}<button type="button" class="btn sec auto" data-act="sortear" data-focus="sortear">Sortear</button>`;

  function setAv(next: Avatar) {
    av = next;
    const box = main.querySelector<HTMLElement>('#avp');
    if (box) patch(box, picker());
    const pv = main.querySelector<HTMLElement>('#avprev');
    if (pv) patch(pv, previa());
    const nick = main.querySelector<HTMLInputElement>('#nick');
    if (nick && (!nick.value.trim() || nick.value === sugerido)) {
      sugerido = sugestao(av);
      nick.value = sugerido;
    }
  }

  function form(err = '') {
    const saved = store.get('nick', '');
    sugerido = saved ? '' : sugestao(av);
    main.innerHTML = `<section class="panel"><div class="tag">Sala ${code}</div><h1>Quem é você hoje?</h1>
      <form id="fj" novalidate style="display:grid;gap:14px">
        <div id="avprev" class="avprev">${previa()}</div>
        <label for="nick">Seu apelido<input type="text" id="nick" maxlength="${LIMITS.nick}" value="${esc(saved || sugerido)}" autocomplete="nickname" placeholder="Como vai aparecer no ranking" aria-describedby="nick-err"></label>
        <p class="err" id="nick-err" role="alert">${esc(err)}</p>
        <button class="btn" type="submit">Entrar na sala</button>
        <h2 class="personalizar">Quer mudar o seu bicho?</h2>
        <div id="avp" class="avpick">${picker()}</div>
        <button class="btn sec" type="submit">Entrar na sala</button>
      </form>
      <p class="small">Sem cadastro. Seu bicho e seu apelido só aparecem nesta rodada.</p></section>`;
    if (err) main.querySelector<HTMLInputElement>('#nick')!.focus();
  }

  function connect() {
    main.innerHTML = `<section class="panel center"><p class="muted dots">Entrando na sala ${code}</p></section>`;
    const me = seat!;
    sock = new RoomSocket({
      code,
      hello: () => ({ type: 'join', nick: me.nick, playerId: me.pid, avatar: me.avatar }),
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
    if (s.phase === 'final' && prev && prev.phase !== 'final') suspense();
    if (s.phase !== 'final') pararSuspense();
    // as respostas aparecem quando o "Prepare-se" acaba
    clearTimeout(prepTimer);
    if (sock && preparando(s, sock.now())) prepTimer = window.setTimeout(() => {
      render();
      main.querySelector<HTMLElement>('button.ans, .quem-grid button')?.focus({ preventScroll: true });
    }, s.startsAt - sock.now() + 30);
    render();
    if (!prev || prev.phase !== s.phase || prev.qIndex !== s.qIndex) {
      window.scrollTo(0, 0);
      if (s.phase === 'question') main.querySelector<HTMLElement>('button.ans')?.focus({ preventScroll: true });
      if (prev) festejar(s.phase);
    }
  }

  /** Moedinhas: no acerto, saem do "Mandou bem!"; no ranking, voam para o placar enquanto ele sobe. */
  function festejar(phase: string) {
    if (!s || !s.me.delta) return;
    if (phase === 'reveal') {
      const v = main.querySelector('.verdict');
      const alvo = main.querySelector('.hint b');
      if (v && alvo) coins(v, alvo, 6, 300);
    }
    if (phase === 'ranking') {
      const ganho = main.querySelector('.ganho');
      const pts = main.querySelector<HTMLElement>('.meus-pts');
      if (ganho && pts) {
        countUp(pts, s.me.score - s.me.delta, s.me.score, 450, 1000);
        coins(ganho, pts, 6, 200);
      }
    }
  }

  function suspense() {
    pararSuspense();
    passo = 0;
    PASSOS_PODIO.forEach((ms, i) => {
      if (!i) return;
      passoTimers.push(
        window.setTimeout(() => {
          passo = i;
          render();
          if (i === 4 && s && s.me.rank <= 3) confete(s.theme === 'corp');
        }, ms),
      );
    });
  }

  function pararSuspense() {
    passoTimers.forEach(clearTimeout);
    passoTimers = [];
    passo = 4;
  }

  function render() {
    if (!s) return;
    const screens = { lobby, question, reveal, ranking, final };
    const html = brandBar(s) + screens[s.phase](s) + `<p class="center small" style="display:grid"><button class="linkbtn" data-act="sair">Sair da sala</button></p>`;
    // não redesenha se nada mudou: preserva as animações
    if (html !== lastHtml) {
      lastHtml = html;
      patch(main, html);
    }
    if (sock) tick(s, sock.now());
  }

  // ---------- telas ----------

  function lobby(s: PlayerState) {
    return `<section class="stage center"><div class="tag">Você está na sala ${code}</div><span class="fig grande" style="--r:-4deg">${avatarSvg(s.me.avatar, 132, true, { vivo: true })}</span><div class="big">${esc(s.me.nick)}</div>
      <p class="muted">Prontinho! Olhe para a tela: seu bicho já apareceu lá e o quiz vai começar.</p><div class="contador pequeno"><b>${s.playerCount}</b><span>${s.playerCount === 1 ? 'pessoa na sala' : 'pessoas na sala'}</span></div></section>`;
  }

  function question(s: PlayerState) {
    if (sock && preparando(s, sock.now())) return prepare(s);
    const chosen = s.me.choice ?? sending;
    const q = s.question!;
    if (q.tipo === 'quem') {
      // "Quem é mais provável…": a lista é a sala, cada um com o seu bicho
      const pessoas = q.o
        .map(
          (nick, k) =>
            `<button class="${chosen === k ? 'mine' : chosen != null ? 'dim' : ''}" data-act="ans" data-v="${k}" data-focus="a${k}"${chosen != null ? ' disabled' : ''}${chosen === k ? ' aria-pressed="true"' : ''}>${avatarSvg(
              (q.oa || [])[k] || '',
              52,
            )}<span>${esc(nick)}${nick === s.me.nick ? ' (você)' : ''}</span></button>`,
        )
        .join('');
      return `<section class="stage">${questionHead(s)}<div class="quem-grid" role="group" aria-label="Escolha alguém da sala">${pessoas}</div>
        <p class="hint" role="status">${chosen != null ? 'Voto enviado. Espere o resultado.' : 'Toque em alguém da sala. Vale votar em você.'}</p></section>`;
    }
    const buttons = q.o
      .map(
        (o, k) =>
          `<button class="ans c${k}${chosen != null && chosen !== k ? ' dim' : ''}${chosen === k ? ' mine' : ''}" data-act="ans" data-v="${k}" data-focus="a${k}"${chosen != null ? ' disabled' : ''}${
            chosen === k ? ' aria-pressed="true"' : ''
          }>${simbolo(k)}<span class="lt">${LETRAS[k]}</span><span>${esc(o)}</span><span></span></button>`,
      )
      .join('');
    return `<section class="stage">${questionHead(s)}<div class="answers" role="group" aria-label="Respostas">${buttons}</div>
      <p class="hint" role="status">${chosen != null ? (s.me.choice != null ? 'Resposta enviada. Espere a revelação.' : 'Enviando…') : q.tipo === 'opiniao' ? 'Não tem resposta certa: vote no que você acha.' : 'Toque na sua resposta. Quanto mais rápido, mais pontos.'}</p></section>`;
  }

  function reveal(s: PlayerState) {
    const answered = s.me.choice != null;
    if (s.question!.tipo !== 'quiz') {
      return `<section class="stage">${questionHead(s)}<div class="verdict voto-feito" role="status">${answered ? 'Voto contado!' : 'Não votou'}</div>${answersStatic(s, s.me.choice)}</section>`;
    }
    const ok = answered && s.me.choice === s.correct;
    const fogo = ok && s.me.streak >= FOGO ? `<div class="fogo-selo">${comMoldura(avatarSvg(s.me.avatar, 56), 'fogo')}<span><b>${s.me.streak} acertos seguidos!</b> Você está pegando fogo.</span></div>` : '';
    return `<section class="stage revelada">${questionHead(s)}<div class="verdict ${ok ? 'ok' : 'no'}" role="status">${answered ? (ok ? `Mandou bem! +${fmt(s.me.delta)}` : 'Quase!') : 'Não respondeu'}</div>${fogo}
      ${answersStatic(s, s.me.choice)}
      <p class="hint" style="font-size:19px">Você está em <b>${s.me.rank}º</b> de ${s.playerCount}, com ${fmt(s.me.score)} pontos.</p></section>`;
  }

  function ranking(s: PlayerState) {
    const subiu = s.me.prevRank && s.me.prevRank > s.me.rank ? `<p class="subiu">▲ Subiu ${s.me.prevRank - s.me.rank} ${s.me.prevRank - s.me.rank === 1 ? 'posição' : 'posições'}</p>` : '';
    const mold = s.me.streak >= FOGO ? 'fogo' : s.me.rank === 1 && s.me.score > 0 ? 'lider' : null;
    return `<section class="stage center"><div class="tag">Ranking</div><span class="eu-mold">${comMoldura(avatarSvg(s.me.avatar, 88), mold)}</span><div class="big">${s.me.rank}º</div>${subiu}<p class="muted">de ${s.playerCount}</p>
      <p class="placar"><b class="meus-pts">${fmt(s.me.score)}</b> pontos${s.me.delta ? ` <span class="ganho">${MOEDA}+${fmt(s.me.delta)}</span>` : ''}</p></section>
      <section class="panel"><div class="tag">Os primeiros</div>${rankList(s.ranking, s.me.id)}</section>`;
  }

  function final(s: PlayerState) {
    const showDraw = s.drawn.length && Date.now() >= revealDrawAt;
    const last = showDraw ? s.drawn[s.drawn.length - 1] : null;
    const euSorteado = s.drawn.some((d) => d.id === s.me.id) && (last?.id !== s.me.id || showDraw);
    const novo = [0, 3, 2, 0, 1][passo];
    const palmas = passo >= 4 && s.me.rank > 3 ? `${aplaude(s.me.avatar)}<p class="muted">Palmas para o pódio!</p>` : '';
    const meu = passo >= 4 ? `${palmas}<div class="big">${s.me.rank}º lugar</div><p class="muted">${fmt(s.me.score)} pontos</p>` : '<p class="muted">Olhe para a tela…</p>';
    return `<section class="stage center"><div class="tag">Fim do quiz</div><div class="big pequeno" aria-live="polite">${podiumTitle(s.podium, passo)}</div>${s.podium.length ? palco(s.podium, s.theme, passo, novo, s.code) : ''}${meu}</section>
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
    store.set('nick', nick === sugerido ? '' : nick);
    const avatar = encodeAvatar(av);
    store.set('avatar', avatar);
    seat = { pid: uid(), nick, avatar };
    store.set('jog:' + code, seat);
    connect();
  };

  const onClick = (e: Event) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-act]');
    if (!b || b.disabled) return;
    if (b.dataset.act === 'sortear') return setAv(randomAvatar());
    if (b.dataset.act === 'av') {
      const k = b.dataset.k as keyof Avatar;
      const v = b.dataset.v!;
      const next = { ...av };
      if (k === 'a') next.a = v as Bicho;
      if (k === 'h') next.h = v === '-' ? null : (v as ItemCabeca);
      if (k === 'f') next.f = v === '-' ? null : (v as ItemRosto);
      if (k === 'c') next.c = Number(v);
      return setAv(next);
    }
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
    clearTimeout(prepTimer);
    pararSuspense();
    clearTimeout(drawTimer);
    main.removeEventListener('submit', onSubmit);
    main.removeEventListener('click', onClick);
  };
}
