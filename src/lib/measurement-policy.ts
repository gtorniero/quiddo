import { GUIAS } from '../data/guias';

export interface Consent { version: 1; analytics: boolean; marketing: boolean; at: number }
export const CONSENT_KEY = 'qd_consent_v1';
export function publicPath(path: string): string | null {
  const p = path.replace(/\/+$/, '') || '/';
  if (['/', '/criar', '/jogar', '/precos', '/entrar', '/guias', '/privacidade'].includes(p)) return p === '/entrar' ? '/jogar' : p;
  return GUIAS.some(g => g.corpo && p === '/guias/' + g.slug) ? p : null;
}
export function readConsent(raw: string | null, now = Date.now()): Consent | null {
  try {
    const c = JSON.parse(raw || 'null');
    return c?.version === 1 && typeof c.analytics === 'boolean' && typeof c.marketing === 'boolean' &&
      typeof c.at === 'number' && c.at <= now && now - c.at < 180 * 86400000 ? c : null;
  } catch { return null; }
}

/** Só rótulos de campanha e IDs de clique; nunca propaga a query original. */
export function campaignQuery(search: string): string {
  const input = new URLSearchParams(search), out = new URLSearchParams();
  for (const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','fbclid','gbraid','wbraid']) {
    const value = input.get(key);
    if (value && /^[a-z0-9_.-]{1,200}$/i.test(value)) out.set(key, value);
  }
  return out.toString() ? '?' + out.toString() : '';
}
