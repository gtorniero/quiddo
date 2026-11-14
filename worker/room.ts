// Um Durable Object por sala. É a fonte da verdade: guarda perguntas, jogadores, respostas e pontos,
// mede o tempo das respostas e manda o estado absoluto para cada conexão por WebSocket.
import { DurableObject } from 'cloudflare:workers';
import { codigoValido } from './cobranca';
import type { LoginEnv } from './login';
import { anotaUso, type Contador } from './uso';
import { LIMITS } from '../shared/rules';
import * as G from '../shared/game';
import type { ClientMsg, CreateRoomBody, ServerMsg } from '../shared/protocol';

export interface Env extends LoginEnv {
  BTW_PROMOS_TOKEN?: string;
  PROMO_RETROZAP?: D1Database;
  PROMO_SPORTDNA?: D1Database;
  ROOMS: DurableObjectNamespace<Room>;
  ASSETS: Fetcher;
}

interface Attachment {
  role: 'host' | 'player' | null;
  pid?: string;
}

const KEEP_AFTER_END = 2 * 60 * 60 * 1000; // apaga a sala 2 horas depois do fim
const MAX_LIFETIME = 12 * 60 * 60 * 1000; // e qualquer sala esquecida depois de 12 horas
// sala parada (sem mensagem e sem a tela do anfitrião aberta) por 20 minutos pausa: G.INATIVA_MS
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

  /** Chave certa para pagar esta sala: a do anfitrião ou a do QR de pagamento (que só serve para pagar e liberar). */
  private chaveDePagar(chave: string): boolean {
    const room = this.room;
    return !!room && !!chave && (room.hostKey === chave || (!!room.pagar && room.pagar === chave));
  }

  /** A oferta da sala cheia vale? Anfitrião (ou o QR de pagamento) certo, sala grátis e alguém esperando vaga. */
  async ofertaValida(chave: string): Promise<boolean> {
    const room = this.room;
    return !!room && this.chaveDePagar(chave) && G.limiteDe(room) < LIMITS.maxPlayers && G.esperandoVaga(room) > 0;
  }

  /** O que o celular do anfitrião precisa para pagar pelo QR da TV: só números, sem nomes nem perguntas. */
  async resumoParaPagar(chave: string): Promise<{ esperando: number; limite: number; liberada: boolean } | null> {
    const room = this.room;
    if (!room || !this.chaveDePagar(chave)) return null;
    return { esperando: G.esperandoVaga(room), limite: G.limiteDe(room), liberada: G.salaLiberada(room) };
  }

  /** Libera a sala com um código pago, pedido pelo celular que pagou (QR da TV). O servidor confere tudo. */
  async liberarCom(chave: string, codigo: string): Promise<'ok' | 'chave' | 'codigo'> {
    const room = this.room;
    if (!room || !this.chaveDePagar(chave)) return 'chave';
    if (G.salaLiberada(room)) return 'ok';
    if (!(await codigoValido(this.env, codigo))) return 'codigo';
    this.libera(room);
    await this.save();
    await this.scheduleAlarm();
    this.changed(true);
    return 'ok';
  }

  /** Sala liberada até 200 pessoas (e a marca). Conta no uso se foi a oferta da sala cheia. */
  private libera(room: G.Room) {
    const oferta = G.esperandoVaga(room) > 0;
    room.maxPlayers = LIMITS.maxPlayers;
    this.uso({ liberadas: 1, ...(oferta ? { oferta_paga: 1 } : {}) });
  }

  /** Soma nos contadores de uso do dia; a sala da equipe (?btw_interno=1) fica de fora. */
  private uso(o: Partial<Record<Contador, number>> & { maior?: number }) {
    if (this.room?.interno) return;
    this.ctx.waitUntil(anotaUso(this.env, o));
  }

  /** Chamado pelo Worker para abrir a sala. Devolve false se o código já está em uso. */
  async create(code: string, hostKey: string, body: CreateRoomBody, maxPlayers?: number, interno = false): Promise<boolean> {
    if (this.room) return false;
    const now = Date.now();
    // as imagens ficam em chaves próprias; o estado da sala guarda só a marca '1'
    const imgs: Record<string, string> = {};
    const questions = body.questions.map((q, i) => {
      if (!q.img) return q;
      imgs['img:' + i] = q.img;
      return { ...q, img: '1' };
    });
    this.room = G.newRoom({ code, hostKey, theme: body.theme, visual: body.visual, brand: body.brand, questions, hasLogo: !!body.logo, now, maxPlayers, pagar: crypto.randomUUID(), interno });
    if (body.logo) await this.ctx.storage.put('logo', body.logo);
    for (const [k, v] of Object.entries(imgs)) await this.ctx.storage.put(k, v);
    await this.save();
    await this.scheduleAlarm();
    return true;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    // o logo só sai da sala liberada (Passe ou Premium); na sala grátis ele fica guardado e não é servido
    if (url.pathname.endsWith('/logo')) return this.serveImage('logo', !!(this.room && G.marcaDaSala(this.room).logo));
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
      if (msg.type === 'join') this.ctx.waitUntil(anotaUso(this.env, { entradas_recusadas: 1, recusa_nao_encontrada: 1 }));
      this.send(ws, { type: 'error', code: 'not_found' });
      return ws.close(4004, 'not_found');
    }

    // sala pausada por inatividade: o anfitrião que volta reabre com o mesmo código; quem chega espera
    if (room.pausada) {
      if (msg.type === 'host' && msg.hostKey === room.hostKey) {
        G.retomar(room, now);
        this.uso({ reabertas: 1 });
        await this.scheduleAlarm();
      } else if (msg.type === 'join') {
        this.uso({ entradas_recusadas: 1, recusa_pausada: 1 });
        this.send(ws, { type: 'error', code: 'pausada' });
        return ws.close(4000, 'pausada');
      } else if (msg.type !== 'host') return;
    }

    // última mensagem de alguém (o ping automático não conta); vai salva junto com a sala
    room.mexeu = now;

    if (msg.type === 'host') {
      if (msg.hostKey !== room.hostKey) return this.send(ws, { type: 'error', code: 'bad_key' });
      ws.serializeAttachment({ role: 'host' } satisfies Attachment);
      room.hostVisto = now;
      return this.sendView(ws, { role: 'host' }, G.ranking(room), now);
    }

    if (msg.type === 'join') {
      const eraEnsaio = !!room.ensaio;
      const res = G.join(room, msg.playerId, msg.nick, now, msg.avatar);
      if (!res.ok) {
        this.send(ws, { type: 'error', code: res.code });
        ws.close(4000, res.code);
        const motivo: Contador | null = res.code === 'started' ? 'recusa_comecou' : res.code === 'cheia_gratis' || res.code === 'full' ? 'recusa_cheia' : res.code === 'kicked' ? 'recusa_removido' : null;
        if (motivo) this.uso({ entradas_recusadas: 1, [motivo]: 1 });
        // sala grátis cheia: a tela do anfitrião mostra quantos estão esperando (agrupa as tentativas repetidas)
        if (res.code === 'cheia_gratis') {
          if (!room.cheiaVista) {
            room.cheiaVista = true;
            this.uso({ sala_cheia: 1 });
          }
          this.changed(false);
        }
        return;
      }
      ws.serializeAttachment({ role: 'player', pid: res.player.id } satisfies Attachment);
      // a primeira pessoa de verdade encerrou o ensaio: o alarme dos bichos de teste sai junto
      if (eraEnsaio && !room.ensaio) await this.scheduleAlarm();
      return this.changed(true);
    }

    if (att.role === 'player' && att.pid) {
      if (msg.type === 'avatar') {
        if (G.setAvatar(room, att.pid, msg.avatar)) this.changed(true);
        return;
      }
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
        if (ok) this.contaJogo(room);
        break;
      case 'ensaio':
        ok = G.comecarEnsaio(room, now);
        if (ok) this.uso({ ensaios: 1 });
        break;
      case 'fimEnsaio':
        ok = G.fimEnsaio(room);
        break;
      case 'mostrar':
        ok = G.mostrarRespostas(room, now);
        break;
      case 'reveal':
        ok = G.reveal(room);
        break;
      case 'showRanking':
        ok = G.showRanking(room);
        break;
      case 'next':
        ok = G.next(room, now);
        if (ok && room.phase === 'final' && !room.ensaio) this.uso({ jogos_concluidos: 1 });
        break;
      case 'restart':
        ok = G.restart(room, now);
        if (ok && !room.ensaio) this.contaJogo(room);
        else if (ok) this.uso({ ensaios: 1 });
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
      case 'liberar': {
        // o anfitrião pagou com a sala aberta: confere o código e libera até 200 pessoas e a marca (logo e cor)
        if (G.salaLiberada(room)) ok = true;
        else if (await codigoValido(this.env, msg.codigo)) {
          this.libera(room);
          ok = true;
        } else this.send(ws, { type: 'error', code: 'acesso_invalido' });
        break;
      }
      case 'close':
        return this.closeRoom();
    }
    if (ok) {
      await this.scheduleAlarm();
      this.changed(true);
    }
  }

  /** Jogo de verdade começou: conta o jogo, as pessoas e a faixa de tamanho (sem nomes). */
  private contaJogo(room: G.Room) {
    const n = G.pessoas(room);
    this.uso({ jogos: 1, jogadores: n, maior: n, [G.faixaTamanho(n)]: 1, ...(n >= 3 ? { jogos_com_turma: 1 } : {}) });
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

  /**
   * Sala parada: pausa em vez de apagar. Perguntas, pessoas e pontos ficam guardados até o limite de 12 horas;
   * a tela do anfitrião vê "A sala pausou" e reabre com o mesmo código, e o convite já enviado continua valendo.
   */
  private async pausar(now: number) {
    const room = this.room;
    if (!room || !G.pausar(room, now)) return;
    this.uso({ fechadas_por_inatividade: 1 });
    for (const s of this.ctx.getWebSockets()) {
      const att = s.deserializeAttachment() as Attachment | null;
      // quem é jogador fica esperando (tenta de novo sozinho); a tela do anfitrião mostra o botão de reabrir
      this.send(s, att?.role === 'host' ? { type: 'closed', motivo: 'inativa' } : { type: 'error', code: 'pausada' });
      try {
        s.close(4003, 'pausada');
      } catch {}
    }
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = null;
    await this.save();
  }

  /** Último ping da tela do anfitrião (a resposta automática não acorda a sala, mas fica registrada). */
  private hostVisto(): number {
    let t = 0;
    for (const s of this.ctx.getWebSockets()) {
      if ((s.deserializeAttachment() as Attachment | null)?.role !== 'host') continue;
      const ping = this.ctx.getWebSocketAutoResponseTimestamp(s);
      if (ping) t = Math.max(t, ping.getTime());
    }
    return t;
  }

  // ---------- tempo ----------

  private async scheduleAlarm() {
    const room = this.room;
    if (!room) return;
    const times = [room.createdAt + MAX_LIFETIME];
    if (!room.pausada) times.push(G.ultimaAtividade(room) + G.INATIVA_MS);
    if (room.endedAt) times.push(room.endedAt + KEEP_AFTER_END);
    if (room.phase === 'question' && !room.pausada) times.push(room.endsAt);
    const bot = room.pausada ? 0 : G.proximoBot(room);
    if (bot) times.push(bot);
    await this.ctx.storage.setAlarm(Math.min(...times));
  }

  async alarm() {
    const room = this.room;
    if (!room) return;
    const now = Date.now();
    if (now >= room.createdAt + MAX_LIFETIME || (room.endedAt && now >= room.endedAt + KEEP_AFTER_END)) {
      return this.closeRoom();
    }
    // a tela do anfitrião aberta conta como atividade: o ping dela fica registrado sem acordar a sala
    const visto = this.hostVisto();
    if (visto > (room.hostVisto || 0)) room.hostVisto = visto;
    // ninguém mexeu e a tela do anfitrião não deu sinal por 20 minutos: pausa (reabre com o mesmo código)
    if (G.salaParada(room, now)) {
      await this.pausar(now);
      return this.scheduleAlarm();
    }
    if (room.pausada) return this.scheduleAlarm();
    // ensaio: os bichos de teste respondem na hora marcada
    if (G.respondeBots(room, now)) {
      if (G.everyoneAnswered(room)) G.reveal(room);
      this.changed(true);
    }
    if (room.phase === 'question' && now >= room.endsAt) {
      G.reveal(room);
      this.changed(true);
    }
    await this.save();
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
