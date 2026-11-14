// Contador de uso por dia (UTC, quando as cotas da Cloudflare zeram): salas abertas, jogos começados,
// jogadores nesses jogos e a maior sala. Serve para saber quando o plano grátis está chegando no limite
// e se os jogos foram de verdade (ensaio, turma, concluídos, tamanho, salas paradas, entradas recusadas).
// GET /api/uso mostra os últimos 14 dias. Só números agregados, nada de nomes, códigos ou apelidos.
import type { CobrancaEnv } from './cobranca';

/** Plano grátis: cerca de 13.000 GB-s por dia de Durable Objects ≈ 100 jogos de 15 minutos. Avisamos aos 70%. */
export const JOGOS_DIA_GRATIS = 100;
const ALERTA = 0.7;

/**
 * Contadores novos (14/11/2026). Todos somam por dia; nenhum guarda quem jogou.
 * - ensaios: jogos de ensaio com os bichos de teste (não entram em `jogos`)
 * - jogos_com_turma: jogos começados com 3 pessoas ou mais
 * - jogos_concluidos: jogos (sem ensaio) que chegaram ao pódio
 * - tamanho_*: jogos começados por faixa de pessoas (0, 1, 2 a 4, 5 a 10, 11 ou mais)
 * - fechadas_por_inatividade: salas que pausaram depois de 20 minutos paradas e sem a tela do anfitrião
 * - reabertas: salas pausadas que o anfitrião reabriu com o mesmo código
 * - entradas_recusadas: tentativas de entrar que deram erro; recusa_* separa o motivo
 * - sala_cheia: salas grátis que encheram (alguém ficou esperando vaga), uma vez por sala
 * - oferta_paga: salas liberadas pela oferta da sala cheia; liberadas: todas as liberações com a sala aberta
 * - internas: salas abertas pela equipe (?btw_interno=1), que ficam fora de todos os outros contadores
 */
export const CONTADORES = [
  'salas',
  'jogos',
  'jogadores',
  'ensaios',
  'jogos_com_turma',
  'jogos_concluidos',
  'tamanho_0',
  'tamanho_1',
  'tamanho_2a4',
  'tamanho_5a10',
  'tamanho_11mais',
  'fechadas_por_inatividade',
  'reabertas',
  'entradas_recusadas',
  'recusa_nao_encontrada',
  'recusa_comecou',
  'recusa_cheia',
  'recusa_pausada',
  'recusa_removido',
  'sala_cheia',
  'oferta_paga',
  'liberadas',
  'internas',
] as const;
export type Contador = (typeof CONTADORES)[number];
type Linha = { dia: string; maior: number } & Partial<Record<Contador, number>>;

const NOVOS = CONTADORES.filter((c) => !['salas', 'jogos', 'jogadores'].includes(c));
const hoje = () => new Date().toISOString().slice(0, 10);

const prontas = new WeakSet<D1Database>();
async function tabela(db: D1Database) {
  if (prontas.has(db)) return;
  await db.prepare('CREATE TABLE IF NOT EXISTS uso (dia TEXT PRIMARY KEY, salas INTEGER DEFAULT 0, jogos INTEGER DEFAULT 0, jogadores INTEGER DEFAULT 0, maior INTEGER DEFAULT 0)').run();
  // colunas novas: em bancos antigos, acrescenta (se já existe, dá erro e segue)
  const r = await db.prepare('PRAGMA table_info(uso)').all<{ name: string }>();
  const tem = new Set((r.results || []).map((c) => c.name));
  for (const c of NOVOS) if (!tem.has(c)) await db.prepare(`ALTER TABLE uso ADD COLUMN ${c} INTEGER DEFAULT 0`).run().catch(() => {});
  prontas.add(db);
}

/** Soma no dia de hoje. Nunca derruba o jogo: se o banco falhar, só não conta. `maior` guarda a maior sala. */
export async function anotaUso(env: CobrancaEnv, o: Partial<Record<Contador, number>> & { maior?: number }) {
  if (!env.DB) return;
  const campos = CONTADORES.filter((c) => Number.isFinite(o[c]) && o[c]! > 0);
  const maior = Math.max(0, Number(o.maior ?? o.jogadores ?? 0) || 0);
  if (!campos.length && !maior) return;
  try {
    await tabela(env.DB);
    const cols = ['dia', ...campos, 'maior'];
    const set = [...campos.map((c) => `${c} = ${c} + excluded.${c}`), 'maior = MAX(maior, excluded.maior)'].join(', ');
    await env.DB.prepare(`INSERT INTO uso (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')}) ON CONFLICT(dia) DO UPDATE SET ${set}`)
      .bind(hoje(), ...campos.map((c) => Math.round(o[c]!)), maior)
      .run();
  } catch {}
}

export async function rotaUso(env: CobrancaEnv): Promise<Response> {
  const dias: Linha[] = [];
  if (env.DB) {
    try {
      await tabela(env.DB);
      const r = await env.DB.prepare(`SELECT dia, maior, ${CONTADORES.join(', ')} FROM uso ORDER BY dia DESC LIMIT 14`).all<Linha>();
      dias.push(...(r.results || []).map((d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, k === 'dia' ? v : Number(v) || 0])) as Linha));
    } catch {}
  }
  const pico = Math.max(0, ...dias.map((d) => d.jogos || 0));
  return new Response(JSON.stringify({ jogosDiaGratis: JOGOS_DIA_GRATIS, picoJogosDia: pico, alerta: pico >= JOGOS_DIA_GRATIS * ALERTA, dias }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
