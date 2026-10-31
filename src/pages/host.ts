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
import { palco } from '../lib/podio';
import { alternarSom, bipe, fanfarra, ligarMusica, musicaBaixa, pararMusica, reacao, rufar, somLigado } from '../lib/som';
import { avatarSvg } from '../lib/avatar-art';
import { abrirPagamento, confereVolta, meuAcesso } from '../lib/pagamento';
import { LIMITS } from '../../shared/rules';
import { SUSPENSE_MS, agendaPodio, graficoVotos, novosNoPodio, animateRank, answersStatic, prepare, preparando, brandBar, confete, cortina, errorScreen, fogoFaixa, fotoCabeca, podiumTitle, questionHead, rankColunas, rankList, rankPista, revelacaoTv, tick, top10 } from './jogo-comum';
import type { RankRow } from '../../shared/protocol';

/** Rotação das figurinhas na sala de espera: o jeito solto do logo. */
const GIRO = ['-5deg', '4deg', '-2deg', '6deg', '-4deg', '2deg', '-6deg', '3deg'];

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
  let passo = 4; // suspense do pódio: 0 a 4 (ver PASSOS_PODIO)
  let passoTimers: number[] = [];
  let lastHtml = '';
  let prepTimer = 0;
  const vistos = new Set<string>(); // quem já apareceu no lobby (para animar só quem acabou de entrar)
  let ultimoRk: RankRow[] = []; // último ranking visto: os 3 primeiros aparecem nervosos antes da última pergunta
  let avisoTimer = 0;
  let destaqueEm = 0; // revelação: hora em que a resposta certa ganha o destaque (antes, só os votos)
  let destaqueTimer = 0;
  let liberando = false; // já pediu ao servidor para liberar a sala com o código deste navegador

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
    if (m.type === 'error' && m.code === 'acesso_invalido') {
      avisoEntrada('Esse código de acesso não vale');
      return;
    }
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
    // sala grátis e este navegador já tem acesso pago (ou acabou de pagar): libera sozinha, uma vez
    if (s.maxPlayers < LIMITS.maxPlayers && meuAcesso() && !liberando) {
      liberando = true;
      send({ type: 'liberar', codigo: meuAcesso() });
    }
    applyTheme(s.theme, s.brand.color, s.visual);
    if (s.phase === 'lobby') ultimoRk = [];
    else if (s.ranking.length) ultimoRk = s.ranking;
    const phaseChanged = !prev || prev.phase !== s.phase || prev.qIndex !== s.qIndex;
    // revelação ao vivo: primeiro só os votos, a certa ganha o destaque depois (quem recarrega vê tudo pronto)
    if (prev && prev.phase === 'question' && s.phase === 'reveal') destaqueEm = Date.now() + SUSPENSE_MS;
    if (s.phase === 'final' && s.drawn.length > shownDrawn && prev && prev.phase === 'final') return spin();
    if (s.phase === 'final') shownDrawn = s.drawn.length;
    // o suspense do pódio só roda quando o jogo acaba com a tela aberta; quem recarrega vê o pódio pronto
    if (s.phase === 'final' && prev && prev.phase !== 'final') suspense();
    if (s.phase !== 'final') pararSuspense(4);
    // redesenha quando o "Prepare-se" acaba, para as respostas aparecerem
    clearTimeout(prepTimer);
    if (preparando(s, sock.now())) prepTimer = window.setTimeout(render, s.startsAt - sock.now() + 30);
    render();
    if (phaseChanged) {
      window.scrollTo(0, 0);
      if (s.phase === 'ranking') animateRank(main);
      // cortina de folhas na troca de pergunta
      if (prev && s.phase === 'question' && prev.phase !== 'question') cortina(s.visual);
      // som: música mais baixa na pergunta; reação na revelação
      if (s.phase === 'question') musicaBaixa(true);
      if (prev && s.phase === 'reveal' && prev.phase === 'question') {
        musicaBaixa(false);
        const q = s.question;
        if (q && q.tipo === 'quiz' && s.correct != null && s.counts) {
          // o som sai junto com o destaque da certa
          const counts = s.counts;
          const certa = s.correct;
          clearTimeout(destaqueTimer);
          destaqueTimer = window.setTimeout(() => {
            if (s?.phase !== 'reveal') return;
            render();
            reacao(counts[certa], counts.reduce((a, b) => a + b, 0));
          }, SUSPENSE_MS);
        }
      }
    }
  }

  function render() {
    if (!s) return;
    const novos = s.phase === 'lobby' ? s.players.filter((p) => !vistos.has(p.id)) : [];
    const screens = { lobby, question: pergunta, reveal: pergunta, ranking, final };
    const html = brandBar(s) + screens[s.phase](s);
    // não redesenha se nada mudou: preserva as animações do ranking e do pódio
    if (html !== lastHtml) {
      lastHtml = html;
      patch(main, html);
    }
    for (const p of s.players) vistos.add(p.id);
    if (s.phase !== 'lobby') document.getElementById('entrou')?.classList.remove('on');
    if (novos.length) avisoEntrada(novos.length === 1 ? `${novos[0].nick} entrou!` : `${novos.length} pessoas entraram!`);
    tick(s, sock.now());
  }

  /** Aviso grande "Bia entrou!" no alto da TV, por 2 segundos. */
  function avisoEntrada(txt: string) {
    let el = document.getElementById('entrou');
    if (!el) {
      el = document.createElement('div');
      el.id = 'entrou';
      el.className = 'entrou';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = txt;
    el.classList.remove('on');
    void el.offsetWidth;
    el.classList.add('on');
    clearTimeout(avisoTimer);
    avisoTimer = window.setTimeout(() => el && el.classList.remove('on'), 2200);
  }

  function suspense() {
    pararSuspense(0);
    agendaPodio(!!s && s.playerCount === 3).forEach(([ms, i]) => {
      passoTimers.push(
        window.setTimeout(() => {
          passo = i;
          render();
          if (i === 4) {
            confete(s?.theme === 'corp' && s?.visual === 'floresta');
            fanfarra();
          } else rufar();
        }, ms),
      );
    });
  }

  function pararSuspense(to: number) {
    passoTimers.forEach(clearTimeout);
    passoTimers = [];
    passo = to;
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
      <section class="panel"><div class="contador"><b>${n}</b><span>${n === 1 ? 'pessoa na sala' : 'pessoas na sala'}</span></div>${planoSala(s)}
        ${
          n
            ? `<div class="jogadores">${s.players
                .map(
                  (p, i) =>
                    `<div class="jogador${p.connected ? '' : ' off'}${vistos.has(p.id) ? '' : ' chegou'}"><span class="fig" style="--r:${GIRO[i % GIRO.length]}">${avatarSvg(p.avatar, 72, false, { vivo: true })}</span><b>${esc(p.nick)}</b><button class="linkbtn" data-act="kick" data-v="${p.id}" data-focus="k${p.id}" aria-label="Remover ${esc(p.nick)}">Remover</button></div>`,
                )
                .join('')}</div>`
            : '<p class="muted esperando">Esperando a turma entrar<span class="dots"></span></p>'
        }
        <div class="btnrow"><button class="btn" data-act="start" data-focus="start">${n ? 'Começar o quiz' : 'Começar sem jogadores (teste)'}</button></div><p class="encerrar"><button class="linkbtn" data-act="close" data-focus="close">Encerrar sala</button></p>
      </section>`;
  }

  /** Sala grátis: mostra o limite e o botão para liberar até 200 pessoas. */
  function planoSala(s: HostState) {
    if (s.maxPlayers >= LIMITS.maxPlayers) return '';
    const cheia = s.players.length >= s.maxPlayers;
    return `<div class="plano${cheia ? ' cheia' : ''}" role="status"><p>${cheia ? `<b>A sala encheu.</b> A sala grátis vai até ${s.maxPlayers} pessoas.` : `Sala grátis: até ${s.maxPlayers} pessoas.`}</p>
      <button type="button" class="btn sec auto" data-act="liberar" data-focus="liberar">Liberar até ${LIMITS.maxPlayers} pessoas</button></div>`;
  }

  function pergunta(s: HostState) {
    const rev = s.phase === 'reveal';
    const live = s.players.filter((p) => p.connected).length;
    const opiniao = s.question!.tipo !== 'quiz';
    const last = s.qIndex >= s.total - 1;
    if (!rev && preparando(s, sock.now())) return prepare(s, ultimoRk.slice(0, 3)) + `<section class="panel"><p class="encerrar"><button class="linkbtn" data-act="close" data-focus="close">Encerrar jogo</button></p></section>`;
    const destaque = Date.now() >= destaqueEm;
    const status = rev
      ? opiniao
        ? `${s.answeredCount} ${s.answeredCount === 1 ? 'voto' : 'votos'}`
        : destaque
          ? `Resposta certa: <b style="font-size:inherit">${String.fromCharCode(65 + (s.correct ?? 0))}</b>`
          : '<span class="dots">E a resposta certa é</span>'
      : `${s.answeredCount} de ${live} ${opiniao ? 'votaram' : 'responderam'}${s.question!.tipo === 'quem' ? ' · votem pelo celular em alguém da sala' : ''}`;
    // pergunta de opinião não mexe no placar: pula o ranking
    const avancar = !rev
      ? `<button class="btn" data-act="reveal" data-focus="go">${opiniao ? 'Mostrar os votos' : 'Revelar a resposta'}</button>`
      : opiniao || last
        ? `<button class="btn" data-act="next" data-focus="go">${last ? 'Ver o pódio' : 'Próxima pergunta'}</button>`
        : '<button class="btn" data-act="showRanking" data-focus="go">Ver o ranking</button>';
    // revelação: gráfico de barras com os votos; na última pergunta, também quem acertou
    const quiz = rev && !opiniao && s.correct != null;
    const extras = quiz && last && destaque ? revelacaoTv(s.acertaram, s.counts ? s.counts[s.correct!] : s.acertaram.length) : '';
    return `<section class="stage${rev ? ' revelada' : ''}">${questionHead(s)}${quiz ? graficoVotos(s, destaque) : answersStatic(s)}${extras}
      <div class="meta"><span aria-live="polite">${status}</span></div></section>
      <section class="panel"><div class="btnrow">${avancar}</div><div class="rodape-jogo"><p class="small">Dica: a seta para a direita do teclado ou o passador de slides também avançam.</p><p class="encerrar"><button class="linkbtn" data-act="close" data-focus="close">Encerrar jogo</button></p></div></section>`;
  }

  function ranking(s: HostState) {
    const last = s.qIndex >= s.total - 1;
    // o placar alterna entre a pista (quem corre até a bandeira) e as colunas (quem está mais alto)
    const rapido = s.acertaram[0]?.id || '';
    const colunas = s.qIndex % 2 === 1 && s.ranking.length > 1;
    const placar = !s.ranking.length ? '<p class="small">Ninguém jogando ainda.</p>' : colunas ? rankColunas(s.ranking, rapido) + `<div class="sr">${rankList(s.ranking)}</div>` : rankPista(s.ranking, rapido);
    return `<section class="stage"><div class="tag">${colunas ? 'Como está a disputa' : 'Ranking'} depois da pergunta ${s.qIndex + 1} de ${s.total}</div>${fogoFaixa(s.ranking)}${placar}</section><section class="panel"><div class="btnrow"><button class="btn" data-act="next" data-focus="go">${last ? 'Ver o pódio' : 'Próxima pergunta'}</button></div><p class="encerrar"><button class="linkbtn" data-act="close" data-focus="close">Encerrar jogo</button></p></section>`;
  }

  function final(s: HostState) {
    const last = s.drawn[shownDrawn - 1];
    const scored = s.ranking.some((r) => r.score > 0 && !s.drawn.some((d) => d.id === r.id));
    const anyLeft = s.ranking.some((r) => !s.drawn.some((d) => d.id === r.id));
    const juntos = s.playerCount === 3;
    const novo = novosNoPodio(passo, juntos);
    const card = `<section class="stage center foto" id="foto">${fotoCabeca(s)}<div class="big" aria-live="polite">${podiumTitle(s.podium, passo, s.visual, juntos)}</div>${
      s.podium.length ? palco(s.podium, s.theme, passo, novo, s.code, s.visual) : ''
    }<p class="foto-pe">${esc(location.host)} · quiz ao vivo</p></section>`;
    if (passo < 4) return card + `<section class="panel center"><button class="btn sec auto" data-act="pular" data-focus="pular">Pular o suspense</button></section>`;
    // depois do pódio, os 10 primeiros para todo mundo ver
    return `${card}${top10(s.ranking)}
      <section class="panel center"><button class="btn auto" data-act="foto" data-focus="foto">Modo foto: só o pódio na tela</button><p class="small">Deixa só o pódio na tela, para a turma tirar foto. Aperte Esc para voltar.</p></section>
      <section class="panel center"><h2>Sorteio de prêmios</h2>
        <div class="sorteio" id="sorteio" aria-live="polite">${last ? esc(last.nick) : ''}</div>
        ${shownDrawn > 1 ? `<p class="small">Já sorteados: ${s.drawn.slice(0, shownDrawn - 1).map((d) => esc(d.nick)).join(', ')}</p>` : ''}
        <div class="btnrow" style="width:100%"><button class="btn" data-act="draw" data-v="all" data-focus="drawall"${anyLeft && !spinning ? '' : ' disabled'}>Sortear entre todos</button><button class="btn sec" data-act="draw" data-v="scored" data-focus="drawpts"${scored && !spinning ? '' : ' disabled'}>Só entre quem pontuou</button></div>
        <p class="small">Cada sorteio tira um nome que ainda não saiu. Sorteie quantos prêmios quiser.</p></section>
      <section class="panel"><h2>Classificação ${s.ranking.length > 10 ? 'completa' : 'final'}</h2>${s.ranking.length ? rankList(s.ranking) : '<p class="small">Ninguém jogou.</p>'}
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
    // opinião não mexe no placar e a última vai direto para o pódio: as duas pulam o ranking
    else if (s.phase === 'reveal') send({ type: (s.question && s.question.tipo !== 'quiz') || s.qIndex >= s.total - 1 ? 'next' : 'showRanking' });
    else if (s.phase === 'ranking') send({ type: 'next' });
    else if (s.phase === 'final' && passo < 4) {
      pararSuspense(4);
      render();
    }
  }

  const onClick = (e: Event) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-act]');
    if (!b || b.disabled) return;
    const a = b.dataset.act!;
    const v = b.dataset.v || '';
    if (a === 'start') {
      send({ type: 'start' });
      ligarMusica();
      // o clique em "Começar" é o gesto que o navegador exige para a tela cheia
      telaCheia(true);
    }
    else if (a === 'reveal') send({ type: 'reveal' });
    else if (a === 'showRanking') send({ type: 'showRanking' });
    else if (a === 'next') send({ type: 'next' });
    else if (a === 'pular') {
      pararSuspense(4);
      render();
    } else if (a === 'foto') modoFoto(true);
    else if (a === 'sairfoto') modoFoto(false);
    else if (a === 'restart') {
      if (confirm('Começar de novo com as mesmas pessoas? Os pontos serão zerados.')) {
        send({ type: 'restart' });
        ligarMusica();
      }
    } else if (a === 'draw' && !spinning) send({ type: 'draw', mode: v === 'scored' ? 'scored' : 'all' });
    else if (a === 'kick') {
      const p = s?.players.find((x) => x.id === v);
      if (p && confirm(`Remover ${p.nick} da sala?`)) send({ type: 'kick', playerId: v });
    } else if (a === 'liberar') {
      const pedir = (codigo: string) => {
        liberando = true;
        send({ type: 'liberar', codigo });
      };
      if (meuAcesso()) pedir(meuAcesso());
      else abrirPagamento('/host/' + code, pedir);
    } else if (a === 'close') {
      if (confirm('Encerrar o jogo? Todo mundo sai da sala e o placar se perde.')) send({ type: 'close' });
    }
  };

  /** Modo foto: esconde tudo menos o cartão do pódio, em tela cheia se o navegador deixar. */
  /** Tela cheia da tela principal. Só funciona a partir de um clique ou tecla da pessoa. */
  function telaCheia(on: boolean) {
    try {
      if (on && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
      if (!on && document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    } catch {}
  }
  // botão fixo no canto para entrar e sair da tela cheia quando quiser
  const btnCheia = document.createElement('button');
  btnCheia.className = 'btn-cheia';
  btnCheia.type = 'button';
  const rotuloCheia = () => (btnCheia.textContent = document.fullscreenElement ? 'Sair da tela cheia' : 'Tela cheia');
  rotuloCheia();
  btnCheia.addEventListener('click', () => telaCheia(!document.fullscreenElement));
  if (document.fullscreenEnabled) document.body.appendChild(btnCheia);
  const btnSom = document.createElement('button');
  btnSom.className = 'btn-som';
  btnSom.type = 'button';
  const rotuloSom = () => {
    btnSom.textContent = somLigado() ? 'Som ligado' : 'Som desligado';
    btnSom.setAttribute('aria-pressed', String(somLigado()));
  };
  rotuloSom();
  btnSom.addEventListener('click', () => {
    // religar o som no meio do jogo (por exemplo, depois de recarregar a página) volta a música
    if (alternarSom() && s && s.phase !== 'lobby') ligarMusica();
    rotuloSom();
  });
  document.body.appendChild(btnSom);

  let cheiaAntesDaFoto = false;
  function modoFoto(on: boolean) {
    if (on) cheiaAntesDaFoto = !!document.fullscreenElement;
    document.body.classList.toggle('modo-foto', on);
    let x = document.getElementById('sair-foto');
    if (on && !x) {
      x = document.createElement('button');
      x.id = 'sair-foto';
      x.className = 'sair-foto';
      x.textContent = 'Sair do modo foto';
      x.addEventListener('click', () => modoFoto(false));
      document.body.appendChild(x);
    }
    if (!on && x) x.remove();
    // ao sair da foto, só deixa a tela cheia se ela foi ligada pelo modo foto
    telaCheia(on || cheiaAntesDaFoto);
  }
  const onFull = () => {
    rotuloCheia();
    if (!document.fullscreenElement && document.body.classList.contains('modo-foto')) modoFoto(false);
  };
  document.addEventListener('fullscreenchange', onFull);

  // seta para a direita, Page Down e espaço avançam: funciona com passador de slides
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && document.body.classList.contains('modo-foto')) return modoFoto(false);
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'A') return;
    if (e.key === 'f' || e.key === 'F') return telaCheia(!document.fullscreenElement);
    if (e.key === 'm' || e.key === 'M') {
      alternarSom();
      return rotuloSom();
    }
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

  let ultimoBipe = '';
  const clock = window.setInterval(() => {
    tick(s, sock.now());
    // um bipe a cada segundo do "Prepare-se" e um mais agudo quando libera as respostas
    if (s && s.phase === 'question') {
      const falta = s.startsAt - sock.now();
      const chave = `${s.qIndex}:${falta > 0 ? Math.ceil(falta / 1000) : 'ja'}`;
      if (chave !== ultimoBipe && falta > -400) {
        ultimoBipe = chave;
        bipe(falta <= 0);
      }
    }
  }, 100);
  main.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  // voltou do pagamento com cartão: o código fica guardado e a sala é liberada no próximo estado (ou já)
  confereVolta((codigo) => {
    liberando = true;
    send({ type: 'liberar', codigo });
  });
  main.innerHTML = `<section class="panel center"><p class="muted dots">Abrindo a sala ${code}</p></section>`;

  return () => {
    clearTimeout(destaqueTimer);
    sock.stop();
    clearInterval(clock);
    clearTimeout(prepTimer);
    pararSuspense(4);
    modoFoto(false);
    document.removeEventListener('fullscreenchange', onFull);
    btnCheia.remove();
    btnSom.remove();
    pararMusica();
    document.getElementById('entrou')?.remove();
    main.removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', wake);
    if (lock) lock.release().catch(() => {});
    main.classList.remove('tv');
  };
}

