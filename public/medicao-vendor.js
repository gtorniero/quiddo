/* Contexto separado: nunca recebe URL completa, dados de formulários ou códigos de sala. */
(() => {
  'use strict';
  const GA = 'G-18PBXS3GQZ';
  const PIXEL = '39663521416595790';
  let initialized = false;
  let analytics = false;
  let marketing = false;
  const allowedPaths = new Set(['/', '/criar', '/jogar', '/precos', '/guias', '/privacidade']);
  // Guias públicos são reduzidos a uma categoria; nenhum trecho arbitrário vira parâmetro.
  function safePath(path) { return allowedPaths.has(path) ? path : /^\/guias\/[a-z0-9-]+$/.test(path) ? '/guias' : null; }
  function script(src) { const s = document.createElement('script'); s.async = true; s.src = src; s.referrerPolicy = 'no-referrer'; document.head.appendChild(s); }
  function gtag() { window.dataLayer.push(arguments); }
  window.addEventListener('message', e => {
    if (e.origin !== location.origin || e.source !== parent || parent === window) return;
    const d = e.data;
    if (d?.type === 'qd_init' && !initialized) {
      initialized = true;
      analytics = d.analytics === true; marketing = d.marketing === true;
      if (analytics) {
        window.dataLayer = [];
        gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
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
        script('https://connect.facebook.net/en_US/fbevents.js');
      }
      return;
    }
    if (!initialized || d?.type !== 'qd_measure' || !['page_view', 'create_room', 'begin_checkout', 'purchase'].includes(d.event)) return;
    const path = typeof d.path === 'string' ? safePath(d.path) : null;
    if (!path) return;
    const p = {};
    const raw = d.params || {};
    if (['mensal','anual','semana','oferta'].includes(raw.plano)) p.plano = raw.plano;
    if (['pix','card'].includes(raw.payment_type)) p.payment_type = raw.payment_type;
    if (Number.isFinite(raw.value) && raw.value > 0 && raw.value < 10000 && raw.currency === 'BRL') { p.value = raw.value; p.currency = 'BRL'; }
    if (d.event === 'purchase') {
      if (!/^[a-f0-9]{64}$/.test(raw.transaction_id) || !p.value || !p.plano) return;
      p.transaction_id = raw.transaction_id;
    }
    const query = new URLSearchParams();
    const source = new URLSearchParams(typeof d.campaign === 'string' ? d.campaign : '');
    for (const k of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','fbclid','gbraid','wbraid']) {
      const v = source.get(k); if (v && /^[a-z0-9_.-]{1,200}$/i.test(v)) query.set(k,v);
    }
    const suffix = query.size ? '?' + query.toString() : '';
    const done = () => parent.postMessage({ type: 'qd_done', id: d.id }, location.origin);
    if (analytics) gtag('event', d.event, { ...p, send_to: GA, page_location: 'https://www.quiddo.com.br' + path + suffix, page_referrer: '', page_title: 'Quiddo', transport_type: 'beacon', event_callback: done, event_timeout: 300 });
    if (marketing) {
      if (d.event === 'page_view') window.fbq('trackSingle', PIXEL, 'PageView', { page_category: path });
      else if (d.event === 'purchase') window.fbq('trackSingle', PIXEL, 'Purchase', { value:p.value, currency:'BRL' }, {eventID:p.transaction_id});
      else if (d.event === 'begin_checkout') window.fbq('trackSingle', PIXEL, 'InitiateCheckout', {value:p.value, currency:p.currency, content_category:p.plano});
      else window.fbq('trackSingleCustom', PIXEL, d.event === 'create_room' ? 'CreateRoom' : 'CheckoutStarted', { page_category: path });
    }
    if (!analytics) done();
  });
  if (parent !== window) parent.postMessage({ type: 'qd_ready' }, location.origin);
})();
