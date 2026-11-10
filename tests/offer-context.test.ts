import { describe, it, expect } from 'vitest';
import { entryTemplate, eventPlan } from '../src/lib/offer-context';

const natal = '?utm_source=meta&utm_medium=paid_social&utm_campaign=qd_natal_familia&utm_content=ADC-QD-02-v2';
describe('entrada e plano para o evento', () => {
  it('abre Natal somente na campanha aprovada, sem depender de login', () => {
    expect(entryTemplate(natal)).toBe('natal');
    expect(entryTemplate(natal + '&fbclid=opaque')).toBe('natal');
    expect(entryTemplate('')).toBeNull();
    expect(entryTemplate('?utm_source=google&utm_medium=cpc&utm_campaign=qd_eventos_15dia_v1')).toBeNull();
    for (const text of ['meta', 'paid_social', 'qd_natal_familia', 'ADC-QD-02-v2'])
      expect(entryTemplate(natal.replace(text, 'another'))).toBeNull();
  });
  it('respeita o modelo explícito e não troca um modelo desconhecido por Natal', () => {
    expect(entryTemplate('?modelo=natal')).toBe('natal');
    expect(entryTemplate(natal + '&modelo=carnaval')).toBe('carnaval');
    expect(entryTemplate(natal + '&modelo=')).toBe('');
  });
  it('sugere semana para festa e preserva os padrões corporativo e escola', () => {
    expect(eventPlan('festa')).toBe('semana');
    expect(eventPlan('corp')).toBe('anual');
    expect(eventPlan('escola')).toBe('anual');
    expect(eventPlan()).toBe('anual');
  });
});
