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
import { BICHOS, CABECA, ROSTO, encodeAvatar, parseAvatar, randomAvatar } from '../../shared/avatar';
import type { Avatar, Bicho, ItemCabeca, ItemRosto } from '../../shared/avatar';

const LAPIS =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 20h4L19 9l-4-4L4 16v4Z" fill="#fff" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="m13.5 6.5 4 4" stroke="currentColor" stroke-width="2"/></svg>';
import { avatarSvg, comMoldura } from '../lib/avatar-art';
import { simbolo } from '../lib/simbolos';
import { FOGO, MOEDA, SUSPENSE_MS, tamanhoResposta, agendaPodio, novosNoPodio, answersStatic, aplaude, prepare, preparando, brandBar, coins, confete, countUp, errorScreen, podiumTitle, questionHead, rankList, tick, top10 } from './jogo-comum';

interface Seat {
  pid: string;
  nick: string;
  avatar?: string;
}

export function page(code: string): Page {
  return { title: `Sala ${code}`, compact: true, mount: (main) => mount(main, code) };
}

function mount(main: HTMLElement, code: string) {
  const measureState = gameMeasurement('player');
  let measuredJoinAttempt = false;
  let seat = store.get<Seat | null>('jog:' + code, null);
  let sock: RoomSocket | null = null;
  let s: PlayerState | null = null;
  let sending: number | null = null; // resposta tocada, esperando o servidor confirmar
  let esperandoVaga = false; // sala grátis cheia: esperando o anfitrião liberar mais vagas
  let destaqueEm = 0; // revelação: o celular mostra se acertou junto com o destaque da TV
  let destaqueTimer = 0;
  let revealDrawAt = 0; // o sorteio aparece no celular depois da roleta da TV
  let drawTimer = 0;
  let clock = 0;
  let passo = 4; // suspense do pódio, no mesmo ritmo da TV
  let passoTimers: number[] = [];
  let lastHtml = '';
  let prepTimer = 0;
  // quem volta mantém o personagem; quem chega ganha um sorteado e edita depois, com o lápis na sala de espera
  let av: Avatar = parseAvatar(store.get('avatar', '')) || randomAvatar();
  let editando = false; // editor de personagem aberto na sala de espera

  const sair = () => {
    store.del('jog:' + code);
    navigate('/');
  };

  // entrada numa tela só: o nome, com um personagem já sorteado
  let nome = store.get('nick', '');

  const opcao = (k: string, v: string | number, on: boolean, inner: string, label: string) =>
    `<button type="button" data-act="av" data-k="${k}" data-v="${v}" data-focus="av-${k}-${v}" aria-pressed="${on}" aria-label="${esc(label)}">${inner}</button>`;

  /** Opções do editor de personagem: bicho, cabeça e rosto, um bloco embaixo do outro. */
  function picker() {
    return `<h2 class="ed-t">Bicho</h2>${pickerParte(2)}<h2 class="ed-t">Na cabeça</h2>${pickerParte(3)}<h2 class="ed-t">No rosto</h2>${pickerParte(4)}`;
  }
  function pickerParte(etapa: number) {
    if (etapa === 2)
      return `<div class="avgrid grande">${(Object.keys(BICHOS) as Bicho[])
        .map((a) => opcao('a', a, av.a === a, avatarSvg({ a, h: null, f: null, c: av.c }, 64), BICHOS[a]))
        .join('')}</div>`;
    if (etapa === 3)
      return `<div class="chips big">${[opcao('h', '-', !av.h, 'Nada', 'Nada na cabeça')]
        .concat((Object.keys(CABECA) as ItemCabeca[]).map((h) => opcao('h', h, av.h === h, esc(CABECA[h]), CABECA[h])))
        .join('')}</div>`;
    if (etapa === 4)
      return `<div class="chips big">${[opcao('f', '-', !av.f, 'Nada', 'Nada no rosto')]
        .concat((Object.keys(ROSTO) as ItemRosto[]).map((f) => opcao('f', f, av.f === f, esc(ROSTO[f]), ROSTO[f])))
        .join('')}</div>`;
    return '';
  }

  /** Personagem fixo no alto: a pessoa vê na hora como ficou a cada toque. */
  const previa = () => avatarSvg(av, 76, true);

  function setAv(next: Avatar) {
    av = next;
    const box = main.querySelector<HTMLElement>('#avp');
    if (box) patch(box, picker());
    const pv = main.querySelector<HTMLElement>('#avprev');
    if (pv) pv.innerHTML = previa();
  }

  function form(err = '') {
    main.innerHTML = `<section class="panel entrada"><div class="tag">Sala ${code}</div>
      <form id="fj" novalidate>
        <div class="av-fixo"><span id="avprev" class="av-fixo-bicho">${previa()}</span><span class="av-fixo-nome" id="av-nome">${esc(nome) || 'Seu nome'}</span><button type="button" class="btn sec small auto" data-act="sortear" data-focus="sortear">Sortear</button></div>
        <h1 id="etapa-t" tabindex="-1">Qual é o seu nome?</h1>
        <input type="text" id="nick" maxlength="${LIMITS.nick}" value="${esc(nome)}" autocomplete="nickname" placeholder="Como vai aparecer no ranking" aria-labelledby="etapa-t" aria-describedby="nick-err"><p class="err" id="nick-err" role="alert">${esc(err)}</p>
        <div class="etapa-acoes"><button class="btn" type="submit">Jogar!</button></div>
      </form>
      <p class="small">Sem cadastro. Dá para mudar o seu bicho depois, na sala de espera.</p></section>`;
    window.scrollTo(0, 0);
    main.querySelector<HTMLInputElement>('#nick')!.focus({ preventScroll: true });
  }

  function connect() {
    if (!measuredJoinAttempt) { measuredJoinAttempt = true; void track('join_room_start', {role:'player'}); }
    main.innerHTML = `<section class="panel center"><p class="muted dots">Entrando na sala ${code}</p></section>`;
    const me = seat!;
    sock = new RoomSocket({
      code,
      hello: () => ({ type: 'join', nick: me.nick, playerId: me.pid, avatar: me.avatar }),
      onStatus: (on) => banner(on || esperandoVaga ? '' : 'A conexão caiu, reconectando…'),
      onMessage,
    });
    clock = window.setInterval(() => sock && tick(s, sock.now()), 100);
  }

  function onMessage(m: ServerMsg) {
    if (m.type === 'error' || m.type === 'kicked' || m.type === 'closed') {
      if (!s) void track('join_room_error', {role:'player',error_category:'rejected'});
      const c = m.type === 'error' ? m.code : m.type === 'closed' && m.motivo === 'inativa' ? 'inativa' : m.type;
      banner('');
      if (c === 'bad_nick') {
        return form('Escreva um apelido para aparecer no ranking.');
      }
      // sala grátis cheia: fica esperando; o celular tenta de novo sozinho e entra quando o anfitrião liberar
      if (c === 'cheia_gratis') {
        esperandoVaga = true;
        main.innerHTML = `<section class="stage center espera-vaga" role="status"><div class="tag">Sala ${code}</div><div class="big">A sala encheu</div>
          <p class="muted">Esta sala grátis vai até 10 pessoas. Quem abriu a sala pode liberar mais vagas agora. Fique nesta tela: você entra sozinho assim que liberar<span class="dots"></span></p></section>`;
        return;
      }
      if (c !== 'not_found') store.del('jog:' + code);
      main.innerHTML = errorScreen(c, '<a class="btn auto" href="/jogar" data-link>Jogar em outra sala</a>');
      return;
    }
    if (m.type !== 'state' || m.role !== 'player') return;
    esperandoVaga = false;
    const prev = s;
    s = m;
    measureState({phase:s.phase,qIndex:s.qIndex,answered:s.me.choice != null});
    applyTheme(s.theme, s.brand.color, s.visual);
    if (s.me.choice != null || s.phase !== 'question') sending = null;
    if (s.phase === 'final' && s.drawn.length && (!prev || prev.drawn.length < s.drawn.length)) {
      // espera a roleta da TV (~1,5 s) para não estragar a surpresa
      revealDrawAt = prev && prev.phase === 'final' ? Date.now() + 1600 : 0;
      clearTimeout(drawTimer);
      drawTimer = window.setTimeout(render, Math.max(0, revealDrawAt - Date.now()));
    }
    if (prev && prev.phase === 'question' && s.phase === 'reveal' && s.question?.tipo === 'quiz') {
      destaqueEm = Date.now() + SUSPENSE_MS;
      clearTimeout(destaqueTimer);
      destaqueTimer = window.setTimeout(() => {
        if (s?.phase !== 'reveal') return;
        render();
        festejar('reveal');
      }, SUSPENSE_MS);
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
      if (prev && Date.now() >= destaqueEm) festejar(s.phase);
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
    agendaPodio(!!s && s.playerCount === 3).forEach(([ms, i]) => {
      passoTimers.push(
        window.setTimeout(() => {
          passo = i;
          render();
          if (i === 4 && s && s.me.rank <= 3) confete(s.theme === 'corp' && s.visual === 'floresta');
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
    if (editando)
      return `<section class="panel entrada editor-av"><div class="av-fixo"><span id="avprev" class="av-fixo-bicho">${previa()}</span><span class="av-fixo-nome">${esc(s.me.nick)}</span><button type="button" class="btn sec small auto" data-act="sortear" data-focus="sortear">Sortear</button></div>
        <h1 tabindex="-1" id="ed-h">Seu personagem</h1><div id="avp" class="avpick">${picker()}</div>
        <div class="etapa-acoes"><button type="button" class="btn sec auto" data-act="ed-cancelar">Cancelar</button><button type="button" class="btn" data-act="ed-pronto" data-focus="ed-pronto">Pronto</button></div></section>`;
    return `<section class="stage center"><div class="tag">Você está na sala ${code}</div><span class="fig grande editavel" style="--r:-4deg">${avatarSvg(s.me.avatar, 132, true, { vivo: true })}<button type="button" class="lapis" data-act="editar" data-focus="editar" aria-label="Editar o seu personagem">${LAPIS}</button></span><div class="big">${esc(s.me.nick)}</div>
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
      return `<section class="stage">${questionHead(s, true)}<div class="quem-grid" role="group" aria-label="Escolha alguém da sala">${pessoas}</div>
        <p class="hint" role="status">${chosen != null ? 'Voto enviado. Espere o resultado.' : 'Toque em alguém da sala. Vale votar em você.'}</p></section>`;
    }
    // respostas muito compridas não cabem numa tela de celular: só as letras e as cores (o texto fica na TV)
    const soLetras = q.o.some((o) => o.length > 45);
    const buttons = q.o
      .map(
        (o, k) =>
          `<button class="ans c${k}${soLetras ? ' so-letra' : tamanhoResposta(o)}${chosen != null && chosen !== k ? ' dim' : ''}${chosen === k ? ' mine' : ''}" data-act="ans" data-v="${k}" data-focus="a${k}"${chosen != null ? ' disabled' : ''}${
            chosen === k ? ' aria-pressed="true"' : ''
          }${soLetras ? ` aria-label="${LETRAS[k]}: ${esc(o)}"` : ''}>${simbolo(k)}<span class="lt">${LETRAS[k]}</span>${soLetras ? '' : `<span>${esc(o)}</span><span></span>`}</button>`,
      )
      .join('');
    const dica =
      chosen != null
        ? s.me.choice != null
          ? 'Resposta enviada. Espere a revelação.'
          : 'Enviando…'
        : soLetras
          ? 'Leia as respostas na tela e toque na letra.'
          : q.tipo === 'opiniao'
            ? 'Não tem resposta certa: vote no que você acha.'
            : 'Toque na sua resposta. Quanto mais rápido, mais pontos.';
    return `<section class="stage">${questionHead(s, true)}<div class="answers${soLetras ? ' so-letras' : ''}" role="group" aria-label="Respostas">${buttons}</div>
      <p class="hint" role="status">${dica}</p></section>`;
  }

  function reveal(s: PlayerState) {
    const answered = s.me.choice != null;
    if (s.question!.tipo !== 'quiz') {
      return `<section class="stage">${questionHead(s)}<div class="verdict voto-feito" role="status">${answered ? 'Voto contado!' : 'Não votou'}</div>${answersStatic(s, s.me.choice)}</section>`;
    }
    // suspense: enquanto a TV mostra só os votos, o celular mostra só a resposta escolhida
    if (Date.now() < destaqueEm)
      return `<section class="stage">${questionHead(s)}<div class="verdict espera" role="status"><span class="dots">Olhe para a tela</span></div>${answersStatic({ ...s, correct: null }, s.me.choice)}</section>`;
    const ok = answered && s.me.choice === s.correct;
    // na última não mostra a posição: ela entregaria o pódio
    const ultima = s.qIndex >= s.total - 1;
    const fogo = ok && s.me.streak >= FOGO ? `<div class="fogo-selo">${comMoldura(avatarSvg(s.me.avatar, 56), 'fogo')}<span><b>${s.me.streak} acertos seguidos!</b> Você está pegando fogo.</span></div>` : '';
    return `<section class="stage revelada">${questionHead(s)}<div class="verdict ${ok ? 'ok' : 'no'}" role="status">${answered ? (ok ? `Mandou bem! +${fmt(s.me.delta)}` : 'Quase!') : 'Não respondeu'}</div>
      <p class="hint minha-posicao">${ultima ? '<b>Olhe para a tela:</b> o pódio vem aí!' : `Você está em <b>${s.me.rank}º lugar</b>, com ${fmt(s.me.score)} pontos.${vizinhoTxt(s)}`}</p>${fogo}
      ${answersStatic(s, s.me.choice)}</section>`;
  }

  /** "120 pontos atrás de Ana" (ou, para quem lidera, "120 pontos à frente de Bia"). */
  function vizinhoTxt(s: PlayerState) {
    const v = s.me.vizinho;
    if (!v) return '';
    if (!v.pontos) return `<br><span class="vizinho">Empatado com ${esc(v.nick)}</span>`;
    return `<br><span class="vizinho">${fmt(v.pontos)} ${v.pontos === 1 ? 'ponto' : 'pontos'} ${v.atras ? 'atrás de' : 'à frente de'} ${esc(v.nick)}</span>`;
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
    const juntos = s.playerCount === 3;
    const novo = novosNoPodio(passo, juntos);
    const palmas = passo >= 4 && s.me.rank > 3 ? `${aplaude(s.me.avatar)}<p class="muted">Palmas para o pódio!</p>` : '';
    const meu = passo >= 4 ? `${palmas}<div class="big">${s.me.rank}º lugar</div><p class="muted">${fmt(s.me.score)} pontos</p>` : '<p class="muted">Olhe para a tela…</p>';
    // depois do pódio, os 10 primeiros, como na TV
    const lista = passo >= 4 ? top10(s.ranking, s.me.id) : '';
    return `<section class="stage center"><div class="tag">Fim do quiz</div><div class="big pequeno" aria-live="polite">${podiumTitle(s.podium, passo, s.visual, juntos)}</div>${s.podium.length ? palco(s.podium, s.theme, passo, novo, s.code, s.visual) : ''}${meu}</section>${lista}
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
    nome = cleanNick(main.querySelector<HTMLInputElement>('#nick')!.value);
    if (!nome) return form('Escreva seu apelido para aparecer no ranking.');
    store.set('nick', nome);
    const nick = nome;
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
      setAv(next);
      return;
    }
    // lápis na sala de espera: abre o editor com o personagem atual
    if (b.dataset.act === 'editar' && s) {
      av = parseAvatar(s.me.avatar) || av;
      editando = true;
      render();
      window.scrollTo(0, 0);
      main.querySelector<HTMLElement>('#ed-h')?.focus({ preventScroll: true });
      return;
    }
    if (b.dataset.act === 'ed-cancelar' || b.dataset.act === 'ed-pronto') {
      if (b.dataset.act === 'ed-pronto' && sock) {
        const avatar = encodeAvatar(av);
        store.set('avatar', avatar);
        if (seat) store.set('jog:' + code, { ...seat, avatar });
        sock.send({ type: 'avatar', avatar });
      }
      editando = false;
      render();
      main.querySelector<HTMLElement>('[data-focus="editar"]')?.focus({ preventScroll: true });
      return;
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

  // o nome digitado aparece ao lado do bicho, na barra fixa
  const onNome = (e: Event) => {
    const t = e.target as HTMLInputElement;
    if (t.id !== 'nick') return;
    const n = main.querySelector('#av-nome');
    nome = t.value;
    if (n) n.textContent = t.value.trim() || 'Seu nome';
  };
  main.addEventListener('input', onNome);
  main.addEventListener('submit', onSubmit);
  main.addEventListener('click', onClick);
  if (seat) connect();
  else form();

  return () => {
    clearTimeout(destaqueTimer);
    if (sock) sock.stop();
    clearInterval(clock);
    clearTimeout(prepTimer);
    pararSuspense();
    clearTimeout(drawTimer);
    main.removeEventListener('submit', onSubmit);
    main.removeEventListener('input', onNome);
    main.removeEventListener('click', onClick);
  };
}
import { track } from '../lib/measurement';
import { gameMeasurement } from '../lib/game-measurement';
