import {revokeMeta,metaContext} from './meta-consent';
import { CONSENT_KEY, publicPath, paymentPath, gamePath, measurementHost, safeReferrer, productUsageAllowed, needsUsageChoice, readConsent, campaignQuery, googleAdsAllowed, needsAdsChoice, consentLabel, googleConsent, GOOGLE_SINAIS_SEM_ACEITE, LEAD_KEY, leadState, type Consent, type ModoEvento } from './measurement-policy';

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
const EVENTS = ['create_room','begin_checkout','purchase','view_item','navigation','quiz_create','quiz_template_apply','quiz_edit_start','quiz_save','quiz_save_error','create_room_start','create_room_error','join_room_start','join_room','join_room_error','game_start','answer_recorded','game_complete','view_offer','select_plan','checkout_error','access_granted','pdf_upload_start','pdf_upload_success','pdf_upload_error','ai_generation_start','ai_generation_success','ai_generation_error','ai_generation_pending','ai_review_open'] as const;
export type MeasureEvent = typeof EVENTS[number];
let campaign = campaignQuery(typeof location === 'undefined' ? '' : location.search);
export type Sale = { transaction_id: string; value: number; currency: 'BRL'; plano: 'mensal' | 'anual' | 'semana' | 'oferta' };
export type MeasureParams = Partial<Sale> & { modo?: ModoEvento; lead_id?: string; precos?: Partial<Record<'anual' | 'mensal' | 'semana', number>>; payment_type?: 'pix' | 'card'; role?: 'host' | 'player'; source?: 'manual' | 'template' | 'import' | 'pdf' | 'text'; storage?: 'local' | 'cloud'; method?: 'promo' | 'existing_code'; destination?: string; question_count?: number; error_category?: 'network' | 'rejected' | 'invalid_input' | 'quota' | 'provider' | 'pending' | 'conflict' | 'storage' | 'unknown' | 'login_required' | 'already_subscribed' };
let sequence = 0;
const callbacks = new Map<number, (queued: boolean) => void>();
const purchasesInFlight = new Set<string>();
const once = new Map<string, Promise<boolean>>();
const optionalCampaign = () => campaignQuery(campaign, googleAdsAllowed(consent));
/** Funil de aquisição: o único medido sem a medição de uso detalhado. */
const FUNNEL: MeasureEvent[] = ['create_room', 'view_item', 'begin_checkout', 'purchase'];
// Sem aceite, o iframe só existe se os sinais sem cookie do Google estiverem ligados (desligados por padrão).
const permitted = () => typeof location !== 'undefined' && measurementHost(location.hostname) && !!(consent?.analytics || consent?.marketing || GOOGLE_SINAIS_SEM_ACEITE);

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
  if (!productUsageAllowed(consent) && !FUNNEL.includes(event)) return false;
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
function updateLabel() {
  const b = document.getElementById('privacy-preferences');
  // o estado aparece no rodapé; o complemento só para leitor de tela
  if (b) b.innerHTML = `${consentLabel(consent)}<span class="sr">: mudar a escolha de cookies</span>`;
}
let opener: HTMLElement | null = null;
function closeConsent() {
  const box = document.getElementById('qd-consent');
  const hadFocus = !!box?.contains(document.activeElement);
  box?.remove();
  document.documentElement.style.removeProperty('--aviso-h');
  // quem abriu pelo rodapé volta para o mesmo botão
  if (hadFocus) (opener || document.getElementById('conteudo'))?.focus({ preventScroll: true });
  opener = null;
}
function save(analytics: boolean, marketing: boolean) {
  try{localStorage.setItem('btw_capi_choice_v1',marketing?'yes':'no')}catch{}
  if(!marketing)revokeMeta();
  consent = { version: 1, analytics, marketing, googleAdsMeasurement: analytics && marketing, productUsageMeasurement: analytics, at: Date.now() };
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify(consent)); } catch { /* escolha vale nesta página */ }
  // Consent Mode v2: cada iframe novo começa com tudo "denied" e recebe o update desta escolha.
  // Na revogação, o iframe anterior (e o que ele carregou) sai inteiro e os cookies opcionais são apagados.
  removeFrame(); clearOptionalCookies();
  if(marketing)metaContext();
  closeConsent();
  updateLabel();
  sync();
}
export function showConsent() {
  const active = typeof document !== 'undefined' ? document.activeElement : null;
  opener = typeof HTMLElement !== 'undefined' && active instanceof HTMLElement && active.id === 'privacy-preferences' ? active : null;
  document.getElementById('qd-consent')?.remove();
  const box = document.createElement('section');
  box.id = 'qd-consent'; box.className = 'consent-box';
  box.setAttribute('aria-label', 'Aviso de cookies');
  // Uma linha curta e o link para a seção "O que medimos". Os dois botões têm o mesmo tamanho;
  // Aceitar é o principal (cor da marca, à direita), Recusar fica ao lado, com contorno.
  // Sem resposta, nada de medição carrega: não responder vale como recusa.
  box.innerHTML = `<p id="qd-consent-txt">Usamos cookies para medir visitas e anúncios. O Quiddo funciona igual sem eles. <a href="/privacidade#medicao" data-link>Saiba mais</a></p>
    <div class="consent-actions"><button type="button" class="btn sec" data-consent="reject" aria-describedby="qd-consent-txt">Recusar</button><button type="button" class="btn" data-consent="accept" aria-describedby="qd-consent-txt">Aceitar</button></div>`;
  box.addEventListener('click', e => {
    const action = (e.target as HTMLElement).closest<HTMLElement>('[data-consent]')?.dataset.consent;
    if (action) save(action === 'accept', action === 'accept');
  });
  document.body.appendChild(box);
  // espaço no fim da página e na rolagem do foco, para a barra não cobrir conteúdo
  document.documentElement.style.setProperty('--aviso-h', box.offsetHeight + 'px');
  box.querySelector<HTMLElement>('[data-consent="accept"]')?.focus({ preventScroll: true });
}
export function initMeasurement() {
  if (!measurementHost(location.hostname)) return;
  try { consent = readConsent(localStorage.getItem(CONSENT_KEY)); } catch { consent = null; }
  window.addEventListener('message', e => {
    if (e.origin !== location.origin || e.source !== frame?.contentWindow) return;
    if (e.data?.type === 'qd_done') { callbacks.get(e.data.id)?.(e.data.queued === true); return; }
    if (e.data?.type !== 'qd_ready') return;
    frame.contentWindow?.postMessage({ type: 'qd_init', analytics: !!consent?.analytics, marketing: !!consent?.marketing, googleAdsMeasurement: googleAdsAllowed(consent), productUsageMeasurement: productUsageAllowed(consent), google: googleConsent(consent), googleSignals: GOOGLE_SINAIS_SEM_ACEITE }, location.origin);
    ready = true;
    sync();
    for (const done of pending.splice(0)) done(true);
  });
  window.addEventListener('storage', e => {
    if (e.key !== CONSENT_KEY && e.key !== null) return;
    try { consent = readConsent(localStorage.getItem(CONSENT_KEY)); } catch { consent = null; }
    removeFrame(); clearOptionalCookies(); updateLabel(); sync();
  });
  document.getElementById('privacy-preferences')?.addEventListener('click', showConsent);
  updateLabel();
  if (!consent || !localStorage.getItem('btw_capi_choice_v1') || needsAdsChoice(consent) || needsUsageChoice(consent)) showConsent();
}

