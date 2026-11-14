import { GUIAS } from '../data/guias';
import { CODE_RE } from '../../shared/rules';
import { campaignOrigin } from '../../shared/campaign';

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

/**
 * Consent Mode v2 do Google. O padrão é sempre "denied" e só a escolha salva muda isso (update).
 * A personalização de anúncios continua negada: o aviso pede medição, não personalização.
 */
export type GoogleConsent = { analytics_storage: 'granted' | 'denied'; ad_storage: 'granted' | 'denied'; ad_user_data: 'granted' | 'denied'; ad_personalization: 'denied' };
export function googleConsent(c: Consent | null): GoogleConsent {
  const ads = googleAdsAllowed(c) ? 'granted' : 'denied';
  return { analytics_storage: c?.analytics === true ? 'granted' : 'denied', ad_storage: ads, ad_user_data: ads, ad_personalization: 'denied' };
}
/**
 * Sinais sem cookie do Google (modo avançado do Consent Mode) para quem ainda não escolheu ou recusou.
 * Desligado: sem aceite, nenhum script de terceiros carrega, como a página de privacidade promete.
 * Ligar exige reescrever a seção "O que medimos" antes.
 */
export const GOOGLE_SINAIS_SEM_ACEITE = false;
/** Rótulo do rodapé: o estado atual da medição, que reabre o aviso. */
export const consentLabel = (c: Consent | null) => (c?.analytics || c?.marketing ? 'Medição ligada' : 'Medição desligada');

export type ModoEvento = 'corporativo' | 'familia' | 'escola';
/** O modo do quiz vira uma categoria fixa: nunca o nome do quiz ou da empresa. */
export function modeCategory(theme: unknown): ModoEvento | null {
  return theme === 'corp' ? 'corporativo' : theme === 'festa' ? 'familia' : theme === 'escola' ? 'escola' : null;
}
export type PlanoMedido = 'mensal' | 'anual' | 'semana' | 'oferta';
/** IDs do catálogo de preços usados nos eventos da Meta. A oferta é o mesmo Passe 7 dias, com desconto. */
export const CONTENT_IDS: Record<PlanoMedido, string> = Object.freeze({ anual: 'qd-anual', mensal: 'qd-mensal', semana: 'qd-passe7', oferta: 'qd-passe7' });
export function publicPath(path: string): string | null {
  const p = path.replace(/\/+$/, '') || '/';
  if (['/', '/criar', '/jogar', '/precos', '/entrar', '/guias', '/privacidade'].includes(p)) return p;
  return GUIAS.some(g => g.corpo && p === '/guias/' + g.slug) ? p : null;
}

/** Checkout in a host room uses a fixed aggregate category, never the room URL. */
export function paymentPath(path: string): string | null {
  // a TV (/host/X) e o celular que paga a sala cheia pelo QR da TV (/pagar/X)
  const match = /^\/(?:host|pagar)\/([^/]+)\/?$/.exec(path);
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

export { campaignQuery, campaignOrigin } from '../../shared/campaign';

/** Etiquetas UTM da primeira visita por anúncio, guardadas só neste navegador por 90 dias. */
export const ORIGIN_KEY = 'qd_origem_v1';
export type Origin = { q: string; at: number };
export function firstTouch(stored: string | null, search: string, now = Date.now()): Origin | null {
  try {
    const o = JSON.parse(stored || 'null');
    if (o && typeof o.q === 'string' && o.q && typeof o.at === 'number' && o.at <= now && now - o.at < 90 * 86400000 && campaignOrigin('?' + o.q) === o.q) return { q: o.q, at: o.at };
  } catch { /* origem inválida: recomeça */ }
  const q = campaignOrigin(search);
  return q ? { q, at: now } : null;
}

/** Lead uma vez por navegador: id aleatório local, event_id com hash (igual ao do servidor). */
export const LEAD_KEY = 'qd_lead_v1';
export type LeadState = { id: string; sent: boolean };
export function leadState(raw: string | null): LeadState | null {
  try {
    const o = JSON.parse(raw || 'null');
    return o && typeof o.id === 'string' && /^[a-f0-9-]{36}$/.test(o.id) && typeof o.sent === 'boolean' ? { id: o.id, sent: o.sent } : null;
  } catch { return null; }
}
