// /host/{CODIGO}: tela do anfitrião, a que vai na TV ou no projetor.
import type { Page } from '../main';
import type { ClientMsg, HostState, ServerMsg } from '../../shared/protocol';
import { TEMAS } from '../data/pacotes';
import { esc, patch, prefersReducedMotion } from '../lib/dom';
import { WHATSAPP, banner } from '../lib/layout';
import { qrSvg } from '../lib/qr';
import { RoomSocket } from '../lib/socket';
import { store } from '../lib/storage';
import { applyTheme } from '../lib/theme';
import { animateRank, answersStatic, brandBar, errorScreen, podium, questionHead, rankList, tick } from './jogo-comum';

export function page(code: string): Page {
  return { title: `Sala ${code}`, wide: true, compact: true, mount: (main) => mount(main, code) };
}

function mount(main: HTMLElement, code: string) {
  const hostKey = store.get<string>('host:' + code, '');
  const link = `${location.origin}/${code}`;
  let s: HostState | null = null;
  let fatal = '';
  let spinning = false; // roleta do sorteio rodando
  let shownDrawn = 0; // quantos sorteados a tela já mostrou

  main.classList.add('tv');
  if (!hostKey) {
    main.innerHTML = errorScreen('bad_key', '<a class="btn auto" href="/criar" data-link>Criar um quiz</a>');
    return () => main.classList.remove('tv');
  }

  const sock = new RoomSocket({
    code,
    hello: () => ({ type: 'host', hostKey }),
    onStatus: (on) => banner(on || fatal ? '' : 'A conexão caiu, reconectando…'),
    onMessage,
  });
  const send = (m: ClientMsg) => sock.send(m);

  function onMessage(m: ServerMsg) {
    if (m.type === 'error' || m.type === 'closed') {
      fatal = m.type === 'closed' ? 'closed' : m.code;
      sock.stop();
      banner('');
      main.innerHTML = errorScreen(fatal, '<a class="btn auto" href="/criar" data-link>Voltar para o editor</a>');
      return;
    }
    if (m.type !== 'state' || m.role !== 'host') return;
    const prev = s;
    s = m;
    applyTheme(s.theme, s.brand.color);
    const phaseChanged = !prev || prev.phase !== s.phase || prev.qIndex !== s.qIndex;
    if (s.phase === 'final' && s.drawn.length > shownDrawn && prev && prev.phase === 'final') return spin();
    if (s.phase === 'final') shownDrawn = s.drawn.length;
    render();
    if (phaseChanged) {
      window.scrollTo(0, 0);
      if (s.phase === 'ranking') animateRank(main);
    }
  }

  function render() {
    if (!s) return;
    const screens = { lobby, question: pergunta, reveal: pergunta, ranking, final };
    patch(main, brandBar(s) + screens[s.phase](s));
    tick(s, sock.now());
  }

  // ---------- telas ----------

  function lobby(s: HostState) {
    const invite = `Bora jogar Quiddo? Entra na sala com o código ${code}: ${link}`;
    const n = s.players.length;
    return `<section class="stage"><div class="joinbox">
        <div style="display:grid;gap:12px">
          <div class="tag">Entre pelo celular</div>
          <div class="url">${esc(location.host)}/<b>${code}</b></div>
          <div class="bigcode" aria-label="Código da sala: ${code.split('').join(' ')}">${code}</div>
          <p class="muted">Aponte a câmera para o QR ou abra o link e digite seu apelido. ${esc(TEMAS[s.theme].chamada)}.</p>
          <a class="btn wa auto" href="https://wa.me/?text=${encodeURIComponent(invite)}" target="_blank" rel="noopener">${WHATSAPP}Mandar convite no WhatsApp</a>
        </div>
        <div class="qr">${qrSvg(link)}</div>
      </div></section>
      <section class="panel"><div class="tag" aria-live="polite">Na sala · ${n} ${n === 1 ? 'pessoa' : 'pessoas'}</div>
        ${
          n
            ? `<div class="people">${s.players
                .map((p) => `<span class="${p.connected ? '' : 'off'}">${esc(p.nick)}<button data-act="kick" data-v="${p.id}" data-focus="k${p.id}" aria-label="Remover ${esc(p.nick)}">Remover</button></span>`)
                .join('')}</div>`
            : '<p class="small">Esperando a turma entrar…</p>'
        }
        <div class="btnrow"><button class="btn" data-act="start" data-focus="start">${n ? 'Começar o quiz' : 'Começar sem jogadores (teste)'}</button><button class="btn sec" data-act="close" data-focus="close">Encerrar sala</button></div>
      </section>`;
  }

  function pergunta(s: HostState) {
    const rev = s.phase === 'reveal';
    const live = s.players.filter((p) => p.connected).length;
    return `<section class="stage">${questionHead(s)}${answersStatic(s)}
      <div class="meta"><span aria-live="polite">${rev ? `Resposta certa: <b style="font-size:inherit">${String.fromCharCode(65 + (s.correct ?? 0))}</b>` : `${s.answeredCount} de ${live} responderam`}</span></div></section>
      <section class="panel"><div class="btnrow">${
        rev ? '<button class="btn" data-act="showRanking" data-focus="go">Ver o ranking</button>' : '<button class="btn" data-act="reveal" data-focus="go">Revelar a resposta</button>'
      }<button class="btn sec" data-act="close" data-focus="close">Encerrar</button></div><p class="small">Dica: a seta para a direita do teclado ou o passador de slides também avançam.</p></section>`;
  }

  function ranking(s: HostState) {
    const last = s.qIndex >= s.total - 1;
    return `<section class="stage"><div class="tag">Ranking depois da pergunta ${s.qIndex + 1} de ${s.total}</div>${
      s.ranking.length ? rankList(s.ranking, '', true) : '<p class="small">Ninguém jogando ainda.</p>'
    }</section><section class="panel"><div class="btnrow"><button class="btn" data-act="next" data-focus="go">${last ? 'Ver o pódio' : 'Próxima pergunta'}</button><button class="btn sec" data-act="close" data-focus="close">Encerrar</button></div></section>`;
  }

  function final(s: HostState) {
    const win = s.podium[0];
    const last = s.drawn[shownDrawn - 1];
    const scored = s.ranking.some((r) => r.score > 0 && !s.drawn.some((d) => d.id === r.id));
    const anyLeft = s.ranking.some((r) => !s.drawn.some((d) => d.id === r.id));
    return `<section class="stage center"><div class="big">${win ? esc(win.nick) + ' venceu!' : 'Fim do quiz'}</div>${s.podium.length ? podium(s.podium) : ''}</section>
      <section class="panel center"><h2>Sorteio de prêmios</h2>
        <div class="sorteio" id="sorteio" aria-live="polite">${last ? esc(last.nick) : ''}</div>
        ${shownDrawn > 1 ? `<p class="small">Já sorteados: ${s.drawn.slice(0, shownDrawn - 1).map((d) => esc(d.nick)).join(', ')}</p>` : ''}
        <div class="btnrow" style="width:100%"><button class="btn" data-act="draw" data-v="all" data-focus="drawall"${anyLeft && !spinning ? '' : ' disabled'}>Sortear entre todos</button><button class="btn sec" data-act="draw" data-v="scored" data-focus="drawpts"${scored && !spinning ? '' : ' disabled'}>Só entre quem pontuou</button></div>
        <p class="small">Cada sorteio tira um nome que ainda não saiu. Sorteie quantos prêmios quiser.</p></section>
      <section class="panel"><h2>Classificação final</h2>${s.ranking.length ? rankList(s.ranking) : '<p class="small">Ninguém jogou.</p>'}
        <div class="btnrow"><button class="btn" data-act="restart" data-focus="restart">Jogar de novo</button><button class="btn sec" data-act="close" data-focus="close">Encerrar sala</button></div>
        <p class="small">Jogar de novo usa as mesmas perguntas e as mesmas pessoas, com os pontos zerados.</p></section>`;
  }

  /** Roleta de nomes de ~1,5 s antes de mostrar quem foi sorteado. */
  function spin() {
    if (!s) return;
    const st = s;
    const winner = st.drawn[st.drawn.length - 1];
    const pool = st.ranking.filter((r) => !st.drawn.slice(0, -1).some((d) => d.id === r.id)).map((r) => r.nick);
    spinning = true;
    render();
    const box = document.getElementById('sorteio');
    const done = () => {
      spinning = false;
      shownDrawn = st.drawn.length;
      render();
    };
    if (!box || prefersReducedMotion() || pool.length < 2) return done();
    box.setAttribute('aria-live', 'off');
    let t = 0;
    const iv = window.setInterval(() => {
      box.textContent = pool[Math.floor(Math.random() * pool.length)];
      if (++t >= 16) {
        clearInterval(iv);
        box.textContent = winner.nick;
        box.setAttribute('aria-live', 'polite');
        done();
      }
    }, 95);
  }

  // ---------- comandos ----------

  function primary() {
    if (!s) return;
    if (s.phase === 'question') send({ type: 'reveal' });
    else if (s.phase === 'reveal') send({ type: 'showRanking' });
    else if (s.phase === 'ranking') send({ type: 'next' });
  }

  const onClick = (e: Event) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-act]');
    if (!b || b.disabled) return;
    const a = b.dataset.act!;
    const v = b.dataset.v || '';
    if (a === 'start') send({ type: 'start' });
    else if (a === 'reveal') send({ type: 'reveal' });
    else if (a === 'showRanking') send({ type: 'showRanking' });
    else if (a === 'next') send({ type: 'next' });
    else if (a === 'restart') {
      if (confirm('Começar de novo com as mesmas pessoas? Os pontos serão zerados.')) send({ type: 'restart' });
    } else if (a === 'draw' && !spinning) send({ type: 'draw', mode: v === 'scored' ? 'scored' : 'all' });
    else if (a === 'kick') {
      const p = s?.players.find((x) => x.id === v);
      if (p && confirm(`Remover ${p.nick} da sala?`)) send({ type: 'kick', playerId: v });
    } else if (a === 'close') {
      if (confirm('Encerrar a sala? Todo mundo sai do jogo.')) send({ type: 'close' });
    }
  };

  // seta para a direita, Page Down e espaço avançam: funciona com passador de slides
  const onKey = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'A') return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      primary();
    }
  };

  // tela da TV não deve apagar no meio do jogo
  let lock: { release(): Promise<void> } | null = null;
  const wake = () => {
    const nav = navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } };
    if (document.visibilityState === 'visible' && nav.wakeLock)
      nav.wakeLock.request('screen').then(
        (l) => (lock = l),
        () => {},
      );
  };
  wake();
  document.addEventListener('visibilitychange', wake);

  const clock = window.setInterval(() => tick(s, sock.now()), 100);
  main.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  main.innerHTML = `<section class="panel center"><p class="muted dots">Abrindo a sala ${code}</p></section>`;

  return () => {
    sock.stop();
    clearInterval(clock);
    main.removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', wake);
    if (lock) lock.release().catch(() => {});
    main.classList.remove('tv');
  };
}

