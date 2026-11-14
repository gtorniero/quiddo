// Conversions API do Quiddo: compra, Subscribe na primeira cobrança da assinatura, Lead da primeira sala
// e origem da compra. Banco SQLite em memória e Meta falsa: nada sai da máquina.
import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { capture, drain, events, hash, leadPayload, revoke, schema } from '../worker/meta-capi.mjs';
import { captureLead, runMeta } from '../worker/meta-adapter.mjs';
import { rotaCobranca } from '../worker/cobranca';
import { registrarRenovacao, tabelasStripe } from '../worker/stripe-assinatura';

function d1(db: DatabaseSync): D1Database {
  const prepare = (sql: string, values: any[] = []): any => ({
    bind: (...v: any[]) => prepare(sql, v),
    first: async () => db.prepare(sql).get(...values) || null,
    all: async () => ({ success: true, results: db.prepare(sql).all(...values), meta: {} }),
    run: async () => { const r = db.prepare(sql).run(...values); return { success: true, results: [], meta: { changes: Number(r.changes) } }; },
  });
  return { prepare, batch: async (statements: any[]) => { const out = []; for (const s of statements) out.push(await s.run()); return out; } } as unknown as D1Database;
}
const SUBJECT = '00000000-0000-4000-8000-000000000003';
const consent = (extra: Record<string, unknown> = {}) => ({ version: 1, marketing: true, at: Date.now() - 1000, subject: SUBJECT, fbp: 'fb.1.1793980000000.123456', ...extra });
const ON = { META_CAPI_ENABLED: 'true', META_CAPI_TOKEN: 'TEST_ONLY_SECRET', META_GRAPH_VERSION: 'v26.0' };
const sale = { id: 'ref-1', paid: true, live: true, cents: 15600, paidAt: Date.now(), email: 'Pessoa@Example.com', emailMatching: true, contentId: 'qd-anual', category: 'anual' };

