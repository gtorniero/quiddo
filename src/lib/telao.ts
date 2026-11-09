// Telão no celular: quando o anfitrião espelha o celular na TV (AirPlay, Chromecast, cabo),
// o celular deitado é estreito demais para o layout do telão e tudo fica gigante.
// Com o celular deitado, a página passa a ser desenhada com 1280 px de largura e o navegador
// reduz para caber na tela: na TV fica igual a um computador ligado nela.
// Em pé, nada muda (o anfitrião ainda está mexendo no celular), só aparece a dica para deitar.
const LARGURA_TELAO = 1280;
const PADRAO = 'width=device-width, initial-scale=1, viewport-fit=cover';

/** É celular? Pelo lado menor da tela física (não muda quando o viewport muda). */
export function ehCelular(sw = screen.width, sh = screen.height) {
  return Math.min(sw, sh) < 600;
}

/** Viewport certo para o telão neste aparelho e nesta posição. */
export function viewportTelao(celular: boolean, deitado: boolean) {
  return celular && deitado ? `width=${LARGURA_TELAO}, viewport-fit=cover` : PADRAO;
}

/** Liga o ajuste do telão; devolve a função que desliga. */
export function ligarTelao(): () => void {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  const original = meta?.content || PADRAO;
  const html = document.documentElement;
  const deitado = matchMedia('(orientation: landscape)');
  const aplicar = () => {
    const celular = ehCelular();
    const conteudo = viewportTelao(celular, deitado.matches);
    if (meta && meta.content !== conteudo) meta.content = conteudo;
    html.classList.toggle('telao-celular', celular && deitado.matches);
    html.classList.toggle('telao-em-pe', celular && !deitado.matches);
  };
  aplicar();
  deitado.addEventListener('change', aplicar);
  return () => {
    deitado.removeEventListener('change', aplicar);
    if (meta) meta.content = original;
    html.classList.remove('telao-celular', 'telao-em-pe');
  };
}

/** Tela cheia de verdade existe? (Android, computador e iPad sim; iPhone não.) */
export function temTelaCheia() {
  const d = document as Document & { webkitFullscreenEnabled?: boolean };
  return !!(document.fullscreenEnabled || d.webkitFullscreenEnabled);
}

export function emTelaCheia() {
  const d = document as Document & { webkitFullscreenElement?: Element };
  return !!(document.fullscreenElement || d.webkitFullscreenElement);
}

export function pedirTelaCheia(on: boolean) {
  const d = document as Document & { webkitExitFullscreen?: () => void };
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
  try {
    if (on && !emTelaCheia()) {
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
      else el.webkitRequestFullscreen?.();
    }
    if (!on && emTelaCheia()) {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else d.webkitExitFullscreen?.();
    }
  } catch {}
}

/** Já está aberto como app (pela tela de início), sem a barra do navegador? */
export function abertoComoApp() {
  return matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Chave do anfitrião que veio no endereço (#k=…), para quem abriu pelo ícone da tela de início. */
export function chaveDoEndereco(hash = location.hash): string {
  const m = /(?:^#|&)k=([A-Za-z0-9_-]{8,128})/.exec(hash);
  return m ? m[1] : '';
}
