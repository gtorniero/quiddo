// /pagar/{CODIGO}: aberta pelo QR que a TV mostra quando a sala grátis enche. Quem organiza paga no próprio
// celular, sem mostrar preço no telão. A chave do QR só serve para pagar e liberar esta sala (não comanda o jogo).
// Depois do pagamento, o servidor confere o código e libera a sala; quem estava esperando entra sozinho.
import type { Page } from '../main';
import { esc } from '../lib/dom';
import { abrirPagamento, cobranca, confereVolta, meuAcesso } from '../lib/pagamento';
import { store } from '../lib/storage';
import { LIMITS } from '../../shared/rules';

interface Resumo {
  esperando: number;
  limite: number;
  liberada: boolean;
}

export function page(code: string): Page {
  return { title: `Liberar a sala ${code}`, compact: true, noindex: true, mount: (main) => mount(main, code) };
}

function mount(main: HTMLElement, code: string) {
  let vivo = true;
  // a chave vem no endereço do QR (#c=...); fica guardada para a volta do cartão, que perde o endereço
  const doEndereco = /(?:^#|&)c=([^&]+)/.exec(location.hash)?.[1];
  if (doEndereco) {
    store.set('pagar:' + code, decodeURIComponent(doEndereco).slice(0, 64));
    history.replaceState(history.state, '', location.pathname + location.search);
  }
  const chave = store.get<string>('pagar:' + code, '');

  const tela = (html: string) => {
    if (vivo) main.innerHTML = `<section class="panel pagar-sala">${html}</section>`;
  };
  const pronto = () =>
    tela(`<span class="selo">Pronto!</span><h1>Sala ${code} liberada</h1><p>Agora a sala vai até ${LIMITS.maxPlayers} pessoas. Quem estava esperando já está entrando: pode voltar para a TV.</p>`);

  /** Pede ao servidor para liberar a sala com o código pago (ele confere o código e a chave). */
  async function liberar(codigo: string) {
    tela(`<h1>Liberando a sala ${code}…</h1><p class="muted dots" role="status">Conferindo o pagamento</p>`);
    try {
      const r = await fetch(`/api/salas/${code}/liberar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave, codigo }) });
      if (r.ok) return pronto();
      tela(`<h1>Não deu para liberar</h1><p class="muted">${r.status === 404 ? 'A sala não existe mais ou o QR é de outra sala.' : 'Esse código não vale para liberar a sala.'} Guarde o seu código: ele também vale na TV, em "Liberar até ${LIMITS.maxPlayers} pessoas".</p><p class="pg-codigo">${esc(codigo)}</p>`);
    } catch {
      tela(`<h1>Sem conexão</h1><p class="muted">Confira a internet e tente de novo.</p><button type="button" class="btn" data-act="tentar">Tentar de novo</button>`);
    }
  }

  async function inicio() {
    if (!chave) return tela(`<h1>QR incompleto</h1><p class="muted">Aponte a câmera de novo para o QR que aparece na TV.</p>`);
    tela(`<p class="muted dots" role="status">Abrindo a sala ${code}</p>`);
    const r = await fetch(`/api/salas/${code}/pagar?c=${encodeURIComponent(chave)}`).catch(() => null);
    const sala = r && r.ok ? ((await r.json()) as Resumo) : null;
    if (!sala) return tela(`<h1>Sala não encontrada</h1><p class="muted">A sala ${code} não existe mais ou o QR é de outra sala.</p>`);
    if (sala.liberada) return pronto();
    const c = await cobranca();
    const meu = meuAcesso();
    tela(`<div class="tag">Sala ${code}</div><h1>${sala.esperando ? `${sala.esperando} ${sala.esperando === 1 ? 'pessoa esperando' : 'pessoas esperando'}` : 'Liberar mais vagas'}</h1>
      <p>A sala grátis vai até ${sala.limite} pessoas. Libere até ${LIMITS.maxPlayers} agora, sem parar o jogo: assim que o pagamento for confirmado, quem está esperando entra sozinho.</p>
      ${
        meu
          ? `<button type="button" class="btn" data-act="meu">Liberar com o meu plano</button><p class="small">Você já tem um plano neste celular (${esc(meu)}).</p>`
          : `<button type="button" class="btn" data-act="pagar"${c && (c.pix || c.cartao) ? '' : ' disabled'}>${sala.esperando && c?.oferta ? `Liberar a sala por R$ ${esc(c.oferta.preco)}` : 'Ver os planos e liberar'}</button>`
      }
      <p class="small">Já pagou em outro aparelho? Toque em liberar e use "Já paguei, tenho um código".</p>`);
    main.querySelector<HTMLElement>('.btn')?.focus();
    esperando = sala.esperando;
  }

  let esperando = 0;
  const onClick = (e: Event) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'meu') void liberar(meuAcesso());
    else if (b.dataset.act === 'tentar') void inicio();
    else if (b.dataset.act === 'pagar') void abrirPagamento('/pagar/' + code, (codigo) => void liberar(codigo), 'semana', esperando ? { codigo: code, hostKey: chave } : undefined);
  };
  main.addEventListener('click', onClick);
  // voltou do cartão: confere o pagamento e libera a sala
  void confereVolta((codigo) => void liberar(codigo)).then((r) => {
    if (r !== 'ok') void inicio();
  });
  return () => {
    vivo = false;
    main.removeEventListener('click', onClick);
    document.getElementById('pagamento')?.remove();
  };
}
