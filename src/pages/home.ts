// Home: página de venda. Um objetivo só: levar a pessoa a criar o quiz.
// Tem uma pergunta de verdade para responder ali mesmo (com cronômetro, pontos e moedinhas)
// e telas de exemplo do jogo feitas com as mesmas peças da sala.
import type { Page } from '../main';
import type { RankRow } from '../../shared/protocol';
import { points } from '../../shared/rules';
import { GUIAS } from '../data/guias';
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
import { codeForm, bindCodeForm } from './entrar';

// pergunta de demonstração: a certa é a B
const DEMO = { t: 'Qual destes bichos é o símbolo do Quiddo?', o: ['Arara', 'Tucano', 'Capivara', 'Onça'], c: 1, tl: 10 };

const EXEMPLO: RankRow[] = [
  { id: 'a', nick: 'Bia', avatar: 'arara.coroa.-.4', score: 4120, delta: 960, rank: 1, prevRank: 2 },
  { id: 'b', nick: 'Leo', avatar: 'capivara.bone.-.1', score: 3980, delta: 0, rank: 2, prevRank: 1 },
  { id: 'c', nick: 'Duda', avatar: 'sapo.festa.-.7', score: 3410, delta: 880, rank: 3, prevRank: 4 },
];

const SALA = ['tucano.coroa.-.0', 'capivara.laranja.-.1', 'onca.-.escuros.2', 'sapo.festa.-.7', 'arara.flor.-.4', 'caramelo.bone.-.5', 'gato.-.coracao.6', 'coruja.cartola.-.3', 'jabuti.palha.-.8', 'boto.gorro.-.9', 'mico.fone.-.2', 'preguica.-.redondos.5'];
const NOMES = ['Ana', 'Leo', 'Duda', 'Bia', 'Caio', 'Gabi', 'Rafa', 'Teo', 'Lu', 'Nina', 'Davi', 'Malu'];

export function page(): Page {
  return {
    title: 'Quiddo',
    wide: true,
    mount(main) {
      // a home sempre usa o visual colorido do Quiddo
      applyTheme('festa');
      const guias = [
        ['festas', 'Festa e aniversário', 'Quem conhece melhor o aniversariante, Natal em família, churrasco.'],
        ['empresas', 'Empresa e evento', 'Convenção, integração, treinamento e o fim da palestra chata.'],
        ['escola', 'Sala de aula', 'Revisão para prova que a turma pede para repetir.'],
        ['casamento', 'Chá bar e despedida', 'Quem conhece melhor o casal, com pódio para a foto.'],
      ]
        .map(([pub, t, d]) => {
          const g = GUIAS.find((x) => x.publico === pub && x.corpo);
          return `<a class="caso" href="${g ? '/guias/' + g.slug : '/guias'}" data-link><b>${esc(t)}</b><span>${esc(d)}</span><em>Ver ideias →</em></a>`;
        })
        .join('');

      main.classList.add('home');
      main.innerHTML = `
        <section class="h-hero">
          <div class="h-texto">
            <span class="selo">Grátis · sem cadastro · pronto em 2 minutos</span>
            <h1>Crie o seu quiz e jogue ao vivo com a turma toda.</h1>
            <p>Escreva as suas perguntas, mostre a sala no telão, no projetor ou no computador, e a turma joga pelo celular. Quem acerta mais rápido ganha mais pontos, o ranking sobe a cada rodada e o pódio vira foto.</p>
            <a class="btn cta" href="/criar" data-link>Criar meu quiz grátis <span aria-hidden="true">→</span></a>
            <p class="h-mini">Funciona em qualquer celular, sem baixar app. Até 200 pessoas por sala.</p>
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
          <ol class="h-passos">
            <li><span class="n">1</span><b>Escreva as perguntas</b><p>Múltipla escolha, verdadeiro ou falso, enquete ou "quem é mais provável". Dá para pôr imagem e a sua marca.</p></li>
            <li><span class="n">2</span><b>Abra a sala na tela principal</b><p>No telão, no projetor ou no computador aparecem um código e um QR. A turma entra pelo celular, escolhe um bicho e um apelido.</p></li>
            <li><span class="n">3</span><b>Joguem juntos</b><p>A pergunta aparece em todas as telas ao mesmo tempo. Ranking a cada rodada, pódio e sorteio no fim.</p></li>
          </ol>
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
          <p class="h-sub">O tema muda as cores da tela e dos celulares. Você escolhe no editor e troca quando quiser.</p>
          <div class="h-temas">${(Object.keys(TEMAS) as Theme[])
            .map(
              (k) =>
                `<a class="h-tema h-tema-${k}" href="/criar" data-link data-tema-novo="${k}"><span class="sw">${TEMAS[k].cores.map((c) => `<i style="background:${c}"></i>`).join('')}</span><b>${esc(TEMAS[k].nome)}</b><span>${esc(TEMAS[k].desc)}</span><em>${k === 'festa' ? 'Sem marca, com as cores do Quiddo' : 'Com nome, cor e logo da sua ' + (k === 'corp' ? 'empresa' : 'escola')}</em><strong>Criar com este tema →</strong></a>`,
            )
            .join('')}</div>
        </section>

        <section class="h-bloco">
          <h2>Por que a turma pede outra rodada</h2>
          <div class="h-beneficios">
            <div><b>Rapidez vale ponto</b><p>De 500 a 1.000 por acerto. Quem responde primeiro sobe no ranking.</p></div>
            <div><b>A última vale o dobro</b><p>Chance de virada no fim, para ninguém desistir.</p></div>
            <div><b>Personagens</b><p>20 bichos do Brasil com boné, coroa, óculos e mais. Cada um monta o seu.</p></div>
            <div><b>Sorteio de prêmios</b><p>Entre todos ou só entre quem pontuou, com roleta no telão.</p></div>
            <div><b>Sua marca</b><p>Nome, cor e logo da empresa ou da escola na tela e nos celulares.</p></div>
            <div><b>Até 200 pessoas</b><p>Sem cadastro e sem app. Abre no navegador de qualquer celular.</p></div>
          </div>
        </section>

        <section class="h-bloco">
          <h2>Para qualquer ocasião</h2>
          <div class="h-casos">${guias}</div>
        </section>

        <section class="h-final">
          <h2>Seu primeiro quiz fica pronto antes do café esfriar.</h2>
          <p>Já vem com perguntas de exemplo para você trocar pelas suas.</p>
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
        // tema escolhido na vitrine: o editor abre com ele
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
