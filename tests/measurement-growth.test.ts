import { describe, expect, it, vi } from 'vitest';
import { CONTENT_IDS, GOOGLE_SINAIS_SEM_ACEITE, campaignOrigin, campaignQuery, consentLabel, firstTouch, googleConsent, leadState, modeCategory } from '../src/lib/measurement-policy';

const base = { version: 1 as const, at: 1000 };
describe('Consent Mode v2 e rótulo do rodapé', () => {
  it('estado do Google segue a escolha salva e nunca libera personalização', () => {
    expect(googleConsent(null)).toEqual({ analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    expect(googleConsent({ ...base, analytics: true, marketing: true, googleAdsMeasurement: true })).toEqual({ analytics_storage: 'granted', ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'denied' });
    expect(googleConsent({ ...base, analytics: true, marketing: true })).toMatchObject({ ad_storage: 'denied' }); // aceite antigo não amplia
    expect(googleConsent({ ...base, analytics: false, marketing: false })).toMatchObject({ analytics_storage: 'denied' });
  });
  it('sem aceite, nada de terceiros: os sinais sem cookie estão desligados', () => {
    expect(GOOGLE_SINAIS_SEM_ACEITE).toBe(false);
  });
  it('rodapé mostra o estado atual', () => {
    expect(consentLabel(null)).toBe('Medição desligada');
    expect(consentLabel({ ...base, analytics: false, marketing: false })).toBe('Medição desligada');
    expect(consentLabel({ ...base, analytics: true, marketing: true })).toBe('Medição ligada');
  });
});

describe('categorias e catálogo', () => {
  it('modo do quiz vira categoria fixa', () => {
    expect([modeCategory('corp'), modeCategory('festa'), modeCategory('escola'), modeCategory('Minha Empresa')]).toEqual(['corporativo', 'familia', 'escola', null]);
  });
  it('IDs do catálogo de preços; a oferta é o mesmo Passe', () => {
    expect(CONTENT_IDS).toEqual({ anual: 'qd-anual', mensal: 'qd-mensal', semana: 'qd-passe7', oferta: 'qd-passe7' });
  });
});

describe('etiquetas de campanha', () => {
  it('IDs numéricos de anúncio da Meta passam; telefone, CPF e CNPJ não', () => {
    expect(campaignQuery('?utm_source=meta&utm_content=120212345678901234&utm_id=23851234567890123')).toBe('?utm_source=meta&utm_content=120212345678901234&utm_id=23851234567890123');
    for (const v of ['11987654321', '12345678901', '12345678000190', 'tel_1198765432', '1234567']) expect(campaignQuery('?utm_term=' + v)).toBe('');
    expect(campaignQuery('?utm_campaign=natal_2026&utm_content=ADC-QD-02-v2')).toBe('?utm_campaign=natal_2026&utm_content=ADC-QD-02-v2');
  });
  it('origem da compra: só UTM, nunca clique, e-mail ou outro parâmetro', () => {
    expect(campaignOrigin('?utm_source=meta&fbclid=CLIQUE&gclid=X&email=a@b.com&utm_campaign=qd')).toBe('utm_source=meta&utm_campaign=qd');
    expect(campaignOrigin(123)).toBe('');
    expect(campaignOrigin('x'.repeat(2000))).toBe('');
  });
  it('primeira visita vale 90 dias e não é trocada por uma visita depois', () => {
    const t0 = 1_800_000_000_000;
    const primeira = firstTouch(null, '?utm_source=meta&utm_campaign=natal&fbclid=X', t0)!;
    expect(primeira).toEqual({ q: 'utm_source=meta&utm_campaign=natal', at: t0 });
    expect(firstTouch(JSON.stringify(primeira), '?utm_source=google', t0 + 86400000)).toEqual(primeira);
    expect(firstTouch(JSON.stringify(primeira), '?utm_source=google', t0 + 91 * 86400000)).toEqual({ q: 'utm_source=google', at: t0 + 91 * 86400000 });
    expect(firstTouch(JSON.stringify(primeira), '', t0 + 91 * 86400000)).toBeNull();
    expect(firstTouch(JSON.stringify({ q: 'email=a@b.com', at: t0 }), '', t0)).toBeNull();
    expect(firstTouch(null, '?ref=nada', t0)).toBeNull();
  });
  it('estado do Lead só aceita o formato salvo pelo site', () => {
    expect(leadState(JSON.stringify({ id: '11111111-2222-4333-8444-555555555555', sent: false }))).toEqual({ id: '11111111-2222-4333-8444-555555555555', sent: false });
    for (const raw of [null, '{}', 'x', JSON.stringify({ id: 'QD-ABCD-1234', sent: true })]) expect(leadState(raw)).toBeNull();
  });
});

describe('Lead uma vez por navegador e estado do Google no iframe', () => {
  async function setup(marketing: boolean) {
    vi.resetModules();
    const handlers: Record<string, (e: any) => void> = {}, sent: any[] = [];
    const origin = 'https://www.quiddo.com.br';
    const source = { postMessage(data: any) { sent.push(data); if (data.type === 'qd_measure') queueMicrotask(() => handlers.message({ origin, source, data: { type: 'qd_done', id: data.id, queued: true } })); } };
    const values = new Map([['btw_capi_choice_v1', marketing ? 'yes' : 'no'], ['qd_consent_v1', JSON.stringify({ version: 1, analytics: true, marketing, googleAdsMeasurement: marketing, productUsageMeasurement: true, at: Date.now() })]]);
    vi.stubGlobal('location', { origin, hostname: 'www.quiddo.com.br', search: '' });
    vi.stubGlobal('localStorage', { getItem: (k: string) => values.get(k) || null, setItem: (k: string, v: string) => values.set(k, v) });
    vi.stubGlobal('window', { setTimeout, addEventListener: (n: string, f: any) => (handlers[n] = f) });
    vi.stubGlobal('document', { cookie: '', getElementById: () => null, createElement: () => ({ contentWindow: source, remove() {} }), body: { appendChild() {} } });
    const m = await import('../src/lib/measurement');
    m.initMeasurement(); m.measurePage('/criar'); handlers.message({ origin, source, data: { type: 'qd_ready' } });
    return { m, values, sent };
  }
  it('sem aceite de anúncios não cria Lead', async () => {
    try { const x = await setup(false); expect(await x.m.leadParaSala()).toBeNull(); expect(x.values.has('qd_lead_v1')).toBe(false); }
    finally { vi.unstubAllGlobals(); }
  });
  it('com aceite: event_id é o hash do id local; depois de medido, não repete', async () => {
    try {
      const x = await setup(true);
      const init = x.sent.find((d) => d.type === 'qd_init');
      expect(init).toMatchObject({ analytics: true, marketing: true, googleSignals: false, google: { analytics_storage: 'granted', ad_storage: 'granted', ad_personalization: 'denied' } });
      const lead = (await x.m.leadParaSala())!;
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('quiddo:lead:' + lead.id));
      expect(lead.eventId).toBe(Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join(''));
      expect((await x.m.leadParaSala())!.id).toBe(lead.id); // ainda não medido: mesmo id
      expect(await x.m.track('create_room', { question_count: 3, modo: 'escola', lead_id: lead.eventId })).toBe(true);
      x.m.leadEnviado(lead.id);
      expect(await x.m.leadParaSala()).toBeNull();
      expect(x.sent.filter((d) => d.event === 'create_room')[0].params).toEqual({ question_count: 3, modo: 'escola', lead_id: lead.eventId });
    } finally { vi.unstubAllGlobals(); }
  });
});
