// Textos e metadados das páginas públicas. Usado pelo site e pelo pré-render (scripts/prerender.mjs),
// para o robô de busca ver o mesmo conteúdo sem JavaScript. Não pode mexer no DOM: roda também no Node.
import { SUBSCRIPTION_AI_CREDITS } from '../../shared/ai-credits.mjs';
import { PRECOS, reais as emReais } from '../../shared/precos.mjs';
import { GUIAS } from '../data/guias';
import { TEMAS } from '../data/pacotes';
import type { Theme } from '../../shared/protocol';
import { esc } from './dom';
import { SITE } from './guias-html';

export interface PaginaSeo {
  titulo: string; // <title> completo, com a busca principal antes da marca (até ~60 caracteres)
  descricao: string; // meta description (até ~155 caracteres)
  atualizado: string; // AAAA-MM-DD, vai para o sitemap
}

// preço curto para texto corrido: sem ",00" no fim
const curto = (v: string) => emReais(v).replace(/,00$/, '');

/** Atualize a data quando o texto da página mudar. */
export const PAGINAS: Record<'/' | '/criar' | '/jogar' | '/precos' | '/privacidade', PaginaSeo> = {
  '/': {
    titulo: 'Quiz ao vivo para grupos, grátis no celular · Quiddo',
    descricao: 'Crie um quiz com as suas perguntas, abra uma sala e jogue ao vivo com todo mundo pelo celular. Ranking a cada pergunta, pódio e sorteio de prêmios.',
    atualizado: '2026-11-14',
  },
  '/criar': {
    titulo: 'Criar quiz online grátis para jogar ao vivo · Quiddo',
    descricao: 'Monte o seu quiz em minutos: perguntas de múltipla escolha ou verdadeiro ou falso, imagens, modo do evento e visual do jogo. Grátis até 10 pessoas.',
    atualizado: '2026-11-14',
  },
  '/jogar': {
    titulo: 'Jogar quiz com o código da sala · Quiddo',
    descricao: 'Digite o código de 4 letras que aparece na tela do anfitrião e entre no quiz pelo celular, sem cadastro e sem baixar app.',
    atualizado: '2026-11-14',
  },
  '/precos': {
    titulo: 'Planos e preços do quiz ao vivo · Quiddo',
    descricao: `Grátis até 10 pessoas. Premium (Anual R$ ${curto(PRECOS.anual)} ou Mensal R$ ${curto(PRECOS.mensal)}) ou Passe 7 dias de R$ ${curto(PRECOS.semana)}: até 200 pessoas e a sua marca.`,
    atualizado: '2026-11-14',
  },
  '/privacidade': {
    titulo: 'Privacidade e cookies · Quiddo',
    descricao: 'O que o Quiddo guarda, o que mede com o seu aceite, com quem compartilha e como mudar a sua escolha de cookies a qualquer momento.',
    atualizado: '2026-11-14',
  },
};

// ---------- home ----------

