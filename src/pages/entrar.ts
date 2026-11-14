// /entrar: login sem senha. A pessoa digita o e-mail, recebe um código de 6 dígitos e entra.
// Sem o e-mail ligado no servidor (simulação), o código aparece na tela.
import type { Page } from '../main';
import { esc } from '../lib/dom';
import { navigate } from '../lib/nav';
import { logado, sincronizaConta } from '../lib/conta';

export function page(): Page {
  return { title: 'Entrar', noindex: true, mount };
}

async function post(url: string, corpo: unknown) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
    return ((await r.json().catch(() => null)) || {}) as { ok?: boolean; erro?: string; simulado?: boolean; codigo?: string; restam?: number };
  } catch {
    return { erro: 'rede' };
  }
}

const ERROS: Record<string, string> = {
  email: 'Escreva um e-mail válido.',
  muitos: 'Muitos códigos pedidos agora. Espere uns minutos e tente de novo.',
  envio: 'Não deu para mandar o e-mail agora. Tente de novo em instantes.',
  indisponivel: 'O login ainda não está ligado neste site.',
  expirado: 'Esse código venceu. Peça um novo.',
  rede: 'Sem conexão com a internet. Confira e tente de novo.',
};

function mount(main: HTMLElement) {
  // volta: para onde ir depois de entrar (só caminhos deste site)
  const v = new URLSearchParams(location.search).get('volta') || '';
  const volta = /^\/[A-Za-z0-9/_-]{0,40}$/.test(v) ? v : '/conta';
  if (logado()) {
    navigate(volta, true);
    return;
  }
  let email = '';
  let enviando = false;

  const passoEmail = (erro = '') => {
    main.innerHTML = `<section class="panel entrar-conta"><h1>Entrar</h1><p class="muted">Sem senha: mandamos um código de 6 dígitos para o seu e-mail.</p><p class="small">Não encontrou o e-mail? Confira também Spam ou Lixo eletrônico.</p>
      <form id="f-email" novalidate><label for="ent-email">Seu e-mail<input type="email" id="ent-email" autocomplete="email" inputmode="email" placeholder="voce@email.com" value="${esc(email)}" aria-describedby="ent-err"></label>
      <p class="err" id="ent-err" role="alert">${esc(erro)}</p><button class="btn" type="submit">Receber o código</button></form>
      <p class="small">Para jogar não precisa de conta: <a href="/jogar" data-link>digite o código da sala</a>.</p></section>`;
    main.querySelector<HTMLInputElement>('#ent-email')?.focus();
  };

  const passoCodigo = (erro = '', simulado = '') => {
    main.innerHTML = `<section class="panel entrar-conta"><h1>Confira seu e-mail</h1><p class="muted">Mandamos um código para <b>${esc(email)}</b>. Ele vale por 10 minutos.</p><p class="small">Confira também Spam ou Lixo eletrônico. Se encontrar nossa mensagem lá, marque como “Não é spam” para facilitar os próximos acessos.</p>
      ${simulado ? `<p class="pg-teste">Simulação: o e-mail ainda não está ligado. Seu código é <b>${esc(simulado)}</b>.</p>` : ''}
      <form id="f-codigo" novalidate><label for="ent-cod">Código<input type="text" id="ent-cod" class="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" aria-describedby="ent-err"></label>
      <p class="err" id="ent-err" role="alert">${esc(erro)}</p><button class="btn" type="submit">Entrar</button></form>
      <p class="small"><button type="button" class="linkbtn" data-act="outro">Usar outro e-mail ou pedir um código novo</button></p></section>`;
    main.querySelector<HTMLInputElement>('#ent-cod')?.focus();
  };

  const onSubmit = async (e: Event) => {
    e.preventDefault();
    if (enviando) return;
    const f = e.target as HTMLFormElement;
    enviando = true;
    if (f.id === 'f-email') {
      email = (main.querySelector<HTMLInputElement>('#ent-email')?.value || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        enviando = false;
        return passoEmail(ERROS.email);
      }
      const r = await post('/api/login', { email });
      enviando = false;
      if (!r.ok) return passoEmail(ERROS[r.erro || ''] || 'Não deu para mandar o código. Tente de novo.');
      return passoCodigo('', r.simulado ? r.codigo || '' : '');
    }
    const codigo = (main.querySelector<HTMLInputElement>('#ent-cod')?.value || '').replace(/\D/g, '');
    const r = await post('/api/login/codigo', { email, codigo });
    enviando = false;
    if (!r.ok) {
      if (r.erro === 'expirado') return passoEmail(ERROS.expirado);
      return passoCodigo(r.restam ? `Código errado. Você ainda tem ${r.restam} ${r.restam === 1 ? 'tentativa' : 'tentativas'}.` : ERROS[r.erro || ''] || 'Código errado. Peça um novo.');
    }
    await sincronizaConta();
    navigate(volta, true);
  };
  const onClick = (e: Event) => {
    if ((e.target as HTMLElement).closest('[data-act="outro"]')) passoEmail();
  };
  const onInput = (e: Event) => {
    const t = e.target as HTMLInputElement;
    if (t.id === 'ent-cod') t.value = t.value.replace(/\D/g, '').slice(0, 6);
  };
  main.addEventListener('submit', onSubmit);
  main.addEventListener('click', onClick);
  main.addEventListener('input', onInput);
  passoEmail();
  return () => {
    main.removeEventListener('submit', onSubmit);
    main.removeEventListener('click', onClick);
    main.removeEventListener('input', onInput);
  };
}
