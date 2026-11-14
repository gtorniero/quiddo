// Pré-render das páginas públicas, depois do `vite build`.
// Gera HTML estático para /, /criar, /jogar, /precos, /privacidade, /guias e cada /guias/<slug>, com título,
// descrição, endereço oficial, Open Graph, dados estruturados e o texto da página dentro do <main>.
// Também gera sitemap.xml (com a data real de cada página) e robots.txt.
// O <main> leva data-pre com o caminho: um script no index.html limpa o conteúdo se o mesmo arquivo for
// servido em outra rota (o index.html é o fallback do app para /conta, /host/ABCD etc.).
//
// Por que guias/<slug>.html: os assets da Cloudflare (html_handling "auto-trailing-slash", o padrão)
// entregam /guias/<slug> direto de guias/<slug>.html, com 200 e sem barra no fim, que é o endereço
// usado nos links do site. Com guias/<slug>/index.html, /guias/<slug> viraria redirecionamento para a barra.
//
// Os dados (TypeScript) são lidos pelo runnerImport do próprio Vite, sem dependência nova.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runnerImport } from 'vite';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const saida = join(raiz, 'dist', 'client');

const { module: m } = await runnerImport(join(raiz, 'src/lib/guias-html.ts'), { configFile: false });
const { SITE, LISTA_TITULO, LISTA_DESCRICAO, publicados, descricao, listaHtml, artigoHtml } = m;
const { module: pg } = await runnerImport(join(raiz, 'src/lib/paginas-html.ts'), { configFile: false });
const { module: dt } = await runnerImport(join(raiz, 'src/data/guias-datas.ts'), { configFile: false });
const { DATAS_GUIAS } = dt;

const base = await readFile(join(saida, 'index.html'), 'utf8');
if (!base.includes('<main id="conteudo" tabindex="-1"></main>')) throw new Error('index.html sem o <main id="conteudo"> vazio');

const attr = (t) => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// JSON dentro de <script>: sem "</" para não fechar a tag
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

