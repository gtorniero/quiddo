// /precos: os planos do Quiddo. Grátis até 10 pessoas; Passe 7 dias (avulso) e Assinatura mensal ou anual liberam salas de até 200.
// Os preços vêm do servidor (/api/cobranca); enquanto não chegam, mostra os padrões.
import type { Page } from '../main';
import { esc } from '../lib/dom';
import { sincronizaConta } from '../lib/conta';
import { type Cobranca, type Plano, abrirPagamento, acessoAte, cobranca, confereVolta, meuAcesso } from '../lib/pagamento';

const PADRAO: Record<Plano, string> = { mensal: '15,99', anual: '156,00', semana: '12,99', oferta: '9,99' };
const num = (v: string) => Number(v.replace(',', '.'));
const reais = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ','));

export function page(): Page {
  return { title: 'Planos', wide: true, mount };
}

function mount(main: HTMLElement) {
  let cob: Cobranca | null = null;
  let periodo: 'mensal' | 'anual' = 'anual'; // assinatura: mensal ou anual, no mesmo cartão
  // o Anual só aparece quando o servidor oferece (preço anual configurado no Stripe)
  const temAnual = () => !cob || cob.planos.some((x) => x.id === 'anual');
  // Oculta apenas centavos zerados; preserva o preço retornado pelo servidor.
  const preco = (p: Plano) => (cob?.planos.find((x) => x.id === p)?.preco || PADRAO[p]).replace(/,00$/, '');
  const ok = '<span class="pc-ok" aria-hidden="true">✓</span>';
  // o número de pessoas por sala é o que diferencia os planos: vem grande, logo abaixo do nome
  const pessoas = (n: number) =>
    `<p class="pc-pessoas"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="9" cy="8" r="3.2" fill="currentColor"/><path d="M2.8 19c0-3.4 2.8-6 6.2-6s6.2 2.6 6.2 6" fill="currentColor"/><circle cx="17" cy="9" r="2.6" fill="currentColor" opacity=".6"/><path d="M15.6 13.3c3.2-.4 5.8 2 5.8 5.2h-4.6" fill="currentColor" opacity=".6"/></svg><span class="pc-pessoas-col"><span><span class="pc-pessoas-txt">até</span> <b>${n}</b></span><span class="pc-pessoas-txt">pessoas por sala</span></span></p>`;

  /** Quanto o Anual economiza em relação a 12 meses do Mensal, em %. */
  const economia = () => Math.round((1 - num(preco('anual')) / (12 * num(preco('mensal')))) * 100);

  function render() {
    const per = temAnual() ? periodo : 'mensal';
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
        <article class="pc">
          <span class="selo selo-avulso">Avulso</span>
          <h2>Passe 7 dias</h2>
          ${pessoas(200)}
          <p class="pc-preco">R$ ${esc(preco('semana'))}</p>
          <ul><li>${ok}Jogos ilimitados por 7 dias</li><li>${ok}Para um evento, sem assinatura</li></ul>
          <button type="button" class="btn sec" data-plano="semana">Comprar o Passe</button>
        </article>
        <article class="pc pc-destaque">
          <span class="selo">Mais vantagem</span>
          <h2>Assinatura</h2>
          ${
            temAnual()
              ? `<div class="periodo" role="radiogroup" aria-label="Período da assinatura">
            <button type="button" role="radio" data-periodo="anual" aria-checked="${per === 'anual'}">Anual <small>-${economia()}%</small></button>
            <button type="button" role="radio" data-periodo="mensal" aria-checked="${per === 'mensal'}">Mensal</button>
          </div>`
              : ''
          }
          ${pessoas(200)}
          ${
            per === 'anual'
              ? `<p class="pc-preco">R$ ${esc(reais(num(preco('anual')) / 12))}<small>/mês</small></p><p class="pc-sub">R$ ${esc(preco('anual'))} cobrança anual</p>`
              : `<p class="pc-preco">R$ ${esc(preco('mensal'))}<small>/mês</small></p><p class="pc-sub">Cobrança mensal</p>`
          }
          <ul><li>${ok}Jogos ilimitados ${per === 'anual' ? 'o ano todo' : 'o mês todo'}</li><li>${ok}Use em qualquer aparelho</li><li><span class="pc-ok" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M9 2 11.5 8.5 18 11 11.5 13.5 9 20 6.5 13.5 0 11 6.5 8.5Z M19 1 20.3 4.7 24 6 20.3 7.3 19 11 17.7 7.3 14 6 17.7 4.7Z"/></svg></span><span><strong>Quiz com IA</strong><br><small>PDF ou texto · 3 créditos por mês</small></span></li><li>${ok}Renova a cada ${per === 'anual' ? 'ano' : 'mês'}</li></ul>
          <button type="button" class="btn" data-plano="${per}">Assinar o ${per === 'anual' ? 'Anual' : 'Mensal'}</button>
        </article>
      </section>
      <section class="panel prose faq" id="perguntas">
        <h2>Perguntas</h2><details><summary>Como funcionam os créditos de Quiz com IA?</summary><p>As assinaturas Mensal e Anual incluem 3 créditos por mês, compartilhados entre PDF e texto. Cada geração concluída usa 1 crédito; editar, salvar e reabrir não gastam crédito. Os créditos não acumulam. No Anual, o saldo renova a cada mês a partir da data de início do período pago, sem nova cobrança.</p></details>
        <details><summary>Preciso pagar antes de criar o quiz?</summary><p>Não. Crie o quiz e abra a sala de graça. Se aparecerem mais de 10 pessoas, a sala de espera mostra o botão para liberar até 200, sem fechar a sala.</p></details>
        <details><summary>Como eu pago?</summary><p>${
          cob?.modo === 'ligada'
            ? `O Passe de 7 dias custa R$ ${esc(preco('semana'))}, pago uma vez, no Pix ou no cartão. A assinatura é no cartão: R$ ${esc(preco('mensal'))} por mês${temAnual() ? ` ou R$ ${esc(preco('anual'))} por ano` : ''}, com renovação automática.`
            : 'Em simulação, o Pix é de teste e não cobra dinheiro.'
        }</p></details>
        <details><summary>Como funciona a renovação?</summary><p>A assinatura renova sozinha no fim de cada período pago. Para não renovar, cancele em Minha conta antes da próxima cobrança: o período que você já pagou continua valendo até o fim.</p></details>
        <details><summary>E se eu trocar de computador?</summary><p>Depois do pagamento você recebe um código. Use "Já paguei, tenho um código" em qualquer aparelho, com o código ou com o e-mail do pagamento.</p></details>
        <details><summary>Quem joga precisa pagar?</summary><p>Não. Só quem abre a sala. A turma entra pelo celular, sem cadastro e sem baixar app.</p></details>
        <details><summary>E se eu desistir?</summary><p>Devolvemos o valor em até 7 dias depois do pagamento.</p></details>
        <details><summary>Mais de 200 pessoas?</summary><p>Estamos preparando salas maiores para eventos. Por enquanto, cada sala vai até 200.</p></details>
        <p class="small">Vendido por Beyond the Work · CNPJ 69.746.447/0001-00.</p>
      </section>`;
  }

  const onClick = (e: Event) => {
    const per = (e.target as HTMLElement).closest<HTMLElement>('[data-periodo]');
    if (per) {
      periodo = per.dataset.periodo === 'mensal' ? 'mensal' : 'anual';
      render();
      main.querySelector<HTMLElement>(`[data-periodo="${periodo}"]`)?.focus();
      return;
    }
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-plano]');
    if (!b) return;
    abrirPagamento('/precos', () => render(), (['semana', 'mensal', 'anual'].includes(b.dataset.plano || '') ? b.dataset.plano : 'mensal') as Plano);
  };
  main.addEventListener('click', onClick);
  render();
  // link "perguntas frequentes" da janela de pagamento
  if (location.hash === '#perguntas') requestAnimationFrame(() => main.querySelector('#perguntas')?.scrollIntoView());
  cobranca().then((c) => {
    cob = c;
    render();
  });
  sincronizaConta().then(() => render());
  confereVolta(() => render());
  return () => main.removeEventListener('click', onClick);
}
