import { it, expect } from 'vitest';
import { mergeBrowserQuizzes } from '../shared/browser-migration';
import { quizDocument } from '../shared/quiz-document';
const doc = (title: string) => quizDocument({ id: 'same-id', titulo: title, tema: 'festa', tempo: 15, marca: {}, logo: '', perguntas: [] });
it('keeps conflicting local drafts and imports from each origin only once', async () => {
  const original = doc('Official draft'),
    incoming = doc('Old domain draft');
  const first = await mergeBrowserQuizzes([original], [incoming], {}, 'https://quiddo.com.br', incoming.id);
  expect(first.quizzes).toHaveLength(2);
  expect(first.quizzes[0].titulo).toBe('Official draft');
  expect(first.selected).not.toBe(original.id);
  const again = await mergeBrowserQuizzes(first.quizzes, [incoming], first.migrations, 'https://quiddo.com.br', incoming.id);
  expect(again.quizzes).toHaveLength(2);
  expect(again.selected).toBe(first.selected);
  expect(incoming.id).toBe('same-id');
});
it('copies another changed legacy version without replacing the earlier backups', async () => {
  const first = await mergeBrowserQuizzes([], [doc('Earlier')], {}, 'old', 'same-id');
  const next = await mergeBrowserQuizzes(first.quizzes, [doc('Changed')], first.migrations, 'old', 'same-id');
  expect(next.quizzes.map((x) => x.titulo)).toEqual(['Earlier', 'Changed']);
});
import { runInNewContext } from 'node:vm';
import { canonicalResponse } from '../worker/canonical';
it('executes the real transfer response safely and preserves its destination and content', async () => {
  const source = doc('</script><script>not executable</script>');
  const request = new Request('https://www.quiddo.com.br/api/migrar-navegador', {
    method: 'POST',
    headers: { Origin: 'https://quiddo.com.br' },
    body: new URLSearchParams({ dados: JSON.stringify({ quizzes: [source], atual: source.id, volta: '/criar?modelo=natal#perguntas' }) }),
  });
  const response = await canonicalResponse(request, {});
  const html = await response!.text(),
    script = html.match(/<script>([\s\S]*)<\/script>/)![1];
  const map = new Map<string, string>();
  let destination = '';
  const storage = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => map.set(k, v) };
  await runInNewContext(script, {
    crypto,
    TextEncoder,
    Uint8Array,
    structuredClone,
    localStorage: storage,
    location: { replace: (url: string) => (destination = url) },
    document: { getElementById: () => ({ textContent: '' }) },
  });
  expect(destination).toBe('https://www.quiddo.com.br/criar?modelo=natal#perguntas');
  expect(JSON.parse(map.get('sr:quizzes')!)[0].titulo).toContain('not executable');
  expect(html).not.toContain('</script><script>not executable');
  await runInNewContext(script, {
    crypto,
    TextEncoder,
    Uint8Array,
    structuredClone,
    localStorage: storage,
    location: { replace: () => {} },
    document: { getElementById: () => ({ textContent: '' }) },
  });
  expect(JSON.parse(map.get('sr:quizzes')!)).toHaveLength(1);
});

it('retains the origin on the migration form while hiding the path and query', async () => {
  const response = await canonicalResponse(new Request('https://quiddo.com.br/criar?privado=1'), {});
  expect(response!.headers.get('Referrer-Policy')).toBe('strict-origin');
  const html = await response!.text();
  expect(html).toContain('action="https://www.quiddo.com.br/api/migrar-navegador"');
  const transfer = await canonicalResponse(new Request('https://www.quiddo.com.br/api/migrar-navegador', {
    method: 'POST', headers: { Origin: 'null' }, body: new URLSearchParams({dados:JSON.stringify({quizzes:[]})}),
  }), {});
  expect(transfer!.status).toBe(403);
});
