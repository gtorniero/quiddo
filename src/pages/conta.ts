// Conta verificada por e-mail; o portal Stripe so usa o customer ligado a esta conta no servidor.
import type { Page } from '../main';
import { esc } from '../lib/dom';
import { navigate } from '../lib/nav';
import { sair, sincronizaConta } from '../lib/conta';

export function page(): Page { return { title: 'Minha conta', mount }; }
const NOMES: Record<string, string> = { mensal: 'Mensal', anual: 'Anual', semana: 'Passe 7 dias', oferta: 'Passe 7 dias' };
const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function mount(main: HTMLElement) {
  main.innerHTML = '<section class="panel"><p class="muted">Carregando…</p></section>';
  let vivo = true;
  sincronizaConta().then(({ email, acesso, assinatura }) => {
    if (!vivo) return;
    if (!email) return navigate('/entrar?volta=/conta', true);
    const plano = acesso
      ? `<p class="plano liberado"><span class="selo">${esc(NOMES[acesso.plano || ''] || 'Quiddo liberado')}</span> Salas de até 200 pessoas${acesso.expira ? ` até <b>${esc(data(acesso.expira))}</b>` : ''}.</p>
        <p class="small">Código para usar em outro aparelho: <strong class="nowrap">${esc(acesso.codigo)}</strong></p>
        ${acesso.plano === 'mensal' && !assinatura ? '<p class="small">Este Mensal vale 30 dias e não renova automaticamente.</p>' : ''}`
      : '<p>Você está no plano <b>Grátis</b>: salas de até 10 pessoas.</p><a class="btn auto" href="/precos" data-link>Ver os planos</a>';
    const status = assinatura
      ? `<section class="panel conta"><h2>Assinatura no cartão</h2>
        ${assinatura.teste ? '<p class="pg-teste">Ambiente de teste: nenhuma cobrança real.</p>' : ''}
        <p>${assinatura.status === 'revisao' ? 'O acesso está em revisão.' : assinatura.status === 'past_due' || assinatura.status === 'unpaid' ? 'Há um pagamento pendente. Atualize a forma de pagamento.' : assinatura.renova ? `O ${esc(NOMES[acesso?.plano || 'mensal'] || 'plano')} renova automaticamente a cada ${acesso?.plano === 'anual' ? 'ano' : 'mês'}.` : assinatura.ate ? `Renovação cancelada. O acesso pago vale até ${esc(data(assinatura.ate))}.` : 'A assinatura foi encerrada.'}</p>
        ${assinatura.podeGerenciar ? '<button type="button" class="btn sec auto" data-act="assinatura">Gerenciar assinatura e pagamento</button>' : ''}
        <p class="err" role="alert" id="conta-erro"></p></section>` : '';
    main.innerHTML = `<section class="hero"><h1>Minha conta</h1><p>${esc(email)}</p></section>
      <section class="panel conta"><h2>Seu plano</h2>${plano}</section>${status}
      <section class="panel conta"><h2>Seus quizzes</h2><p>Abra, edite e apresente os quizzes salvos na sua conta em qualquer aparelho.</p><a class="btn sec auto" href="/criar" data-link>Ver meus quizzes</a></section>
      <section class="panel conta"><div class="btnrow"><a class="btn sec auto" href="/criar" data-link>Criar meu quiz</a><button type="button" class="linkbtn" data-act="sair">Sair da conta</button></div></section>`;
  });
  const onClick = async (e: Event) => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-act]');
    if (!button) return;
    if (button.dataset.act === 'sair') { await sair(); navigate('/', true); return; }
    if (button.dataset.act !== 'assinatura') return;
    button.disabled = true;
    try {
      const response = await fetch('/api/assinatura/portal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const result = await response.json() as { url?: string };
      if (!response.ok || !result.url || new URL(result.url).origin !== 'https://billing.stripe.com') throw new Error('portal');
      location.href = result.url;
    } catch {
      const error = main.querySelector('#conta-erro');
      if (error) error.textContent = 'Não deu para abrir sua assinatura agora. Tente novamente.';
      button.disabled = false;
    }
  };
  main.addEventListener('click', onClick);
  return () => { vivo = false; main.removeEventListener('click', onClick); };
}
