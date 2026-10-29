import type { Page } from '../main';
import { CODE_RE, normalizeCode } from '../../shared/rules';
import { navigate } from '../lib/nav';

/** Campo de código + botão, usado na home e em /entrar. */
export function codeForm(id: string) {
  return `<form class="row" data-codeform novalidate>
    <label for="code-${id}">Código da sala<input type="text" class="code" id="code-${id}" maxlength="4" placeholder="KX7Q" autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text" aria-describedby="code-${id}-err"></label>
    <button class="btn" type="submit">Entrar na sala</button>
  </form><p class="err" id="code-${id}-err" role="alert"></p>`;
}

export function bindCodeForm(root: HTMLElement, go: (code: string) => void) {
  const onInput = (e: Event) => {
    const t = e.target as HTMLInputElement;
    if (t.classList.contains('code')) t.value = normalizeCode(t.value);
  };
  const onSubmit = (e: Event) => {
    const f = e.target as HTMLFormElement;
    if (!f.matches('[data-codeform]')) return;
    e.preventDefault();
    const inp = f.querySelector<HTMLInputElement>('input.code')!;
    const err = document.getElementById(inp.id + '-err')!;
    const code = normalizeCode(inp.value);
    if (!CODE_RE.test(code)) {
      err.textContent = 'O código tem 4 letras ou números. Confira na tela da sala.';
      inp.focus();
      return;
    }
    go(code);
  };
  root.addEventListener('input', onInput);
  root.addEventListener('submit', onSubmit);
  return () => {
    root.removeEventListener('input', onInput);
    root.removeEventListener('submit', onSubmit);
  };
}

export function page(): Page {
  return {
    title: 'Entrar com código',
    mount(main) {
      main.innerHTML = `<section class="panel"><h1>Entrar na sala</h1><p class="muted">Digite o código que aparece na tela do anfitrião.</p>${codeForm('entrar')}</section>`;
      main.querySelector<HTMLInputElement>('input.code')!.focus();
      return bindCodeForm(main, (code) => navigate('/' + code));
    },
  };
}
