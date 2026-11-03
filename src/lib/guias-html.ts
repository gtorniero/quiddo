// HTML das páginas de guias. Usado pelo site (src/pages/guias.ts) e pelo pré-render
// (scripts/prerender.mjs), para o robô de busca ver o mesmo conteúdo sem JavaScript.
// Não pode mexer no DOM: roda também no Node.
import { GRUPOS_GUIAS, GUIAS, type Guia } from '../data/guias';
import { esc } from './dom';

export const SITE = 'https://www.quiddo.com.br';

export const LISTA_TITULO = 'Guias e perguntas prontas para quiz';
export const LISTA_DESCRICAO =
  'Guias grátis para montar um quiz ao vivo: perguntas prontas com respostas, dicas de ritmo e prêmios, e ideias para festa, empresa, igreja e sala de aula.';

/** Guias publicados (com texto). */
export const publicados = () => GUIAS.filter((g) => g.corpo);

/** Grupo do guia na página de guias (empresas e escola dividem o mesmo grupo). */
function grupo(g: Guia) {
  return GRUPOS_GUIAS.find(([pubs]) => pubs.includes(g.publico))?.[0] ?? [g.publico];
}

/** Até 3 guias do mesmo grupo, a partir do próximo da lista (para variar entre os guias). */
export function relacionados(g: Guia, n = 3): Guia[] {
  const pubs = grupo(g);
  const mesmo = publicados().filter((x) => pubs.includes(x.publico));
  const i = mesmo.findIndex((x) => x.slug === g.slug);
  const out: Guia[] = [];
  for (let k = 1; k < mesmo.length && out.length < n; k++) out.push(mesmo[(i + k) % mesmo.length]);
  // grupo pequeno: completa com guias gerais
  for (const x of publicados()) {
    if (out.length >= n) break;
    if (x.slug !== g.slug && !out.includes(x) && x.publico === 'todos') out.push(x);
  }
  return out;
}

/** Descrição para buscadores: o resumo, completado se ficar curto demais. */
export function descricao(g: Guia) {
  const r = g.resumo.replace(/\.$/, '');
  return r.length >= 110 ? `${r}.` : `${r}. ${g.titulo.length < 60 ? 'Guia grátis do Quiddo, o quiz ao vivo que a turma joga pelo celular.' : 'Guia grátis do Quiddo.'}`;
}

const cartao = (g: Guia) => `<a href="/guias/${g.slug}" data-link><b>${esc(g.titulo)}</b><span>${esc(g.resumo)}</span></a>`;

export function listaHtml() {
  return (
    `<section class="hero"><h1>Guias</h1><p>Perguntas prontas com respostas, dicas de como montar o quiz e de como animar a turma: na festa, na despedida, na empresa, na igreja ou na escola.</p></section>` +
    GRUPOS_GUIAS.map(([pubs, nome, sub]) => {
      const gs = publicados().filter((g) => pubs.includes(g.publico));
      if (!gs.length) return '';
      return `<section class="panel"><h2>${esc(nome)}</h2><p class="small">${esc(sub)}</p><div class="guias">${gs.map(cartao).join('')}</div></section>`;
    }).join('') +
    `<section class="panel"><h2>Pronto para jogar?</h2><a class="btn auto" href="/criar" data-link>Criar meu quiz</a></section>`
  );
}

export function artigoHtml(g: Guia) {
  const rel = relacionados(g);
  return (
    `<p><a href="/guias" data-link>← Todos os guias</a></p>` +
    `<article class="panel prose"><h1>${esc(g.titulo)}</h1><p class="muted">${esc(g.resumo)}</p>${g.corpo}</article>` +
    (rel.length ? `<section class="panel"><h2>Leia também</h2><div class="guias">${rel.map(cartao).join('')}</div></section>` : '') +
    `<section class="panel"><h2>Pronto para testar?</h2><a class="btn" href="/criar" data-link>Criar meu quiz</a></section>`
  );
}
