// Separate entrypoint. No production payment routes, schedules, services, or databases.
import {rotaCobranca} from './cobranca';
import {rotaQuizzes} from './quizzes';
import {rotaLogin,emailDaSessao} from './login';
import {pdfRoute} from './pdf-quiz/route.mjs';
import {json,sha} from './pdf-quiz/core.mjs';
export {PdfAccount} from './pdf-quiz/account.mjs';
export {PdfBudget} from './pdf-quiz/budget.mjs';

const gate = '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Quiddo · teste privado</title><style>body{max-width:520px;margin:10vh auto;padding:24px;font:18px system-ui;color:#0e2a22;background:#f4f8f0}input,button{font:inherit;padding:12px;margin:8px 0;width:100%;box-sizing:border-box}button{background:#ffd650;border:2px solid #0e2a22;border-radius:12px}</style><h1>Quiddo · teste privado</h1><p>Este ambiente usa contas de teste. Nenhuma alteração será publicada no Quiddo.</p><form><label>Chave de acesso ao teste<input type="password" name="token" autocomplete="off" required></label><button>Entrar no teste</button><p role="status"></p></form><script>document.querySelector("form").onsubmit=async e=>{e.preventDefault();const r=await fetch("/__staging/unlock",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:e.target.token.value})});if(r.ok)location.href="/criar";else document.querySelector("[role=status]").textContent="Chave inválida."}</script></html>';
export default {
  async fetch(req:Request,env:any):Promise<Response> {
    if(env.PDF_STAGE!=='isolated' || env.COBRANCA!=='simulacao' || !env.STAGING_ACCESS_TOKEN)return json({erro:'Staging fechado.'},503);
    const url=new URL(req.url);
    if(env.PDF_STRIPE_TEST==='true' && url.pathname==='/api/stripe-webhook-test' && req.method==='POST') {
      if(!/^[sr]k_test_/.test(env.STRIPE_KEY||'') || !env.STRIPE_WEBHOOK_SECRET) return json({erro:'Stripe de teste não configurado.'},503);
      // Stripe does not send a browser cookie or Origin. The real handler verifies the raw signature.
      return (await rotaCobranca(req,env,'/api/stripe-webhook'))!;
    }
    if(url.pathname==='/__staging/unlock' && req.method==='POST') {
      if(req.headers.get('origin')!==url.origin)return json({erro:'Origem inválida.'},403);
      let token='';try{token=String((await req.json() as any).token||'');}catch{}
      if(await sha(token)!==await sha(env.STAGING_ACCESS_TOKEN))return url.pathname.startsWith('/api/')||url.pathname.startsWith('/__staging/') ? json({erro:'Acesso privado.'},401) : new Response(gate,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});
    if(req.method==='POST' && req.headers.get('origin')!==url.origin)return json({erro:'Origem inválida.'},403);
    const login=await rotaLogin(req,env,url.pathname);if(login)return login;
    if(url.pathname==='/api/conta' && req.method==='GET')return json({email:await emailDaSessao(req,env)||null,acesso:null,assinatura:null,simulado:true});
    const pdf=await pdfRoute(req,env);if(pdf)return pdf;
    const quizzes=await rotaQuizzes(req,env,url.pathname);if(quizzes)return quizzes;
    if(url.pathname==='/api/cobranca')return json({modo:'desligada',planos:[]});
    if(url.pathname.startsWith('/api/'))return json({erro:'Somente PDF e login de teste neste ambiente.'},404);
    return env.ASSETS.fetch(req);
  }
};
