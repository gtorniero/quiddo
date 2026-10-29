import { beforeEach, describe, expect, it } from 'vitest';
import * as G from '../shared/game';

const qs = [
  { t: 'Um?', o: ['a', 'b', 'c', 'd'], c: 0, tl: 20 },
  { t: 'Dois?', o: ['a', 'b'], c: 1, tl: 10 },
];
let room: G.Room;
const T0 = 1_000_000;

beforeEach(() => {
  room = G.newRoom({ code: 'ABCD', hostKey: 'k', theme: 'corp', brand: { name: '', color: '' }, questions: qs, hasLogo: false, now: T0 });
  G.join(room, 'p1', 'Ana', T0);
  G.join(room, 'p2', 'Bia', T0 + 1);
  G.join(room, 'p3', 'Caio', T0 + 2);
});

describe('fases', () => {
  it('segue lobby → question → reveal → ranking → question → … → final', () => {
    expect(room.phase).toBe('lobby');
    expect(G.next(room, T0)).toBe(false);
    expect(G.start(room, T0)).toBe(true);
    expect(room.phase).toBe('question');
    expect(room.endsAt).toBe(T0 + 20_000);
    expect(G.showRanking(room)).toBe(false);
    expect(G.reveal(room)).toBe(true);
    expect(room.phase).toBe('reveal');
    expect(G.showRanking(room)).toBe(true);
    expect(G.next(room, T0 + 30_000)).toBe(true);
    expect(room.phase).toBe('question');
    expect(room.qIndex).toBe(1);
    G.reveal(room);
    G.showRanking(room);
    expect(G.next(room, T0 + 50_000)).toBe(true);
    expect(room.phase).toBe('final');
    expect(room.endedAt).toBe(T0 + 50_000);
  });

  it('fecha sozinha quando todos os conectados respondem', () => {
    G.start(room, T0);
    G.answer(room, 'p1', 0, 0, T0 + 100);
    G.answer(room, 'p2', 0, 1, T0 + 200);
    expect(G.everyoneAnswered(room)).toBe(false);
    room.players.p3.connected = false;
    expect(G.everyoneAnswered(room)).toBe(true);
  });

  it('jogar de novo zera pontos e sorteio', () => {
    G.start(room, T0);
    G.answer(room, 'p1', 0, 0, T0);
    G.reveal(room);
    G.next(room, T0);
    G.reveal(room);
    G.next(room, T0);
    G.draw(room, 'all', () => 0);
    expect(G.restart(room, T0 + 1)).toBe(true);
    expect(room.players.p1.score).toBe(0);
    expect(room.drawn).toEqual([]);
    expect(room.phase).toBe('question');
    expect(room.qIndex).toBe(0);
  });
});

describe('respostas e pontos', () => {
  it('mede o tempo no servidor e pontua só quem acertou', () => {
    G.start(room, T0);
    expect(G.answer(room, 'p1', 0, 0, T0 + 5_000)).toBe(true); // certa, 5 s de 20
    expect(G.answer(room, 'p2', 0, 2, T0 + 1_000)).toBe(true); // errada
    G.reveal(room);
    expect(room.players.p1.delta).toBe(875);
    expect(room.players.p2.delta).toBe(0);
    expect(room.players.p3.delta).toBe(0);
    expect(room.counts).toEqual([1, 0, 1, 0]);
  });

  it('no modo "Sem pressa" todo acerto vale 1000', () => {
    room.scoring = 'fixed';
    G.start(room, T0);
    G.answer(room, 'p1', 0, 0, T0 + 19_000);
    G.answer(room, 'p2', 0, 1, T0 + 100);
    G.reveal(room);
    expect(room.players.p1.delta).toBe(1000);
    expect(room.players.p2.delta).toBe(0);
  });

  it('não deixa mudar a resposta, responder fora de hora ou de outra pergunta', () => {
    G.start(room, T0);
    expect(G.answer(room, 'p1', 0, 1, T0 + 10)).toBe(true);
    expect(G.answer(room, 'p1', 0, 0, T0 + 20)).toBe(false);
    expect(G.answer(room, 'p2', 1, 0, T0 + 20)).toBe(false);
    expect(G.answer(room, 'p2', 0, 9, T0 + 20)).toBe(false);
    expect(G.answer(room, 'p2', 0, 0, T0 + 20_001)).toBe(false);
    expect(G.answer(room, 'x', 0, 0, T0 + 20)).toBe(false);
  });

  it('ranking guarda a posição anterior para a animação de subida', () => {
    G.start(room, T0);
    G.answer(room, 'p1', 0, 0, T0 + 10_000);
    G.reveal(room);
    G.next(room, T0);
    G.answer(room, 'p3', 1, 1, T0);
    G.reveal(room);
    const rk = G.ranking(room);
    const caio = rk.find((r) => r.id === 'p3')!;
    expect(caio.rank).toBe(1);
    expect(caio.prevRank).toBe(3);
    expect(rk[1].id).toBe('p1'); // 1000 > 750
  });
});

describe('jogadores', () => {
  it('volta para a sala com os pontos depois de cair', () => {
    G.start(room, T0);
    G.answer(room, 'p1', 0, 0, T0);
    G.reveal(room);
    room.players.p1.connected = false;
    const r = G.join(room, 'p1', 'qualquer', T0 + 5);
    expect(r.ok).toBe(true);
    expect(room.players.p1.score).toBe(1000);
    expect(room.players.p1.nick).toBe('Ana');
  });

  it('não deixa entrar gente nova depois de começar', () => {
    G.start(room, T0);
    expect(G.join(room, 'p9', 'Davi', T0)).toEqual({ ok: false, code: 'started' });
  });

  it('diferencia apelidos repetidos', () => {
    G.join(room, 'p4', 'ana', T0);
    expect(room.players.p4.nick).toBe('ana 2');
  });

  it('removido não volta', () => {
    expect(G.kick(room, 'p2')).toBe(true);
    expect(G.join(room, 'p2', 'Bia', T0)).toEqual({ ok: false, code: 'kicked' });
  });

  it('respeita o limite de 200 por sala', () => {
    for (let i = 0; i < 197; i++) G.join(room, 'x' + i, 'J' + i, T0);
    expect(G.join(room, 'y', 'Extra', T0)).toEqual({ ok: false, code: 'full' });
  });
});

describe('sorteio', () => {
  it('não repete nome e respeita o modo "só quem pontuou"', () => {
    G.start(room, T0);
    G.answer(room, 'p2', 0, 0, T0);
    G.reveal(room);
    G.next(room, T0);
    G.reveal(room);
    G.next(room, T0);
    expect(G.draw(room, 'scored', () => 0.99)?.id).toBe('p2');
    expect(G.draw(room, 'scored')).toBeNull();
    const a = G.draw(room, 'all')!;
    const b = G.draw(room, 'all')!;
    expect(new Set(['p2', a.id, b.id]).size).toBe(3);
    expect(G.draw(room, 'all')).toBeNull();
  });
});

describe('visões', () => {
  it('o jogador nunca recebe a resposta certa antes da revelação', () => {
    G.start(room, T0);
    const v = G.playerView(room, 'p1', T0)!;
    expect(v.correct).toBeNull();
    expect(v.question && 'c' in v.question).toBe(false);
    G.reveal(room);
    expect(G.playerView(room, 'p1', T0)!.correct).toBe(0);
  });
});
