/* Contexto separado: nunca recebe URL completa, dados de formulários ou códigos de sala. */
(() => {
  'use strict';
  // A copied staging asset must never send to the production property/pixel.
  if (!['quiddo.com.br','www.quiddo.com.br'].includes(location.hostname || location.origin.replace(/^https?:\/\//,''))) return;
  const GA = 'G-18PBXS3GQZ';
  const PIXEL = '39663521416595790';
  let initialized = false;
  let analytics = false;
  let marketing = false;
  let adClicks = false;
  let productUsage = false;
  let metaLoaded = false;
  const metaCallbacks = [];
  const allowedPaths = new Set(['/', '/criar', '/jogar', '/entrar', '/precos', '/guias', '/privacidade']);
  const events = new Set(['page_view','create_room','begin_checkout','purchase','navigation','quiz_create','quiz_template_apply','quiz_edit_start','quiz_save','quiz_save_error','create_room_start','create_room_error','join_room_start','join_room','join_room_error','game_start','answer_recorded','game_complete','view_offer','checkout_error','access_granted','pdf_upload_start','pdf_upload_success','pdf_upload_error','ai_generation_start','ai_generation_success','ai_generation_error','ai_generation_pending','ai_review_open']);
  const gameEvents = new Set(['join_room_start','join_room','join_room_error','game_start','answer_recorded','game_complete']);
  const commerceEvents = new Set(['begin_checkout','purchase','view_offer','checkout_error','access_granted']);
  const titles = {'/':'Quiddo','/criar':'Criar quiz · Quiddo','/jogar':'Jogar · Quiddo','/entrar':'Entrar · Quiddo','/precos':'Preços · Quiddo','/guias':'Guias · Quiddo','/privacidade':'Privacidade · Quiddo','/partida/anfitriao':'Partida · Anfitrião','/partida/jogador':'Partida · Jogador','/pagamento':'Pagamento · Quiddo'};
  // Guias públicos são reduzidos a uma categoria; nenhum trecho arbitrário vira parâmetro.
  function safePath(path) { return allowedPaths.has(path) ? path : /^\/guias\/[a-z0-9-]+$/.test(path) ? '/guias' : null; }
  function safeReferrer(raw) {
    try {
      const u = new URL(raw);
      if (!['http:','https:'].includes(u.protocol) || u.username || u.password || u.port || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(u.hostname) || /(?:^|\.)(?:localhost|local|internal|test|invalid)$/i.test(u.hostname)) return '';
      if (['quiddo.com.br','www.quiddo.com.br'].includes(u.hostname)) return 'https://www.quiddo.com.br' + (safePath(u.pathname) || (['/partida/anfitriao','/partida/jogador'].includes(u.pathname) ? u.pathname : '/'));
      return u.origin + '/';
    } catch { return ''; }
  }
  function script(src, onload) { const s = document.createElement('script'); s.async = true; s.src = src; s.referrerPolicy = 'no-referrer'; if (onload) s.onload = onload; document.head.appendChild(s); }
  function gtag() { window.dataLayer.push(arguments); }
  window.addEventListener('message', e => {
    if (e.origin !== location.origin || e.source !== parent || parent === window) return;
    const d = e.data;
    if (d?.type === 'qd_init' && !initialized) {
      initialized = true;
      analytics = d.analytics === true; marketing = d.marketing === true; adClicks = analytics && marketing && d.googleAdsMeasurement === true; productUsage = analytics && d.productUsageMeasurement === true;
      if (analytics) {
        window.dataLayer = [];
        const ads = marketing && d.googleAdsMeasurement === true ? 'granted' : 'denied';
        gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: ads, ad_user_data: ads, ad_personalization: 'denied' });
        gtag('js', new Date());
        gtag('config', GA, { send_page_view: false, page_location: 'https://quiddo.com.br/', page_referrer: '', page_title: 'Quiddo', allow_google_signals: false, allow_ad_personalization_signals: false });
        script('https://www.googletagmanager.com/gtag/js?id=' + GA);
      }
      if (marketing) {
        const fbq = function() { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments); };
        fbq.queue = []; fbq.loaded = true; fbq.version = '2.0'; fbq.push = fbq;
        window.fbq = window._fbq = fbq;
        fbq('set', 'autoConfig', false, PIXEL);
        fbq('consent', 'grant');
        fbq('init', PIXEL);
        script('https://connect.facebook.net/en_US/fbevents.js', () => { metaLoaded = true; for (const done of metaCallbacks.splice(0)) done(); });
      }
      return;
    }
    if (!initialized || d?.type !== 'qd_measure' || !events.has(d.event)) return;
    if (!productUsage && !['page_view','create_room','begin_checkout','purchase'].includes(d.event)) return;
    const path = d.path === '/pagamento' && commerceEvents.has(d.event) ? '/pagamento' : ['/partida/anfitriao','/partida/jogador'].includes(d.path) && gameEvents.has(d.event) ? d.path : typeof d.path === 'string' ? safePath(d.path) : null;
    if (!path) return;
    const p = {};
    const raw = d.params || {};
    const enums = {role:['host','player'],source:['manual','template','import','pdf'],storage:['local','cloud'],method:['promo','existing_code'],error_category:['network','rejected','invalid_input','quota','provider','pending','conflict','storage','unknown','login_required','already_subscribed']};
    for (const [key, values] of Object.entries(enums)) if (values.includes(raw[key])) p[key === 'source' ? 'quiz_source' : key] = raw[key];
    if (typeof raw.destination === 'string' && safePath(raw.destination)) p.destination = safePath(raw.destination);
    if (Number.isInteger(raw.question_count) && raw.question_count >= 0 && raw.question_count <= 200) p.question_count = raw.question_count;
    if (['mensal','anual','semana','oferta'].includes(raw.plano)) p.plano = raw.plano;
    if (['pix','card'].includes(raw.payment_type)) p.payment_type = raw.payment_type;
    if (Number.isFinite(raw.value) && raw.value > 0 && raw.value < 10000 && raw.currency === 'BRL') { p.value = raw.value; p.currency = 'BRL'; }
    if (d.event === 'purchase') {
      if (!/^[a-f0-9]{64}$/.test(raw.transaction_id) || !p.value || !p.plano) return;
      p.transaction_id = raw.transaction_id;
    }
    if (['purchase','begin_checkout'].includes(d.event) && p.plano && p.value) p.items = [{item_id:'quiddo_'+p.plano,item_name:'Quiddo '+p.plano,price:p.value,quantity:1}];
    const query = new URLSearchParams();
    const source = new URLSearchParams(typeof d.campaign === 'string' ? d.campaign : '');
    for (const k of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','fbclid','gbraid','wbraid']) {
      const click = ['gclid','fbclid','gbraid','wbraid'].includes(k);
      const v = source.get(k); if ((!click || adClicks) && v && /^[a-z0-9_.-]{1,200}$/i.test(v) && (click || !/\d{7,}/.test(v))) query.set(k,v);
    }
    const suffix = query.size ? '?' + query.toString() : '';
    const done = () => parent.postMessage({ type: 'qd_done', id: d.id, queued: true }, location.origin);
    if (analytics) gtag('event', d.event, { ...p, send_to: GA, page_location: 'https://www.quiddo.com.br' + path + suffix, page_referrer: safeReferrer(d.referrer), page_title: titles[path] || 'Quiddo', environment:'production', measurement_version:'2026-11-07', transport_type: 'beacon', event_callback: done, event_timeout: 1500 });
    if (marketing && ['page_view','create_room','begin_checkout','purchase'].includes(d.event)) {
      if (d.event === 'page_view') window.fbq('trackSingle', PIXEL, 'PageView', { page_category: path });
      else if (d.event === 'purchase') window.fbq('trackSingle', PIXEL, 'Purchase', { value:p.value, currency:'BRL' }, {eventID:p.transaction_id});
      else if (d.event === 'begin_checkout') window.fbq('trackSingle', PIXEL, 'InitiateCheckout', {value:p.value, currency:p.currency, content_category:p.plano});
      else window.fbq('trackSingleCustom', PIXEL, d.event === 'create_room' ? 'CreateRoom' : 'CheckoutStarted', { page_category: path });
    }
    if (!analytics && marketing && ['page_view','create_room','begin_checkout','purchase'].includes(d.event)) { if (metaLoaded) done(); else metaCallbacks.push(done); }
  });
  if (parent !== window) parent.postMessage({ type: 'qd_ready' }, location.origin);
})();
