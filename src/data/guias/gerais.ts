import type { Guia } from '../guias';

export const GERAIS: Guia[] = [
  {
    slug: 'como-escrever-boas-perguntas',
    titulo: 'Como escrever boas perguntas',
    resumo: 'Regras simples e exemplos para o quiz render na sala',
    publico: 'todos',
    corpo: `
<p>Um bom quiz ao vivo é rápido de ler, tem uma resposta certa sem discussão e deixa a sala rindo, não brigando. As regras abaixo valem para a reunião da empresa, para a aula de revisão e para o encontro da família.</p>
<h2>1. Uma ideia por pergunta</h2>
<p>A pergunta precisa caber numa olhada para a TV. Se ela tem duas vírgulas e um "considerando que", provavelmente são duas perguntas.</p>
<ul>
<li>Ruim: “Considerando a última reunião, qual foi o número citado pelo diretor sobre as vendas do Sul?”</li>
<li>Bom: “Quanto a região Sul vendeu em março?”</li>
</ul>
<p>Frase curta, verbo direto, sem dupla negação. “Qual destes NÃO é…” até funciona, mas use pouco: na pressa, muita gente lê errado.</p>
<h2>2. Alternativas do mesmo tamanho</h2>
<p>Quando a certa é a única longa e cheia de detalhes, todo mundo acerta sem pensar. Deixe as alternativas parecidas no tamanho e no jeito de escrever.</p>
<p><strong>Exemplo ruim:</strong> Qual é a capital da Austrália?</p>
<ul>
<li>A) Sydney</li>
<li>B) Camberra, escolhida como meio-termo entre duas cidades</li>
<li>C) Perth</li>
<li>D) Melbourne</li>
</ul>
<p><strong>Exemplo bom:</strong> a mesma pergunta só com os nomes. A certa continua sendo Camberra, mas agora é preciso saber.</p>
<h2>3. Erradas que parecem certas</h2>
<p>A graça está nas alternativas plausíveis. Se uma delas é absurda, a pergunta vira de três opções. Algumas ideias:</p>
<ul>
<li>Para anos, use anos próximos: 1998, 2000, 2002, 2004.</li>
<li>Para números, use valores da mesma ordem: 12%, 18%, 24%, 30%.</li>
<li>Para nomes, use nomes do mesmo grupo: quatro colegas da mesma área, quatro rios brasileiros.</li>
</ul>
<p><strong>Exemplo:</strong> Qual é o maior bioma do Brasil?</p>
<ul>
<li>A) Cerrado</li>
<li>B) Amazônia (certa)</li>
<li>C) Mata Atlântica</li>
<li>D) Caatinga</li>
</ul>
<p>Todas as opções são biomas brasileiros, então ninguém elimina nada de graça.</p>
<h2>4. Use 2, 3 ou 4 alternativas com intenção</h2>
<p>Cada pergunta pode ter de 2 a 4 respostas. Verdadeiro ou falso cabe em duas e é ótimo para aquecer. Quatro é o padrão quando você tem boas erradas. Não invente uma quarta opção fraca só para completar.</p>
<h2>5. Misture fácil e difícil</h2>
<p>Comece com duas perguntas fáceis para todo mundo pontuar e entrar no clima. Alterne depois entre médias e difíceis. Deixe uma das mais difíceis perto do fim, quando o ranking está apertado e cada ponto conta.</p>
<p><strong>Fácil para abrir:</strong> Quantas pernas tem uma aranha? A) 6, B) 8 (certa), C) 10, D) 12.</p>
<p><strong>Difícil para fechar:</strong> Em que ano a empresa abriu a primeira filial? Quatro anos próximos, só quem é veterano lembra.</p>
<h2>6. Fale a língua da sala</h2>
<p>Pergunta sobre a própria turma rende mais que qualquer pergunta de almanaque. Na empresa, use números e histórias do time. Na escola, use o conteúdo da matéria. Na família, use as manias e lembranças de todo mundo: “Quem queimou o arroz no Natal de 2019?”</p>
<h2>7. Revise antes de abrir a sala</h2>
<ol>
<li>Leia cada pergunta em voz alta. Se tropeçou, encurte.</li>
<li>Confira se a alternativa certa está marcada em todas.</li>
<li>Veja se não há duas respostas que podem ser consideradas certas.</li>
<li>Abra a sala e jogue sozinho pelo celular uma vez, do começo ao fim.</li>
</ol>
<p>Dez minutos de revisão evitam a pior cena de um quiz ao vivo: a sala inteira gritando que a resposta certa estava errada.</p>`,
  },
  {
    slug: 'como-escolher-o-tempo-das-perguntas',
    titulo: 'Como escolher o tempo e o ritmo do quiz',
    resumo: '10, 15, 20 ou 30 segundos: quanto tempo dar e quantas perguntas',
    publico: 'todos',
    corpo: `
<p>No Quiddo, você escolhe um tempo único para todas as perguntas do quiz: 10, 15, 20 ou 30 segundos. Parece detalhe, mas é isso que define se o jogo fica eletrizante ou arrastado. Veja como acertar.</p>
<h2>Como cada tempo funciona na prática</h2>
<ul>
<li><strong>10 segundos:</strong> para perguntas bem curtas e respostas de uma palavra. Ótimo para conhecimentos gerais e para turmas que já jogaram antes. Gera muita adrenalina.</li>
<li><strong>15 segundos:</strong> rápido, mas sem desespero. Bom para perguntas de uma linha com alternativas curtas.</li>
<li><strong>20 segundos:</strong> o padrão mais seguro. Dá tempo de ler na TV, olhar o celular e decidir.</li>
<li><strong>30 segundos:</strong> para perguntas mais longas, com conta, ou para públicos que leem com calma, como crianças pequenas e avós.</li>
</ul>
<p>Lembre que a rapidez sempre vale ponto: quem acerta ganha de 500 a 1000 pontos, e quanto mais rápido, mais perto de 1000. Mesmo com 30 segundos, ninguém fica esperando à toa, porque quem sabe responde logo.</p>
<h2>Um teste simples para decidir</h2>
<p>Pegue a pergunta mais longa do seu quiz e leia em voz alta, junto com as alternativas, cronometrando. Some uns 5 segundos para a pessoa pensar e tocar no celular. O resultado aponta o tempo certo.</p>
<p><strong>Exemplo:</strong> “Qual planeta é conhecido como planeta vermelho?” A) Vênus, B) Marte (certa), C) Júpiter, D) Saturno. Leitura de uns 5 segundos. Aqui, 10 ou 15 segundos bastam.</p>
<p><strong>Outro exemplo:</strong> “Se um produto custa R$ 80 e tem 25% de desconto, quanto você paga?” A) R$ 55, B) R$ 60 (certa), C) R$ 64, D) R$ 70. Tem conta no meio. Melhor 20 ou 30 segundos.</p>
<p>Se o quiz mistura os dois tipos, escolha pelo mais longo ou reescreva as perguntas compridas para ficarem curtas.</p>
<h2>Quantas perguntas fazer</h2>
<p>Cada pergunta leva o tempo de resposta mais uns 20 a 40 segundos de revelação, ranking e comentário seu. Na prática, conte cerca de um minuto por pergunta com 20 segundos de tempo.</p>
<ul>
<li><strong>Quebra-gelo de reunião:</strong> 5 a 8 perguntas, uns 10 minutos.</li>
<li><strong>Revisão em sala de aula:</strong> 10 a 15 perguntas, de 15 a 20 minutos.</li>
<li><strong>Festa ou evento:</strong> 15 a 20 perguntas, de 20 a 30 minutos.</li>
</ul>
<p>Passar de 25 perguntas seguidas costuma cansar. A sala começa a conversar e o celular vai para o bolso.</p>
<h2>Quando fazer pausas</h2>
<p>Quem controla o ritmo é você. O jogo só avança quando você aperta a seta do teclado ou o passador de slides na tela da TV. Use isso a seu favor:</p>
<ol>
<li>Depois da revelação, comente a resposta em uma ou duas frases.</li>
<li>No ranking, chame o nome de quem subiu de posição.</li>
<li>Na metade do quiz, faça uma pausa mais longa: “Metade do jogo, e a disputa está assim.”</li>
<li>Antes das três últimas perguntas, avise que é a reta final.</li>
</ol>
<p>Se o quiz for grande, divida em dois quizzes menores, com um intervalo para o café ou o bolo no meio. Cada um termina com seu próprio pódio, e a sala ganha duas chances de vibrar.</p>
<h2>Resumo rápido</h2>
<ul>
<li>Na dúvida, use 20 segundos.</li>
<li>Pergunta curta e turma rápida: 10 ou 15.</li>
<li>Conta, texto longo ou público que lê devagar: 30.</li>
<li>Conte um minuto por pergunta e não passe de meia hora seguida.</li>
</ul>`,
  },
  {
    slug: 'como-apresentar-o-quiz-ao-vivo',
    titulo: 'Como apresentar o quiz ao vivo e animar a sala',
    resumo: 'O que falar, como usar o ranking e o suspense do pódio',
    publico: 'todos',
    corpo: `
<p>O Quiddo cuida das perguntas, do tempo e dos pontos. Mas quem faz a sala vibrar é o anfitrião. Você não precisa ser apresentador de TV. Precisa só de algumas frases prontas e de saber quando falar e quando calar.</p>
<h2>O papel do anfitrião</h2>
<p>Pense em você como o narrador do jogo. Seu trabalho é:</p>
<ul>
<li>Explicar as regras em 30 segundos, sem enrolação.</li>
<li>Manter o ritmo, avançando com a seta do teclado ou o passador de slides.</li>
<li>Comentar o que aconteceu, sem humilhar ninguém.</li>
<li>Criar expectativa para a próxima pergunta.</li>
</ul>
<h2>Antes da primeira pergunta</h2>
<p>Com o código de 4 letras e o QR code na TV, espere a sala encher. Enquanto isso, puxe conversa com quem está entrando: “Olha a capivara de óculos chegando!” Os personagens, bichos do Brasil com acessórios, são um ótimo assunto para quebrar o gelo.</p>
<p>Quando todos estiverem dentro, explique em três frases:</p>
<ol>
<li>“A pergunta aparece na TV, você responde no celular.”</li>
<li>“Acertou, ganha de 500 a 1000 pontos. Quanto mais rápido, mais pontos.”</li>
<li>“Errou, zero. Então pense, mas não demore.”</li>
</ol>
<h2>Durante as perguntas: fale pouco</h2>
<p>Enquanto o tempo corre, deixe a sala pensar. Pode ler a pergunta em voz alta uma vez, para ajudar quem está longe da TV, e depois fique quieto. Uma frase como “Faltam cinco segundos!” já basta.</p>
<h2>Entre as perguntas: é sua hora</h2>
<p>Depois da revelação, comente em uma ou duas frases. Alguns modelos:</p>
<ul>
<li>Quando quase todo mundo acertou: “Essa foi de graça, né? Aproveitem, porque a próxima não é.”</li>
<li>Quando quase todo mundo errou: “Pegadinha clássica! Quem acertou merece aplauso.”</li>
<li>Quando a resposta tem curiosidade: “Pois é, a Amazônia ocupa quase metade do território do Brasil.”</li>
</ul>
<p>Se a pergunta foi sobre alguém da sala, passe a palavra para essa pessoa contar a história. É o momento mais divertido do jogo.</p>
<h2>Use o ranking para criar torcida</h2>
<p>Depois de cada pergunta aparece o ranking, com os pontos subindo como moedinhas e o destaque de quem subiu de posição. Não pule essa tela. Narre como se fosse um campeonato:</p>
<ul>
<li>“O tucano do Financeiro pulou do sexto para o segundo lugar!”</li>
<li>“A diferença entre o primeiro e o segundo é de 40 pontos. Qualquer pergunta vira o jogo.”</li>
<li>“A onça está na liderança desde a primeira pergunta. Alguém vai segurar?”</li>
</ul>
<p>Lembre a sala que a rapidez vale ponto. Isso faz a turma responder mais rápido e deixa o placar sempre apertado.</p>
<p>Cuidado com quem está lá embaixo. Valorize quem subiu, não quem caiu. Ninguém quer ser zoado na frente do chefe ou da professora.</p>
<h2>A reta final</h2>
<p>Antes das últimas perguntas, mude o tom: “Agora é decisão. Faltam três perguntas.” Se possível, deixe uma das mais difíceis para o fim. Um placar embolado na última pergunta é tudo que você quer.</p>
<h2>O suspense do pódio</h2>
<p>No fim, o pódio revela do 3º para o 1º lugar. Segure o ritmo:</p>
<ol>
<li>Peça silêncio. “Vamos ao pódio.”</li>
<li>Revele o terceiro lugar e puxe aplauso.</li>
<li>Faça uma pausa antes do segundo. “Quem será?”</li>
<li>Antes do primeiro, conte até três com a sala.</li>
</ol>
<p>Depois, chame os três para perto da TV e tire a foto. O pódio foi feito para isso. Se tiver sorteio de prêmios, faça logo em seguida, enquanto a energia está alta.</p>
<h2>Resumo</h2>
<ul>
<li>Regras em 30 segundos.</li>
<li>Silêncio durante a pergunta, comentário depois.</li>
<li>Narre o ranking como campeonato.</li>
<li>Pódio com pausa, contagem e foto.</li>
</ul>`,
  },
  {
    slug: 'checklist-tecnico-antes-de-comecar',
    titulo: 'Checklist técnico antes de começar',
    resumo: 'TV, internet, QR code e teste: tudo pronto antes da sala encher',
    publico: 'todos',
    corpo: `
<p>Quiz ao vivo que trava no começo perde a sala em dois minutos. A boa notícia é que quase todo problema se resolve antes, com um teste de dez minutos. Use esta lista no dia.</p>
<h2>1. TV ou projetor</h2>
<ul>
<li>Conecte o computador na TV ou no projetor e abra o Quiddo em tela cheia.</li>
<li>Vá até o fundo da sala e veja se dá para ler a pergunta e as alternativas. Se não der, aproxime as cadeiras ou use uma tela maior.</li>
<li>Apague parte das luzes perto da tela, principalmente com projetor.</li>
<li>Deixe o computador na tomada e desligue o descanso de tela e as notificações.</li>
<li>Se a sala for grande, ligue o som do computador numa caixa ou peça um microfone para você.</li>
</ul>
<h2>2. Controle do jogo</h2>
<p>Na tela da TV, a seta do teclado avança o jogo. Um passador de slides também funciona, e deixa você livre para andar pela sala. Teste antes: aperte uma vez e veja se a tela avança.</p>
<h2>3. Internet</h2>
<ul>
<li>O computador da TV precisa de internet estável. Cabo é melhor que Wi-Fi, se tiver.</li>
<li>A turma entra pelo próprio celular. Se o sinal de dados for fraco no local, deixe o nome e a senha do Wi-Fi escritos num papel ou num slide.</li>
<li>Em sala com muita gente, peça para quem tiver sinal bom usar os próprios dados e deixar o Wi-Fi para quem precisa.</li>
</ul>
<h2>4. Teste a sala sozinho</h2>
<p>Este é o passo mais importante. Um dia antes, ou pelo menos uma hora antes:</p>
<ol>
<li>Abra a sala na TV.</li>
<li>Entre pelo seu celular com o código de 4 letras ou o QR code.</li>
<li>Escolha um personagem e um apelido.</li>
<li>Jogue duas ou três perguntas e confira o ranking.</li>
<li>Veja se as respostas certas estão marcadas direito.</li>
</ol>
<p>Se der, peça para um colega entrar também. Dois celulares mostram melhor como a sala vai se comportar.</p>
<h2>5. QR code visível</h2>
<p>O código de 4 letras e o QR code aparecem na TV. Para todo mundo conseguir entrar:</p>
<ul>
<li>Deixe a tela de entrada aberta por alguns minutos antes de começar.</li>
<li>Leia o código em voz alta, letra por letra: “É B, R, A, S.”</li>
<li>Peça para quem está na frente abrir espaço para quem está atrás apontar a câmera.</li>
<li>Lembre que não precisa de cadastro nem de baixar aplicativo.</li>
</ul>
<h2>6. Convite pelo WhatsApp</h2>
<p>Mande o link da sala no grupo pouco antes de começar. Assim, quem está longe da TV entra sem precisar do QR code. Um modelo de mensagem:</p>
<p><em>“O quiz vai começar! Entre por este link, escolha seu bicho e um apelido. Não precisa baixar nada.”</em></p>
<p>Em reunião ou aula, mande o link alguns minutos antes, não no dia anterior, para ninguém entrar cedo demais e esquecer a tela aberta.</p>
<h2>7. Se alguém cair</h2>
<p>Acontece: a bateria acaba, o celular troca de rede, alguém fecha o navegador sem querer. Fique tranquilo. A pessoa abre o link de novo, entra na mesma sala e volta com os pontos que já tinha. Avise isso antes de começar, para ninguém entrar em pânico no meio do jogo.</p>
<h2>8. Tamanho da sala</h2>
<p>Cada sala recebe até 200 pessoas. Se o seu evento for maior, divida em duas salas ou em dois momentos.</p>
<h2>Checklist rápido</h2>
<ul>
<li>Tela legível do fundo da sala.</li>
<li>Computador na tomada, sem notificações.</li>
<li>Seta ou passador testados.</li>
<li>Internet do computador estável e Wi-Fi anotado.</li>
<li>Sala testada com seu celular.</li>
<li>Link pronto para mandar no WhatsApp.</li>
<li>Aviso: se cair, é só entrar de novo.</li>
</ul>`,
  },
  {
    slug: 'premios-e-sorteio',
    titulo: 'Prêmios e sorteio: como premiar sem gastar muito',
    resumo: 'Quando sortear entre todos ou só entre quem pontuou, e ideias',
    publico: 'todos',
    corpo: `
<p>Prêmio não precisa ser caro para animar a sala. O que conta é ter algo em jogo e um momento de expectativa no fim. O Quiddo ajuda com duas coisas: o pódio, que já premia os três primeiros com fama e foto, e o sorteio, que dá chance para quem não chegou lá.</p>
<h2>Pódio e sorteio: use os dois</h2>
<p>O pódio premia quem foi melhor. O sorteio premia a participação. Quando você usa os dois, quem está no meio do ranking continua jogando até o fim, porque ainda tem chance de levar algo.</p>
<p>Uma divisão que funciona bem:</p>
<ul>
<li>Um prêmio para o 1º lugar, e algo simbólico para o 2º e o 3º.</li>
<li>Um ou dois prêmios sorteados depois do pódio.</li>
</ul>
<h2>Sortear entre todos ou só entre quem pontuou?</h2>
<p>No fim do jogo, você escolhe quem entra no sorteio.</p>
<p><strong>Sortear entre todos</strong> é a melhor opção quando:</p>
<ul>
<li>O clima é de festa e o objetivo é todo mundo se divertir.</li>
<li>Tem criança, avó ou gente que não está acostumada com quiz.</li>
<li>Você quer agradecer a presença, como no fim de um evento.</li>
</ul>
<p><strong>Sortear só entre quem pontuou</strong> é melhor quando:</p>
<ul>
<li>Você quer premiar o esforço, como numa revisão de conteúdo ou num treinamento.</li>
<li>Tem gente que entrou na sala e não respondeu nada.</li>
<li>O prêmio é mais valioso e você quer evitar reclamação.</li>
</ul>
<p>Avise a regra antes da primeira pergunta. “No fim tem sorteio, mas só para quem acertar pelo menos uma.” Isso, sozinho, já aumenta a atenção da sala.</p>
<h2>Como premiar sem gastar muito</h2>
<ul>
<li><strong>Prêmios de experiência:</strong> escolher a música da próxima hora, sair 15 minutos mais cedo, escolher o sabor da pizza.</li>
<li><strong>Prêmios de comida:</strong> uma caixa de bombom, a primeira fatia do bolo, um café pago.</li>
<li><strong>Prêmios simbólicos:</strong> uma coroa de papel, um troféu improvisado que passa de mão em mão a cada quiz.</li>
<li><strong>Prêmios de brinde:</strong> canecas, cadernos e camisetas que já existem no estoque da empresa ou da escola.</li>
</ul>
<h2>Ideias para empresa</h2>
<ul>
<li>Vale-café ou almoço com a liderança.</li>
<li>Uma folga de meio período, se a política da empresa permitir.</li>
<li>Kit com brindes da marca.</li>
<li>Vaga de estacionamento perto da porta por uma semana.</li>
</ul>
<p>No tema Corporativo, coloque o nome, a cor e o logo da empresa. A foto do pódio sai com a cara do evento e vira post no mural interno.</p>
<h2>Ideias para escola</h2>
<ul>
<li>Escolher o lugar na sala por uma semana.</li>
<li>Ser o primeiro a sair para o intervalo.</li>
<li>Adesivos, lápis especiais, marcadores de página.</li>
<li>Escolher o tema do próximo quiz.</li>
</ul>
<p>Evite prêmios em nota. O quiz funciona melhor como revisão divertida do que como prova. No tema Escola, o nome, a cor e o logo da escola deixam a foto do pódio pronta para o grupo dos pais.</p>
<h2>Ideias para festa</h2>
<ul>
<li>Levar o centro de mesa ou o último pedaço de bolo para casa.</li>
<li>Uma garrafa de vinho ou um vale-sorvete.</li>
<li>Escolher a próxima música ou a próxima brincadeira.</li>
<li>Um troféu engraçado que fica com o campeão até a próxima festa.</li>
</ul>
<h2>Dica final: anuncie o prêmio no começo</h2>
<p>Mostre o prêmio antes da primeira pergunta. Deixe em cima da mesa, perto da TV. Ver o prêmio o jogo inteiro faz a sala jogar com mais vontade, e o momento do sorteio vira o fechamento perfeito.</p>`,
  },
];
