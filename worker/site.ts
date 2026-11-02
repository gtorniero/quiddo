import { isAppPath, publicPaths } from '../shared/seo';

export async function siteResponse(req: Request, assets: { fetch(request: Request): Promise<Response> }): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  if (!['GET', 'HEAD'].includes(req.method)) return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  const normalized = path.replace(/\/+$/, '') || '/';
  if (path !== normalized && (publicPaths.includes(normalized) || isAppPath(normalized))) {
    url.pathname = normalized;
    return Response.redirect(url.href, 301);
  }
  // Implementation files must not create duplicate indexable pages.
  if (path.endsWith('.html')) {
    const clean = path === '/index.html' ? '/' : path.slice(0, -5);
    if (publicPaths.includes(clean)) { url.pathname = clean; return Response.redirect(url.href, 301); }
  }
  const published = publicPaths.includes(path);
  const app = isAppPath(path);
  const staticFile = path.startsWith('/assets/') || path.startsWith('/marca/') || ['/favicon.svg', '/og.png', '/robots.txt', '/sitemap.xml'].includes(path);
  url.pathname = published ? path === '/' ? '/index.html' : `${path}.html` : app ? '/app.html' : staticFile ? path : '/404.html';
  const response = await assets.fetch(new Request(url, req));
  const headers = new Headers(response.headers);
  if (!published && !staticFile) headers.set('X-Robots-Tag', 'noindex, follow');
  if (app) headers.set('Cache-Control', 'private, no-store');
  const status = published || app || staticFile ? response.status : 404;
  return new Response(req.method === 'HEAD' ? null : response.body, { status, headers });
}
