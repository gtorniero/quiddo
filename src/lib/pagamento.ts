// Pagamento no site, no mesmo modelo do Retrozap: Pix (Mercado Pago) ou cartão, Apple Pay e Google Pay
// (Stripe Checkout). Planos: Mensal (30 dias) e Passe 7 dias, os dois com salas de até 200 pessoas e jogos
// ilimitados. Quem paga recebe um código QD-XXXX-XXXX, guardado neste navegador, que também vale em outro
// aparelho até o fim do plano. A sala grátis vai até 10.
import { esc } from './dom';
import { qrSvg } from './qr';
import { store } from './storage';
import { logado } from './conta';

export type Plano = 'mensal' | 'semana';

export interface Cobranca {
  modo: 'ligada' | 'simulacao' | 'teste' | 'desligada';
  pix: boolean;
  pixSimulado: boolean;
  cartao: boolean;
  cartaoTeste: boolean;
  planos: { id: Plano; nome: string; dias: number; preco: string }[];
  gratis: number;
  pago: number;
}

/** Resposta do servidor quando o código vale. `expira` em ISO (vazio = sem prazo, como os códigos de cortesia). */
export interface Acesso {
  codigo: string;
  plano?: Plano;
  expira?: string;
}

let pedido: Promise<Cobranca | null> | null = null;

/** Configuração da cobrança (uma vez por página). */
export function cobranca(): Promise<Cobranca | null> {
  if (!pedido)
    pedido = fetch('/api/cobranca')
      .then((r) => (r.ok ? (r.json() as Promise<Cobranca>) : null))
      .catch(() => null);
  return pedido;
}

/** Modo teste: ?teste_cobranca=1 na URL liga a cobrança nesta aba. */
export function testeCobranca(): boolean {
  try {
    if (new URLSearchParams(location.search).get('teste_cobranca') === '1') sessionStorage.setItem('qd_teste_cobranca', '1');
    return sessionStorage.getItem('qd_teste_cobranca') === '1';
  } catch {
    return false;
  }
}

/** A cobrança vale aqui? (ligada, simulação, ou teste com ?teste_cobranca=1, e com algum meio de pagamento pronto) */
export const cobrancaValendo = (c: Cobranca | null) =>
  !!c && (c.modo === 'ligada' || c.modo === 'simulacao' || (c.modo === 'teste' && testeCobranca())) && (c.pix || c.cartao);

/** Código deste navegador, se o plano ainda não venceu. */
export function meuAcesso(): string {
  const ate = store.get<string>('acessoAte', '');
  if (ate && Date.parse(ate) <= Date.now()) return '';
  return store.get<string>('acesso', '');
}
/** Até quando vale o plano deste navegador, em "dd/mm" (vazio se não tem prazo). */
export function acessoAte(): string {
  const ate = store.get<string>('acessoAte', '');
  return ate ? new Date(ate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
}
export function guardaAcesso(a: Acesso) {
  store.set('acesso', a.codigo);
  store.set('acessoAte', a.expira || '');
}

async function post<T>(url: string, corpo: unknown): Promise<T | null> {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
    return (await r.json().catch(() => null)) as T | null;
  } catch {
    return null;
  }
}

/** Volta do Stripe (?pagamento=ok&ref=...): confere o pagamento, guarda o código e limpa a URL. */
export async function confereVolta(aoPagar: (codigo: string) => void): Promise<'ok' | 'volta' | ''> {
  const p = new URLSearchParams(location.search);
  const st = p.get('pagamento');
  if (!st) return '';
  history.replaceState(null, '', location.pathname);
  if (st !== 'ok') return 'volta';
  const ref = p.get('ref') || '';
  for (let i = 0; i < 10 && ref; i++) {
    const r = await post<{ pago: boolean } & Partial<Acesso>>('/api/pix/status', { ref });
    if (r?.pago && r.codigo) {
      guardaAcesso(r as Acesso);
      aoPagar(r.codigo);
      return 'ok';
    }
    await new Promise((ok) => setTimeout(ok, 2000));
  }
  return 'volta';
}

const ICONE_PIX =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2.5 9.2 5.3 12 8.1l2.8-2.8L12 2.5Zm-5.6 5.6L3.6 10.9a1.6 1.6 0 0 0 0 2.2l2.8 2.8 2.8-2.8a1.6 1.6 0 0 0 0-2.2L6.4 8.1Zm11.2 0-2.8 2.8a1.6 1.6 0 0 0 0 2.2l2.8 2.8 2.8-2.8a1.6 1.6 0 0 0 0-2.2l-2.8-2.8ZM12 15.9l-2.8 2.8L12 21.5l2.8-2.8-2.8-2.8Z"/></svg>';

/**
 * Abre a janela de pagamento. `volta` é a página para onde o cartão retorna (ex.: "/criar").
 * `aoPagar` recebe o código quando o pagamento é confirmado (ou quando a pessoa usa um código que já tem).
 * `plano` já deixa um plano marcado (a página de preços manda o que a pessoa clicou).
 */