export const HOME = {
  selo: 'Grátis até 10 pessoas · sem cadastro',
  h1: 'Crie o seu quiz e jogue ao vivo com a turma toda.',
  intro: 'Escreva as suas perguntas, mostre a sala no telão, no projetor ou no computador, e a turma joga pelo celular. Quem acerta mais rápido ganha mais pontos, o ranking sobe a cada rodada e o pódio vira foto.',
  mini: 'Funciona no celular, sem baixar app. Grátis até 10 pessoas; nos planos, até 200 e com a sua marca.',
  passos: [
    ['Escreva as perguntas', 'Múltipla escolha ou verdadeiro ou falso, com imagem se quiser.'],
    ['Abra a sala na tela principal', 'No telão, no projetor ou no computador aparecem um código e um QR. A turma entra pelo celular, escolhe um bicho e um apelido.'],
    ['Joguem juntos', 'A pergunta aparece em todas as telas ao mesmo tempo. Ranking a cada rodada, pódio e sorteio no fim.'],
  ],
  beneficios: [
    ['Rapidez vale ponto', 'De 500 a 1.000 por acerto. Quem responde primeiro sobe no ranking.'],
    ['A última vale o dobro', 'Chance de virada no fim, para ninguém desistir.'],
    ['Personagens', '20 bichos do Brasil com boné, coroa, óculos e mais. Cada um monta o seu.'],
    ['Sorteio de prêmios', 'Entre todos ou só entre quem pontuou, com roleta no telão.'],
    ['Sua marca', 'Logo e cor da empresa ou da escola na tela e nos celulares, no Passe e no Premium.'],
    ['Até 200 pessoas nos planos pagos', 'Até 10 no gratuito. A turma entra pelo navegador, sem cadastro e sem app.'],
  ],
  ocasioes: [
    ['festas', 'Festa e aniversário', 'Quem conhece melhor o aniversariante, Natal em família, churrasco.'],
    ['empresas', 'Empresa e evento', 'Convenção, integração, treinamento e o fim da palestra chata.'],
    ['escola', 'Sala de aula', 'Revisão para prova que a turma pede para repetir.'],
    ['casamento', 'Chá bar e despedida', 'Quem conhece melhor o casal, com pódio para a foto.'],
  ],
  final: ['Seu primeiro quiz fica pronto antes do café esfriar.', 'Já vem com perguntas de exemplo para você trocar pelas suas.'],
} as const;

export const passosHtml = () =>
  HOME.passos.map(([t, d], i) => `<li><span class="n">${i + 1}</span><b>${esc(t)}</b><p>${esc(d)}</p></li>`).join('');
export const beneficiosHtml = () => HOME.beneficios.map(([t, d]) => `<div><b>${esc(t)}</b><p>${esc(d)}</p></div>`).join('');
export const ocasioesHtml = () =>
  HOME.ocasioes
    .map(([pub, t, d]) => {
      const g = GUIAS.find((x) => x.publico === pub && x.corpo);
      return `<a class="caso" href="${g ? '/guias/' + g.slug : '/guias'}" data-link><b>${esc(t)}</b><span>${esc(d)}</span><em>Ver ideias →</em></a>`;
    })
    .join('');

/** Versão estática da home (sem a pergunta de demonstração e as telas animadas). */
export function homeHtml() {
  const temas = (Object.keys(TEMAS) as Theme[]).map((k) => `<li><b>${esc(TEMAS[k].nome)}</b>: ${esc(TEMAS[k].desc)}</li>`).join('');
  return `<section class="h-hero"><div class="h-texto"><span class="selo">${esc(HOME.selo)}</span><h1>${esc(HOME.h1)}</h1><p>${esc(HOME.intro)}</p>
      <a class="btn cta" href="/criar" data-link>Criar meu quiz grátis</a><p class="h-mini">${esc(HOME.mini)}</p></div></section>
    <section class="h-bloco"><h2>Como funciona</h2><ol class="h-passos">${passosHtml()}</ol></section>
    <section class="h-bloco"><h2>Três jeitos de jogar</h2><ul>${temas}</ul></section>
    <section class="h-bloco"><h2>Por que a turma pede outra rodada</h2><div class="h-beneficios">${beneficiosHtml()}</div></section>
    <section class="h-bloco"><h2>Para qualquer ocasião</h2><div class="h-casos">${ocasioesHtml()}</div><p><a href="/guias" data-link>Ver todos os guias e perguntas prontas</a> · <a href="/precos" data-link>Ver os planos</a></p></section>
    <section class="h-final"><h2>${esc(HOME.final[0])}</h2><p>${esc(HOME.final[1])}</p><a class="btn cta claro" href="/criar" data-link>Criar meu quiz grátis</a><p><b>Vai jogar?</b> <a href="/jogar" data-link>Digite o código que aparece na tela</a>.</p></section>`;
}

