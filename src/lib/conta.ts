// Conta (login sem senha). A sessão é um cookie que o JavaScript não lê; aqui fica só o e-mail de quem
// entrou, para o menu mostrar "Minha conta", e o plano ligado ao e-mail vira o acesso deste navegador.
import { type Acesso, guardaAcesso } from './pagamento';
import { store } from './storage';

export const logado = () => store.get<string>('logado', '');

/** Pergunta ao servidor quem está logado e traz o plano do e-mail para este navegador. */
export async function sincronizaConta(): Promise<{ email: string | null; acesso: Acesso | null }> {
  try {
    const r = await fetch('/api/conta');
    const d = (await r.json()) as { email: string | null; acesso: Acesso | null };
    if (d.email) store.set('logado', d.email);
    else store.del('logado');
    if (d.acesso) guardaAcesso(d.acesso);
    return d;
  } catch {
    return { email: logado() || null, acesso: null };
  }
}

export async function sair() {
  await fetch('/api/sair', { method: 'POST' }).catch(() => {});
  store.del('logado');
}
