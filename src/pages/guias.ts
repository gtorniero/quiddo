import type { Page } from '../main';
import { GRUPOS_GUIAS, GUIAS } from '../data/guias';
import { esc } from '../lib/dom';

export function lista(): Page {
  return {
    title: 'Guias',
    mount(main) {
      main.innerHTML =
        `<section class="hero"><h1>Guias</h1><p>Dicas de perguntas, de como montar o quiz e de como animar a turma: na festa, na despedida, na empresa ou na escola.</p></section>` +
        GRUPOS_GUIAS.map(([pubs, nome, sub]) => {
          const gs = GUIAS.filter((g) => g.corpo && pubs.includes(g.publico));
          if (!gs.length) return '';
          return `<section class="panel"><h2>${esc(nome)}</h2><p class="small">${esc(sub)}</p><div class="guias">${gs.map((g) => `<a href="/guias/${g.slug}" data-link><b>${esc(g.titulo)}</b><span>${esc(g.resumo)}</span></a>`).join('')}</div></section>`;
        }).join('') +
        `<section class="panel"><h2>Pronto para jogar?</h2><a class="btn auto" href="/criar" data-link>Criar meu quiz</a></section>`;
    },
  };
}

export function artigo(slug: string): Page {
  const g = GUIAS.find((x) => x.slug === slug && x.corpo);
  return {
    title: g ? g.titulo : 'Guia não encontrado',
    mount(main) {
      if (!g) {
        main.innerHTML = `<section class="panel center"><h1>Guia não encontrado</h1><p class="muted">Esse guia ainda não foi publicado.</p><a class="btn auto" href="/guias" data-link>Ver os guias</a></section>`;
        return;
      }
      main.innerHTML = `<p><a href="/guias" data-link>← Todos os guias</a></p><article class="panel prose"><h1>${esc(g.titulo)}</h1><p class="muted">${esc(g.resumo)}</p>${g.corpo}</article><section class="panel"><h2>Pronto para testar?</h2><a class="btn" href="/criar" data-link>Criar meu quiz</a></section>`;
    },
  };
}
