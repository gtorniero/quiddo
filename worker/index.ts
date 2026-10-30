// Worker: serve os arquivos do site e a API das salas.
//   POST /api/salas              abre uma sala (corpo: CreateRoomBody) → { code, hostKey }
//   GET  /api/salas/{CODIGO}/ws  WebSocket da sala (anfitrião e jogadores)
//   GET  /api/salas/{CODIGO}/logo logo do anfitrião
//   GET  /api/salas/{CODIGO}/img/{N} imagem da pergunta N
// O resto vai para os arquivos estáticos; rotas como /criar e /ABCD caem no index.html.
import type { CreateRoomResult } from '../shared/protocol';
import { CODE_RE, randomCode, validateCreate } from '../shared/rules';
import type { Env } from './room';

export { Room } from './room';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean); // ['api', 'salas', 'ABCD', 'ws']

    if (parts[0] !== 'api') return env.ASSETS.fetch(req);

    if (parts[1] === 'salas' && parts.length === 2 && req.method === 'POST') {
      let body;
      try {
        body = validateCreate(await req.json());
      } catch (e) {
        return json({ erro: e instanceof Error ? e.message : 'Pedido inválido.' }, 400);
      }
      const hostKey = crypto.randomUUID();
      for (let i = 0; i < 8; i++) {
        const code = randomCode();
        const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
        if (await stub.create(code, hostKey, body)) return json({ code, hostKey } satisfies CreateRoomResult);
      }
      return json({ erro: 'Não deu para abrir a sala agora. Tente de novo.' }, 503);
    }

    const isImg = parts.length === 5 && parts[3] === 'img' && /^\d{1,2}$/.test(parts[4]);
    if (parts[1] === 'salas' && CODE_RE.test(parts[2] || '') && ((parts.length === 4 && (parts[3] === 'ws' || parts[3] === 'logo')) || isImg)) {
      const stub = env.ROOMS.get(env.ROOMS.idFromName(parts[2]));
      return stub.fetch(req);
    }

    return json({ erro: 'Não encontrado.' }, 404);
  },
} satisfies ExportedHandler<Env>;
