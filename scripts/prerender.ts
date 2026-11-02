import type { Plugin } from 'vite';
import { homeHTML } from '../src/pages/home';
import { guidesHTML } from '../src/pages/guias';
import { headerHTML } from '../src/lib/layout';
import { ORIGIN, publicPaths, seoHead } from '../shared/seo';
export function prerender(): Plugin {
  return { name: 'quiddo-prerender', enforce: 'post', generateBundle(_, bundle) {
    const asset = bundle['index.html'];
    if (!asset || asset.type !== 'asset') return;
    const template = String(asset.source).replace(/<title>[\s\S]*?<\/title>/, '').replace(/<meta name="description"[^>]*>/, '');
    const render = (path: string, body: string) => template.replace('</head>', `${seoHead(path)}</head>`).replace('<header class="top" id="topo"></header>', `<header class="top" id="topo">${headerHTML(path)}</header>`).replace('<main id="conteudo" tabindex="-1"></main>', `<main id="conteudo" tabindex="-1" class="${path === '/' ? 'wide home' : ''}">${body}</main>`);
    // Keep a separate application shell so private routes never inherit home metadata.
    this.emitFile({ type: 'asset', fileName: 'app.html', source: render('/criar', '') });
    this.emitFile({ type: 'asset', fileName: '404.html', source: render('/404', '<section class="panel"><h1>Página não encontrada</h1><p>Este endereço não existe.</p><a href="/guias">Ver os guias</a></section>') });
    for (const path of publicPaths) {
      const html = render(path, path === '/' ? homeHTML() : guidesHTML(path === '/guias' ? undefined : path.slice(7)));
      if (path === '/') asset.source = html;
      else this.emitFile({ type: 'asset', fileName: `${path.slice(1)}.html`, source: html });
    }
    this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${publicPaths.map(p => `<url><loc>${ORIGIN}${p}</loc></url>`).join('')}</urlset>` });
    this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${ORIGIN}/sitemap.xml\n` });
  } };
}
