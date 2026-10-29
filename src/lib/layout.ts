// Cabeçalho, navegação e aviso de conexão, iguais em todas as páginas.
const MARCA =
  '<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="6" y="8" width="80" height="66" rx="20" fill="var(--acc)"/><path d="M28 74 L22 94 L46 74Z" fill="var(--acc)"/><path d="M36 32 Q36 20 47 20 Q58 20 58 31 Q58 39 47 43 V50" fill="none" stroke="var(--acc-ink)" stroke-width="8" stroke-linecap="round"/><circle cx="47" cy="61" r="5" fill="var(--acc-ink)"/></svg>';

export function header(path: string, compact = false) {
  const el = document.getElementById('topo')!;
  const cur = (p: string) => (path === p || path.startsWith(p + '/') ? ' aria-current="page"' : '');
  el.innerHTML =
    `<a class="logo" href="/" data-link>${MARCA}<span>quiddo</span></a>` +
    (compact
      ? ''
      : `<nav class="nav" aria-label="Principal"><a href="/criar" data-link${cur('/criar')}>Criar meu quiz</a><a href="/entrar" data-link${cur('/entrar')}>Entrar com código</a><a href="/guias" data-link${cur('/guias')}>Guias</a></nav>`);
}

let bannerTimer = 0;
/** Aviso fixo no topo ("A conexão caiu, reconectando…"). Texto vazio esconde. */
export function banner(text: string) {
  const el = document.getElementById('banner')!;
  clearTimeout(bannerTimer);
  if (!text) {
    // espera um pouco para não piscar em quedas curtas
    bannerTimer = window.setTimeout(() => (el.hidden = true), 300);
    return;
  }
  el.textContent = text;
  el.hidden = false;
}

export const WHATSAPP =
  '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#fff" d="M16 3.2C9 3.2 3.3 8.8 3.3 15.7c0 2.3.6 4.5 1.8 6.4L3.2 28.8l6.9-1.8c1.8 1 3.9 1.5 6 1.5 7 0 12.7-5.6 12.7-12.6S23 3.2 16 3.2z"/><path fill="#25D366" d="M16 5.4c5.8 0 10.5 4.6 10.5 10.3S21.8 26.1 16 26.1c-1.9 0-3.7-.5-5.3-1.4l-.4-.2-4 1 1.1-3.9-.3-.4c-1-1.6-1.5-3.5-1.5-5.4C5.6 10 10.3 5.4 16 5.4z"/><path fill="#fff" d="M12.3 10.2c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.7s1.2 3.2 1.4 3.4c.2.2 2.3 3.6 5.6 4.9 2.8 1.1 3.4.9 4 .8.6-.1 2-.8 2.2-1.6.3-.8.3-1.5.2-1.6-.1-.1-.3-.2-.7-.4l-2.2-1.1c-.3-.1-.5-.2-.8.2l-1 1.2c-.2.2-.4.3-.7.1-.3-.2-1.4-.5-2.7-1.7-1-.9-1.7-2-1.9-2.3-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6l-1-2.4z"/></svg>';
