import { GUIAS } from '../src/data/guias';
import { CODE_RE } from './rules';

export const ORIGIN = 'https://quiddo.com.br';
export const publicPaths = ['/', '/guias', ...GUIAS.filter(g => g.corpo).map(g => `/guias/${g.slug}`)];
export function seo(path: string) {
  const guide = GUIAS.find(g => `/guias/${g.slug}` === path && g.corpo);
  const indexable = publicPaths.includes(path);
  const title = guide ? `${guide.titulo} · Quiddo` : path === '/' ? 'Quiz ao vivo com suas perguntas · Quiddo' : path === '/guias' ? 'Guias e ideias para quiz ao vivo · Quiddo' : 'Quiddo · Quiz ao vivo';
  const description = guide?.resumo || (path === '/guias' ? 'Ideias de perguntas e dicas para organizar quizzes em festas, empresas e escolas. Prepare as rodadas e anime seu grupo com o Quiddo.' : 'Crie um quiz com suas perguntas e jogue ao vivo pelo celular. Veja o ranking a cada rodada e o pódio ao final no Quiddo.');
  const canonical = ORIGIN + path;
  const schema = indexable ? {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'Organization', '@id': `${ORIGIN}/#organization`, name: 'Quiddo', url: ORIGIN, logo: `${ORIGIN}/marca/quiddo-cor.svg` },
      { '@type': guide ? 'Article' : path === '/guias' ? 'CollectionPage' : 'WebSite', '@id': canonical + '#page', url: canonical, name: title, ...(guide ? { headline: guide.titulo, articleBody: guide.corpo.replace(/<[^>]+>/g, ' '), publisher: { '@id': `${ORIGIN}/#organization` } } : {}), description, inLanguage: 'pt-BR' },
      ...(guide ? [{ '@type': 'BreadcrumbList', itemListElement: [ ['Início', '/'], ['Guias', '/guias'], [guide.titulo, path] ].map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: ORIGIN + p })) }] : []),
    ],
  } : null;
  return { title, description, canonical, indexable, schema, type: guide ? 'article' : 'website' };
}
export function isAppPath(path: string) {
  return ['/criar', '/jogar', '/entrar'].includes(path) || /^\/host\/[A-Za-z0-9]{4}$/.test(path) && CODE_RE.test(path.slice(6).toUpperCase()) || /^\/[A-Za-z0-9]{4}$/.test(path) && CODE_RE.test(path.slice(1).toUpperCase());
}
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export function seoHead(path: string) {
  const s = seo(path);
  return `<title>${escape(s.title)}</title><meta name="description" content="${escape(s.description)}"><meta name="robots" content="${s.indexable ? 'index,follow' : 'noindex,follow'}">${s.indexable ? `<link rel="canonical" href="${escape(s.canonical)}">` : ''}<meta property="og:site_name" content="Quiddo"><meta property="og:locale" content="pt_BR"><meta property="og:type" content="${s.type}"><meta property="og:title" content="${escape(s.title)}"><meta property="og:description" content="${escape(s.description)}"><meta property="og:url" content="${escape(s.canonical)}"><meta property="og:image" content="${ORIGIN}/og.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:type" content="image/png"><meta property="og:image:alt" content="Quiddo — quiz ao vivo"><meta name="twitter:card" content="summary_large_image">${s.schema ? `<script type="application/ld+json" id="seo-schema">${JSON.stringify(s.schema).replace(/</g, '\\u003c')}</script>` : ''}`;
}
