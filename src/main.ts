// Roteador da aplicação. Cada página monta o <main> e devolve uma função de limpeza.
import './styles.css';
import { CODE_RE, normalizeCode } from '../shared/rules';
import { header, banner } from './lib/layout';
import { applyTheme } from './lib/theme';
import { store } from './lib/storage';
import { navigate } from './lib/nav';
import type { Theme } from '../shared/protocol';
import * as home from './pages/home';
import * as entrar from './pages/entrar';
import * as criar from './pages/criar';
import * as host from './pages/host';
import * as jogador from './pages/jogador';
import * as guias from './pages/guias';

export type Cleanup = (() => void) | void;
export interface Page {
  title: string;
  wide?: boolean;
  compact?: boolean; // cabeçalho sem navegação (tela da TV e do jogador)
  mount(main: HTMLElement): Cleanup;
}

function route(path: string): Page {
  const p = path.replace(/\/+$/, '') || '/';
  if (p === '/') return home.page();
  if (p === '/criar') return criar.page();
  if (p === '/entrar') return entrar.page();
  if (p === '/guias') return guias.lista();
  let m = /^\/guias\/([a-z0-9-]+)$/.exec(p);
  if (m) return guias.artigo(m[1]);
  m = /^\/host\/([A-Za-z0-9]{4})$/.exec(p);
  if (m && CODE_RE.test(normalizeCode(m[1]))) return host.page(normalizeCode(m[1]));
  m = /^\/([A-Za-z0-9]{4})$/.exec(p);
  if (m && CODE_RE.test(normalizeCode(m[1]))) return jogador.page(normalizeCode(m[1]));
  return naoEncontrada();
}

function naoEncontrada(): Page {
  return {
    title: 'Página não encontrada',
    mount(main) {
      main.innerHTML =
        '<section class="panel center"><h1>Ops</h1><p class="muted">Essa página não existe. Se você recebeu um código de sala, digite em “Entrar com código”.</p><a class="btn auto" href="/entrar" data-link>Entrar com código</a></section>';
    },
  };
}

let cleanup: Cleanup;

function render() {
  if (cleanup) cleanup();
  cleanup = undefined;
  banner('');
  // tema padrão do site: o último escolhido no editor
  applyTheme(store.get<Theme>('tema', 'festa'));
  const page = route(location.pathname);
  const main = document.getElementById('conteudo')!;
  main.className = page.wide ? 'wide' : '';
  header(location.pathname, page.compact);
  document.title = page.title === 'Quiddo' ? 'Quiddo · Quizz do seu jeito' : `${page.title} · Quiddo`;
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
