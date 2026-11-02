import { describe, expect, it } from 'vitest';
import { publicPaths, seo, seoHead } from '../shared/seo';
import { siteResponse } from '../worker/site';
import { homeHTML } from '../src/pages/home';
import { guidesHTML } from '../src/pages/guias';

const assets = { fetch: async (req: Request) => new Response(new URL(req.url).pathname, { headers: { 'Content-Type': 'text/html' } }) };
const request = (path: string, method = 'GET') => siteResponse(new Request(`https://quiddo.com.br${path}`, { method }), assets);
describe('SEO public pages', () => {
  it('publishes exactly 20 unique guides and two entry pages', () => {
    expect(publicPaths).toHaveLength(22);
    expect(new Set(publicPaths).size).toBe(22);
    expect(new Set(publicPaths.map(p => seo(p).title)).size).toBe(22);
    expect(new Set(publicPaths.map(p => seo(p).description)).size).toBe(22);
  });
  it.each(publicPaths)('renders content and matching structured data for %s', path => {
    const html = path === '/' ? homeHTML() : guidesHTML(path === '/guias' ? undefined : path.slice(7));
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    expect(html).toContain('href="/criar"');
    expect(seo(path).canonical).toBe(`https://quiddo.com.br${path}`);
    expect(seoHead(path)).toContain('index,follow');
    expect(JSON.stringify(seo(path).schema)).toContain(seo(path).canonical);
  });
  it.each(publicPaths)('serves the prerender for %s', async path => {
    const response = await request(path + '?utm_source=test');
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(path === '/' ? '/index.html' : `${path}.html`);
  });
  it.each(['/criar', '/jogar', '/entrar', '/host/KX7Q', '/KX7Q'])('does not index application route %s', async path => {
    const response = await request(path);
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Robots-Tag')).toContain('noindex');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.text()).toBe('/app.html');
    expect(seo(path).indexable).toBe(false);
    expect(seoHead(path)).not.toContain('rel="canonical"');
  });
  it.each(['/inexistente', '/guias/nao-existe', '/app.html', '/404.html', '/host/invalid'])('returns a real 404 for %s', async path => {
    const response = await request(path);
    expect(response.status).toBe(404);
    expect(response.headers.get('X-Robots-Tag')).toContain('noindex');
  });
  it('redirects aliases and trailing slashes while preserving parameters', async () => {
    for (const path of ['/guias/', '/guias.html', '/index.html']) {
      const response = await request(path + '?utm_source=test');
      expect(response.status).toBe(301);
      expect(response.headers.get('Location')).toContain('?utm_source=test');
    }
  });
  it('supports HEAD and rejects unsupported methods', async () => {
    expect(await (await request('/inexistente', 'HEAD')).text()).toBe('');
    expect((await request('/', 'POST')).status).toBe(405);
  });
});
