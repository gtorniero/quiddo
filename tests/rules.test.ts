import { describe, expect, it } from 'vitest';
import { CODE_RE, compactQuestion, normalizeCode, points, randomCode, validateCreate } from '../shared/rules';

describe('pontos', () => {
  it('vale 1000 na hora e 500 no último instante', () => {
    expect(points(0, 20)).toBe(1000);
    expect(points(20_000, 20)).toBe(500);
  });
  it('cai em linha reta com o tempo', () => {
    expect(points(10_000, 20)).toBe(750);
    expect(points(5_000, 10)).toBe(750);
    expect(points(3_200, 20)).toBe(920);
  });
  it('nunca passa dos limites', () => {
    expect(points(99_000, 10)).toBe(500);
    expect(points(-50, 10)).toBe(1000);
  });
});

describe('códigos de sala', () => {
  it('não usam 0, O, 1 nem I', () => {
    for (let i = 0; i < 500; i++) {
      const c = randomCode();
      expect(c).toMatch(CODE_RE);
      expect(c).not.toMatch(/[0O1I]/);
    }
  });
  it('normaliza o que a pessoa digita', () => {
    expect(normalizeCode(' kx-7q ')).toBe('KX7Q');
  });
});

describe('perguntas', () => {
  it('tira respostas vazias e acerta o índice da certa', () => {
    expect(compactQuestion({ t: 'Q?', o: ['', 'a', '', 'b'], c: 3, tl: 10 })).toEqual({ t: 'Q?', o: ['a', 'b'], c: 1, tl: 10 });
  });
  it('recusa pergunta com a certa vazia', () => {
    expect(compactQuestion({ t: 'Q?', o: ['a', 'b', '', ''], c: 2, tl: 10 })).toBeNull();
  });
  it('valida o pedido de abrir sala', () => {
    const r = validateCreate({ theme: 'x', questions: [{ t: ' Oi ', o: ['1', '2'], c: 1, tl: 7 }], brand: { name: 'A', color: 'red' }, logo: '' });
    expect(r.theme).toBe('corp');
    expect(r.questions[0]).toEqual({ t: 'Oi', o: ['1', '2'], c: 1, tl: 20 });
    expect(r.brand.color).toBe('');
    const escola = validateCreate({ theme: 'escola', questions: [{ t: 'a', o: ['1', '2'], c: 0, tl: 10 }], brand: { name: 'Escola X', color: '#123456' }, logo: '' });
    expect(escola.theme).toBe('escola');
    expect(escola.brand).toEqual({ name: 'Escola X', color: '#123456' });
    const festa = validateCreate({ theme: 'festa', questions: [{ t: 'a', o: ['1', '2'], c: 0, tl: 10 }], brand: { name: 'Bia', color: '#123456' }, logo: 'data:image/png;base64,AAAA' });
    expect(festa.brand).toEqual({ name: '', color: '' });
    expect(festa.logo).toBe('');
    expect(() => validateCreate({ questions: [] })).toThrow();
  });
  it('aceita imagem válida na pergunta e descarta o que não é imagem', () => {
    const img = 'data:image/jpeg;base64,' + 'A'.repeat(1000);
    const r = validateCreate({
      questions: [
        { t: 'Com foto', o: ['1', '2'], c: 0, tl: 10, img },
        { t: 'Sem foto', o: ['1', '2'], c: 0, tl: 10, img: 'javascript:alert(1)' },
        { t: 'Foto grande', o: ['1', '2'], c: 0, tl: 10, img: 'data:image/jpeg;base64,' + 'A'.repeat(300_000) },
      ],
    });
    expect(r.questions[0].img).toBe(img);
    expect(r.questions[1].img).toBeUndefined();
    expect(r.questions[2].img).toBeUndefined();
  });
  it('recusa quiz com imagens demais', () => {
    const img = 'data:image/jpeg;base64,' + 'A'.repeat(250_000);
    const questions = Array.from({ length: 40 }, () => ({ t: 'Q', o: ['1', '2'], c: 0, tl: 10, img }));
    expect(() => validateCreate({ questions })).toThrow(/Imagens demais/);
    expect(() => validateCreate({ questions: [{ t: 'a', o: ['1', '2'], c: 0, tl: 10 }], logo: 'javascript:1' })).toThrow();
  });
});
