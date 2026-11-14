// O iframe /medicao (public/medicao-vendor.js) num contexto falso: confere Consent Mode v2, eventos padrão
// da Meta, o CreateRoom intocado e o caminho real da página em cada evento. Nenhuma rede é usada.
import { describe, expect, it } from 'vitest';
import vendor from '../public/medicao-vendor.js?raw';

type Init = { analytics?: boolean; marketing?: boolean; googleAdsMeasurement?: boolean; productUsageMeasurement?: boolean; googleSignals?: boolean; google?: Record<string, string> };
const ORIGIN = 'https://www.quiddo.com.br';

function carregar(init: Init, paginaPrincipal = '/') {
  const scripts: string[] = [], handlers: Record<string, (e: unknown) => void> = {}, done: unknown[] = [];
  const parent = { postMessage: (data: unknown) => done.push(data), location: { pathname: paginaPrincipal } };
  const win: Record<string, any> = { addEventListener: (n: string, f: (e: unknown) => void) => (handlers[n] = f) };
  const location = { origin: ORIGIN, hostname: 'www.quiddo.com.br' };
  const document = { head: { appendChild: (s: { src: string }) => scripts.push(s.src) }, createElement: () => ({}) };
  new Function('window', 'parent', 'location', 'document', vendor)(win, parent, location, document);
  const send = (data: unknown) => handlers.message({ origin: ORIGIN, source: parent, data });
  send({ type: 'qd_init', ...init });
  const medir = (event: string, path: string, params: Record<string, unknown> = {}, campaign = '') => send({ type: 'qd_measure', event, path, id: 1, params, campaign });
  const meta = () => (win.fbq?.queue || []).filter((x: unknown[]) => x[0] === 'trackSingle' || x[0] === 'trackSingleCustom').map((x: unknown[]) => ({ tipo: x[0], nome: x[2], dados: x[3], opcoes: x[4] }));
  const ga = (): any[][] => (win.dataLayer || []).map((x: IArguments) => Array.from(x));
  return { win, scripts, medir, meta, ga, parent };
}
const tudo: Init = { analytics: true, marketing: true, googleAdsMeasurement: true, productUsageMeasurement: true, google: { analytics_storage: 'granted', ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' } };
const tx = 'c'.repeat(64);

describe('Consent Mode v2 do Google', () => {
  it('o padrão "denied" vem antes de qualquer configuração e o update segue a escolha', () => {
    const x = carregar(tudo);
    const cmds = x.ga();
    expect(cmds[0]).toEqual(['consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }]);
    const update = cmds.find((c) => c[0] === 'consent' && c[1] === 'update');
    expect(cmds.indexOf(update!)).toBeLessThan(cmds.findIndex((c) => c[0] === 'config'));
    // personalização de anúncios continua negada, mesmo se o site mandar outra coisa
    expect(update![2]).toEqual({ analytics_storage: 'granted', ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'denied' });
  });
  it('sem medição de anúncios, só analytics_storage é liberado', () => {
    const update = carregar({ ...tudo, googleAdsMeasurement: false }).ga().find((c) => c[1] === 'update');
    expect(update![2]).toMatchObject({ analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied' });
  });
  it('recusa: nenhum script de terceiros carrega', () => {
    const x = carregar({ analytics: false, marketing: false });
    expect(x.scripts).toEqual([]);
    x.medir('page_view', '/precos');
    expect(x.win.dataLayer).toBeUndefined();
    expect(x.win.fbq).toBeUndefined();
  });
  it('sinais sem cookie (se um dia forem ligados): só Google, tudo negado, só o funil e sem IDs de clique', () => {
    const x = carregar({ analytics: false, marketing: false, googleSignals: true });
    expect(x.scripts).toHaveLength(1);
    expect(x.scripts[0]).toContain('googletagmanager.com');
    expect(x.win.fbq).toBeUndefined();
    expect(x.ga().some((c) => c[1] === 'update')).toBe(false);
    x.medir('create_room', '/criar', { modo: 'escola' }, '?utm_source=meta&gclid=CLIQUE');
    x.medir('quiz_save', '/criar', { storage: 'local' });
    const eventos = x.ga().filter((c) => c[0] === 'event');
    expect(eventos.map((c) => c[1])).toEqual(['create_room']);
    expect(eventos[0][2].page_location).toBe('https://www.quiddo.com.br/criar?utm_source=meta');
  });
});

describe('Google Ads', () => {
  const ADS = 'AW-18547334686';
  const paraAds = (x: ReturnType<typeof carregar>) => x.ga().filter((c) => c[0] === 'event' && c[2]?.send_to === ADS);
  const compra = { transaction_id: tx, plano: 'anual', value: 156, currency: 'BRL' };
  it('com os dois aceites: configura a conta depois do consentimento, sem personalização', () => {
    const x = carregar(tudo, '/precos');
    const cmds = x.ga();
    const config = cmds.findIndex((c) => c[0] === 'config' && c[1] === ADS);
    expect(config).toBeGreaterThan(cmds.findIndex((c) => c[0] === 'consent' && c[1] === 'update'));
    expect(cmds[config][2]).toEqual({ send_page_view: false, page_title: 'Quiddo', allow_ad_personalization_signals: false });
  });
  it('recebe só o início do pagamento e a compra, com valor e o ID irreversível', () => {
    const x = carregar(tudo, '/precos');
    x.medir('page_view', '/precos', {}, '?utm_source=google&gclid=CLIQUE1');
    x.medir('quiz_save', '/criar', { storage: 'local' });
    x.medir('create_room', '/criar', { modo: 'escola', question_count: 5, lead_id: tx });
    x.medir('begin_checkout', '/precos', { plano: 'anual', value: 156, currency: 'BRL', payment_type: 'card' });
    x.medir('purchase', '/precos', compra);
    const ads = paraAds(x);
    expect(ads.map((c) => c[1])).toEqual(['begin_checkout', 'purchase']);
    expect(ads[0][2]).toEqual({ send_to: ADS, page_title: 'Preços · Quiddo', value: 156, currency: 'BRL' });
    expect(ads[1][2]).toEqual({ send_to: ADS, page_title: 'Preços · Quiddo', value: 156, currency: 'BRL', transaction_id: tx });
  });
  it('a tag lê o endereço da página principal: na sala (/host/CÓDIGO ou /CÓDIGO) ela não roda', () => {
    for (const sala of ['/host/ABCD', '/ABCD', '/criar/']) {
      const x = carregar(tudo, sala);
      x.medir('purchase', '/pagamento', compra);
      expect(x.ga().some((c) => c[1] === ADS)).toBe(false);
      // GA4 continua recebendo a compra no caminho genérico
      expect(x.ga().some((c) => c[0] === 'event' && c[1] === 'purchase' && c[2].send_to === 'G-18PBXS3GQZ')).toBe(true);
    }
    // começou numa página pública e foi para a sala: a compra lá dentro não vai ao Google Ads
    const y = carregar(tudo, '/criar');
    y.parent.location.pathname = '/host/ABCD';
    y.medir('purchase', '/pagamento', compra);
    expect(paraAds(y)).toEqual([]);
  });
  it('sem o aceite de anúncios ou sem aceite nenhum, o Google Ads não carrega nem recebe nada', () => {
    for (const init of [{ ...tudo, googleAdsMeasurement: false }, { ...tudo, marketing: false, googleAdsMeasurement: false }, { analytics: false, marketing: false, googleSignals: true }, { analytics: false, marketing: false }]) {
      const x = carregar(init, '/precos');
      x.medir('purchase', '/precos', compra);
      expect(x.ga().some((c) => c[1] === ADS)).toBe(false);
      expect(paraAds(x)).toEqual([]);
    }
  });
});

describe('eventos da Meta', () => {
  it('CreateRoom continua igual a cada sala; Lead só com lead_id, com event_id e o modo', () => {
    const x = carregar(tudo);
    x.medir('create_room', '/criar', { question_count: 5, modo: 'corporativo', lead_id: tx });
    x.medir('create_room', '/criar', { question_count: 5, modo: 'familia' });
    const m = x.meta();
    const create = m.filter((e: any) => e.nome === 'CreateRoom');
    expect(create).toHaveLength(2);
    expect(create.every((e: any) => e.tipo === 'trackSingleCustom' && e.dados.page_category === '/criar' && e.dados.page_path === '/criar')).toBe(true);
    const leads = m.filter((e: any) => e.nome === 'Lead');
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({ tipo: 'trackSingle', dados: { content_category: 'corporativo', page_path: '/criar', currency: 'BRL' }, opcoes: { eventID: tx } });
    // GA4 continua com o create_room de sempre, agora com o modo
    expect(x.ga().filter((c) => c[0] === 'event' && c[1] === 'create_room').map((c) => c[2].modo)).toEqual(['corporativo', 'familia']);
  });
  it('PageView leva o caminho real e a categoria da página', () => {
    const x = carregar(tudo);
    x.medir('page_view', '/precos');
    x.medir('page_view', '/guias/quiz-de-natal-perguntas');
    const pv = x.meta().filter((e: any) => e.nome === 'PageView').map((e: any) => e.dados);
    expect(pv).toEqual([{ page_category: '/precos', page_path: '/precos', content_category: 'precos' }, { page_category: '/guias', page_path: '/guias', content_category: 'guias' }]);
  });
  it('ViewContent nos planos com os IDs do catálogo; view_item no GA4', () => {
    const x = carregar(tudo);
    x.medir('view_item', '/precos', { value: 156, currency: 'BRL', plano: 'anual', precos: { anual: 156, mensal: 15.99, semana: 12.99 } });
    x.medir('view_item', '/criar', { value: 156, currency: 'BRL', precos: { anual: 156 } });
    const vc = x.meta().filter((e: any) => e.nome === 'ViewContent');
    expect(vc).toHaveLength(1);
    expect(vc[0].dados).toEqual({ page_path: '/precos', content_ids: ['qd-anual', 'qd-mensal', 'qd-passe7'], content_type: 'product', content_category: 'precos', value: 156, currency: 'BRL' });
    const item = x.ga().find((c) => c[1] === 'view_item')!;
    expect(item[2].items.map((i: any) => i.item_id)).toEqual(['quiddo_anual', 'quiddo_mensal', 'quiddo_semana']);
  });
  it('InitiateCheckout, Purchase e Subscribe com valor, BRL, IDs do catálogo e o mesmo event_id do servidor', () => {
    const x = carregar(tudo);
    x.medir('begin_checkout', '/pagamento', { plano: 'semana', value: 12.99, currency: 'BRL', payment_type: 'pix' });
    x.medir('purchase', '/pagamento', { transaction_id: tx, plano: 'oferta', value: 9.99, currency: 'BRL' });
    x.medir('purchase', '/precos', { transaction_id: 'd'.repeat(64), plano: 'anual', value: 156, currency: 'BRL' });
    const m = x.meta();
    expect(m.find((e: any) => e.nome === 'InitiateCheckout').dados).toEqual({ page_path: '/pagamento', content_ids: ['qd-passe7'], content_type: 'product', num_items: 1, content_category: 'semana', value: 12.99, currency: 'BRL' });
    const compras = m.filter((e: any) => e.nome === 'Purchase');
    expect(compras.map((e: any) => [e.dados.value, e.dados.content_ids[0], e.opcoes.eventID])).toEqual([[9.99, 'qd-passe7', tx], [156, 'qd-anual', 'd'.repeat(64)]]);
    const sub = m.filter((e: any) => e.nome === 'Subscribe');
    expect(sub).toHaveLength(1);
    expect(sub[0]).toMatchObject({ dados: { value: 156, currency: 'BRL', content_ids: ['qd-anual'], page_path: '/precos' }, opcoes: { eventID: 'd'.repeat(64) } });
  });
  it('sem aceite de anúncios, a Meta não carrega nem recebe nada', () => {
    const x = carregar({ ...tudo, marketing: false, googleAdsMeasurement: false });
    x.medir('create_room', '/criar', { modo: 'escola', lead_id: tx });
    expect(x.win.fbq).toBeUndefined();
    expect(x.scripts.some((s) => s.includes('facebook'))).toBe(false);
  });
  it('etiquetas UTM: IDs numéricos de anúncio da Meta passam, telefone e CPF não', () => {
    const x = carregar(tudo);
    x.medir('page_view', '/', {}, '?utm_source=meta&utm_content=120212345678901234&utm_id=23851234567890123&utm_term=11987654321&utm_campaign=cpf_12345678901');
    const pv = x.ga().find((c) => c[1] === 'page_view')!;
    expect(pv[2].page_location).toBe('https://www.quiddo.com.br/?utm_source=meta&utm_content=120212345678901234&utm_id=23851234567890123');
  });
});
