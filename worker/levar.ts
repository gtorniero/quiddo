// Mandar o quiz do celular para o computador da TV, sem conta.
//   POST /api/levar        { quiz }   guarda uma cópia por 7 dias e devolve { id, expira }
//   GET  /api/levar/{id}               devolve a cópia (o computador importa como um quiz novo)
// O id é aleatório e longo (não dá para adivinhar). Fica só o quiz: nada de e-mail, nome ou endereço de internet.
// A cópia some sozinha depois de 7 dias. Limite de 30 envios por hora por endereço de internet (guardado só como hash do dia).
import { quizDocument } from '../shared/quiz-document';

export interface LevarEnv {
  DB?: D1Database;
}

/** Cópia vale 7 dias. */
export const LEVAR_DIAS = 7;
/** D1 guarda até 2 MB por linha: acima disso, o site manda sem as imagens. */
export const LEVAR_LIMITE = 1_800_000;
const POR_HORA = 30;
export const LEVAR_ID = /^[A-Za-z0-9_-]{22}$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

const prontas = new WeakSet<D1Database>();
async function tabela(db: D1Database) {
  if (prontas.has(db)) return;
  await db.prepare('CREATE TABLE IF NOT EXISTS qd_levar (id TEXT PRIMARY KEY, criado INTEGER NOT NULL, origem TEXT NOT NULL, payload TEXT NOT NULL)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS qd_levar_origem ON qd_levar(origem, criado)').run();
  prontas.add(db);
}

const base64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const novoId = () => base64url(crypto.getRandomValues(new Uint8Array(16)));

/** Hash do endereço de internet com o dia: serve só para o limite por hora e muda todo dia. */
async function origemDe(req: Request): Promise<string> {
  const ip = req.headers.get('CF-Connecting-IP') || 'local';
  const dia = new Date().toISOString().slice(0, 10);
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('quiddo:levar:' + dia + ':' + ip));
  return base64url(new Uint8Array(h)).slice(0, 22);
}

export async function rotaLevar(req: Request, env: LevarEnv, path: string, agora = Date.now()): Promise<Response | null> {
  if (path !== '/api/levar' && !path.startsWith('/api/levar/')) return null;
  if (!env.DB) return json({ erro: 'Indisponível agora. Tente de novo.' }, 503);
  await tabela(env.DB);
  const validade = LEVAR_DIAS * 86400e3;
  if (path === '/api/levar' && req.method === 'POST') {
    if (req.headers.get('Origin') !== new URL(req.url).origin) return json({ erro: 'origem' }, 403);
    const texto = await req.text();
    if (texto.length > LEVAR_LIMITE) return json({ erro: 'O quiz ficou grande demais para mandar. Tire algumas imagens e tente de novo.' }, 413);
    let quiz;
    try {
      const corpo = JSON.parse(texto) as { quiz?: unknown };
      quiz = quizDocument(corpo.quiz);
    } catch (e) {
      return json({ erro: e instanceof Error ? e.message : 'Quiz inválido.' }, 400);
    }
    const origem = await origemDe(req);
    // limpa as cópias vencidas e confere o limite por hora
    await env.DB.prepare('DELETE FROM qd_levar WHERE criado < ?').bind(agora - validade).run();
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM qd_levar WHERE origem = ? AND criado > ?').bind(origem, agora - 3600e3).first<{ n: number }>();
    if ((n?.n || 0) >= POR_HORA) return json({ erro: 'Muitos envios seguidos. Espere um pouco e tente de novo.' }, 429);
    const id = novoId();
    await env.DB.prepare('INSERT INTO qd_levar (id, criado, origem, payload) VALUES (?, ?, ?, ?)').bind(id, agora, origem, JSON.stringify(quiz)).run();
    return json({ id, expira: new Date(agora + validade).toISOString() });
  }
  const id = path.slice('/api/levar/'.length);
  if (req.method === 'GET' && LEVAR_ID.test(id)) {
    const r = await env.DB.prepare('SELECT criado, payload FROM qd_levar WHERE id = ?').bind(id).first<{ criado: number; payload: string }>();
    if (!r || r.criado < agora - validade) return json({ erro: 'Este link venceu ou não existe. Mande o quiz de novo pelo celular.' }, 404);
    return json({ quiz: JSON.parse(r.payload) });
  }
  return json({ erro: 'Não encontrado.' }, 404);
}
