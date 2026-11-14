import './pdf-preview.css';
import { track, trackOnce } from './measurement';
export interface PdfResult {id:string;title:string;sourceSHA256:string;source?:'pdf'|'text';items:{t:string;a:string[];c:number;page?:number;evidence?:string;answer:string;topic:string}[]}
const CADEADO = '<svg class="qd-ia-lock" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor" stroke="none"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>';
/** Botão "Criar quiz com IA"; trancado mostra o cadeado e abre os planos ao clicar. */
export const pdfButton = (trancado = false) => '<button type="button" class="btn small qd-pdf-button" data-act="pdf-ia"' + (trancado ? ' data-trancado aria-label="Criar quiz com IA, exige assinatura"' : '') + '><span class="qd-ai-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M10 2.5c.7 4 2.8 6.1 6.8 6.8-4 .7-6.1 2.8-6.8 6.8-.7-4-2.8-6.1-6.8-6.8 4-.7 6.1-2.8 6.8-6.8Z"/><path d="M18.4 12.4c.4 2.4 1.7 3.7 4.1 4.1-2.4.4-3.7 1.7-4.1 4.1-.4-2.4-1.7-3.7-4.1-4.1 2.4-.4 3.7-1.7 4.1-4.1Z" opacity=".8"/></svg></span>Criar quiz com IA' + (trancado ? CADEADO : '') + '</button>';

/** "trancada": sem conta ou sem assinatura Mensal/Anual (mostra os planos); "ok" ou "outro" abrem a janela da IA. */
export async function iaAcesso(): Promise<'ok'|'trancada'|'outro'> {
  try {
    const r = await fetch('/api/pdf/status', {credentials:'same-origin'});
    if (r.ok) return 'ok';
    const d = await r.json().catch(() => ({}));
    return d.code === 'session' || d.code === 'monthly_required' ? 'trancada' : 'outro';
  } catch { return 'outro'; }
}

