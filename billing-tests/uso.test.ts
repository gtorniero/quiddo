// Contador de uso (/api/uso): soma por dia, colunas novas em bancos antigos e nada além de números.
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { CONTADORES, anotaUso, rotaUso } from '../worker/uso';

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

describe('contador de uso', () => {
  it('soma os contadores novos no dia e guarda a maior sala', async () => {
    const { db } = database();
    const env = { DB: db };
    await anotaUso(env, { salas: 1 });
    await anotaUso(env, { jogos: 1, jogadores: 6, maior: 6, tamanho_5a10: 1, jogos_com_turma: 1 });
    await anotaUso(env, { jogos: 1, jogadores: 1, maior: 1, tamanho_1: 1 });
    await anotaUso(env, { ensaios: 1 });
    await anotaUso(env, { entradas_recusadas: 1, recusa_nao_encontrada: 1 });
    await anotaUso(env, { fechadas_por_inatividade: 1 });
    const r = (await (await rotaUso(env)).json()) as { dias: Record<string, number | string>[] };
    expect(r.dias).toHaveLength(1);
    expect(r.dias[0]).toMatchObject({ salas: 1, jogos: 2, jogadores: 7, maior: 6, tamanho_5a10: 1, tamanho_1: 1, jogos_com_turma: 1, ensaios: 1, entradas_recusadas: 1, recusa_nao_encontrada: 1, fechadas_por_inatividade: 1, sala_cheia: 0 });
    for (const c of CONTADORES) expect(typeof r.dias[0][c]).toBe('number');
  });

  it('banco antigo (só salas, jogos, jogadores e maior) ganha as colunas novas sem perder nada', async () => {
    const { db, sqlite } = database();
    sqlite.exec("CREATE TABLE uso (dia TEXT PRIMARY KEY, salas INTEGER DEFAULT 0, jogos INTEGER DEFAULT 0, jogadores INTEGER DEFAULT 0, maior INTEGER DEFAULT 0); INSERT INTO uso VALUES ('2026-11-12', 13, 10, 30, 6);");
    await anotaUso({ DB: db }, { oferta_paga: 1, liberadas: 1 });
    const r = (await (await rotaUso({ DB: db })).json()) as { dias: Record<string, number | string>[] };
    const antigo = r.dias.find((d) => d.dia === '2026-11-12')!;
    expect(antigo).toMatchObject({ salas: 13, jogos: 10, jogadores: 30, maior: 6, ensaios: 0 });
    expect(r.dias.find((d) => d.dia !== '2026-11-12')).toMatchObject({ oferta_paga: 1, liberadas: 1, salas: 0 });
  });

  it('sem banco ou com campo desconhecido, não quebra o jogo', async () => {
    await expect(anotaUso({}, { salas: 1 })).resolves.toBeUndefined();
    const { db } = database();
    await anotaUso({ DB: db }, { ['nome' as 'salas']: 1 });
    const r = (await (await rotaUso({ DB: db })).json()) as { dias: unknown[] };
    expect(r.dias).toHaveLength(0);
  });
});
