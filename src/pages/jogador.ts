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
import { BICHOS, CABECA, ROSTO, encodeAvatar, parseAvatar, randomAvatar, startAvatar } from '../../shared/avatar';
import type { Avatar, Bicho, ItemCabeca, ItemRosto } from '../../shared/avatar';
import { avatarSvg, comMoldura } from '../lib/avatar-art';
import { simbolo } from '../lib/simbolos';
import { FOGO, MOEDA, SUSPENSE_MS, agendaPodio, novosNoPodio, answersStatic, aplaude, prepare, preparando, brandBar, coins, confete, countUp, errorScreen, podiumTitle, questionHead, rankList, tick, top10 } from './jogo-comum';

interface Seat {
  pid: string;
  nick: string;
  avatar?: string;
}

export function page(code: string): Page {
  return { title: `Sala ${code}`, compact: true, mount: (main) => mount(main, code) };
}

function mount(main: HTMLElement, code: string) {
  let seat = store.get<Seat | null>('jog:' + code, null);
  let sock: RoomSocket | null = null;
  let s: PlayerState | null = null;
  let sending: number | null = null; // resposta tocada, esperando o servidor confirmar
  let destaqueEm = 0; // revelação: o celular mostra se acertou junto com o destaque da TV
  let destaqueTimer = 0;
  let revealDrawAt = 0; // o sorteio aparece no celular depois da roleta da TV
  let drawTimer = 0;
  let clock = 0;
  let passo = 4; // suspense do pódio, no mesmo ritmo da TV
  let passoTimers: number[] = [];
  let lastHtml = '';
  let prepTimer = 0;
  let av: Avatar = parseAvatar(store.get('avatar', '')) || startAvatar();

  const sair = () => {
    store.del('jog:' + code);
    navigate('/');
  };

  // entrada em telas: 1 nome, 2 bicho, 3 cabeça, 4 rosto (uma tela por vez)
  let etapa = 1;
  let nome = store.get('nick', '');
  const TITULOS = ['', 'Qual é o seu nome?', 'Escolha o seu bicho', 'Algo na cabeça?', 'E no rosto?'];

  const opcao = (k: string, v: string | number, on: boolean, inner: string, label: string) =>
    `<button type="button" data-act="av" data-k="${k}" data-v="${v}" data-focus="av-${k}-${v}" aria-pressed="${on}" aria-label="${esc(label)}">${inner}</button>`;

  function picker() {
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
    const pontos = [1, 2, 3, 4].map((i) => `<i class="${i < etapa ? 'feito' : i === etapa ? 'agora' : ''}"></i>`).join('');
    const corpo =
      etapa === 1
        ? `<input type="text" id="nick" maxlength="${LIMITS.nick}" value="${esc(nome)}" autocomplete="nickname" placeholder="Como vai aparecer no ranking" aria-labelledby="etapa-t" aria-describedby="nick-err"><p class="err" id="nick-err" role="alert">${esc(err)}</p>`
        : `<div id="avp" class="avpick">${picker()}</div>`;
    const botao = etapa === 1 ? 'Próximo' : etapa === 2 ? '' : etapa === 3 ? 'Próximo' : 'Entrar na sala';
    main.innerHTML = `<section class="panel entrada"><div class="tag">Sala ${code}</div>
      <form id="fj" novalidate>
        <div class="av-fixo"><span id="avprev" class="av-fixo-bicho">${previa()}</span><span class="av-fixo-nome" id="av-nome">${esc(nome) || 'Seu nome'}</span>${
          etapa > 1 ? '<button type="button" class="btn sec small auto" data-act="sortear" data-focus="sortear">Sortear</button>' : ''
        }</div>
        <div class="etapa-topo"><span class="etapa-pontos" aria-hidden="true">${pontos}</span><span class="small">Passo ${etapa} de 4</span></div>
        <h1 id="etapa-t" tabindex="-1">${TITULOS[etapa]}</h1>
        ${etapa === 2 ? '<p class="small">Toque no seu bicho.</p>' : ''}
        ${corpo}
        <div class="etapa-acoes">${etapa > 1 ? '<button type="button" class="btn sec auto" data-act="voltar">Voltar</button>' : ''}${botao ? `<button class="btn" type="submit">${botao}</button>` : ''}</div>
      </form>
      <p class="small">Sem cadastro. Seu nome e seu bicho só aparecem nesta rodada.</p></section>`;
    window.scrollTo(0, 0);
    if (etapa === 1) main.querySelector<HTMLInputElement>('#nick')!.focus({ preventScroll: true });
    else main.querySelector<HTMLElement>('#etapa-t')!.focus({ preventScroll: true });
  }

  function irPara(n: number) {
    etapa = Math.max(1, Math.min(4, n));
    form();
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
      if (c === 'bad_nick') {
        etapa = 1;
        return form('Escreva um apelido para aparecer no ranking.');
      }
      if (c !== 'not_found') store.del('jog:' + code);
      main.innerHTML = errorScreen(c, '<a class="btn auto" href="/entrar" data-link>Entrar em outra sala</a>');
      return;
    }
    if (m.type !== 'state' || m.role !== 'player') return;
    const prev = s;
    s = m;
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
    // suspense: enquanto a TV mostra só os votos, o celular mostra só a resposta escolhida
    if (Date.now() < destaqueEm)
      return `<section class="stage">${questionHead(s)}<div class="verdict espera" role="status"><span class="dots">Olhe para a tela</span></div>${answersStatic({ ...s, correct: null }, s.me.choice)}</section>`;
    const ok = answered && s.me.choice === s.correct;
    // na última não mostra a posição: ela entregaria o pódio
    const ultima = s.qIndex >= s.total - 1;
    const fogo = ok && s.me.streak >= FOGO ? `<div class="fogo-selo">${comMoldura(avatarSvg(s.me.avatar, 56), 'fogo')}<span><b>${s.me.streak} acertos seguidos!</b> Você está pegando fogo.</span></div>` : '';
    return `<section class="stage revelada">${questionHead(s)}<div class="verdict ${ok ? 'ok' : 'no'}" role="status">${answered ? (ok ? `Mandou bem! +${fmt(s.me.delta)}` : 'Quase!') : 'Não respondeu'}</div>${fogo}
      ${answersStatic(s, s.me.choice)}
      <p class="hint" style="font-size:19px">${ultima ? '<b>Olhe para a tela:</b> o pódio vem aí!' : `Você está em <b>${s.me.rank}º</b> de ${s.playerCount}, com ${fmt(s.me.score)} pontos.`}</p></section>`;
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
    if (etapa === 1) {
      nome = cleanNick(main.querySelector<HTMLInputElement>('#nick')!.value);
      if (!nome) return form('Escreva seu apelido para aparecer no ranking.');
      store.set('nick', nome);
      return irPara(2);
    }
    if (etapa < 4) return irPara(etapa + 1);
    const nick = cleanNick(nome);
    if (!nick) return irPara(1);
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
      // escolheu o bicho: vai sozinho para a próxima tela, depois de ver o personagem mudar
      if (k === 'a' && etapa === 2) window.setTimeout(() => etapa === 2 && irPara(3), 280);
      return;
    }
    if (b.dataset.act === 'voltar') return irPara(etapa - 1);
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
