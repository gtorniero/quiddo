import { describe, expect, it } from 'vitest';
import { eventoDeOutroAmbiente } from '../worker/stripe-assinatura';

describe('webhook do Stripe: evento de outro ambiente', () => {
  it('ignora evento de teste no site de verdade', () => {
    expect(eventoDeOutroAmbiente('{"livemode":false}', 'ligada')).toBe(true);
    expect(eventoDeOutroAmbiente('{"livemode":true}', 'teste')).toBe(true);
  });
  it('processa evento do mesmo ambiente', () => {
    expect(eventoDeOutroAmbiente('{"livemode":true}', 'ligada')).toBe(false);
    expect(eventoDeOutroAmbiente('{"livemode":false}', 'teste')).toBe(false);
  });
  it('corpo estranho segue para a checagem de assinatura', () => {
    expect(eventoDeOutroAmbiente('nada', 'ligada')).toBe(false);
    expect(eventoDeOutroAmbiente('{}', 'ligada')).toBe(false);
  });
});