/** Versão estática do editor: o que dá para fazer nele (o editor de verdade precisa de JavaScript). */
export function criarHtml() {
  return `<section class="panel prose"><h1>Criar meu quiz</h1>
    <p>Monte o seu quiz ao vivo em poucos minutos, de graça e sem cadastro. Escolha o modo do evento (Corporativo, Amigos & família ou Escola), o visual do jogo e o tempo de cada pergunta, escreva perguntas de múltipla escolha ou de verdadeiro ou falso e abra a sala.</p>
    <ol><li>${esc(HOME.passos[0][1])}</li><li>${esc(HOME.passos[1][1])}</li><li>${esc(HOME.passos[2][1])}</li></ol>
    <p>A sala grátis vai até 10 pessoas. Para turmas maiores, veja os <a href="/precos" data-link>planos para até 200 pessoas</a>. Precisa de ideias? Use as <a href="/guias" data-link>perguntas prontas dos guias</a>.</p></section>`;
}

export function jogarHtml() {
  return `<section class="panel"><h1>Jogar</h1><p class="muted">Digite o código que aparece na tela do anfitrião.</p>
    <p>O código tem 4 letras ou números e aparece no telão, no projetor ou no computador de quem abriu a sala. Você entra pelo celular, escolhe um bicho e um apelido, sem cadastro e sem baixar app.</p>
    <p>Quer fazer o seu? <a href="/criar" data-link>Crie um quiz grátis</a>.</p></section>`;
}

// ---------- planos ----------

export type PlanoPreco = 'mensal' | 'anual' | 'semana';
/** Preços de shared/precos.mjs no formato da página, com vírgula. O servidor manda os mesmos em /api/cobranca. */
export const PRECOS_PADRAO: Record<PlanoPreco | 'oferta', string> = { mensal: emReais(PRECOS.mensal), anual: emReais(PRECOS.anual), semana: emReais(PRECOS.semana), oferta: emReais(PRECOS.oferta) };
const num = (v: string) => Number(v.replace(',', '.'));
const reais = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ','));
const semCentavos = (v: string) => v.replace(/,00$/, '');

export interface PrecosEstado {
  preco: (p: PlanoPreco) => string; // com vírgula, ex.: "10,50"
  temAnual: boolean;
  periodo: 'anual' | 'mensal';
  ligado: boolean; // cobrança de verdade (texto de "Como eu pago?")
}
export const estadoPadrao = (): PrecosEstado => ({ preco: (p) => PRECOS_PADRAO[p], temAnual: true, periodo: 'anual', ligado: true });

/** Quanto o Anual economiza em relação a 12 meses do Mensal, em %. */
export const economia = (e: PrecosEstado) => Math.round((1 - num(e.preco('anual')) / (12 * num(e.preco('mensal')))) * 100);
/** Valor mensal equivalente do Anual, em reais ("13"). */
export const anualPorMes = (e: PrecosEstado) => reais(num(e.preco('anual')) / 12);

const OK = '<span class="pc-ok" aria-hidden="true">✓</span>';
const IA =
  '<span class="pc-ok" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M9 2 11.5 8.5 18 11 11.5 13.5 9 20 6.5 13.5 0 11 6.5 8.5Z M19 1 20.3 4.7 24 6 20.3 7.3 19 11 17.7 7.3 14 6 17.7 4.7Z"/></svg></span>';
// o número de pessoas por sala é o que diferencia os planos: vem grande, logo abaixo do nome
const pessoas = (n: number) =>
  `<p class="pc-pessoas"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="9" cy="8" r="3.2" fill="currentColor"/><path d="M2.8 19c0-3.4 2.8-6 6.2-6s6.2 2.6 6.2 6" fill="currentColor"/><circle cx="17" cy="9" r="2.6" fill="currentColor" opacity=".6"/><path d="M15.6 13.3c3.2-.4 5.8 2 5.8 5.2h-4.6" fill="currentColor" opacity=".6"/></svg><span class="pc-pessoas-col"><span><span class="pc-pessoas-txt">até</span> <b>${n}</b></span><span class="pc-pessoas-txt">pessoas por sala</span></span></p>`;

