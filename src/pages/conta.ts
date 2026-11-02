// /conta: e-mail de quem entrou, o plano em dia (com o código para outros aparelhos) e o botão de sair.
import type { Page } from '../main';
import { esc } from '../lib/dom';
import { navigate } from '../lib/nav';
import { sair, sincronizaConta } from '../lib/conta';

export function page(): Page {
  return { title: 'Minha conta', mount };
}

const NOMES: Record<string, string> = { mensal: 'Mensal', semana: 'Passe 7 dias' };
const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function mount(main: HTMLElement) {
  main.innerHTML = '<section class="panel"><p class="muted">Carregando…</p></section>';
  let vivo = true;
  sincronizaConta().then(({ email, acesso }) => {
    if (!vivo) return;
    if (!email) return navigate('/entrar?volta=/conta', true);
    const plano = acesso
      ? `<p class="plano liberado"><span class="selo">${esc(NOMES[acesso.plano || ''] || 'Quiddo liberado')}</span> Salas de até 200 pessoas${acesso.expira ? ` até <b>${esc(data(acesso.expira))}</b>` : ''}.</p>
        <p class="small">Código para usar sem entrar na conta, em outro aparelho: <strong class="nowrap">${esc(acesso.codigo)}</strong></p>
        ${acesso.plano === 'mensal' ? '<p class="small">O Mensal ainda não renova sozinho: quando vencer, é só pagar de novo. A renovação automática no cartão chega em breve, com o botão de cancelar aqui.</p>' : ''}`
      : `<p>Você está no plano <b>Grátis</b>: salas de até 10 pessoas.</p><a class="btn auto" href="/precos" data-link>Ver os planos</a>`;
    main.innerHTML = `<section class="hero"><h1>Minha conta</h1><p>${esc(email)}</p></section>
      <section class="panel conta"><h2>Seu plano</h2>${plano}</section>
      <section class="panel conta"><div class="btnrow"><a class="btn sec auto" href="/criar" data-link>Criar meu quiz</a><button type="button" class="linkbtn" data-act="sair">Sair da conta</button></div></section>`;
  });
  const onClick = async (e: Event) => {
    if (!(e.target as HTMLElement).closest('[data-act="sair"]')) return;
    await sair();
    navigate('/', true);
  };
  main.addEventListener('click', onClick);
  return () => {
    vivo = false;
    main.removeEventListener('click', onClick);
  };
}
