import { describe, expect, it } from 'vitest';
import { naoIndexar } from '../shared/seo';
import { DATAS_GUIAS } from '../src/data/guias-datas';
import { publicados } from '../src/lib/guias-html';
import { PAGINAS, appJsonLd, estadoPadrao, faqJsonLd, perguntasPlanos, precosHtml, privacidadeHtml } from '../src/lib/paginas-html';

describe('busca: o que entra e o que fica de fora', () => {
  it('medição, conta, login, sala, jogador e promoções ficam fora da busca', () => {
    for (const p of ['/medicao', '/medicao.html', '/medicao-vendor.js', '/conta', '/entrar/', '/host/ABCD', '/KX7Q', '/promocoes/']) expect(naoIndexar(p)).toBe(true);
    for (const p of ['/', '/criar', '/jogar', '/precos', '/guias', '/guias/quiz-de-natal-perguntas', '/privacidade', '/og-quiddo.png']) expect(naoIndexar(p)).toBe(false);
  });
  it('títulos e descrições únicos e no tamanho certo', () => {
    const paginas = Object.values(PAGINAS);
    expect(new Set(paginas.map((p) => p.titulo)).size).toBe(paginas.length);
    expect(new Set(paginas.map((p) => p.descricao)).size).toBe(paginas.length);
    for (const p of paginas) {
      expect(p.titulo.length).toBeLessThanOrEqual(60);
      expect(p.titulo.endsWith('· Quiddo')).toBe(true);
      expect(p.descricao.length).toBeLessThanOrEqual(160);
      expect(p.atualizado).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it('todo guia publicado tem data de publicação e da última mudança', () => {
    for (const g of publicados()) {
      const d = DATAS_GUIAS[g.slug];
      expect(d, g.slug).toBeDefined();
      expect(d[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(d[0] <= d[1]).toBe(true);
    }
  });
});

describe('página de planos', () => {
  const e = estadoPadrao();
  const html = precosHtml(e);
  it('a assinatura vem primeiro, com o Anual marcado; o Passe é a alternativa avulsa', () => {
    const assinatura = html.indexOf('Assinatura Premium'), passe = html.indexOf('Passe 7 dias'), gratis = html.indexOf('<h2>Grátis</h2>');
    expect(assinatura).toBeGreaterThan(-1);
    expect(assinatura).toBeLessThan(passe);
    expect(passe).toBeLessThan(gratis);
    expect(html).toMatch(/value="anual" checked/);
    expect(html).toContain('data-plano="anual"');
  });
  it('preços sem ambiguidade: Anual por ano (equivale por mês) e Mensal por mês', () => {
    expect(html).toContain('R$ 156<small>/ano</small>');
    expect(html).toContain('Equivale a R$ 13 por mês. No Mensal, R$ 15,99 por mês.');
    expect(html).not.toContain('R$ 13<small>/mês</small>');
    const mensal = precosHtml({ ...e, periodo: 'mensal' });
    expect(mensal).toContain('R$ 15,99<small>/mês</small>');
    expect(mensal).toContain('No Anual, R$ 156 por ano (R$ 13 por mês).');
    expect(html).toContain('Anual <small>-19%</small>');
  });
  it('dados estruturados: ofertas em BRL e as mesmas perguntas visíveis', () => {
    const app = appJsonLd(e);
    expect(app['@type']).toBe('SoftwareApplication');
    expect(app.offers.map((o) => [o.name, o.price, o.priceCurrency])).toEqual([
      ['Grátis, salas de até 10 pessoas', '0.00', 'BRL'],
      ['Assinatura Premium Anual', '156.00', 'BRL'],
      ['Assinatura Premium Mensal', '15.99', 'BRL'],
      ['Passe 7 dias', '12.99', 'BRL'],
    ]);
    const faq = faqJsonLd(perguntasPlanos(e));
    for (const q of faq.mainEntity) expect(html).toContain(`<summary>${q.name}</summary>`);
  });
});

describe('privacidade descreve o que o código faz', () => {
  const html = privacidadeHtml();
  it('tem a seção de medição para o link do aviso, o responsável e o contato', () => {
    expect(html).toContain('id="medicao"');
    expect(html).toContain('69.746.447/0001-00');
    expect(html).toContain('oi@quiddo.com.br');
  });
  it('diz que sem aceite nada carrega e que a Meta recebe mais que a compra', () => {
    expect(html).toContain('Sem o seu aceite, nada disso carrega.');
    for (const t of ['visitas às páginas públicas', 'abertura de sala', 'início do pagamento', 'hash SHA-256', 'Não vendemos dados']) expect(html).toContain(t);
  });
});
