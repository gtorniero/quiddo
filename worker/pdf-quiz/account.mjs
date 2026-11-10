import {DurableObject} from 'cloudflare:workers';
import {Ledger} from './ledger.mjs';
import {entitlementFromStripe,administratorEntitlement} from './entitlement.mjs';
import {readPdf,selectPdf} from './pdf.mjs';
import {MODEL,PROMPT_VERSION,TEXT_PROMPT_VERSION,TEXT_REASONING,MAX_BYTES,PdfError,json,sha,profile,paidEntitlement,requestBody,textRequestBody,readBriefing,resultText,validateQuiz,costFromUsage} from './core.mjs';

export class PdfAccount extends DurableObject {
  constructor(ctx,env) { super(ctx,env);this.ctx=ctx;this.env=env;this.ledger=new Ledger(ctx.storage); }
  async settings() { return this.env.PDF_STAGE==='isolated' ? await this.ctx.storage.get('fixture') : null; }
  async entitlement(email,settings) {
    if (this.env.PDF_STAGE==='isolated') {
      if (!settings?.billing) throw new PdfError('monthly_required','A conta de staging não tem um ciclo mensal pago simulado.',403);
      return paidEntitlement({...settings.billing,live:false},settings.now || Date.now());
    }
    return administratorEntitlement(this.env,email) || entitlementFromStripe(this.env,email);
  }
  async fetch(req) {
    try { return await this.handle(req); }
    catch(e) { return json({code:e instanceof PdfError?e.code:'unavailable',erro:e instanceof PdfError?e.message:'Não foi possível concluir. Consulte o histórico antes de repetir.'},e instanceof PdfError?e.status:503); }
  }
  async handle(req) {
    const url=new URL(req.url),path=url.pathname;
    const email=req.headers.get('x-qd-pdf-owner');
    if (!email) throw new PdfError('session','Entre na sua conta.',401);
    if (path==='/__staging/fixture' && this.env.PDF_STAGE==='isolated' && req.method==='POST') {
      const s=await req.json();
      if (!['real','mock','failure','refusal','malformed','delayed'].includes(s.providerMode)) throw new PdfError('fixture','Modo de teste inválido.');
      await this.ctx.storage.put('fixture',s);return json({ok:true});
    }
    if (path==='/__staging/evidence' && this.env.PDF_STAGE==='isolated') return json({...this.ledger.evidence(),budget:await this.env.PDF_BUDGET.get(this.env.PDF_BUDGET.idFromName('test-budget-20261107')).summary()});
    if(path==='/__staging/reconcile-costs' && this.env.PDF_STAGE==='isolated' && req.method==='POST') {
      const reconciled=[];
      for(const attempt of this.ledger.evidence().attempts) {
        const a=attempt.detail;
        // v1 requests omitted caching options: the documented Responses default is 30m.
        if(a.prompt!=='quiddo-pdf-2026-11-07-v1'||a.providerMode!=='real'||a.cost||!a.usage||a.httpStatus!==200)continue;
        const cost=costFromUsage(a.usage,a.model,a.serviceTier,'30m');if(!cost)continue;
        const detail={status:'measured',job:a.job,requestId:a.requestId,usage:a.usage,outcome:a.outcome,reconciledFrom:'usage_unreported',cachePolicyEvidence:'v1 request omitted cache options; documented API default 30m',cost};
        await this.env.PDF_BUDGET.get(this.env.PDF_BUDGET.idFromName('test-budget-20261107')).settle(a.id,cost,detail);
        a.cost=cost;a.costReconciled=detail.cachePolicyEvidence;this.ledger.audit(a.id,a.job,a);reconciled.push({id:a.id,cost});
      }
      return json({reconciled});
    }
    let settings=await this.settings(), now=settings?.now||Date.now();
    const jobMatch=path.match(/^\/api\/pdf\/jobs\/([a-f0-9-]{36})$/);
    if(jobMatch && ['GET','DELETE'].includes(req.method)) {
      this.ledger.expire(now);const found=this.ledger.job(jobMatch[1]);
      if(!found)throw new PdfError('not_found','Tentativa não encontrada.',404);
      if(req.method==='DELETE'){this.ledger.deleteResult(found.id);return json({ok:true});}
      return json({id:found.id,status:found.state,result:found.result,code:found.error},found.state==='pending'?202:200);
    }
    if(path==='/api/pdf/history' && req.method==='GET')return json({results:this.ledger.history()});
    const ent=await this.entitlement(email,settings);
    if(path==='/api/pdf/status' && req.method==='GET') {
      const simulated=this.env.PDF_STAGE==='isolated' && !!settings && settings.providerMode!=='real';
      const funded=!!this.env.OPENAI_API_KEY && (await this.env.PDF_BUDGET.get(this.env.PDF_BUDGET.idFromName('test-budget-20261107')).summary()).available;
      return json({...this.ledger.status(ent,now),enabled:true,pdfPromptVersion:PROMPT_VERSION,maxPages:50,maxBytes:MAX_BYTES,providerReady:simulated || funded,simulatedBilling:this.env.PDF_STAGE==='isolated'});
    }
    const isText=path==='/api/pdf/generate-text';
    if(isText && ent.kind==='administrator')throw new PdfError('monthly_required','A geração por texto é exclusiva do Premium mensal.',403);
    if (!['/api/pdf/inspect','/api/pdf/generate','/api/pdf/generate-text'].includes(path) || req.method!=='POST')throw new PdfError('route','Não encontrado.',404);
    const parsed=isText?null:await readPdf(req);
    if(path==='/api/pdf/inspect')return json({pages:parsed.count,bytes:parsed.size,sha256:parsed.hash,maxBytes:MAX_BYTES});
    const id=req.headers.get('idempotency-key')||'';
    if(!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(id))throw new PdfError('idempotency','Identificador de tentativa inválido.');
    const config=isText?{effort:TEXT_REASONING}:profile(url.searchParams.get('profile')||'none-high',this.env.PDF_STAGE==='isolated');
    const briefing=isText?await readBriefing(req):null;
    const selected=isText?null:await selectPdf(parsed,url.searchParams.get('pages')||'');
    const source=isText?'text':'pdf', promptVersion=isText?TEXT_PROMPT_VERSION:PROMPT_VERSION;
    const sourceSHA256=isText?await sha(briefing):parsed.hash;
    // The PDF fingerprint is unchanged so old retries remain recoverable after this update.
    const fingerprint=await sha(JSON.stringify(isText
      ? {source,text:sourceSHA256,prompt:promptVersion,model:MODEL,config}
      : {file:sourceSHA256,pages:selected.pages,prompt:promptVersion,model:MODEL,config}));
    const reservation=this.ledger.reserve(id,fingerprint,ent,now);
    if(reservation.replay)return json({id,status:'delivered',result:reservation.replay.result,replayed:true});
    if(reservation.pending)return json({id,status:'pending'},202);
    let providerStarted=false, response=null, cost=null;
    const started=Date.now();
    const audit={id:reservation.attempt,job:id,prompt:promptVersion,model:MODEL,config,source,...(isText?{inputCharacters:briefing.length}:{originalPages:parsed.count,selectedPages:selected.pages,selectedCount:selected.count,sentSHA256:selected.hash,sentBytes:selected.bytes}),sourceSHA256,started:new Date(started).toISOString(),providerMode:this.env.PDF_STAGE==='isolated' ? settings.providerMode : 'real'};
    const budget=this.env.PDF_BUDGET.get(this.env.PDF_BUDGET.idFromName('test-budget-20261107'));
    try {
      if (this.env.PDF_STAGE==='isolated' && settings.providerMode!=='real') {
        if(settings.providerMode==='failure')throw new PdfError('provider_failure','Falha simulada. Crédito preservado.',502);
        if(settings.providerMode==='delayed')await new Promise(resolve=>setTimeout(resolve,350));
        if(settings.providerMode==='refusal')response={status:'completed',output:[{content:[{type:'refusal',refusal:'Fixture'}]}]};
        else response={status:'completed',model:MODEL,output:[{content:[{type:'output_text',text:JSON.stringify(settings.providerMode==='malformed'?{title:'Inválido',questions:[]}:settings.quiz)}]}]};
      } else {
        if(!this.env.OPENAI_API_KEY)throw new PdfError('provider_unavailable','A geração está temporariamente indisponível. Nenhum crédito foi consumido.',503);
        try { await budget.reserve(reservation.attempt); } catch { throw new PdfError('budget_exhausted','A geração está temporariamente indisponível. Nenhum crédito foi consumido.',503); }
        providerStarted=true;
        const remote=await fetch('https://api.openai.com/v1/responses',{
          method:'POST',headers:{Authorization:'Bearer '+this.env.OPENAI_API_KEY,'Content-Type':'application/json',...(this.env.OPENAI_ORGANIZATION?{'OpenAI-Organization':this.env.OPENAI_ORGANIZATION}:{}),...(this.env.OPENAI_PROJECT?{'OpenAI-Project':this.env.OPENAI_PROJECT}:{})},
          body:JSON.stringify(isText?textRequestBody(briefing):requestBody(selected.dataUrl,selected.pages,config)),signal:AbortSignal.timeout(150000)
        });
        audit.httpStatus=remote.status;audit.requestId=remote.headers.get('x-request-id');
        response=await remote.json();
        audit.responseId=response.id||null;audit.usage=response.usage||null;audit.model=response.model||MODEL;audit.serviceTier=response.service_tier||'default';
        audit.cacheTTL='30m';cost=costFromUsage(response.usage,audit.model,audit.serviceTier,audit.cacheTTL);audit.cost=cost;
        if(!remote.ok)throw new PdfError('provider_failure','O serviço de geração não concluiu o pedido. Seu crédito foi preservado.',502);
      }
      const raw=resultText(response);
      // Fictional test inputs only, behind the private staging gate. Production keeps no raw output audit.
      if(!isText&&this.env.PDF_STAGE==='isolated'&&settings.providerMode==='real')audit.rawResult=raw;
      const validated=validateQuiz(raw,selected?.pages);
      settings=await this.settings();now=settings?.now||Date.now();
      const current=await this.entitlement(email,settings);
      const result={id,...validated,...(isText?{}:{pages:selected.pages}),source,model:audit.model,promptVersion,config,created:new Date().toISOString(),sourceSHA256,metrics:{latencyMs:Date.now()-started,usage:response.usage||null,cost,simulated:audit.providerMode!=='real'}};
      this.ledger.complete(reservation,result,current,now);audit.outcome='delivered';
      return json({id,status:'delivered',result});
    } catch(e) {
      this.ledger.fail(id,reservation.attempt,e instanceof PdfError?e.code:'provider_interrupted');
      if(e.fields)audit.validationFields=e.fields;
      audit.outcome=e instanceof PdfError?e.code:'provider_interrupted';throw e;
    } finally {
      audit.providerStarted=providerStarted;
      audit.elapsedMs=Date.now()-started;
      this.ledger.audit(reservation.attempt,id,audit);
      if(providerStarted)await budget.settle(reservation.attempt,cost,{status:cost?'measured':'usage_unreported',job:id,requestId:audit.requestId||null,usage:audit.usage||null,outcome:audit.outcome});
    }
  }
}
