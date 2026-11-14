// Preços do Quiddo, em reais com ponto. É a única fonte: o servidor (Pix, cartão e conferência do Stripe),
// o site, as páginas pré-renderizadas e a conferência da assinatura do Quiz com IA leem daqui.
// Para mudar um preço, mude só aqui. Mensal e Anual também precisam de um preço novo no Stripe com o
// mesmo valor: o id vai em STRIPE_PRECO_ID e nas variáveis STRIPE_PRECO_MENSAL_ID e STRIPE_PRECO_ANUAL_ID
// do wrangler.jsonc (os testes conferem que os dois batem).
// Preços de 14/11/2026 (aprovados pelo dono): Mensal R$ 12,90, Anual R$ 99 (equivale a R$ 8,25 por mês),
// Passe 7 dias R$ 19,90. Regra da oferta da sala cheia: nunca mais barata que o Mensal (tests/precos.test.ts).
export const PRECOS = Object.freeze({
  semana: '19.90', // Passe 7 dias, avulso, no Pix ou no cartão
  oferta: '12.90', // o mesmo Passe, só para o anfitrião da sala grátis cheia com gente esperando (= o Mensal)
  mensal: '12.90', // Assinatura Premium, cobrança mensal no cartão
  anual: '99.00', // Assinatura Premium, cobrança anual no cartão
});

/**
 * Ids dos preços de produção no Stripe (não são segredo). O valor de cada um tem que ser igual ao de PRECOS.
 * PENDENTE (14/11/2026): os ids abaixo ainda são os de R$ 15,99/mês e R$ 156/ano. Antes do merge, criar no Stripe,
 * nos mesmos produtos, os preços novos (BRL 12,90 por mês e BRL 99 por ano) e trocar aqui e no wrangler.jsonc.
 * Sem a troca, o servidor recusa o checkout da assinatura (o preço do Stripe não bate) e nada é cobrado errado.
 */
export const STRIPE_PRECO_ID = Object.freeze({
  mensal: 'price_1UXtp0134hMOoEZV4zpJZiw6',
  anual: 'price_1UXtqY134hMOoEZVGgIdzQ7a',
});

/** "15.99" → 1599 */
export const centavos = (valor) => Math.round(Number(valor) * 100);

/** "15.99" → "15,99" */
export const reais = (valor) => Number(valor).toFixed(2).replace('.', ',');
