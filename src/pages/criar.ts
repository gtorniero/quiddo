// /criar: editor do quiz e configuração do anfitrião (tema, nomes, marca, perguntas) e abertura da sala.
import type { Page } from '../main';
import type { CreateRoomBody, CreateRoomResult, Theme } from '../../shared/protocol';
import { LIMITS, compactQuestion, isReady } from '../../shared/rules';
import { CORES_MARCA, TEMAS, pacote } from '../data/pacotes';
import { LETRAS, esc } from '../lib/dom';
import { readLogo } from '../lib/logo';
import { navigate } from '../lib/nav';
import { type Quiz, atual, excluir, exportar, importar, listar, novoQuiz, preencher, salvar } from '../lib/quiz';
import { store } from '../lib/storage';
import { THEME_ACC, applyTheme } from '../lib/theme';

export function page(): Page {
  return { title: 'Criar meu quiz', mount };
}

function mount(main: HTMLElement) {
  let q: Quiz = atual();
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
    applyTheme(q.tema, q.marca.color);
    store.set('tema', q.tema);
    const y = window.scrollY;
    main.innerHTML = [secMeus(), secTema(), secNomes(), secMarca(), secPerguntas(), secAbrir()].join('');
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
            `<div class="q${x.id === q.id ? ' on' : ''}"><b>${esc(x.titulo || 'Sem título')}</b><span class="small">${x.perguntas.length} perguntas · ${new Date(x.atualizado).toLocaleDateString('pt-BR')}</span>${
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
      <label for="titulo">Nome do quiz<input type="text" id="titulo" maxlength="60" value="${esc(q.titulo)}"></label>
    </section>`;
  }

  function secTema() {
    return `<section class="panel"><div class="tag">1 · Tema</div><div class="temas" role="group" aria-label="Tema">${(Object.keys(TEMAS) as Theme[])
      .map((k) => {
        const t = TEMAS[k];
        return `<button class="tema" data-act="tema" data-v="${k}" aria-pressed="${k === q.tema}"><span class="sw">${t.cores.map((c) => `<i style="background:${c}"></i>`).join('')}</span><b>${esc(t.nome)}</b><span>${esc(t.desc)}</span></button>`;
      })
      .join('')}</div><p class="small">O tema muda o visual da TV e dos celulares de todo mundo. As suas perguntas continuam as mesmas; para usar as do tema, toque em “Carregar o pacote do tema”, lá embaixo.</p></section>`;
  }

  function secNomes() {
    return `<details class="panel"${q.tema === 'festa' || q.nomes[0] || q.nomes[1] ? ' open' : ''}><summary class="tag" style="cursor:pointer;min-height:44px;display:flex;align-items:center">Tem aniversariante ou homenageado? (opcional)</summary>
      <div class="row"><label for="nA">Nome 1<input type="text" id="nA" maxlength="${LIMITS.nick}" value="${esc(q.nomes[0])}" placeholder="Bia"></label><label for="nB">Nome 2<input type="text" id="nB" maxlength="${LIMITS.nick}" value="${esc(q.nomes[1])}" placeholder="Leo"></label></div>
      <p class="small">Escreva {A} ou {B} numa pergunta e o nome entra no lugar. Aniversário: só o Nome 1. Casal ou dupla homenageada: os dois.</p></details>`;
  }

  function secMarca() {
    const mc = q.marca.color;
    const ult = q.marca.ultima || CORES_MARCA[1][0];
    return `<section class="panel"><div class="tag">2 · Sua marca (opcional)</div>
      <label for="bN">Nome da empresa ou do evento<input type="text" id="bN" maxlength="${LIMITS.brandName}" value="${esc(q.marca.name)}" placeholder="${q.tema === 'corp' ? 'Convenção de Vendas 2027' : 'Aniversário da Bia'}"></label>
      <div class="tag" id="h-cor">Cor principal</div>
      <div class="cmode" role="group" aria-labelledby="h-cor">
        <button data-act="cmode" data-v="tema" aria-pressed="${!mc}"><i style="background:${THEME_ACC[q.tema]}"></i>Cor do tema</button>
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
      <p class="small">O nome, a cor e o logo aparecem na TV e nos celulares de todo mundo. PNG com fundo transparente fica melhor.</p>
    </section>`;
  }

  function secPerguntas() {
    const n = q.perguntas.length;
    return `<section class="panel" aria-labelledby="h-perg"><div class="tag" id="h-perg">3 · Perguntas · ${prontas()} de ${n} prontas</div>
      <div class="qlist">${q.perguntas.map((_, i) => editorPergunta(i, n)).join('')}</div>
      <div class="btnrow"><button class="btn sec" data-act="add"${n >= LIMITS.maxQuestions ? ' disabled' : ''}>Adicionar pergunta</button><button class="btn sec" data-act="pacote">Carregar o pacote do tema</button></div>
    </section>`;
  }

  function editorPergunta(i: number, n: number) {
    const p = q.perguntas[i];
    const ok = isReady(p);
    const num = i + 1;
    return `<div class="qed${ok ? '' : ' inc'}" data-i="${i}">
      <div class="hd"><span id="qh${i}">Pergunta ${num}${ok ? '' : ' · falta completar'}</span><span class="tools">
        <button data-act="up" data-i="${i}" aria-label="Subir a pergunta ${num}"${i === 0 ? ' disabled' : ''}>↑</button>
        <button data-act="down" data-i="${i}" aria-label="Descer a pergunta ${num}"${i === n - 1 ? ' disabled' : ''}>↓</button>
        <button data-act="dup" data-i="${i}" aria-label="Duplicar a pergunta ${num}"${n >= LIMITS.maxQuestions ? ' disabled' : ''}>Duplicar</button>
        <button data-act="del" data-i="${i}" aria-label="Remover a pergunta ${num}">Remover</button></span></div>
      <textarea data-i="${i}" data-f="t" maxlength="${LIMITS.questionText}" aria-label="Texto da pergunta ${num}" placeholder="Escreva a pergunta">${esc(p.t)}</textarea>
      ${p.o
        .map(
          (o, k) => `<div class="opt-ed"><span class="lt c${k}" aria-hidden="true">${LETRAS[k]}</span>
        <input type="text" data-i="${i}" data-f="o" data-k="${k}" maxlength="${LIMITS.answerText}" value="${esc(o)}" placeholder="Resposta ${LETRAS[k]}" aria-label="Resposta ${LETRAS[k]} da pergunta ${num}">
        <label><input type="radio" name="c${i}" data-i="${i}" data-f="c" data-k="${k}"${p.c === k ? ' checked' : ''}>certa</label>
        ${p.o.length > 2 ? `<button class="x" data-act="delopt" data-i="${i}" data-k="${k}" aria-label="Tirar a resposta ${LETRAS[k]} da pergunta ${num}">×</button>` : '<span></span>'}</div>`,
        )
        .join('')}
      ${p.o.length < 4 ? `<button class="linkbtn" style="justify-self:start" data-act="addopt" data-i="${i}">Adicionar resposta</button>` : ''}
      <div class="chips" role="group" aria-label="Tempo da pergunta ${num}">Tempo:${LIMITS.times.map((s) => `<button data-act="tl" data-i="${i}" data-v="${s}" aria-pressed="${p.tl === s}">${s} s</button>`).join('')}</div>
    </div>`;
  }

  function secAbrir() {
    const n = prontas();
    return `<section class="panel sticky"><button class="btn" data-act="abrir"${n && !abrindo ? '' : ' disabled'}>${abrindo ? 'Abrindo a sala…' : n ? `Abrir a sala com ${n} ${n === 1 ? 'pergunta' : 'perguntas'}` : 'Complete ao menos uma pergunta'}</button>
      <p class="err" role="alert">${esc(erro)}</p>
      <p class="small">Abra a sala no computador ligado à TV ou ao projetor. A turma joga pelo celular.</p></section>`;
  }

  // ---------- ações ----------

  async function abrirSala() {
    const questions = q.perguntas
      .filter(isReady)
      .map((p) => compactQuestion({ ...p, t: preencher(q, p.t), o: p.o.map((o) => preencher(q, o)) }))
      .filter((p): p is NonNullable<typeof p> => !!p);
    const body: CreateRoomBody = { questions, theme: q.tema, brand: { name: q.marca.name, color: q.marca.color }, logo: q.logo };
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
        persist();
        return render(`[data-act="tema"][data-v="${v}"]`);
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
      case 'add':
        q.perguntas.push({ t: '', o: ['', '', '', ''], c: 0, tl: 20 });
        persist();
        render();
        return main.querySelector<HTMLElement>(`textarea[data-i="${q.perguntas.length - 1}"]`)?.focus();
      case 'pacote':
        if (!confirm(`Trocar as ${q.perguntas.length} perguntas pelo pacote do tema ${TEMAS[q.tema].nome}?`)) return;
        q.perguntas = pacote(q.tema);
        persist();
        return render();
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
      case 'tl':
        p.tl = Number(v);
        persist();
        return render(`[data-act="tl"][data-i="${i}"][data-v="${v}"]`);
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
      if (h) h.textContent = `Pergunta ${i + 1}${ok ? '' : ' · falta completar'}`;
    }
    const n = prontas();
    const tag = main.querySelector('#h-perg');
    if (tag) tag.textContent = `3 · Perguntas · ${n} de ${q.perguntas.length} prontas`;
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
    if (t.id === 'titulo') q.titulo = t.value;
    else if (t.id === 'nA') q.nomes[0] = t.value.trim();
    else if (t.id === 'nB') q.nomes[1] = t.value.trim();
    else if (t.id === 'bN') q.marca.name = t.value;
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
      q.perguntas[i].c = Number(t.dataset.k);
      persist();
      return refreshCounts(i);
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
