// Navegação sem recarregar a página. O roteador (main.ts) escuta o evento e desenha a página nova.
export function navigate(to: string, replace = false) {
  if (replace) history.replaceState(null, '', to);
  else history.pushState(null, '', to);
  window.dispatchEvent(new CustomEvent('sr:nav', { detail: { focus: !replace } }));
}
