import { describe, expect, it } from 'vitest';
import { GRUPOS_GUIAS, GUIAS } from '../src/data/guias';
import { artigoHtml, descricao, relacionados } from '../src/lib/guias-html';
import { esc } from '../src/lib/dom';
import { MODELOS } from '../src/data/modelos';
import { LIMITS } from '../shared/rules';

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
      for (const t of tags) expect(['p', 'h2', 'ul', 'ol', 'li', 'strong', 'em', 'a']).toContain(t);
      expect(g.corpo.toLowerCase()).not.toContain('kahoot');
      expect(JSON.stringify(g.faq ?? []).toLowerCase()).not.toContain('kahoot');
    }
  });

  it('links no texto são internos e levam a páginas que existem', () => {
    const destinos = new Set([
      '/criar',
      '/precos',
      ...MODELOS.map((m) => `/criar?modelo=${m.id}`),
      ...GUIAS.filter((g) => g.corpo).map((g) => `/guias/${g.slug}`),
    ]);
    for (const g of GUIAS) {
      for (const [a] of g.corpo.matchAll(/<a\b[^>]*>/g)) {
        const m = a.match(/^<a (?:class="btn auto" )?href="([^"]+)" data-link>$/);
        expect(m, `${g.slug}: ${a}`).not.toBeNull();
        expect(destinos.has(m![1]), `${g.slug}: ${m![1]}`).toBe(true);
        expect(m![1]).not.toBe(`/guias/${g.slug}`);
      }
    }
  });

  it('quizzes prontos são válidos para o editor e para o servidor', () => {
    const ids = MODELOS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of MODELOS) {
      expect(m.perguntas, m.id).toHaveLength(10);
      for (const p of m.perguntas) {
        expect(p.t.length, p.t).toBeLessThanOrEqual(LIMITS.questionText);
        expect(p.o.length, p.t).toBeGreaterThanOrEqual(2);
        expect(p.o.length, p.t).toBeLessThanOrEqual(4);
        for (const o of p.o) expect(o.length, o).toBeLessThanOrEqual(LIMITS.answerText);
        expect(p.c, p.t).toBeGreaterThanOrEqual(0);
        expect(p.c, p.t).toBeLessThan(p.o.length);
        if (p.vf) expect(p.o).toEqual(['Verdadeiro', 'Falso']);
      }
    }
  });

  it('perguntas frequentes aparecem no artigo, de 3 a 5', () => {
    for (const g of GUIAS.filter((x) => x.faq)) {
      expect(g.faq!.length, g.slug).toBeGreaterThanOrEqual(3);
      expect(g.faq!.length, g.slug).toBeLessThanOrEqual(5);
      const html = artigoHtml(g);
      expect(html).toContain('<h2 id="perguntas-frequentes">Perguntas frequentes</h2>');
      for (const [q, r] of g.faq!) {
        expect(html).toContain(`<h3>${esc(q)}</h3>`);
        expect(html).toContain(`<p>${esc(r)}</p>`);
      }
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
