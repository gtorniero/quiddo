import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RoomSocket } from '../src/lib/socket';
class FakeSocket {
  static OPEN = 1;
  static all: FakeSocket[] = [];
  readyState = 1;
  onopen?: () => void;
  onclose?: () => void;
  onmessage?: (e: { data: string }) => void;
  sent: string[] = [];
  constructor(public url: string) { FakeSocket.all.push(this); }
  send(data: string) { this.sent.push(data); }
  close() { this.readyState = 3; }
  message(m: unknown) { this.onmessage?.({ data: JSON.stringify(m) }); }
}
let clock = 0, client: RoomSocket, onMessage = vi.fn<(m: unknown) => void>();
beforeEach(() => {
  vi.useFakeTimers(); clock = 0; FakeSocket.all = [];
  vi.stubGlobal('performance', { now: () => clock });
  vi.stubGlobal('WebSocket', FakeSocket);
  vi.stubGlobal('location', { protocol: 'https:', host: 'quiddo.test' });
  vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'visible' }));
  vi.stubGlobal('window', Object.assign(new EventTarget(), { setInterval, setTimeout }));
  onMessage = vi.fn<(m: unknown) => void>();
  client = new RoomSocket({ code: 'ABCD', hello: () => ({ type: 'join', playerId: 'same-player', nick: 'Jogador' }), onMessage, onStatus: vi.fn() });
  FakeSocket.all[0].onopen?.();
});
afterEach(() => { client.stop(); vi.useRealTimers(); vi.unstubAllGlobals(); });
it('keeps server time monotonic across wall-clock changes and delayed packets', () => {
  const ws = FakeSocket.all[0]; ws.message({ type: 'state', serverNow: 100000 });
  clock = 1000; vi.setSystemTime(new Date('2000-01-01'));
  expect(client.now()).toBe(101000);
  ws.message({ type: 'state', serverNow: 100100 });
  expect(client.now()).toBe(101000);
  ws.message({ type: 'state', serverNow: 102000 });
  expect(client.now()).toBe(102000);
});
it('reconnects a silent open connection and ignores late callbacks from the old socket', () => {
  const old = FakeSocket.all[0]; clock = 61000; vi.advanceTimersByTime(5000);
  expect(FakeSocket.all).toHaveLength(2);
  const fresh = FakeSocket.all[1]; fresh.onopen?.();
  expect(JSON.parse(fresh.sent[0]).playerId).toBe('same-player');
  old.onclose?.(); old.message({ type: 'closed' }); old.onopen?.();
  expect(onMessage).not.toHaveBeenCalled();
  vi.advanceTimersByTime(25000);
  expect(fresh.sent.some(x => JSON.parse(x).type === 'ping')).toBe(true);
  expect(FakeSocket.all).toHaveLength(2);
});
it('rejoins immediately after a long background pause and stops retrying after leave', () => {
  clock = 31000; document.dispatchEvent(new Event('visibilitychange'));
  expect(FakeSocket.all).toHaveLength(2);
  client.stop(); window.dispatchEvent(new Event('online')); vi.advanceTimersByTime(120000);
  expect(FakeSocket.all).toHaveLength(2);
});
it('retains the free-room upgrade flow and stops on terminal errors', () => {
  const ws = FakeSocket.all[0]; ws.message({ type: 'error', code: 'cheia_gratis' });
  expect(ws.readyState).toBe(FakeSocket.OPEN);
  ws.message({ type: 'closed' }); expect(ws.readyState).toBe(3);
});