describe('compra e assinatura pela Conversions API', () => {
  it('Subscribe só com a opção ligada, com o mesmo event_id e o plano do catálogo', async () => {
    const [purchase] = (await events('quiddo', sale, consent()))!;
    expect(purchase.event_name).toBe('Purchase');
    expect(purchase.event_id).toBe(await hash('quiddo:purchase:ref-1'));
    expect(purchase.custom_data).toMatchObject({ value: 156, currency: 'BRL', content_ids: ['qd-anual'], content_type: 'product', content_category: 'anual' });
    expect(JSON.stringify(purchase)).not.toMatch(/Pessoa|Example/);
    const both = (await events('quiddo', { ...sale, subscribe: true }, consent()))!;
    expect(both.map((e: any) => e.event_name)).toEqual(['Purchase', 'Subscribe']);
    expect(both[1].event_id).toBe(both[0].event_id);
    // IDs fora do padrão não viram content_ids
    const bad = (await events('quiddo', { ...sale, contentId: 'QD-ABCD-1234 ', category: 'x y' }, consent()))![0];
    expect(bad.custom_data.content_ids).toBeUndefined();
    expect(bad.custom_data.content_category).toBeUndefined();
  });

  it('a fila só marca enviado quando a Meta recebe todos os eventos da linha', async () => {
    const sqlite = new DatabaseSync(':memory:'), db = d1(sqlite);
    sqlite.exec("CREATE TABLE compras (ref TEXT PRIMARY KEY, ordem TEXT, email TEXT, status TEXT, codigo TEXT, criado TEXT, pago TEXT, valor TEXT, modo TEXT, plano TEXT, expira TEXT, tipo TEXT, stripe_price TEXT, origem TEXT)");
    await capture(db, 'quiddo', 'ref-1', consent());
    sqlite.prepare("INSERT INTO compras (ref,email,status,pago,valor,modo,plano,tipo) VALUES ('ref-1','pessoa@example.com','pago',?,'156.00','ligada','anual','assinatura')").run(new Date(Date.now() + 5).toISOString());
    const bodies: any[] = [];
    let received = 1;
    const meta = async (_url: string, init: RequestInit) => { bodies.push(JSON.parse(String(init.body))); return Response.json({ events_received: received }); };
    const env = { ...ON, DB: db, META_EMAIL_MATCHING: 'true', META_CAPI_SUBSCRIBE: 'true' };
    // sem token, runMeta só enfileira; o envio é feito abaixo com a Meta falsa (nada vai para a rede)
    await runMeta({ ...env, META_CAPI_TOKEN: '' });
    const row = sqlite.prepare('SELECT payload FROM btw_meta_outbox').get() as { payload: string };
    const list = JSON.parse(row.payload);
    expect(list.map((e: any) => e.event_name)).toEqual(['Purchase', 'Subscribe']);
    expect(list[0].user_data.em).toEqual([await hash('pessoa@example.com')]);
    await drain(db, ON, 'quiddo', meta);
    expect(bodies.at(-1).data).toHaveLength(2);
    expect((sqlite.prepare('SELECT state FROM btw_meta_outbox').get() as any).state).toBe('pending');
    received = 2;
    sqlite.exec('UPDATE btw_meta_outbox SET next_try=0, lease=0');
    await drain(db, ON, 'quiddo', meta);
    expect((sqlite.prepare('SELECT state, payload FROM btw_meta_outbox').get() as any)).toEqual({ state: 'sent', payload: '{}' });
  });

  it('sem a opção de Subscribe, a assinatura vai só como Purchase', async () => {
    const sqlite = new DatabaseSync(':memory:'), db = d1(sqlite);
    sqlite.exec("CREATE TABLE compras (ref TEXT PRIMARY KEY, ordem TEXT, email TEXT, status TEXT, codigo TEXT, criado TEXT, pago TEXT, valor TEXT, modo TEXT, plano TEXT, expira TEXT, tipo TEXT, stripe_price TEXT, origem TEXT)");
    await capture(db, 'quiddo', 'ref-2', consent());
    sqlite.prepare("INSERT INTO compras (ref,email,status,pago,valor,modo,plano,tipo) VALUES ('ref-2','p@example.com','pago',?,'15.99','ligada','mensal','assinatura')").run(new Date(Date.now() + 5).toISOString());
    await runMeta({ ...ON, META_CAPI_TOKEN: '', DB: db });
    const payload = JSON.parse((sqlite.prepare('SELECT payload FROM btw_meta_outbox').get() as any).payload);
    expect(payload.event_name).toBe('Purchase');
    expect(payload.custom_data.content_ids).toEqual(['qd-mensal']);
    expect(payload.user_data.em).toBeUndefined(); // e-mail só com META_EMAIL_MATCHING
  });
});