/** Perguntas frequentes da página de planos (texto puro: também vira FAQPage nos dados estruturados). */
export function perguntasPlanos(e: PrecosEstado): [string, string][] {
  const m = semCentavos(e.preco('mensal')), a = semCentavos(e.preco('anual')), s = semCentavos(e.preco('semana'));
  return [
    ['O que muda entre Mensal e Anual?', `É a mesma assinatura, com exatamente os mesmos benefícios. Você escolhe pagar R$ ${m} por mês ou R$ ${a} por ano${e.temAnual ? ` (equivale a R$ ${anualPorMes(e)} por mês)` : ''}. Nos dois, os créditos de IA são renovados todo mês.`],
    ['O que tem no plano grátis?', 'Salas de até 10 pessoas, quizzes e jogos ilimitados, todos os modos e visuais, pódio e sorteio. O jogo usa as cores do Quiddo; em Corporativo e Escola, o nome do quiz aparece na tela.'],
    ['Posso usar o logo e a cor da minha marca?', 'Sim, no Passe 7 dias e na Assinatura Premium, nos modos Corporativo e Escola. O logo e a cor aparecem na tela principal e nos celulares. Se você liberar com a sala aberta, a marca aparece na hora.'],
    ['Como funcionam os créditos de Quiz com IA?', `Nos dois períodos de pagamento, você tem ${SUBSCRIPTION_AI_CREDITS.text} créditos de texto e ${SUBSCRIPTION_AI_CREDITS.pdf} de PDF por mês, em saldos separados. Cada geração concluída usa 1 crédito do tipo escolhido; editar, salvar e reabrir não gastam crédito. Os créditos não acumulam. No pagamento anual, o saldo renova todo mês a partir da data de início do período pago, sem nova cobrança.`],
    ['Preciso pagar antes de criar o quiz?', 'Não. Crie o quiz e abra a sala de graça. Se aparecerem mais de 10 pessoas, a sala de espera mostra o botão para liberar até 200, sem fechar a sala.'],
    ['Como eu pago?', e.ligado
      ? `A assinatura é no cartão: R$ ${m} por mês${e.temAnual ? ` ou R$ ${a} por ano` : ''}, com renovação automática. O Passe de 7 dias custa R$ ${s}, pago uma vez, no Pix ou no cartão.`
      : 'Em simulação, o Pix é de teste e não cobra dinheiro.'],
    ['Como funciona a renovação?', 'A assinatura renova sozinha no fim de cada período pago. Para não renovar, cancele em Minha conta antes da próxima cobrança: o período que você já pagou continua valendo até o fim.'],
    ['E se eu trocar de computador?', 'Depois do pagamento você recebe um código. Use "Já paguei, tenho um código" em qualquer aparelho, com o código ou com o e-mail do pagamento.'],
    ['Quem joga precisa pagar?', 'Não. Só quem abre a sala. A turma entra pelo celular, sem cadastro e sem baixar app.'],
    ['E se eu desistir?', 'Devolvemos o valor em até 7 dias depois do pagamento.'],
    ['Mais de 200 pessoas?', 'Estamos preparando salas maiores para eventos. Por enquanto, cada sala vai até 200.'],
  ];
}

/**
 * Cartões dos planos e perguntas. A assinatura vem primeiro, com o Anual marcado; o Passe 7 dias é a
 * alternativa avulsa; o Grátis fecha a lista. Preços sempre com o período escrito (por mês, por ano).
 */
