import { GUIAS } from '../data/guias';
import { CODE_RE } from '../../shared/rules';

export interface Consent { version: 1; analytics: boolean; marketing: boolean; at: number; googleAdsMeasurement?: boolean; productUsageMeasurement?: boolean }
export const CONSENT_KEY = 'qd_consent_v1';
export const productUsageAllowed = (c: Consent | null) => c?.analytics === true && c.productUsageMeasurement === true;
export const needsUsageChoice = (c: Consent | null) => c?.analytics === true && typeof c.productUsageMeasurement !== 'boolean';
// Legacy permission never silently expands to Google's advertising measurement.
export function googleAdsAllowed(c: Consent | null): boolean {
  return c?.analytics === true && c.marketing === true && c.googleAdsMeasurement === true;
}
export function needsAdsChoice(c: Consent | null): boolean {
  return !!c?.marketing && typeof c.googleAdsMeasurement !== 'boolean';
}
export function publicPath(path: string): string | null {
  const p = path.replace(/\/+$/, '') || '/';
  if (['/', '/criar', '/jogar', '/precos', '/entrar', '/guias', '/privacidade'].includes(p)) return p;
  return GUIAS.some(g => g.corpo && p === '/guias/' + g.slug) ? p : null;
}

/** Checkout in a host room uses a fixed aggregate category, never the room URL. */
export function paymentPath(path: string): string | null {
  const match = /^\/host\/([^/]+)\/?$/.exec(path);
  return match && CODE_RE.test(match[1]) ? '/pagamento' : null;
}
/** Categories only: room codes and account identifiers never leave the app. */
export function gamePath(path: string): string | null {
  if (paymentPath(path)) return '/partida/anfitriao';
  const m = /^\/([^/]+)\/?$/.exec(path);
  return m && CODE_RE.test(m[1]) ? '/partida/jogador' : null;
}
export function measurementHost(host: string): boolean {
  return ['quiddo.com.br', 'www.quiddo.com.br'].includes(host);
}
/** An external origin is enough for acquisition; never send its path/query. */
export function safeReferrer(raw: string): string {
  try {
    const u = new URL(raw);
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.port ||
        !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(u.hostname) || /(?:^|\.)(?:localhost|local|internal|test|invalid)$/i.test(u.hostname)) return '';
    if (measurementHost(u.hostname)) {
      const path = publicPath(u.pathname) || (['/partida/anfitriao','/partida/jogador'].includes(u.pathname) ? u.pathname : '/');
      return 'https://www.quiddo.com.br' + path;
    }
    return u.origin + '/';
  } catch { return ''; }
}
export function readConsent(raw: string | null, now = Date.now()): Consent | null {
  try {
    const c = JSON.parse(raw || 'null');
    return c?.version === 1 && typeof c.analytics === 'boolean' && typeof c.marketing === 'boolean' &&
      typeof c.at === 'number' && c.at <= now && now - c.at < 180 * 86400000 ? c : null;
  } catch { return null; }
}

/** Só rótulos de campanha e IDs de clique; nunca propaga a query original. */
export function campaignQuery(search: string, allowAdClicks = true): string {
  const input = new URLSearchParams(search), out = new URLSearchParams();
  for (const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','fbclid','gbraid','wbraid']) {
    const value = input.get(key);
    const click = ['gclid','fbclid','gbraid','wbraid'].includes(key);
    if (click && !allowAdClicks) continue;
    if (value && /^[a-z0-9_.-]{1,200}$/i.test(value) && (click || !/\d{7,}/.test(value))) out.set(key, value);
  }
  return out.toString() ? '?' + out.toString() : '';
}
