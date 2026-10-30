// Um Durable Object por sala. É a fonte da verdade: guarda perguntas, jogadores, respostas e pontos,
// mede o tempo das respostas e manda o estado absoluto para cada conexão por WebSocket.
import { DurableObject } from 'cloudflare:workers';
import * as G from '../shared/game';
import type { ClientMsg, CreateRoomBody, ServerMsg } from '../shared/protocol';

export interface Env {
  ROOMS: DurableObjectNamespace<Room>;
  ASSETS: Fetcher;
}

interface Attachment {
  role: 'host' | 'player' | null;
  pid?: string;
}

const KEEP_AFTER_END = 2 * 60 * 60 * 1000; // apaga a sala 2 horas depois do fim
const MAX_LIFETIME = 12 * 60 * 60 * 1000; // e qualquer sala esquecida depois de 12 horas
const ANSWER_FLUSH_MS = 150; // agrupa as atualizações de "X de Y responderam"

export class Room extends DurableObject<Env> {
  private room: G.Room | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.room = (await ctx.storage.get<G.Room>('room')) || null;
    });
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"type":"ping"}', '{"type":"pong"}'));
  }

  /** Chamado pelo Worker para abrir a sala. Devolve false se o código já está em uso. */
  async create(code: string, hostKey: string, body: CreateRoomBody): Promise<boolean> {
    if (this.room) return false;
    const now = Date.now();
    // as imagens ficam em chaves próprias; o estado da sala guarda só a marca '1'
    const imgs: Record<string, string> = {};
    const questions = body.questions.map((q, i) => {
      if (!q.img) return q;
      imgs['img:' + i] = q.img;
      return { ...q, img: '1' };
    });
    this.room = G.newRoom({ code, hostKey, theme: body.theme, visual: body.visual, brand: body.brand, questions, hasLogo: !!body.logo, now });
    if (body.logo) await this.ctx.storage.put('logo', body.logo);
    for (const [k, v] of Object.entries(imgs)) await this.ctx.storage.put(k, v);
    await this.save();
    await this.scheduleAlarm();
    return true;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.endsWith('/logo')) return this.serveImage('logo', !!(this.room && this.room.logo));
    const im = /\/img\/(\d{1,2})$/.exec(url.pathname);
    if (im) {
      const q = this.room && this.room.questions[Number(im[1])];
      return this.serveImage('img:' + im[1], !!(q && q.img));
    }
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('Esperava WebSocket', { status: 426 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ role: null } satisfies Attachment);
    return new Response(null, { status: 101, webSocket: client });
  }

  private async serveImage(key: string, exists: boolean): Promise<Response> {
    const data = exists ? await this.ctx.storage.get<string>(key) : null;
    if (!data) return new Response('Sem imagem', { status: 404 });
    const m = /^data:(image\/[a-z]+);base64,(.*)$/.exec(data);
    if (!m) return new Response('Sem imagem', { status: 404 });
    const bin = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
    return new Response(bin, { headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=86400' } });
  }

  // ---------- mensagens ----------

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    if (typeof raw !== 'string' || raw.length > 4096) return;
    let msg: ClientMsg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    const room = this.room;
    const att = (ws.deserializeAttachment() || { role: null }) as Attachment;
    const now = Date.now();

    if (msg.type === 'ping') return this.send(ws, { type: 'pong', serverNow: now });
    if (!room) {
      this.send(ws, { type: 'error', code: 'not_found' });
      return ws.close(4004, 'not_found');
    }

    if (msg.type === 'host') {
      if (msg.hostKey !== room.hostKey) return this.send(ws, { type: 'error', code: 'bad_key' });
      ws.serializeAttachment({ role: 'host' } satisfies Attachment);
      return this.sendView(ws, { role: 'host' }, G.ranking(room), now);
    }

    if (msg.type === 'join') {
      const res = G.join(room, msg.playerId, msg.nick, now, msg.avatar);
      if (!res.ok) {
        this.send(ws, { type: 'error', code: res.code });
        return ws.close(4000, res.code);
      }
      ws.serializeAttachment({ role: 'player', pid: res.player.id } satisfies Attachment);
      return this.changed(true);
    }

    if (att.role === 'player' && att.pid) {
      if (msg.type === 'answer' && G.answer(room, att.pid, msg.qIndex, msg.choice, now)) {
        if (G.everyoneAnswered(room)) {
          G.reveal(room);
          await this.scheduleAlarm();
          return this.changed(true);
        }
        return this.changed(false);
      }
      return;
    }

    if (att.role !== 'host') return;
    let ok = false;
    switch (msg.type) {
      case 'start':
        ok = G.start(room, now);
        break;
      case 'reveal':
        ok = G.reveal(room);
        break;
      case 'showRanking':
        ok = G.showRanking(room);
        break;
      case 'next':
        ok = G.next(room, now);
        break;
      case 'restart':
        ok = G.restart(room, now);
        break;
      case 'draw':
        ok = !!G.draw(room, msg.mode === 'scored' ? 'scored' : 'all');
        break;
      case 'kick':
        ok = G.kick(room, String(msg.playerId));
        if (ok) this.dropPlayer(String(msg.playerId));
        // quem saiu pode ter sido o último que faltava responder
        if (ok && room.phase === 'question' && G.everyoneAnswered(room)) G.reveal(room);
        break;
      case 'close':
        return this.closeRoom();
    }
    if (ok) {
      await this.scheduleAlarm();
      this.changed(true);
    }
  }

  async webSocketClose(ws: WebSocket) {
    this.onGone(ws);
  }

  async webSocketError(ws: WebSocket) {
    this.onGone(ws);
  }

  private onGone(ws: WebSocket) {
    const att = ws.deserializeAttachment() as Attachment | null;
    const room = this.room;
    if (!room || !att || att.role !== 'player' || !att.pid) return;
    const p = room.players[att.pid];
    if (!p) return;
    // o mesmo jogador pode ter outra aba aberta
    const stillHere = this.ctx.getWebSockets().some((s) => s !== ws && (s.deserializeAttachment() as Attachment | null)?.pid === att.pid);
    if (stillHere) return;
    p.connected = false;
    if (room.phase === 'question' && G.everyoneAnswered(room)) {
      G.reveal(room);
      this.scheduleAlarm();
      return this.changed(true);
    }
    this.changed(false);
  }

  private dropPlayer(pid: string) {
    for (const s of this.ctx.getWebSockets()) {
      if ((s.deserializeAttachment() as Attachment | null)?.pid !== pid) continue;
      this.send(s, { type: 'kicked' });
      s.serializeAttachment({ role: null } satisfies Attachment);
      try {
        s.close(4001, 'kicked');
      } catch {}
    }
  }

  private async closeRoom() {
    for (const s of this.ctx.getWebSockets()) {
      this.send(s, { type: 'closed' });
      try {
        s.close(4002, 'closed');
      } catch {}
    }
    this.room = null;
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = null;
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
  }

  // ---------- tempo ----------

  private async scheduleAlarm() {
    const room = this.room;
    if (!room) return;
    const times = [room.createdAt + MAX_LIFETIME];
    if (room.endedAt) times.push(room.endedAt + KEEP_AFTER_END);
    if (room.phase === 'question') times.push(room.endsAt);
    await this.ctx.storage.setAlarm(Math.min(...times));
  }

  async alarm() {
    const room = this.room;
    if (!room) return;
    const now = Date.now();
    if (now >= room.createdAt + MAX_LIFETIME || (room.endedAt && now >= room.endedAt + KEEP_AFTER_END)) {
      return this.closeRoom();
    }
    if (room.phase === 'question' && now >= room.endsAt) {
      G.reveal(room);
      this.changed(true);
    }
    await this.scheduleAlarm();
  }

  // ---------- envio ----------

  /** Salva e manda o estado. `now=true` manda já; senão agrupa por alguns milissegundos. */
  private changed(immediate: boolean) {
    if (immediate) {
      if (this.flushTimer) clearTimeout(this.flushTimer);
      this.flushTimer = null;
      this.flush();
      return;
    }
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
        this.flush();
      }, ANSWER_FLUSH_MS);
    }
  }

  private flush() {
    const room = this.room;
    if (!room) return;
    this.save();
    const now = Date.now();
    const rk = G.ranking(room);
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment() as Attachment | null;
      if (att && att.role) this.sendView(ws, att, rk, now);
    }
  }

  private sendView(ws: WebSocket, att: Attachment, rk: ReturnType<typeof G.ranking>, now: number) {
    const room = this.room;
    if (!room) return;
    if (att.role === 'host') return this.send(ws, G.hostView(room, now, rk));
    if (att.role === 'player' && att.pid) {
      const v = G.playerView(room, att.pid, now, rk);
      if (v) this.send(ws, v);
    }
  }

  private send(ws: WebSocket, msg: ServerMsg) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {}
  }

  private save() {
    if (this.room) return this.ctx.storage.put('room', this.room);
  }
}
