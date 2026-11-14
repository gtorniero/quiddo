import type { Page } from '../main';
import { showConsent } from '../lib/measurement';
import { PAGINAS, privacidadeHtml } from '../lib/paginas-html';
import { SITE } from '../lib/guias-html';

export function page(): Page {
  return {
    title: 'Privacidade',
    fullTitle: PAGINAS['/privacidade'].titulo,
    description: PAGINAS['/privacidade'].descricao,
    canonical: `${SITE}/privacidade`,
    mount(main) {
      main.innerHTML = privacidadeHtml();
      const button = main.querySelector<HTMLButtonElement>('#privacy-edit')!;
      button.addEventListener('click', showConsent);
      // link "Saiba mais" do aviso de cookies: vai direto para "O que medimos"
      const alvo = location.hash.length > 1 ? main.querySelector<HTMLElement>(location.hash.replace(/[^#a-z0-9-]/gi, '')) : null;
      if (alvo) requestAnimationFrame(() => { alvo.setAttribute('tabindex', '-1'); alvo.scrollIntoView(); alvo.focus({ preventScroll: true }); });
      return () => button.removeEventListener('click', showConsent);
    },
  };
}
