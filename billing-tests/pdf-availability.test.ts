import { expect, it, vi } from 'vitest';
vi.mock('../worker/login', () => ({ emailDaSessao: async () => 'Owner@example.invalid', loginSimulado: () => false }));
import { pdfRoute } from '../worker/pdf-quiz/route.mjs';

it('preserves credits when production has no provider or no spending allowance', async () => {
  for (const settings of [{}, {OPENAI_API_KEY: 'fixture'}, {PDF_BUDGET_USD: '1'}]) {
    const fetch = vi.fn();
    const result = await pdfRoute(new Request('https://quiddo.com.br/api/pdf/generate', {method:'POST', headers:{origin:'https://quiddo.com.br'}}), {
      PDF_ENABLED:'true', ...settings, PDF_ACCOUNTS:{get: () => ({fetch}), idFromName:()=> 'account'},
    });
    expect(result.status).toBe(503);
    expect((await result.json()).code).toBe('provider_unavailable');
    expect(fetch).not.toHaveBeenCalled();
  }
});

it('never exposes staging helpers in production', async () => {
  const result = await pdfRoute(new Request('https://quiddo.com.br/__staging/settings'), {PDF_ENABLED:'true'});
  expect(result.status).toBe(404);
});

it('routes to the authenticated owner and strips caller credentials', async () => {
  let forwarded: Request | undefined;
  const fetch = vi.fn(async (request: Request) => { forwarded=request; return new Response('{}'); });
  const result = await pdfRoute(new Request('https://quiddo.com.br/api/pdf/status', {headers:{'x-qd-pdf-owner':'other@example.invalid',cookie:'session=fixture',authorization:'fixture'}}), {
    PDF_ENABLED:'true', OPENAI_API_KEY:'fixture', PDF_BUDGET_USD:'1', PDF_ACCOUNTS:{get:()=>({fetch}), idFromName:(value: string)=>value},
  });
  expect(result.status).toBe(200);
  expect(forwarded!.headers.get('x-qd-pdf-owner')).toBe('owner@example.invalid');
  expect(forwarded!.headers.has('cookie')).toBe(false);
  expect(forwarded!.headers.has('authorization')).toBe(false);
});
