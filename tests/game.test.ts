import { beforeEach, describe, expect, it } from 'vitest';
import * as G from '../shared/game';

const qs = [
  { t: 'Um?', o: ['a', 'b', 'c', 'd'], c: 0, tl: 20 },
  { t: 'Dois?', o: ['a', 'b'], c: 1, tl: 10 },
];
let room: G.Room;
const T0 = 1_000_000;
// abre as perguntas 3 s antes de T0: o "Prepare-se" termina exatamente em T0
const S = T0 - G.PREP_MS;

beforeEach(() => {
  room = G.newRoom({ code: 'ABCD', hostKey: 'k', theme: 'corp', brand: { name: '', color: '' }, questions: qs, hasLogo: false, now: T0 });
  G.join(room, 'p1', 'Ana', T0);
  G.join(room, 'p2', 'Bia', T0 + 1);
  G.join(room, 'p3', 'Caio', T0 + 2);
});

describe('fases', () => {
  it('segue lobby → question → reveal → ranking → question → … → final', () => {
    expect(room.phase).toBe('lobby');
    expect(G.next(room, S)).toBe(false);
    expect(G.start(room, S)).toBe(true);
    expect(room.phase).toBe('question');
    expect(room.endsAt).toBe(T0 + 20_000);
    expect(G.showRanking(room)).toBe(false);
    expect(G.reveal(room)).toBe(true);
    expect(room.phase).toBe('reveal');
    expect(G.showRanking(room)).toBe(true);
    expect(G.next(room, S + 30_000)).toBe(true);
    expect(room.phase).toBe('question');
    expect(room.qIndex).toBe(1);
    G.reveal(room);
    G.showRanking(room);
    expect(G.next(room, T0 + 50_000)).toBe(true);
    expect(room.phase).toBe('final');
    expect(room.endedAt).toBe(T0 + 50_000);
  });

  it('fecha sozinha quando todos os conectados respondem', () => {
    G.start(room, S);
    G.answer(room, 'p1', 0, 0, T0 + 100);
    G.answer(room, 'p2', 0, 1, T0 + 200);
    expect(G.everyoneAnswered(room)).toBe(false);
    room.players.p3.connected = false;
    expect(G.everyoneAnswered(room)).toBe(true);
  });

  it('jogar de novo zera pontos e sorteio', () => {
    G.start(room, S);
    G.answer(room, 'p1', 0, 0, T0);
    G.reveal(room);
    G.next(room, S);
    G.reveal(room);
    G.next(room, S);
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
    G.start(room, S);
    expect(G.answer(room, 'p1', 0, 0, T0 + 5_000)).toBe(true); // certa, 5 s de 20
    expect(G.answer(room, 'p2', 0, 2, T0 + 1_000)).toBe(true); // errada
    G.reveal(room);
    expect(room.players.p1.delta).toBe(875);
    expect(room.players.p2.delta).toBe(0);
    expect(room.players.p3.delta).toBe(0);
    expect(room.counts).toEqual([1, 0, 1, 0]);
  });

  it('não deixa mudar a resposta, responder fora de hora ou de outra pergunta', () => {
    G.start(room, S);
    expect(G.answer(room, 'p1', 0, 1, T0 + 10)).toBe(true);
    expect(G.answer(room, 'p1', 0, 0, T0 + 20)).toBe(false);
    expect(G.answer(room, 'p2', 1, 0, T0 + 20)).toBe(false);
    expect(G.answer(room, 'p2', 0, 9, T0 + 20)).toBe(false);
    expect(G.answer(room, 'p2', 0, 0, T0 + 20_001)).toBe(false);
    expect(G.answer(room, 'x', 0, 0, T0 + 20)).toBe(false);
  });

  it('ranking guarda a posição anterior para a animação de subida', () => {
    G.start(room, S);
    G.answer(room, 'p1', 0, 0, T0 + 10_000);
    G.reveal(room);
    G.next(room, S);
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
    G.start(room, S);
    G.answer(room, 'p1', 0, 0, T0);
    G.reveal(room);
    room.players.p1.connected = false;
    const r = G.join(room, 'p1', 'qualquer', T0 + 5);
    expect(r.ok).toBe(true);
    expect(room.players.p1.score).toBe(1000);
    expect(room.players.p1.nick).toBe('Ana');
  });

  it('não deixa entrar gente nova depois de começar', () => {
    G.start(room, S);
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
    G.start(room, S);
    G.answer(room, 'p2', 0, 0, T0);
    G.reveal(room);
    G.next(room, S);
    G.reveal(room);
    G.next(room, S);
    expect(G.draw(room, 'scored', () => 0.99)?.id).toBe('p2');
    expect(G.draw(room, 'scored')).toBeNull();
    const a = G.draw(room, 'all')!;
    const b = G.draw(room, 'all')!;
    expect(new Set(['p2', a.id, b.id]).size).toBe(3);
    expect(G.draw(room, 'all')).toBeNull();
  });
});

