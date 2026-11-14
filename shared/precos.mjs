// Preços do Quiddo, em reais com ponto. É a única fonte: o servidor (Pix, cartão e conferência do Stripe),
// o site, as páginas pré-renderizadas e a conferência da assinatura do Quiz com IA leem daqui.
// Para mudar um preço, mude só aqui. Mensal e Anual também precisam de um preço novo no Stripe com o
// mesmo valor: o id vai em STRIPE_PRECO_ID e nas variáveis STRIPE_PRECO_MENSAL_ID e STRIPE_PRECO_ANUAL_ID
// do wrangler.jsonc (os testes conferem que os dois batem).
export const PRECOS = Object.freeze({
  semana: '12.99', // Passe 7 dias, avulso, no Pix ou no cartão
  oferta: '9.99', // o mesmo Passe, só para o anfitrião da sala grátis cheia com gente esperando
  mensal: '15.99', // Assinatura Premium, cobrança mensal no cartão
  anual: '156.00', // Assinatura Premium, cobrança anual no cartão
});

/** Ids dos preços de produção no Stripe (não são segredo). O valor de cada um tem que ser igual ao de PRECOS. */
export const STRIPE_PRECO_ID = Object.freeze({
  mensal: 'price_1UXtp0134hMOoEZV4zpJZiw6',
  anual: 'price_1UXtqY134hMOoEZVGgIdzQ7a',
});

/** "15.99" → 1599 */
export const centavos = (valor) => Math.round(Number(valor) * 100);

/** "15.99" → "15,99" */
export const reais = (valor) => Number(valor).toFixed(2).replace('.', ',');
