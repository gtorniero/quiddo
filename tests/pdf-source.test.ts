import { expect, it } from 'vitest';
import { pdfSource } from '../shared/pdf-source';
import { quizDocument } from '../shared/quiz-document';
import { compactQuestion } from '../shared/rules';

it('bounds source metadata, rejects invalid page references and strips unexpected fields', () => {
  expect(pdfSource({ page: -1, evidence: 'x', answer: 'y' })).toBeUndefined();
  expect(pdfSource({ page: 5001, evidence: 'x', answer: 'y' })).toBeUndefined();
  const source = pdfSource({ page: 50, evidence: 'x'.repeat(501), answer: 'y'.repeat(81), topic: 'z'.repeat(101), hash: 'invalid', unexpected: 'secret' })!;
  expect(source.evidence).toHaveLength(500);
  expect(source.answer).toHaveLength(80);
  expect(source.topic).toHaveLength(100);
  expect(source.hash).toBe('');
  expect(source).not.toHaveProperty('unexpected');
});

it('retains original evidence for editing but excludes it from a public room question', () => {
  const pdf = { page: 3, evidence: 'Documento privado', answer: 'B', topic: 'Treinamento', hash: 'f'.repeat(64) };
  const quiz = quizDocument({ id: 'pdf-roundtrip', titulo: 'Treino', tema: 'corp', tempo: 15, perguntas: [{ t: 'Pergunta revisada', o: ['A','B'], c: 1, pdf }] });
  expect(quiz.perguntas[0].pdf).toEqual(pdf);
  expect(compactQuestion(quiz.perguntas[0])).not.toHaveProperty('pdf');
});