describe('Lead da primeira sala pela Conversions API', () => {
  const LEAD = '11111111-2222-4333-8444-555555555555';
  it('só identificadores de anúncio, nunca e-mail, e o event_id igual ao do navegador', async () => {
    const event = await leadPayload('quiddo', { id: LEAD, at: Date.now(), category: 'familia' }, consent({ em: 'a'.repeat(64) }));
    expect(event).toMatchObject({ event_name: 'Lead', event_source_url: 'https://www.quiddo.com.br/criar', user_data: { fbp: 'fb.1.1793980000000.123456' }, custom_data: { content_category: 'familia', currency: 'BRL' } });
    expect(event.event_id).toBe(await hash('quiddo:lead:' + LEAD));
    expect(event.user_data.em).toBeUndefined();
    expect(await leadPayload('quiddo', { id: LEAD, at: Date.now() }, consent({ fbp: undefined }))).toBeNull();
    expect(await leadPayload('quiddo', { id: 'nao-e-uuid', at: Date.now() }, consent())).toBeNull();
    expect(await leadPayload('sportdna', { id: LEAD, at: Date.now() }, consent())).toBeNull();
  });

  it('desligado por padrão; ligado, entra na fila, não é cancelado pela conferência das compras e respeita a revogação', async () => {
    const sqlite = new DatabaseSync(':memory:'), db = d1(sqlite);
    sqlite.exec("CREATE TABLE compras (ref TEXT PRIMARY KEY, ordem TEXT, email TEXT, status TEXT, codigo TEXT, criado TEXT, pago TEXT, valor TEXT, modo TEXT, plano TEXT, expira TEXT, tipo TEXT, stripe_price TEXT, origem TEXT)");
    await schema(db);
    await captureLead({ ...ON, DB: db }, LEAD, consent(), 'corp');
    expect(sqlite.prepare('SELECT COUNT(*) n FROM btw_meta_outbox').get()).toEqual({ n: 0 });
    const env = { ...ON, DB: db, META_CAPI_LEAD: 'true' };
    await captureLead(env, LEAD, consent(), 'corp');
    await captureLead(env, LEAD, consent(), 'corp'); // repetir não duplica
    const rows = sqlite.prepare('SELECT id, state, payload FROM btw_meta_outbox').all() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('lead:' + LEAD);
    expect(JSON.parse(rows[0].payload).custom_data.content_category).toBe('corporativo');
    // a conferência das compras não pode cancelar o Lead (ele não é uma compra)
    let calls = 0;
    await runMeta({ ...env, META_CAPI_TOKEN: '' });
    expect((sqlite.prepare('SELECT state FROM btw_meta_outbox').get() as any).state).toBe('pending');
    await revoke(db, 'quiddo', SUBJECT);
    await drain(db, ON, 'quiddo', async () => { calls++; return Response.json({ events_received: 1 }); });
    expect(calls).toBe(0);
    expect((sqlite.prepare('SELECT state FROM btw_meta_outbox').get() as any).state).toBe('revoked');
  });
});

describe('origem da compra e renovações', () => {
  it('guarda só as etiquetas UTM da campanha junto com a compra', async () => {
    const sqlite = new DatabaseSync(':memory:'), db = d1(sqlite);
    const env = { DB: db, COBRANCA: 'simulacao' };
    const req = new Request('https://www.quiddo.com.br/api/pix', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'pessoa@example.com', plano: 'semana', origem: 'utm_source=meta&utm_campaign=qd_natal&utm_content=120212345678901234&utm_term=11987654321&fbclid=CLIQUE&email=pessoa@example.com' }),
    });
    const r = await rotaCobranca(req, env, '/api/pix');
    expect(r!.status).toBe(200);
    const row = sqlite.prepare('SELECT origem FROM compras').get() as { origem: string };
    expect(row.origem).toBe('utm_source=meta&utm_campaign=qd_natal&utm_content=120212345678901234');
  });

  it('registra a renovação paga uma vez, sem e-mail, e ignora a primeira cobrança', async () => {
    const sqlite = new DatabaseSync(':memory:'), db = d1(sqlite);
    await tabelasStripe(db);
    sqlite.exec("CREATE TABLE compras (ref TEXT PRIMARY KEY, plano TEXT)");
    sqlite.exec("INSERT INTO compras VALUES ('ref-a','anual')");
    const state = { id: 'sub_1', ref: 'ref-a', modo: 'ligada' };
    const invoice: any = { id: 'in_2', billing_reason: 'subscription_cycle', status: 'paid', currency: 'brl', amount_paid: 15600, livemode: true, created: 1800000000, status_transitions: { paid_at: 1800000100 } };
    const env = { DB: db };
    expect(await registrarRenovacao(env, invoice, state)).toBe(true);
    expect(await registrarRenovacao(env, invoice, state)).toBe(false);
    expect(await registrarRenovacao(env, { ...invoice, id: 'in_1', billing_reason: 'subscription_create' }, state)).toBe(false);
    expect(await registrarRenovacao(env, { ...invoice, id: 'in_3', livemode: false }, state)).toBe(false);
    expect(sqlite.prepare('SELECT * FROM qd_renovacoes').all()).toEqual([{ invoice: 'in_2', assinatura: 'sub_1', ref: 'ref-a', plano: 'anual', valor_centavos: 15600, pago: 1800000100000, modo: 'ligada' }]);
  });
});
