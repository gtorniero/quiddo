import type { Page } from '../main';
import { GUIAS } from '../data/guias';
import { artigoHtml, descricao, listaHtml, LISTA_DESCRICAO, LISTA_TITULO, SITE } from '../lib/guias-html';

export function lista(): Page {
  return {
    title: LISTA_TITULO,
    description: LISTA_DESCRICAO,
    canonical: `${SITE}/guias`,
    mount(main) {
      main.innerHTML = listaHtml();
      return filtrosGuias(main);
    },
  };
}

/** Texto sem acento e em minúsculas, para a busca achar "natal" em "Natal" e "pao" em "pão". */
const normal = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Busca (título, resumo e texto do guia) e filtro por assunto na lista de guias. */
function filtrosGuias(main: HTMLElement) {
  const indice = new Map(GUIAS.map((g) => [g.slug, normal(`${g.titulo} ${g.resumo} ${g.corpo.replace(/<[^>]+>/g, ' ')}`)]));
  const campo = main.querySelector<HTMLInputElement>('#busca-guias')!;
  let filtro = '';
  const aplicar = () => {
    const palavras = normal(campo.value).split(/\s+/).filter(Boolean);
    let n = 0;
    main.querySelectorAll<HTMLElement>('.grupo-guias').forEach((sec) => {
      let visiveis = 0;
      sec.querySelectorAll<HTMLAnchorElement>('a[data-slug]').forEach((a) => {
        const texto = indice.get(a.dataset.slug!) || '';
        const ok = (!filtro || a.dataset.pub === filtro) && palavras.every((p) => texto.includes(p));
        a.hidden = !ok;
        if (ok) visiveis++;
      });
      sec.hidden = !visiveis;
      n += visiveis;
    });
    main.querySelector('#guias-n')!.textContent = n === 1 ? '1 guia' : `${n} guias`;
    main.querySelector<HTMLElement>('#guias-vazio')!.hidden = n > 0;
  };
  const onInput = (e: Event) => {
    if ((e.target as HTMLElement).id === 'busca-guias') aplicar();
  };
  const onClick = (e: Event) => {
    const t = e.target as HTMLElement;
    const b = t.closest<HTMLElement>('[data-filtro]');
    if (b) {
      filtro = b.dataset.filtro || '';
      main.querySelectorAll('[data-filtro]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      aplicar();
    } else if (t.closest('[data-filtro-limpar]')) {
      campo.value = '';
      filtro = '';
      main.querySelectorAll('[data-filtro]').forEach((x) => x.setAttribute('aria-pressed', String((x as HTMLElement).dataset.filtro === '')));
      aplicar();
      campo.focus();
    }
  };
  main.addEventListener('input', onInput);
  main.addEventListener('click', onClick);
  return () => {
    main.removeEventListener('input', onInput);
    main.removeEventListener('click', onClick);
  };
}

export function artigo(slug: string): Page {
  const g = GUIAS.find((x) => x.slug === slug && x.corpo);
  return {
    title: g ? g.titulo : 'Guia não encontrado',
    description: g ? descricao(g) : undefined,
    canonical: g ? `${SITE}/guias/${g.slug}` : undefined,
    mount(main) {
      if (!g) {
        main.innerHTML = `<section class="panel center"><h1>Guia não encontrado</h1><p class="muted">Esse guia ainda não foi publicado.</p><a class="btn auto" href="/guias" data-link>Ver os guias</a></section>`;
        return;
      }
      main.innerHTML = artigoHtml(g);
    },
  };
}
