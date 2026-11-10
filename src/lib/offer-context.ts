import type { Theme } from '../../shared/protocol';
import type { Plano } from './pagamento';

/** O modelo explícito sempre prevalece. Só a campanha Natal aprovada tem entrada contextual. */
export function entryTemplate(search: string): string | null {
  const q = new URLSearchParams(search);
  if (q.has('modelo')) return q.get('modelo');
  return q.get('utm_source') === 'meta' && q.get('utm_medium') === 'paid_social'
    && q.get('utm_campaign') === 'qd_natal_familia' && q.get('utm_content') === 'ADC-QD-02-v2'
    ? 'natal' : null;
}

/** Sugestão inicial para Amigos & família; não altera preços, acesso ou escolha em /precos. */
export function eventPlan(theme?: Theme): Plano {
  return theme === 'festa' ? 'semana' : 'anual';
}