/** Somente metadados retornados pelo status pago do servidor, nunca código de acesso. */
export async function trackPurchase(sale?: Sale) {
  if (!sale || !/^[a-f0-9]{64}$/.test(sale.transaction_id) || !Number.isFinite(sale.value) || sale.value <= 0 || sale.currency !== 'BRL' || !permitted() || !eventPath('purchase') || purchasesInFlight.has(sale.transaction_id)) return;
  try {
    const key = 'qd_sale_' + sale.transaction_id;
    if (localStorage.getItem(key)) return;
    purchasesInFlight.add(sale.transaction_id);
    const queued = await track('purchase', sale);
    // This confirms SDK queuing, not a receipt from GA4. Stable transaction/event IDs remain the final dedup keys.
    if (queued && permitted()) localStorage.setItem(key, '1');
  } catch { /* Measurement failures never block payment or access. */ }
  finally { purchasesInFlight.delete(sale.transaction_id); }
}

async function sha256Hex(text: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}
/**
 * Lead da Meta: uma vez por navegador, só com aceite de anúncios. O id local é aleatório e vai ao
 * servidor junto com o consentimento; o event_id é o hash dele, igual ao que a Conversions API usa.
 */
export async function leadParaSala(): Promise<{ id: string; eventId: string } | null> {
  if (!consent?.marketing || !permitted()) return null;
  try {
    let lead = leadState(localStorage.getItem(LEAD_KEY));
    if (lead?.sent) return null;
    if (!lead) { lead = { id: crypto.randomUUID(), sent: false }; localStorage.setItem(LEAD_KEY, JSON.stringify(lead)); }
    return { id: lead.id, eventId: await sha256Hex('quiddo:lead:' + lead.id) };
  } catch { return null; }
}
export function leadEnviado(id: string) {
  try { localStorage.setItem(LEAD_KEY, JSON.stringify({ id, sent: true })); } catch { /* sem armazenamento: pode repetir, o event_id deduplica */ }
}
