import {pdfRoute} from './pdf-quiz/route.mjs';
export {PdfAccount} from './pdf-quiz/account.mjs';
export {PdfBudget} from './pdf-quiz/budget.mjs';
import {probeMeta} from './meta-probe.mjs';
import {servicePayments} from './btw-payments.mjs';
import {runMeta,metaRoute,captureLead} from './meta-adapter.mjs';
import { naoIndexar } from '../shared/seo';
// Worker: serve os arquivos do site e a API das salas.
//   POST /api/salas              abre uma sala (corpo: CreateRoomBody) → { code, hostKey }
//   GET  /api/salas/{CODIGO}/ws  WebSocket da sala (anfitrião e jogadores)
//   GET  /api/salas/{CODIGO}/logo logo do anfitrião
//   GET  /api/salas/{CODIGO}/img/{N} imagem da pergunta N
//   GET  /api/salas/{CODIGO}/pagar?c=CHAVE   resumo para pagar a sala cheia no celular (QR da TV)
//   POST /api/salas/{CODIGO}/liberar         { chave, codigo }: libera a sala com um código pago, pelo celular
//   /api/cobranca, /api/pix, /api/pix/status, /api/cartao, /api/acesso: cobrança (worker/cobranca.ts)
// O resto vai para os arquivos estáticos; rotas como /criar e /ABCD caem no index.html.
// Quiz do celular para o computador: POST /api/levar e GET /api/levar/{id} (worker/levar.ts).
import {servicePromos} from './promos-service';
import {adminPromos} from './promos-admin';
import type { CreateRoomResult } from '../shared/protocol';
import { CODE_RE, LIMITS, normalizeCode, randomCode, validateCreate } from '../shared/rules';
import { cobrancaVale, codigoValido, rotaCobranca } from './cobranca';
import { anotaUso, rotaUso } from './uso';
import { rotaLogin } from './login';
import { canonicalResponse } from './canonical';
import { rotaQuizzes } from './quizzes';
import { rotaLevar } from './levar';
import type { Env } from './room';

export { Room } from './room';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

