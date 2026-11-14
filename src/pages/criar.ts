import { prepararBiblioteca, contaDosQuizzes, syncStatus, carregarQuiz, quizCurrentKey, localQuizzes, importarLocais, idsLocaisImportados, copyConflict } from '../lib/quiz-cloud';
import { track, trackOnce, leadParaSala, leadEnviado } from '../lib/measurement';
import { modeCategory } from '../lib/measurement-policy';
import { PAGINAS } from '../lib/paginas-html';
import { SITE } from '../lib/guias-html';
import { metaContext } from '../lib/meta-consent';
// /criar: editor do quiz e configuração do anfitrião (modo, visual, tempo, marca, perguntas) e abertura da sala.
// O visual só aparece depois do modo e lista apenas os visuais daquele modo. Floresta é o padrão.
import { logado } from '../lib/conta';
import { iaAcesso, openPdfQuiz, pdfButton, type PdfResult } from '../lib/pdf-quiz';
import type { Page } from '../main';
import type { CreateRoomBody, CreateRoomResult, Theme, Visual } from '../../shared/protocol';
import { LIMITS, VISUAIS_DO_MODO, compactQuestion, isReady, marcaPropria, visualDoModo } from '../../shared/rules';
import { CORES_MARCA, TEMAS, pacote } from '../data/pacotes';
import { MODELOS, type Modelo } from '../data/modelos';
import { entryTemplate, eventPlan } from '../lib/offer-context';
import { LETRAS, esc } from '../lib/dom';
import { readFoto, readLogo } from '../lib/logo';
import { navigate } from '../lib/nav';
import { type Quiz, atual, excluir, exportar, importar, listar, novoQuiz, salvar } from '../lib/quiz';
import { mandarParaComputador, receberDoCelular, textoDoLink, type Levado } from '../lib/levar';
import { store } from '../lib/storage';
import { THEME_ACC, applyTheme } from '../lib/theme';
import { VISUAIS } from '../data/visuais';
import { miniVisual } from '../lib/visuais-arte';
import { type Cobranca, abrirPagamento, iaRetomar, acessoAte, cobranca, cobrancaValendo, confereVolta, meuAcesso, salasLiberadas, testeCobranca } from '../lib/pagamento';

const CADEADO =
  '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true" focusable="false"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor" stroke="none"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>';

const TITULOS_PADRAO = ['Quiz da equipe', 'Quiz da turma', 'Quiz da galera'];
/** O quiz ainda é o de exemplo, sem nada mexido (primeira visita ao editor). */
function intocado(q: Quiz): boolean {
  const base = pacote(q.tema);
  return TITULOS_PADRAO.includes(q.titulo) && !q.logo && q.perguntas.length === base.length && q.perguntas.every((p, i) => p.t === base[i].t);
}

export function page(): Page {
  return { title: 'Criar meu quiz', fullTitle: PAGINAS['/criar'].titulo, description: PAGINAS['/criar'].descricao, canonical: `${SITE}/criar`, mount };
}

function mount(main: HTMLElement) {
  let alive = true;
  let cleanup: (() => void) | undefined;
  main.innerHTML = '<section class="panel"><p role="status">Abrindo seus quizzes…</p></section>';
  prepararBiblioteca().then(() => { if (!alive) return; if (atual().somenteNuvem) { main.innerHTML = '<section class="panel"><h1>Seu quiz está na conta</h1><p>Conecte-se para abrir o conteúdo. Sua versão salva continua na conta.</p><a class="btn" href="/criar">Tentar novamente</a></section>'; return; } cleanup = mountEditor(main); });
  return () => { alive = false; cleanup?.(); };
}

