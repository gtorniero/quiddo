// Pré-render dos guias, depois do `vite build`.
// Gera HTML estático para /guias e cada /guias/<slug>, com título, descrição, endereço oficial,
// Open Graph, dados estruturados e o texto do guia dentro do <main>. Também gera sitemap.xml e robots.txt.
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

const base = await readFile(join(saida, 'index.html'), 'utf8');
if (!base.includes('<main id="conteudo" tabindex="-1"></main>')) throw new Error('index.html sem o <main id="conteudo"> vazio');

const attr = (t) => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// JSON dentro de <script>: sem "</" para não fechar a tag
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

function pagina({ titulo, desc, url, tipo, jsonld, corpo }) {
  let h = base;
  const troca = (re, novo) => {
    if (!re.test(h)) throw new Error(`não achei ${re} no index.html`);
    h = h.replace(re, novo);
  };
  troca(/<title>[^<]*<\/title>/, `<title>${attr(titulo)}</title>`);
  troca(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${attr(desc)}" />`);
  troca(/<meta property="og:type" content="[^"]*" \/>/, `<meta property="og:type" content="${tipo}" />`);
  troca(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${attr(titulo)}" />`);
  troca(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${attr(desc)}" />\n    <meta property="og:url" content="${attr(url)}" />\n    <link rel="canonical" href="${attr(url)}" />`);
  h = h.replace('  </head>', `    ${jsonld.map(ld).join('\n    ')}\n  </head>`);
  h = h.replace('<main id="conteudo" tabindex="-1"></main>', `<main id="conteudo" tabindex="-1">${corpo}</main>`);
  return h;
}

const migalha = (itens) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: itens.map(([nome, url], i) => ({ '@type': 'ListItem', position: i + 1, name: nome, item: url })),
});

const guias = publicados();
const urlLista = `${SITE}/guias`;

await mkdir(join(saida, 'guias'), { recursive: true });
await writeFile(
  join(saida, 'guias.html'),
  pagina({
    titulo: `${LISTA_TITULO} · Quiddo`,
    desc: LISTA_DESCRICAO,
    url: urlLista,
    tipo: 'website',
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
  await writeFile(
    join(saida, 'guias', `${g.slug}.html`),
    pagina({
      titulo: `${g.titulo} · Quiddo`,
      desc,
      url,
      tipo: 'article',
      corpo: artigoHtml(g),
      jsonld: [
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: g.titulo,
          description: desc,
          inLanguage: 'pt-BR',
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

// sitemap: só páginas públicas que valem a pena indexar
const hoje = new Date().toISOString().slice(0, 10);
const urls = [`${SITE}/`, `${SITE}/criar`, `${SITE}/jogar`, `${SITE}/precos`, urlLista, ...guias.map((g) => `${SITE}/guias/${g.slug}`)];
await writeFile(
  join(saida, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${hoje}</lastmod></url>`).join('\n')}\n</urlset>\n`,
);
await writeFile(
  join(saida, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /host/\nDisallow: /api/\nDisallow: /conta\nDisallow: /entrar\n\nSitemap: ${SITE}/sitemap.xml\n`,
);

console.log(`pré-render: ${guias.length} guias, /guias, sitemap.xml (${urls.length} endereços) e robots.txt em dist/client`);
