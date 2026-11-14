// worker/pdf-quiz/budget.mjs
import { DurableObject } from "cloudflare:workers";

// worker/pdf-quiz/core.mjs
var MAX_BYTES = 25 * 1024 * 1024;
var RESERVE_USD = 0.55;

// worker/pdf-quiz/budget.mjs
var limit = (env) => Number.isFinite(Number(env.PDF_BUDGET_USD)) && Number(env.PDF_BUDGET_USD) > 0 ? Math.min(4, Number(env.PDF_BUDGET_USD)) : 0;
var PdfBudget = class extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
    ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS pdf_spend(id TEXT PRIMARY KEY,reserve REAL NOT NULL,actual REAL,detail TEXT NOT NULL)");
  }
  async reserve(id) {
    return this.ctx.storage.transactionSync(() => {
      const sql = this.ctx.storage.sql;
      const old = [...sql.exec("SELECT * FROM pdf_spend WHERE id=?", id)][0];
      if (old) return old;
      const total = [...sql.exec("SELECT COALESCE(SUM(COALESCE(actual,reserve)),0) AS amount,COUNT(*) AS n FROM pdf_spend")][0];
      const max = limit(this.env);
      if (!max || total.amount + RESERVE_USD > max) throw new Error("budget_exhausted");
      sql.exec("INSERT INTO pdf_spend(id,reserve,actual,detail) VALUES (?,?,NULL,?)", id, RESERVE_USD, JSON.stringify({ status: "reserved" }));
      return { id, reserve: RESERVE_USD };
    });
  }
  async settle(id, cost, detail) {
    const actual = typeof cost?.usd === "number" && cost.usd >= 0 ? cost.usd : null;
    this.ctx.storage.sql.exec("UPDATE pdf_spend SET actual=?,detail=? WHERE id=?", actual, JSON.stringify(detail), id);
  }
  async summary() {
    const entries = [...this.ctx.storage.sql.exec("SELECT * FROM pdf_spend")].map((r) => ({ ...r, detail: JSON.parse(r.detail) }));
    const measuredUSD = entries.reduce((a, r) => a + (r.actual || 0), 0), unreportedReserveUSD = entries.filter((r) => r.actual == null).reduce((a, r) => a + r.reserve, 0), limitUSD = limit(this.env);
    return { limitUSD, measuredUSD, unreportedReserveUSD, available: limitUSD > 0 && measuredUSD + unreportedReserveUSD + RESERVE_USD <= limitUSD, entries };
  }
};

// <stdin>
var stdin_default = { async fetch(request, env) {
  const a = await request.json();
  const b = env.BUDGET.get(env.BUDGET.idFromName("persistent"));
  try {
    if (a.op === "reserve") await b.reserve(a.id);
    if (a.op === "settle") await b.settle(a.id, a.cost, {});
    return Response.json(await b.summary());
  } catch {
    return Response.json({ error: "budget_exhausted" }, { status: 503 });
  }
} };
export {
  PdfBudget,
  stdin_default as default
};
