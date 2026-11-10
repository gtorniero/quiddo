import {emailDaSessao,loginSimulado} from '../login';
import {json,sha} from './core.mjs';
export async function pdfRoute(req,env) {
  const url=new URL(req.url);
  if(!url.pathname.startsWith('/api/pdf/') && !url.pathname.startsWith('/__staging/'))return null;
  if(env.PDF_ENABLED!=='true')return json({erro:'Não encontrado.'},404);
  const stage=env.PDF_STAGE==='isolated';
  if(!stage && (url.pathname.startsWith('/__staging/') || loginSimulado(env)))return json({erro:'Não encontrado.'},404);
  // Do not advertise a paid feature as ready before its production provider and spend guard are configured.
  if(!stage && ['/api/pdf/status','/api/pdf/inspect','/api/pdf/generate'].includes(url.pathname) && (!env.OPENAI_API_KEY || !(Number(env.PDF_BUDGET_USD)>0)))return json({erro:'A geração por PDF aguarda ativação. Seus créditos estão preservados.',code:'provider_unavailable'},503);
  if(!['GET','POST','DELETE'].includes(req.method))return json({erro:'Método inválido.'},405);
  if(req.method!=='GET' && req.headers.get('origin')!==url.origin)return json({erro:'Origem inválida.'},403);
  const email=await emailDaSessao(req,env);
  if(!email)return json({erro:'Entre na sua conta para criar ou recuperar quizzes.',code:'session'},401);
  const owner=await sha('quiddo-owner-v1:'+email.trim().toLowerCase());
  const headers=new Headers(req.headers);
  // Always overwrite these internal headers; account identity never comes from a caller-selected ID.
  headers.set('x-qd-pdf-owner',email.trim().toLowerCase());headers.delete('authorization');headers.delete('cookie');
  const forwarded=new Request(req,{headers});
  return env.PDF_ACCOUNTS.get(env.PDF_ACCOUNTS.idFromName(owner)).fetch(forwarded);
}
