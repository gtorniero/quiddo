import {revokeMeta,metaContext} from './meta-consent';
import { CONSENT_KEY, publicPath, readConsent, campaignQuery, type Consent } from './measurement-policy';

let consent: Consent | null = null;
let frame: HTMLIFrameElement | null = null;
let ready = false;
let currentPath: string | null = null;
let lastPage = '';
const pending: ((ok: boolean) => void)[] = [];
const EVENTS = ['create_room', 'begin_checkout', 'purchase'] as const;
let campaign = campaignQuery(location.search);
export type Sale = { transaction_id: string; value: number; currency: 'BRL'; plano: 'mensal' | 'anual' | 'semana' | 'oferta' };
export type MeasureParams = Partial<Sale> & { payment_type?: 'pix' | 'card' };
let sequence = 0;
const callbacks = new Map<number, () => void>();

function removeFrame() {
  frame?.remove(); frame = null; ready = false; lastPage = ''; for (const done of pending.splice(0)) done(false);
}
function send(event: string, id?: number, params: MeasureParams = {}) {
  if (!ready || !frame?.contentWindow || !currentPath || !consent) return;
  frame.contentWindow.postMessage({ type: 'qd_measure', event, path: currentPath, id, params, campaign }, location.origin);
}
function sync() {
  if (!currentPath || !(consent?.analytics || consent?.marketing) || !['quiddo.com.br', 'www.quiddo.com.br'].includes(location.hostname)) {
    removeFrame(); return;
  }
  if (!frame) {
    frame = document.createElement('iframe');
    frame.hidden = true; frame.title = 'Medição opcional'; frame.referrerPolicy = 'no-referrer';
    frame.src = '/medicao.html' + campaign;
    document.body.appendChild(frame);
  }
  if (ready && lastPage !== currentPath) { send('page_view'); lastPage = currentPath; }
}
function bridgeReady(): Promise<boolean> {
  if (ready) return Promise.resolve(true);
  if (!currentPath || !(consent?.analytics || consent?.marketing)) return Promise.resolve(false);
  return new Promise(resolve => {
    const done = (ok: boolean) => { clearTimeout(timer); const i = pending.indexOf(done); if (i >= 0) pending.splice(i, 1); resolve(ok); };
    const timer = window.setTimeout(() => done(false), 2000);
    pending.push(done);
  });
}
export async function track(event: typeof EVENTS[number], params: MeasureParams = {}): Promise<void> {
  if (!currentPath || !(consent?.analytics || consent?.marketing) || !await bridgeReady()) return;
  return new Promise(resolve => {
    const id = ++sequence;
    const done = () => { clearTimeout(timer); callbacks.delete(id); resolve(); };
    const timer = window.setTimeout(done, 400);
    callbacks.set(id, done);
    send(event, id, params);
  });
}
export function measurePage(path: string) {
  currentPath = publicPath(path);
  sync();
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
  consent = { version: 1, analytics, marketing, at: Date.now() };
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
  box.innerHTML = `<p>Usamos cookies opcionais do Google e da Meta para medir visitas e anúncios. Com seu aceite, enviamos à Meta a compra confirmada e uma versão protegida do e-mail para associá-la aos anúncios. <a href="/privacidade" data-link>Saiba mais</a></p>
    <div class="consent-actions"><button type="button" class="btn sec" data-consent="reject">Recusar</button><button type="button" class="btn" data-consent="accept">Aceitar</button></div>`;
  box.addEventListener('click', e => {
    const action = (e.target as HTMLElement).closest<HTMLElement>('[data-consent]')?.dataset.consent;
    if (action) save(action === 'accept', action === 'accept');
  });
  document.body.appendChild(box);
}
export function initMeasurement() {
  try { consent = readConsent(localStorage.getItem(CONSENT_KEY)); } catch { consent = null; }
  window.addEventListener('message', e => {
    if (e.origin !== location.origin || e.source !== frame?.contentWindow) return;
    if (e.data?.type === 'qd_done') { callbacks.get(e.data.id)?.(); return; }
    if (e.data?.type !== 'qd_ready') return;
    frame.contentWindow?.postMessage({ type: 'qd_init', analytics: !!consent?.analytics, marketing: !!consent?.marketing }, location.origin);
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
  if (!consent || !localStorage.getItem('btw_capi_choice_v1')) showConsent();
}

/** Somente metadados retornados pelo status pago do servidor, nunca código de acesso. */
export async function trackPurchase(sale?: Sale) {
  if (!sale || !/^[a-f0-9]{64}$/.test(sale.transaction_id) || !Number.isFinite(sale.value) || sale.value <= 0 || sale.currency !== 'BRL' || !(consent?.analytics || consent?.marketing) || !currentPath) return;
  if (!await bridgeReady()) return;
  try {
    const key = 'qd_sale_' + sale.transaction_id;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    await track('purchase', sale);
  } catch { /* Sem armazenamento não arrisca duplicar compra. */ }
}