function mountEditor(main: HTMLElement) {
  let vivo = true;
  // criar com IA é da assinatura: sem conta ou sem Mensal/Anual, o botão vem com cadeado e abre os planos
  let iaTrancada = false;
  const confereIa = () =>
    iaAcesso().then((a) => {
      if (!vivo || (a === 'trancada') === iaTrancada) return;
      iaTrancada = a === 'trancada';
      trocaBotoesIa();
    });
  /** O botão da IA aparece no "Como você quer começar?" (grande) e em "Meus quizzes": os dois mudam juntos. */
  const trocaBotoesIa = () =>
    main.querySelectorAll<HTMLElement>('[data-act="pdf-ia"]').forEach((b) => (b.outerHTML = b.classList.contains('ia-grande') ? iaGrande() : pdfButton(iaTrancada)));
  void confereIa();
  const abrirIa = () =>
    openPdfQuiz(async (resultado: PdfResult) => {
      if (!vivo || !reviewOwner || contaDosQuizzes() !== reviewOwner) throw new Error('Entre novamente na conta que iniciou esta geração.');
      persist(true);
      const existente = listar().find(quiz => quiz.id === resultado.id);
      if (existente) { q = await carregarQuiz(existente.id); store.set(quizCurrentKey(), q.id); }
      else {
        const anterior = q;
        q = { ...novoQuiz(q.tema), visual: q.visual, tempo: q.tempo, marca: { ...q.marca }, logo: q.logo };
        q.id = resultado.id; q.titulo = resultado.title;
        q.perguntas = resultado.items.map(item => ({
          t:item.t, o:[...item.a], c:item.c, tl:q.tempo,
          ...(resultado.source !== 'text' && item.page != null && item.evidence ? {
            pdf:{page:item.page,evidence:item.evidence,answer:item.answer,topic:item.topic,hash:resultado.sourceSHA256},
          } : {}),
        }));
        revisao = {anterior, source:resultado.source ?? 'pdf'}; persist(true);
      }
      render(); requestAnimationFrame(focoPerguntas);
    });
  // pop-up de venda da IA; depois de pagar ou resgatar um código, confere e já abre a IA
  const vendeIa = () =>
    void abrirPagamento('/criar', () => void confereIa().then(() => {
      if (iaTrancada || !vivo) return;
      document.getElementById('pagamento')?.remove();
      abrirIa();
    }), 'anual', undefined, 'ia');
  // volta do login ou do cartão começado no pop-up da IA: abre a IA (assinante) ou os planos (logado sem plano)
  const retomaIa = async () => {
    const r = iaRetomar();
    if (!r || !logado() || revisao) return;
    const a = await iaAcesso();
    if (!vivo) return;
    iaTrancada = a === 'trancada';
    trocaBotoesIa();
    if (a === 'ok') { iaRetomar(null); abrirIa(); }
    else if (a === 'trancada' && r === 'login') vendeIa();
  };
  let q: Quiz = atual();
  let revisao: { anterior: Quiz; source: 'pdf' | 'text' } | null = null;
  const reviewOwner = contaDosQuizzes();
  const reviewKey = reviewOwner ? 'pdf-review:' + reviewOwner : null;
  const pendente = reviewKey ? store.get<{ draft: Quiz; anterior: Quiz; source?: 'pdf' | 'text' } | null>(reviewKey, null) : null;
  if (pendente?.draft && pendente?.anterior) { q = pendente.draft; revisao = { anterior: pendente.anterior, source: pendente.source ?? 'pdf' }; }
  const focoPerguntas = () => { const el = main.querySelector<HTMLElement>('#h-perg'); el?.setAttribute('tabindex','-1'); el?.focus(); };
  // veio da vitrine de modos da home: aplica o modo escolhido (o visual volta para Floresta se não existir nele)
  const temaNovo = store.get<string>('temaNovo', '');
  if (temaNovo === 'corp' || temaNovo === 'festa' || temaNovo === 'escola') {
    q.tema = temaNovo;
    q.visual = visualDoModo(q.tema, q.visual);
  }
  store.del('temaNovo');

  /** Troca as perguntas pelas 10 de um quiz pronto (respostas embaralhadas, menos as de duas opções). */
  const usarModelo = (m: Modelo) => {
    q.tema = m.tema ?? 'festa';
    q.visual = visualDoModo(q.tema, q.visual);
    q.perguntas = m.perguntas.map((x) => {
      if (x.vf) return { t: x.t, o: ['Verdadeiro', 'Falso'], c: x.c, tl: q.tempo, vf: true };
      if (x.o.length <= 2) return { t: x.t, o: [...x.o], c: x.c, tl: q.tempo };
      const idx = x.o.map((_, k) => k).sort(() => Math.random() - 0.5);
      return { t: x.t, o: idx.map((k) => x.o[k]), c: idx.indexOf(x.c), tl: q.tempo };
    });
    q.dobroUltima = true;
    // troca o nome só se ainda for um nome padrão (o do modo ou o de outro quiz pronto)
    const padroes = ['Quiz da galera', 'Quiz da equipe', 'Quiz da turma', ...MODELOS.map((x) => x.titulo)];
    if (!q.titulo.trim() || padroes.includes(q.titulo)) q.titulo = m.titulo;
  };
  // link direto para um quiz pronto (ex.: /criar?modelo=natal): começa um quiz novo com ele
  const modeloUrl = MODELOS.find((m) => m.id === entryTemplate(location.search));
  if (modeloUrl && !revisao) {
    q = novoQuiz(modeloUrl.tema ?? 'festa');
    usarModelo(modeloUrl);
    history.replaceState(null, '', location.pathname);
  }
  // primeira visita (só o quiz de exemplo, sem mexer) ou ?comecar=1 (fim do jogo, "Criar outro quiz"): "Como você quer começar?"
  const params = new URLSearchParams(location.search);
  const pediuComecar = params.get('comecar') === '1';
  const levarId = params.get('levar') || '';
  if (pediuComecar || levarId) history.replaceState(null, '', location.pathname);
  let escolhendo = !revisao && !modeloUrl && !levarId && (pediuComecar || (listar().length <= 1 && intocado(q)));
  if (pediuComecar && !intocado(q)) q = novoQuiz(q.tema);
  let verTodosProntos = false;
  let mostrarMeus = false; // "Meus quizzes" vira uma linha enquanto a pessoa escolhe como começar
  let levado: Levado | null = null; // link para abrir este quiz no computador da TV
  let levando = false;
  let erroLevar = '';
  let mostrarPessoas = true; // "Quantas pessoas vão jogar?" (dá para pular)
  let mostrarLocais = false;
  let msg = ''; // aviso geral (importação, espaço cheio)
  let aviso = ''; // aviso bom (quiz recebido do celular)
  let erro = ''; // erro ao abrir a sala
  let abrindo = false;
  let saveTimer = 0;
  let editPending = false;
  let localSaveFailed = false;
  let cob: Cobranca | null = null; // configuração da cobrança (chega depois)
  // logo e cor são do Passe e do Premium (shared/rules.ts); o servidor confere de novo ao abrir a sala
  const marcaLiberada = () => marcaPropria(q.tema, salasLiberadas(cob));
  let marcaMostrada: boolean | null = null; // como a marca foi desenhada da última vez (liberada ou com cadeado)

  const persist = (now = false) => {
    clearTimeout(saveTimer);
    saveTimer = 0;
    if (revisao) {
      editPending = false;
      localSaveFailed = !reviewKey || !store.set(reviewKey, { draft: q, ...revisao });
      refreshSaveStatus();
      return;
    }
    editPending = true;
    refreshSaveStatus();
    const snapshot = structuredClone(q);
    const go = () => {
      saveTimer = 0;
      editPending = false;
      if (!salvar(snapshot)) {
        void trackOnce('quiz_save_error', q.id + ':local', {storage:'local',error_category:'storage'});
        localSaveFailed = true;
        msg = 'Não foi possível guardar esta edição neste navegador. Exporte uma cópia antes de sair.';
        render();
      } else { localSaveFailed = false; void trackOnce('quiz_save', q.id + ':local', {storage:'local'}); }
      refreshSaveStatus();
    };
    if (now) go();
    else saveTimer = window.setTimeout(go, 300);
  };
  if (!listar().some(x => x.id === q.id)) persist(true);

  const prontas = () => q.perguntas.filter(isReady).length;

  function render(focusSel?: string) {
    if (!vivo) return;
    const temMarca = q.tema !== 'festa';
    marcaMostrada = marcaLiberada();
    applyTheme(q.tema, marcaMostrada ? q.marca.color : '');
    store.set('tema', q.tema);
    const y = window.scrollY;
    // os passos são numerados na ordem em que aparecem; a marca (cor e logo) só existe em Corporativo e Escola,
    // e só destrava com o Passe ou o Premium
    let n = 0;
    const passo = (titulo: string, id: string) => `<h2 class="passo" id="${id}"><span aria-hidden="true">${++n}</span>${titulo}</h2>`;
    main.innerHTML = [escolhendo ? secComecar() : '', secMeus(), secNome(passo, temMarca), secTema(passo), secVisual(passo), secTempo(passo), secPerguntas(passo), secAbrir(), barraAbrir()].join('');
    observaAbrir();
    window.scrollTo(0, y);
    if (focusSel) main.querySelector<HTMLElement>(focusSel)?.focus({ preventScroll: true });
  }

  function refreshSaveStatus() {
    const status = localSaveFailed ? { text: "Esta edição ainda não foi salva. Exporte uma cópia antes de sair.", conflict: false, retry: true } : revisao ? { text: 'Rascunho de IA neste aparelho · revise e salve na conta', conflict: false, retry: false } : editPending ? { text: "Salvando…", conflict: false, retry: false } : syncStatus(q.id);
    const el = main.querySelector('#quiz-save-status');
    if (el) el.textContent = status.text;
    const copy = main.querySelector<HTMLElement>('[data-act="copia-conflito"]');
    const retry = main.querySelector<HTMLElement>('[data-act="retry-save"]');
    if (copy) copy.hidden = !status.conflict;
    if (retry) retry.hidden = !status.retry;
  }

  // ---------- seções ----------

  function secMeus() {
    const todos = listar();
    // enquanto escolhe como começar, "Meus quizzes" é uma linha só (abre a lista inteira)
    if (escolhendo && !mostrarMeus)
      return `<section class="panel meus-linha" aria-labelledby="h-meus"><h1 id="h-meus" class="sr">Criar meu quiz</h1><p><b>Meus quizzes (${todos.length})</b> · ${contaDosQuizzes() ? 'na sua conta' : 'neste navegador'}</p><button type="button" class="linkbtn" data-act="ver-meus" aria-expanded="false">Abrir</button><p class="sr" id="quiz-save-status" role="status" aria-live="polite"></p></section>`;
    const account = contaDosQuizzes();
    const migrated = idsLocaisImportados();
    const locals = localQuizzes().filter(x => !migrated[x.id]);
    const status = localSaveFailed ? { text: "Esta edição ainda não foi salva. Exporte uma cópia antes de sair.", conflict: false, retry: true } : revisao ? { text: 'Rascunho de IA neste aparelho · revise e salve na conta', conflict: false, retry: false } : editPending ? { text: "Salvando…", conflict: false, retry: false } : syncStatus(q.id);
    return `<section class="panel" aria-labelledby="h-meus">
      <h1 id="h-meus" class="sr">Criar meu quiz</h1>
      <div class="tag">Meus quizzes</div><p class="small">${account ? `Na conta <b>${esc(account)}</b>` : `Neste navegador · <a href="/entrar?volta=/criar">Entre para salvar na sua conta</a>`}</p>
      <div class="quizzes">${todos
        .map(
          (x) =>
            `<div class="q${x.id === q.id ? ' on' : ''}"><b>${esc(x.titulo || 'Sem título')}</b><span class="small">${x.quantidade ?? x.perguntas.length} ${(x.quantidade ?? x.perguntas.length) === 1 ? 'pergunta' : 'perguntas'} · ${new Date(x.atualizado).toLocaleDateString('pt-BR')}</span>${
              x.id === q.id ? '<span class="small"><b>Editando</b></span>' : `<button class="btn sec small auto" data-act="abrirquiz" data-v="${x.id}">Abrir</button>`
            }<button class="linkbtn" data-act="excluirquiz" data-v="${x.id}" aria-label="Excluir ${esc(x.titulo)}">Excluir</button></div>`,
        )
        .join('')}</div>
      <div class="btnrow qd-pdf-actions">
        <button class="btn sec small" data-act="novo">Novo quiz</button>
        ${pdfButton(iaTrancada)}
        <span class="btn sec small filebtn">Importar arquivo<input type="file" id="imp" accept="application/json,.json" aria-label="Importar quiz em JSON"></span>
        <button class="btn sec small" data-act="exportar">Exportar este quiz</button>
      </div>
      <p class="small"><a href="https://quiddo.com.br/criar?recuperar=1">Recuperar quizzes do endereço antigo</a></p>
      <p class="small" id="quiz-save-status" role="status" aria-live="polite">${esc(status.text)}</p>
      <button class="btn sec small" data-act="copia-conflito"${status.conflict ? '' : ' hidden'}>Salvar minha edição como cópia</button>
      <button class="btn sec small" data-act="retry-save"${status.retry ? '' : ' hidden'}>Tentar salvar novamente</button>
      ${account && locals.length ? `<div class="quiz-migration"><button class="btn sec small" data-act="escolher-locais">Escolher quizzes deste navegador (${locals.length})</button>${mostrarLocais ? `<p class="small">Selecione os quizzes que são seus. Os originais continuam neste navegador.</p><div class="quiz-import-list">${locals.map(x => `<label><input type="checkbox" data-import-id="${esc(x.id)}"> ${esc(x.titulo || 'Sem título')} · ${x.perguntas.length} perguntas</label>`).join('')}</div><button class="btn sec small" data-act="importar-locais">Salvar selecionados na conta</button>` : ''}</div>` : ''}
      <p class="err" role="status">${esc(msg)}</p>${aviso ? `<p class="aviso-ok" role="status">${esc(aviso)}</p>` : ''}
      <a class="btn sec small ir-abrir" href="#abrir-sala">Tudo pronto? Ir para “Abrir a sala” ↓</a>
    </section>`;
  }

  type Passo = (titulo: string, id: string) => string;

  function secVisual(passo: Passo) {
    const atualV = q.visual || 'floresta';
    return `<section class="panel" aria-labelledby="h-visual">${passo(`Visual do jogo <small>(${esc(TEMAS[q.tema].nome)})</small>`, 'h-visual')}<div class="visuais" role="group" aria-labelledby="h-visual">${VISUAIS_DO_MODO[q.tema]
      .map((v) => {
        const t = VISUAIS[v];
        return `<button class="visual-op v-${v}" data-act="visual" data-v="${v}" aria-pressed="${v === atualV}">${miniVisual(v)}<span class="vtxt"><b>${esc(t.nome)}${v === 'floresta' ? ' <small>padrão</small>' : ''}</b><span>${esc(t.desc)}</span></span><span class="sw">${t.cores.map((c) => `<i style="background:${c}"></i>`).join('')}</span></button>`;
      })
      .join('')}</div><p class="small">O visual muda a tela principal, os celulares, a contagem antes de cada pergunta, a troca de pergunta e o pódio. As regras do jogo são as mesmas.</p></section>`;
  }

  function secTema(passo: Passo) {
    return `<section class="panel" aria-labelledby="h-tema">${passo('Modo', 'h-tema')}<div class="temas" role="group" aria-labelledby="h-tema">${(Object.keys(TEMAS) as Theme[])
      .map((k) => {
        const t = TEMAS[k];
        return `<button class="tema" data-act="tema" data-v="${k}" aria-pressed="${k === q.tema}"><span class="sw">${t.cores.map((c) => `<i style="background:${c}"></i>`).join('')}</span><b>${esc(t.nome)}</b><span>${esc(t.desc)}</span></button>`;
      })
      .join('')}</div><p class="small" id="modo-dica">${esc(dicaModo())}</p></section>`;
  }

  function dicaModo() {
    const marca =
      q.tema === 'festa'
        ? 'Em Amigos & família o jogo fica sem marca.'
        : marcaLiberada()
          ? 'Neste modo dá para colocar a cor e o logo da empresa ou da escola, no passo 1.'
          : 'Com o Passe ou o Premium, dá para colocar o logo e a cor da empresa ou da escola, no passo 1.';
    return `O modo é o tipo de evento: define as perguntas de modelo e os visuais que aparecem logo abaixo. ${marca}`;
  }

  function secTempo(passo: Passo) {
    return `<section class="panel" aria-labelledby="h-tempo">${passo('Tempo de cada pergunta', 'h-tempo')}
      <div class="chips big" role="group" aria-labelledby="h-tempo">${LIMITS.times.map((t) => `<button data-act="tempo" data-v="${t}" aria-pressed="${q.tempo === t}">${t} segundos</button>`).join('')}</div>
      <p class="small">Vale para todas as perguntas. Quem acerta ganha de 500 a 1.000 pontos: quanto mais rápido, mais pontos. ${q.tempo <= 10 ? 'Bom para perguntas curtas e respostas de uma palavra.' : q.tempo >= 30 ? 'Bom para perguntas longas ou que pedem conta.' : 'O ritmo mais equilibrado.'}</p></section>`;
  }

  /** Nome do quiz (que também é o nome da empresa, da turma ou do evento) e, em Corporativo e Escola, a marca. */
  function secNome(passo: Passo, temMarca: boolean) {
    const ex = q.tema === 'corp' ? 'Quiz da Convenção de Vendas 2027' : q.tema === 'escola' ? 'Revisão do 7º ano B' : 'Quiz do aniversário da Bia';
    return `<section class="panel" aria-labelledby="h-nome">${passo('Nome do quiz', 'h-nome')}
      <input type="text" id="titulo" aria-labelledby="h-nome" maxlength="${LIMITS.brandName}" value="${esc(q.titulo)}" placeholder="${ex}" aria-describedby="titulo-dica">
      <p class="small" id="titulo-dica">Junte o nome do quiz com ${q.tema === 'escola' ? 'a escola, a turma ou o evento' : q.tema === 'corp' ? 'a empresa ou o evento' : 'a ocasião'}. Ex.: ${ex}.${temMarca ? ' Aparece na tela principal e nos celulares.' : ''}</p>
      ${temMarca ? `<div id="marca" class="marca-bloco">${marcaLiberada() ? marcaCampos() : marcaTrava()}</div>` : ''}
    </section>`;
  }

  /** Sala grátis: a marca fica com cadeado e leva aos planos. O nome do quiz continua grátis. */
  function marcaTrava() {
    const salva = !!(q.marca.color || q.logo);
    return `<h3 class="sub-marca" id="h-marca">Sua marca</h3>
      <div class="marca-trava" role="group" aria-labelledby="h-marca">
        <span class="marca-trava-ic">${CADEADO}</span>
        <p class="marca-trava-txt"><b>Logo e cor da ${q.tema === 'escola' ? 'escola' : 'empresa'}</b><span>Disponível no Passe e no Premium.</span></p>
        <a class="btn sec small auto" href="/precos" data-link>Ver os planos</a>
      </div>
      <p class="small">No grátis, o jogo usa as cores do Quiddo e mostra o nome do quiz.${salva ? ' O logo e a cor que você já escolheu ficam guardados e voltam quando você liberar.' : ''}</p>`;
  }

  function marcaCampos() {
    const mc = q.marca.color;
    const ult = q.marca.ultima || CORES_MARCA[1][0];
    return `<h3 class="sub-marca" id="h-marca">Sua marca <small>(opcional)</small></h3>
      <div class="tag" id="h-cor">Cor principal</div>
      <div class="cmode" role="group" aria-labelledby="h-cor">
        <button data-act="cmode" data-v="tema" aria-pressed="${!mc}"><i style="background:${THEME_ACC[q.tema]}"></i>Cor do modo</button>
        <button data-act="cmode" data-v="marca" aria-pressed="${!!mc}"><i style="background:${mc || ult}"></i>Cor da minha marca</button>
      </div>
      ${
        mc
          ? `<div class="cbox"><div class="presets" role="group" aria-label="Sugestões de cor">${CORES_MARCA.map(
              ([c, n]) => `<button data-act="cor" data-v="${c}" aria-pressed="${mc.toLowerCase() === c.toLowerCase()}"><i style="background:${c}"></i>${n}</button>`,
            ).join('')}</div>
            <label class="pickrow" for="bC"><input type="color" id="bC" value="${esc(mc.toLowerCase())}"><span>Qualquer cor <code id="bCv">${esc(mc.toUpperCase())}</code></span></label>
            <div class="row" style="align-items:center"><span class="btn auto" aria-hidden="true" style="flex:0 0 auto">Assim fica o botão</span><span class="small">Use a cor principal do seu logo. O texto do botão fica branco ou preto, o que der mais contraste.</span></div></div>`
          : ''
      }
      <div class="tag">Logo</div>
      <div class="logoprev">${q.logo ? `<img src="${esc(q.logo)}" alt="Seu logo">` : ''}<span class="btn sec small auto filebtn">${q.logo ? 'Trocar logo' : 'Enviar logo'}<input type="file" id="bL" accept="image/png,image/jpeg,image/svg+xml,image/webp" aria-label="${q.logo ? 'Trocar logo' : 'Enviar logo'}"></span>${q.logo ? '<button class="btn sec small auto" data-act="semlogo">Remover logo</button>' : ''}</div>
      <p class="small">A cor e o logo aparecem na tela principal e nos celulares de todo mundo. PNG com fundo transparente fica melhor.</p>`;
  }

  function secPerguntas(passo: Passo) {
    const n = q.perguntas.length;
    const cheio = n >= LIMITS.maxQuestions;
    return `<section class="panel" aria-labelledby="h-perg">${passo('Perguntas', 'h-perg')}
      ${secModelos()}
      ${revisao ? `<div class="qd-pdf-review"><b>Revise seu rascunho de IA</b><p class="small">${q.perguntas.some(p => p.pdf) ? 'Confira as perguntas, as fontes e o gabarito.' : 'Confira as perguntas e o gabarito.'} A IA pode errar. Seu quiz anterior está preservado.</p><div class="btnrow"><button class="btn small auto" data-act="salvar-pdf">Salvar quiz</button><button class="btn sec small auto" data-act="voltar-pdf">Voltar ao quiz anterior</button></div><p class="err" data-pdf-erro role="status"></p></div>` : ''}
      <div class="add-topo" role="group" aria-labelledby="h-add-topo">
        <span class="add-topo-tit" id="h-add-topo"><span class="mais-ic" aria-hidden="true">+</span>Adicionar pergunta</span>
        <div class="add-topo-ops">
          <button class="btn sec" data-act="add" data-pos="topo"${cheio ? ' disabled' : ''}><b>Múltipla escolha</b><span>de 2 a 4 respostas, uma certa</span></button>
          <button class="btn sec" data-act="addvf" data-pos="topo"${cheio ? ' disabled' : ''}><b>Verdadeiro ou falso</b><span>uma afirmação, duas respostas</span></button>
        </div>
      </div>
      <p class="small" id="h-perg-n">${contagem()}</p>
      <div class="qlist">${q.perguntas.map((_, i) => editorPergunta(i, n)).join('')}</div>
      <div class="tag">Adicionar pergunta no fim</div>
      <div class="add-tipos">
        <button class="btn sec" data-act="add"${cheio ? ' disabled' : ''}><b>Múltipla escolha</b><span>de 2 a 4 respostas, uma certa</span></button>
        <button class="btn sec" data-act="addvf"${cheio ? ' disabled' : ''}><b>Verdadeiro ou falso</b><span>uma afirmação, duas respostas</span></button>
      </div>
      <button class="toggle" data-act="dobro" aria-pressed="${!!q.dobroUltima}"><span class="chave" aria-hidden="true"></span><span><b>A última pergunta vale o dobro</b><br><small>Dá chance de virada no fim. Vale para a última pergunta com resposta certa.</small></span></button>
    </section>`;
  }

  /** Quizzes prontos de todos os modos: um toque carrega as 10 perguntas (e o modo do quiz), e dá para editar tudo. */
  function secModelos() {
    return `<details class="modelos"><summary><b>Trocar por um quiz pronto</b> <span class="small">(${MODELOS.length} quizzes, 10 perguntas cada)</span></summary>
      <div class="modelos-lista">${MODELOS.map(cartaoModelo).join('')}</div></details>`;
  }

  /** Cartão de um quiz pronto, com o modo dele. */
  const cartaoModelo = (m: Modelo) =>
    `<button class="btn sec modelo" data-act="modelo" data-v="${m.id}"><b>${esc(m.nome)}</b><span>${esc(m.desc)} · <b>${esc(TEMAS[m.tema ?? 'festa'].nome)}</b></span></button>`;

  /** Botão grande da IA no "Como você quer começar?". */
  const iaGrande = () => pdfButton(iaTrancada).replace('class="btn small qd-pdf-button"', 'class="btn qd-pdf-button ia-grande"');

  /**
   * "Como você quer começar?": quizzes prontos de todos os modos em cima; embaixo, com mais destaque,
   * "Começar do zero" (em outra cor) e "Criar com IA".
   */
  function secComecar() {
    const destaque = ['natal', 'confraternizacao', 'quebra-gelo', 'escola-fim-de-ano'];
    const primeiros = destaque.map((id) => MODELOS.find((m) => m.id === id)).filter((m): m is Modelo => !!m);
    const resto = MODELOS.filter((m) => !destaque.includes(m.id));
    return `<section class="panel comecar" aria-labelledby="h-comecar">
      <h2 id="h-comecar"><span class="comecar-ic" aria-hidden="true">✓</span>Como você quer começar?</h2>
      <p class="small">Escolha um quiz pronto com 10 perguntas, troque o que quiser e abra a sala.</p>
      <h3 class="comecar-sub">Quizzes prontos</h3>
      <div class="modelos-lista prontos">${primeiros.map(cartaoModelo).join('')}${verTodosProntos ? resto.map(cartaoModelo).join('') : ''}</div>
      ${verTodosProntos ? '' : `<button type="button" class="linkbtn" data-act="ver-prontos">Ver os ${MODELOS.length} quizzes prontos</button>`}
      <div class="comecar-outros" role="group" aria-labelledby="h-comecar-outros">
        <p class="comecar-ou" id="h-comecar-outros">Ou crie o seu</p>
        <button type="button" class="btn comecar-zero" data-act="zero"><b>Começar do zero</b><span>Escreva as suas perguntas</span></button>
        ${iaGrande()}
        <p class="small comecar-ia-txt">Com IA: conte o tema ou envie um PDF e as perguntas ficam prontas em segundos.</p>
      </div>
    </section>`;
  }

  /** Celular: "Abrir a sala" sempre à vista, numa barra fixa embaixo (some quando o painel de abrir aparece). */
  function barraAbrir() {
    if (escolhendo) return '';
    const n = prontas();
    return `<div class="abrir-fixo" id="abrir-fixo"><button type="button" class="btn" data-act="ir-abrir"${n ? '' : ' disabled'}>${n ? `Abrir a sala com ${n} ${n === 1 ? 'pergunta' : 'perguntas'}` : 'Complete ao menos uma pergunta'}</button><p class="small">${contaDosQuizzes() ? 'Salvo na sua conta' : 'Salvo neste navegador'} · ${cob && cobrancaValendo(cob) && !meuAcesso() ? `grátis até ${cob.gratis} pessoas` : 'pronto para jogar'}</p></div>`;
  }

  let obsAbrir: IntersectionObserver | null = null;
  function observaAbrir() {
    obsAbrir?.disconnect();
    const alvo = main.querySelector('#abrir-sala');
    const barra = main.querySelector<HTMLElement>('#abrir-fixo');
    if (!alvo || !barra || typeof IntersectionObserver === 'undefined') return;
    obsAbrir = new IntersectionObserver(([e]) => barra.classList.toggle('escondida', e.isIntersecting), { rootMargin: '0px 0px -40px 0px' });
    obsAbrir.observe(alvo);
  }

  const nomeTipo = (p: Quiz['perguntas'][number]) => (p.vf ? 'Verdadeiro ou falso' : p.tipo === 'opiniao' ? 'Enquete' : p.tipo === 'quem' ? 'Quem é mais provável' : 'Múltipla escolha');
  const titulo = (i: number) => `${nomeTipo(q.perguntas[i])} ${i + 1}${isReady(q.perguntas[i]) ? '' : ' · falta completar'}`;

  const contagem = () => `${prontas()} de ${q.perguntas.length} prontas.${q.perguntas.some(p => p.pdf) ? ' Confira as fontes e o gabarito antes de jogar.' : q.perguntas.length <= 2 ? ' As 2 primeiras são só modelos: edite ou remova.' : ''} Marque a resposta certa de cada uma (no celular, toque na letra).`;

  function editorPergunta(i: number, n: number) {
    const p = q.perguntas[i];
    const ok = isReady(p);
    const num = i + 1;
    return `<div class="qed${ok ? '' : ' inc'}" data-i="${i}">
      <div class="hd"><span id="qh${i}">${titulo(i)}</span><span class="tools">
        <button data-act="up" data-i="${i}" aria-label="Subir a pergunta ${num}"${i === 0 ? ' disabled' : ''}>↑</button>
        <button data-act="down" data-i="${i}" aria-label="Descer a pergunta ${num}"${i === n - 1 ? ' disabled' : ''}>↓</button>
        <button data-act="dup" data-i="${i}" aria-label="Duplicar a pergunta ${num}"${n >= LIMITS.maxQuestions ? ' disabled' : ''}>Duplicar</button>
        <button data-act="del" data-i="${i}" aria-label="Remover a pergunta ${num}">Remover</button></span></div>
      <textarea data-i="${i}" data-f="t" maxlength="${LIMITS.questionText}" aria-label="Texto da pergunta ${num}" placeholder="${
        p.vf ? 'Escreva uma afirmação. Ex.: O Brasil tem 26 estados e o Distrito Federal.' : p.tipo === 'quem' ? 'Ex.: Quem é mais provável chegar atrasado no próprio casamento?' : p.tipo === 'opiniao' ? 'Ex.: Praia ou montanha?' : 'Escreva a pergunta'
      }">${esc(p.t)}</textarea>
      ${p.pdf ? `<p class="small qd-pdf-source"><b>Fonte original · pág. ${p.pdf.page}</b><br>${esc(p.pdf.evidence)}<br>Resposta original: ${esc(p.pdf.answer)}. Confira a fonte novamente se editar a pergunta.</p>` : ''}
      ${
        p.img
          ? `<div class="qimg-ed"><img src="${esc(p.img)}" alt="Imagem da pergunta ${num}"><button class="btn sec small auto" data-act="semimg" data-i="${i}">Remover imagem</button></div>`
          : `<span class="btn sec small auto filebtn">Adicionar imagem<input type="file" data-img="${i}" accept="image/png,image/jpeg,image/webp,image/gif" aria-label="Adicionar imagem à pergunta ${num}"></span>`
      }
      ${p.tipo === 'quem' ? '<p class="small">Não precisa escrever opções: na hora do jogo, cada celular mostra a lista das pessoas da sala, com o bicho de cada uma. Não vale ponto.</p>' : ''}
      ${p.tipo === 'opiniao' ? '<p class="small">Enquete: não tem resposta certa e não vale ponto. A tela principal mostra quantos votaram em cada opção.</p>' : ''}
      ${(p.tipo === 'quem' ? [] : p.o)
        .map(
          (o, k) => `<div class="opt-ed${p.c === k && !p.tipo ? ' certa' : ''}"><span class="lt c${k}" aria-hidden="true">${LETRAS[k]}</span>
        <input type="text" data-i="${i}" data-f="o" data-k="${k}" maxlength="${LIMITS.answerText}" value="${esc(o)}" placeholder="${p.tipo === 'opiniao' ? 'Opção' : 'Resposta'} ${LETRAS[k]}" aria-label="${p.tipo === 'opiniao' ? 'Opção' : 'Resposta'} ${LETRAS[k]} da pergunta ${num}"${p.vf ? ' readonly' : ''}>
        ${p.tipo === 'opiniao' ? '<span></span>' : `<label class="marca-certa" data-letra="${LETRAS[k]}" style="--cor:var(--a${k + 1})"><input type="radio" name="c${i}" data-i="${i}" data-f="c" data-k="${k}"${p.c === k ? ' checked' : ''} aria-label="Resposta ${LETRAS[k]} é a certa"><span>${p.c === k ? 'Certa' : 'certa'}</span></label>`}
        ${p.o.length > 2 && !p.vf ? `<button class="x" data-act="delopt" data-i="${i}" data-k="${k}" aria-label="Tirar a resposta ${LETRAS[k]} da pergunta ${num}">×</button>` : '<span></span>'}</div>`,
        )
        .join('')}
      ${p.o.length < 4 && !p.vf && p.tipo !== 'quem' ? `<button class="linkbtn" style="justify-self:start" data-act="addopt" data-i="${i}">Adicionar resposta</button>` : ''}
    </div>`;
  }

  function secAbrir() {
    const n = prontas();
    return `<section class="panel" id="abrir-sala" aria-label="Abrir a sala">${secPessoas()}<button class="btn" data-act="abrir"${n && !abrindo ? '' : ' disabled'}>${abrindo ? 'Abrindo a sala…' : n ? `Abrir a sala com ${n} ${n === 1 ? 'pergunta' : 'perguntas'}` : 'Complete ao menos uma pergunta'}</button>
      <p class="err" role="alert">${esc(erro)}</p>
      <p class="small">${celular() ? 'Está no computador que vai para a TV? Abra a sala aqui. A turma joga pelo celular.' : 'Abra a sala no computador que vai para o telão ou o projetor. A turma joga pelo celular.'}</p>${secLevar()}${secPlano()}</section>`;
  }

  /** Celular ou tablet: aqui o quiz é preparado, mas a sala costuma abrir no computador da TV. */
  const celular = () => matchMedia('(max-width: 760px), (pointer: coarse)').matches;

  /** "Mandar para o computador": um link de 7 dias que abre este mesmo quiz no outro aparelho. */
  function secLevar() {
    if (!celular() && !levado) return '';
    const n = prontas();
    if (levado) {
      const txt = textoDoLink(q.titulo, levado.url);
      return `<div class="levar" id="levar" role="group" aria-labelledby="h-levar"><h3 id="h-levar">Link pronto para o computador</h3>
        <p class="small">Abra no computador da TV. ${levado.semImagens ? 'As imagens ficaram de fora porque o quiz é grande: adicione de novo por lá. ' : ''}O link vale 7 dias.</p>
        <p class="levar-url"><code>${esc(levado.url.replace(/^https?:\/\//, ''))}</code></p>
        <div class="btnrow">
          <a class="btn wa" href="https://wa.me/?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener">Mandar no WhatsApp</a>
          <a class="btn sec" href="mailto:?subject=${encodeURIComponent('Quiz para abrir no computador')}&body=${encodeURIComponent(txt)}">Mandar por e-mail</a>
          <button type="button" class="btn sec" data-act="copiar-levar">Copiar o link</button>
        </div></div>`;
    }
    return `<div class="levar" id="levar" role="group" aria-labelledby="h-levar"><h3 id="h-levar">Vai apresentar no computador da TV?</h3>
      <p class="small">Mande este quiz para lá. Chega um link no seu WhatsApp ou e-mail; abra no computador e ${n ? `as ${n} perguntas já estão lá` : 'o quiz já está lá'}, prontas para abrir a sala.</p>
      <button type="button" class="btn sec" data-act="levar"${levando || !q.perguntas.length ? ' disabled' : ''}>${levando ? 'Preparando o link…' : 'Mandar para o computador'}</button>
      <p class="err" role="alert">${esc(erroLevar)}</p>
      ${contaDosQuizzes() ? '' : '<p class="small">Ou <a href="/entrar?volta=/criar">entre com o mesmo e-mail</a> nos dois aparelhos: os quizzes ficam na sua conta.</p>'}</div>`;
  }

  /** "Quantas pessoas vão jogar?": acima de 10, mostra o plano certo antes do evento (dá para pular). */
  function secPessoas() {
    if (!mostrarPessoas || !cob || !cobrancaValendo(cob)) return '';
    const v = store.get<string>('pessoas:' + q.id, '');
    if (v === 'pular') return '';
    const ops: [string, string][] = [['ate10', `Até ${cob.gratis}`], ['11a30', '11 a 30'], ['31a100', '31 a 100'], ['100mais', 'Mais de 100']];
    return `<fieldset class="quantas"><legend>Quantas pessoas vão jogar?</legend>
      <div class="chips" role="group">${ops.map(([k, t]) => `<button type="button" data-act="pessoas" data-v="${k}" aria-pressed="${v === k}">${t}</button>`).join('')}</div>
      ${v ? planoPessoas(v) : '<button type="button" class="linkbtn" data-act="pessoas" data-v="pular">Pular</button>'}</fieldset>`;
  }

  function planoPessoas(v: string) {
    if (!cob) return '';
    if (v === 'ate10') return `<p class="quantas-ok">A sala grátis dá conta: até ${cob.gratis} pessoas, sem pagar nada.</p>`;
    if (salasLiberadas(cob)) return `<p class="quantas-ok">Tudo certo: suas salas vão até ${cob.pago} pessoas.</p>`;
    const passe = cob.planos.find((p) => p.id === 'semana');
    const anual = cob.planos.find((p) => p.id === 'anual');
    const mensal = cob.planos.find((p) => p.id === 'mensal');
    const porMes = anual ? (Number(anual.preco.replace(',', '.')) / 12).toFixed(2).replace('.', ',').replace(/,00$/, '') : mensal?.preco.replace(/,00$/, '');
    const faixa = v === '11a30' ? '11 a 30 pessoas' : v === '31a100' ? '31 a 100 pessoas' : 'mais de 100 pessoas';
    return `<div class="quantas-plano"><p><b>Para ${faixa}, a sala grátis não basta</b> (vai até ${cob.gratis}). Libere antes do evento, sem susto na hora:</p>
      <ul>${passe ? `<li><b>Passe 7 dias</b>: R$ ${esc(passe.preco.replace(/,00$/, ''))}, pagamento único, bom para um evento.</li>` : ''}${porMes ? `<li><b>Assinatura Premium</b>: a partir de R$ ${esc(porMes)} por mês, para quem faz quiz sempre (com o quiz com IA).</li>` : ''}</ul>
      <div class="btnrow"><button type="button" class="btn" data-act="liberar-pessoas">Liberar até ${cob.pago} pessoas</button><button type="button" class="linkbtn" data-act="pessoas" data-v="pular">Decidir depois</button></div></div>`;
  }

  /** Grátis até 10 pessoas por sala; quem pagou (código guardado neste navegador) abre salas de até 200. */
  function secPlano() {
    return `<div id="plano">${plano()}</div>`;
  }
  function plano() {
    if (!cobrancaValendo(cob) || !cob) return '';
    const pessoas = store.get<string>('pessoas:' + q.id, '');
    // quem já disse que vem mais de 10 pessoas vê o plano certo logo acima; aqui não repete
    if (!meuAcesso() && ['11a30', '31a100', '100mais'].includes(pessoas)) return '';
    const marca = q.tema !== 'festa';
    if (meuAcesso())
      return `<p class="plano liberado"><span class="selo">Quiddo liberado</span> Salas de até ${cob.pago} pessoas${marca ? ' e a sua marca' : ''} neste navegador${acessoAte() ? `, até ${esc(acessoAte())}` : ''}. Código: <strong>${esc(meuAcesso())}</strong></p>`;
    const menor = esc(Math.min(...cob.planos.map((p) => Number(p.preco.replace(',', '.')))).toFixed(2).replace('.', ','));
    return `<div class="plano"><p>${
      marca
        ? `Sala grátis: até ${cob.gratis} pessoas, com as cores do Quiddo. Com o Passe ou o Premium, até ${cob.pago} pessoas e a sua marca, a partir de R$ ${menor}.`
        : `Sala grátis: até ${cob.gratis} pessoas. Vai ter mais gente? Libere salas de até ${cob.pago} pessoas, a partir de R$ ${menor}.`
    } Dá para liberar também depois, com a sala aberta.</p>
      <div class="plano-acoes"><button type="button" class="btn sec auto" data-act="liberar">Liberar até ${cob.pago} pessoas</button><a class="linkbtn" href="/precos" data-link>Ver os planos</a></div></div>`;
  }

  // ---------- ações ----------

  async function abrirSala() {
    const prontasLista = q.perguntas.filter(isReady);
    // "a última vale o dobro": a última pergunta com resposta certa (enquete não vale ponto)
    const ultimaQuiz = q.dobroUltima ? prontasLista.map((p) => !p.tipo || p.tipo === 'quiz').lastIndexOf(true) : -1;
    const questions = prontasLista
      .map((p, i) => compactQuestion({ ...p, tl: q.tempo, dobro: i === ultimaQuiz }))
      .filter((p): p is NonNullable<typeof p> => !!p);
    const festa = q.tema === 'festa';
    // logo e cor salvos vão mesmo com cadeado: o servidor guarda e só mostra se a sala for liberada (Passe ou Premium),
    // inclusive quando o anfitrião libera com a sala aberta
    const body: CreateRoomBody = { questions, theme: q.tema, visual: visualDoModo(q.tema, q.visual), brand: festa ? { name: '', color: '' } : { name: q.titulo.trim(), color: q.marca.color }, logo: festa ? '' : q.logo, acesso: meuAcesso() || undefined, testeCobranca: testeCobranca() || undefined };
    abrindo = true;
    erro = '';
    render();
    try {
      void track('create_room_start', {question_count: questions.length});
      // Lead (uma vez por navegador, só com aceite de anúncios): o servidor recebe o id aleatório e o consentimento.
      const lead = await leadParaSala();
      const meta = lead ? metaContext() : null;
      const r = await fetch('/api/salas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead && meta ? { ...body, lead: lead.id, meta } : body) });
      const d = (await r.json().catch(() => ({}))) as Partial<CreateRoomResult> & { erro?: string };
      if (!r.ok || !d.code || !d.hostKey) throw new Error(d.erro || 'Não deu para abrir a sala agora. Tente de novo.');
      store.set('host:' + d.code, d.hostKey);
      // CreateRoom continua a cada sala aberta; o modo vira categoria (corporativo, familia ou escola).
      const modo = modeCategory(q.tema);
      const medido = await track('create_room', { question_count: questions.length, ...(modo ? { modo } : {}), ...(lead ? { lead_id: lead.eventId } : {}) });
      if (lead && medido) leadEnviado(lead.id);
      navigate('/host/' + d.code);
    } catch (e) {
      void track('create_room_error', {error_category:e instanceof TypeError ? 'network' : 'rejected'});
      abrindo = false;
      erro = e instanceof Error && e.message !== 'Failed to fetch' ? e.message : 'Sem conexão com a internet. Confira e tente de novo.';
      render();
    }
  }

  /** Guarda uma cópia por 7 dias e mostra o link para abrir no computador da TV. */
  async function levar() {
    if (levando) return;
    persist(true);
    levando = true;
    erroLevar = '';
    render('[data-act="levar"]');
    try {
      levado = await mandarParaComputador(q);
      void track('quiz_handoff', { question_count: prontas() });
      levando = false;
      render('#h-levar');
      main.querySelector<HTMLElement>('#h-levar')?.setAttribute('tabindex', '-1');
      main.querySelector<HTMLElement>('#h-levar')?.focus();
      // no celular, abre direto o compartilhar (WhatsApp, e-mail, AirDrop…)
      const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
      if (nav.share && celular()) nav.share({ title: 'Quiz para abrir no computador', text: textoDoLink(q.titulo, levado.url) }).catch(() => {});
    } catch (e) {
      levando = false;
      erroLevar = e instanceof Error ? e.message : 'Não deu para preparar o link agora. Tente de novo.';
      render('[data-act="levar"]');
    }
  }

  const onClick = async (e: Event) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!b || (b as HTMLButtonElement).disabled) return;
    const a = b.dataset.act!;
    const v = b.dataset.v || '';
    const i = Number(b.dataset.i);
    const p = q.perguntas[i];
    if (revisao && ['novo','abrirquiz','excluirquiz','modelo','abrir','importar-locais','copia-conflito','zero'].includes(a)) {
      const aviso = main.querySelector('[data-pdf-erro]'); if (aviso) aviso.textContent = 'Salve o rascunho ou volte ao quiz anterior antes de continuar.';
      return focoPerguntas();
    }
    msg = '';
    aviso = '';
    if (saveTimer) persist(true);
    switch (a) {
      case 'modelo': {
        const m = MODELOS.find((x) => x.id === v);
        if (!m) return;
        const padrao = new Set(TEMAS[q.tema].pacote.map((x) => x.t));
        const mexeu = q.perguntas.some((x) => x.t.trim() && !padrao.has(x.t));
        if (mexeu && !confirm(`Trocar as perguntas atuais pelas 10 do quiz "${m.nome}"?`)) return;
        usarModelo(m);
        escolhendo = false;
        void track('quiz_template_apply', {source:'template'});
        persist(true);
        render('textarea[data-i="0"]');
        return main.querySelector('#h-perg')?.scrollIntoView({ block: 'start' });
      }
      case 'zero':
        // do zero: uma pergunta em branco (sem as de exemplo) e o foco no nome do quiz
        q.perguntas = [{ t: '', o: ['', '', '', ''], c: 0, tl: q.tempo }];
        q.dobroUltima = false;
        escolhendo = false;
        void track('quiz_create', {source:'manual'});
        persist(true);
        render('#titulo');
        return main.querySelector('#h-nome')?.scrollIntoView({ block: 'start' });
      case 'ver-prontos':
        verTodosProntos = true;
        return render(`[data-act="modelo"][data-v="${MODELOS.find((m) => !['natal', 'confraternizacao', 'quebra-gelo', 'escola-fim-de-ano'].includes(m.id))?.id}"]`);
      case 'ver-meus':
        mostrarMeus = true;
        return render('#h-meus');
      case 'ir-abrir': {
        const alvo = main.querySelector<HTMLElement>('#abrir-sala');
        alvo?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        main.querySelector<HTMLElement>('[data-act="abrir"]')?.focus({ preventScroll: true });
        return;
      }
      case 'pessoas':
        if (v === 'pular') {
          store.set('pessoas:' + q.id, 'pular');
          mostrarPessoas = false;
          refreshPlano();
          return render('[data-act="abrir"]');
        }
        store.set('pessoas:' + q.id, v);
        return render(`[data-act="pessoas"][data-v="${v}"]`);
      case 'liberar-pessoas':
        abrirPagamento('/criar', () => render('[data-act="abrir"]'), 'semana');
        return;
      case 'levar':
        return void levar();
      case 'copiar-levar':
        if (levado) {
          navigator.clipboard?.writeText(levado.url).then(() => (b.textContent = 'Link copiado!'), () => prompt('Copie o link:', levado!.url));
        }
        return;
      case 'pdf-ia':
        if (revisao) return focoPerguntas();
        if (iaTrancada || (await iaAcesso()) === 'trancada') {
          iaTrancada = true;
          return vendeIa();
        }
        abrirIa();
        return;
      case 'salvar-pdf': {
        if (!revisao) return;
        const aviso = main.querySelector('[data-pdf-erro]');
        if (!q.titulo.trim() || !q.perguntas.length || prontas() !== q.perguntas.length) { if (aviso) aviso.textContent = 'Preencha o título e revise todas as perguntas antes de salvar.'; return; }
        if (!salvar(q)) { if (aviso) aviso.textContent = 'Não deu para salvar neste navegador.'; return; }
        void trackOnce('quiz_create',q.id+':'+revisao.source,{source:revisao.source});
        revisao = null; if (reviewKey) store.del(reviewKey); localSaveFailed = false; msg = 'Quiz salvo. Nenhum crédito adicional foi usado.';
        return render('[data-act="pdf-ia"]');
      }
      case 'voltar-pdf':
        if (!revisao) return;
        q = revisao.anterior; revisao = null; if (reviewKey) store.del(reviewKey); localSaveFailed = false; store.set(quizCurrentKey(),q.id);
        return render('[data-act="pdf-ia"]');
      case 'novo':
        levado = null;
        q = novoQuiz(q.tema);
        void track('quiz_create', {source:'manual'});
        persist(true);
        return render('#titulo');
      case 'abrirquiz': {
        try { q = await carregarQuiz(v); store.set(quizCurrentKey(), q.id); }
        catch (error) { msg = error instanceof Error ? error.message : 'Não foi possível abrir.'; }
        return render();
      }
      case 'retry-save':
        persist(true); refreshSaveStatus(); return;
      case 'copia-conflito':
        try { q = await copyConflict(q); store.set(quizCurrentKey(), q.id); }
        catch (error) { msg = error instanceof Error ? error.message : 'Não foi possível guardar a cópia.'; }
        return render();
      case 'escolher-locais':
        mostrarLocais = !mostrarLocais; return render();
      case 'importar-locais': {
        const ids = Array.from(main.querySelectorAll<HTMLInputElement>('[data-import-id]:checked')).map(x => x.dataset.importId!);
        if (!ids.length) { msg = 'Selecione ao menos um quiz.'; return render(); }
        try { const imported = importarLocais(ids); if (imported) { q = imported; store.set(quizCurrentKey(), q.id); } mostrarLocais = false; }
        catch (error) { msg = error instanceof Error ? error.message : 'Não foi possível levar os quizzes.'; }
        return render();
      }
      case 'excluirquiz': {
        const x = listar().find((y) => y.id === v);
        if (!x || !confirm(`Excluir “${x.titulo}”? Não dá para desfazer.`)) return;
        try { await excluir(v); }
        catch (error) { msg = error instanceof Error ? error.message : 'Não foi possível excluir.'; return render(); }
        if (v === q.id) {
          const next = listar()[0];
          if (next) { q = await carregarQuiz(next.id); store.set(quizCurrentKey(), q.id); }
          else { q = novoQuiz(q.tema); persist(true); }
        }
        return render();
      }
      case 'exportar': {
        const blob = new Blob([exportar(q)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = (q.titulo || 'quiz').normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() + '.json';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }
      case 'tema':
        q.tema = v as Theme;
        q.visual = visualDoModo(q.tema, q.visual);
        persist();
        return render(`[data-act="tema"][data-v="${v}"]`);
      case 'visual':
        q.visual = visualDoModo(q.tema, v as Visual);
        persist();
        return render(`[data-act="visual"][data-v="${v}"]`);
      case 'cmode':
        if (v === 'marca') q.marca.color = q.marca.ultima || CORES_MARCA[1][0];
        else q.marca.color = '';
        persist();
        return render(`[data-act="cmode"][data-v="${v}"]`);
      case 'cor':
        q.marca.color = v;
        q.marca.ultima = v;
        persist();
        return render(`[data-act="cor"][data-v="${v}"]`);
      case 'semlogo':
        q.logo = '';
        persist();
        return render('#bL');
      case 'addop':
        q.perguntas.push({ t: '', o: ['', ''], c: -1, tl: q.tempo, tipo: 'opiniao' });
        persist();
        render();
        return main.querySelector<HTMLElement>(`textarea[data-i="${q.perguntas.length - 1}"]`)?.focus();
      case 'addquem':
        q.perguntas.push({ t: '', o: [], c: -1, tl: q.tempo, tipo: 'quem' });
        persist();
        render();
        return main.querySelector<HTMLElement>(`textarea[data-i="${q.perguntas.length - 1}"]`)?.focus();
      case 'dobro':
        q.dobroUltima = !q.dobroUltima;
        persist();
        return render('[data-act="dobro"]');
      case 'addvf':
      case 'add': {
        // o "+" de cima põe a pergunta nova no topo da lista; os botões de baixo, no fim
        const nova = a === 'addvf' ? { t: '', o: ['Verdadeiro', 'Falso'], c: 0, tl: q.tempo, vf: true } : { t: '', o: ['', '', '', ''], c: 0, tl: q.tempo };
        const topo = b.dataset.pos === 'topo';
        if (topo) q.perguntas.unshift(nova);
        else q.perguntas.push(nova);
        persist();
        render();
        const el = main.querySelector<HTMLElement>(`textarea[data-i="${topo ? 0 : q.perguntas.length - 1}"]`);
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return el?.focus({ preventScroll: true });
      }
      case 'semimg':
        delete p.img;
        persist();
        return render(`input[data-img="${i}"]`);
      case 'up':
      case 'down': {
        const j = a === 'up' ? i - 1 : i + 1;
        if (j < 0 || j >= q.perguntas.length) return;
        [q.perguntas[i], q.perguntas[j]] = [q.perguntas[j], q.perguntas[i]];
        persist();
        // o foco acompanha a pergunta; se o botão ficou desabilitado, vai para o outro
        return render(`[data-act="${a}"][data-i="${j}"]:not([disabled]), [data-act="${a === 'up' ? 'down' : 'up'}"][data-i="${j}"]`);
      }
      case 'dup':
        q.perguntas.splice(i + 1, 0, { ...p, o: [...p.o] });
        persist();
        return render(`textarea[data-i="${i + 1}"]`);
      case 'del':
        if ((p.t.trim() || p.o.some((o) => o.trim())) && !confirm(`Remover a pergunta ${i + 1}?`)) return;
        q.perguntas.splice(i, 1);
        persist();
        return render(q.perguntas.length ? `textarea[data-i="${Math.min(i, q.perguntas.length - 1)}"]` : '[data-act="add"]');
      case 'addopt':
        p.o.push('');
        persist();
        render();
        return main.querySelector<HTMLElement>(`input[data-i="${i}"][data-k="${p.o.length - 1}"]`)?.focus();
      case 'delopt': {
        const k = Number(b.dataset.k);
        p.o.splice(k, 1);
        if (p.c === k) p.c = 0;
        else if (p.c > k) p.c--;
        persist();
        return render(`input[data-i="${i}"][data-f="o"][data-k="${Math.min(k, p.o.length - 1)}"]`);
      }
      case 'tempo':
        q.tempo = Number(v);
        q.perguntas.forEach((x) => (x.tl = q.tempo));
        persist();
        return render(`[data-act="tempo"][data-v="${v}"]`);
      case 'abrir':
        abrirSala();
        return;
      case 'liberar':
        abrirPagamento('/criar', refreshPlano, eventPlan(q.tema));
        return;
    }
  };

  /** Depois de digitar, atualiza só o que depende do texto, sem redesenhar e perder o foco. */
  const refreshCounts = (i?: number) => {
    if (i != null) {
      const box = main.querySelector<HTMLElement>(`.qed[data-i="${i}"]`);
      const ok = isReady(q.perguntas[i]);
      if (box) box.classList.toggle('inc', !ok);
      const h = main.querySelector(`#qh${i}`);
      if (h) h.textContent = titulo(i);
    }
    const n = prontas();
    const tag = main.querySelector('#h-perg-n');
    if (tag) tag.textContent = contagem();
    for (const btn of main.querySelectorAll<HTMLButtonElement>('[data-act="abrir"], [data-act="ir-abrir"]')) {
      if (abrindo && btn.dataset.act === 'abrir') continue;
      btn.disabled = !n;
      btn.textContent = n ? `Abrir a sala com ${n} ${n === 1 ? 'pergunta' : 'perguntas'}` : 'Complete ao menos uma pergunta';
    }
  };

  const onInput = (e: Event) => {
    const t = e.target as HTMLInputElement;
    const ds = t.dataset;
    if (ds.f === 't' || ds.f === 'o') {
      void trackOnce('quiz_edit_start', q.id, {source:'manual'});
      const i = Number(ds.i);
      if (ds.f === 't') q.perguntas[i].t = t.value;
      else q.perguntas[i].o[Number(ds.k)] = t.value;
      persist();
      return refreshCounts(i);
    }
    if (t.id === 'titulo') {
      void trackOnce('quiz_edit_start', q.id, {source:'manual'});
      q.titulo = t.value;
      // o nome também muda na lista de "Meus quizzes"
      const item = main.querySelector('.quizzes .q.on b');
      if (item) item.textContent = t.value || 'Sem título';
    }
    else if (t.id === 'bC') {
      q.marca.color = t.value.toUpperCase();
      q.marca.ultima = q.marca.color;
      applyTheme(q.tema, q.marca.color);
      const cv = main.querySelector('#bCv');
      if (cv) cv.textContent = q.marca.color;
      main.querySelectorAll<HTMLElement>('[data-act="cor"]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.v!.toLowerCase() === t.value.toLowerCase())));
      const sw = main.querySelector<HTMLElement>('[data-act="cmode"][data-v="marca"] i');
      if (sw) sw.style.background = t.value;
    } else return;
    persist();
  };

  const onChange = async (e: Event) => {
    const t = e.target as HTMLInputElement;
    if (t.dataset.f === 'c') {
      const i = Number(t.dataset.i);
      const k = Number(t.dataset.k);
      q.perguntas[i].c = k;
      persist();
      // destaca a linha da resposta certa sem redesenhar (o foco continua no botão de opção)
      main.querySelectorAll<HTMLElement>(`.qed[data-i="${i}"] .opt-ed`).forEach((row, j) => {
        row.classList.toggle('certa', j === k);
        const lab = row.querySelector('.marca-certa span');
        if (lab) lab.textContent = j === k ? 'Certa' : 'certa';
      });
      return refreshCounts(i);
    }
    if (t.dataset.img != null && t.files && t.files[0]) {
      const i = Number(t.dataset.img);
      try {
        q.perguntas[i].img = await readFoto(t.files[0]);
        persist(true);
        msg = '';
      } catch (err) {
        msg = err instanceof Error ? err.message : 'Não deu para ler essa imagem.';
        alert(msg);
      }
      return render(`[data-act="semimg"][data-i="${i}"]`);
    }
    if (t.id === 'bL' && t.files && t.files[0]) {
      try {
        q.logo = await readLogo(t.files[0]);
        persist(true);
      } catch (err) {
        msg = err instanceof Error ? err.message : 'Não deu para ler essa imagem.';
      }
      return render('#bL');
    }
    if (t.id === 'imp' && t.files && t.files[0]) {
      if (revisao) { t.value = ''; const aviso = main.querySelector('[data-pdf-erro]'); if (aviso) aviso.textContent = 'Salve o rascunho ou volte ao quiz anterior para importar.'; return focoPerguntas(); }
      try {
        q = importar(await t.files[0].text());
        void track('quiz_create', {source:'import'});
        persist(true);
        msg = '';
      } catch (err) {
        msg = err instanceof Error ? err.message : 'Não deu para importar.';
      }
      return render('#titulo');
    }
  };

  // A full navigation can happen before the debounced local save. Flush the draft first.
  const flushOnLeave = () => { if (saveTimer) persist(true); };
  window.addEventListener('pagehide', flushOnLeave);
  window.addEventListener('beforeunload', flushOnLeave);
  window.addEventListener('qd:quiz-sync', refreshSaveStatus);
  main.addEventListener('click', onClick);
  main.addEventListener('input', onInput);
  main.addEventListener('change', onChange);
  render();
  // chegou pelo link mandado do celular (/criar?levar=...): o quiz entra como um quiz novo neste computador
  if (levarId)
    receberDoCelular(levarId).then(
      async (recebido) => {
        if (!vivo) return;
        // o quiz de exemplo que o editor criou ao abrir não fica para trás
        if (intocado(q)) await excluir(q.id).catch(() => {});
        else persist(true);
        q = recebido;
        escolhendo = false;
        persist(true);
        void track('quiz_create', { source: 'import' });
        aviso = 'Quiz recebido do celular. Confira e abra a sala.';
        render();
        main.querySelector('#abrir-sala')?.scrollIntoView({ block: 'center' });
      },
      (e) => {
        if (!vivo) return;
        msg = e instanceof Error ? e.message : 'Não deu para abrir o quiz do celular.';
        render();
      },
    );
  testeCobranca();
  // a cobrança chega depois; só o quadro do plano (e a marca, se destravou) é redesenhado, para não tirar o foco de quem digita
  const refreshPlano = () => {
    const el = main.querySelector('#plano');
    if (el) el.innerHTML = plano();
    if (marcaLiberada() === marcaMostrada) return;
    marcaMostrada = marcaLiberada();
    const m = main.querySelector('#marca');
    if (m) m.innerHTML = marcaMostrada ? marcaCampos() : marcaTrava();
    const d = main.querySelector('#modo-dica');
    if (d) d.textContent = dicaModo();
    applyTheme(q.tema, marcaMostrada ? q.marca.color : '');
  };
  cobranca().then((c) => {
    cob = c;
    refreshPlano();
  });
  confereVolta(refreshPlano).then(() => retomaIa());
  return () => {
    vivo = false;
    obsAbrir?.disconnect();
    window.removeEventListener('pagehide', flushOnLeave);
    window.removeEventListener('beforeunload', flushOnLeave);
    window.removeEventListener('qd:quiz-sync', refreshSaveStatus);
    main.removeEventListener('click', onClick);
    main.removeEventListener('input', onInput);
    main.removeEventListener('change', onChange);
    if (saveTimer) persist(true);
  };
}
