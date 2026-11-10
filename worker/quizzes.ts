import { emailDaSessao, type LoginEnv } from './login';
import { DOCUMENT_LIMIT, QUIZ_ID, quizDocument } from '../shared/quiz-document';
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
const ready = new WeakSet<object>();
export async function quizTables(db: D1Database) {
  if (ready.has(db)) return;
  await db.batch([
    db.prepare(
      'CREATE TABLE IF NOT EXISTS qd_quizzes (owner TEXT NOT NULL,id TEXT NOT NULL,version INTEGER NOT NULL,revision TEXT NOT NULL,title TEXT NOT NULL,theme TEXT NOT NULL,question_count INTEGER NOT NULL,updated INTEGER NOT NULL,payload TEXT NOT NULL,deleted INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(owner,id))',
    ),
    db.prepare(
      'CREATE TABLE IF NOT EXISTS qd_quiz_images (owner TEXT NOT NULL,quiz TEXT NOT NULL,key TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(owner,quiz,key))',
    ),
    db.prepare('CREATE INDEX IF NOT EXISTS qd_quizzes_owner_updated ON qd_quizzes(owner,updated)'),
  ]);
  ready.add(db);
}
export async function rotaQuizzes(req: Request, env: LoginEnv, path: string): Promise<Response | null> {
  if (path !== '/api/quizzes' && !path.startsWith('/api/quizzes/')) return null;
  if (!env.DB) return json({ erro: 'indisponivel' }, 503);
  const owner = await emailDaSessao(req, env);
  if (!owner) return json({ erro: 'login' }, 401);
  if (req.headers.get('X-Quiddo-Conta') && req.headers.get('X-Quiddo-Conta') !== owner) return json({ erro: 'conta_alterada' }, 403);
  if (req.method !== 'GET' && req.headers.get('Origin') !== new URL(req.url).origin) return json({ erro: 'origem' }, 403);
  await quizTables(env.DB);
  const id = path.slice('/api/quizzes/'.length);
  if (path === '/api/quizzes' && req.method === 'GET') {
    const rows = await env.DB.prepare(
      'SELECT id,version,title AS titulo,theme AS tema,question_count AS quantidade,updated AS atualizado FROM qd_quizzes WHERE owner=? AND deleted=0 ORDER BY updated DESC',
    )
      .bind(owner)
      .all();
    return json({ quizzes: rows.results });
  }
  if (!QUIZ_ID.test(id)) return json({ erro: 'id' }, 400);
  if (req.method === 'GET') {
    // One statement reads content and images from the same database snapshot.
    const result = await env.DB.prepare(
      'SELECT q.version,q.payload,i.key,i.data FROM qd_quizzes q LEFT JOIN qd_quiz_images i ON i.owner=q.owner AND i.quiz=q.id WHERE q.owner=? AND q.id=? AND q.deleted=0',
    ).bind(owner, id).all<{ version: number; payload: string; key: string | null; data: string | null }>();
    const row = result.results[0];
    if (!row) return json({ erro: 'nao_encontrado' }, 404);
    const quiz = JSON.parse(row.payload);
    for (const image of result.results) {
      if (image.key === null) continue;
      if (image.key === 'logo') quiz.logo = image.data;
      else if (quiz.perguntas[Number(image.key)]) quiz.perguntas[Number(image.key)].img = image.data;
    }
    return json({ quiz, version: row.version });
  }
  const version = Number(req.headers.get('If-Match'));
  if (!req.headers.has('If-Match') || !Number.isSafeInteger(version) || version < 0) return json({ erro: 'versao' }, 428);
  const revision = crypto.randomUUID(),
    now = Date.now();
  if (req.method === 'DELETE') {
    const result = await env.DB.batch([
      env.DB.prepare(
        'UPDATE qd_quizzes SET deleted=1,version=version+1,revision=?,updated=? WHERE owner=? AND id=? AND version=? AND deleted=0',
      ).bind(revision, now, owner, id, version),
      env.DB.prepare(
        'DELETE FROM qd_quiz_images WHERE owner=? AND quiz=? AND EXISTS(SELECT 1 FROM qd_quizzes WHERE owner=? AND id=? AND revision=?)',
      ).bind(owner, id, owner, id, revision),
    ]);
    return result[0].meta.changes ? json({ ok: true }) : json({ erro: 'conflito' }, 409);
  }
  if (req.method !== 'PUT') return json({ erro: 'metodo' }, 405);
  if (Number(req.headers.get('Content-Length')) > DOCUMENT_LIMIT) return json({ erro: 'tamanho' }, 413);
  let quiz;
  try {
    const text = await req.text();
    if (text.length > DOCUMENT_LIMIT) return json({ erro: 'tamanho' }, 413);
    quiz = quizDocument(JSON.parse(text));
  } catch (e) {
    return json({ erro: e instanceof Error ? e.message : 'Quiz inválido.' }, 400);
  }
  if (quiz.id !== id) return json({ erro: 'id' }, 400);
  const images: { key: string; data: string }[] = [];
  if (quiz.logo) images.push({ key: 'logo', data: quiz.logo });
  quiz.logo = '';
  quiz.perguntas.forEach((p, i) => {
    if (p.img) images.push({ key: String(i), data: p.img });
    delete p.img;
  });
  quiz.atualizado = now;
  const mutation =
    version === 0
      ? env.DB.prepare(
          'INSERT OR IGNORE INTO qd_quizzes(owner,id,version,revision,title,theme,question_count,updated,payload) VALUES(?,?,1,?,?,?,?,?,?)',
        ).bind(owner, id, revision, quiz.titulo, quiz.tema, quiz.perguntas.length, now, JSON.stringify(quiz))
      : env.DB.prepare(
          'UPDATE qd_quizzes SET version=version+1,revision=?,title=?,theme=?,question_count=?,updated=?,payload=? WHERE owner=? AND id=? AND version=? AND deleted=0',
        ).bind(revision, quiz.titulo, quiz.tema, quiz.perguntas.length, now, JSON.stringify(quiz), owner, id, version);
  const result = await env.DB.batch([
    mutation,
    env.DB.prepare(
      'DELETE FROM qd_quiz_images WHERE owner=? AND quiz=? AND EXISTS(SELECT 1 FROM qd_quizzes WHERE owner=? AND id=? AND revision=?)',
    ).bind(owner, id, owner, id, revision),
    ...images.map((image) =>
      env
        .DB!.prepare(
          'INSERT INTO qd_quiz_images(owner,quiz,key,data) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM qd_quizzes WHERE owner=? AND id=? AND revision=?)',
        )
        .bind(owner, id, image.key, image.data, owner, id, revision),
    ),
  ]);
  if (!result[0].meta.changes) return json({ erro: 'conflito' }, 409);
  return json({ ok: true, version: version + 1, atualizado: now });
}