describe('visões', () => {
  it('a pergunta com imagem avisa a versão; o texto da imagem nunca vai no estado', () => {
    const r = G.newRoom({ code: 'ABCD', hostKey: 'k', theme: 'corp', brand: { name: '', color: '' }, questions: [{ t: 'V ou F?', o: ['Verdadeiro', 'Falso'], c: 1, tl: 10, img: '1' }], hasLogo: false, now: 77 });
    G.join(r, 'p1', 'Ana', 1);
    G.start(r, 100);
    const v = G.playerView(r, 'p1', 100)!;
    expect(v.question).toEqual({ t: 'V ou F?', o: ['Verdadeiro', 'Falso'], tipo: 'quiz', dobro: false, tl: 10, img: 77 });
    expect(v.startsAt).toBe(100 + G.PREP_MS);
  });

  it('o jogador nunca recebe a resposta certa antes da revelação', () => {
    G.start(room, S);
    const v = G.playerView(room, 'p1', T0)!;
    expect(v.correct).toBeNull();
    expect(v.question && 'c' in v.question).toBe(false);
    G.reveal(room);
    expect(G.playerView(room, 'p1', T0)!.correct).toBe(0);
  });
});

describe('prepare-se', () => {
  it('ninguém responde durante os 3 s do "Prepare-se"; o tempo conta a partir do fim dele', () => {
    G.start(room, S);
    expect(room.endsAt).toBe(T0 + 20_000);
    expect(G.answer(room, 'p1', 0, 0, T0 - 1)).toBe(false);
    expect(G.answer(room, 'p1', 0, 0, T0)).toBe(true);
    G.reveal(room);
    expect(room.players.p1.delta).toBe(1000);
  });
});

describe('pergunta que vale o dobro', () => {
  it('dobra os pontos de quem acerta', () => {
    const r = G.newRoom({ code: 'ABCD', hostKey: 'k', theme: 'corp', brand: { name: '', color: '' }, questions: [{ t: 'Final', o: ['a', 'b'], c: 0, tl: 10, dobro: true }], hasLogo: false, now: 0 });
    G.join(r, 'p1', 'Ana', 0);
    G.join(r, 'p2', 'Bia', 0);
    G.start(r, 0);
    G.answer(r, 'p1', 0, 0, G.PREP_MS + 5_000);
    G.answer(r, 'p2', 0, 1, G.PREP_MS);
    G.reveal(r);
    expect(r.players.p1.delta).toBe(1500);
    expect(r.players.p2.delta).toBe(0);
    expect(G.playerView(r, 'p1', 0)!.question!.dobro).toBe(true);
  });
});

describe('perguntas de opinião', () => {
  const nova = (q: Parameters<typeof G.newRoom>[0]['questions'][number]) => {
    const r = G.newRoom({ code: 'ABCD', hostKey: 'k', theme: 'festa', brand: { name: '', color: '' }, questions: [q, { t: 'Depois', o: ['a', 'b'], c: 0, tl: 10 }], hasLogo: false, now: 0 });
    G.join(r, 'p1', 'Caio', 0);
    G.join(r, 'p2', 'Ana', 1);
    G.join(r, 'p3', 'Bia', 2);
    return r;
  };

  it('enquete: conta os votos, não tem certa e não mexe nos pontos', () => {
    const r = nova({ t: 'Praia ou montanha?', o: ['Praia', 'Montanha'], c: -1, tl: 10, tipo: 'opiniao' });
    G.start(r, 0);
    G.answer(r, 'p1', 0, 0, G.PREP_MS + 10);
    G.answer(r, 'p2', 0, 0, G.PREP_MS + 20);
    G.answer(r, 'p3', 0, 1, G.PREP_MS + 30);
    expect(G.everyoneAnswered(r)).toBe(true);
    G.reveal(r);
    expect(r.counts).toEqual([2, 1]);
    expect(Object.values(r.players).every((p) => p.score === 0 && p.delta === 0)).toBe(true);
    const v = G.playerView(r, 'p1', 0)!;
    expect(v.correct).toBeNull();
    expect(v.question!.tipo).toBe('opiniao');
  });

  it('"quem é mais provável": as opções são as pessoas da sala, em ordem alfabética', () => {
    const r = nova({ t: 'Quem é mais provável chegar atrasado?', o: [], c: -1, tl: 10, tipo: 'quem' });
    G.start(r, 0);
    const q = G.hostView(r, 0).question!;
    expect(q.o).toEqual(['Ana', 'Bia', 'Caio']);
    expect(q.oa).toHaveLength(3);
    expect(G.answer(r, 'p1', 0, 3, G.PREP_MS)).toBe(false);
    expect(G.answer(r, 'p1', 0, 1, G.PREP_MS)).toBe(true);
    expect(G.answer(r, 'p2', 0, 1, G.PREP_MS)).toBe(true);
    G.reveal(r);
    expect(r.counts).toEqual([0, 2, 0]);
    expect(r.players.p1.score).toBe(0);
  });
});

