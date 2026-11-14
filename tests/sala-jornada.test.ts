// Jornada da sala (14/11/2026): sala que não fecha com a TV ligada, pausa com o mesmo código,
// ensaio com bichos de teste, selo da sala grátis e faixas do contador de uso.
import { describe, expect, it } from 'vitest';
import * as G from '../shared/game';
import { LIMITS } from '../shared/rules';

const T0 = 5_000_000;
const qs = [
  { t: 'Um?', o: ['a', 'b', 'c', 'd'], c: 2, tl: 20 },
  { t: 'Dois?', o: ['Verdadeiro', 'Falso'], c: 1, tl: 10 },
  { t: 'Três?', o: ['x', 'y', 'z'], c: 0, tl: 15 },
];
const nova = (o: Partial<Parameters<typeof G.newRoom>[0]> = {}) =>
  G.newRoom({ code: 'ABCD', hostKey: 'k', theme: 'festa', brand: { name: '', color: '' }, questions: qs, hasLogo: false, now: T0, ...o });
/** Sequência fixa no lugar de Math.random, para os testes darem sempre o mesmo resultado. */
const seq = (...v: number[]) => {
  let i = 0;
  return () => v[i++ % v.length];
};

describe('sala parada', () => {
  it('pausa depois de 20 minutos sem mensagem e sem a tela do anfitrião', () => {
    const r = nova();
    expect(G.salaParada(r, T0 + G.INATIVA_MS - 1)).toBe(false);
    expect(G.salaParada(r, T0 + G.INATIVA_MS)).toBe(true);
  });

  it('a tela do anfitrião aberta conta como atividade (o ping dela)', () => {
    const r = nova();
    // a TV ficou ligada: o último ping foi há 25 segundos
    const agora = T0 + 3 * 60 * 60 * 1000;
    expect(G.salaParada(r, agora, agora - 25_000)).toBe(false);
    r.hostVisto = agora - 25_000;
    expect(G.salaParada(r, agora + G.INATIVA_MS - 25_001)).toBe(false);
    // a TV desligou: 20 minutos depois do último ping, pausa
    expect(G.salaParada(r, agora - 25_000 + G.INATIVA_MS)).toBe(true);
  });

  it('pausa guarda tudo e o anfitrião reabre com o mesmo código', () => {
    const r = nova();
    G.join(r, 'p1', 'Ana', T0);
    G.join(r, 'p2', 'Bia', T0);
    expect(G.pausar(r, T0 + G.INATIVA_MS)).toBe(true);
    expect(G.pausar(r, T0 + G.INATIVA_MS)).toBe(false);
    expect(r.pausada).toBe(T0 + G.INATIVA_MS);
    expect(Object.values(r.players).every((p) => !p.connected)).toBe(true);
    expect(G.salaParada(r, T0 + 10 * G.INATIVA_MS)).toBe(false); // já pausada
    expect(G.retomar(r, T0 + 2 * G.INATIVA_MS)).toBe(true);
    expect(r.pausada).toBeUndefined();
    expect(r.code).toBe('ABCD');
    expect(Object.keys(r.players)).toEqual(['p1', 'p2']);
    expect(G.salaParada(r, T0 + 2 * G.INATIVA_MS + 1000)).toBe(false);
    // quem já estava volta com o mesmo lugar
    expect(G.join(r, 'p1', 'Ana', T0 + 2 * G.INATIVA_MS)).toMatchObject({ ok: true });
    expect(r.players.p1.connected).toBe(true);
  });

  it('pergunta que estava aberta quando a sala pausou é revelada ao reabrir', () => {
    const r = nova();
    G.join(r, 'p1', 'Ana', T0);
    G.start(r, T0);
    G.pausar(r, T0 + G.INATIVA_MS);
    G.retomar(r, T0 + 2 * G.INATIVA_MS);
    expect(r.phase).toBe('reveal');
  });
});

