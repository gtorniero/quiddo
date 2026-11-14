export type PlanoComPreco = 'semana' | 'oferta' | 'mensal' | 'anual';
export const PRECOS: Readonly<Record<PlanoComPreco, string>>;
export const STRIPE_PRECO_ID: Readonly<{ mensal: string; anual: string }>;
export function centavos(valor: string): number;
export function reais(valor: string): string;
