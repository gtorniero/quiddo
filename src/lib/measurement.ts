import {revokeMeta,metaContext} from './meta-consent';
import { CONSENT_KEY, publicPath, paymentPath, gamePath, measurementHost, safeReferrer, productUsageAllowed, needsUsageChoice, readConsent, campaignQuery, googleAdsAllowed, needsAdsChoice, type Consent } from './measurement-policy';

let consent: Consent | null = null;
let frame: HTMLIFrameElement | null = null;
let ready = false;
let currentPath: string | null = null;
let currentPaymentPath: string | null = null;
let currentGamePath: string | null = null;
let previousLocation = '';
let pageReferrer = safeReferrer(typeof document === 'undefined' ? '' : document.referrer);
let transientPath: string | null = null;
let transientTimer = 0;
let lastPage = '';
const pending: ((ok: boolean) => void)[] = [];
const EVENTS = ['create_room','begin_checkout','purchase','navigation','quiz_create','quiz_template_apply','quiz_edit_start','quiz_save','quiz_save_error','create_room_start','create_room_error','join_room_start','join_room','join_room_error','game_start','answer_recorded','game_complete','view_offer','select_plan','checkout_error','access_granted','pdf_upload_start','pdf_upload_success','pdf_upload_error','ai_generation_start','ai_generation_success','ai_generation_error','ai_generation_pending','ai_review_open'] as const;
export type MeasureEvent = typeof EVENTS[number];
let campaign = campaignQuery(typeof location === 'undefined' ? '' : location.search);
export type Sale = { transaction_id: string; value: number; currency: 'BRL'; plano: 'mensal' | 'anual' | 'semana' | 'oferta' };
export type MeasureParams = Partial<Sale> & { payment_type?: 'pix' | 'card'; role?: 'host' | 'player'; source?: 'manual' | 'template' | 'import' | 'pdf' | 'text'; storage?: 'local' | 'cloud'; method?: 'promo' | 'existing_code'; destination?: string; question_count?: number; error_category?: 'network' | 'rejected' | 'invalid_input' | 'quota' | 'provider' | 'pending' | 'conflict' | 'storage' | 'unknown' | 'login_required' | 'already_subscribed' };
let sequence = 0;
const callbacks = new Map<number, (queued: boolean) => void>();
const purchasesInFlight = new Set<string>();
const once = new Map<string, Promise<boolean>>();
const optionalCampaign = () => campaignQuery(campaign, googleAdsAllowed(consent));
const permitted = () => typeof location !== 'undefined' && measurementHost(location.hostname) && !!(consent?.analytics || consent?.marketing);