export function precosHtml(e: PrecosEstado) {
  const per = e.temAnual ? e.periodo : 'mensal';
  const m = semCentavos(e.preco('mensal')), a = semCentavos(e.preco('anual')), s = semCentavos(e.preco('semana'));
  const periodo = e.temAnual
    ? `<fieldset class="periodo"><legend class="sr">Como pagar a assinatura</legend>
        <label><input type="radio" name="periodo" value="anual"${per === 'anual' ? ' checked' : ''}>Anual <small>-${economia(e)}%</small></label>
        <label><input type="radio" name="periodo" value="mensal"${per === 'mensal' ? ' checked' : ''}>Mensal</label>
      </fieldset>`
    : '';
  const preco =
    per === 'anual'
      ? `<p class="pc-preco">R$ ${esc(a)}<small>/ano</small></p><p class="pc-sub">Equivale a R$ ${esc(anualPorMes(e))} por mês. No Mensal, R$ ${esc(m)} por mês.</p>`
      : `<p class="pc-preco">R$ ${esc(m)}<small>/mês</small></p><p class="pc-sub">Cobrança mensal.${e.temAnual ? ` No Anual, R$ ${esc(a)} por ano (R$ ${esc(anualPorMes(e))} por mês).` : ''}</p>`;
  return `<section class="precos" aria-label="Planos">
        <article class="pc pc-destaque">
          <span class="selo">Mais vantagem</span>
          <h2>Assinatura Premium</h2>
          <p class="pc-sub">Os mesmos benefícios, pagando por ano ou por mês.</p>
          ${periodo}
          ${pessoas(200)}
          ${preco}
          <ul><li>${OK}Jogos ilimitados</li><li>${OK}Sua marca: logo e cor</li><li>${OK}Use em qualquer aparelho</li><li>${IA}<span><strong>Quiz com IA</strong><br><small>${SUBSCRIPTION_AI_CREDITS.text} créditos para texto e ${SUBSCRIPTION_AI_CREDITS.pdf} para PDF por mês</small></span></li><li>${OK}Novos créditos a cada mês</li><li>${OK}Renova sozinha; cancele quando quiser em Minha conta</li></ul>
          <button type="button" class="btn" data-plano="${per}">Assinar o ${per === 'anual' ? 'Anual' : 'Mensal'}</button>
        </article>
        <article class="pc">
          <span class="selo selo-avulso">Avulso</span>
          <h2>Passe 7 dias</h2>
          ${pessoas(200)}
          <p class="pc-preco">R$ ${esc(s)}</p>
          <p class="pc-sub">Pagamento único, sem renovação.</p>
          <ul><li>${OK}Jogos ilimitados por 7 dias</li><li>${OK}Sua marca: logo e cor</li><li>${OK}Para um evento, sem assinatura</li><li>${OK}Pix ou cartão</li></ul>
          <button type="button" class="btn sec" data-plano="semana">Comprar o Passe</button>
        </article>
        <article class="pc">
          <h2>Grátis</h2>
          ${pessoas(10)}
          <p class="pc-preco">R$ 0</p>
          <ul><li>${OK}Quizzes e jogos ilimitados</li><li>${OK}Todos os modos, visuais e o pódio</li></ul>
          <a class="btn sec" href="/criar" data-link>Criar meu quiz</a>
        </article>
      </section>
      <section class="panel prose faq" id="perguntas">
        <h2>Perguntas</h2>${perguntasPlanos(e).map(([q, r]) => `<details><summary>${esc(q)}</summary><p>${esc(r)}</p></details>`).join('\n        ')}
        <p class="small">Vendido por Beyond the Work · CNPJ 69.746.447/0001-00.</p>
      </section>`;
}
export const precosTopo = () => `<section class="hero"><h1>Planos</h1><p>Comece grátis. Para mais de 10 pessoas ou para usar a sua marca, assine o Premium ou use o Passe 7 dias.</p></section>`;

// ---------- privacidade ----------

