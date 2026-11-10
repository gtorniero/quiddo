import {DurableObject} from 'cloudflare:workers';
import {RESERVE_USD,PdfError} from './core.mjs';
export class PdfBudget extends DurableObject {
  constructor(ctx,env) { super(ctx,env);this.ctx=ctx;this.env=env;ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS pdf_spend(id TEXT PRIMARY KEY,reserve REAL NOT NULL,actual REAL,detail TEXT NOT NULL)'); }
  async reserve(id) {
    return this.ctx.storage.transactionSync(()=>{
      const sql=this.ctx.storage.sql;
      const old=[...sql.exec('SELECT * FROM pdf_spend WHERE id=?',id)][0];if(old)return old;
      const total=[...sql.exec('SELECT COALESCE(SUM(COALESCE(actual,reserve)),0) AS amount,COUNT(*) AS n FROM pdf_spend')][0];
      const max=Math.min(1,Number(this.env.PDF_BUDGET_USD||0));
      if (!max || total.amount+RESERVE_USD>max || total.n>=8) throw new Error('test_budget');
      sql.exec('INSERT INTO pdf_spend(id,reserve,actual,detail) VALUES (?,?,NULL,?)',id,RESERVE_USD,JSON.stringify({status:'reserved'}));
      return {id,reserve:RESERVE_USD};
    });
  }
  async settle(id,cost,detail) {
    const actual=typeof cost?.usd==='number' && cost.usd>=0 ? cost.usd : null;
    this.ctx.storage.sql.exec('UPDATE pdf_spend SET actual=?,detail=? WHERE id=?',actual,JSON.stringify(detail),id);
  }
  async summary() {
    const entries=[...this.ctx.storage.sql.exec('SELECT * FROM pdf_spend')].map(r=>({...r,detail:JSON.parse(r.detail)}));
    return {limitUSD:Math.min(1,Number(this.env.PDF_BUDGET_USD||0)),measuredUSD:entries.reduce((a,r)=>a+(r.actual||0),0),unreportedReserveUSD:entries.filter(r=>r.actual==null).reduce((a,r)=>a+r.reserve,0),entries};
  }
}
