import type { Page } from '../main';
import type { Theme } from '../../shared/protocol';
import { TEMAS } from '../data/pacotes';
import { GUIAS } from '../data/guias';
import { esc } from '../lib/dom';
import { navigate } from '../lib/nav';
import { store } from '../lib/storage';
import { applyTheme } from '../lib/theme';
import { codeForm, bindCodeForm } from './entrar';
import { avatarSvg } from '../lib/avatar-art';

export function page(): Page {
  return {
    title: 'Quiddo',
    mount(main) {
      const tema = store.get<Theme>('tema', 'festa');
      const temas = (Object.keys(TEMAS) as Theme[])
        .map((k) => {
          const t = TEMAS[k];
          return `<button class="tema" data-tema="${k}" aria-pressed="${k === tema}"><span class="sw">${t.cores.map((c) => `<i style="background:${c}"></i>`).join('')}</span><b>${esc(t.nome)}</b><span>${esc(t.desc)}</span></button>`;
        })
        .join('');
      const guias = GUIAS.filter((g) => g.corpo)
        .slice(0, 3)
        .map((g) => `<a href="/guias/${g.slug}" data-link><b>${esc(g.titulo)}</b><span>${esc(g.resumo)}</span></a>`)
        .join('');
      main.innerHTML = `
        <section class="hero">
          <img class="marca" src="/marca/quiddo-cor-slogan.svg" alt="Quiddo, Quizz do seu jeito" width="440" height="190">
          <div class="bichos" aria-hidden="true">${['tucano.coroa.-.0', 'capivara.laranja.-.1', 'onca.-.escuros.2', 'perereca.festa.-.7', 'arara.flor.-.4', 'caramelo.bone.-.5'].map((a) => avatarSvg(a, 56)).join('')}</div>
          <h1>Monte o seu quiz e jogue ao vivo com a turma</h1>
          <p>Você escreve as perguntas, abre uma sala e todo mundo joga pelo celular, cada um com o seu bicho. Quem acerta mais rápido ganha mais pontos, e o ranking aparece depois de cada pergunta.</p>
          <div class="btnrow"><a class="btn" href="/criar" data-link>Criar meu quiz</a><a class="btn sec" href="/entrar" data-link>Entrar com código</a></div>
        </section>
        <section class="panel">
          <h2>Como funciona</h2>
          <ol class="steps">
            <li><div><b>Crie o quiz.</b> Escolha o tema, escreva ou ajuste as perguntas e coloque a marca da empresa ou o nome da festa.</div></li>
            <li><div><b>Abra a sala na TV.</b> Aparece um código e um QR. A turma entra pelo celular, sem cadastro e sem baixar nada.</div></li>
            <li><div><b>Jogue.</b> Cada pergunta aparece na tela e nos celulares ao mesmo tempo. Ranking a cada rodada, pódio no fim e sorteio de prêmios.</div></li>
          </ol>
        </section>
        <section class="panel">
          <h2>Dois jeitos de jogar</h2>
          <div class="temas" role="group" aria-label="Tema">${temas}</div>
          <p class="small">Toque num tema para ver como fica. Cada um vem com um pacote de perguntas pronto para editar.</p>
          <a class="btn auto" href="/criar" data-link>Começar com este tema</a>
        </section>
        <section class="panel">
          <h2>Vai jogar?</h2>
          ${codeForm('home')}
        </section>
        ${guias ? `<section class="panel"><h2>Ideias e guias</h2><div class="guias">${guias}<a href="/guias" data-link><b>Ver todos os guias</b><span>Empresas, escolas, eventos e festas</span></a></div></section>` : ''}`;
      const onClick = (e: Event) => {
        const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-tema]');
        if (!b) return;
        const t = b.dataset.tema as Theme;
        store.set('tema', t);
        applyTheme(t);
        main.querySelectorAll('[data-tema]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      };
      main.addEventListener('click', onClick);
      const unbind = bindCodeForm(main, (code) => navigate('/' + code));
      return () => {
        main.removeEventListener('click', onClick);
        unbind();
      };
    },
  };
}
