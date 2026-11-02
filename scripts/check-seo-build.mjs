import { readFile, access } from 'node:fs/promises';
import assert from 'node:assert/strict';

const root = new URL('../dist/client/', import.meta.url);
const sitemap = await readFile(new URL('sitemap.xml', root), 'utf8');
const paths = [...sitemap.matchAll(/<loc>https:\/\/quiddo.com.br([^<]*)<\/loc>/g)].map(x => x[1]);
assert.equal(paths.length, 22, 'Home, directory and 20 guides must be published');
for (const path of paths) {
  const file = path === '/' ? 'index.html' : `${path.slice(1)}.html`;
  const html = await readFile(new URL(file, root), 'utf8');
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1, file);
  assert(html.includes(`rel="canonical" href="https://quiddo.com.br${path}"`), file);
  assert(html.includes('content="index,follow"'), file);
  for (const match of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) JSON.parse(match[1]);
  for (const match of html.matchAll(/href="(\/guias(?:\/[a-z0-9-]+)?)"/g)) assert(paths.includes(match[1]), `Broken guide link: ${match[1]}`);
}
for (const name of ['app.html', '404.html']) {
  const html = await readFile(new URL(name, root), 'utf8');
  assert(html.includes('content="noindex,follow"'), name);
  assert(!html.includes('rel="canonical"'), name);
  assert(!html.includes('application/ld+json'), name);
}
assert((await readFile(new URL('robots.txt', root), 'utf8')).includes('Sitemap: https://quiddo.com.br/sitemap.xml'));
await access(new URL('og.png', root));
console.log('SEO build verified: 22 prerenders, canonical URLs, JSON-LD, internal guide links, noindex shells, robots and social image.');
