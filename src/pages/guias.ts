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
    },
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