async function api(path:string,init:RequestInit={}) {
  const r=await fetch('/api/pdf/'+path,{credentials:'same-origin',...init});
  const d=await r.json();
  if(!r.ok)throw Object.assign(new Error(d.erro||'Não foi possível consultar a geração.'),{code:d.code});
  return d;
}
export function openPdfQuiz(onReview:(result:PdfResult)=>void|Promise<void>) {
  const dialog=document.createElement('dialog');dialog.className='qd-pdf-dialog';dialog.setAttribute('aria-labelledby','qd-pdf-title');
  dialog.innerHTML='<div class="qd-pdf-top"><span class="tag">Premium</span><button class="linkbtn" type="button" data-close aria-label="Fechar">Fechar ×</button></div><h2 id="qd-pdf-title">Criar quiz com IA</h2><p class="qd-pdf-balance"><strong data-balance>Consultando seu saldo…</strong><span class="small" data-cycle></span></p><p class="qd-ia-intro">Escolha um jeito: escreva o tema <b>ou</b> envie um PDF. A IA faz até 10 perguntas e você revisa antes de salvar.</p><div class="qd-ia-opcoes"><section class="qd-ia-op" aria-labelledby="qd-ia-t1"><h3 id="qd-ia-t1"><span class="qd-ia-num" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg></span>Escrever o tema</h3><form data-text-form><label for="qd-ia-briefing" class="small">Sobre o que é o quiz? Para quem?</label><textarea id="qd-ia-briefing" rows="5" maxlength="4000" required aria-describedby="qd-ia-dica" placeholder="Ex.: Festa da família. 10 perguntas fáceis sobre músicas, comidas e brincadeiras brasileiras."></textarea><p id="qd-ia-dica" class="small">Pode colar perguntas e respostas prontas. Para histórias da família, conte os fatos.</p><button class="btn" type="submit">Gerar com o tema</button></form></section><div class="qd-ia-ou" aria-hidden="true"><span>ou</span></div><section class="qd-ia-op" data-pdf-input aria-labelledby="qd-ia-t2"><h3 id="qd-ia-t2"><span class="qd-ia-num" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l4 4v13H6V3h1Z"/><path d="M14 3v5h4"/></svg></span>Enviar um PDF</h3><input data-file type="file" accept=".pdf,application/pdf" hidden><button type="button" class="qd-ia-drop" data-pick><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V5m-4 4 4-4 4 4"/><path d="M4 15v4h16v-4"/></svg><b>Arraste o PDF aqui</b><span>ou toque para escolher</span><small>Até 25 MB e 50 páginas, inclusive escaneadas</small></button><p data-document class="small" role="status"></p><a data-document-link target="_blank" rel="noopener" hidden>Ver PDF selecionado</a><form data-pdf-form hidden><label>Páginas para usar<input data-pages type="text" maxlength="300" required></label><p class="small">Exemplo: 1–3, 5, 8. Só essas páginas vão para a IA.</p><button class="btn" type="submit">Gerar com o PDF</button></form><p class="small">O PDF não fica salvo no Quiddo.</p></section></div><p data-status role="status" aria-live="polite"></p><p class="small"><span data-shared-balance hidden>Tema e PDF usam o mesmo saldo. </span>Editar, salvar e reabrir não gastam crédito.</p><details class="qd-ia-hist" data-history-box hidden><summary>Quizzes que você já gerou <span data-history-n></span></summary><div data-history></div></details>';
  const $=<T extends HTMLElement>(s:string)=>dialog.querySelector<T>(s)!;
  const picker=$<HTMLInputElement>('[data-file]'), form=$<HTMLFormElement>('[data-pdf-form]'), message=$('[data-status]');
  const textForm=$<HTMLFormElement>('[data-text-form]'), briefing=$<HTMLTextAreaElement>('#qd-ia-briefing');
  let file:File|null=null,hash='',busy=false,remaining={pdf:0,text:0},providerReady=false,version=0,objectURL='',pdfPromptVersion='';
  const controls=(disabled:boolean)=>dialog.querySelectorAll<HTMLButtonElement|HTMLInputElement|HTMLTextAreaElement>('button,input,textarea').forEach(x=>x.disabled=disabled);
  const refreshButtons=()=>{
    form.querySelector('button[type=submit]')?.toggleAttribute('disabled',busy||!remaining.pdf||!providerReady);
    textForm.querySelector('button[type=submit]')?.toggleAttribute('disabled',busy||!remaining.text||!providerReady);
  };
  // arrastar e soltar o PDF na caixa
  const drop=$('.qd-ia-drop');
  drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('sobre');});
  drop.addEventListener('dragleave',()=>drop.classList.remove('sobre'));
  drop.addEventListener('drop',e=>{
    e.preventDefault();drop.classList.remove('sobre');
    const f=e.dataTransfer?.files?.[0];if(!f||busy)return;
    const dt=new DataTransfer();dt.items.add(f);picker.files=dt.files;void picker.onchange?.(new Event('change'));
  });
  const review=async(r:PdfResult)=>{try{await onReview(r);void trackOnce('ai_review_open',r.id,{source:r.source??'pdf'});dialog.close();}catch(error){message.textContent=(error as Error).message;}};
  async function refresh() {
    try {
      const d=await api('status');
      pdfPromptVersion=d.pdfPromptVersion||'';
      const admin=d.paidPeriod.kind==='administrator';
      const sharedRemaining=admin?1:d.remaining;
      remaining=d.balances ? {pdf:d.balances.pdf.remaining,text:d.balances.text.remaining} : {pdf:sharedRemaining,text:sharedRemaining};
      providerReady=d.providerReady===true;
      $('[data-shared-balance]').hidden=admin||!!d.balances;
      $('.tag').textContent=admin?'Administrador':'Premium';
      $('[data-balance]').textContent=admin?'Acesso de administrador':d.balances
        ? remaining.text+' de '+d.balances.text.limit+' para texto · '+remaining.pdf+' de '+d.balances.pdf.limit+' para PDF'
        : d.remaining+' de '+d.limit+' disponíveis';
      $('[data-cycle]').textContent=admin?'Sem assinatura · limite de gasto preservado':'Ciclo até '+new Date(d.paidPeriod.end).toLocaleDateString('pt-BR')+(d.simulatedBilling?' · cobrança simulada':'');
      if(!d.providerReady)message.textContent='A geração está temporariamente indisponível. Seu saldo está preservado.';
      refreshButtons();
    }catch(e){remaining={pdf:0,text:0};$('[data-balance]').textContent='Saldo indisponível';message.textContent=(e as Error).message;refreshButtons();}
    try {
      const h=await api('history');
      const lista=h.results.filter((r:any)=>!r.deleted);$('[data-history-box]').hidden=!lista.length;$('[data-history-n]').textContent='('+lista.length+')';
      $('[data-history]').replaceChildren(...lista.map((r:PdfResult)=>{const b=document.createElement('button');b.className='btn sec small auto';b.type='button';b.textContent='Revisar · '+r.title;b.onclick=()=>review(r);return b;}));
    }catch{/* The main status explains session failures. */}
  }
  picker.onchange=async()=>{
    const v=++version;file=null;form.hidden=true;message.textContent='';
    if(objectURL)URL.revokeObjectURL(objectURL);
    $('[data-document-link]').hidden=true;
    const selected=picker.files?.[0];if(!selected)return;
    $('[data-document]').textContent='Conferindo o PDF…';controls(true);
    try{
      if(selected.size>25*1024*1024)throw new Error('Escolha um PDF de até 25 MB.');
      void track('pdf_upload_start',{source:'pdf'});
      const data=await api('inspect',{method:'POST',headers:{'Content-Type':'application/pdf'},body:selected});
      if(v!==version || !dialog.open)return;
      file=selected;hash=data.sha256;objectURL=URL.createObjectURL(selected);
      void track('pdf_upload_success',{source:'pdf'});
      const link=$<HTMLAnchorElement>('[data-document-link]');link.href=objectURL;link.hidden=false;
      $('[data-document]').textContent=selected.name+' · '+data.pages+' páginas';
      drop.classList.add('escolhido');drop.querySelector('b')!.textContent='Trocar o PDF';
      $<HTMLInputElement>('[data-pages]').value=data.pages===1?'1':'1-'+Math.min(data.pages,50);form.hidden=false;
    }catch(e){void track('pdf_upload_error',{source:'pdf',error_category:e instanceof TypeError?'network':'rejected'});$('[data-document]').textContent=(e as Error).message;}
    finally{controls(false);refreshButtons();}
  };
  async function generate(path:string, body:File|string, contentType:string, key:string) {
    const source=path==='generate-text'?'text':'pdf';
    if(busy||!remaining[source]||!providerReady)return;
    let attempt=localStorage.getItem(key);
    if(!attempt){attempt=crypto.randomUUID();localStorage.setItem(key,attempt);}
    busy=true;controls(true);message.textContent='Gerando perguntas…';
    void trackOnce('ai_generation_start',attempt,{source});
    try{
      let d;
      try{d=await api(path,{method:'POST',headers:{'Content-Type':contentType,'Idempotency-Key':attempt},body});}
      catch(error){
        // If delivery is uncertain, recover the existing job before attempting another one.
        const recovered=await api('jobs/'+attempt).catch(()=>null);
        if(recovered?.status==='delivered'||recovered?.status==='pending')d=recovered;else throw error;
      }
      for(let n=0;d.status==='pending'&&n<50;n++){await new Promise(resolve=>setTimeout(resolve,3000));d=await api('jobs/'+attempt);}
      if(d.status==='pending')void trackOnce('ai_generation_pending',attempt,{source,error_category:'pending'});
      if(d.status!=='delivered'||!d.result||d.result.deleted)throw Object.assign(new Error(d.code==='cycle_changed'?'O ciclo mudou. Inicie outra tentativa.':'A geração ainda não entregou um resultado. Consulte o histórico antes de repetir.'),{pending:d.status==='pending'});
      void trackOnce('ai_generation_success',attempt,{source,question_count:d.result.items.length});
      await review(d.result);
    }catch(e){if(!(e as {pending?:boolean}).pending)void trackOnce('ai_generation_error',attempt,{source,error_category:e instanceof TypeError?'network':'rejected'});if((e as Error & {code?:string}).code==='cycle_changed')localStorage.removeItem(key);message.textContent=(e as Error).message;}
    finally{busy=false;controls(false);if(dialog.open)await refresh();}
  }
  form.onsubmit=event=>{
    event.preventDefault();if(!file)return;
    const pages=$<HTMLInputElement>('[data-pages]').value.trim();
    void generate('generate?pages='+encodeURIComponent(pages),file,'application/pdf','quiddo-pdf-attempt:'+hash+':'+pages+(pdfPromptVersion?':'+pdfPromptVersion:''));
  };
  textForm.onsubmit=async event=>{
    event.preventDefault();
    const text=briefing.value.trim();
    if(!/[\p{L}\p{N}]/u.test(text)){message.textContent='Escreva um tema ou briefing.';briefing.focus();return;}
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
    const hash=[...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');
    await generate('generate-text',text,'text/plain;charset=UTF-8','quiddo-text-attempt:'+hash);
  };
  $('[data-close]').onclick=()=>dialog.close();$('[data-pick]').onclick=()=>{picker.value='';picker.click();};
  dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
  dialog.addEventListener('close',()=>{if(objectURL)URL.revokeObjectURL(objectURL);dialog.remove();});
  document.body.append(dialog);dialog.showModal();void refresh();
}