export async function abrirPagamento(volta: string, aoPagar: (codigo: string) => void, plano: Plano = 'mensal') {
  const c = await cobranca();
  let escolhido: Plano = plano;
  const precoDe = (p: Plano) => c?.planos.find((x) => x.id === p)?.preco || '';
  document.getElementById('pagamento')?.remove();
  const d = document.createElement('dialog');
  d.id = 'pagamento';
  d.className = 'pagamento';
  d.setAttribute('aria-labelledby', 'pg-t');
  document.body.appendChild(d);
  let espera = 0;
  const fecha = () => {
    clearInterval(espera);
    d.close();
    d.remove();
  };
  d.addEventListener('close', () => {
    clearInterval(espera);
    d.remove();
  });

  const rodape = `<p class="pg-legal">O Mensal vale 30 dias e o Passe, 7 dias, a partir do pagamento, neste navegador e, com o seu código, em qualquer aparelho. Desistiu? Devolvemos em até 7 dias. Vendido por Beyond the Work · CNPJ 69.746.447/0001-00.</p>`;
  const fechar = `<button type="button" class="pg-x" data-pg="fechar" aria-label="Fechar">×</button>`;

  const inicio = (erro = '') => {
    if (!c || !(c.pix || c.cartao)) {
      d.innerHTML = `${fechar}<h2 id="pg-t">Pagamento indisponível</h2><p class="muted">O pagamento ainda não está ligado neste site. Tente mais tarde.</p>`;
      return;
    }
    const opcoes = c.planos
      .map(
        (p) => `<label class="pg-plano${p.id === 'mensal' ? ' melhor' : ''}"><input type="radio" name="pg-plano" value="${p.id}"${p.id === escolhido ? ' checked' : ''}>
          <span class="pg-plano-nome">${esc(p.nome)}</span>
          <span class="pg-plano-preco">R$ ${esc(p.preco)}${p.id === 'mensal' ? '<small>/mês</small>' : ''}</span>
          <span class="pg-plano-txt">${p.id === 'mensal' ? '<small class="pg-vantagem">mais vantagem</small> Jogos ilimitados o mês todo.' : 'Para um evento: jogos ilimitados por 7 dias.'}</span></label>`,
      )
      .join('');
    d.innerHTML = `${fechar}<span class="selo">Quiddo liberado</span><h2 id="pg-t">Salas com até ${c.pago} pessoas</h2>
      <p class="muted">A sala grátis vai até ${c.gratis} pessoas. Liberado, até ${c.pago}, quantos jogos quiser.</p>
      <form class="pg-form" data-pg-form novalidate>
        <fieldset class="pg-planos"><legend>Escolha o plano</legend>${opcoes}</fieldset>
        ${
          logado()
            ? `<p class="small">O plano fica na sua conta, <b>${esc(logado())}</b>, e vale em qualquer aparelho em que você entrar.</p><input type="hidden" id="pg-email" value="${esc(logado())}">`
            : `<label for="pg-email">Seu e-mail<input type="email" id="pg-email" autocomplete="email" placeholder="voce@email.com" required></label>
        <p class="small">O plano fica ligado a este e-mail: entre com ele em outro aparelho. Não mandamos propaganda.</p>`
        }
        <p class="err" role="alert">${esc(erro)}</p>
        ${c.pix ? `<button type="submit" class="btn pg-pix" data-meio="pix">${ICONE_PIX}<span>Pagar com Pix · R$ <span data-preco>${esc(precoDe(escolhido))}</span></span></button>` : ''}
        ${c.cartao ? `<button type="submit" class="btn sec pg-cartao" data-meio="cartao"><span>Cartão, Apple Pay ou Google Pay · R$ <span data-preco>${esc(precoDe(escolhido))}</span></span></button>` : ''}
      </form>
      <button type="button" class="linkbtn" data-pg="codigo">Já paguei, tenho um código</button>
      ${c.modo === 'teste' || c.modo === 'simulacao' ? `<p class="pg-teste">${c.modo === 'simulacao' ? 'Simulação' : 'Modo de teste'}${c.pixSimulado ? ': o Pix é de mentira e aprova sozinho' : ''}. Nada é cobrado de verdade.</p>` : ''}
      ${rodape}`;
    d.querySelector<HTMLInputElement>('input[type="email"]#pg-email, input[name="pg-plano"]:checked')?.focus();
  };

  const pago = (a: Acesso) => {
    clearInterval(espera);
    guardaAcesso(a);
    const ate = acessoAte();
    d.innerHTML = `${fechar}<span class="selo">Pronto!</span><h2 id="pg-t">Quiddo liberado</h2><p>Suas salas agora vão até ${c?.pago || 200} pessoas${ate ? `, até ${esc(ate)}` : ''}.</p>
      <p class="small">Guarde o seu código para usar em outro aparelho:</p><p class="pg-codigo">${esc(a.codigo)}</p>
      <button type="button" class="btn" data-pg="continuar">Continuar</button>`;
    d.querySelector<HTMLElement>('[data-pg="continuar"]')?.focus();
    aoPagar(a.codigo);
  };

  const pix = async (email: string) => {
    d.innerHTML = `${fechar}<h2 id="pg-t">Gerando o Pix…</h2>`;
    const r = await post<{ ref?: string; qr?: string; qr64?: string; erro?: string; simulado?: boolean }>('/api/pix', { email, plano: escolhido });
    if (!r?.ref) return inicio(r?.erro === 'email' ? 'Confira o e-mail.' : 'Não deu para gerar o Pix agora. Tente de novo.');
    const qr = r.qr64 ? `<img src="data:image/png;base64,${r.qr64}" alt="QR code do Pix" width="220" height="220">` : r.qr ? qrSvg(r.qr) : '';
    d.innerHTML = `${fechar}<h2 id="pg-t">Pague com Pix · R$ ${esc(precoDe(escolhido))}</h2><p class="muted">Abra o app do seu banco, escolha Pix e leia o QR code, ou copie o código.</p>
      <div class="pg-qr">${qr}</div>
      ${r.qr ? `<label for="pg-copia">Pix copia e cola<textarea id="pg-copia" readonly rows="3">${esc(r.qr)}</textarea></label><button type="button" class="btn sec" data-pg="copiar">Copiar o código</button>` : ''}
      <p class="pg-espera" role="status"><span class="dots">Esperando o pagamento</span></p>
      ${r.simulado ? '<p class="pg-teste">Pix de mentira: não pague. Ele aprova sozinho em alguns segundos.</p>' : ''}
      ${rodape}`;
    const ref = r.ref;
    espera = window.setInterval(async () => {
      const s = await post<{ pago: boolean } & Partial<Acesso>>('/api/pix/status', { ref });
      if (s?.pago && s.codigo) pago(s as Acesso);
    }, 3000);
  };

  const cartao = async (email: string) => {
    d.innerHTML = `${fechar}<h2 id="pg-t">Abrindo o pagamento…</h2>`;
    const r = await post<{ url?: string; erro?: string }>('/api/cartao', { email, volta, plano: escolhido });
    if (!r?.url) return inicio(r?.erro === 'email' ? 'Confira o e-mail.' : 'Não deu para abrir o pagamento agora. Tente de novo.');
    location.href = r.url;
  };

  const codigo = (erro = '') => {
    d.innerHTML = `${fechar}<h2 id="pg-t">Já tenho um código</h2>
      <form class="pg-form" data-pg-codigo novalidate>
        <label for="pg-cod">Código do pagamento<input type="text" id="pg-cod" autocomplete="off" placeholder="QD-XXXX-XXXX"></label>
        <p class="err" role="alert">${esc(erro)}</p>
        <button type="submit" class="btn">Liberar</button>
      </form>
      <p class="small">Não tem o código? <a href="/entrar?volta=${encodeURIComponent(location.pathname)}">Entre com o e-mail do pagamento</a> e o plano volta sozinho.</p>
      <button type="button" class="linkbtn" data-pg="inicio">Voltar</button>`;
    d.querySelector<HTMLInputElement>('#pg-cod')?.focus();
  };

  d.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-pg]');
    if (!b) return;
    const a = b.dataset.pg;
    if (a === 'fechar' || a === 'continuar') fecha();
    else if (a === 'codigo') codigo();
    else if (a === 'inicio') inicio();
    else if (a === 'copiar') {
      const t = d.querySelector<HTMLTextAreaElement>('#pg-copia');
      if (t) {
        t.select();
        navigator.clipboard?.writeText(t.value).catch(() => document.execCommand('copy'));
        b.textContent = 'Copiado!';
      }
    }
  });
  // trocou o plano: os botões mostram o preço dele
  d.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name !== 'pg-plano') return;
    escolhido = t.value === 'semana' ? 'semana' : 'mensal';
    d.querySelectorAll('[data-preco]').forEach((el) => (el.textContent = precoDe(escolhido)));
  });
  d.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target as HTMLFormElement;
    if (f.matches('[data-pg-codigo]')) {
      const v = (f.querySelector<HTMLInputElement>('#pg-cod')?.value || '').trim();
      if (!v) return codigo('Digite o código.');
      if (v.includes('@')) return codigo('Para recuperar pelo e-mail, use "Entre com o e-mail do pagamento" logo abaixo.');
      const r = await post<{ ok: boolean } & Partial<Acesso>>('/api/acesso', { codigo: v });
      if (r?.ok && r.codigo) return pago(r as Acesso);
      return codigo('Esse código não vale ou o plano já venceu. Confira e tente de novo.');
    }
    const email = (f.querySelector<HTMLInputElement>('#pg-email')?.value || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return inicio('Escreva um e-mail válido.');
    const meio = ((e as SubmitEvent).submitter as HTMLElement | null)?.dataset.meio;
    if (meio === 'cartao') cartao(email);
    else pix(email);
  });

  inicio();
  d.showModal();
}
