/* Contexto separado: nunca recebe URL completa, dados de formulários ou códigos de sala. */
(() => {
  'use strict';
  // A copied staging asset must never send to the production property/pixel.
  if (!['quiddo.com.br','www.quiddo.com.br'].includes(location.hostname || location.origin.replace(/^https?:\/\//,''))) return;
  const GA = 'G-18PBXS3GQZ';
  // Google Ads (mesma conta das campanhas de busca): só com aceite de análise e de anúncios, sem personalização.
  const ADS = 'AW-18547334686';
  // Etapas que o Google Ads recebe. A sala aberta fica de fora: logo depois dela o endereço vira /host/CÓDIGO.
  const adsEvents = new Set(['begin_checkout','purchase']);
  let adsConfigured = false;
  const PIXEL = '39663521416595790';
  let initialized = false;
  let analytics = false;
  let marketing = false;
  let adClicks = false;
  let productUsage = false;
  let googleLoaded = false;
  let metaLoaded = false;
  const metaCallbacks = [];
  const allowedPaths = new Set(['/', '/criar', '/jogar', '/entrar', '/precos', '/guias', '/privacidade']);
  const events = new Set(['page_view','create_room','begin_checkout','purchase','view_item','navigation','quiz_create','quiz_template_apply','quiz_edit_start','quiz_save','quiz_save_error','create_room_start','create_room_error','join_room_start','join_room','join_room_error','game_start','answer_recorded','game_complete','view_offer','select_plan','checkout_error','access_granted','pdf_upload_start','pdf_upload_success','pdf_upload_error','ai_generation_start','ai_generation_success','ai_generation_error','ai_generation_pending','ai_review_open']);
  // Funil de aquisição: visita, sala aberta, planos, checkout e compra. O resto é uso detalhado do produto.
  const funnelEvents = new Set(['page_view','create_room','view_item','begin_checkout','purchase']);
  const gameEvents = new Set(['join_room_start','join_room','join_room_error','game_start','answer_recorded','game_complete']);
  const commerceEvents = new Set(['begin_checkout','purchase','view_offer','select_plan','checkout_error','access_granted']);
  const titles = {'/':'Quiddo','/criar':'Criar quiz · Quiddo','/jogar':'Jogar · Quiddo','/entrar':'Entrar · Quiddo','/precos':'Preços · Quiddo','/guias':'Guias · Quiddo','/privacidade':'Privacidade · Quiddo','/partida/anfitriao':'Partida · Anfitrião','/partida/jogador':'Partida · Jogador','/pagamento':'Pagamento · Quiddo'};
  // Categoria da página para a Meta: o pixel roda neste iframe, então a URL que ela registra é sempre /medicao.
  const sections = {'/':'home','/criar':'criar','/jogar':'jogar','/entrar':'entrar','/precos':'precos','/guias':'guias','/privacidade':'privacidade','/pagamento':'pagamento'};
  // IDs do catálogo de preços. A oferta da sala cheia é o mesmo Passe 7 dias, com desconto.
  const contentIds = {anual:'qd-anual', mensal:'qd-mensal', semana:'qd-passe7', oferta:'qd-passe7'};
  const modes = ['corporativo','familia','escola'];
  const deniedConsent = {analytics_storage:'denied', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'};
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
  const price = v => Number.isFinite(v) && v > 0 && v < 10000 ? v : null;
  // Mesma regra de shared/campaign.ts: 7 a 14 dígitos seguidos parecem telefone, CPF ou CNPJ; IDs da Meta (15+) passam.
  const utmOk = v => !(v.match(/\d+/g) || []).some(run => run.length >= 7 && run.length <= 14);
  // Consent Mode v2: só valores fechados chegam ao Google, e a personalização de anúncios fica sempre negada.
  function consentState(raw) {
    const out = {...deniedConsent};
    for (const key of ['analytics_storage','ad_storage','ad_user_data']) if (raw?.[key] === 'granted') out[key] = 'granted';
    return out;
  }
  function script(src, onload) { const s = document.createElement('script'); s.async = true; s.src = src; s.referrerPolicy = 'no-referrer'; if (onload) s.onload = onload; document.head.appendChild(s); }
  function gtag() { window.dataLayer.push(arguments); }
  // A tag do Google Ads ignora page_location: ela lê o caminho da página principal (sem a query).
  // Por isso só roda quando a página principal é pública; nunca em /host/CÓDIGO nem na sala do jogador.
  function topPublic() { try { const p = parent.location.pathname; return allowedPaths.has(p) || /^\/guias\/[a-z0-9-]+$/.test(p); } catch { return false; } }
  function ads() {
    if (!googleLoaded || !adClicks || !topPublic()) return false;
    if (!adsConfigured) { adsConfigured = true; gtag('config', ADS, { send_page_view: false, page_title: 'Quiddo', allow_ad_personalization_signals: false }); }
    return true;
  }
  function meta(name, data, options) {
    if (options) window.fbq('trackSingle', PIXEL, name, data, options);
    else window.fbq('trackSingle', PIXEL, name, data);
  }
  window.addEventListener('message', e => {
    if (e.origin !== location.origin || e.source !== parent || parent === window) return;
    const d = e.data;
    if (d?.type === 'qd_init' && !initialized) {
      initialized = true;
      analytics = d.analytics === true; marketing = d.marketing === true; adClicks = analytics && marketing && d.googleAdsMeasurement === true; productUsage = analytics && d.productUsageMeasurement === true;
      // Sem aceite, o Google só carrega se o site pedir os sinais sem cookie (modo avançado), e nunca com cookies.
      if (analytics || d.googleSignals === true) {
        googleLoaded = true;
        window.dataLayer = [];
        // O padrão vem antes de qualquer configuração: tudo negado até a escolha salva chegar.
        gtag('consent', 'default', {...deniedConsent});
        gtag('set', 'ads_data_redaction', true);
        // Update com a escolha salva. O site manda o estado; aqui ele ainda é limitado ao que foi aceito.
        if (analytics) { const g = consentState(d.google); gtag('consent', 'update', {...g, analytics_storage:'granted', ad_storage: adClicks ? g.ad_storage : 'denied', ad_user_data: adClicks ? g.ad_user_data : 'denied'}); }
        gtag('js', new Date());
        gtag('config', GA, { send_page_view: false, page_location: 'https://quiddo.com.br/', page_referrer: '', page_title: 'Quiddo', allow_google_signals: false, allow_ad_personalization_signals: false });
        script('https://www.googletagmanager.com/gtag/js?id=' + GA);
        // Com os dois aceites e a página principal pública, a tag liga o clique do anúncio (gclid) à visita.
        ads();
      }
      if (marketing) {
        const fbq = function() { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments); };
        fbq.queue = []; fbq.loaded = true; fbq.version = '2.0'; fbq.push = fbq;
        window.fbq = window._fbq = fbq;
        // Sem eventos automáticos nem correspondência avançada: nenhum campo de formulário vai para a Meta.
        fbq('set', 'autoConfig', false, PIXEL);
        fbq('consent', 'grant');
        fbq('init', PIXEL);
        script('https://connect.facebook.net/en_US/fbevents.js', () => { metaLoaded = true; for (const done of metaCallbacks.splice(0)) done(); });
      }
      return;
    }
    if (!initialized || d?.type !== 'qd_measure' || !events.has(d.event)) return;
    if (!analytics && !marketing && !(googleLoaded && funnelEvents.has(d.event))) return;
    if (!productUsage && !funnelEvents.has(d.event)) return;
    const path = d.path === '/pagamento' && commerceEvents.has(d.event) ? '/pagamento' : ['/partida/anfitriao','/partida/jogador'].includes(d.path) && gameEvents.has(d.event) ? d.path : typeof d.path === 'string' ? safePath(d.path) : null;
    if (!path) return;
    const p = {};
    const raw = d.params || {};
    const enums = {role:['host','player'],source:['manual','template','import','pdf'],storage:['local','cloud'],method:['promo','existing_code'],modo:modes,error_category:['network','rejected','invalid_input','quota','provider','pending','conflict','storage','unknown','login_required','already_subscribed']};
    for (const [key, values] of Object.entries(enums)) if (values.includes(raw[key])) p[key === 'source' ? 'quiz_source' : key] = raw[key];
    if (typeof raw.destination === 'string' && safePath(raw.destination)) p.destination = safePath(raw.destination);
    if (Number.isInteger(raw.question_count) && raw.question_count >= 0 && raw.question_count <= 200) p.question_count = raw.question_count;
    if (['mensal','anual','semana','oferta'].includes(raw.plano)) p.plano = raw.plano;
    if (['pix','card'].includes(raw.payment_type)) p.payment_type = raw.payment_type;
    if (price(raw.value) && raw.currency === 'BRL') { p.value = raw.value; p.currency = 'BRL'; }
    if (d.event === 'purchase') {
      if (!/^[a-f0-9]{64}$/.test(raw.transaction_id) || !p.value || !p.plano) return;
      p.transaction_id = raw.transaction_id;
    }
    if (['purchase','begin_checkout'].includes(d.event) && p.plano && p.value) p.items = [{item_id:'quiddo_'+p.plano,item_name:'Quiddo '+p.plano,price:p.value,quantity:1}];
    // Página de planos: a assinatura vem primeiro, depois o Passe. Só preços válidos viram itens.
    let shown = [];
    if (d.event === 'view_item') {
      const prices = raw.precos && typeof raw.precos === 'object' ? raw.precos : {};
      shown = ['anual','mensal','semana'].filter(id => price(prices[id]));
      if (path !== '/precos' || !shown.length || !p.value) return;
      p.items = shown.map(id => ({item_id:'quiddo_'+id,item_name:'Quiddo '+id,price:prices[id],quantity:1}));
    }
    const query = new URLSearchParams();
    const source = new URLSearchParams(typeof d.campaign === 'string' ? d.campaign : '');
    for (const k of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id','gclid','fbclid','gbraid','wbraid']) {
      const click = ['gclid','fbclid','gbraid','wbraid'].includes(k);
      const v = source.get(k); if ((!click || adClicks) && v && /^[a-z0-9_.-]{1,200}$/i.test(v) && (click || utmOk(v))) query.set(k,v);
    }
    const suffix = query.size ? '?' + query.toString() : '';
    const done = () => parent.postMessage({ type: 'qd_done', id: d.id, queued: true }, location.origin);
    if (googleLoaded) gtag('event', d.event, { ...p, send_to: GA, page_location: 'https://www.quiddo.com.br' + path + suffix, page_referrer: safeReferrer(d.referrer), page_title: titles[path] || 'Quiddo', environment:'production', measurement_version:'2026-11-14', transport_type: 'beacon', event_callback: done, event_timeout: 1500 });
    // Google Ads: só o nome da etapa, o valor e o ID irreversível da compra; nada de plano, itens ou uso do produto.
    if (adsEvents.has(d.event) && ads()) gtag('event', d.event, { send_to: ADS, page_title: titles[path] || 'Quiddo', ...(p.value ? { value: p.value, currency: 'BRL' } : {}), ...(p.transaction_id ? { transaction_id: p.transaction_id } : {}) });
    if (marketing && funnelEvents.has(d.event)) {
      // page_path leva a página real; content_category, a página ou o produto.
      const where = {page_path: path};
      const product = p.plano ? {content_ids:[contentIds[p.plano]], content_type:'product', num_items:1, content_category:p.plano} : null;
      if (d.event === 'page_view') meta('PageView', { page_category: path, ...where, content_category: sections[path] || 'site' });
      else if (d.event === 'view_item') meta('ViewContent', { ...where, content_ids: shown.map(id => contentIds[id]), content_type:'product', content_category:'precos', value:p.value, currency:'BRL' });
      else if (d.event === 'begin_checkout') meta('InitiateCheckout', { ...where, ...product, value:p.value, currency:'BRL' });
      else if (d.event === 'purchase') {
        // Mesmo event_id do servidor (hash do pedido), para a Meta juntar navegador e Conversions API.
        meta('Purchase', { ...where, ...product, value:p.value, currency:'BRL' }, {eventID:p.transaction_id});
        if (p.plano === 'mensal' || p.plano === 'anual') meta('Subscribe', { ...where, ...product, value:p.value, currency:'BRL' }, {eventID:p.transaction_id});
      } else if (d.event === 'create_room') {
        // CreateRoom otimiza um conjunto de anúncios: nome e momento ficam iguais. Lead é o evento padrão junto.
        window.fbq('trackSingleCustom', PIXEL, 'CreateRoom', { page_category: path, ...where, ...(p.modo ? {content_category: p.modo} : {}) });
        // Lead: uma vez por navegador (o site só manda lead_id na primeira sala), com o event_id do servidor.
        if (/^[a-f0-9]{64}$/.test(raw.lead_id || '')) meta('Lead', { ...where, content_category: p.modo || 'sem_modo', currency:'BRL' }, {eventID: raw.lead_id});
      }
    }
    if (!googleLoaded && marketing && funnelEvents.has(d.event)) { if (metaLoaded) done(); else metaCallbacks.push(done); }
  });
  if (parent !== window) parent.postMessage({ type: 'qd_ready' }, location.origin);
})();
