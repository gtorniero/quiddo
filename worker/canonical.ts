import { mergeBrowserQuizzes } from '../shared/browser-migration';
import { quizDocument, DOCUMENT_LIMIT } from '../shared/quiz-document';
import { compartilharSessao, type LoginEnv } from './login';
const OFFICIAL = 'https://www.quiddo.com.br';
const html = (body: string, headers: Headers = new Headers()) => {
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  if (!headers.has('Referrer-Policy')) headers.set('Referrer-Policy', 'no-referrer');
  headers.set('X-Robots-Tag', 'noindex');
  return new Response(body, { headers });
};
const page = (body: string, script: string) =>
  '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Seus quizzes · Quiddo</title><style>body{font:18px/1.6 system-ui;background:#f4f3e9;color:#16392e;max-width:680px;margin:8vh auto;padding:24px}button,a{font:inherit}button{background:#16392e;color:white;border:0;border-radius:24px;padding:14px 24px;cursor:pointer}a{color:#16392e}section{background:white;border:2px solid #16392e;border-radius:20px;padding:30px}small{display:block;margin-top:20px}</style><section><h1>Quiddo</h1>' +
  body +
  '</section><script>' +
  script +
  '</script></html>';
export async function canonicalResponse(req: Request, env: LoginEnv): Promise<Response | null> {
  const url = new URL(req.url),
    old = url.hostname === 'quiddo.com.br' || url.hostname === 'quiddo.guitorniero.workers.dev';
  if (url.pathname === '/api/migrar-navegador') {
    if (
      url.origin !== OFFICIAL ||
      req.method !== 'POST' ||
      !['https://quiddo.com.br', 'https://quiddo.guitorniero.workers.dev'].includes(req.headers.get('Origin') || '')
    )
      return new Response('Origem inválida.', { status: 403 });
    if (Number(req.headers.get('Content-Length')) > DOCUMENT_LIMIT)
      return new Response('Arquivo grande demais. Os originais continuam no navegador anterior.', { status: 413 });
    let data: { quizzes: unknown[]; atual?: string; host?: string; hostKey?: string; acesso?: string; acessoAte?: string; volta?: string };
    try {
      const text = await req.text();
      if (text.length > DOCUMENT_LIMIT) throw Error();
      data = JSON.parse(new URLSearchParams(text).get('dados') || '');
      if (!Array.isArray(data.quizzes) || data.quizzes.length > 1000) throw Error();
      data.quizzes = data.quizzes.map(quizDocument);
    } catch {
      return new Response('Não foi possível transferir. Os originais continuam no navegador anterior.', { status: 400 });
    }
    const target = new URL(String(data.volta || '/criar'), OFFICIAL);
    if (target.origin !== OFFICIAL || !target.pathname.startsWith('/')) return new Response('Destino inválido.', { status: 400 });
    const safe = {
      source: req.headers.get('Origin')!,
      quizzes: data.quizzes,
      atual: String(data.atual || ''),
      host: /^[A-Z2-9]{4}$/.test(data.host || '') ? data.host : '',
      hostKey: /^[a-f0-9-]{36}$/.test(data.hostKey || '') ? data.hostKey : '',
      acesso: /^QD-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(data.acesso || '') ? data.acesso : '',
      acessoAte: String(data.acessoAte || '').slice(0, 40),
    };
    const payload = JSON.stringify(safe).replace(/</g, '\\u003c');
    return html(
      page(
        '<h2>Guardando seus quizzes</h2><p id="status">Aguarde um instante.</p><p><a href="/criar">Abrir o editor</a></p>',
        '(async()=>{const data=' +
          payload +
          ';try{const get=(k,d)=>{try{return JSON.parse(localStorage.getItem("sr:"+k)||"null")||d}catch{return d}};const result=await (' +
          mergeBrowserQuizzes.toString() +
          ')(get("quizzes",[]),data.quizzes,get("origens-migradas",{}),data.source,data.atual);localStorage.setItem("sr:quizzes",JSON.stringify(result.quizzes));localStorage.setItem("sr:origens-migradas",JSON.stringify(result.migrations));if(result.selected)localStorage.setItem("sr:atual",JSON.stringify(result.selected));if(data.host&&data.hostKey)localStorage.setItem("sr:host:"+data.host,JSON.stringify(data.hostKey));if(data.acesso){localStorage.setItem("sr:acesso",JSON.stringify(data.acesso));localStorage.setItem("sr:acessoAte",JSON.stringify(data.acessoAte));}location.replace(' +
          JSON.stringify(target.href) +
          ');}catch{document.getElementById("status").textContent="Não há espaço para concluir. Seus originais continuam no endereço anterior; baixe uma cópia por lá.";}})();',
      ),
    );
  }
  if (old && req.method === 'HEAD' && !url.pathname.startsWith('/api/'))
    return new Response(null, { status: 308, headers: { Location: OFFICIAL + url.pathname + url.search } });
  if (!old || req.method !== 'GET' || url.pathname.startsWith('/api/')) return null;
  const headers = await compartilharSessao(req, env);
  // Cross-origin form POST must retain its Origin for the destination's CSRF check.
  // Send only the origin, never the path, query, or draft content in the referrer.
  headers.set('Referrer-Policy', 'strict-origin');
  const target = OFFICIAL + url.pathname + url.search;
  return html(
    page(
      '<h2>Um só endereço para seus quizzes</h2><p id="status">Conferindo o que já está guardado neste navegador…</p><form id="transfer" method="post" action="' +
        OFFICIAL +
        '/api/migrar-navegador" hidden><input type="hidden" name="dados" id="dados"><button>Continuar com meus quizzes</button></form><p><a id="download" href="#" hidden>Baixar uma cópia de segurança</a></p><small>Os originais continuam guardados neste navegador. Depois de entrar na conta, você poderá escolher quais levar para ela.</small>',
      'const get=(k,d)=>{try{return JSON.parse(localStorage.getItem("sr:"+k)||"null")||d}catch{return d}};const quizzes=get("quizzes",[]),atual=get("atual",""),match=location.pathname.match(/^\\/host\\/([A-Z2-9]{4})$/),host=match?match[1]:"",hostKey=host?get("host:"+host,""):"",acesso=get("acesso","");const data={quizzes,atual,host,hostKey,acesso,acessoAte:get("acessoAte",""),volta:location.pathname+location.search+location.hash};if(!quizzes.length&&!hostKey&&!acesso)location.replace(' +
        JSON.stringify(target) +
        '+location.hash);else{document.getElementById("status").textContent="Encontramos "+quizzes.length+" quiz(es) neste navegador. Leve-os para o endereço oficial antes de continuar.";document.getElementById("transfer").hidden=false;document.getElementById("dados").value=JSON.stringify(data);const link=document.getElementById("download");link.hidden=false;link.href=URL.createObjectURL(new Blob([JSON.stringify({formato:"quiddo-backup/1",quizzes},null,2)],{type:"application/json"}));link.download="quiddo-backup-navegador.json";}',
    ),
    headers,
  );
}
