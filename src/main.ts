// Roteador da aplicação. Cada página monta o <main> e devolve uma função de limpeza.
import './styles.css';
import { seoHead } from '../shared/seo';
import { CODE_RE, normalizeCode } from '../shared/rules';
import { header, banner } from './lib/layout';
import { applyTheme } from './lib/theme';
import { store } from './lib/storage';
import { navigate } from './lib/nav';
import type { Theme } from '../shared/protocol';

export type Cleanup = (() => void) | void;
export interface Page {
  title: string;
  wide?: boolean;
  compact?: boolean; // cabeçalho sem navegação (tela da TV e do jogador)
  mount(main: HTMLElement): Cleanup;
}

async function route(path: string): Promise<Page> {
  const p = path.replace(/\/+$/, '') || '/';
  if (p === '/') return (await import('./pages/home')).page();
  if (p === '/criar') return (await import('./pages/criar')).page();
  // /entrar fica para o login com conta, no futuro; por enquanto leva ao mesmo lugar, para links antigos
  if (p === '/jogar' || p === '/entrar') return (await import('./pages/jogar')).page();
  if (p === '/guias') return (await import('./pages/guias')).lista();
  let m = /^\/guias\/([a-z0-9-]+)$/.exec(p);
  if (m) return (await import('./pages/guias')).artigo(m[1]);
  m = /^\/host\/([A-Za-z0-9]{4})$/.exec(p);
  if (m && CODE_RE.test(normalizeCode(m[1]))) return (await import('./pages/host')).page(normalizeCode(m[1]));
  m = /^\/([A-Za-z0-9]{4})$/.exec(p);
  if (m && CODE_RE.test(normalizeCode(m[1]))) return (await import('./pages/jogador')).page(normalizeCode(m[1]));
  return naoEncontrada();
}

function naoEncontrada(): Page {
  return {
    title: 'Página não encontrada',
    mount(main) {
      main.innerHTML =
        '<section class="panel center"><h1>Ops</h1><p class="muted">Essa página não existe. Se você recebeu um código de sala, digite em “Jogar com código”.</p><a class="btn auto" href="/jogar" data-link>Jogar com código</a></section>';
    },
  };
}

let cleanup: Cleanup;

let renderVersion = 0;
async function render() {
  const version = ++renderVersion;
  const page = await route(location.pathname);
  if (version !== renderVersion) return;
  if (cleanup) cleanup();
  cleanup = undefined;
  banner('');
  // tema padrão do site: o último escolhido no editor
  applyTheme(store.get<Theme>('tema', 'festa'));
  const main = document.getElementById('conteudo')!;
  main.className = page.wide ? 'wide' : '';
  header(location.pathname, page.compact);
  document.querySelectorAll('title, meta[name="description"], meta[name="robots"], meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"], #seo-schema').forEach(el => el.remove());
  const metadata = new DOMParser().parseFromString(seoHead(location.pathname.replace(/\/+$/, '') || '/'), 'text/html');
  for (const el of Array.from(metadata.head.children)) document.head.appendChild(el);
  if (!document.querySelector('link[rel="canonical"]')) document.title = `${page.title} · Quiddo`;
  main.innerHTML = '';
  cleanup = page.mount(main);
}

window.addEventListener('sr:nav', (e) => {
  render();
  window.scrollTo(0, 0);
  // leva o foco para o conteúdo, para leitor de tela anunciar a página nova
  if ((e as CustomEvent).detail.focus) document.getElementById('conteudo')!.focus({ preventScroll: true });
});

document.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-link]');
  if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  navigate(a.getAttribute('href')!);
});
window.addEventListener('popstate', render);
render();
