// Pagamento no site, no mesmo modelo do Retrozap: Pix (Mercado Pago) ou cartão, Apple Pay e Google Pay
// (Stripe Checkout). Quem paga recebe um código QD-XXXX-XXXX, guardado neste navegador; com ele,
// salas de até 200 pessoas em qualquer aparelho. A sala grátis vai até 10.
import { esc } from './dom';
import { qrSvg } from './qr';
import { store } from './storage';

export interface Cobranca {
  modo: 'ligada' | 'teste' | 'desligada';
  pix: boolean;
  pixSimulado: boolean;
  cartao: boolean;
  cartaoTeste: boolean;
  precoPix: string;
  precoCartao: string;
  gratis: number;
  pago: number;
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

/** A cobrança vale aqui? (ligada, ou teste com ?teste_cobranca=1, e com algum meio de pagamento pronto) */
export const cobrancaValendo = (c: Cobranca | null) => !!c && (c.modo === 'ligada' || (c.modo === 'teste' && testeCobranca())) && (c.pix || c.cartao);

export const meuAcesso = () => store.get<string>('acesso', '');
const guardaAcesso = (codigo: string) => store.set('acesso', codigo);

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
    const r = await post<{ pago: boolean; codigo?: string }>('/api/pix/status', { ref });
    if (r?.pago && r.codigo) {
      guardaAcesso(r.codigo);
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
 */
export async function abrirPagamento(volta: string, aoPagar: (codigo: string) => void) {
  const c = await cobranca();
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

  const rodape = `<p class="pg-legal">Pagamento único. Vale para sempre neste navegador e, com o seu código, em qualquer aparelho. Desistiu? Devolvemos em até 7 dias. Vendido por Beyond the Work · CNPJ 69.746.447/0001-00.</p>`;
  const fechar = `<button type="button" class="pg-x" data-pg="fechar" aria-label="Fechar">×</button>`;

  const inicio = (erro = '') => {
    if (!c || !(c.pix || c.cartao)) {
      d.innerHTML = `${fechar}<h2 id="pg-t">Pagamento indisponível</h2><p class="muted">O pagamento ainda não está ligado neste site. Tente mais tarde.</p>`;
      return;
    }
    d.innerHTML = `${fechar}<span class="selo">Quiddo liberado</span><h2 id="pg-t">Salas com até ${c.pago} pessoas</h2>
      <ul class="pg-lista"><li>A sala grátis vai até ${c.gratis} pessoas. Liberado, até ${c.pago}.</li><li>Quantas salas e quizzes você quiser.</li><li>Pagamento único, sem mensalidade.</li></ul>
      <form class="pg-form" data-pg-form novalidate>
        <label for="pg-email">Seu e-mail<input type="email" id="pg-email" autocomplete="email" placeholder="voce@email.com" required></label>
        <p class="small">Para recuperar o acesso em outro aparelho. Não mandamos propaganda.</p>
        <p class="err" role="alert">${esc(erro)}</p>
        ${c.pix ? `<button type="submit" class="btn pg-pix" data-meio="pix">${ICONE_PIX}Pagar com Pix · R$ ${esc(c.precoPix)}</button>` : ''}
        ${c.cartao ? `<button type="submit" class="btn sec pg-cartao" data-meio="cartao">Cartão, Apple Pay ou Google Pay · R$ ${esc(c.precoCartao)}</button>` : ''}
      </form>
      <button type="button" class="linkbtn" data-pg="codigo">Já paguei, tenho um código</button>
      ${c.modo === 'teste' ? `<p class="pg-teste">Modo de teste${c.pixSimulado ? ': o Pix é simulado e aprova sozinho' : ''}. Nada é cobrado de verdade.</p>` : ''}
      ${rodape}`;
    d.querySelector<HTMLInputElement>('#pg-email')?.focus();
  };

  const pago = (codigo: string) => {
    clearInterval(espera);
    guardaAcesso(codigo);
    d.innerHTML = `${fechar}<span class="selo">Pronto!</span><h2 id="pg-t">Quiddo liberado</h2><p>Suas salas agora vão até ${c?.pago || 200} pessoas.</p>
      <p class="small">Guarde o seu código para usar em outro aparelho:</p><p class="pg-codigo">${esc(codigo)}</p>
      <button type="button" class="btn" data-pg="continuar">Continuar</button>`;
    d.querySelector<HTMLElement>('[data-pg="continuar"]')?.focus();
    aoPagar(codigo);
  };

  const pix = async (email: string) => {
    d.innerHTML = `${fechar}<h2 id="pg-t">Gerando o Pix…</h2>`;
    const r = await post<{ ref?: string; qr?: string; qr64?: string; erro?: string; simulado?: boolean }>('/api/pix', { email });
    if (!r?.ref) return inicio(r?.erro === 'email' ? 'Confira o e-mail.' : 'Não deu para gerar o Pix agora. Tente de novo.');
    const qr = r.qr64 ? `<img src="data:image/png;base64,${r.qr64}" alt="QR code do Pix" width="220" height="220">` : r.qr ? qrSvg(r.qr) : '';
    d.innerHTML = `${fechar}<h2 id="pg-t">Pague com Pix</h2><p class="muted">Abra o app do seu banco, escolha Pix e leia o QR code, ou copie o código.</p>
      <div class="pg-qr">${qr}</div>
      ${r.qr ? `<label for="pg-copia">Pix copia e cola<textarea id="pg-copia" readonly rows="3">${esc(r.qr)}</textarea></label><button type="button" class="btn sec" data-pg="copiar">Copiar o código</button>` : ''}
      <p class="pg-espera" role="status"><span class="dots">Esperando o pagamento</span></p>
      ${r.simulado ? '<p class="pg-teste">Pix de teste: não pague. Ele aprova sozinho em alguns segundos.</p>' : ''}
      ${rodape}`;
    const ref = r.ref;
    espera = window.setInterval(async () => {
      const s = await post<{ pago: boolean; codigo?: string }>('/api/pix/status', { ref });
      if (s?.pago && s.codigo) pago(s.codigo);
    }, 3000);
  };

  const cartao = async (email: string) => {
    d.innerHTML = `${fechar}<h2 id="pg-t">Abrindo o pagamento…</h2>`;
    const r = await post<{ url?: string; erro?: string }>('/api/cartao', { email, volta });
    if (!r?.url) return inicio(r?.erro === 'email' ? 'Confira o e-mail.' : 'Não deu para abrir o pagamento agora. Tente de novo.');
    location.href = r.url;
  };

  const codigo = (erro = '') => {
    d.innerHTML = `${fechar}<h2 id="pg-t">Já tenho um código</h2>
      <form class="pg-form" data-pg-codigo novalidate>
        <label for="pg-cod">Código ou e-mail do pagamento<input type="text" id="pg-cod" autocomplete="off" placeholder="QD-XXXX-XXXX ou voce@email.com"></label>
        <p class="err" role="alert">${esc(erro)}</p>
        <button type="submit" class="btn">Liberar</button>
      </form>
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
  d.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target as HTMLFormElement;
    if (f.matches('[data-pg-codigo]')) {
      const v = (f.querySelector<HTMLInputElement>('#pg-cod')?.value || '').trim();
      if (!v) return codigo('Digite o código ou o e-mail.');
      const r = await post<{ ok: boolean; codigo?: string }>('/api/acesso', v.includes('@') ? { email: v } : { codigo: v });
      if (r?.ok && r.codigo) return pago(r.codigo);
      return codigo(v.includes('@') ? 'Não achamos pagamento com esse e-mail.' : 'Esse código não vale. Confira e tente de novo.');
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