const app = {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean); // ['api', 'salas', 'ABCD', 'ws']

    const canonical = await canonicalResponse(req, env);
    if (canonical) return canonical;

    const pdf = await pdfRoute(req,env); if (pdf) return pdf;
    if (parts[0] !== 'api') return env.ASSETS.fetch(req);

    if(url.pathname==='/api/btw/promos')return servicePromos(req,env);

    if(url.pathname==='/api/promos/admin')return adminPromos(req,env);

    // uso por dia, para saber quando o plano grátis está chegando no limite
    if (url.pathname === '/api/uso' && req.method === 'GET') return rotaUso(env);
    // login sem senha (código por e-mail)
    const login = await rotaLogin(req, env, url.pathname);
    if (login) return login;
    const quizzes = await rotaQuizzes(req, env, url.pathname);
    if (quizzes) return quizzes;
    // quiz do celular para o computador da TV (link temporário, sem conta)
    const levar = await rotaLevar(req, env, url.pathname);
    if (levar) return levar;
    // cobrança: Pix, cartão/Apple Pay/Google Pay e conferência do código de acesso
    const cob = await rotaCobranca(req, env, url.pathname, async (sala, hostKey) => {
      const code = normalizeCode(sala);
      return CODE_RE.test(code) && env.ROOMS.get(env.ROOMS.idFromName(code)).ofertaValida(hostKey);
    });
    if (cob) return cob;

    if (parts[1] === 'salas' && parts.length === 2 && req.method === 'POST') {
      let body, raw = null as { lead?: unknown; meta?: unknown } | null;
      try {
        raw = (await req.json()) as typeof raw;
        body = validateCreate(raw);
      } catch (e) {
        return json({ erro: e instanceof Error ? e.message : 'Pedido inválido.' }, 400);
      }
      const hostKey = crypto.randomUUID();
      // sala grátis: até 10 pessoas e sem logo e cor próprios quando a cobrança está valendo;
      // com código pago (Passe ou Premium), até 200 e com a marca (shared/game.ts, marcaDaSala)
      const maxPlayers = !cobrancaVale(env, body.testeCobranca) || (await codigoValido(env, body.acesso)) ? LIMITS.maxPlayers : LIMITS.freePlayers;
      // sala da equipe (cookie btw_interno=1, gravado por ?btw_interno=1): fica fora dos contadores de uso
      const interno = /(?:^|;\s*)btw_interno=1(?:;|$)/.test(req.headers.get('Cookie') || '');
      for (let i = 0; i < 8; i++) {
        const code = randomCode();
        const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
        if (await stub.create(code, hostKey, body, maxPlayers, interno)) {
          ctx.waitUntil(anotaUso(env, interno ? { internas: 1 } : { salas: 1 }));
          // Lead pela Conversions API: só com as variáveis ligadas e consentimento de anúncios (meta-adapter).
          if (raw?.lead) ctx.waitUntil(captureLead(env, raw.lead, raw.meta, body.theme));
          return json({ code, hostKey, maxPlayers } satisfies CreateRoomResult);
        }
      }
      return json({ erro: 'Não deu para abrir a sala agora. Tente de novo.' }, 503);
    }

    // pagamento da sala cheia pelo celular do anfitrião (QR da TV): a chave só serve para pagar e liberar
    if (parts[1] === 'salas' && CODE_RE.test(parts[2] || '') && parts.length === 4 && (parts[3] === 'pagar' || parts[3] === 'liberar')) {
      const stub = env.ROOMS.get(env.ROOMS.idFromName(parts[2]));
      if (parts[3] === 'pagar' && req.method === 'GET') {
        const r = await stub.resumoParaPagar(String(url.searchParams.get('c') || '').slice(0, 64));
        return r ? json(r) : json({ erro: 'Sala não encontrada.' }, 404);
      }
      if (parts[3] === 'liberar' && req.method === 'POST') {
        if (req.headers.get('Origin') !== url.origin) return json({ erro: 'origem' }, 403);
        const b = (await req.json().catch(() => ({}))) as { chave?: unknown; codigo?: unknown };
        const r = await stub.liberarCom(String(b.chave || '').slice(0, 64), String(b.codigo || '').slice(0, 40));
        return r === 'ok' ? json({ ok: true }) : json({ erro: r }, r === 'chave' ? 404 : 403);
      }
      return json({ erro: 'Não encontrado.' }, 404);
    }

    const isImg = parts.length === 5 && parts[3] === 'img' && /^\d{1,2}$/.test(parts[4]);
    if (parts[1] === 'salas' && CODE_RE.test(parts[2] || '') && ((parts.length === 4 && (parts[3] === 'ws' || parts[3] === 'logo')) || isImg)) {
      const stub = env.ROOMS.get(env.ROOMS.idFromName(parts[2]));
      return stub.fetch(req);
    }

    return json({ erro: 'Não encontrado.' }, 404);
  },
} satisfies ExportedHandler<Env>;

export default {...app,async fetch(...args:Parameters<typeof app.fetch>){if(new URL(args[0].url).pathname==='/api/btw/payments')return servicePayments(args[0],args[1]);const route=await metaRoute(args[0],args[1]);if(route)return route;let response=await app.fetch(...args);args[2].waitUntil(runMeta(args[1]));const path=new URL(args[0].url).pathname;if(!path.startsWith('/api/')&&naoIndexar(path)){response=new Response(response.body,response);response.headers.set('X-Robots-Tag','noindex');
// iframe da medição: no-transform impede o Cloudflare Web Analytics de injetar o beacon e contar o iframe como página
if(/^\/medicao(?:\.html)?$/.test(path)){const cc=response.headers.get('Cache-Control')||'public, max-age=0, must-revalidate';if(!/no-transform/.test(cc))response.headers.set('Cache-Control',cc+', no-transform');}}return response},async scheduled(_event:unknown,env:Env,ctx:ExecutionContext){ctx.waitUntil(Promise.all([runMeta(env),probeMeta(env,'quiddo')]))}};
