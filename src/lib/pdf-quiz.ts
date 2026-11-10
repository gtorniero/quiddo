import './pdf-preview.css';
import { track, trackOnce } from './measurement';
export interface PdfResult {id:string;title:string;sourceSHA256:string;items:{t:string;a:string[];c:number;page:number;evidence:string;answer:string;topic:string}[]}
export const pdfButton = '<button type="button" class="btn small qd-pdf-button" data-act="pdf-ia"><span class="qd-ai-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M10 2.5c.7 4 2.8 6.1 6.8 6.8-4 .7-6.1 2.8-6.8 6.8-.7-4-2.8-6.1-6.8-6.8 4-.7 6.1-2.8 6.8-6.8Z"/><path d="M18.4 12.4c.4 2.4 1.7 3.7 4.1 4.1-2.4.4-3.7 1.7-4.1 4.1-.4-2.4-1.7-3.7-4.1-4.1 2.4-.4 3.7-1.7 4.1-4.1Z" opacity=".8"/></svg></span>Criar quiz com IA</button>';

async function api(path:string,init:RequestInit={}) {
  const r=await fetch('/api/pdf/'+path,{credentials:'same-origin',...init});
  const d=await r.json();
  if(!r.ok)throw Object.assign(new Error(d.erro||'Não foi possível consultar a geração.'),{code:d.code});
  return d;
}
export function openPdfQuiz(onReview:(result:PdfResult)=>void|Promise<void>) {
  const dialog=document.createElement('dialog');dialog.className='qd-pdf-dialog';dialog.setAttribute('aria-labelledby','qd-pdf-title');
  dialog.innerHTML='<div class="qd-pdf-top"><span class="tag">Premium mensal</span><button class="linkbtn" type="button" data-close aria-label="Fechar">Fechar ×</button></div><h2 id="qd-pdf-title">Criar quiz a partir de PDF</h2><p class="qd-pdf-balance"><strong data-balance>Consultando seu saldo…</strong><span class="small" data-cycle></span></p><p class="small">Escolha até 50 páginas, inclusive escaneadas, para gerar até 10 perguntas. Confira as fontes e as respostas antes de salvar.</p><fieldset class="qd-pdf-filebox"><legend>Seu arquivo</legend><div class="qd-pdf-pickrow"><input data-file type="file" accept=".pdf,application/pdf" hidden><button type="button" class="btn sec small auto qd-pdf-pick" data-pick><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M7 3h7l4 4v13H6V3h1Z"/><path d="M14 3v5h4M12 16v-5m-2 2 2-2 2 2"/></svg><span>Escolher PDF</span></button><span class="small">Até 20 MB</span></div><p data-document class="small" role="status"></p><a data-document-link target="_blank" rel="noopener" hidden>Ver PDF selecionado</a></fieldset><form hidden><label>Páginas para usar<input data-pages type="text" maxlength="300" required></label><p class="small">Exemplo: 1–3, 5, 8. Somente as páginas escolhidas serão enviadas à IA.</p><button class="btn auto" type="submit">Gerar perguntas</button></form><p class="small">O PDF é processado para esta geração e não é salvo no Quiddo. O resultado fica disponível para retomar a revisão. Editar, salvar e reabrir não gastam crédito.</p><p data-status role="status" aria-live="polite"></p><div data-history></div>';
  const $=<T extends HTMLElement>(s:string)=>dialog.querySelector<T>(s)!;
  const picker=$<HTMLInputElement>('[data-file]'), form=$<HTMLFormElement>('form'), message=$('[data-status]');
  let file:File|null=null,hash='',busy=false,remaining=0,providerReady=false,version=0,objectURL='';
  const controls=(disabled:boolean)=>dialog.querySelectorAll<HTMLButtonElement|HTMLInputElement>('button,input').forEach(x=>x.disabled=disabled);
  const review=async(r:PdfResult)=>{try{await onReview(r);void trackOnce('ai_review_open',r.id,{source:'pdf'});dialog.close();}catch(error){message.textContent=(error as Error).message;}};
  async function refresh() {
    try {
      const d=await api('status');remaining=d.remaining;providerReady=d.providerReady===true;
      $('[data-balance]').textContent=d.remaining+' de 2 disponíveis';
      $('[data-cycle]').textContent='Ciclo até '+new Date(d.paidPeriod.end).toLocaleDateString('pt-BR')+(d.simulatedBilling?' · cobrança simulada':'');
      if(!d.providerReady)message.textContent='A geração está temporariamente indisponível. Seu saldo está preservado.';
      $('button[type=submit]').toggleAttribute('disabled',busy||!remaining||!providerReady);
    }catch(e){remaining=0;$('[data-balance]').textContent='Saldo indisponível';message.textContent=(e as Error).message;form.hidden=true;}
    try {
      const h=await api('history');
      $('[data-history]').replaceChildren(...h.results.filter((r:any)=>!r.deleted).map((r:PdfResult)=>{const b=document.createElement('button');b.className='btn sec small auto';b.type='button';b.textContent='Revisar · '+r.title;b.onclick=()=>review(r);return b;}));
    }catch{/* The main status explains session failures. */}
  }
  picker.onchange=async()=>{
    const v=++version;file=null;form.hidden=true;message.textContent='';
    if(objectURL)URL.revokeObjectURL(objectURL);
    $('[data-document-link]').hidden=true;
    const selected=picker.files?.[0];if(!selected)return;
    $('[data-document]').textContent='Conferindo o PDF…';controls(true);
    try{
      if(selected.size>20*1024*1024)throw new Error('Escolha um PDF de até 20 MB.');
      void track('pdf_upload_start',{source:'pdf'});
      const data=await api('inspect',{method:'POST',headers:{'Content-Type':'application/pdf'},body:selected});
      if(v!==version || !dialog.open)return;
      file=selected;hash=data.sha256;objectURL=URL.createObjectURL(selected);
      void track('pdf_upload_success',{source:'pdf'});
      const link=$<HTMLAnchorElement>('[data-document-link]');link.href=objectURL;link.hidden=false;
      $('[data-document]').textContent=selected.name+' · '+data.pages+' páginas';
      $<HTMLInputElement>('[data-pages]').value=data.pages===1?'1':'1-'+Math.min(data.pages,50);form.hidden=false;
    }catch(e){void track('pdf_upload_error',{source:'pdf',error_category:e instanceof TypeError?'network':'rejected'});$('[data-document]').textContent=(e as Error).message;}
    finally{controls(false);$('button[type=submit]').toggleAttribute('disabled',busy||!remaining||!providerReady);}
  };
  form.onsubmit=async event=>{
    event.preventDefault();if(busy||!file||!providerReady||!remaining)return;
    const pages=$<HTMLInputElement>('[data-pages]').value.trim(),key='quiddo-pdf-attempt:'+hash+':'+pages;
    let attempt=localStorage.getItem(key);if(!attempt){attempt=crypto.randomUUID();localStorage.setItem(key,attempt);}
    busy=true;controls(true);message.textContent='Gerando perguntas a partir das páginas escolhidas…';
    void trackOnce('ai_generation_start',attempt,{source:'pdf'});
    try{
      let d;
      try{d=await api('generate?pages='+encodeURIComponent(pages),{method:'POST',headers:{'Content-Type':'application/pdf','Idempotency-Key':attempt},body:file});}
      catch(error){
        // A dropped HTTP response is ambiguous. Check this ID before any new request.
        const recovered=await api('jobs/'+attempt).catch(()=>null);
        if(recovered?.status==='delivered'||recovered?.status==='pending')d=recovered;else throw error;
      }
      for(let n=0;d.status==='pending'&&n<50;n++){await new Promise(resolve=>setTimeout(resolve,3000));d=await api('jobs/'+attempt);}
      if(d.status==='pending')void trackOnce('ai_generation_pending',attempt,{source:'pdf',error_category:'pending'});
      if(d.status!=='delivered'||!d.result||d.result.deleted)throw Object.assign(new Error(d.code==='cycle_changed'?'O ciclo mudou. Escolha novamente o arquivo para iniciar outra tentativa.':'A geração ainda não entregou um resultado. Consulte o histórico antes de repetir.'),{pending:d.status==='pending'});
      void trackOnce('ai_generation_success',attempt,{source:'pdf',question_count:d.result.items.length});
      await review(d.result);
    }catch(e){if(!(e as {pending?:boolean}).pending)void trackOnce('ai_generation_error',attempt,{source:'pdf',error_category:e instanceof TypeError?'network':'rejected'});if((e as Error & {code?:string}).code==='cycle_changed')localStorage.removeItem(key);message.textContent=(e as Error).message;}
    finally{busy=false;controls(false);if(dialog.open)await refresh();}
  };
  $('[data-close]').onclick=()=>dialog.close();$('[data-pick]').onclick=()=>{picker.value='';picker.click();};
  dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
  dialog.addEventListener('close',()=>{if(objectURL)URL.revokeObjectURL(objectURL);dialog.remove();});
  document.body.append(dialog);dialog.showModal();void refresh();
}
