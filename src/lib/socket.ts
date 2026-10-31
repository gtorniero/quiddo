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
      this.tries = 0;
      this.o.onStatus(true);
      this.send(this.o.hello());
      clearInterval(this.pingTimer);
      this.pingTimer = window.setInterval(() => this.send({ type: 'ping' }), 25_000);
    };
    ws.onmessage = (ev) => {
      let m: ServerMsg;
      try {
        m = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (m.type === 'state') this.offset = m.serverNow - Date.now();
      if (m.type === 'kicked' || m.type === 'closed' || (m.type === 'error' && m.code !== 'bad_key' && m.code !== 'acesso_invalido')) this.stop();
      this.o.onMessage(m);
    };
    ws.onclose = () => {
      clearInterval(this.pingTimer);
      if (this.ws !== ws || this.stopped) return;
      this.ws = null;
      this.o.onStatus(false);
      const wait = Math.min(5000, 500 * Math.pow(1.6, this.tries++));
      this.retryTimer = window.setTimeout(() => this.open(), wait);
    };
  }

  private onVisible = () => {
    // celular que volta do bloqueio: reconecta na hora em vez de esperar
    if (document.visibilityState === 'visible' && !this.ws && !this.stopped) {
      clearTimeout(this.retryTimer);
      this.open();
    }
  };

  /** Agora no relógio do servidor. */
  now() {
    return Date.now() + this.offset;
  }

  send(m: ClientMsg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m));
  }

  stop() {
    this.stopped = true;
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
