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
const page = (body: string, script: string) => `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Seus quizzes · Quiddo</title>
  <link rel="icon" href="${OFFICIAL}/marca/quiddo-icone.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,900&family=Nunito:wght@600;800;900&display=swap">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; min-height: 100svh; display: grid; place-items: center;
      padding: 24px 16px 32px; background: #fff6e6; color: #0e2a22;
      font: 600 1rem/1.55 Nunito, system-ui, sans-serif;
    }
    main {
      width: min(100%, 30rem); padding: clamp(22px, 6vw, 40px);
      background: #fff; border: 3px solid #0e2a22; border-radius: 22px;
      box-shadow: 0 6px 0 #0e2a22;
    }
    .marca { display: block; width: 144px; max-width: 100%; height: auto; }
    h1 { margin: 20px 0 10px; font: 900 clamp(1.75rem, 6vw, 2.25rem)/1.08 Fraunces, Georgia, serif; }
    p { margin: 0 0 18px; }
    button {
      width: 100%; min-height: 48px; padding: 10px 16px; background: #ffc83d; color: inherit;
      border: 2px solid #0e2a22; border-radius: 999px; box-shadow: 0 4px 0 #0e2a22;
      font: 900 1rem/1.25 Nunito, system-ui, sans-serif; cursor: pointer;
    }
    button:hover { background: #ffdb75; }
    a { color: #0b5d45; font-weight: 800; text-underline-offset: 3px; }
    .backup { display: inline-flex; align-items: center; min-height: 44px; margin-top: 8px; }
    small { display: block; margin-top: 8px; color: #4a5e56; font-size: .875rem; }
    :focus-visible { outline: 3px solid #0b5d45; outline-offset: 4px; }
    [hidden] { display: none !important; }
  </style>
</head>
<body>
  <main>
    <img class="marca" src="${OFFICIAL}/marca/quiddo-cor.svg" alt="Quiddo">
    ${body}
  </main>
  <script>${script}</script>
</body>
</html>`;
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
        '<h1>Guardando seus quizzes</h1><p id="status">Aguarde um instante.</p><p><a href="/criar">Abrir o editor</a></p>',
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
  if (!old || !['GET', 'HEAD'].includes(req.method) || url.pathname.startsWith('/api/')) return null;
  const recover = req.method === 'GET' && url.searchParams.get('recuperar') === '1';
  if (url.searchParams.get('recuperar') === '1') url.searchParams.delete('recuperar');
  const destination = url.pathname + url.search;
  const target = OFFICIAL + destination;
  const headers = req.method === 'GET' ? await compartilharSessao(req, env) : new Headers();
  if (!recover) {
    headers.set('Location', target);
    headers.set('Cache-Control', 'no-store');
    return new Response(null, { status: 308, headers });
  }
  // Cross-origin form POST must retain its Origin for the destination's CSRF check.
  // Send only the origin, never the path, query, or draft content in the referrer.
  headers.set('Referrer-Policy', 'strict-origin');
  return html(
    page(
      '<h1>Leve seus quizzes com você</h1><p id="status" role="status">Procurando quizzes neste navegador…</p><form id="transfer" method="post" action="' +
        OFFICIAL +
        '/api/migrar-navegador" hidden><input type="hidden" name="dados" id="dados"><button>Continuar com meus quizzes</button></form><a class="backup" id="download" href="#" hidden>Baixar uma cópia de segurança</a><small id="transfer-note" hidden>Os originais continuam neste navegador. Depois de entrar, você pode escolher quais quizzes salvar na sua conta.</small>',
      'const get=(k,d)=>{try{return JSON.parse(localStorage.getItem("sr:"+k)||"null")||d}catch{return d}};const quizzes=get("quizzes",[]),atual=get("atual",""),match=location.pathname.match(/^\\/host\\/([A-Z2-9]{4})$/),host=match?match[1]:"",hostKey=host?get("host:"+host,""):"",acesso=get("acesso","");const data={quizzes,atual,host,hostKey,acesso,acessoAte:get("acessoAte",""),volta:' + JSON.stringify(destination) + '+location.hash};if(!quizzes.length&&!hostKey&&!acesso)location.replace(' +
        JSON.stringify(target) +
        '+location.hash);else{document.getElementById("status").textContent=quizzes.length?"Você tem "+quizzes.length+(quizzes.length===1?" quiz salvo":" quizzes salvos")+" neste navegador. Leve "+(quizzes.length===1?"seu quiz":"seus quizzes")+" para www.quiddo.com.br.":"Leve seu acesso para www.quiddo.com.br.";if(!quizzes.length){document.querySelector("#transfer button").textContent="Continuar para o Quiddo";}document.getElementById("transfer").hidden=false;document.getElementById("dados").value=JSON.stringify(data);const link=document.getElementById("download");link.hidden=!quizzes.length;document.getElementById("transfer-note").hidden=!quizzes.length;link.href=URL.createObjectURL(new Blob([JSON.stringify({formato:"quiddo-backup/1",quizzes},null,2)],{type:"application/json"}));link.download="quiddo-backup-navegador.json";}',
    ),
    headers,
  );
}