function removeFrame() {
  frame?.remove(); frame = null; ready = false; lastPage = ''; for (const done of pending.splice(0)) done(false);
  for (const done of [...callbacks.values()]) done(false);
}
function send(event: string, id?: number, params: MeasureParams = {}, path = currentPath, referrer = pageReferrer) {
  if (!ready || !frame?.contentWindow || !path || !permitted()) return false;
  frame.contentWindow.postMessage({ type: 'qd_measure', event, path, id, params, campaign: optionalCampaign(), referrer }, location.origin);
  return true;
}
function sync() {
  if (!(currentPath || (currentGamePath && productUsageAllowed(consent)) || transientPath) || !permitted()) {
    removeFrame(); return;
  }
  if (!frame) {
    frame = document.createElement('iframe');
    frame.hidden = true; frame.title = 'Medição opcional'; frame.referrerPolicy = 'no-referrer';
    frame.src = '/medicao.html' + optionalCampaign();
    document.body.appendChild(frame);
  }
  if (ready && currentPath && lastPage !== currentPath) { send('page_view'); lastPage = currentPath; }
}
function bridgeReady(): Promise<boolean> {
  if (ready) return Promise.resolve(true);
  if (!(currentPath || (currentGamePath && productUsageAllowed(consent)) || transientPath) || !permitted()) return Promise.resolve(false);
  return new Promise(resolve => {
    const done = (ok: boolean) => { clearTimeout(timer); const i = pending.indexOf(done); if (i >= 0) pending.splice(i, 1); resolve(ok); };
    const timer = window.setTimeout(() => done(false), 2000);
    pending.push(done);
  });
}
function eventPath(event: typeof EVENTS[number]) {
  if (['join_room_start','join_room','join_room_error','game_start','answer_recorded','game_complete'].includes(event)) return currentGamePath || currentPath;
  return currentPath || (['begin_checkout','purchase','view_offer','select_plan','checkout_error','access_granted'].includes(event) ? currentPaymentPath : null);
}
function cleanTransient() {
  clearTimeout(transientTimer);
  // A timed-out vendor may still finish loading. Payment/access never waits indefinitely.
  transientTimer = window.setTimeout(() => { transientPath = null; sync(); }, 3000);
}
export async function track(event: typeof EVENTS[number], params: MeasureParams = {}): Promise<boolean> {
  const path = eventPath(event);
  const referrer = pageReferrer;
  if (!path || !permitted()) return false;
  // Detailed product use is analytics only. Existing Meta commerce events stay unchanged.
  if (!productUsageAllowed(consent) && !['create_room','begin_checkout','purchase'].includes(event)) return false;
  if (!currentPath) { transientPath = path; clearTimeout(transientTimer); sync(); }
  if (!await bridgeReady()) { if (transientPath) cleanTransient(); return false; }
  return new Promise<boolean>(resolve => {
    const id = ++sequence;
    const done = (queued: boolean) => { clearTimeout(timer); callbacks.delete(id); if (transientPath) cleanTransient(); resolve(queued); };
    const timer = window.setTimeout(() => done(false), 2000);
    callbacks.set(id, done);
    if (!send(event, id, params, path, referrer)) done(false);
  });
}
export function measurePage(path: string) {
  const next = publicPath(path);
  const nextGame = gamePath(path);
  if (next !== currentPath || nextGame !== currentGamePath) {
    pageReferrer = previousLocation || pageReferrer;
    previousLocation = (next || nextGame) ? 'https://www.quiddo.com.br' + (next || nextGame) : '';
    lastPage = '';
  }
  currentPath = next;
  currentPaymentPath = paymentPath(path);
  currentGamePath = nextGame;
  sync();
}
/** Local keys only; IDs used to avoid duplicate saves are never sent to vendors. */
export async function trackOnce(event: MeasureEvent, localKey: string, params: MeasureParams = {}) {
  const key = event + ':' + localKey;
  if (once.has(key)) return once.get(key)!;
  const task = track(event, params);
  once.set(key, task);
  if (!await task) once.delete(key);
  return task;
}
function clearOptionalCookies() {
  for (const item of document.cookie.split(';')) {
    const name = item.trim().split('=')[0];
    if (!/^(_ga(?:_|$)|_gid$|_gat(?:_|$)|_fbp$|_fbc$|_gcl_)/.test(name)) continue;
    for (const domain of ['', location.hostname, '.quiddo.com.br']) {
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? '; Domain=' + domain : ''}`;
    }
  }
}
function save(analytics: boolean, marketing: boolean) {
  try{localStorage.setItem('btw_capi_choice_v1',marketing?'yes':'no')}catch{}
  if(!marketing)revokeMeta();
  consent = { version: 1, analytics, marketing, googleAdsMeasurement: analytics && marketing, productUsageMeasurement: analytics, at: Date.now() };
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify(consent)); } catch { /* escolha vale nesta página */ }
  removeFrame(); clearOptionalCookies();
  if(marketing)metaContext();
  document.getElementById('qd-consent')?.remove();
  sync();
}
export function showConsent() {
  document.getElementById('qd-consent')?.remove();
  const box = document.createElement('section');
  box.id = 'qd-consent'; box.className = 'consent-box';
  box.setAttribute('aria-label', 'Preferências de privacidade');
  // barra simples no pé da tela, como na maioria dos sites: uma frase e dois botões do mesmo peso
  box.innerHTML = `<p>Com seu aceite, Google e Meta usam cookies, identificadores de clique e eventos de visita e compra para medir anúncios. O Google também recebe etapas de uso, sem nomes, perguntas, respostas ou conteúdo de arquivos. A Meta também recebe a compra confirmada e uma versão protegida do e-mail. Recusar não impede o uso do Quiddo. <a href="/privacidade" data-link>Saiba mais</a></p>
    <div class="consent-actions"><button type="button" class="btn sec" data-consent="reject">Recusar</button><button type="button" class="btn" data-consent="accept">Aceitar</button></div>`;
  box.addEventListener('click', e => {
    const action = (e.target as HTMLElement).closest<HTMLElement>('[data-consent]')?.dataset.consent;
    if (action) save(action === 'accept', action === 'accept');
  });
  document.body.appendChild(box);
}
export function initMeasurement() {
  if (!measurementHost(location.hostname)) return;
  try { consent = readConsent(localStorage.getItem(CONSENT_KEY)); } catch { consent = null; }
  window.addEventListener('message', e => {
    if (e.origin !== location.origin || e.source !== frame?.contentWindow) return;
    if (e.data?.type === 'qd_done') { callbacks.get(e.data.id)?.(e.data.queued === true); return; }
    if (e.data?.type !== 'qd_ready') return;
    frame.contentWindow?.postMessage({ type: 'qd_init', analytics: !!consent?.analytics, marketing: !!consent?.marketing, googleAdsMeasurement: googleAdsAllowed(consent), productUsageMeasurement: productUsageAllowed(consent) }, location.origin);
    ready = true;
    sync();
    for (const done of pending.splice(0)) done(true);
  });
  window.addEventListener('storage', e => {
    if (e.key !== CONSENT_KEY && e.key !== null) return;
    try { consent = readConsent(localStorage.getItem(CONSENT_KEY)); } catch { consent = null; }
    removeFrame(); clearOptionalCookies(); sync();
  });
  document.getElementById('privacy-preferences')?.addEventListener('click', showConsent);
  if (!consent || !localStorage.getItem('btw_capi_choice_v1') || needsAdsChoice(consent) || needsUsageChoice(consent)) showConsent();
}

/** Somente metadados retornados pelo status pago do servidor, nunca código de acesso. */
export async function trackPurchase(sale?: Sale) {
  if (!sale || !/^[a-f0-9]{64}$/.test(sale.transaction_id) || !Number.isFinite(sale.value) || sale.value <= 0 || sale.currency !== 'BRL' || !(consent?.analytics || consent?.marketing) || !eventPath('purchase') || purchasesInFlight.has(sale.transaction_id)) return;
  try {
    const key = 'qd_sale_' + sale.transaction_id;
    if (localStorage.getItem(key)) return;
    purchasesInFlight.add(sale.transaction_id);
    const queued = await track('purchase', sale);
    // This confirms SDK queuing, not a receipt from GA4. Stable transaction/event IDs remain the final dedup keys.
    if (queued && (consent?.analytics || consent?.marketing)) localStorage.setItem(key, '1');
  } catch { /* Measurement failures never block payment or access. */ }
  finally { purchasesInFlight.delete(sale.transaction_id); }
}
