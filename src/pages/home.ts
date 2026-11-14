// Home: página de venda. Um objetivo só: levar a pessoa a criar o quiz.
// Tem uma pergunta de verdade para responder ali mesmo (com cronômetro, pontos e moedinhas)
// e telas de exemplo do jogo feitas com as mesmas peças da sala.
import type { Page } from '../main';
import type { RankRow } from '../../shared/protocol';
import { points } from '../../shared/rules';
import { TEMAS } from '../data/pacotes';
import type { Theme } from '../../shared/protocol';
import { store } from '../lib/storage';
import { LETRAS, esc, fmt } from '../lib/dom';
import { navigate } from '../lib/nav';
import { applyTheme } from '../lib/theme';
import { avatarSvg } from '../lib/avatar-art';
import { simbolo, OLHO } from '../lib/simbolos';
import { palco } from '../lib/podio';
import { MOEDA, coins, countUp } from './jogo-comum';
import { codeForm, bindCodeForm } from './jogar';
import { HOME, PAGINAS, beneficiosHtml, ocasioesHtml, passosHtml } from '../lib/paginas-html';

// pergunta de demonstração: a certa é a B
const DEMO = { t: 'Qual destes bichos é o símbolo do Quiddo?', o: ['Arara', 'Tucano', 'Capivara', 'Onça'], c: 1, tl: 10 };

const EXEMPLO: RankRow[] = [
  { id: 'a', nick: 'Bia', avatar: 'arara.coroa.-.4', score: 4120, delta: 960, rank: 1, prevRank: 2, streak: 3 },
  { id: 'b', nick: 'Leo', avatar: 'capivara.bone.-.1', score: 3980, delta: 0, rank: 2, prevRank: 1, streak: 0 },
  { id: 'c', nick: 'Duda', avatar: 'sapo.festa.-.7', score: 3410, delta: 880, rank: 3, prevRank: 4, streak: 1 },
];

const SALA = ['tucano.coroa.-.0', 'capivara.laranja.-.1', 'onca.-.escuros.2', 'sapo.festa.-.7', 'arara.flor.-.4', 'caramelo.bone.-.5', 'gato.-.coracao.6', 'coruja.cartola.-.3', 'jabuti.palha.-.8', 'boto.gorro.-.9', 'mico.fone.-.2', 'preguica.-.redondos.5'];
const NOMES = ['Ana', 'Leo', 'Duda', 'Bia', 'Caio', 'Gabi', 'Rafa', 'Teo', 'Lu', 'Nina', 'Davi', 'Malu'];

