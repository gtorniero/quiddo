import {LEASE_MS,PdfError} from './core.mjs';
export class Ledger {
  constructor(storage) {
    this.storage=storage; this.sql=storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS pdf_cycles (id TEXT PRIMARY KEY,start INTEGER NOT NULL,end INTEGER NOT NULL)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS pdf_jobs (id TEXT PRIMARY KEY,fingerprint TEXT NOT NULL,cycle TEXT NOT NULL,state TEXT NOT NULL,attempt TEXT NOT NULL,lease INTEGER NOT NULL,result TEXT,error TEXT,created INTEGER NOT NULL)');
    this.sql.exec('CREATE INDEX IF NOT EXISTS pdf_jobs_cycle ON pdf_jobs(cycle,state)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS pdf_attempts (id TEXT PRIMARY KEY,job TEXT NOT NULL,detail TEXT NOT NULL)');
  }
  rows(sql,...values) { return [...this.sql.exec(sql,...values)]; }
  job(id) { const r=this.rows('SELECT * FROM pdf_jobs WHERE id=?',id)[0]; return r ? {...r,result:r.result?JSON.parse(r.result):null} : null; }
  expire(now) { this.sql.exec("UPDATE pdf_jobs SET state='failed',error='lease_expired' WHERE state='pending' AND lease<=?",now); }
  cycle(ent) {
    // Subscription/customer replacements with an overlapping paid period reuse the same owner bucket.
    const prior=this.rows('SELECT * FROM pdf_cycles WHERE start<? AND end>? ORDER BY start DESC LIMIT 1',ent.end,ent.start)[0];
    if (prior) return prior;
    const cycle={id:String(ent.start)+'-'+String(ent.end),start:ent.start,end:ent.end};
    this.sql.exec('INSERT INTO pdf_cycles(id,start,end) VALUES (?,?,?)',cycle.id,cycle.start,cycle.end);
    return cycle;
  }
  count(cycle) {
    const rows=this.rows("SELECT state,COUNT(*) AS n FROM pdf_jobs WHERE cycle=? AND state IN ('delivered','pending') GROUP BY state",cycle);
    return {used:Number(rows.find(x=>x.state==='delivered')?.n||0),reserved:Number(rows.find(x=>x.state==='pending')?.n||0)};
  }
  status(ent,now) {
    return this.storage.transactionSync(()=>{
      this.expire(now);const cycle=this.cycle(ent),c=this.count(cycle.id);
      return {...c,remaining:Math.max(0,2-c.used-c.reserved),limit:2,cycle:{id:cycle.id,start:cycle.start,end:cycle.end},paidPeriod:ent};
    });
  }
  reserve(id,fingerprint,ent,now) {
    return this.storage.transactionSync(()=>{
      this.expire(now);const existing=this.job(id);
      if (existing && existing.fingerprint!==fingerprint) throw new PdfError('idempotency_conflict','Essa tentativa pertence a outro arquivo ou seleção.',409);
      if (existing?.state==='delivered' || existing?.state==='deleted') return {replay:existing};
      if (existing?.state==='pending') return {pending:existing};
      const cycle=this.cycle(ent);
      if (existing && existing.cycle!==cycle.id) throw new PdfError('cycle_changed','O ciclo mudou. Inicie uma nova tentativa.',409);
      const c=this.count(cycle.id);
      if (c.used+c.reserved>=2) throw new PdfError('quota','Os dois créditos deste ciclo já foram usados ou estão em processamento.',429);
      const attempt=crypto.randomUUID();
      this.sql.exec("INSERT INTO pdf_jobs(id,fingerprint,cycle,state,attempt,lease,created) VALUES (?,?,?,'pending',?,?,?) ON CONFLICT(id) DO UPDATE SET state='pending',attempt=excluded.attempt,lease=excluded.lease,error=NULL",id,fingerprint,cycle.id,attempt,now+LEASE_MS,now);
      return {id,attempt,cycle:cycle.id,ent};
    });
  }
  fail(id,attempt,code) { this.sql.exec("UPDATE pdf_jobs SET state='failed',error=? WHERE id=? AND attempt=? AND state='pending'",code,id,attempt); }
  complete(reservation,result,current,now) {
    return this.storage.transactionSync(()=>{
      const job=this.job(reservation.id);
      if (!job || job.attempt!==reservation.attempt || job.state!=='pending' || job.lease<=now) throw new PdfError('stale','Essa tentativa expirou. Consulte o histórico antes de tentar novamente.',409);
      const original=reservation.ent;
      if (!current || original.end<=now || original.start>now || current.start!==original.start || current.end!==original.end || current.invoice!==original.invoice) throw new PdfError('cycle_changed','O acesso ou o ciclo mudou durante a geração. Seu crédito foi preservado.',409);
      this.sql.exec("UPDATE pdf_jobs SET state='delivered',result=?,lease=0,error=NULL WHERE id=? AND attempt=?",JSON.stringify(result),job.id,job.attempt);
      return result;
    });
  }
  audit(attempt,job,detail) { this.sql.exec('INSERT INTO pdf_attempts(id,job,detail) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET detail=excluded.detail',attempt,job,JSON.stringify(detail)); }
  history() { return this.rows("SELECT id,result FROM pdf_jobs WHERE state='delivered' ORDER BY created DESC LIMIT 100").map(r=>({id:r.id,...JSON.parse(r.result)})); }
  deleteResult(id) {
    // A tombstone preserves both the debit and the idempotency key after content erasure.
    this.sql.exec("UPDATE pdf_jobs SET result=?,error='content_deleted' WHERE id=? AND state='delivered'",JSON.stringify({id,deleted:true,title:'Conteúdo excluído',items:[]}),id);
  }
  evidence() { return {cycles:this.rows('SELECT * FROM pdf_cycles ORDER BY start'),jobs:this.rows('SELECT id,cycle,state,attempt,lease,error FROM pdf_jobs ORDER BY created'),attempts:this.rows('SELECT * FROM pdf_attempts').map(r=>({...r,detail:JSON.parse(r.detail)}))}; }
}
