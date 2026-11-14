// Etiquetas de campanha (UTM) e identificadores de clique. Usado pelo site e pelo servidor.
// Só valores simples passam; e-mail, telefone, CPF e qualquer outro parâmetro da URL ficam de fora.

export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id'] as const;
export const CLICK_KEYS = ['gclid', 'fbclid', 'gbraid', 'wbraid'] as const;

/**
 * Sequências de 7 a 14 dígitos parecem telefone, CPF ou CNPJ e são descartadas.
 * IDs numéricos de anúncio da Meta ({{ad.id}}, {{campaign.id}}) têm 15 dígitos ou mais e passam.
 */
export function utmValueOk(value: string): boolean {
  if (!/^[a-z0-9_.-]{1,200}$/i.test(value)) return false;
  return !(value.match(/\d+/g) || []).some((run) => run.length >= 7 && run.length <= 14);
}

/** Só rótulos de campanha e IDs de clique; nunca propaga a query original. */
export function campaignQuery(search: string, allowAdClicks = true): string {
  const input = new URLSearchParams(search), out = new URLSearchParams();
  for (const key of [...UTM_KEYS, ...CLICK_KEYS]) {
    const value = input.get(key);
    const click = (CLICK_KEYS as readonly string[]).includes(key);
    if (click && !allowAdClicks) continue;
    if (value && (click ? /^[a-z0-9_.-]{1,200}$/i.test(value) : utmValueOk(value))) out.set(key, value);
  }
  return out.toString() ? '?' + out.toString() : '';
}

/**
 * Origem da compra: só as etiquetas UTM da primeira visita (dados do anúncio, não da pessoa).
 * Identificadores de clique nunca entram. Devolve "" se não houver nada válido.
 */
export function campaignOrigin(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length > 1500) return '';
  return campaignQuery(raw, false).slice(1);
}