export function page(): Page {
  return {
    title: 'Quiddo',
    fullTitle: PAGINAS['/'].titulo,
    description: PAGINAS['/'].descricao,
    canonical: 'https://www.quiddo.com.br/',
    wide: true,
    mount(main) {
      // a home sempre usa o visual colorido do Quiddo
      applyTheme('festa');
      main.classList.add('home');
      main.innerHTML = `
        <section class="h-hero">
          <div class="h-texto">
            <span class="selo">${esc(HOME.selo)}</span>
            <h1>${esc(HOME.h1)}</h1>
            <p>${esc(HOME.intro)}</p>
            <a class="btn cta" href="/criar" data-link>Criar meu quiz grátis <span aria-hidden="true">→</span></a>
            <p class="h-mini">${esc(HOME.mini)}</p>
          </div>
          <div class="h-demo" id="demo" aria-labelledby="demo-t">
            <div class="demo-topo"><span class="pill">Experimente agora</span><span class="timer" aria-hidden="true">${OLHO}<b id="demo-tempo">10</b></span></div>
            <div class="bar" aria-hidden="true"><i id="demo-barra"></i></div>
            <h2 class="qt" id="demo-t">${esc(DEMO.t)}</h2>
            <div class="answers" role="group" aria-labelledby="demo-t">${DEMO.o
              .map((o, k) => `<button class="ans c${k}" data-demo="${k}">${simbolo(k)}<span class="lt">${LETRAS[k]}</span><span>${esc(o)}</span><span></span></button>`)
              .join('')}</div>
            <div class="demo-fim" id="demo-fim" role="status" aria-live="polite"></div>
          </div>
        </section>

        <section class="h-faixa" aria-label="Para quem é">
          <span>Aniversário</span><span>Convenção de vendas</span><span>Sala de aula</span><span>Chá bar</span><span>Natal em família</span><span>Treinamento</span><span>Churrasco</span>
        </section>

        <section class="h-bloco">
          <h2>Como funciona</h2>
          <ol class="h-passos">${passosHtml()}</ol>
          <a class="btn cta" href="/criar" data-link>Criar meu quiz grátis <span aria-hidden="true">→</span></a>
        </section>

        <section class="h-bloco">
          <h2>Do jeito que aparece na tela</h2>
          <div class="h-telas">
            <figure class="tela">
              <div class="tela-tv">
                <div class="contador"><b>12</b><span>pessoas na sala</span></div>
                <div class="h-sala">${SALA.map((a, i) => `<div>${avatarSvg(a, 44)}<span>${NOMES[i]}</span></div>`).join('')}</div>
              </div>
              <figcaption><b>A turma entra</b> e cada um vira um bicho do Brasil.</figcaption>
            </figure>
            <figure class="tela">
              <div class="tela-tv">
                <div class="rank">${EXEMPLO.map(
                  (r) =>
                    `<div><i>${r.rank}</i><span class="who">${avatarSvg(r.avatar, 30)}${esc(r.nick)}${r.prevRank > r.rank ? `<span class="up">▲${r.prevRank - r.rank}</span>` : ''}</span><em>${r.delta ? MOEDA + '+' + fmt(r.delta) : ''}</em><b>${fmt(r.score)}</b></div>`,
                ).join('')}</div>
              </div>
              <figcaption><b>Ranking a cada rodada,</b> com moedinhas e quem subiu.</figcaption>
            </figure>
            <figure class="tela">
              <div class="tela-tv tela-podio">${palco(EXEMPLO, 'festa')}</div>
              <figcaption><b>Pódio com suspense,</b> pronto para a foto do grupo.</figcaption>
            </figure>
          </div>
        </section>

        <section class="h-bloco">
          <h2>Três jeitos de jogar</h2>
          <p class="h-sub">Escolha o modo do seu evento. O visual do jogo você escolhe depois, no editor.</p>
          <div class="h-temas">${(Object.keys(TEMAS) as Theme[])
            .map(
              (k) =>
                `<a class="h-tema h-tema-${k}" href="/criar" data-link data-tema-novo="${k}"><span class="sw">${TEMAS[k].cores.map((c) => `<i style="background:${c}"></i>`).join('')}</span><b>${esc(TEMAS[k].nome)}</b><span>${esc(TEMAS[k].desc)}</span><em>${k === 'festa' ? 'Sem marca, com as cores do Quiddo' : 'Com nome, cor e logo da sua ' + (k === 'corp' ? 'empresa' : 'escola')}</em><strong>Criar neste modo →</strong></a>`,
            )
            .join('')}</div>
        </section>

        <section class="h-bloco">
          <h2>Por que a turma pede outra rodada</h2>
          <div class="h-beneficios">${beneficiosHtml()}</div>
        </section>

        <section class="h-bloco">
          <h2>Para qualquer ocasião</h2>
          <div class="h-casos">${ocasioesHtml()}</div>
        </section>

        <section class="h-final">
          <h2>${esc(HOME.final[0])}</h2>
          <p>${esc(HOME.final[1])}</p>
          <a class="btn cta claro" href="/criar" data-link>Criar meu quiz grátis <span aria-hidden="true">→</span></a>
          <div class="h-entrar"><p><b>Vai jogar?</b> Digite o código que aparece na tela.</p>${codeForm('home')}</div>
        </section>`;

      // ---------- pergunta de demonstração ----------
      let t0 = performance.now();
      let fim = false;
      let raf = 0;
      const total = DEMO.tl * 1000;
      const tempo = main.querySelector<HTMLElement>('#demo-tempo')!;
      const barra = main.querySelector<HTMLElement>('#demo-barra')!;
      const caixa = main.querySelector<HTMLElement>('#demo-fim')!;
      const roda = () => {
        if (fim) return;
        const left = Math.max(0, total - (performance.now() - t0));
        tempo.textContent = String(Math.ceil(left / 1000));
        barra.style.transform = `scaleX(${left / total})`;
        if (left <= 0) return responder(-1);
        raf = requestAnimationFrame(roda);
      };
      const responder = (k: number) => {
        if (fim) return;
        fim = true;
        cancelAnimationFrame(raf);
        const ms = performance.now() - t0;
        const ok = k === DEMO.c;
        const pts = ok ? points(ms, DEMO.tl) : 0;
        main.querySelectorAll<HTMLButtonElement>('[data-demo]').forEach((b, i) => {
          b.disabled = true;
          b.classList.add(i === DEMO.c ? 'ok' : 'dim');
        });
        caixa.innerHTML = ok
          ? `<div class="verdict ok">Mandou bem!</div><p class="placar"><span class="ganho" id="demo-ganho">${MOEDA}+${fmt(pts)}</span> <b class="meus-pts" id="demo-pts">${fmt(pts)}</b> pontos</p><p class="small">Respondeu em ${(ms / 1000).toFixed(1).replace('.', ',')} s. Imagina isso com a sua turma.</p>`
          : `<div class="verdict no">${k < 0 ? 'O tempo acabou!' : 'Quase!'}</div><p class="small">É o tucano, com o olho que virou o "o" do Quiddo.</p>`;
        caixa.insertAdjacentHTML('beforeend', `<div class="demo-acoes"><a class="btn" href="/criar" data-link>Criar o meu</a><button class="btn sec" data-demo="de-novo">Jogar de novo</button></div>`);
        if (ok) {
          const g = main.querySelector('#demo-ganho');
          const p = main.querySelector<HTMLElement>('#demo-pts');
          if (g && p) {
            countUp(p, 0, pts, 300, 900);
            coins(g, p, 6, 150);
          }
        }
      };
      const deNovo = () => {
        fim = false;
        t0 = performance.now();
        caixa.innerHTML = '';
        main.querySelectorAll<HTMLButtonElement>('[data-demo]').forEach((b) => {
          b.disabled = false;
          b.classList.remove('ok', 'dim');
        });
        raf = requestAnimationFrame(roda);
      };
      // o cronômetro só começa quando a pergunta aparece na tela
      const demo = main.querySelector('#demo')!;
      const io = new IntersectionObserver((es) => {
        if (es.some((e) => e.isIntersecting)) {
          io.disconnect();
          deNovo();
        }
      });
      io.observe(demo);

      const onClick = (e: Event) => {
        // modo escolhido na vitrine: o editor abre com ele
        const t = (e.target as HTMLElement).closest<HTMLElement>('[data-tema-novo]');
        if (t) store.set('temaNovo', t.dataset.temaNovo);
        const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-demo]');
        if (!b || b.disabled) return;
        if (b.dataset.demo === 'de-novo') return deNovo();
        responder(Number(b.dataset.demo));
      };
      main.addEventListener('click', onClick);
      const unbind = bindCodeForm(main, (code) => navigate('/' + code));
      return () => {
        fim = true;
        cancelAnimationFrame(raf);
        io.disconnect();
        main.removeEventListener('click', onClick);
        unbind();
        main.classList.remove('home');
      };
    },
  };
}
