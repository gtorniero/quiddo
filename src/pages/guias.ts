import type { Page } from '../main';
import { GUIAS } from '../data/guias';
import { esc } from '../lib/dom';

const GRUPOS: [string, string][] = [
  ['todos', 'Para qualquer quiz'],
  ['empresas', 'Empresas e eventos'],
  ['festas', 'Festas e família'],
];

export function lista(): Page {
  return {
    title: 'Guias',
    mount(main) {
      const prontos = GUIAS.filter((g) => g.corpo);
      main.innerHTML =
        `<section class="hero"><h1>Guias</h1><p>Ideias e roteiros para o seu quiz render: na empresa, na escola, no evento ou na festa.</p></section>` +
        GRUPOS.map(([k, nome]) => {
          const gs = prontos.filter((g) => g.publico === k);
          if (!gs.length) return '';
          return `<section class="panel"><h2>${esc(nome)}</h2><div class="guias">${gs.map((g) => `<a href="/guias/${g.slug}" data-link><b>${esc(g.titulo)}</b><span>${esc(g.resumo)}</span></a>`).join('')}</div></section>`;
        }).join('') +
        `<section class="panel"><p class="muted">Mais guias chegam em breve: convenção de vendas, integração de novos funcionários, aniversário, Natal em família e outros.</p><a class="btn auto" href="/criar" data-link>Criar meu quiz</a></section>`;
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
