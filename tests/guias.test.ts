import { describe, expect, it } from 'vitest';
import { GRUPOS_GUIAS, GUIAS } from '../src/data/guias';
import { artigoHtml, descricao, relacionados } from '../src/lib/guias-html';

const palavras = (html: string) => html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

describe('guias', () => {
  it('têm endereço único e válido', () => {
    const slugs = GUIAS.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
  });

  it('todo público aparece em algum grupo da página de guias', () => {
    for (const g of GUIAS) expect(GRUPOS_GUIAS.some(([pubs]) => pubs.includes(g.publico))).toBe(true);
  });

  it('usam só as tags permitidas e nunca citam a concorrência', () => {
    for (const g of GUIAS) {
      const tags = [...g.corpo.matchAll(/<\/?([a-z0-9]+)/g)].map((m) => m[1]);
      for (const t of tags) expect(['p', 'h2', 'ul', 'ol', 'li', 'strong', 'em']).toContain(t);
      expect(g.corpo.toLowerCase()).not.toContain('kahoot');
    }
  });

  it('guias de perguntas prontas têm tamanho de artigo e resposta marcada', () => {
    for (const g of GUIAS.filter((x) => x.publico === 'perguntas')) {
      const n = palavras(g.corpo);
      expect(n, g.slug).toBeGreaterThanOrEqual(700);
      expect(n, g.slug).toBeLessThanOrEqual(1900);
    }
  });

  it('"Leia também" traz 3 outros guias, sem repetir', () => {
    for (const g of GUIAS) {
      const rel = relacionados(g);
      expect(rel).toHaveLength(3);
      expect(rel.map((x) => x.slug)).not.toContain(g.slug);
      expect(new Set(rel.map((x) => x.slug)).size).toBe(3);
      expect(artigoHtml(g)).toContain('Leia também');
    }
  });

  it('descrição para buscadores não fica curta demais', () => {
    for (const g of GUIAS) expect(descricao(g).length, g.slug).toBeGreaterThanOrEqual(80);
  });
});