/** Política de privacidade. Descreve só o que o código faz; confira antes de mudar o texto. */
export function privacidadeHtml() {
  return `<article class="panel prose privacidade"><h1>Privacidade no Quiddo</h1><p>Atualizado em 14 de novembro de 2026.</p>
  <nav aria-label="Nesta página"><ul class="indice">
    <li><a href="#responsavel">Quem é o responsável</a></li><li><a href="#guardamos">O que guardamos</a></li><li><a href="#medicao">O que medimos</a></li>
    <li><a href="#campanhas">Etiquetas de campanha</a></li><li><a href="#cookies">Cookies</a></li><li><a href="#escolha">Como mudar de ideia</a></li>
    <li><a href="#compartilhamos">Com quem compartilhamos</a></li><li><a href="#prazos">Por quanto tempo</a></li><li><a href="#direitos">Seus direitos</a></li>
  </ul></nav>

  <h2 id="responsavel">Quem é o responsável</h2>
  <p>O Quiddo é um produto da Beyond the Work (CNPJ 69.746.447/0001-00), responsável pelos dados tratados aqui. Para qualquer pedido, escreva para <a href="mailto:oi@quiddo.com.br">oi@quiddo.com.br</a>.</p>

  <h2 id="guardamos">O que guardamos e por quê</h2>
  <ul>
    <li><b>Neste navegador:</b> seus quizzes, preferências, sua escolha de cookies e, se você pagou, o código de acesso do plano.</li>
    <li><b>Nas salas:</b> para o jogo funcionar, o servidor guarda as perguntas, as imagens, a marca escolhida, os apelidos, os personagens, as respostas e os pontos. A sala é apagada 2 horas depois do fim do jogo, ou 12 horas depois de aberta.</li>
    <li><b>Na sua conta, se você entrar com e-mail:</b> o e-mail, os quizzes que você salvar na conta e a sessão (um cookie que dura 30 dias). Para o login, guardamos um resumo (hash) do código enviado e o endereço de internet de quem pediu, para limitar tentativas; esses pedidos são apagados em 1 dia.</li>
    <li><b>Nos pagamentos:</b> e-mail, plano, valor, datas, código de acesso, a referência do pagamento e, se você chegou por um anúncio, as etiquetas da campanha. Os dados do cartão e do banco ficam com o Stripe e o Mercado Pago, não com a gente.</li>
    <li><b>No Quiz com IA (assinantes):</b> o tema ou o PDF que você envia vai para a OpenAI escrever as perguntas. Guardamos na sua conta o quiz gerado e um resumo (hash) do arquivo, não o arquivo.</li>
    <li><b>Uso do serviço:</b> por dia, quantas salas, jogos e jogadores houve, sem dados de ninguém.</li>
  </ul>
  <p><b>O que não guardamos:</b> as respostas dos jogadores depois que a sala é apagada, dados de cartão, o PDF enviado à IA e cadastro de quem só joga.</p>

  <h2 id="medicao">O que medimos</h2>
  <p><b>Sem o seu aceite, nada disso carrega.</b> Nenhum script do Google ou da Meta roda no site e eles não recebem nada pelo Quiddo. Para a medição, guardamos só a sua escolha. O Quiddo funciona igual.</p>
  <p><b>Com o seu aceite</b>, usamos o Google Analytics, a medição de anúncios do Google e o Pixel da Meta. Eles rodam numa página separada do site (/medicao), que recebe só o que está descrito aqui.</p>
  <ul>
    <li><b>Google</b> recebe as visitas às páginas públicas (início, criar, jogar, planos, guias, entrar e privacidade), a abertura de sala (com o modo: corporativo, família ou escola, e o número de perguntas), a visita à página de planos, o início do pagamento e a compra confirmada (plano, valor, moeda e um identificador irreversível da compra). Também recebe as etapas de uso: navegação, criação e salvamento de quizzes, entrada nas partidas, início e fim do jogo, resposta registrada (sem dizer qual), o resultado da geração por IA e, na janela de pagamento, o plano escolhido e se houve erro. A personalização de anúncios do Google fica desligada.</li>
    <li><b>Meta</b> recebe as visitas às páginas públicas, a abertura de sala (a cada sala, e um evento de interesse, o Lead, na primeira sala aberta neste navegador), a visita à página de planos, o início do pagamento e a compra confirmada, com plano, valor e moeda. Como o pixel roda na página /medicao, mandamos junto o caminho da página real, por exemplo /criar ou /precos. Não ligamos os eventos automáticos nem a correspondência avançada da Meta: nenhum campo de formulário vai para ela.</li>
    <li><b>Pelo nosso servidor</b> (Conversions API da Meta), quando você aceitou antes de pagar: a compra confirmada (e, na primeira cobrança da assinatura, o aviso de assinatura) com o identificador irreversível, plano, valor e moeda, os identificadores de anúncio da Meta (_fbp e _fbc) e o e-mail da compra protegido por hash SHA-256. Na primeira sala aberta neste navegador, também o evento de interesse, só com _fbp e _fbc, sem e-mail. Hash é pseudonimização, não anonimização.</li>
  </ul>
  <p>Google e Meta podem ligar essas informações à sua conta no Google, no Facebook ou no Instagram, conforme as regras deles, e tratar dados técnicos como IP e aparelho, inclusive em outros países. Veja as políticas do <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google</a> e da <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer">Meta</a>.</p>
  <p><b>Nunca enviamos a eles:</b> nomes ou apelidos de jogadores, códigos de sala, perguntas, respostas, o conteúdo dos quizzes ou dos arquivos, o código de acesso do plano e o e-mail em texto aberto. Nas telas da sala e do jogador, o endereço com o código da sala não é enviado: vão só categorias fixas ("partida" e "pagamento"), e a Meta recebe ali apenas as etapas de pagamento, se houver. Simulações de pagamento não contam como venda.</p>

  <h2 id="campanhas">Etiquetas de campanha (UTM)</h2>
  <p>Quando você chega por um anúncio, o endereço pode trazer etiquetas como utm_source e utm_campaign. São dados do anúncio, não seus. Guardamos as da primeira visita neste navegador por até 90 dias e, se você comprar, elas ficam junto com a compra, para sabermos qual campanha trouxe a venda. Isso vale com ou sem aceite e não é enviado ao Google nem à Meta por esse caminho. Os identificadores de clique (gclid, fbclid e parecidos) só são usados com o seu aceite.</p>

  <h2 id="cookies">Cookies e armazenamento</h2>
  <p><b>Necessários (nossos):</b></p>
  <ul>
    <li><b>qd_sessao</b>: mantém você conectado, por 30 dias. Só existe se você entrar com e-mail.</li>
    <li><b>Armazenamento do navegador</b>: quizzes, preferências, código de acesso, a sua escolha de cookies (qd_consent_v1 e btw_capi_choice_v1, por até 180 dias) e as etiquetas de campanha da primeira visita (qd_origem_v1, por até 90 dias).</li>
  </ul>
  <p><b>De medição (só com o seu aceite):</b></p>
  <ul>
    <li><b>_ga e _ga_*</b>: Google Analytics. <b>_gcl_*</b>: medição de anúncios do Google.</li>
    <li><b>_fbp e _fbc</b>: Meta. O _fbc guarda o identificador do clique quando você chega por um anúncio da Meta.</li>
    <li><b>btw_meta_subject_quiddo</b> (nosso): um número aleatório que liga as suas compras e a sua primeira sala à sua escolha, para cancelarmos envios do servidor se você revogar. Dura até 180 dias.</li>
    <li><b>qd_lead_v1</b> e <b>qd_sale_*</b> (só no navegador): evitam contar a mesma primeira sala ou a mesma compra duas vezes.</li>
  </ul>

  <h2 id="escolha">Como mudar de ideia</h2>
  <p>No rodapé de todas as páginas, o botão "Medição ligada" ou "Medição desligada" mostra a sua escolha e reabre o aviso. Recusar é tão fácil quanto aceitar. Ao recusar depois de ter aceitado, paramos as coletas, apagamos os cookies de medição que o site consegue apagar e cancelamos os envios do servidor que ainda estão na fila. O que já foi enviado não é apagado automaticamente pelos fornecedores. A escolha vale por até 180 dias; depois, o aviso aparece de novo.</p>
  <p><button type="button" class="btn sec auto" id="privacy-edit">Mudar minha escolha de cookies</button></p>

  <h2 id="compartilhamos">Com quem compartilhamos</h2>
  <ul>
    <li><b>Cloudflare</b>: hospeda o site, as salas e o banco de dados.</li>
    <li><b>Stripe</b> (cartão, Apple Pay, Google Pay e assinatura) e <b>Mercado Pago</b> (Pix): processam os pagamentos.</li>
    <li><b>Resend</b>: entrega o código de login por e-mail.</li>
    <li><b>OpenAI</b>: escreve as perguntas do Quiz com IA, para assinantes que usam esse recurso.</li>
    <li><b>Google e Meta</b>: só com o seu aceite, como descrito em "O que medimos".</li>
  </ul>
  <p>Não vendemos dados.</p>

  <h2 id="prazos">Por quanto tempo guardamos</h2>
  <ul>
    <li>Salas: até 2 horas depois do fim do jogo (no máximo 12 horas).</li>
    <li>Código de login: vale 10 minutos; o pedido é apagado em 1 dia. Sessão: 30 dias.</li>
    <li>Sua escolha de cookies: até 180 dias.</li>
    <li>Fila de envio à Meta pelo servidor: até 7 dias. Fica só um registro mínimo do envio, para não duplicar.</li>
    <li>Compras: enquanto forem necessárias para o seu acesso, para devoluções e para obrigações fiscais.</li>
    <li>Conta e quizzes salvos nela: até você pedir a exclusão.</li>
  </ul>

  <h2 id="direitos">Seus direitos (LGPD)</h2>
  <p>Você pode pedir confirmação e acesso aos seus dados, correção, exclusão, portabilidade, informação sobre com quem compartilhamos e revogar o consentimento. Escreva para <a href="mailto:oi@quiddo.com.br">oi@quiddo.com.br</a>. Evite mandar dados bancários ou senhas por e-mail. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).</p>

  <h2>Mudanças nesta política</h2>
  <p>Quando esta política mudar, a data no topo da página muda junto. Mudanças no que medimos voltam a pedir a sua escolha.</p>
</article>`;
}

