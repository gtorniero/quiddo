// Medição da jornada (14/11/2026): tráfego da equipe, motivo do erro ao entrar na sala, links que o jogo espalha
// e as categorias novas aceitas pelo iframe da medição.
import { describe, expect, it } from 'vitest';
import vendor from '../public/medicao-vendor.js?raw';
import { campaignOrigin, campaignQuery, categoriaErroEntrada, interno, pedidoInterno } from '../src/lib/measurement-policy';

describe('tráfego interno (equipe)', () => {
  it('lê o cookie btw_interno=1 e nada parecido', () => {
    expect(interno('btw_interno=1')).toBe(true);
    expect(interno('_ga=GA1; btw_interno=1; x=2')).toBe(true);
    expect(interno('btw_interno=0')).toBe(false);
    expect(interno('btw_interno=10')).toBe(false);
    expect(interno('xbtw_interno=1')).toBe(false);
    expect(interno('')).toBe(false);
  });
  it('?btw_interno=1 grava, ?btw_interno=0 apaga, o resto não mexe', () => {
    expect(pedidoInterno('?btw_interno=1')).toBe('ligar');
    expect(pedidoInterno('?utm_source=x&btw_interno=0')).toBe('desligar');
    expect(pedidoInterno('?btw_interno=sim')).toBeNull();
    expect(pedidoInterno('')).toBeNull();
  });
});

describe('erro ao entrar na sala', () => {
  it('vira uma categoria fixa, nunca o código da sala', () => {
    expect(['not_found', 'started', 'full', 'cheia_gratis', 'kicked', 'pausada', 'inativa', 'closed', 'bad_nick', 'connection', 'ABCD'].map(categoriaErroEntrada)).toEqual([
      'room_not_found',
      'game_started',
      'room_full',
      'room_full',
      'removed',
      'room_paused',
      'room_paused',
      'room_closed',
      'invalid_nick',
      'connection',
      'unknown',
    ]);
  });
});

describe('links que o jogo espalha', () => {
  it('?de=cartao e ?de=jogador viram etiquetas fixas; UTM de anúncio vence', () => {
    expect(campaignQuery('?de=cartao')).toBe('?utm_source=quiddo&utm_medium=cartao&utm_campaign=jogo');
    expect(campaignQuery('?de=jogador')).toBe('?utm_source=quiddo&utm_medium=jogador&utm_campaign=jogo');
    expect(campaignQuery('?de=outro')).toBe('');
    expect(campaignQuery('?de=cartao&utm_source=meta')).toBe('?utm_source=meta');
    expect(campaignOrigin('?de=cartao')).toBe('utm_source=quiddo&utm_medium=cartao&utm_campaign=jogo');
  });
});

describe('iframe da medição', () => {
  function carregar() {
    const handlers: Record<string, (e: unknown) => void> = {};
    const parent = { postMessage: () => {} };
    const win: Record<string, any> = { addEventListener: (n: string, f: (e: unknown) => void) => (handlers[n] = f) };
    const location = { origin: 'https://www.quiddo.com.br', hostname: 'www.quiddo.com.br' };
    const document = { head: { appendChild: () => {} }, createElement: () => ({}) };
    new Function('window', 'parent', 'location', 'document', vendor)(win, parent, location, document);
    const send = (data: unknown) => handlers.message({ origin: location.origin, source: parent, data });
    send({ type: 'qd_init', analytics: true, marketing: false, productUsageMeasurement: true });
    return { send, ga: (): any[][] => (win.dataLayer || []).map((x: IArguments) => Array.from(x)) };
  }
  it('aceita as categorias novas de erro ao entrar e o papel de quem joga', () => {
    const x = carregar();
    for (const cat of ['room_not_found', 'game_started', 'room_full', 'removed', 'room_paused', 'room_closed', 'invalid_nick', 'connection']) {
      x.send({ type: 'qd_measure', event: 'join_room_error', path: '/partida/jogador', id: 1, params: { role: 'player', error_category: cat } });
      const l = x.ga();
      const ev = l[l.length - 1];
      expect(ev[1]).toBe('join_room_error');
      expect(ev[2]).toMatchObject({ role: 'player', error_category: cat });
    }
  });
  it('categoria desconhecida não passa', () => {
    const x = carregar();
    x.send({ type: 'qd_measure', event: 'join_room_error', path: '/partida/jogador', id: 1, params: { role: 'player', error_category: 'ABCD' } });
    const l = x.ga();
    expect(l[l.length - 1][2].error_category).toBeUndefined();
  });
});
