// /criar: editor do quiz e configuração do anfitrião (modo, visual, tempo, marca, perguntas) e abertura da sala.
// O visual só aparece depois do modo e lista apenas os visuais daquele modo. Floresta é o padrão.
import type { Page } from '../main';
import type { CreateRoomBody, CreateRoomResult, Theme, Visual } from '../../shared/protocol';
import { LIMITS, VISUAIS_DO_MODO, compactQuestion, isReady, visualDoModo } from '../../shared/rules';
import { CORES_MARCA, TEMAS } from '../data/pacotes';
import { LETRAS, esc } from '../lib/dom';
import { readFoto, readLogo } from '../lib/logo';
import { navigate } from '../lib/nav';
import { type Quiz, atual, excluir, exportar, importar, listar, novoQuiz, salvar } from '../lib/quiz';
import { store } from '../lib/storage';
import { THEME_ACC, applyTheme } from '../lib/theme';
import { VISUAIS } from '../data/visuais';
import { miniVisual } from '../lib/visuais-arte';

export function page(): Page {
  return { title: 'Criar meu quiz', mount };
}

function mount(main: HTMLElement) {
  let q: Quiz = atual();
  // veio da vitrine de modos da home: aplica o modo escolhido (o visual volta para Floresta se não existir nele)
  const temaNovo = store.get<string>('temaNovo', '');
  if (temaNovo === 'corp' || temaNovo === 'festa' || temaNovo === 'escola') {
    q.tema = temaNovo;
    q.visual = visualDoModo(q.tema, q.visual);
  }
  store.del('temaNovo');
  let msg = ''; // aviso geral (importação, espaço cheio)
  let erro = ''; // erro ao abrir a sala
  let abrindo = false;
  let saveTimer = 0;

  const persist = (now = false) => {
    clearTimeout(saveTimer);
    const go = () => {
      if (!salvar(q)) {
        msg = 'O navegador ficou sem espaço para guardar o quiz. Tire o logo ou exclua quizzes antigos.';
        render();
      }
    };
    if (now) go();
    else saveTimer = window.setTimeout(go, 300);
  };
  persist(true);

  const prontas = () => q.perguntas.filter(isReady).length;

  function render(focusSel?: string) {
    const temMarca = q.tema !== 'festa';
    applyTheme(q.tema, temMarca ? q.marca.color : '');
    store.set('tema', q.tema);
    const y = window.scrollY;
    // os passos são numerados na ordem em que aparecem; a marca (cor e logo) só existe em Corporativo e Escola
    let n = 0;
    const passo = (titulo: string, id: string) => `<h2 class="passo" id="${id}"><span aria-hidden="true">${++n}</span>${titulo}</h2>`;
    main.innerHTML = [secMeus(), secNome(passo, temMarca), secTema(passo), secVisual(passo), secTempo(passo), secPerguntas(passo), secAbrir()].join('');
    window.scrollTo(0, y);
    if (focusSel) main.querySelector<HTMLElement>(focusSel)?.focus({ preventScroll: true });
  }

  // ---------- seções ----------

  function secMeus() {
    const todos = listar();
    return `<section class="panel" aria-labelledby="h-meus">
      <h1 id="h-meus" class="sr">Criar meu quiz</h1>
      <div class="tag">Meus quizzes</div>
      <div class="quizzes">${todos
        .map(
          (x) =>
            `<div class="q${x.id === q.id ? ' on' : ''}"><b>${esc(x.titulo || 'Sem título')}</b><span class="small">${x.perguntas.length} ${x.perguntas.length === 1 ? 'pergunta' : 'perguntas'} · ${new Date(x.atualizado).toLocaleDateString('pt-BR')}</span>${
              x.id === q.id ? '<span class="small"><b>Editando</b></span>' : `<button class="btn sec small auto" data-act="abrirquiz" data-v="${x.id}">Abrir</button>`
            }<button class="linkbtn" data-act="excluirquiz" data-v="${x.id}" aria-label="Excluir ${esc(x.titulo)}">Excluir</button></div>`,
        )
        .join('')}</div>
      <div class="btnrow">
        <button class="btn sec small" data-act="novo">Novo quiz</button>
        <span class="btn sec small filebtn">Importar arquivo<input type="file" id="imp" accept="application/json,.json" aria-label="Importar quiz em JSON"></span>
        <button class="btn sec small" data-act="exportar">Exportar este quiz</button>
      </div>
      <p class="small">Os quizzes ficam guardados neste navegador. Exporte o arquivo para levar para outro computador.</p>
      <p class="err" role="status">${esc(msg)}</p>
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
      .join('')}</div><p class="small">O modo é o tipo de evento: define as perguntas de modelo e os visuais que aparecem logo abaixo. ${q.tema === 'festa' ? 'Em Amigos & família o jogo fica sem marca.' : 'Neste modo dá para colocar a cor e o logo da empresa ou da escola, no passo 1.'}</p></section>`;
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
      ${temMarca ? marcaCampos() : ''}
    </section>`;
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

  const nomeTipo = (p: Quiz['perguntas'][number]) => (p.vf ? 'Verdadeiro ou falso' : p.tipo === 'opiniao' ? 'Enquete' : p.tipo === 'quem' ? 'Quem é mais provável' : 'Múltipla escolha');
  const titulo = (i: number) => `${nomeTipo(q.perguntas[i])} ${i + 1}${isReady(q.perguntas[i]) ? '' : ' · falta completar'}`;

  const contagem = () => `${prontas()} de ${q.perguntas.length} prontas.${q.perguntas.length <= 2 ? ' As 2 primeiras são só modelos: edite ou remova.' : ''} Marque a resposta certa de cada uma (no celular, toque na letra).`;

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
    return `<section class="panel" id="abrir-sala"><button class="btn" data-act="abrir"${n && !abrindo ? '' : ' disabled'}>${abrindo ? 'Abrindo a sala…' : n ? `Abrir a sala com ${n} ${n === 1 ? 'pergunta' : 'perguntas'}` : 'Complete ao menos uma pergunta'}</button>
      <p class="err" role="alert">${esc(erro)}</p>
      <p class="small">Abra a sala no computador que vai para o telão ou o projetor. A turma joga pelo celular.</p></section>`;
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
    const body: CreateRoomBody = { questions, theme: q.tema, visual: visualDoModo(q.tema, q.visual), brand: festa ? { name: '', color: '' } : { name: q.titulo.trim(), color: q.marca.color }, logo: festa ? '' : q.logo };
    abrindo = true;
    erro = '';
    render();
    try {
      const r = await fetch('/api/salas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = (await r.json().catch(() => ({}))) as Partial<CreateRoomResult> & { erro?: string };
      if (!r.ok || !d.code || !d.hostKey) throw new Error(d.erro || 'Não deu para abrir a sala agora. Tente de novo.');
      store.set('host:' + d.code, d.hostKey);
      navigate('/host/' + d.code);
    } catch (e) {
      abrindo = false;
      erro = e instanceof Error && e.message !== 'Failed to fetch' ? e.message : 'Sem conexão com a internet. Confira e tente de novo.';
      render();
    }
  }

  const onClick = (e: Event) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!b || (b as HTMLButtonElement).disabled) return;
    const a = b.dataset.act!;
    const v = b.dataset.v || '';
    const i = Number(b.dataset.i);
    const p = q.perguntas[i];
    msg = '';
    switch (a) {
      case 'novo':
        q = novoQuiz(q.tema);
        persist(true);
        return render('#titulo');
      case 'abrirquiz': {
        const x = listar().find((y) => y.id === v);
        if (x) q = x;
        store.set('atual', q.id);
        return render();
      }
      case 'excluirquiz': {
        const x = listar().find((y) => y.id === v);
        if (!x || !confirm(`Excluir “${x.titulo}”? Não dá para desfazer.`)) return;
        excluir(v);
        if (v === q.id) {
          q = listar()[0] || novoQuiz(q.tema);
          persist(true);
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
    const btn = main.querySelector<HTMLButtonElement>('[data-act="abrir"]');
    if (btn && !abrindo) {
      btn.disabled = !n;
      btn.textContent = n ? `Abrir a sala com ${n} ${n === 1 ? 'pergunta' : 'perguntas'}` : 'Complete ao menos uma pergunta';
    }
  };

  const onInput = (e: Event) => {
    const t = e.target as HTMLInputElement;
    const ds = t.dataset;
    if (ds.f === 't' || ds.f === 'o') {
      const i = Number(ds.i);
      if (ds.f === 't') q.perguntas[i].t = t.value;
      else q.perguntas[i].o[Number(ds.k)] = t.value;
      persist();
      return refreshCounts(i);
    }
    if (t.id === 'titulo') {
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
      try {
        q = importar(await t.files[0].text());
        persist(true);
        msg = '';
      } catch (err) {
        msg = err instanceof Error ? err.message : 'Não deu para importar.';
      }
      return render('#titulo');
    }
  };

  main.addEventListener('click', onClick);
  main.addEventListener('input', onInput);
  main.addEventListener('change', onChange);
  render();
  return () => {
    main.removeEventListener('click', onClick);
    main.removeEventListener('input', onInput);
    main.removeEventListener('change', onChange);
    if (saveTimer) persist(true);
  };
}
