// /precos: os planos do Quiddo. A Assinatura Premium (Anual em destaque, Mensal ao lado) vem primeiro;
// o Passe 7 dias é a alternativa avulsa; o Grátis vai até 10 pessoas. Passe e Premium liberam a marca (logo e cor).
// Os preços vêm do servidor (/api/cobranca); enquanto não chegam, mostra os padrões.
// O HTML dos planos fica em lib/paginas-html.ts, o mesmo do pré-render para buscadores.
import type { Page } from '../main';
import { esc } from '../lib/dom';
import { sincronizaConta } from '../lib/conta';
import { track } from '../lib/measurement';
import { SITE } from '../lib/guias-html';
import { PAGINAS, PRECOS_PADRAO, precosHtml, precosTopo, type PlanoPreco } from '../lib/paginas-html';
import { type Cobranca, type Plano, abrirPagamento, acessoAte, cobranca, confereVolta, meuAcesso, testeCobranca } from '../lib/pagamento';

export function page(): Page {
  return { title: 'Planos', fullTitle: PAGINAS['/precos'].titulo, description: PAGINAS['/precos'].descricao, canonical: `${SITE}/precos`, wide: true, mount };
}

const num = (v: string) => Number(v.replace(',', '.'));

function mount(main: HTMLElement) {
  let cob: Cobranca | null = null;
  let periodo: 'mensal' | 'anual' = 'anual'; // assinatura: anual em destaque, mensal ao lado
  // o Anual só aparece quando o servidor oferece (preço anual configurado no Stripe)
  const temAnual = () => !cob || cob.planos.some((x) => x.id === 'anual');
  const preco = (p: PlanoPreco) => cob?.planos.find((x) => x.id === p)?.preco || PRECOS_PADRAO[p];

  function render() {
    const ate = acessoAte();
    const meu = meuAcesso()
      ? `<p class="plano liberado"><span class="selo">Quiddo liberado</span> Salas de até 200 pessoas e a sua marca neste navegador${ate ? `, até ${esc(ate)}` : ''}. Código: <strong>${esc(meuAcesso())}</strong></p>`
      : '';
    const aviso =
      cob && (cob.modo === 'simulacao' || cob.modo === 'teste')
        ? '<p class="pg-teste">Simulação: o pagamento ainda é de mentira e nada é cobrado. Dá para testar o caminho todo.</p>'
        : '';
    main.innerHTML = `${precosTopo()}
      ${aviso}${meu}
      ${precosHtml({ preco, temAnual: temAnual(), periodo, ligado: cob?.modo === 'ligada' })}`;
  }

  const onChange = (e: Event) => {
    const t = e.target as HTMLInputElement;
    if (t.name !== 'periodo') return;
    periodo = t.value === 'mensal' ? 'mensal' : 'anual';
    render();
    main.querySelector<HTMLInputElement>('input[name="periodo"]:checked')?.focus();
  };
  const onClick = (e: Event) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-plano]');
    if (!b) return;
    abrirPagamento('/precos', () => render(), (['semana', 'mensal', 'anual'].includes(b.dataset.plano || '') ? b.dataset.plano : 'anual') as Plano);
  };
  main.addEventListener('change', onChange);
  main.addEventListener('click', onClick);
  render();
  // link "perguntas frequentes" da janela de pagamento
  if (location.hash === '#perguntas') requestAnimationFrame(() => main.querySelector('#perguntas')?.scrollIntoView());
  cobranca().then((c) => {
    cob = c;
    render();
    // ViewContent / view_item: os planos na ordem da página, com o valor do plano em destaque
    if (c?.modo === 'ligada' && !testeCobranca()) {
      const precos: Partial<Record<PlanoPreco, number>> = {};
      for (const p of c.planos) if (p.id === 'anual' || p.id === 'mensal' || p.id === 'semana') precos[p.id] = num(p.preco);
      const destaque = precos.anual ?? precos.mensal;
      if (destaque) void track('view_item', { value: destaque, currency: 'BRL', plano: precos.anual ? 'anual' : 'mensal', precos });
    }
  });
  sincronizaConta().then(() => render());
  confereVolta(() => render());
  return () => {
    main.removeEventListener('change', onChange);
    main.removeEventListener('click', onClick);
  };
}
