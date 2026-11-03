import { describe, it, expect } from 'vitest';
import { publicPath, campaignQuery, readConsent } from '../src/lib/measurement-policy';

describe('medição protege endereços privados e escolhas', () => {
 it('não transforma sala, conta ou rota desconhecida em página pública', () => {
  for (const path of ['/host/ABCD', '/ABCD', '/conta', '/api/acesso', '/guias/email@exemplo.com']) expect(publicPath(path)).toBeNull();
  expect(publicPath('/precos')).toBe('/precos');
 });
 it('preserva rótulos de campanha, exclui e-mail, token, código e fragmento', () => {
  const out=campaignQuery('?utm_source=instagram&utm_medium=paid_social&utm_campaign=lancamento&ref=segredo&email=ana@exemplo.com&utm_term=ana%40exemplo.com');
  expect(out).toBe('?utm_source=instagram&utm_medium=paid_social&utm_campaign=lancamento');
 });
 it('recusa consentimento inválido, futuro e expirado', () => {
  for (const raw of ['{}','null','invalid',JSON.stringify({version:1,analytics:true,marketing:true,at:2000})]) expect(readConsent(raw,1000)).toBeNull();
  expect(readConsent(JSON.stringify({version:1,analytics:false,marketing:false,at:1000}),1001)?.analytics).toBe(false);
 });
});
