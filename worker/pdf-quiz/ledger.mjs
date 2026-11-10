import {LEASE_MS,PdfError} from './core.mjs';
import {MONTHLY_AI_CREDITS,SHARED_AI_CREDITS} from '../../shared/ai-credits.mjs';
export class Ledger {
  constructor(storage,{split=false}={}) {
    this.split=split; this.storage=storage; this.sql=storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS pdf_cycles (id TEXT PRIMARY KEY,start INTEGER NOT NULL,end INTEGER NOT NULL)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS pdf_jobs (id TEXT PRIMARY KEY,fingerprint TEXT NOT NULL,cycle TEXT NOT NULL,state TEXT NOT NULL,attempt TEXT NOT NULL,lease INTEGER NOT NULL,result TEXT,error TEXT,created INTEGER NOT NULL)');
    this.sql.exec('CREATE INDEX IF NOT EXISTS pdf_jobs_cycle ON pdf_jobs(cycle,state)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS pdf_attempts (id TEXT PRIMARY KEY,job TEXT NOT NULL,detail TEXT NOT NULL)');
    if(!this.rows('PRAGMA table_info(pdf_jobs)').some(column=>column.name==='source'))this.sql.exec('ALTER TABLE pdf_jobs ADD COLUMN source TEXT');
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
  count(cycle,source) {
    const base="SELECT state,COUNT(*) AS n FROM pdf_jobs WHERE cycle=? AND state IN ('delivered','pending')";
    // Old text jobs retain their source in the result or audit, including deleted results.
    // Reserve both balances for an old in-flight job until its source can be determined.
    const category=" AND COALESCE(source, CASE WHEN json_extract(result,'$.source')='text' OR EXISTS (SELECT 1 FROM pdf_attempts a WHERE a.job=pdf_jobs.id AND json_extract(a.detail,'$.source')='text') THEN 'text' WHEN state='pending' AND result IS NULL THEN ? ELSE 'pdf' END)=?";
    const rows=source?this.rows(base+category+' GROUP BY state',cycle,source,source):this.rows(base+' GROUP BY state',cycle);
    return {used:Number(rows.find(x=>x.state==='delivered')?.n||0),reserved:Number(rows.find(x=>x.state==='pending')?.n||0)};
  }
  splitFor(ent) { return this.split && ent.plan==='mensal' && ent.kind!=='administrator'; }
  status(ent,now) {
    return this.storage.transactionSync(()=>{
      this.expire(now);const cycle=this.cycle(ent);
      const balance=(source,limit)=>{const c=this.count(cycle.id,source);return {...c,remaining:Math.max(0,limit-c.used-c.reserved),limit};};
      const split=this.splitFor(ent);
      const pdf=balance(split?'pdf':null,split?MONTHLY_AI_CREDITS.pdf:SHARED_AI_CREDITS);
      return {...pdf,...(ent.kind==='administrator'?{remaining:null,limit:null}:{}),...(split?{balances:{pdf,text:balance('text',MONTHLY_AI_CREDITS.text)}}:{}),cycle:{id:cycle.id,start:cycle.start,end:cycle.end},paidPeriod:ent};
    });
  }
  reserve(id,fingerprint,ent,now,source='pdf') {
    return this.storage.transactionSync(()=>{
      this.expire(now);const existing=this.job(id);
      if (existing && existing.fingerprint!==fingerprint) throw new PdfError('idempotency_conflict','Essa tentativa pertence a outro arquivo ou seleção.',409);
      if (existing?.state==='delivered' || existing?.state==='deleted') return {replay:existing};
      if (existing?.state==='pending') return {pending:existing};
      const cycle=this.cycle(ent);
      if (existing && existing.cycle!==cycle.id) throw new PdfError('cycle_changed','O ciclo mudou. Inicie uma nova tentativa.',409);
      const split=this.splitFor(ent);
      const c=this.count(cycle.id,split?source:null);
      const limit=split?MONTHLY_AI_CREDITS[source]:SHARED_AI_CREDITS;
      if (ent.kind!=='administrator' && c.used+c.reserved>=limit) {
        const message=split?'Os créditos de '+(source==='text'?'texto':'PDF')+' deste ciclo já foram usados ou estão em processamento.':'Os três créditos deste ciclo já foram usados ou estão em processamento.';
        throw new PdfError('quota',message,429);
      }
      const attempt=crypto.randomUUID();
      this.sql.exec("INSERT INTO pdf_jobs(id,fingerprint,cycle,state,attempt,lease,created,source) VALUES (?,?,?,'pending',?,?,?,?) ON CONFLICT(id) DO UPDATE SET state='pending',attempt=excluded.attempt,lease=excluded.lease,error=NULL,source=excluded.source",id,fingerprint,cycle.id,attempt,now+LEASE_MS,now,source);
      return {id,attempt,cycle:cycle.id,ent};
    });
  }
  fail(id,attempt,code) { this.sql.exec("UPDATE pdf_jobs SET state='failed',error=? WHERE id=? AND attempt=? AND state='pending'",code,id,attempt); }
  complete(reservation,result,current,now) {
    return this.storage.transactionSync(()=>{
      const job=this.job(reservation.id);
      if (!job || job.attempt!==reservation.attempt || job.state!=='pending' || job.lease<=now) throw new PdfError('stale','Essa tentativa expirou. Consulte o histórico antes de tentar novamente.',409);
      const original=reservation.ent;
      if (!current || current.kind!==original.kind || original.end<=now || original.start>now || current.start!==original.start || current.end!==original.end || current.invoice!==original.invoice) throw new PdfError('cycle_changed','O acesso ou o ciclo mudou durante a geração. Seu crédito foi preservado.',409);
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
