// Roteador da aplicação. Cada página monta o <main> e devolve uma função de limpeza.
import './styles.css';
import { initMeasurement, measurePage, track } from './lib/measurement';
import { publicPath } from './lib/measurement-policy';
import * as privacidade from './pages/privacidade';
import { lembraOrigem } from './lib/origem';

// o endereço provisório da Cloudflare leva para o domínio oficial, no mesmo caminho
if (location.hostname.endsWith('.workers.dev')) location.replace(`https://www.quiddo.com.br${location.pathname}${location.search}`);
import { CODE_RE, normalizeCode } from '../shared/rules';
import { header, banner } from './lib/layout';
import { applyTheme } from './lib/theme';
import { store } from './lib/storage';
import { navigate } from './lib/nav';
import type { Theme } from '../shared/protocol';
import * as home from './pages/home';
import * as jogar from './pages/jogar';
import * as criar from './pages/criar';
import * as host from './pages/host';
import * as jogador from './pages/jogador';
import * as pagar from './pages/pagar';
import * as guias from './pages/guias';
import * as precos from './pages/precos';
import * as entrar from './pages/entrar';
import * as conta from './pages/conta';
import { logado, sincronizaConta } from './lib/conta';

export type Cleanup = (() => void) | void;
export interface Page {
  title: string;
  wide?: boolean;
  compact?: boolean; // cabeçalho sem navegação (tela da TV e do jogador)
  fullTitle?: string; // <title> completo para buscadores (senão, "título · Quiddo")
  description?: string; // meta description da página (senão, a do site)
  canonical?: string; // endereço oficial da página, para buscadores
  noindex?: boolean; // conta, login, telas de partida e páginas inexistentes ficam fora da busca
  mount(main: HTMLElement): Cleanup;
}

function route(path: string): Page {
  const p = path.replace(/\/+$/, '') || '/';
  if (p === '/') return home.page();
  if (p === '/privacidade') return privacidade.page();
  if (p === '/criar') return criar.page();
  if (p === '/jogar') return jogar.page();
  if (p === '/entrar') return entrar.page();
  if (p === '/conta') return conta.page();
  if (p === '/guias') return guias.lista();
  if (p === '/precos') return precos.page();
  let m = /^\/guias\/([a-z0-9-]+)$/.exec(p);
  if (m) return guias.artigo(m[1]);
  m = /^\/pagar\/([A-Za-z0-9]{4})$/.exec(p);
  if (m && CODE_RE.test(normalizeCode(m[1]))) return pagar.page(normalizeCode(m[1]));
  m = /^\/host\/([A-Za-z0-9]{4})$/.exec(p);
  if (m && CODE_RE.test(normalizeCode(m[1]))) return host.page(normalizeCode(m[1]));
  m = /^\/([A-Za-z0-9]{4})$/.exec(p);
  if (m && CODE_RE.test(normalizeCode(m[1]))) return jogador.page(normalizeCode(m[1]));
  return naoEncontrada();
}

function naoEncontrada(): Page {
  return {
    title: 'Página não encontrada',
    noindex: true,
    mount(main) {
      main.innerHTML =
        '<section class="panel center"><h1>Ops</h1><p class="muted">Essa página não existe. Se você recebeu um código de sala, digite em “Jogar com código”.</p><a class="btn auto" href="/jogar" data-link>Jogar com código</a></section>';
    },
  };
}

// descrição e endereço oficial acompanham a navegação (o pré-render já traz os certos na primeira carga)
// igual à do index.html (não dá para ler do HTML: numa página pré-renderizada ela é a do guia)
const DESCRICAO_PADRAO =
  'Crie um quiz com as suas perguntas, abra uma sala e jogue ao vivo com todo mundo pelo celular. Ranking a cada pergunta, pódio e sorteio de prêmios.';
function metas(page: Page) {
  const desc = page.description ?? DESCRICAO_PADRAO;
  for (const sel of ['meta[name="description"]', 'meta[property="og:description"]']) document.querySelector<HTMLMetaElement>(sel)?.setAttribute('content', desc);
  document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.setAttribute('content', document.title);
  let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (page.noindex) {
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    robots.content = 'noindex';
  } else robots?.remove();
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (page.canonical) {
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = page.canonical;
  } else link?.remove();
  document.querySelector('meta[property="og:url"]')?.remove();
  // dados estruturados do pré-render valem só para a página em que se entrou
  if (primeira) primeira = false;
  else document.querySelectorAll('script[type="application/ld+json"]').forEach((el) => el.remove());
}
let primeira = true;

let cleanup: Cleanup;

function render() {
  if (cleanup) cleanup();
  cleanup = undefined;
  banner('');
  // tema padrão do site: o último escolhido no editor
  applyTheme(store.get<Theme>('tema', 'festa'));
  const page = route(location.pathname);
  const main = document.getElementById('conteudo')!;
  // telas de jogo (TV, celular do jogador, pagar a sala) ocupam a tela toda: o rodapé fica abaixo da dobra
  main.className = (page.wide ? 'wide' : '') + (page.compact ? ' jogo' : '');
  header(location.pathname, page.compact);
  document.title = page.fullTitle || (page.title === 'Quiddo' ? 'Quiddo · Quizz do seu jeito' : `${page.title} · Quiddo`);
  metas(page);
  main.innerHTML = '';
  measurePage(location.pathname);
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
  const destination = publicPath(new URL(a.href, location.origin).pathname);
  if (destination) void track('navigation', {destination});
  navigate(a.getAttribute('href')!);
});
window.addEventListener('popstate', render);
lembraOrigem();
initMeasurement();
render();
// quem entrou na conta traz o plano comprado em outro aparelho (a página de conta faz isso sozinha)
if (logado() && location.pathname !== '/conta') sincronizaConta();

if (import.meta.env.DEV) {
 const testBadge=document.createElement('aside');testBadge.textContent='TESTE LOCAL · dados fictícios · nada é cobrado';testBadge.style.cssText='position:fixed;bottom:8px;right:8px;background:#ffe092;color:#16392e;padding:8px 14px;border:2px solid #16392e;border-radius:12px;z-index:9999;font:13px system-ui';document.body.appendChild(testBadge);
}

window.addEventListener('qd:account', () => header(location.pathname, route(location.pathname).compact));
