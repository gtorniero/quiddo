import type { Guia } from '../guias';

// Listas de perguntas prontas. Só fatos que não mudam com o tempo: nada de recordes, cargos atuais
// ou resultados recentes. Cada pergunta tem a resposta certa marcada no fim.

export const PERGUNTAS: Guia[] = [
  {
    slug: 'perguntas-de-conhecimentos-gerais',
    titulo: '50 perguntas de conhecimentos gerais com respostas',
    resumo: 'Geografia, ciências, história, artes, matemática e natureza, com alternativas e a resposta certa',
    publico: 'perguntas',
    corpo: `
<p>Conhecimentos gerais é o tema mais seguro para um quiz ao vivo: todo mundo tem chance, ninguém precisa ser especialista e a sala inteira participa. Aqui estão 50 perguntas prontas, separadas por assunto, com quatro alternativas e a resposta certa no fim de cada uma. Copie as que quiser para o seu quiz.</p>
<p>Uma dica antes de começar: misture os assuntos. Uma pergunta de geografia, depois uma de ciências, depois uma de história. Assim quem é bom em um tema não dispara na frente logo no começo.</p>
<h2>Geografia</h2>
<ol>
<li><strong>Qual é a capital da Austrália?</strong> A) Sydney B) Camberra C) Melbourne D) Perth. <em>Resposta: B</em></li>
<li><strong>Qual é o maior oceano do planeta?</strong> A) Atlântico B) Índico C) Pacífico D) Ártico. <em>Resposta: C</em></li>
<li><strong>Qual é o maior país do mundo em área?</strong> A) Canadá B) China C) Estados Unidos D) Rússia. <em>Resposta: D</em></li>
<li><strong>Qual é a capital do Canadá?</strong> A) Toronto B) Vancouver C) Ottawa D) Montreal. <em>Resposta: C</em></li>
<li><strong>Qual é a montanha mais alta do mundo?</strong> A) K2 B) Everest C) Aconcágua D) Kilimanjaro. <em>Resposta: B</em></li>
<li><strong>Qual é o maior deserto quente do mundo?</strong> A) Atacama B) Gobi C) Saara D) Kalahari. <em>Resposta: C</em></li>
<li><strong>Qual país tem o formato de uma bota no mapa?</strong> A) Grécia B) Itália C) Portugal D) Chile. <em>Resposta: B</em></li>
<li><strong>Qual é a capital da Turquia?</strong> A) Istambul B) Ancara C) Esmirna D) Antália. <em>Resposta: B</em></li>
<li><strong>Qual é o menor país do mundo?</strong> A) Mônaco B) San Marino C) Vaticano D) Malta. <em>Resposta: C</em></li>
<li><strong>Em que país ficam as pirâmides de Gizé?</strong> A) México B) Egito C) Peru D) Sudão. <em>Resposta: B</em></li>
</ol>
<h2>Ciências</h2>
<ol start="11">
<li><strong>Qual é o símbolo químico do ouro?</strong> A) Ag B) Au C) Or D) Go. <em>Resposta: B</em></li>
<li><strong>Qual planeta fica mais perto do Sol?</strong> A) Vênus B) Terra C) Marte D) Mercúrio. <em>Resposta: D</em></li>
<li><strong>Quantos ossos tem o corpo de um adulto?</strong> A) 186 B) 206 C) 226 D) 306. <em>Resposta: B</em></li>
<li><strong>Que gás as plantas absorvem do ar para fazer fotossíntese?</strong> A) Oxigênio B) Nitrogênio C) Gás carbônico D) Hélio. <em>Resposta: C</em></li>
<li><strong>Qual é o maior planeta do Sistema Solar?</strong> A) Saturno B) Júpiter C) Netuno D) Urano. <em>Resposta: B</em></li>
<li><strong>A que temperatura a água ferve ao nível do mar?</strong> A) 90 °C B) 100 °C C) 110 °C D) 120 °C. <em>Resposta: B</em></li>
<li><strong>Qual é o maior órgão do corpo humano?</strong> A) Fígado B) Pulmão C) Pele D) Intestino. <em>Resposta: C</em></li>
<li><strong>Quantos dentes tem um adulto com a dentição completa?</strong> A) 28 B) 30 C) 32 D) 34. <em>Resposta: C</em></li>
<li><strong>Qual é a fórmula química da água?</strong> A) CO2 B) H2O C) O2 D) NaCl. <em>Resposta: B</em></li>
<li><strong>Quantos corações tem um polvo?</strong> A) 1 B) 2 C) 3 D) 4. <em>Resposta: C</em></li>
</ol>
<h2>História</h2>
<ol start="21">
<li><strong>Em que ano a esquadra de Pedro Álvares Cabral chegou ao Brasil?</strong> A) 1492 B) 1500 C) 1530 D) 1549. <em>Resposta: B</em></li>
<li><strong>Em que ano o Brasil declarou a independência?</strong> A) 1808 B) 1815 C) 1822 D) 1889. <em>Resposta: C</em></li>
<li><strong>Quem foi o primeiro ser humano a pisar na Lua?</strong> A) Buzz Aldrin B) Yuri Gagarin C) Neil Armstrong D) Michael Collins. <em>Resposta: C</em></li>
<li><strong>Em que ano caiu o Muro de Berlim?</strong> A) 1985 B) 1989 C) 1991 D) 1993. <em>Resposta: B</em></li>
<li><strong>Que lei aboliu a escravidão no Brasil, em 1888?</strong> A) Lei do Ventre Livre B) Lei Áurea C) Lei dos Sexagenários D) Lei Eusébio de Queirós. <em>Resposta: B</em></li>
<li><strong>Quem foi o primeiro presidente do Brasil?</strong> A) Floriano Peixoto B) Getúlio Vargas C) Deodoro da Fonseca D) Prudente de Morais. <em>Resposta: C</em></li>
<li><strong>Em que ano Cristóvão Colombo chegou à América?</strong> A) 1488 B) 1492 C) 1500 D) 1510. <em>Resposta: B</em></li>
<li><strong>Em que ano começou a Revolução Francesa?</strong> A) 1776 B) 1789 C) 1815 D) 1848. <em>Resposta: B</em></li>
<li><strong>Em que cidade foram realizados os primeiros Jogos Olímpicos da era moderna, em 1896?</strong> A) Paris B) Londres C) Atenas D) Roma. <em>Resposta: C</em></li>
<li><strong>Em que ano terminou a Segunda Guerra Mundial?</strong> A) 1939 B) 1942 C) 1945 D) 1950. <em>Resposta: C</em></li>
</ol>
<h2>Artes e literatura</h2>
<ol start="31">
<li><strong>Quem pintou a Mona Lisa?</strong> A) Michelangelo B) Leonardo da Vinci C) Rafael D) Botticelli. <em>Resposta: B</em></li>
<li><strong>Quem pintou "A Noite Estrelada"?</strong> A) Monet B) Picasso C) Van Gogh D) Dalí. <em>Resposta: C</em></li>
<li><strong>Quem escreveu "Dom Casmurro"?</strong> A) José de Alencar B) Machado de Assis C) Graciliano Ramos D) Jorge Amado. <em>Resposta: B</em></li>
<li><strong>Quem escreveu "Romeu e Julieta"?</strong> A) Charles Dickens B) Miguel de Cervantes C) William Shakespeare D) Victor Hugo. <em>Resposta: C</em></li>
<li><strong>Quem escreveu "O Pequeno Príncipe"?</strong> A) Júlio Verne B) Antoine de Saint-Exupéry C) Hans Christian Andersen D) Lewis Carroll. <em>Resposta: B</em></li>
<li><strong>Em que país nasceu Pablo Picasso?</strong> A) França B) Itália C) Espanha D) Portugal. <em>Resposta: C</em></li>
<li><strong>Qual pintora brasileira criou o quadro "Abaporu"?</strong> A) Anita Malfatti B) Tarsila do Amaral C) Lygia Clark D) Djanira. <em>Resposta: B</em></li>
<li><strong>Quantas teclas tem um piano padrão?</strong> A) 66 B) 76 C) 88 D) 98. <em>Resposta: C</em></li>
</ol>
<h2>Matemática e lógica</h2>
<ol start="39">
<li><strong>Quanto é 15% de 200?</strong> A) 15 B) 20 C) 30 D) 45. <em>Resposta: C</em></li>
<li><strong>Quantos minutos tem um dia?</strong> A) 1.240 B) 1.440 C) 1.640 D) 2.400. <em>Resposta: B</em></li>
<li><strong>Qual é a raiz quadrada de 144?</strong> A) 11 B) 12 C) 13 D) 14. <em>Resposta: B</em></li>
<li><strong>Quantos dias tem um ano bissexto?</strong> A) 364 B) 365 C) 366 D) 367. <em>Resposta: C</em></li>
<li><strong>Quantos lados tem um hexágono?</strong> A) 5 B) 6 C) 7 D) 8. <em>Resposta: B</em></li>
<li><strong>Quanto é 2 elevado a 10?</strong> A) 100 B) 512 C) 1.000 D) 1.024. <em>Resposta: D</em></li>
</ol>
<h2>Natureza e esportes</h2>
<ol start="45">
<li><strong>Qual é o maior animal do planeta?</strong> A) Elefante-africano B) Tubarão-baleia C) Baleia-azul D) Lula-gigante. <em>Resposta: C</em></li>
<li><strong>Quantas patas tem um inseto?</strong> A) 4 B) 6 C) 8 D) 10. <em>Resposta: B</em></li>
<li><strong>Qual destes animais é um mamífero?</strong> A) Tubarão B) Golfinho C) Pinguim D) Jacaré. <em>Resposta: B</em></li>
<li><strong>Quantos anéis tem o símbolo dos Jogos Olímpicos?</strong> A) 4 B) 5 C) 6 D) 7. <em>Resposta: B</em></li>
<li><strong>Quantos jogadores de cada time ficam em quadra no vôlei?</strong> A) 5 B) 6 C) 7 D) 11. <em>Resposta: B</em></li>
<li><strong>Qual é a moeda do Japão?</strong> A) Yuan B) Won C) Iene D) Rupia. <em>Resposta: C</em></li>
</ol>
<h2>Como usar estas perguntas</h2>
<ul>
<li><strong>Não use as 50 de uma vez.</strong> Entre 15 e 20 perguntas dão uns 15 minutos de jogo. Guarde o resto para a próxima rodada.</li>
<li><strong>Abra com as fáceis.</strong> A capital do Canadá, o símbolo dos Jogos Olímpicos e o maior animal do planeta são boas para aquecer.</li>
<li><strong>Feche com as difíceis.</strong> O menor país do mundo, a capital da Turquia e 2 elevado a 10 separam o pódio.</li>
<li><strong>Embaralhe a letra certa.</strong> Se você trocar a ordem das alternativas, confira de novo qual ficou marcada como certa no editor.</li>
<li><strong>Tempo:</strong> com perguntas curtas assim, 15 segundos funcionam bem. Para conta de cabeça, prefira 20.</li>
</ul>
<p>Para jogar, crie o quiz no Quiddo, cole as perguntas, marque a resposta certa e abra a sala. A turma entra pelo celular com o código de 4 letras, sem cadastro.</p>`,
  },
  {
    slug: 'perguntas-de-verdadeiro-ou-falso',
    titulo: '40 perguntas de verdadeiro ou falso para quiz',
    resumo: 'Mitos e verdades sobre ciência, animais, corpo humano, história e geografia, com a explicação de cada resposta',
    publico: 'perguntas',
    corpo: `
<p>Pergunta de verdadeiro ou falso é rápida de ler, rápida de responder e perfeita para aquecer a turma. A graça está nos mitos: coisas que quase todo mundo acredita e que não são verdade. Aqui estão 40 afirmações prontas, com a resposta e uma explicação curta para você comentar na revelação.</p>
<p>No Quiddo, escolha o tipo "Verdadeiro ou falso" no editor. A pergunta fica com duas respostas, A) Verdadeiro e B) Falso, e você só marca a certa.</p>
<h2>Ciência e espaço</h2>
<ol>
<li><strong>O Sol é uma estrela.</strong> <em>Verdadeiro.</em> É a estrela mais próxima da Terra.</li>
<li><strong>A Lua tem luz própria.</strong> <em>Falso.</em> Ela reflete a luz do Sol.</li>
<li><strong>Vênus é o planeta mais quente do Sistema Solar.</strong> <em>Verdadeiro.</em> Mesmo mais longe do Sol que Mercúrio, a atmosfera densa prende o calor.</li>
<li><strong>Plutão é classificado hoje como planeta-anão.</strong> <em>Verdadeiro.</em> A mudança foi feita em 2006.</li>
<li><strong>O som se propaga no vácuo.</strong> <em>Falso.</em> O som precisa de um meio, como o ar ou a água.</li>
<li><strong>Diamante e grafite são feitos do mesmo elemento químico.</strong> <em>Verdadeiro.</em> Os dois são carbono, organizado de jeitos diferentes.</li>
<li><strong>A Grande Muralha da China pode ser vista a olho nu da Lua.</strong> <em>Falso.</em> Ela é longa, mas estreita demais para isso.</li>
<li><strong>A água do mar congela na mesma temperatura que a água doce.</strong> <em>Falso.</em> O sal faz a água do mar congelar abaixo de 0 °C.</li>
<li><strong>O ouro conduz eletricidade.</strong> <em>Verdadeiro.</em> Por isso aparece em contatos de aparelhos eletrônicos.</li>
<li><strong>Um raio nunca cai duas vezes no mesmo lugar.</strong> <em>Falso.</em> Prédios altos e para-raios são atingidos várias vezes.</li>
</ol>
<h2>Animais</h2>
<ol start="11">
<li><strong>O polvo tem três corações.</strong> <em>Verdadeiro.</em></li>
<li><strong>Os morcegos são cegos.</strong> <em>Falso.</em> Eles enxergam. Muitos também usam o eco para se orientar.</li>
<li><strong>O camelo guarda água na corcova.</strong> <em>Falso.</em> A corcova guarda gordura.</li>
<li><strong>Avestruzes enterram a cabeça na areia quando sentem medo.</strong> <em>Falso.</em> É só uma lenda.</li>
<li><strong>Golfinhos são mamíferos.</strong> <em>Verdadeiro.</em> Respiram ar e amamentam os filhotes.</li>
<li><strong>Tubarões são mamíferos.</strong> <em>Falso.</em> São peixes.</li>
<li><strong>A aranha é um inseto.</strong> <em>Falso.</em> Ela é um aracnídeo e tem oito patas. Insetos têm seis.</li>
<li><strong>Pinguins vivem no Polo Norte.</strong> <em>Falso.</em> Eles vivem no hemisfério sul.</li>
<li><strong>O beija-flor consegue voar para trás.</strong> <em>Verdadeiro.</em></li>
<li><strong>Chocolate faz mal para cachorros.</strong> <em>Verdadeiro.</em> Ele tem uma substância tóxica para eles, a teobromina.</li>
</ol>
<h2>Corpo humano</h2>
<ol start="21">
<li><strong>O corpo de um adulto tem 206 ossos.</strong> <em>Verdadeiro.</em></li>
<li><strong>A gente usa só 10% do cérebro.</strong> <em>Falso.</em> Exames mostram atividade no cérebro inteiro.</li>
<li><strong>O coração humano tem quatro cavidades.</strong> <em>Verdadeiro.</em> Dois átrios e dois ventrículos.</li>
<li><strong>A pele é o maior órgão do corpo.</strong> <em>Verdadeiro.</em></li>
<li><strong>O fêmur, na coxa, é o maior osso do corpo.</strong> <em>Verdadeiro.</em></li>
</ol>
<h2>História</h2>
<ol start="26">
<li><strong>Brasília foi inaugurada em 1960.</strong> <em>Verdadeiro.</em> Em 21 de abril de 1960.</li>
<li><strong>Cristóvão Colombo chegou à América em 1492.</strong> <em>Verdadeiro.</em></li>
<li><strong>Os vikings usavam capacetes com chifres nas batalhas.</strong> <em>Falso.</em> A imagem veio de figurinos do século 19.</li>
<li><strong>Machado de Assis foi o primeiro presidente da Academia Brasileira de Letras.</strong> <em>Verdadeiro.</em></li>
<li><strong>Salvador foi a primeira capital do Brasil.</strong> <em>Verdadeiro.</em> Depois veio o Rio de Janeiro e, em 1960, Brasília.</li>
<li><strong>A Mona Lisa fica no Museu do Louvre, em Paris.</strong> <em>Verdadeiro.</em></li>
<li><strong>Santos Dumont voou com o 14-bis em Paris.</strong> <em>Verdadeiro.</em> Em 1906.</li>
</ol>
<h2>Geografia</h2>
<ol start="33">
<li><strong>O Brasil faz fronteira com todos os países da América do Sul.</strong> <em>Falso.</em> Chile e Equador ficam de fora.</li>
<li><strong>O português é a língua oficial de Angola.</strong> <em>Verdadeiro.</em></li>
<li><strong>O Saara é o maior deserto do mundo, contando também os desertos frios.</strong> <em>Falso.</em> O maior é a Antártida. O Saara é o maior deserto quente.</li>
<li><strong>O rio Amazonas deságua no oceano Atlântico.</strong> <em>Verdadeiro.</em></li>
<li><strong>O Japão é formado por ilhas.</strong> <em>Verdadeiro.</em></li>
<li><strong>A Torre Eiffel fica em Londres.</strong> <em>Falso.</em> Fica em Paris. Boa para quem chegou atrasado pontuar.</li>
<li><strong>A linha do Equador passa pelo Brasil.</strong> <em>Verdadeiro.</em> Ela corta a cidade de Macapá, no Amapá.</li>
<li><strong>Em ano bissexto, fevereiro tem 29 dias.</strong> <em>Verdadeiro.</em></li>
</ol>
<h2>Dicas para o verdadeiro ou falso render</h2>
<ul>
<li><strong>Equilibre as respostas.</strong> Se quase todas forem "falso", a turma percebe o padrão e chuta. Nesta lista, metade é verdadeira, mais ou menos.</li>
<li><strong>Use tempo curto.</strong> Com duas opções, 10 segundos bastam. A rapidez vale ponto: quem acerta ganha de 500 a 1000, mais quanto mais rápido.</li>
<li><strong>Comente na revelação.</strong> Leia a explicação em voz alta. "O camelo guarda gordura, não água" rende risada e conversa.</li>
<li><strong>Misture com múltipla escolha.</strong> Três ou quatro de verdadeiro ou falso no começo aquecem a sala. Depois, passe para as de quatro alternativas.</li>
<li><strong>Evite a dupla negação.</strong> "Não é verdade que o morcego não enxerga" confunde todo mundo. Escreva a afirmação de forma direta.</li>
</ul>
<p>Pronto para jogar? Monte o quiz no Quiddo com estas afirmações, abra a sala e chame a turma pelo código de 4 letras.</p>`,
  },
  {
    slug: 'quiz-de-natal-perguntas',
    titulo: 'Quiz de Natal: 40 perguntas com respostas',
    resumo: 'Tradições, o Natal na Bíblia, filmes, músicas e a ceia pelo mundo, com alternativas e respostas para a festa da família',
    publico: 'perguntas',
    corpo: `
<p>O quiz de Natal é a brincadeira certa para a hora entre a ceia e a troca de presentes: junta a família inteira, do avô ao sobrinho, e cada um responde no próprio celular. Aqui estão 40 perguntas prontas, divididas em cinco rodadas, com alternativas e resposta certa.</p>
<p>Para a família ficar ainda mais animada, misture com perguntas sobre vocês mesmos: "Quem queimou o arroz no Natal passado?" ou "Quem sempre chega atrasado na ceia?". Elas rendem as melhores risadas.</p>
<h2>Rodada 1: tradições</h2>
<ol>
<li><strong>Em que dia se comemora o Natal?</strong> A) 24 de dezembro B) 25 de dezembro C) 31 de dezembro D) 6 de janeiro. <em>Resposta: B</em></li>
<li><strong>Qual santo inspirou a figura do Papai Noel?</strong> A) São Jorge B) São Nicolau C) São Francisco D) Santo Antônio. <em>Resposta: B</em></li>
<li><strong>Segundo a tradição, onde mora o Papai Noel?</strong> A) Polo Sul B) Groenlândia C) Polo Norte D) Alasca. <em>Resposta: C</em></li>
<li><strong>Qual é o nome da rena de nariz vermelho?</strong> A) Rudolph B) Blitzen C) Comet D) Dancer. <em>Resposta: A</em></li>
<li><strong>Contando com a rena de nariz vermelho, quantas renas puxam o trenó?</strong> A) 6 B) 8 C) 9 D) 12. <em>Resposta: C</em></li>
<li><strong>De que país se espalhou o costume de montar a árvore de Natal?</strong> A) Alemanha B) Itália C) Portugal D) Estados Unidos. <em>Resposta: A</em></li>
<li><strong>Quem montou o primeiro presépio, segundo a tradição?</strong> A) São Pedro B) São Francisco de Assis C) Santo Agostinho D) São Bento. <em>Resposta: B</em></li>
<li><strong>Quantos domingos tem o Advento, o tempo de preparação para o Natal?</strong> A) 2 B) 3 C) 4 D) 6. <em>Resposta: C</em></li>
<li><strong>Como se chama a missa celebrada na noite de 24 para 25 de dezembro?</strong> A) Missa do Galo B) Missa da Aurora C) Missa da Estrela D) Missa dos Reis. <em>Resposta: A</em></li>
<li><strong>Em Minas Gerais e no Rio, o amigo secreto também é chamado de quê?</strong> A) Amigo oculto B) Amigo surpresa C) Amigo invisível D) Amigo da sorte. <em>Resposta: A</em></li>
</ol>
<h2>Rodada 2: o Natal na Bíblia</h2>
<ol start="11">
<li><strong>Em que cidade Jesus nasceu, segundo os evangelhos?</strong> A) Nazaré B) Jerusalém C) Belém D) Cafarnaum. <em>Resposta: C</em></li>
<li><strong>Onde o bebê Jesus foi deitado?</strong> A) Num berço B) Numa manjedoura C) Num cesto D) Numa rede. <em>Resposta: B</em> (Lucas 2:7)</li>
<li><strong>Que anjo anunciou a Maria que ela seria mãe de Jesus?</strong> A) Miguel B) Rafael C) Gabriel D) Uriel. <em>Resposta: C</em> (Lucas 1)</li>
<li><strong>Quais presentes os magos levaram?</strong> A) Ouro, incenso e mirra B) Ouro, prata e mirra C) Incenso, mel e ouro D) Pão, vinho e ouro. <em>Resposta: A</em> (Mateus 2:11)</li>
<li><strong>O que os magos seguiram até encontrar Jesus?</strong> A) Um anjo B) Uma estrela C) Um rio D) Um pastor. <em>Resposta: B</em></li>
<li><strong>Que rei mandou procurar o menino Jesus?</strong> A) Davi B) Salomão C) Herodes D) Saul. <em>Resposta: C</em> (Mateus 2)</li>
<li><strong>Para onde José, Maria e Jesus fugiram?</strong> A) Egito B) Grécia C) Roma D) Babilônia. <em>Resposta: A</em> (Mateus 2:13)</li>
<li><strong>Quais são os nomes dados pela tradição aos três reis magos?</strong> A) Gaspar, Melchior e Baltasar B) Pedro, Tiago e João C) Davi, Saul e Salomão D) Lucas, Marcos e Mateus. <em>Resposta: A</em></li>
</ol>
<h2>Rodada 3: filmes de Natal</h2>
<ol start="19">
<li><strong>Em "Esqueceram de Mim", como se chama o menino deixado em casa?</strong> A) Kevin B) Kyle C) Tommy D) Charlie. <em>Resposta: A</em></li>
<li><strong>Em "Esqueceram de Mim", para qual cidade a família viaja?</strong> A) Londres B) Roma C) Paris D) Nova York. <em>Resposta: C</em></li>
<li><strong>Quem criou o personagem Grinch?</strong> A) Dr. Seuss B) Walt Disney C) Roald Dahl D) Charles Dickens. <em>Resposta: A</em></li>
<li><strong>Quem escreveu "Um Conto de Natal", com o avarento Scrooge?</strong> A) Charles Dickens B) Mark Twain C) Oscar Wilde D) Jane Austen. <em>Resposta: A</em></li>
<li><strong>Sem contar o fantasma do sócio Marley, quantos espíritos do Natal visitam Scrooge?</strong> A) 2 B) 3 C) 4 D) 5. <em>Resposta: B</em></li>
<li><strong>Em "O Estranho Mundo de Jack", Jack é o rei de qual cidade?</strong> A) Cidade do Natal B) Cidade do Halloween C) Cidade da Páscoa D) Cidade dos Sonhos. <em>Resposta: B</em></li>
<li><strong>Qual ator dá voz e corpo a vários personagens em "O Expresso Polar"?</strong> A) Tom Hanks B) Jim Carrey C) Robin Williams D) Will Smith. <em>Resposta: A</em></li>
<li><strong>Qual ator interpretou o Grinch no filme com atores, de 2000?</strong> A) Eddie Murphy B) Jim Carrey C) Steve Martin D) Adam Sandler. <em>Resposta: B</em></li>
</ol>
<h2>Rodada 4: músicas</h2>
<ol start="27">
<li><strong>Em que país foi composta "Noite Feliz"?</strong> A) Alemanha B) Áustria C) Suíça D) Itália. <em>Resposta: B</em></li>
<li><strong>Como "Jingle Bells" ficou conhecida em português?</strong> A) Noite Feliz B) Bate o Sino C) Então é Natal D) Anoiteceu. <em>Resposta: B</em></li>
<li><strong>Quem canta a versão brasileira "Então é Natal"?</strong> A) Simone B) Roberto Carlos C) Xuxa D) Ivete Sangalo. <em>Resposta: A</em></li>
<li><strong>"Então é Natal" é uma versão de uma música de qual ex-Beatle?</strong> A) Paul McCartney B) Ringo Starr C) John Lennon D) George Harrison. <em>Resposta: C</em></li>
<li><strong>Quem gravou "All I Want for Christmas Is You"?</strong> A) Whitney Houston B) Celine Dion C) Mariah Carey D) Madonna. <em>Resposta: C</em></li>
<li><strong>Quem compôs e gravou "Feliz Navidad"?</strong> A) Julio Iglesias B) José Feliciano C) Ricky Martin D) Carlos Santana. <em>Resposta: B</em></li>
</ol>
<h2>Rodada 5: a ceia e o Natal pelo mundo</h2>
<ol start="33">
<li><strong>O panetone tem origem em que país?</strong> A) França B) Portugal C) Itália D) Alemanha. <em>Resposta: C</em></li>
<li><strong>A rabanada é feita com o quê?</strong> A) Pão B) Mandioca C) Arroz D) Massa folhada. <em>Resposta: A</em></li>
<li><strong>Qual planta vermelha também é chamada de flor de Natal ou bico-de-papagaio?</strong> A) Azaleia B) Poinsétia C) Hibisco D) Bromélia. <em>Resposta: B</em></li>
<li><strong>Em que país é tradição comer frango frito de lanchonete no Natal?</strong> A) Japão B) México C) Austrália D) Canadá. <em>Resposta: A</em></li>
<li><strong>Como o Papai Noel é chamado na França?</strong> A) Babbo Natale B) Père Noël C) Santa Claus D) Weihnachtsmann. <em>Resposta: B</em></li>
<li><strong>Como o Papai Noel é chamado na Itália?</strong> A) Babbo Natale B) Père Noël C) Papá Noel D) Sinterklaas. <em>Resposta: A</em></li>
<li><strong>No Brasil, o Natal cai em qual estação do ano?</strong> A) Primavera B) Verão C) Outono D) Inverno. <em>Resposta: B</em></li>
<li><strong>Em que dia se comemora o Dia de Reis, quando muita gente desmonta a árvore?</strong> A) 1º de janeiro B) 2 de janeiro C) 6 de janeiro D) 20 de janeiro. <em>Resposta: C</em></li>
</ol>
<h2>Como montar o quiz de Natal</h2>
<ul>
<li><strong>Escolha de 15 a 20 perguntas.</strong> Pegue algumas de cada rodada e junte cinco perguntas sobre a família.</li>
<li><strong>Pense nas crianças.</strong> As perguntas da rena, do Kevin e do Papai Noel são ótimas para elas. Com crianças pequenas, use 30 segundos.</li>
<li><strong>Use a TV da sala.</strong> Abra a tela do anfitrião no computador ligado à TV. Cada um responde no próprio celular.</li>
<li><strong>A última vale o dobro.</strong> Ligue essa opção no editor e guarde a pergunta mais difícil para o fim. O ranking vira até o último segundo.</li>
<li><strong>Prêmio simples:</strong> o primeiro lugar escolhe o presente primeiro no amigo secreto. No fim, o sorteio do Quiddo tira mais um ganhador entre todos.</li>
</ul>
<p>Copie as perguntas para o Quiddo, abra a sala e mande o convite no grupo da família pelo WhatsApp. Feliz Natal e bom jogo!</p>`,
  },
  {
    slug: 'perguntas-biblicas-para-quiz',
    titulo: 'Quiz bíblico: 40 perguntas com respostas',
    resumo: 'Perguntas do Antigo e do Novo Testamento, com a referência do livro e do capítulo, para grupos de jovens, células e escola dominical',
    publico: 'perguntas',
    corpo: `
<p>O quiz bíblico é uma forma alegre de revisar a Palavra com o grupo de jovens, a célula, a escola dominical ou o encontro de casais. Aqui estão 40 perguntas com alternativas, resposta certa e a referência de onde a história está, para quem quiser abrir a Bíblia na hora da revelação.</p>
<p>As perguntas seguem a ordem dos livros e começam fáceis. Use o tempo de 20 segundos para que todos leiam com calma.</p>
<h2>Antigo Testamento: de Gênesis a Êxodo</h2>
<ol>
<li><strong>Qual é o primeiro livro da Bíblia?</strong> A) Êxodo B) Gênesis C) Salmos D) Mateus. <em>Resposta: B</em></li>
<li><strong>Como se chamavam o primeiro homem e a primeira mulher?</strong> A) Abraão e Sara B) Adão e Eva C) Isaque e Rebeca D) Jacó e Raquel. <em>Resposta: B</em> (Gênesis 2 e 3)</li>
<li><strong>Quem matou Abel?</strong> A) Sete B) Caim C) Esaú D) Lameque. <em>Resposta: B</em> (Gênesis 4)</li>
<li><strong>Quem construiu a arca?</strong> A) Moisés B) Abraão C) Noé D) Elias. <em>Resposta: C</em> (Gênesis 6)</li>
<li><strong>Por quantos dias e noites choveu no dilúvio?</strong> A) 7 B) 12 C) 40 D) 100. <em>Resposta: C</em> (Gênesis 7:12)</li>
<li><strong>Quantos anos viveu Matusalém?</strong> A) 777 B) 930 C) 969 D) 1.000. <em>Resposta: C</em> (Gênesis 5:27)</li>
<li><strong>Que construção fez Deus confundir as línguas dos homens?</strong> A) O templo B) A torre de Babel C) A muralha de Jericó D) A arca. <em>Resposta: B</em> (Gênesis 11)</li>
<li><strong>Quem era a esposa de Abraão?</strong> A) Rebeca B) Raquel C) Sara D) Lia. <em>Resposta: C</em></li>
<li><strong>O que aconteceu com a mulher de Ló quando olhou para trás?</strong> A) Ficou cega B) Virou estátua de sal C) Desmaiou D) Virou pó. <em>Resposta: B</em> (Gênesis 19:26)</li>
<li><strong>Como se chamavam os filhos gêmeos de Isaque e Rebeca?</strong> A) Caim e Abel B) Esaú e Jacó C) Efraim e Manassés D) José e Benjamim. <em>Resposta: B</em> (Gênesis 25)</li>
<li><strong>Por quantas moedas de prata José foi vendido pelos irmãos?</strong> A) 10 B) 20 C) 30 D) 40. <em>Resposta: B</em> (Gênesis 37:28)</li>
<li><strong>Quem recebeu de Deus as tábuas com os Dez Mandamentos?</strong> A) Arão B) Josué C) Moisés D) Samuel. <em>Resposta: C</em> (Êxodo 20)</li>
<li><strong>Que mar se abriu para o povo de Israel passar?</strong> A) Mar Morto B) Mar da Galileia C) Mar Vermelho D) Mar Mediterrâneo. <em>Resposta: C</em> (Êxodo 14)</li>
</ol>
<h2>Antigo Testamento: reis, profetas e heróis</h2>
<ol start="14">
<li><strong>De onde vinha a força de Sansão?</strong> A) Das mãos B) Dos cabelos C) Da espada D) Da voz. <em>Resposta: B</em> (Juízes 16)</li>
<li><strong>Como se chamava a sogra de Rute?</strong> A) Ana B) Noemi C) Débora D) Miriã. <em>Resposta: B</em> (Rute 1)</li>
<li><strong>Quem foi o primeiro rei de Israel?</strong> A) Davi B) Salomão C) Saul D) Samuel. <em>Resposta: C</em></li>
<li><strong>Quem derrotou o gigante Golias?</strong> A) Saul B) Jônatas C) Davi D) Sansão. <em>Resposta: C</em> (1 Samuel 17)</li>
<li><strong>O que Salomão pediu a Deus?</strong> A) Riquezas B) Vida longa C) Sabedoria D) Vitória nas guerras. <em>Resposta: C</em> (1 Reis 3)</li>
<li><strong>Quem foi jogado na cova dos leões?</strong> A) Daniel B) Jeremias C) Elias D) Isaías. <em>Resposta: A</em> (Daniel 6)</li>
<li><strong>Quem foi engolido por um grande peixe?</strong> A) Jonas B) Elias C) Pedro D) Amós. <em>Resposta: A</em> (Jonas 1)</li>
<li><strong>Que rainha arriscou a vida para salvar o seu povo?</strong> A) Jezabel B) Ester C) Rainha de Sabá D) Vasti. <em>Resposta: B</em> (Ester 4 e 5)</li>
<li><strong>Qual salmo começa com "O Senhor é o meu pastor, nada me faltará"?</strong> A) Salmo 1 B) Salmo 23 C) Salmo 91 D) Salmo 121. <em>Resposta: B</em></li>
<li><strong>Quantos capítulos tem o livro de Salmos?</strong> A) 100 B) 120 C) 150 D) 176. <em>Resposta: C</em></li>
</ol>
<h2>Novo Testamento: a vida de Jesus</h2>
<ol start="24">
<li><strong>Quais são os quatro evangelhos?</strong> A) Mateus, Marcos, Lucas e João B) Pedro, Tiago, João e Judas C) Mateus, Paulo, Lucas e João D) Marcos, Lucas, Atos e João. <em>Resposta: A</em></li>
<li><strong>Em que rio Jesus foi batizado?</strong> A) Nilo B) Jordão C) Eufrates D) Tigre. <em>Resposta: B</em> (Mateus 3)</li>
<li><strong>Por quantos dias Jesus jejuou no deserto?</strong> A) 7 B) 12 C) 30 D) 40. <em>Resposta: D</em> (Mateus 4:2)</li>
<li><strong>Qual foi o primeiro milagre de Jesus no evangelho de João?</strong> A) Andar sobre as águas B) Transformar água em vinho C) Curar um cego D) Multiplicar os pães. <em>Resposta: B</em> (João 2, nas bodas de Caná)</li>
<li><strong>Quantos apóstolos Jesus escolheu?</strong> A) 7 B) 10 C) 12 D) 70. <em>Resposta: C</em></li>
<li><strong>Qual era a profissão de Pedro antes de seguir Jesus?</strong> A) Carpinteiro B) Pescador C) Cobrador de impostos D) Pastor de ovelhas. <em>Resposta: B</em></li>
<li><strong>Qual era a profissão de Mateus antes de seguir Jesus?</strong> A) Pescador B) Médico C) Cobrador de impostos D) Soldado. <em>Resposta: C</em> (Mateus 9:9)</li>
<li><strong>Quantos pães e peixes havia na multiplicação que alimentou cinco mil homens?</strong> A) 2 pães e 5 peixes B) 5 pães e 2 peixes C) 7 pães e 3 peixes D) 12 pães e 2 peixes. <em>Resposta: B</em> (Mateus 14)</li>
<li><strong>Além de Jesus, quem andou sobre as águas?</strong> A) João B) Tiago C) Pedro D) André. <em>Resposta: C</em> (Mateus 14:29)</li>
<li><strong>Em que evangelho está a parábola do filho pródigo?</strong> A) Mateus B) Marcos C) Lucas D) João. <em>Resposta: C</em> (Lucas 15)</li>
<li><strong>Quem subiu numa árvore para ver Jesus passar?</strong> A) Nicodemos B) Zaqueu C) Bartimeu D) Lázaro. <em>Resposta: B</em> (Lucas 19)</li>
<li><strong>Quem Jesus ressuscitou em Betânia, irmão de Marta e Maria?</strong> A) Lázaro B) Estêvão C) Filipe D) Tomé. <em>Resposta: A</em> (João 11)</li>
<li><strong>Por quantas moedas de prata Judas traiu Jesus?</strong> A) 10 B) 20 C) 30 D) 50. <em>Resposta: C</em> (Mateus 26:15)</li>
<li><strong>Quantas vezes Pedro negou Jesus?</strong> A) 1 B) 2 C) 3 D) 7. <em>Resposta: C</em></li>
</ol>
<h2>Novo Testamento: a igreja</h2>
<ol start="38">
<li><strong>Qual era o nome de Paulo antes da conversão?</strong> A) Simão B) Saulo C) Silas D) Barnabé. <em>Resposta: B</em> (Atos 9)</li>
<li><strong>Quem é lembrado como o primeiro mártir cristão?</strong> A) Pedro B) Tiago C) Estêvão D) Paulo. <em>Resposta: C</em> (Atos 7)</li>
<li><strong>Qual é o último livro da Bíblia?</strong> A) Judas B) Atos C) Apocalipse D) Hebreus. <em>Resposta: C</em></li>
</ol>
<h2>Como usar no grupo</h2>
<ul>
<li><strong>Combine com o estudo.</strong> Se o grupo está estudando um livro, escreva cinco perguntas sobre ele e misture com estas.</li>
<li><strong>Leia a referência na revelação.</strong> Depois de cada resposta, alguém lê o versículo em voz alta. O quiz vira um estudo leve.</li>
<li><strong>Atenção às versões.</strong> A numeração de alguns versículos muda um pouco entre traduções. Confira na Bíblia que o grupo usa.</li>
<li><strong>Prêmio:</strong> um livro devocional, um marcador de página ou a escolha do louvor do próximo encontro.</li>
<li><strong>Todos participam.</strong> Ninguém precisa de cadastro. Cada um entra pelo celular com o código da sala.</li>
</ul>
<p>Monte o seu quiz bíblico no Quiddo, abra a sala e projete a tela no telão da igreja ou na TV da casa.</p>`,
  },
  {
    slug: 'quiz-de-futebol-perguntas',
    titulo: 'Quiz de futebol: 40 perguntas sobre Copas e o futebol brasileiro',
    resumo: 'As cinco primeiras estrelas do Brasil, finais, craques, técnicos, estádios e regras, com alternativas e respostas',
    publico: 'perguntas',
    corpo: `
<p>Futebol é assunto que toda turma tem opinião, e o quiz é o jeito de descobrir quem entende de verdade. Estas 40 perguntas falam de história que não muda: as Copas que o Brasil ganhou de 1958 a 2002, finais marcantes, craques, técnicos, estádios e regras. Ótimas para o churrasco do jogo, o intervalo da pelada ou a resenha do escritório.</p>
<h2>As cinco primeiras estrelas</h2>
<ol>
<li><strong>Em que ano o Brasil ganhou a primeira Copa do Mundo?</strong> A) 1950 B) 1954 C) 1958 D) 1962. <em>Resposta: C</em></li>
<li><strong>Contra quem o Brasil jogou a final de 1958?</strong> A) Suécia B) Alemanha C) Itália D) Uruguai. <em>Resposta: A</em> (5 a 2)</li>
<li><strong>Em que país foi a Copa de 1962, a do bicampeonato?</strong> A) Inglaterra B) Chile C) México D) Suíça. <em>Resposta: B</em></li>
<li><strong>Contra quem o Brasil ganhou a final de 1962?</strong> A) Hungria B) Tchecoslováquia C) Iugoslávia D) Itália. <em>Resposta: B</em> (3 a 1)</li>
<li><strong>Em que país foi a Copa de 1970, a do tricampeonato?</strong> A) Argentina B) Espanha C) México D) Alemanha. <em>Resposta: C</em></li>
<li><strong>Qual foi o placar da final de 1970 contra a Itália?</strong> A) 2 a 1 B) 3 a 1 C) 4 a 1 D) 5 a 2. <em>Resposta: C</em></li>
<li><strong>Como foi decidida a final de 1994 contra a Itália?</strong> A) Na prorrogação B) Nos pênaltis C) Com gol de ouro D) No tempo normal. <em>Resposta: B</em></li>
<li><strong>Contra quem o Brasil jogou a final de 2002?</strong> A) França B) Argentina C) Alemanha D) Turquia. <em>Resposta: C</em> (2 a 0)</li>
<li><strong>Em que ano o Brasil conquistou o pentacampeonato?</strong> A) 1994 B) 1998 C) 2002 D) 2006. <em>Resposta: C</em></li>
<li><strong>A Copa de 2002 foi disputada em quais países?</strong> A) Japão e China B) Coreia do Sul e Japão C) Alemanha e Áustria D) Estados Unidos e Canadá. <em>Resposta: B</em></li>
</ol>
<h2>Craques</h2>
<ol start="11">
<li><strong>Quantos anos Pelé tinha na Copa de 1958?</strong> A) 16 B) 17 C) 19 D) 21. <em>Resposta: B</em></li>
<li><strong>Qual é o nome de batismo de Pelé?</strong> A) Edson Arantes do Nascimento B) Manuel Francisco dos Santos C) Artur Antunes Coimbra D) Ronaldo Luís Nazário. <em>Resposta: A</em></li>
<li><strong>Em que clube Pelé fez a maior parte da carreira?</strong> A) Corinthians B) Santos C) Palmeiras D) São Paulo. <em>Resposta: B</em></li>
<li><strong>Quem foi o grande nome do Brasil na Copa de 1962, depois que Pelé se machucou?</strong> A) Didi B) Garrincha C) Vavá D) Zagallo. <em>Resposta: B</em></li>
<li><strong>Em que clube Garrincha brilhou?</strong> A) Flamengo B) Vasco C) Botafogo D) Fluminense. <em>Resposta: C</em></li>
<li><strong>Qual atacante marcou gol em todos os jogos do Brasil na Copa de 1970?</strong> A) Tostão B) Rivellino C) Jairzinho D) Gérson. <em>Resposta: C</em></li>
<li><strong>Quem foi eleito o melhor jogador da Copa de 1994?</strong> A) Bebeto B) Romário C) Dunga D) Taffarel. <em>Resposta: B</em></li>
<li><strong>Quantos gols Ronaldo marcou na Copa de 2002?</strong> A) 5 B) 6 C) 7 D) 8. <em>Resposta: D</em></li>
<li><strong>Quem fez o gol de falta por cobertura contra a Inglaterra nas quartas de final de 2002?</strong> A) Rivaldo B) Roberto Carlos C) Ronaldinho Gaúcho D) Kaká. <em>Resposta: C</em></li>
<li><strong>Qual é o apelido de Zico?</strong> A) Galinho de Quintino B) Doutor C) Reizinho D) Baixinho. <em>Resposta: A</em></li>
<li><strong>Qual craque formado em medicina liderou a Democracia Corinthiana?</strong> A) Falcão B) Sócrates C) Júnior D) Careca. <em>Resposta: B</em></li>
<li><strong>Qual jogadora brasileira foi eleita a melhor do mundo pela FIFA cinco vezes seguidas, de 2006 a 2010?</strong> A) Formiga B) Cristiane C) Marta D) Sissi. <em>Resposta: C</em></li>
</ol>
<h2>Capitães e técnicos</h2>
<ol start="23">
<li><strong>Qual capitão ergueu a taça em 1958 e criou o gesto de levantá-la acima da cabeça?</strong> A) Bellini B) Nílton Santos C) Didi D) Mauro Ramos. <em>Resposta: A</em></li>
<li><strong>Quem ergueu a taça como capitão em 1970?</strong> A) Pelé B) Carlos Alberto Torres C) Clodoaldo D) Brito. <em>Resposta: B</em></li>
<li><strong>Quem ergueu a taça como capitão em 1994?</strong> A) Raí B) Dunga C) Ricardo Rocha D) Mauro Silva. <em>Resposta: B</em></li>
<li><strong>Quem ergueu a taça como capitão em 2002?</strong> A) Ronaldo B) Roberto Carlos C) Cafu D) Lúcio. <em>Resposta: C</em></li>
<li><strong>Quem foi o técnico do Brasil no tricampeonato de 1970?</strong> A) Zagallo B) Telê Santana C) Vicente Feola D) Aymoré Moreira. <em>Resposta: A</em></li>
<li><strong>Quem foi o técnico do Brasil no tetracampeonato de 1994?</strong> A) Telê Santana B) Carlos Alberto Parreira C) Zagallo D) Sebastião Lazaroni. <em>Resposta: B</em></li>
<li><strong>Quem foi o técnico do Brasil no pentacampeonato de 2002?</strong> A) Vanderlei Luxemburgo B) Carlos Alberto Parreira C) Luiz Felipe Scolari D) Emerson Leão. <em>Resposta: C</em></li>
</ol>
<h2>Jogos que ninguém esquece</h2>
<ol start="30">
<li><strong>Qual seleção venceu o Brasil no Maracanã no jogo decisivo da Copa de 1950?</strong> A) Argentina B) Uruguai C) Suécia D) Espanha. <em>Resposta: B</em></li>
<li><strong>Em que estádio foi o 7 a 1 da Alemanha sobre o Brasil, em 2014?</strong> A) Maracanã B) Mineirão C) Arena Corinthians D) Mané Garrincha. <em>Resposta: B</em></li>
<li><strong>Quem ganhou a final da Copa de 1998 contra o Brasil?</strong> A) Itália B) Holanda C) França D) Alemanha. <em>Resposta: C</em></li>
<li><strong>Que seleção eliminou o Brasil de Zico e Sócrates na Copa de 1982?</strong> A) Itália B) Argentina C) Alemanha D) Polônia. <em>Resposta: A</em></li>
<li><strong>Que país sediou e ganhou a primeira Copa do Mundo, em 1930?</strong> A) Brasil B) Argentina C) Uruguai D) Itália. <em>Resposta: C</em></li>
<li><strong>Qual seleção ganhou a Copa de 2022, no Catar?</strong> A) França B) Argentina C) Croácia D) Brasil. <em>Resposta: B</em></li>
</ol>
<h2>Estádios, camisa e regras</h2>
<ol start="36">
<li><strong>Qual é o nome oficial do Maracanã?</strong> A) Estádio Jornalista Mário Filho B) Estádio Nelson Rodrigues C) Estádio Municipal do Rio D) Estádio Mané Garrincha. <em>Resposta: A</em></li>
<li><strong>Depois de que Copa o Brasil trocou a camisa branca pela amarela?</strong> A) 1938 B) 1950 C) 1958 D) 1970. <em>Resposta: B</em></li>
<li><strong>Que taça o Brasil ganhou em definitivo com o tri e depois foi roubada, em 1983?</strong> A) Taça Jules Rimet B) Copa América C) Taça Libertadores D) Taça Independência. <em>Resposta: A</em></li>
<li><strong>A quantos metros do gol fica a marca do pênalti?</strong> A) 9 B) 11 C) 12 D) 16. <em>Resposta: B</em></li>
<li><strong>Qual país foi escolhido para sediar a Copa do Mundo feminina de 2027?</strong> A) Estados Unidos B) México C) Brasil D) Espanha. <em>Resposta: C</em></li>
</ol>
<h2>Dicas para o quiz de futebol</h2>
<ul>
<li><strong>Nem todo mundo é fanático.</strong> Comece pelas mais conhecidas, como o ano do penta e o 7 a 1, para quem não acompanha também pontuar.</li>
<li><strong>Junte perguntas da turma.</strong> "Quem perdeu o pênalti na pelada de domingo?" rende mais risada que qualquer estatística.</li>
<li><strong>Cuidado com números que mudam.</strong> Artilheiros, títulos de clubes e recordes mudam a cada temporada. Se for usar, confira antes do jogo.</li>
<li><strong>Tempo de 15 segundos</strong> funciona bem: quem sabe responde rápido e ganha mais pontos.</li>
<li><strong>Prêmio:</strong> o último colocado paga o gelo do próximo churrasco.</li>
</ul>
<p>Crie o quiz de futebol no Quiddo, abra a sala e chame a resenha pelo WhatsApp. Cada um joga pelo celular, sem cadastro.</p>`,
  },
  {
    slug: 'perguntas-sobre-o-brasil',
    titulo: '40 perguntas sobre o Brasil: história, geografia e cultura',
    resumo: 'Capitais, estados, datas da história, símbolos nacionais, comidas típicas, festas e artistas, com alternativas e respostas',
    publico: 'perguntas',
    corpo: `
<p>Quanto a turma sabe sobre o próprio país? Estas 40 perguntas passam pela geografia, pela história, pelos símbolos nacionais e pela cultura de cada região. Servem para a aula, para a confraternização ou para o encontro da família, e cada uma vem com a resposta certa.</p>
<h2>Geografia</h2>
<ol>
<li><strong>Qual é o maior estado do Brasil em área?</strong> A) Pará B) Mato Grosso C) Amazonas D) Minas Gerais. <em>Resposta: C</em></li>
<li><strong>Qual é o menor estado do Brasil em área?</strong> A) Alagoas B) Sergipe C) Espírito Santo D) Rio de Janeiro. <em>Resposta: B</em></li>
<li><strong>Quantos estados tem o Brasil, sem contar o Distrito Federal?</strong> A) 24 B) 25 C) 26 D) 27. <em>Resposta: C</em></li>
<li><strong>Qual região tem mais estados?</strong> A) Norte B) Nordeste C) Sudeste D) Sul. <em>Resposta: B</em> (nove estados)</li>
<li><strong>Qual é o ponto mais alto do Brasil?</strong> A) Pico da Bandeira B) Pico da Neblina C) Monte Roraima D) Pico das Agulhas Negras. <em>Resposta: B</em></li>
<li><strong>Qual é o maior bioma brasileiro?</strong> A) Cerrado B) Amazônia C) Mata Atlântica D) Pantanal. <em>Resposta: B</em></li>
<li><strong>Em que estado ficam as Cataratas do Iguaçu?</strong> A) Santa Catarina B) Mato Grosso do Sul C) Paraná D) São Paulo. <em>Resposta: C</em></li>
<li><strong>Quais países da América do Sul não fazem fronteira com o Brasil?</strong> A) Chile e Equador B) Peru e Chile C) Equador e Bolívia D) Uruguai e Chile. <em>Resposta: A</em></li>
<li><strong>Qual é a capital do Tocantins?</strong> A) Araguaína B) Palmas C) Gurupi D) Porto Nacional. <em>Resposta: B</em></li>
<li><strong>Qual é a capital de Roraima?</strong> A) Boa Vista B) Macapá C) Porto Velho D) Rio Branco. <em>Resposta: A</em></li>
<li><strong>Qual estado foi criado em 1988 a partir do norte de Goiás?</strong> A) Mato Grosso do Sul B) Rondônia C) Tocantins D) Acre. <em>Resposta: C</em></li>
<li><strong>A que estado pertence o arquipélago de Fernando de Noronha?</strong> A) Rio Grande do Norte B) Pernambuco C) Paraíba D) Ceará. <em>Resposta: B</em></li>
<li><strong>Que rio é chamado de "Velho Chico"?</strong> A) Rio Doce B) Rio Paraná C) Rio São Francisco D) Rio Tocantins. <em>Resposta: C</em></li>
<li><strong>Por qual capital passa a linha do Equador?</strong> A) Belém B) Macapá C) São Luís D) Manaus. <em>Resposta: B</em></li>
</ol>
<h2>História</h2>
<ol start="15">
<li><strong>Qual foi a primeira capital do Brasil?</strong> A) Rio de Janeiro B) Salvador C) São Vicente D) Olinda. <em>Resposta: B</em></li>
<li><strong>Em que ano Brasília foi inaugurada?</strong> A) 1950 B) 1955 C) 1960 D) 1964. <em>Resposta: C</em></li>
<li><strong>Qual presidente construiu Brasília?</strong> A) Getúlio Vargas B) Juscelino Kubitschek C) Jânio Quadros D) Café Filho. <em>Resposta: B</em></li>
<li><strong>Às margens de que riacho D. Pedro I proclamou a independência?</strong> A) Ipiranga B) Tietê C) Carioca D) Anhangabaú. <em>Resposta: A</em></li>
<li><strong>Em que data foi proclamada a República?</strong> A) 7 de setembro de 1822 B) 13 de maio de 1888 C) 15 de novembro de 1889 D) 21 de abril de 1792. <em>Resposta: C</em></li>
<li><strong>Quem assinou a Lei Áurea?</strong> A) D. Pedro II B) Princesa Isabel C) D. Pedro I D) Deodoro da Fonseca. <em>Resposta: B</em></li>
<li><strong>Tiradentes participou de qual movimento?</strong> A) Inconfidência Mineira B) Revolução Farroupilha C) Cabanagem D) Balaiada. <em>Resposta: A</em></li>
<li><strong>Em que ano foi promulgada a Constituição em vigor hoje?</strong> A) 1946 B) 1967 C) 1985 D) 1988. <em>Resposta: D</em></li>
<li><strong>Desde que ano o real é a moeda do Brasil?</strong> A) 1986 B) 1990 C) 1994 D) 2000. <em>Resposta: C</em></li>
<li><strong>Que árvore deu nome ao país?</strong> A) Ipê B) Pau-brasil C) Jacarandá D) Araucária. <em>Resposta: B</em></li>
</ol>
<h2>Símbolos nacionais</h2>
<ol start="25">
<li><strong>Qual é o lema escrito na bandeira?</strong> A) Paz e Amor B) Ordem e Progresso C) Liberdade e União D) Independência ou Morte. <em>Resposta: B</em></li>
<li><strong>Quantas estrelas tem a bandeira do Brasil?</strong> A) 21 B) 26 C) 27 D) 30. <em>Resposta: C</em></li>
<li><strong>Quem compôs a música do Hino Nacional?</strong> A) Carlos Gomes B) Francisco Manuel da Silva C) Heitor Villa-Lobos D) Chiquinha Gonzaga. <em>Resposta: B</em></li>
<li><strong>Quem escreveu a letra do Hino Nacional?</strong> A) Olavo Bilac B) Osório Duque-Estrada C) Castro Alves D) Gonçalves Dias. <em>Resposta: B</em></li>
</ol>
<h2>Cultura e cidades</h2>
<ol start="29">
<li><strong>Em que estado nasceu o frevo?</strong> A) Bahia B) Pernambuco C) Ceará D) Paraíba. <em>Resposta: B</em></li>
<li><strong>Em que estado acontece o Festival de Parintins, com os bois Garantido e Caprichoso?</strong> A) Pará B) Maranhão C) Amazonas D) Acre. <em>Resposta: C</em></li>
<li><strong>O acarajé é uma comida típica de qual estado?</strong> A) Bahia B) Pernambuco C) Maranhão D) Pará. <em>Resposta: A</em></li>
<li><strong>O tacacá é típico de qual região?</strong> A) Sul B) Sudeste C) Norte D) Centro-Oeste. <em>Resposta: C</em></li>
<li><strong>O chimarrão é a bebida típica de qual estado?</strong> A) Rio Grande do Sul B) Minas Gerais C) Goiás D) Bahia. <em>Resposta: A</em></li>
<li><strong>Em que morro fica o Cristo Redentor?</strong> A) Pão de Açúcar B) Corcovado C) Morro da Urca D) Dois Irmãos. <em>Resposta: B</em></li>
<li><strong>Que arquiteto projetou os principais prédios de Brasília?</strong> A) Lúcio Costa B) Oscar Niemeyer C) Paulo Mendes da Rocha D) Lina Bo Bardi. <em>Resposta: B</em></li>
<li><strong>Em que cidade aconteceu a Semana de Arte Moderna de 1922?</strong> A) Rio de Janeiro B) São Paulo C) Belo Horizonte D) Recife. <em>Resposta: B</em></li>
<li><strong>Quem escreveu o "Sítio do Picapau Amarelo"?</strong> A) Ziraldo B) Monteiro Lobato C) Ruth Rocha D) Ana Maria Machado. <em>Resposta: B</em></li>
<li><strong>Quem foi o primeiro presidente da Academia Brasileira de Letras?</strong> A) Rui Barbosa B) Olavo Bilac C) Machado de Assis D) Joaquim Nabuco. <em>Resposta: C</em></li>
<li><strong>Qual é a maior cidade do Brasil em população?</strong> A) Rio de Janeiro B) São Paulo C) Brasília D) Salvador. <em>Resposta: B</em></li>
<li><strong>Qual brasileiro voou com o 14-bis em Paris, em 1906?</strong> A) Bartolomeu de Gusmão B) Santos Dumont C) Augusto Severo D) Edu Chaves. <em>Resposta: B</em></li>
</ol>
<h2>Como aproveitar estas perguntas</h2>
<ul>
<li><strong>Na escola:</strong> use as de geografia e história como revisão antes da prova. O ranking depois de cada pergunta mantém a sala atenta.</li>
<li><strong>Na empresa:</strong> com times de várias cidades, escolha as de cultura regional. Cada um defende o próprio estado.</li>
<li><strong>Em datas especiais:</strong> no 7 de setembro ou no 15 de novembro, monte uma rodada só de história.</li>
<li><strong>Revise as alternativas.</strong> Se mudar as opções, mantenha todas do mesmo tipo: quatro estados, quatro capitais, quatro anos próximos.</li>
</ul>
<p>Crie o quiz no Quiddo, cole as perguntas, marque as certas e abra a sala para a turma entrar pelo celular.</p>`,
  },
  {
    slug: 'quiz-para-criancas',
    titulo: 'Quiz para crianças: 40 perguntas fáceis e divertidas',
    resumo: 'Perguntas separadas por idade, de 4 a 12 anos, sobre bichos, cores, números, corpo e planeta, com respostas e dicas para jogar com a criançada',
    publico: 'perguntas',
    corpo: `
<p>Criança adora competir, ver o próprio nome no ranking e comemorar no pódio. Este quiz tem 40 perguntas fáceis, separadas por faixa de idade, sobre bichos, cores, números, o corpo e o planeta. Use na festa de aniversário, na colônia de férias, no fim de semana em família ou na escola.</p>
<p>Os menores ainda não leem? Sem problema. Um adulto lê a pergunta em voz alta e a criança toca na letra no celular. Para eles, use 30 segundos e perguntas com só duas ou três alternativas.</p>
<h2>De 4 a 6 anos</h2>
<ol>
<li><strong>Que animal faz "muu"?</strong> A) Cachorro B) Vaca C) Gato. <em>Resposta: B</em></li>
<li><strong>Quantas patas tem um cachorro?</strong> A) 2 B) 4 C) 6. <em>Resposta: B</em></li>
<li><strong>Qual é a cor do céu num dia de sol?</strong> A) Verde B) Azul C) Rosa. <em>Resposta: B</em></li>
<li><strong>Que fruta amarela o macaco adora?</strong> A) Banana B) Uva C) Morango. <em>Resposta: A</em></li>
<li><strong>Quantos dedos temos em uma mão?</strong> A) 4 B) 5 C) 6. <em>Resposta: B</em></li>
<li><strong>Qual animal tem tromba?</strong> A) Girafa B) Elefante C) Leão. <em>Resposta: B</em></li>
<li><strong>O que a abelha faz?</strong> A) Leite B) Mel C) Suco. <em>Resposta: B</em></li>
<li><strong>Quantas rodas tem uma bicicleta?</strong> A) 2 B) 3 C) 4. <em>Resposta: A</em></li>
<li><strong>Misturando tinta azul com tinta amarela, que cor aparece?</strong> A) Verde B) Roxo C) Laranja. <em>Resposta: A</em></li>
<li><strong>Qual destes animais vive na água?</strong> A) Peixe B) Galinha C) Coelho. <em>Resposta: A</em></li>
<li><strong>Com que parte do corpo a gente escuta?</strong> A) Nariz B) Olhos C) Orelhas. <em>Resposta: C</em></li>
<li><strong>Que animal faz "au au"?</strong> A) Pato B) Cachorro C) Porco. <em>Resposta: B</em></li>
</ol>
<h2>De 7 a 9 anos</h2>
<ol start="13">
<li><strong>Quantos dias tem uma semana?</strong> A) 5 B) 6 C) 7 D) 8. <em>Resposta: C</em></li>
<li><strong>Quantos meses tem um ano?</strong> A) 10 B) 11 C) 12 D) 13. <em>Resposta: C</em></li>
<li><strong>Quantas horas tem um dia?</strong> A) 12 B) 20 C) 24 D) 30. <em>Resposta: C</em></li>
<li><strong>Em que planeta nós vivemos?</strong> A) Marte B) Terra C) Vênus D) Júpiter. <em>Resposta: B</em></li>
<li><strong>Quanto é 6 vezes 7?</strong> A) 36 B) 42 C) 48 D) 49. <em>Resposta: B</em></li>
<li><strong>Em que a lagarta se transforma?</strong> A) Abelha B) Borboleta C) Joaninha D) Formiga. <em>Resposta: B</em></li>
<li><strong>Como se chama o filhote do cavalo?</strong> A) Bezerro B) Potro C) Cabrito D) Leitão. <em>Resposta: B</em></li>
<li><strong>Qual é a capital do Brasil?</strong> A) Rio de Janeiro B) São Paulo C) Brasília D) Salvador. <em>Resposta: C</em></li>
<li><strong>Qual animal consegue mudar de cor?</strong> A) Camaleão B) Tartaruga C) Coruja D) Coelho. <em>Resposta: A</em></li>
<li><strong>Quantas vogais tem o nosso alfabeto?</strong> A) 4 B) 5 C) 6 D) 7. <em>Resposta: B</em></li>
<li><strong>Qual é o maior animal do mundo?</strong> A) Elefante B) Girafa C) Baleia-azul D) Tubarão. <em>Resposta: C</em></li>
<li><strong>O que as plantas precisam para crescer?</strong> A) Luz do sol e água B) Só escuro C) Areia e sal D) Suco. <em>Resposta: A</em></li>
<li><strong>Quantos lados tem um triângulo?</strong> A) 2 B) 3 C) 4 D) 5. <em>Resposta: B</em></li>
<li><strong>Qual é o planeta com anéis mais famosos?</strong> A) Marte B) Saturno C) Mercúrio D) Terra. <em>Resposta: B</em></li>
</ol>
<h2>De 10 a 12 anos</h2>
<ol start="27">
<li><strong>Qual é o maior oceano do mundo?</strong> A) Atlântico B) Índico C) Pacífico D) Ártico. <em>Resposta: C</em></li>
<li><strong>Quantos estados tem o Brasil, sem contar o Distrito Federal?</strong> A) 24 B) 26 C) 27 D) 28. <em>Resposta: B</em></li>
<li><strong>O que significa H2O?</strong> A) Sal B) Açúcar C) Água D) Oxigênio. <em>Resposta: C</em></li>
<li><strong>Qual é o maior planeta do Sistema Solar?</strong> A) Terra B) Saturno C) Júpiter D) Netuno. <em>Resposta: C</em></li>
<li><strong>Quanto é três quartos de 100?</strong> A) 25 B) 50 C) 75 D) 34. <em>Resposta: C</em></li>
<li><strong>Qual é o maior osso do corpo humano?</strong> A) Fêmur B) Úmero C) Costela D) Crânio. <em>Resposta: A</em></li>
<li><strong>Que gás respiramos para viver?</strong> A) Gás carbônico B) Oxigênio C) Hélio D) Nitrogênio. <em>Resposta: B</em></li>
<li><strong>Como se chamam os animais que comem só plantas?</strong> A) Carnívoros B) Onívoros C) Herbívoros D) Insetívoros. <em>Resposta: C</em></li>
<li><strong>Em que estado físico está o gelo?</strong> A) Sólido B) Líquido C) Gasoso D) Nenhum. <em>Resposta: A</em></li>
<li><strong>Qual dinossauro carnívoro famoso tinha braços bem curtinhos?</strong> A) Tiranossauro rex B) Tricerátops C) Estegossauro D) Braquiossauro. <em>Resposta: A</em></li>
<li><strong>Quantos lados tem um pentágono?</strong> A) 4 B) 5 C) 6 D) 8. <em>Resposta: B</em></li>
<li><strong>Quem chegou ao Brasil com a esquadra portuguesa em 1500?</strong> A) Cristóvão Colombo B) Pedro Álvares Cabral C) Vasco da Gama D) Américo Vespúcio. <em>Resposta: B</em></li>
<li><strong>Qual é o planeta mais perto do Sol?</strong> A) Vênus B) Marte C) Mercúrio D) Terra. <em>Resposta: C</em></li>
<li><strong>Quantas patas tem uma aranha?</strong> A) 6 B) 8 C) 10 D) 12. <em>Resposta: B</em></li>
</ol>
<h2>Dicas para jogar com crianças</h2>
<ul>
<li><strong>Quiz curto.</strong> De 8 a 12 perguntas é o ideal. Criança perde a atenção rápido, e o melhor é terminar com vontade de jogar de novo.</li>
<li><strong>Misture as idades com cuidado.</strong> Se a festa tem crianças de 5 e de 11 anos, monte duplas: um maior com um menor no mesmo celular.</li>
<li><strong>Apelido e bicho.</strong> Cada criança escolhe o apelido e um bicho do Brasil com acessórios. Essa parte já é metade da diversão.</li>
<li><strong>Comemore todo mundo.</strong> O pódio mostra os três primeiros, mas dá para fazer o sorteio entre todos no fim. Assim quem ficou para trás também pode ganhar um prêmio.</li>
<li><strong>Adulto por perto.</strong> Com os menores, um adulto segura o celular e lê junto. Ninguém precisa de cadastro, só o apelido.</li>
</ul>
<p>Monte o quiz da criançada no Quiddo, escolha 30 segundos por pergunta e abra a sala na TV da sala. É só dar o código e começar.</p>`,
  },
  {
    slug: 'quiz-de-filmes-e-series',
    titulo: 'Quiz de filmes e séries: 40 perguntas',
    resumo: 'Clássicos do cinema, animações, cinema brasileiro e séries famosas, com alternativas e respostas para a noite de jogos',
    publico: 'perguntas',
    corpo: `
<p>Filmes e séries são o assunto que mais une a turma: todo mundo assistiu a alguma coisa e tem uma cena favorita. Estas 40 perguntas falam de clássicos do cinema, animações, filmes brasileiros e séries conhecidas. Ótimas para a noite de jogos com os amigos, o encontro da família ou a confraternização da empresa.</p>
<h2>Clássicos do cinema</h2>
<ol>
<li><strong>Em "Titanic", como se chama a personagem de Kate Winslet?</strong> A) Rose B) Lily C) Grace D) Anne. <em>Resposta: A</em></li>
<li><strong>Quem dirigiu "Titanic"?</strong> A) Steven Spielberg B) James Cameron C) Ridley Scott D) Martin Scorsese. <em>Resposta: B</em></li>
<li><strong>Em "Star Wars", quem é o pai de Luke Skywalker?</strong> A) Obi-Wan Kenobi B) Han Solo C) Darth Vader D) Yoda. <em>Resposta: C</em></li>
<li><strong>Em "De Volta para o Futuro", qual carro vira máquina do tempo?</strong> A) Fusca B) DeLorean C) Mustang D) Cadillac. <em>Resposta: B</em></li>
<li><strong>Quem dirigiu "Jurassic Park", de 1993?</strong> A) George Lucas B) James Cameron C) Steven Spielberg D) Tim Burton. <em>Resposta: C</em></li>
<li><strong>Em "O Poderoso Chefão", qual é o sobrenome da família mafiosa?</strong> A) Soprano B) Corleone C) Gambino D) Montana. <em>Resposta: B</em></li>
<li><strong>Em "Forrest Gump", a vida é comparada a quê?</strong> A) Uma caixa de chocolates B) Uma corrida C) Um jogo de futebol D) Uma viagem de trem. <em>Resposta: A</em></li>
<li><strong>Em "Matrix", qual pílula Neo toma para conhecer a verdade?</strong> A) Azul B) Vermelha C) Verde D) Branca. <em>Resposta: B</em></li>
<li><strong>Em "O Mágico de Oz", como se chama o cachorro de Dorothy?</strong> A) Totó B) Rex C) Bidu D) Pluto. <em>Resposta: A</em></li>
<li><strong>Em que país foram filmados "O Senhor dos Anéis"?</strong> A) Irlanda B) Canadá C) Nova Zelândia D) Escócia. <em>Resposta: C</em></li>
<li><strong>Em "Harry Potter", em qual casa de Hogwarts fica Harry?</strong> A) Sonserina B) Lufa-Lufa C) Corvinal D) Grifinória. <em>Resposta: D</em></li>
<li><strong>Qual foi o primeiro filme falado em outra língua que não o inglês a ganhar o Oscar de melhor filme?</strong> A) "Roma" B) "Parasita" C) "A Vida é Bela" D) "O Tigre e o Dragão". <em>Resposta: B</em></li>
<li><strong>Em "Avatar", como se chama a lua onde vivem os Na'vi?</strong> A) Pandora B) Endor C) Arrakis D) Tatooine. <em>Resposta: A</em></li>
</ol>
<h2>Animações</h2>
<ol start="14">
<li><strong>Em "O Rei Leão", como se chama o pai de Simba?</strong> A) Scar B) Mufasa C) Rafiki D) Zazu. <em>Resposta: B</em></li>
<li><strong>Em "O Rei Leão", quais amigos ensinam "Hakuna Matata"?</strong> A) Timão e Pumba B) Tico e Teco C) Zazu e Rafiki D) Nala e Sarabi. <em>Resposta: A</em></li>
<li><strong>Em "Toy Story", qual é o nome do caubói?</strong> A) Buzz B) Woody C) Jessie D) Rex. <em>Resposta: B</em></li>
<li><strong>Em "Procurando Nemo", como se chama a peixinha que esquece tudo?</strong> A) Dory B) Pérola C) Marlin D) Gill. <em>Resposta: A</em></li>
<li><strong>Em "Shrek", qual animal é o melhor amigo do ogro?</strong> A) Gato B) Burro C) Dragão D) Cavalo. <em>Resposta: B</em></li>
<li><strong>Como se chama a música de Elsa em "Frozen", em português?</strong> A) Livre Estou B) Vou Voar C) Sou Assim D) Deixa Ir. <em>Resposta: A</em></li>
<li><strong>Em "Up: Altas Aventuras", como a casa sai voando?</strong> A) Com um foguete B) Com balões C) Com um furacão D) Com asas. <em>Resposta: B</em></li>
<li><strong>Em "Carros", qual é o nome do carro vermelho de corrida?</strong> A) Relâmpago McQueen B) Mate C) Doc Hudson D) Sally. <em>Resposta: A</em></li>
</ol>
<h2>Cinema brasileiro</h2>
<ol start="22">
<li><strong>Em "O Auto da Compadecida", quem diz "Não sei, só sei que foi assim"?</strong> A) João Grilo B) Chicó C) O padeiro D) O bispo. <em>Resposta: B</em></li>
<li><strong>Quem escreveu a peça "O Auto da Compadecida"?</strong> A) Jorge Amado B) Ariano Suassuna C) Nelson Rodrigues D) Dias Gomes. <em>Resposta: B</em></li>
<li><strong>Quem interpreta o Capitão Nascimento em "Tropa de Elite"?</strong> A) Rodrigo Santoro B) Selton Mello C) Wagner Moura D) Lázaro Ramos. <em>Resposta: C</em></li>
<li><strong>Quem dirigiu "Cidade de Deus"?</strong> A) Walter Salles B) Fernando Meirelles C) José Padilha D) Kleber Mendonça Filho. <em>Resposta: B</em></li>
<li><strong>Qual atriz foi indicada ao Oscar por "Central do Brasil"?</strong> A) Fernanda Montenegro B) Marília Pêra C) Sônia Braga D) Glória Pires. <em>Resposta: A</em></li>
<li><strong>Qual filme deu ao Brasil o primeiro Oscar de melhor filme internacional?</strong> A) "Central do Brasil" B) "Cidade de Deus" C) "Ainda Estou Aqui" D) "O Pagador de Promessas". <em>Resposta: C</em></li>
<li><strong>Quem dirigiu "Ainda Estou Aqui"?</strong> A) Walter Salles B) Fernando Meirelles C) Anna Muylaert D) Hector Babenco. <em>Resposta: A</em></li>
</ol>
<h2>Séries</h2>
<ol start="29">
<li><strong>Em "Friends", como se chama o café onde a turma se encontra?</strong> A) Central Perk B) Monk's Café C) Luke's D) MacLaren's. <em>Resposta: A</em></li>
<li><strong>Em "Friends", qual é a profissão de Ross?</strong> A) Médico B) Chef C) Paleontólogo D) Advogado. <em>Resposta: C</em></li>
<li><strong>Em "Breaking Bad", Walter White dava aula de quê?</strong> A) Física B) Química C) Biologia D) Matemática. <em>Resposta: B</em></li>
<li><strong>Em que cidade vivem "Os Simpsons"?</strong> A) Springfield B) Quahog C) South Park D) Riverdale. <em>Resposta: A</em></li>
<li><strong>Onde Homer Simpson trabalha?</strong> A) Numa fábrica de rosquinhas B) Numa usina nuclear C) Num bar D) Numa escola. <em>Resposta: B</em></li>
<li><strong>Em "Chaves", onde o Chaves costuma se esconder?</strong> A) Num armário B) Num barril C) Debaixo da escada D) Numa caixa. <em>Resposta: B</em></li>
<li><strong>De que país é a série "Chaves"?</strong> A) Argentina B) Espanha C) México D) Colômbia. <em>Resposta: C</em></li>
<li><strong>Em "Stranger Things", como se chama a cidade onde tudo acontece?</strong> A) Hawkins B) Derry C) Riverdale D) Twin Peaks. <em>Resposta: A</em></li>
<li><strong>De que país é a série "La Casa de Papel"?</strong> A) México B) Espanha C) Argentina D) Portugal. <em>Resposta: B</em></li>
<li><strong>De que país é a série "Round 6"?</strong> A) Japão B) China C) Coreia do Sul D) Tailândia. <em>Resposta: C</em></li>
<li><strong>Em "The Office", o que vende a empresa Dunder Mifflin?</strong> A) Papel B) Seguros C) Móveis D) Computadores. <em>Resposta: A</em></li>
<li><strong>"Game of Thrones" é baseada nos livros de qual autor?</strong> A) J. R. R. Tolkien B) George R. R. Martin C) Stephen King D) Neil Gaiman. <em>Resposta: B</em></li>
</ol>
<h2>Como montar a noite do quiz de cinema</h2>
<ul>
<li><strong>Escolha o público.</strong> Com crianças, foque nas animações. Com adultos, misture clássicos e séries.</li>
<li><strong>Use imagens.</strong> Cada pergunta pode ter uma imagem, que aparece na TV e nos celulares. Uma foto de cena sem o nome do filme vira uma pergunta ótima. Use imagens que você tem direito de usar.</li>
<li><strong>Guarde a mais difícil para o fim.</strong> A pergunta do "Parasita" e a do Oscar brasileiro dividem a sala. Ligue a opção "A última pergunta vale o dobro".</li>
<li><strong>Clima de cinema.</strong> O visual Entretenimento troca o relógio do "Prepare-se" por uma contagem de filme e a troca de pergunta por uma cortina de cinema.</li>
<li><strong>Prêmio:</strong> o campeão escolhe o filme da próxima sessão. Pipoca para todo mundo.</li>
</ul>
<p>Crie o quiz de filmes e séries no Quiddo, escolha o visual Entretenimento e abra a sala. A turma joga pelo celular, sem cadastro.</p>`,
  },
  {
    slug: 'quiz-de-musica-brasileira',
    titulo: 'Quiz de música brasileira: 40 perguntas',
    resumo: 'Samba, bossa nova, MPB, forró, rock nacional, axé e sertanejo, com alternativas e respostas para animar a roda',
    publico: 'perguntas',
    corpo: `
<p>Todo brasileiro tem uma trilha sonora na cabeça. Este quiz passa pelo samba, pela bossa nova, pela MPB, pelo forró, pelo rock dos anos 80, pelo axé e pelo sertanejo, com 40 perguntas e a resposta certa de cada uma. Perfeito para o churrasco, o aniversário, o karaokê da empresa ou o almoço de domingo.</p>
<p>Dica de ouro: na revelação, cante o trecho da música. A sala inteira vai junto.</p>
<h2>Samba e bossa nova</h2>
<ol>
<li><strong>Quem compôs "Garota de Ipanema"?</strong> A) Tom Jobim e Vinicius de Moraes B) Chico Buarque e Toquinho C) João Gilberto e Caetano Veloso D) Cartola e Noel Rosa. <em>Resposta: A</em></li>
<li><strong>Quem compôs "Aquarela do Brasil"?</strong> A) Pixinguinha B) Ary Barroso C) Noel Rosa D) Dorival Caymmi. <em>Resposta: B</em></li>
<li><strong>Qual gravação de João Gilberto é considerada o marco inicial da bossa nova?</strong> A) "Chega de Saudade" B) "Desafinado" C) "Wave" D) "Insensatez". <em>Resposta: A</em></li>
<li><strong>Em que estado nasceu João Gilberto?</strong> A) Rio de Janeiro B) Bahia C) Pernambuco D) Minas Gerais. <em>Resposta: B</em></li>
<li><strong>"Pelo Telefone", lembrado como o primeiro samba gravado, é de quem?</strong> A) Donga B) Cartola C) Pixinguinha D) Ataulfo Alves. <em>Resposta: A</em></li>
<li><strong>Cartola é um símbolo de qual escola de samba?</strong> A) Portela B) Mangueira C) Salgueiro D) Beija-Flor. <em>Resposta: B</em></li>
<li><strong>Quem compôs "Trem das Onze"?</strong> A) Adoniran Barbosa B) Paulinho da Viola C) Martinho da Vila D) Zeca Pagodinho. <em>Resposta: A</em></li>
<li><strong>O aeroporto internacional do Rio, o Galeão, leva o nome de qual músico?</strong> A) Vinicius de Moraes B) Tom Jobim C) Cartola D) Noel Rosa. <em>Resposta: B</em></li>
</ol>
<h2>MPB e Tropicália</h2>
<ol start="9">
<li><strong>Quais artistas lideraram a Tropicália?</strong> A) Caetano Veloso e Gilberto Gil B) Chico Buarque e Milton Nascimento C) Roberto e Erasmo Carlos D) Tom Jobim e João Gilberto. <em>Resposta: A</em></li>
<li><strong>Maria Bethânia é irmã de qual cantor?</strong> A) Gilberto Gil B) Caetano Veloso C) Djavan D) Milton Nascimento. <em>Resposta: B</em></li>
<li><strong>Quem compôs "Como Nossos Pais", eternizada por Elis Regina?</strong> A) Belchior B) Fagner C) Ivan Lins D) Gonzaguinha. <em>Resposta: A</em></li>
<li><strong>O Clube da Esquina, de Milton Nascimento e Lô Borges, nasceu em qual estado?</strong> A) São Paulo B) Bahia C) Minas Gerais D) Rio de Janeiro. <em>Resposta: C</em></li>
<li><strong>Com que música Chico Buarque venceu um festival em 1966?</strong> A) "A Banda" B) "Construção" C) "Apesar de Você" D) "Cálice". <em>Resposta: A</em></li>
<li><strong>Qual cantor de MPB foi ministro da Cultura?</strong> A) Caetano Veloso B) Gilberto Gil C) Chico Buarque D) Milton Nascimento. <em>Resposta: B</em></li>
<li><strong>Em que país nasceu Carmen Miranda?</strong> A) Brasil B) Portugal C) Espanha D) Argentina. <em>Resposta: B</em></li>
<li><strong>Qual era o apelido de Carmen Miranda?</strong> A) Pequena Notável B) Rainha do Rádio C) Divina D) Pimentinha. <em>Resposta: A</em></li>
<li><strong>Quem canta "Mas que Nada" e "País Tropical"?</strong> A) Jorge Ben Jor B) Tim Maia C) Wilson Simonal D) Djavan. <em>Resposta: A</em></li>
<li><strong>Quem gravou "Azul da Cor do Mar"?</strong> A) Tim Maia B) Cassiano C) Hyldon D) Roberto Carlos. <em>Resposta: A</em></li>
<li><strong>Em que estado nasceu Djavan?</strong> A) Pernambuco B) Alagoas C) Sergipe D) Paraíba. <em>Resposta: B</em></li>
</ol>
<h2>Forró e Nordeste</h2>
<ol start="20">
<li><strong>Quem é conhecido como o Rei do Baião?</strong> A) Dominguinhos B) Luiz Gonzaga C) Jackson do Pandeiro D) Sivuca. <em>Resposta: B</em></li>
<li><strong>Quem compôs "Asa Branca" com Luiz Gonzaga?</strong> A) Zé Dantas B) Humberto Teixeira C) João do Vale D) Dominguinhos. <em>Resposta: B</em></li>
<li><strong>Quais são os três instrumentos do trio de forró pé de serra?</strong> A) Violão, pandeiro e cavaquinho B) Sanfona, zabumba e triângulo C) Guitarra, baixo e bateria D) Flauta, viola e tambor. <em>Resposta: B</em></li>
</ol>
<h2>Jovem Guarda e rock nacional</h2>
<ol start="23">
<li><strong>Quem é chamado de "o Rei" da música brasileira?</strong> A) Erasmo Carlos B) Roberto Carlos C) Tim Maia D) Raul Seixas. <em>Resposta: B</em></li>
<li><strong>Quem canta "Maluco Beleza" e "Metamorfose Ambulante"?</strong> A) Raul Seixas B) Rita Lee C) Cazuza D) Lobão. <em>Resposta: A</em></li>
<li><strong>Rita Lee começou a carreira em qual banda?</strong> A) Os Mutantes B) Secos & Molhados C) Novos Baianos D) Titãs. <em>Resposta: A</em></li>
<li><strong>Cazuza foi vocalista de qual banda antes da carreira solo?</strong> A) Ultraje a Rigor B) Barão Vermelho C) Kid Abelha D) Legião Urbana. <em>Resposta: B</em></li>
<li><strong>A Legião Urbana surgiu em qual cidade?</strong> A) Rio de Janeiro B) São Paulo C) Brasília D) Porto Alegre. <em>Resposta: C</em></li>
<li><strong>Quem era o vocalista da Legião Urbana?</strong> A) Renato Russo B) Dinho Ouro Preto C) Herbert Vianna D) Paulo Ricardo. <em>Resposta: A</em></li>
<li><strong>Qual banda gravou "Sonífera Ilha"?</strong> A) Titãs B) Paralamas do Sucesso C) Capital Inicial D) Engenheiros do Hawaii. <em>Resposta: A</em></li>
<li><strong>Em "Pelados em Santos", dos Mamonas Assassinas, qual é o carro do cantor?</strong> A) Fusca azul B) Brasília amarela C) Chevette vermelho D) Opala preto. <em>Resposta: B</em></li>
</ol>
<h2>Axé, sertanejo e pop</h2>
<ol start="31">
<li><strong>Quem gravou "O Canto da Cidade"?</strong> A) Ivete Sangalo B) Daniela Mercury C) Margareth Menezes D) Claudia Leitte. <em>Resposta: B</em></li>
<li><strong>Ivete Sangalo ficou famosa como vocalista de qual banda?</strong> A) Chiclete com Banana B) Banda Eva C) Asa de Águia D) Timbalada. <em>Resposta: B</em></li>
<li><strong>Qual dupla gravou o sucesso "Evidências"?</strong> A) Leandro & Leonardo B) Chitãozinho & Xororó C) Zezé Di Camargo & Luciano D) Bruno & Marrone. <em>Resposta: B</em></li>
<li><strong>Qual dupla gravou "É o Amor"?</strong> A) Zezé Di Camargo & Luciano B) Chitãozinho & Xororó C) João Paulo & Daniel D) Gian & Giovani. <em>Resposta: A</em></li>
<li><strong>Quem ficou conhecida como a Rainha da Sofrência?</strong> A) Maiara B) Marília Mendonça C) Naiara Azevedo D) Simone Mendes. <em>Resposta: B</em></li>
<li><strong>Com qual música Anitta chegou ao primeiro lugar mundial do Spotify, em 2022?</strong> A) "Show das Poderosas" B) "Envolver" C) "Vai Malandra" D) "Downtown". <em>Resposta: B</em></li>
<li><strong>Qual era o apelido de Elis Regina?</strong> A) Pimentinha B) Furacão C) Pequena Notável D) Divina. <em>Resposta: A</em></li>
<li><strong>Quem gravou "O Bêbado e a Equilibrista", que virou hino da anistia?</strong> A) Gal Costa B) Elis Regina C) Nara Leão D) Maria Bethânia. <em>Resposta: B</em></li>
<li><strong>Qual instrumento de quatro cordas é a base do samba e do choro?</strong> A) Bandolim B) Cavaquinho C) Viola caipira D) Ukulele. <em>Resposta: B</em></li>
<li><strong>Quem apresentava o programa Jovem Guarda ao lado de Roberto Carlos e Wanderléa?</strong> A) Erasmo Carlos B) Ronnie Von C) Jerry Adriani D) Wanderley Cardoso. <em>Resposta: A</em></li>
</ol>
<h2>Como deixar o quiz musical mais divertido</h2>
<ul>
<li><strong>Toque um trecho.</strong> Antes de abrir a pergunta, toque 10 segundos da música na caixa de som. Depois pergunte o nome do artista ou a música.</li>
<li><strong>Complete a letra.</strong> Escreva o começo de um verso conhecido e dê quatro opções para o final. A turma canta enquanto responde.</li>
<li><strong>Uma rodada por estilo.</strong> Samba, rock, sertanejo. Cada geração brilha numa rodada e o ranking muda de dono.</li>
<li><strong>Tempo de 15 segundos.</strong> Música é memória rápida: quem sabe, sabe na hora.</li>
<li><strong>Prêmio:</strong> o campeão escolhe a próxima música da playlist.</li>
</ul>
<p>Crie o quiz de música brasileira no Quiddo, abra a sala e mande o convite pelo WhatsApp. A turma entra pelo celular, sem cadastro.</p>`,
  },
];
