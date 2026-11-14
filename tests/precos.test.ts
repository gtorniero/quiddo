import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { PRECOS, STRIPE_PRECO_ID, centavos, reais } from '../shared/precos.mjs';
import { PAGINAS, PRECOS_PADRAO, estadoPadrao, perguntasPlanos, precosHtml } from '../src/lib/paginas-html';

const raiz = join(__dirname, '..');
function arquivos(dir: string, fora: string[] = []): string[] {
  return readdirSync(join(raiz, dir)).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (fora.some((f) => caminho.startsWith(f))) return [];
    if (statSync(join(raiz, caminho)).isDirectory()) return arquivos(caminho, fora);
    return /\.(ts|mjs|html)$/.test(nome) ? [caminho] : [];
  });
}

describe('preços: uma fonte só (shared/precos.mjs)', () => {
  it('nenhum preço escrito à mão no site, no servidor ou nas regras', () => {
    const codigo = [...arquivos('src'), ...arquivos('worker', [join('worker', 'test')]), ...arquivos('shared', [join('shared', 'precos.')]), 'index.html'];
    const padroes = Object.values(PRECOS).map((v) => {
      const [int, dec] = v.split('.');
      return new RegExp(`(?<![\\d.,])${int}[.,]${dec}(?![\\d])`);
    });
    // em centavos (1990, 1290, 9900): nos guias, números assim são anos ("em 1990"), então ficam de fora só lá
    const emCentavos = Object.values(PRECOS)
      .filter((v) => centavos(v) >= 1000)
      .map((v) => new RegExp(`(?<!\\d)${centavos(v)}(?!\\d)`));
    const ids = Object.values(STRIPE_PRECO_ID);
    const achados: string[] = [];
    for (const f of codigo) {
      const texto = readFileSync(join(raiz, f), 'utf8');
      for (const re of padroes) if (re.test(texto)) achados.push(`${relative(raiz, join(raiz, f))}: ${re}`);
      if (!f.startsWith(join('src', 'data', 'guias'))) for (const re of emCentavos) if (re.test(texto)) achados.push(`${relative(raiz, join(raiz, f))}: ${re}`);
      for (const id of ids) if (texto.includes(id)) achados.push(`${f}: ${id}`);
    }
    expect(achados).toEqual([]);
  });

  it('a oferta da sala cheia nunca fica mais barata que a assinatura mensal', () => {
    expect(centavos(PRECOS.oferta)).toBeGreaterThanOrEqual(centavos(PRECOS.mensal));
    expect(centavos(PRECOS.oferta)).toBeLessThan(centavos(PRECOS.semana));
  });

  it('o Anual sai mais barato por mês que o Mensal', () => {
    expect(centavos(PRECOS.anual) / 12).toBeLessThan(centavos(PRECOS.mensal));
  });

  it('os ids do Stripe no wrangler.jsonc são os mesmos de shared/precos.mjs', () => {
    const w = readFileSync(join(raiz, 'wrangler.jsonc'), 'utf8');
    expect(w).toContain(`"STRIPE_PRECO_MENSAL_ID":"${STRIPE_PRECO_ID.mensal}"`);
    expect(w).toContain(`"STRIPE_PRECO_ANUAL_ID":"${STRIPE_PRECO_ID.anual}"`);
  });

  it('a página de planos e a descrição para buscadores usam os mesmos valores', () => {
    for (const p of ['mensal', 'anual', 'semana', 'oferta'] as const) expect(PRECOS_PADRAO[p]).toBe(reais(PRECOS[p]));
    const d = PAGINAS['/precos'].descricao;
    for (const p of ['mensal', 'anual', 'semana'] as const) expect(d).toContain(`R$ ${reais(PRECOS[p]).replace(/,00$/, '')}`);
    const html = precosHtml(estadoPadrao());
    expect(html).toContain(`R$ ${reais(PRECOS.semana)}`);
  });
});

describe('planos: grátis simples, marca no Passe e no Premium', () => {
  const cartoes = (periodo: 'anual' | 'mensal') => {
    const html = precosHtml({ ...estadoPadrao(), periodo });
    const [premium, passe, gratis] = html.split('<article').slice(1).map((a) => a.slice(0, a.indexOf('</article>')));
    return { premium, passe, gratis };
  };

  it('Passe e Premium listam logo e cor; o Grátis não', () => {
    const c = cartoes('anual');
    expect(c.premium).toContain('Sua marca: logo e cor');
    expect(c.passe).toContain('Sua marca: logo e cor');
    expect(c.gratis).not.toMatch(/logo|marca/i);
  });

  it('Mensal e Anual mostram exatamente os mesmos benefícios', () => {
    const lista = (s: string) => s.slice(s.indexOf('<ul>'), s.indexOf('</ul>'));
    expect(lista(cartoes('anual').premium)).toBe(lista(cartoes('mensal').premium));
  });

  it('as perguntas explicam o grátis e onde fica a marca', () => {
    const faq = Object.fromEntries(perguntasPlanos(estadoPadrao()));
    expect(faq['O que tem no plano grátis?']).toContain('até 10 pessoas');
    expect(faq['Posso usar o logo e a cor da minha marca?']).toContain('Passe 7 dias e na Assinatura Premium');
  });
});
