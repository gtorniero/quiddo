// Contador de uso por dia (UTC, quando as cotas da Cloudflare zeram): salas abertas, jogos começados,
// jogadores nesses jogos e a maior sala. Serve para saber quando o plano grátis está chegando no limite.
// GET /api/uso mostra os últimos 14 dias. Só números agregados, nada de nomes.
import type { CobrancaEnv } from './cobranca';

/** Plano grátis: cerca de 13.000 GB-s por dia de Durable Objects ≈ 100 jogos de 15 minutos. Avisamos aos 70%. */
export const JOGOS_DIA_GRATIS = 100;
const ALERTA = 0.7;

const hoje = () => new Date().toISOString().slice(0, 10);

let pronta = false;
async function tabela(db: D1Database) {
  if (pronta) return;
  await db.prepare('CREATE TABLE IF NOT EXISTS uso (dia TEXT PRIMARY KEY, salas INTEGER DEFAULT 0, jogos INTEGER DEFAULT 0, jogadores INTEGER DEFAULT 0, maior INTEGER DEFAULT 0)').run();
  pronta = true;
}

/** Soma no dia de hoje. Nunca derruba o jogo: se o banco falhar, só não conta. */
export async function anotaUso(env: CobrancaEnv, o: { salas?: number; jogos?: number; jogadores?: number }) {
  if (!env.DB) return;
  try {
    await tabela(env.DB);
    const j = o.jogadores || 0;
    await env.DB.prepare(
      'INSERT INTO uso (dia, salas, jogos, jogadores, maior) VALUES (?, ?, ?, ?, ?) ON CONFLICT(dia) DO UPDATE SET salas = salas + excluded.salas, jogos = jogos + excluded.jogos, jogadores = jogadores + excluded.jogadores, maior = MAX(maior, excluded.maior)',
    )
      .bind(hoje(), o.salas || 0, o.jogos || 0, j, j)
      .run();
  } catch {}
}

export async function rotaUso(env: CobrancaEnv): Promise<Response> {
  const dias: { dia: string; salas: number; jogos: number; jogadores: number; maior: number }[] = [];
  if (env.DB) {
    try {
      await tabela(env.DB);
      const r = await env.DB.prepare('SELECT dia, salas, jogos, jogadores, maior FROM uso ORDER BY dia DESC LIMIT 14').all<(typeof dias)[number]>();
      dias.push(...(r.results || []));
    } catch {}
  }
  const pico = Math.max(0, ...dias.map((d) => d.jogos));
  return new Response(
    JSON.stringify({ jogosDiaGratis: JOGOS_DIA_GRATIS, picoJogosDia: pico, alerta: pico >= JOGOS_DIA_GRATIS * ALERTA, dias }),
    { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } },
  );
}