describe('ensaio com bichos de teste', () => {
  it('só começa na sala de espera vazia', () => {
    const r = nova();
    G.join(r, 'p1', 'Ana', T0);
    expect(G.comecarEnsaio(r, T0)).toBe(false);
    const vazia = nova();
    expect(G.comecarEnsaio(vazia, T0)).toBe(true);
    expect(G.comecarEnsaio(vazia, T0)).toBe(false);
  });

  it('três bichos de teste entram, respondem sozinhos e o anfitrião vê ranking e pódio', () => {
    const r = nova();
    expect(G.comecarEnsaio(r, T0, seq(0.1, 0.5, 0.9, 0.2, 0.8, 0.4))).toBe(true);
    expect(r.ensaio).toBe(true);
    expect(r.phase).toBe('question');
    const bots = Object.values(r.players);
    expect(bots).toHaveLength(3);
    expect(bots.every((p) => p.bot && p.connected)).toBe(true);
    expect(G.pessoas(r)).toBe(0);
    expect(G.hostView(r, T0).ensaio).toBe(true);
    expect(G.hostView(r, T0).players.every((p) => p.bot)).toBe(true);

    // cada bicho tem resposta e hora marcadas, entre 1,2 s e o fim da pergunta
    expect(r.botPlano).toHaveLength(3);
    for (const b of r.botPlano!) {
      expect(b.ms).toBeGreaterThanOrEqual(1200);
      expect(r.startedAt + b.ms).toBeLessThan(r.endsAt);
      expect(b.choice).toBeGreaterThanOrEqual(0);
      expect(b.choice).toBeLessThan(4);
    }
    // antes da hora ninguém responde
    expect(G.respondeBots(r, r.startedAt + 1000)).toBe(0);
    const proximo = G.proximoBot(r);
    expect(proximo).toBe(r.startedAt + Math.min(...r.botPlano!.map((b) => b.ms)));
    // na hora, respondem; com todos respondidos, revela
    expect(G.respondeBots(r, r.startedAt + 8000)).toBe(3);
    expect(G.proximoBot(r)).toBe(0);
    expect(G.everyoneAnswered(r)).toBe(true);
    G.reveal(r);
    // o tempo da resposta é o planejado (pontos de verdade, como numa partida)
    const certos = r.botPlano!.filter((b) => b.choice === qs[0].c);
    expect(certos.length).toBeGreaterThan(0);
    expect(G.ranking(r)[0].score).toBeGreaterThanOrEqual(500);

    // segue até o pódio
    expect(G.showRanking(r)).toBe(true);
    G.next(r, T0 + 60_000, seq(0.3));
    expect(r.botPlano).toHaveLength(3);
    G.respondeBots(r, r.startedAt + 10_000);
    G.reveal(r);
    G.next(r, T0 + 90_000, seq(0.6));
    G.respondeBots(r, r.startedAt + 10_000);
    G.reveal(r);
    G.next(r, T0 + 120_000);
    expect(r.phase).toBe('final');
    expect(G.hostView(r, T0 + 120_000).podium).toHaveLength(3);
    expect(G.proximoBot(r)).toBe(0);
  });

  it('a primeira pessoa de verdade encerra o ensaio e entra na sala de espera', () => {
    const r = nova();
    G.comecarEnsaio(r, T0);
    const res = G.join(r, 'p1', 'Ana', T0 + 5000);
    expect(res.ok).toBe(true);
    expect(r.ensaio).toBe(false);
    expect(r.phase).toBe('lobby');
    expect(Object.keys(r.players)).toEqual(['p1']);
    expect(r.players.p1.score).toBe(0);
  });

  it('o anfitrião volta para a sala de espera depois do ensaio', () => {
    const r = nova();
    G.comecarEnsaio(r, T0);
    expect(G.fimEnsaio(r)).toBe(true);
    expect(G.fimEnsaio(r)).toBe(false);
    expect(r.phase).toBe('lobby');
    expect(Object.keys(r.players)).toHaveLength(0);
    expect(r.drawn).toEqual([]);
    expect(G.salaParada(r, T0 + 1000)).toBe(false);
  });

  it('pergunta de opinião: os bichos votam em qualquer opção', () => {
    const r = G.newRoom({ code: 'ABCD', hostKey: 'k', theme: 'festa', brand: { name: '', color: '' }, questions: [{ t: 'Praia?', o: ['Sim', 'Não'], c: -1, tipo: 'opiniao', tl: 10 }], hasLogo: false, now: T0 });
    G.comecarEnsaio(r, T0, seq(0.99, 0.1));
    for (const b of r.botPlano!) expect([0, 1]).toContain(b.choice);
  });

  it('os bichos não ocupam vaga na sala grátis quando a turma chega', () => {
    const r = nova({ maxPlayers: LIMITS.freePlayers });
    G.comecarEnsaio(r, T0);
    for (let i = 0; i < LIMITS.freePlayers; i++) expect(G.join(r, 'p' + i, 'Pessoa ' + i, T0 + i).ok).toBe(true);
    expect(G.join(r, 'extra', 'Extra', T0)).toEqual({ ok: false, code: 'cheia_gratis' });
  });
});

describe('selo da sala grátis e chave de pagamento', () => {
  it('celulares da sala grátis mostram o selo; sala paga, nunca', () => {
    const gratis = nova({ maxPlayers: LIMITS.freePlayers });
    G.join(gratis, 'p1', 'Ana', T0);
    expect(G.playerView(gratis, 'p1', T0)!.selo).toBe(true);
    const paga = nova({ maxPlayers: LIMITS.maxPlayers });
    G.join(paga, 'p1', 'Ana', T0);
    expect(G.playerView(paga, 'p1', T0)!.selo).toBe(false);
    // liberou com a sala aberta: o selo some
    gratis.maxPlayers = LIMITS.maxPlayers;
    expect(G.playerView(gratis, 'p1', T0)!.selo).toBe(false);
  });

  it('a chave de pagamento vai só para a TV, nunca para os celulares', () => {
    const r = nova({ pagar: 'chave-pagar' });
    G.join(r, 'p1', 'Ana', T0);
    expect(G.hostView(r, T0).pagar).toBe('chave-pagar');
    expect(JSON.stringify(G.playerView(r, 'p1', T0))).not.toContain('chave-pagar');
    expect(JSON.stringify(G.playerView(r, 'p1', T0))).not.toContain('"k"');
  });
});

describe('contador de uso', () => {
  it('separa os jogos por faixa de tamanho', () => {
    expect([0, 1, 2, 4, 5, 10, 11, 200].map(G.faixaTamanho)).toEqual([
      'tamanho_0',
      'tamanho_1',
      'tamanho_2a4',
      'tamanho_2a4',
      'tamanho_5a10',
      'tamanho_5a10',
      'tamanho_11mais',
      'tamanho_11mais',
    ]);
  });

  it('bichos de teste não contam como pessoas', () => {
    const r = nova();
    G.comecarEnsaio(r, T0);
    expect(G.pessoas(r)).toBe(0);
  });
});
