// Mandar o quiz do celular para o computador da TV: o servidor guarda uma cópia por 7 dias (worker/levar.ts)
// e o link /criar?levar=... abre o mesmo quiz no outro aparelho, como um quiz novo.
import { type Quiz, importar } from './quiz';

export interface Levado {
  url: string;
  semImagens: boolean; // o quiz era grande demais com as imagens: foi sem elas
}

/** Mesmo limite do servidor (D1 guarda até 2 MB por linha). */
const LIMITE = 1_800_000;

/** O que vai para o servidor: o quiz, sem os campos que só valem neste navegador. */
function copia(q: Quiz, semImagens: boolean) {
  const { versao: _v, somenteNuvem: _s, quantidade: _q, pendente: _p, conflito: _c, ...resto } = q;
  return {
    ...resto,
    logo: semImagens ? '' : resto.logo,
    perguntas: resto.perguntas.map(({ img, ...p }) => (semImagens || !img ? p : { ...p, img })),
  };
}

export async function mandarParaComputador(q: Quiz): Promise<Levado> {
  let semImagens = false;
  let corpo = JSON.stringify({ quiz: copia(q, false) });
  if (corpo.length > LIMITE) {
    semImagens = true;
    corpo = JSON.stringify({ quiz: copia(q, true) });
  }
  let r: Response;
  try {
    r = await fetch('/api/levar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corpo });
  } catch {
    throw new Error('Sem conexão com a internet. Confira e tente de novo.');
  }
  const d = (await r.json().catch(() => ({}))) as { id?: string; erro?: string };
  if (!r.ok || !d.id) throw new Error(d.erro || 'Não deu para preparar o link agora. Tente de novo.');
  return { url: `${location.origin}/criar?levar=${d.id}`, semImagens };
}

export async function receberDoCelular(id: string): Promise<Quiz> {
  if (!/^[A-Za-z0-9_-]{22}$/.test(id)) throw new Error('Este link não está completo. Mande o quiz de novo pelo celular.');
  let r: Response;
  try {
    r = await fetch('/api/levar/' + id);
  } catch {
    throw new Error('Sem conexão com a internet. Recarregue a página para tentar de novo.');
  }
  const d = (await r.json().catch(() => ({}))) as { quiz?: unknown; erro?: string };
  if (!r.ok || !d.quiz) throw new Error(d.erro || 'Não deu para abrir o quiz do celular.');
  return importar(JSON.stringify(d.quiz));
}

/** Texto da mensagem que leva o link. */
export const textoDoLink = (titulo: string, url: string) => `Abra este link no computador da TV para abrir a sala do quiz “${titulo || 'Meu quiz'}”: ${url} (vale 7 dias)`;
