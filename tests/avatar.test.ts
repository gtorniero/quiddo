import { describe, expect, it } from 'vitest';
import { AVATAR_PADRAO, BICHOS, CABECA, CORES_N, ROSTO, avatarName, cleanAvatar, encodeAvatar, parseAvatar, randomAvatar, uniqueAvatar } from '../shared/avatar';
import * as G from '../shared/game';

describe('avatar', () => {
  it('tem 20 bichos, 10 itens de cabeça, 5 de rosto e 10 cores', () => {
    expect(Object.keys(BICHOS)).toHaveLength(20);
    expect(Object.keys(CABECA)).toHaveLength(10);
    expect(Object.keys(ROSTO)).toHaveLength(5);
    expect(CORES_N).toBe(10);
  });

  it('lê e escreve o texto curto', () => {
    const v = parseAvatar('capivara.bone.escuros.5');
    expect(v).toEqual({ a: 'capivara', h: 'bone', f: 'escuros', c: 5 });
    expect(encodeAvatar(v!)).toBe('capivara.bone.escuros.5');
    expect(parseAvatar('tatu.-.-.0')).toEqual({ a: 'tatu', h: null, f: null, c: 0 });
  });

  it('recusa avatar inválido e cai no padrão', () => {
    for (const bad of ['', 'leao.-.-.0', 'tatu.capacete.-.0', 'tatu.-.monoculo.0', 'tatu.-.-.10', 'tatu.-.-.x', 'tatu.-.-', '<svg>', null, 42, '__proto__.-.-.0']) {
      expect(parseAvatar(bad)).toBeNull();
      expect(cleanAvatar(bad)).toBe(AVATAR_PADRAO);
    }
  });

  it('sugere o nome a partir do visual', () => {
    expect(avatarName(parseAvatar('capivara.bone.escuros.5')!)).toBe('Capivara de Boné');
    expect(avatarName(parseAvatar('onca.-.escuros.1')!)).toBe('Onça de Óculos escuros');
    expect(avatarName(parseAvatar('tatu.-.-.0')!)).toBe('Tatu');
  });

  it('troca a cor de fundo quando o visual já está na sala', () => {
    expect(uniqueAvatar('gato.coroa.-.3', [])).toBe('gato.coroa.-.3');
    expect(uniqueAvatar('gato.coroa.-.3', ['gato.coroa.-.3'])).toBe('gato.coroa.-.4');
    expect(uniqueAvatar('gato.coroa.-.9', ['gato.coroa.-.9', 'gato.coroa.-.0'])).toBe('gato.coroa.-.1');
    const all = Array.from({ length: CORES_N }, (_, c) => `gato.coroa.-.${c}`);
    expect(uniqueAvatar('gato.coroa.-.2', all)).toBe('gato.coroa.-.2');
  });

  it('o sorteio sempre gera um avatar válido', () => {
    let seed = 1;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 200; i++) expect(parseAvatar(encodeAvatar(randomAvatar(rand)))).not.toBeNull();
  });
});

describe('avatar na sala', () => {
  const qs = [{ t: 'Um?', o: ['a', 'b'], c: 0, tl: 20 }];
  const nova = () => G.newRoom({ code: 'ABCD', hostKey: 'k', theme: 'corp', brand: { name: '', color: '' }, questions: qs, hasLogo: false, now: 0 });

  it('guarda o avatar, troca a cor de quem repete e mostra nas visões', () => {
    const room = nova();
    G.join(room, 'p1', 'Ana', 1, 'capivara.bone.escuros.5');
    G.join(room, 'p2', 'Bia', 2, 'capivara.bone.escuros.5');
    G.join(room, 'p3', 'Caio', 3, 'nao-existe');
    expect(room.players.p1.avatar).toBe('capivara.bone.escuros.5');
    expect(room.players.p2.avatar).toBe('capivara.bone.escuros.6');
    expect(room.players.p3.avatar).toBe(AVATAR_PADRAO);
    expect(G.hostView(room, 4).players.map((p) => p.avatar)).toEqual(['capivara.bone.escuros.5', 'capivara.bone.escuros.6', AVATAR_PADRAO]);
    expect(G.playerView(room, 'p2', 4)!.me.avatar).toBe('capivara.bone.escuros.6');
    expect(G.ranking(room)[0].avatar).toBe('capivara.bone.escuros.5');
  });

  it('quem volta para a sala mantém o personagem', () => {
    const room = nova();
    G.join(room, 'p1', 'Ana', 1, 'gato.-.-.2');
    G.join(room, 'p1', 'Ana', 2, 'tatu.-.-.0');
    expect(room.players.p1.avatar).toBe('gato.-.-.2');
  });

  it('sala antiga sem avatar usa o padrão', () => {
    const room = nova();
    G.join(room, 'p1', 'Ana', 1);
    delete room.players.p1.avatar;
    expect(G.ranking(room)[0].avatar).toBe(AVATAR_PADRAO);
  });
});
