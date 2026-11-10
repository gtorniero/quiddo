import type { QuizDocument } from './quiz-document';
/** Self-contained: also embedded in the transfer response, without loading third-party code. */
export async function mergeBrowserQuizzes(
  current: QuizDocument[],
  incoming: QuizDocument[],
  mappings: Record<string, { hash: string; id: string }>,
  source: string,
  active: string,
) {
  const quizzes = structuredClone(current),
    migrations = { ...mappings };
  let selected = '';
  for (const value of incoming) {
    const quiz = structuredClone(value),
      oldId = quiz.id;
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(quiz)));
    const hash = Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
    const key = source + '/' + oldId,
      previous = migrations[key];
    if (previous?.hash === hash && quizzes.some((x) => x.id === previous.id)) {
      if (oldId === active) selected = previous.id;
      continue;
    }
    const found = quizzes.find((x) => x.id === oldId);
    if (found && JSON.stringify(found) !== JSON.stringify(quiz)) quiz.id = crypto.randomUUID();
    if (!found || quiz.id !== oldId) quizzes.push(quiz);
    migrations[key] = { hash, id: quiz.id };
    if (oldId === active) selected = quiz.id;
  }
  return { quizzes, migrations, selected };
}
