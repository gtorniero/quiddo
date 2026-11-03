import { CONSENT_KEY, publicPath, readConsent, campaignQuery, type Consent } from './measurement-policy';

let consent: Consent | null = null;
let frame: HTMLIFrameElement | null = null;
let ready = false;
let currentPath: string | null = null;
let lastPage = '';
const pending: string[] = [];
const EVENTS = ['create_room', 'begin_checkout', 'purchase'] as const;
let campaign = campaignQuery(location.search);
export type Sale = { transaction_id: string; value: number; currency: 'BRL'; plano: 'mensal' | 'semana' | 'oferta' };
export type MeasureParams = Partial<Sale> & { payment_type?: 'pix' | 'card' };
let sequence = 0;
const callbacks = new Map<number, () => void>();

function removeFrame() {
  frame?.remove(); frame = null; ready = false; lastPage = ''; pending.length = 0;
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
export function track(event: typeof EVENTS[number], params: MeasureParams = {}): Promise<void> {
  if (!currentPath || !(consent?.analytics || consent?.marketing) || !ready) return Promise.resolve();
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
  consent = { version: 1, analytics, marketing, at: Date.now() };
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify(consent)); } catch { /* escolha vale nesta página */ }
  removeFrame(); clearOptionalCookies();
  document.getElementById('qd-consent')?.remove();
  sync();
}
export function showConsent() {
  document.getElementById('qd-consent')?.remove();
  const box = document.createElement('section');
  box.id = 'qd-consent'; box.className = 'consent-box';
  box.setAttribute('aria-label', 'Preferências de privacidade');
  box.innerHTML = `<h2>Sua privacidade</h2><p>O jogo funciona sem cookies de medição ou publicidade. Você escolhe se permite ao Google e à Meta medir visitas e ações para melhorar o Quiddo e avaliar anúncios. <a href="/privacidade" data-link>Saiba mais</a>.</p>
    <div class="consent-options"><label><input type="checkbox" name="analytics"${consent?.analytics ? ' checked' : ''}> Medição de uso (Google Analytics)</label><label><input type="checkbox" name="marketing"${consent?.marketing ? ' checked' : ''}> Medição de anúncios (Meta)</label></div>
    <div class="consent-actions"><button type="button" class="btn sec" data-consent="reject">Recusar opcionais</button><button type="button" class="btn sec" data-consent="save">Salvar escolhas</button><button type="button" class="btn" data-consent="accept">Aceitar opcionais</button></div>`;
  box.addEventListener('click', e => {
    const action = (e.target as HTMLElement).closest<HTMLElement>('[data-consent]')?.dataset.consent;
    if (!action) return;
    save(action === 'accept' || (action === 'save' && box.querySelector<HTMLInputElement>('[name="analytics"]')!.checked),
      action === 'accept' || (action === 'save' && box.querySelector<HTMLInputElement>('[name="marketing"]')!.checked));
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
    for (const event of pending.splice(0)) send(event);
  });
  window.addEventListener('storage', e => {
    if (e.key !== CONSENT_KEY && e.key !== null) return;
    try { consent = readConsent(localStorage.getItem(CONSENT_KEY)); } catch { consent = null; }
    removeFrame(); clearOptionalCookies(); sync();
  });
  document.getElementById('privacy-preferences')?.addEventListener('click', showConsent);
  if (!consent) showConsent();
}

/** Somente metadados retornados pelo status pago do servidor, nunca código de acesso. */
export async function trackPurchase(sale?: Sale) {
  if (!sale || !/^[a-f0-9]{64}$/.test(sale.transaction_id) || !Number.isFinite(sale.value) || sale.value <= 0 || sale.currency !== 'BRL' || !(consent?.analytics || consent?.marketing) || !ready || !currentPath) return;
  try {
    const key = 'qd_sale_' + sale.transaction_id;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    await track('purchase', sale);
  } catch { /* Sem armazenamento não arrisca duplicar compra. */ }
}
