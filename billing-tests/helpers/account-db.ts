import { DatabaseSync } from 'node:sqlite';
export class TestDB {
  db = new DatabaseSync(':memory:');
  prepare(sql: string) {
    const db = this.db;
    let args: any[] = [];
    const q = {
      bind(...a: any[]) {
        args = a;
        return q;
      },
      async run() {
        const result = db.prepare(sql).run(...args);
        return { meta: { changes: Number(result.changes) }, results: [] };
      },
      async first() {
        return db.prepare(sql).get(...args) || null;
      },
      async all() {
        return { results: db.prepare(sql).all(...args) };
      },
    };
    return q;
  }
  async batch(statements: any[]) {
    this.db.exec('BEGIN');
    try {
      const out = [];
      for (const statement of statements) out.push(await statement.run());
      this.db.exec('COMMIT');
      return out;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}
export const req = (
  path: string,
  body?: unknown,
  cookie = '',
  extra: Record<string, string> = {},
  method = body === undefined ? 'GET' : 'POST',
  origin = 'https://www.quiddo.com.br',
) =>
  new Request(origin + path, {
    method,
    headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...extra },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