// ---------- dados estruturados ----------

export const OG_IMAGEM = `${SITE}/og-quiddo.png`;
export const organizacao = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Quiddo',
  url: `${SITE}/`,
  logo: `${SITE}/marca/quiddo-cor.svg`,
  email: 'oi@quiddo.com.br',
  parentOrganization: { '@type': 'Organization', name: 'Beyond the Work', url: 'https://www.beyondthework.com.br', taxID: '69.746.447/0001-00' },
});
export const siteJsonLd = () => ({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Quiddo', url: `${SITE}/`, inLanguage: 'pt-BR' });
const preco = (v: string) => num(v).toFixed(2);
/** Aplicativo e ofertas, com os preços em BRL. Mensal e Anual são a mesma assinatura. */
export function appJsonLd(e: PrecosEstado = estadoPadrao()) {
  const oferta = (name: string, price: string, extra: Record<string, unknown> = {}) => ({ '@type': 'Offer', name, price, priceCurrency: 'BRL', url: `${SITE}/precos`, availability: 'https://schema.org/InStock', ...extra });
  const mensal = (unitCode: 'MON' | 'ANN', valor: string) => ({ priceSpecification: { '@type': 'UnitPriceSpecification', price: preco(valor), priceCurrency: 'BRL', unitCode, referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode } } });
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Quiddo',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Web',
    url: `${SITE}/`,
    image: OG_IMAGEM,
    description: PAGINAS['/'].descricao,
    inLanguage: 'pt-BR',
    offers: [
      oferta('Grátis, salas de até 10 pessoas', '0.00'),
      ...(e.temAnual ? [oferta('Assinatura Premium Anual', preco(e.preco('anual')), mensal('ANN', e.preco('anual')))] : []),
      oferta('Assinatura Premium Mensal', preco(e.preco('mensal')), mensal('MON', e.preco('mensal'))),
      oferta('Passe 7 dias', preco(e.preco('semana'))),
    ],
  };
}
export function faqJsonLd(perguntas: [string, string][]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: perguntas.map(([q, r]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: r } })),
  };
}
export const migalha = (itens: [string, string][]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: itens.map(([nome, url], i) => ({ '@type': 'ListItem', position: i + 1, name: nome, item: url })),
});
