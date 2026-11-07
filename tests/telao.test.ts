import { describe, expect, it } from 'vitest';
import { chaveDoEndereco, ehCelular, viewportTelao } from '../src/lib/telao';

describe('telão no celular', () => {
  it('reconhece celular pelo lado menor da tela', () => {
    expect(ehCelular(390, 844)).toBe(true);
    expect(ehCelular(844, 390)).toBe(true);
    expect(ehCelular(820, 1180)).toBe(false); // iPad
    expect(ehCelular(1920, 1080)).toBe(false);
  });
  it('só desenha como telão com o celular deitado', () => {
    expect(viewportTelao(true, true)).toBe('width=1280, viewport-fit=cover');
    expect(viewportTelao(true, false)).toContain('device-width');
    expect(viewportTelao(false, true)).toContain('device-width');
  });
  it('lê a chave do anfitrião do endereço', () => {
    const k = '3f2b8c1e-9d4a-4f6b-8a2c-1e5d7f9b0a3c';
    expect(chaveDoEndereco('#k=' + k)).toBe(k);
    expect(chaveDoEndereco('#x=1&k=' + k)).toBe(k);
    expect(chaveDoEndereco('')).toBe('');
    expect(chaveDoEndereco('#k=<script>')).toBe('');
  });
});
