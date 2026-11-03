// /precos: os planos do Quiddo. Grátis até 10 pessoas; Mensal e Passe 7 dias liberam salas de até 200.
// O PRO (empresas e escolas: IA, login da equipe) aparece como "em breve".
// Os preços vêm do servidor (/api/cobranca); enquanto não chegam, mostra os padrões.
import type { Page } from '../main';
import { esc } from '../lib/dom';
import { sincronizaConta } from '../lib/conta';
import { type Cobranca, type Plano, abrirPagamento, acessoAte, cobranca, confereVolta, meuAcesso } from '../lib/pagamento';

const PADRAO: Record<Plano, string> = { mensal: '25,99', semana: '15,99', oferta: '11,99' };

export function page(): Page {
  return { title: 'Planos', wide: true, mount };
}

function mount(main: HTMLElement) {
  let cob: Cobranca | null = null;
  const preco = (p: Plano) => cob?.planos.find((x) => x.id === p)?.preco || PADRAO[p];
  const ok = '<span class="pc-ok" aria-hidden="true">✓</span>';
  // o número de pessoas por sala é o que diferencia os planos: vem grande, logo abaixo do nome
  const pessoas = (n: number) =>
    `<p class="pc-pessoas"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="9" cy="8" r="3.2" fill="currentColor"/><path d="M2.8 19c0-3.4 2.8-6 6.2-6s6.2 2.6 6.2 6" fill="currentColor"/><circle cx="17" cy="9" r="2.6" fill="currentColor" opacity=".6"/><path d="M15.6 13.3c3.2-.4 5.8 2 5.8 5.2h-4.6" fill="currentColor" opacity=".6"/></svg><span class="pc-pessoas-col"><span><span class="pc-pessoas-txt">até</span> <b>${n}</b></span><span class="pc-pessoas-txt">pessoas por sala</span></span></p>`;

  function render() {
    const ate = acessoAte();
    const meu = meuAcesso()
      ? `<p class="plano liberado"><span class="selo">Quiddo liberado</span> Salas de até 200 pessoas neste navegador${ate ? `, até ${esc(ate)}` : ''}. Código: <strong>${esc(meuAcesso())}</strong></p>`
      : '';
    const aviso =
      cob && (cob.modo === 'simulacao' || cob.modo === 'teste')
        ? '<p class="pg-teste">Simulação: o pagamento ainda é de mentira e nada é cobrado. Dá para testar o caminho todo.</p>'
        : '';
    main.innerHTML = `<section class="hero"><h1>Planos</h1><p>Comece grátis. Pague só quando a turma passar de 10 pessoas.</p></section>
      ${aviso}${meu}
      <section class="precos" aria-label="Planos">
        <article class="pc">
          <h2>Grátis</h2>
          ${pessoas(10)}
          <p class="pc-preco">R$ 0</p>
          <ul><li>${ok}Quizzes e jogos ilimitados</li><li>${ok}Todos os modos, visuais e o pódio</li></ul>
          <a class="btn sec" href="/criar" data-link>Criar meu quiz</a>
        </article>
        <article class="pc pc-destaque">
          <span class="selo">Mais vantagem</span>
          <h2>Mensal</h2>
          ${pessoas(200)}
          <p class="pc-preco">R$ ${esc(preco('mensal'))}<small>/mês</small></p>
          <ul><li>${ok}Jogos ilimitados o mês todo</li><li>${ok}Use em qualquer aparelho com o seu código</li><li>${ok}Cancele quando quiser</li></ul>
          <button type="button" class="btn" data-plano="mensal">Assinar o Mensal</button>
        </article>
        <article class="pc">
          <h2>Passe 7 dias</h2>
          ${pessoas(200)}
          <p class="pc-preco">R$ ${esc(preco('semana'))}</p>
          <ul><li>${ok}Jogos ilimitados por 7 dias</li><li>${ok}Para um evento, sem assinatura</li></ul>
          <button type="button" class="btn sec" data-plano="semana">Comprar o Passe</button>
        </article>
        <article class="pc pc-breve">
          <span class="selo">Em breve</span>
          <h2>PRO</h2>
          ${pessoas(200)}
          <p class="pc-sub">Para empresas e escolas</p>
          <ul><li>${ok}Quiz sugerido por IA a partir do tema</li><li>${ok}Login da equipe, com vários usuários</li><li>${ok}Quizzes salvos na nuvem</li><li>${ok}Tudo do Mensal</li></ul>
          <button type="button" class="btn sec" disabled>Em breve</button>
        </article>
      </section>
      <section class="panel prose faq">
        <h2>Perguntas</h2>
        <details><summary>Preciso pagar antes de criar o quiz?</summary><p>Não. Crie o quiz e abra a sala de graça. Se aparecerem mais de 10 pessoas, a sala de espera mostra o botão para liberar até 200, sem fechar a sala.</p></details>
        <details><summary>Como eu pago?</summary><p>${cob?.modo === 'ligada' ? 'No cartão: Mensal por R$ 25,99 com renovação automática ou Passe de 7 dias por R$ 15,99, pago uma vez. Cancele em Minha conta; o acesso continua até o fim do período pago.' : 'Em simulação, o Pix é de teste e não cobra dinheiro.'}</p></details>
        <details><summary>E se eu trocar de computador?</summary><p>Depois do pagamento você recebe um código. Use "Já paguei, tenho um código" em qualquer aparelho, com o código ou com o e-mail do pagamento.</p></details>
        <details><summary>Quem joga precisa pagar?</summary><p>Não. Só quem abre a sala. A turma entra pelo celular, sem cadastro e sem baixar app.</p></details>
        <details><summary>E se eu desistir?</summary><p>Devolvemos o valor em até 7 dias depois do pagamento.</p></details>
        <details><summary>Mais de 200 pessoas?</summary><p>Estamos preparando salas maiores para eventos. Por enquanto, cada sala vai até 200.</p></details>
        <p class="small">Vendido por Beyond the Work · CNPJ 69.746.447/0001-00.</p>
      </section>`;
  }

  const onClick = (e: Event) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-plano]');
    if (!b) return;
    abrirPagamento('/precos', () => render(), b.dataset.plano === 'semana' ? 'semana' : 'mensal');
  };
  main.addEventListener('click', onClick);
  render();
  cobranca().then((c) => {
    cob = c;
    render();
  });
  sincronizaConta().then(() => render());
  confereVolta(() => render());
  return () => main.removeEventListener('click', onClick);
}