function pagina({ titulo, desc, url, tipo, jsonld, corpo, caminho }) {
  let h = base;
  const troca = (re, novo) => {
    if (!re.test(h)) throw new Error(`não achei ${re} no index.html`);
    h = h.replace(re, novo);
  };
  troca(/<title>[^<]*<\/title>/, `<title>${attr(titulo)}</title>`);
  troca(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${attr(desc)}" />`);
  troca(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${attr(url)}" />`);
  troca(/<meta property="og:type" content="[^"]*" \/>/, `<meta property="og:type" content="${tipo}" />`);
  troca(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${attr(titulo)}" />`);
  troca(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${attr(desc)}" />`);
  troca(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${attr(url)}" />`);
  h = h.replace('  </head>', `    ${jsonld.map(ld).join('\n    ')}\n  </head>`);
  h = h.replace('<main id="conteudo" tabindex="-1"></main>', `<main id="conteudo" tabindex="-1" data-pre="${attr(caminho)}">${corpo}</main>`);
  return h;
}

const { migalha, PAGINAS } = pg;
const guias = publicados();
const urlLista = `${SITE}/guias`;
const datas = (g) => {
  const d = DATAS_GUIAS[g.slug];
  if (!d) throw new Error(`guia sem data em src/data/guias-datas.ts: ${g.slug}`);
  return d;
};
const maisRecente = (lista) => lista.reduce((a, b) => (b > a ? b : a), '');

// páginas do app: o mesmo texto que o site desenha, sem depender de JavaScript
const precosEstado = pg.estadoPadrao();
const paginas = [
  ['/', 'index.html', 'website', pg.homeHtml(), [pg.organizacao(), pg.siteJsonLd()]],
  ['/criar', 'criar.html', 'website', pg.criarHtml(), [migalha([['Quiddo', `${SITE}/`], ['Criar meu quiz', `${SITE}/criar`]])]],
  ['/jogar', 'jogar.html', 'website', pg.jogarHtml(), [migalha([['Quiddo', `${SITE}/`], ['Jogar', `${SITE}/jogar`]])]],
  ['/precos', 'precos.html', 'website', pg.precosTopo() + pg.precosHtml(precosEstado), [pg.appJsonLd(precosEstado), pg.faqJsonLd(pg.perguntasPlanos(precosEstado)), migalha([['Quiddo', `${SITE}/`], ['Planos', `${SITE}/precos`]])]],
  ['/privacidade', 'privacidade.html', 'website', pg.privacidadeHtml(), [migalha([['Quiddo', `${SITE}/`], ['Privacidade', `${SITE}/privacidade`]])]],
];
const saidas = [];
for (const [caminho, arquivo, tipo, corpo, jsonld] of paginas) {
  const seo = PAGINAS[caminho];
  saidas.push([arquivo, pagina({ titulo: seo.titulo, desc: seo.descricao, url: caminho === '/' ? `${SITE}/` : SITE + caminho, tipo, corpo, jsonld, caminho })]);
}
// o index.html base (com o <main> vazio) é lido acima; só agora ele vira a home pré-renderizada
for (const [arquivo, html] of saidas) await writeFile(join(saida, arquivo), html);

await mkdir(join(saida, 'guias'), { recursive: true });
await writeFile(
  join(saida, 'guias.html'),
  pagina({
    titulo: `${LISTA_TITULO} · Quiddo`,
    desc: LISTA_DESCRICAO,
    url: urlLista,
    tipo: 'website',
    caminho: '/guias',
    corpo: listaHtml(),
    jsonld: [
      migalha([['Quiddo', `${SITE}/`], ['Guias', urlLista]]),
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: LISTA_TITULO,
        description: LISTA_DESCRICAO,
        url: urlLista,
        inLanguage: 'pt-BR',
        hasPart: guias.map((g) => ({ '@type': 'Article', headline: g.titulo, url: `${SITE}/guias/${g.slug}` })),
      },
    ],
  }),
);

for (const g of guias) {
  const url = `${SITE}/guias/${g.slug}`;
  const desc = descricao(g);
  const [publicado, atualizado] = datas(g);
  await writeFile(
    join(saida, 'guias', `${g.slug}.html`),
    pagina({
      titulo: `${g.titulo} · Quiddo`,
      desc,
      url,
      tipo: 'article',
      caminho: `/guias/${g.slug}`,
      corpo: artigoHtml(g),
      jsonld: [
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: g.titulo,
          description: desc,
          inLanguage: 'pt-BR',
          datePublished: publicado,
          dateModified: atualizado,
          image: pg.OG_IMAGEM,
          mainEntityOfPage: url,
          url,
          author: { '@type': 'Organization', name: 'Quiddo', url: `${SITE}/` },
          publisher: { '@type': 'Organization', name: 'Quiddo', url: `${SITE}/`, logo: { '@type': 'ImageObject', url: `${SITE}/marca/quiddo-cor.svg` } },
        },
        migalha([['Quiddo', `${SITE}/`], ['Guias', urlLista], [g.titulo, url]]),
      ],
    }),
  );
}

// sitemap: só páginas públicas que valem a pena indexar, cada uma com a data da última mudança dela
const urls = [
  ...paginas.map(([caminho]) => [caminho === '/' ? `${SITE}/` : SITE + caminho, PAGINAS[caminho].atualizado]),
  [urlLista, maisRecente(guias.map((g) => datas(g)[1]))],
  ...guias.map((g) => [`${SITE}/guias/${g.slug}`, datas(g)[1]]),
];
await writeFile(
  join(saida, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, d]) => `  <url><loc>${u}</loc><lastmod>${d}</lastmod></url>`).join('\n')}\n</urlset>\n`,
);
// /conta, /entrar e /medicao ficam rastreáveis para o robô ver o "noindex" (cabeçalho e meta) e tirar da busca
await writeFile(
  join(saida, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /host/\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`,
);

console.log(`pré-render: ${paginas.length} páginas, ${guias.length} guias, /guias, sitemap.xml (${urls.length} endereços) e robots.txt em dist/client`);