describe('sequência e quem acertou mais rápido', () => {
  const muitas = [
    { t: 'Um?', o: ['a', 'b'], c: 0, tl: 20 },
    { t: 'Opinião?', o: ['a', 'b'], c: -1, tl: 20, tipo: 'opiniao' as const },
    { t: 'Dois?', o: ['a', 'b'], c: 1, tl: 20 },
    { t: 'Três?', o: ['a', 'b'], c: 0, tl: 20 },
  ];
  let r: G.Room;
  beforeEach(() => {
    r = G.newRoom({ code: 'ABCD', hostKey: 'k', theme: 'festa', brand: { name: '', color: '' }, questions: muitas, hasLogo: false, now: T0 });
    G.join(r, 'p1', 'Ana', T0);
    G.join(r, 'p2', 'Bia', T0 + 1);
    G.join(r, 'p3', 'Caio', T0 + 2);
  });
  const rodada = (escolhas: Record<string, [number, number]>, t: number) => {
    for (const [id, [c, ms]] of Object.entries(escolhas)) G.answer(r, id, r.qIndex, c, r.startedAt + ms);
    G.reveal(r);
    G.showRanking(r);
    return t;
  };

  it('conta acertos seguidos, a opinião não quebra e o erro zera', () => {
    G.start(r, S);
    rodada({ p1: [0, 1000], p2: [0, 500], p3: [1, 200] }, 0);
    expect(r.players.p1.streak).toBe(1);
    expect(r.players.p3.streak).toBe(0);
    G.next(r, S + 30_000);
    rodada({ p1: [1, 100], p2: [0, 100] }, 0); // opinião
    expect(r.players.p1.streak).toBe(1);
    G.next(r, S + 60_000);
    rodada({ p1: [1, 100], p2: [0, 100], p3: [1, 300] }, 0);
    expect(r.players.p1.streak).toBe(2);
    expect(r.players.p2.streak).toBe(0);
    expect(r.players.p3.streak).toBe(1);
    expect(G.ranking(r).find((x) => x.id === 'p1')!.streak).toBe(2);
    expect(G.playerView(r, 'p1', S + 61_000)!.me.streak).toBe(2);
  });

  it('lista quem acertou do mais rápido ao mais lento, só para a TV e só depois da revelação', () => {
    G.start(r, S);
    G.answer(r, 'p1', 0, 0, r.startedAt + 1500);
    G.answer(r, 'p2', 0, 0, r.startedAt + 400);
    G.answer(r, 'p3', 0, 1, r.startedAt + 100);
    expect(G.hostView(r, T0).acertaram).toEqual([]);
    G.reveal(r);
    const v = G.hostView(r, T0 + 2000);
    expect(v.acertaram.map((a) => [a.nick, a.ms])).toEqual([
      ['Bia', 400],
      ['Ana', 1500],
    ]);
    expect('acertaram' in G.playerView(r, 'p1', T0 + 2000)!).toBe(false);
  });

  it('jogar de novo zera a sequência', () => {
    G.start(r, S);
    for (let i = 0; i < muitas.length; i++) {
      if (i) G.next(r, S + i * 30_000);
      G.answer(r, 'p1', i, muitas[i].c < 0 ? 0 : muitas[i].c, r.startedAt + 100);
      G.reveal(r);
      G.showRanking(r);
    }
    G.next(r, S + 200_000);
    expect(r.phase).toBe('final');
    expect(r.players.p1.streak).toBe(3);
    G.restart(r, S + 300_000);
    expect(r.players.p1.streak).toBe(0);
  });
});
