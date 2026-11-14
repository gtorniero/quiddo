// Mandar o quiz do celular para o computador: cópia de 7 dias, id aleatório, limite por hora e nada pessoal.
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { LEVAR_ID, rotaLevar } from '../worker/levar';

function database() {
  const sqlite = new DatabaseSync(':memory:');
  const prepare = (sql: string, values: unknown[] = []): unknown => ({
    bind: (...v: unknown[]) => prepare(sql, v),
    first: async () => sqlite.prepare(sql).get(...(values as never[])) || null,
    all: async () => ({ results: sqlite.prepare(sql).all(...(values as never[])) }),
    run: async () => ({ meta: { changes: sqlite.prepare(sql).run(...(values as never[])).changes } }),
  });
  return { db: { prepare } as unknown as D1Database, sqlite };
}
const ORIGEM = 'https://www.quiddo.com.br';
const quiz = { id: 'q1', titulo: 'Quiz de Natal', tema: 'festa', tempo: 15, marca: { name: '', color: '' }, logo: '', perguntas: [{ t: 'Rena?', o: ['Rudolph', 'Cometa'], c: 0, tl: 15 }], atualizado: 1 };
const post = (corpo: unknown, ip = '1.2.3.4', origem = ORIGEM) =>
  new Request(ORIGEM + '/api/levar', { method: 'POST', headers: { Origin: origem, 'Content-Type': 'application/json', 'CF-Connecting-IP': ip }, body: JSON.stringify(corpo) });

describe('levar o quiz para o computador', () => {
  it('guarda a cópia e devolve no outro aparelho', async () => {
    const { db, sqlite } = database();
    const r = await rotaLevar(post({ quiz }), { DB: db }, '/api/levar', 1_000_000);
    const d = (await r!.json()) as { id: string; expira: string };
    expect(r!.status).toBe(200);
    expect(d.id).toMatch(LEVAR_ID);
    const g = await rotaLevar(new Request(ORIGEM + '/api/levar/' + d.id), { DB: db }, '/api/levar/' + d.id, 1_000_000 + 1000);
    const q = ((await g!.json()) as { quiz: typeof quiz }).quiz;
    expect(q.titulo).toBe('Quiz de Natal');
    expect(q.perguntas[0].o).toEqual(['Rudolph', 'Cometa']);
    // nada de endereço de internet em texto aberto
    const linha = sqlite.prepare('SELECT * FROM qd_levar').get() as Record<string, string>;
    expect(JSON.stringify(linha)).not.toContain('1.2.3.4');
  });

  it('vence em 7 dias', async () => {
    const { db } = database();
    const d = (await (await rotaLevar(post({ quiz }), { DB: db }, '/api/levar', 0))!.json()) as { id: string };
    const g = await rotaLevar(new Request(ORIGEM + '/api/levar/' + d.id), { DB: db }, '/api/levar/' + d.id, 7 * 86400e3 + 1);
    expect(g!.status).toBe(404);
  });

  it('recusa quiz inválido, outro site e id malformado', async () => {
    const { db } = database();
    expect((await rotaLevar(post({ quiz: { id: 'x' } }), { DB: db }, '/api/levar'))!.status).toBe(400);
    expect((await rotaLevar(post({ quiz }, '1.1.1.1', 'https://outro.site'), { DB: db }, '/api/levar'))!.status).toBe(403);
    expect((await rotaLevar(new Request(ORIGEM + '/api/levar/abc'), { DB: db }, '/api/levar/abc'))!.status).toBe(404);
    expect(await rotaLevar(new Request(ORIGEM + '/api/outra'), { DB: db }, '/api/outra')).toBeNull();
  });

  it('limita 30 envios por hora por endereço de internet', async () => {
    const { db } = database();
    for (let i = 0; i < 30; i++) expect((await rotaLevar(post({ quiz }, '9.9.9.9'), { DB: db }, '/api/levar', 5000 + i))!.status).toBe(200);
    expect((await rotaLevar(post({ quiz }, '9.9.9.9'), { DB: db }, '/api/levar', 6000))!.status).toBe(429);
    expect((await rotaLevar(post({ quiz }, '8.8.8.8'), { DB: db }, '/api/levar', 6000))!.status).toBe(200);
  });
});
