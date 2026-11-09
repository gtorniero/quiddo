// Conexão com a sala por WebSocket, com reconexão automática.
// Ao (re)conectar manda `hello()` de novo (host ou join), e o servidor responde com o estado inteiro.
import type { ClientMsg, ServerMsg } from '../../shared/protocol';

export interface RoomSocketOpts {
  code: string;
  hello: () => ClientMsg;
  onMessage: (m: ServerMsg) => void;
  onStatus: (online: boolean) => void;
}

export class RoomSocket {
  private ws: WebSocket | null = null;
  private tries = 0;
  private stopped = false;
  private retryTimer = 0;
  private pingTimer = 0;
  /** Diferença entre o relógio do servidor e o daqui (servidor − local). */
  offset = 0;
  private anchor: { server: number; mono: number } | null = null;
  private lastMessageAt = 0;
  private watchdogTimer = 0;

  constructor(private o: RoomSocketOpts) {
    this.open();
    document.addEventListener('visibilitychange', this.onVisible);
    window.addEventListener('online', this.onVisible);
  }

  private open() {
    if (this.stopped) return;
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${location.host}/api/salas/${this.o.code}/ws`);
    this.ws = ws;
    ws.onopen = () => {
      if (this.ws !== ws || this.stopped) return;
      this.tries = 0;
      this.lastMessageAt = performance.now();
      this.o.onStatus(true);
      this.send(this.o.hello());
      clearInterval(this.pingTimer);
      this.pingTimer = window.setInterval(() => this.send({ type: 'ping' }), 25_000);
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = window.setInterval(() => {
        if (this.ws === ws && !this.stopped && performance.now() - this.lastMessageAt > 60_000) this.reconnectNow();
      }, 5000);
    };
    ws.onmessage = (ev) => {
      if (this.ws !== ws || this.stopped) return;
      let m: ServerMsg;
      try {
        m = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      this.lastMessageAt = performance.now();
      if (m.type === 'state') {
        const mono = performance.now();
        if (!this.anchor || m.serverNow > this.anchor.server + mono - this.anchor.mono) this.anchor = { server: m.serverNow, mono };
        this.offset = this.now() - Date.now();
      }
      if (m.type === 'kicked' || m.type === 'closed' || (m.type === 'error' && m.code !== 'bad_key' && m.code !== 'acesso_invalido' && m.code !== 'cheia_gratis')) this.stop();
      this.o.onMessage(m);
    };
    ws.onclose = () => {
      if (this.ws !== ws || this.stopped) return;
      clearInterval(this.pingTimer);
      clearInterval(this.watchdogTimer);
      this.ws = null;
      this.o.onStatus(false);
      const wait = Math.min(5000, 500 * Math.pow(1.6, this.tries++));
      this.retryTimer = window.setTimeout(() => this.open(), wait);
    };
  }

  private onVisible = () => {
    // celular que volta do bloqueio: reconecta na hora em vez de esperar
    if (document.visibilityState !== 'visible' || this.stopped) return;
    if (this.ws && performance.now() - this.lastMessageAt > 30_000) return this.reconnectNow();
    if (!this.ws) {
      clearTimeout(this.retryTimer);
      this.open();
    }
  };

  private reconnectNow() {
    if (this.stopped) return;
    clearTimeout(this.retryTimer);
    clearInterval(this.pingTimer);
    clearInterval(this.watchdogTimer);
    const old = this.ws;
    this.ws = null;
    try { old?.close(); } catch {}
    this.o.onStatus(false);
    this.open();
  }

  /** Agora no relógio do servidor, usando tempo monotônico e sem retroceder por pacote atrasado. */
  now() {
    return this.anchor ? this.anchor.server + performance.now() - this.anchor.mono : Date.now();
  }

  send(m: ClientMsg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m));
  }

  stop() {
    this.stopped = true;
    clearInterval(this.watchdogTimer);
    clearTimeout(this.retryTimer);
    clearInterval(this.pingTimer);
    document.removeEventListener('visibilitychange', this.onVisible);
    window.removeEventListener('online', this.onVisible);
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      try {
        ws.close();
      } catch {}
    }
  }
}
