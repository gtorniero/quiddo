// Quizzes prontos do modo Amigos & família: 10 perguntas cada, que valem para qualquer turma.
// A resposta certa é `c` (índice em `o`); o editor embaralha as respostas ao carregar.
// Despedida é um modelo sobre o casal: quem organiza troca as opções e marca a certa.

export interface Modelo {
  id: string;
  nome: string;
  desc: string;
  titulo: string; // nome sugerido para o quiz
  perguntas: { t: string; o: string[]; c: number }[];
}

export const MODELOS: Modelo[] = [
  {
    id: 'natal',
    nome: 'Natal',
    desc: 'Tradições, filmes e comidas',
    titulo: 'Quiz de Natal',
    perguntas: [
      { t: 'Na história mais conhecida, quantas renas puxam o trenó do Papai Noel, sem contar o Rudolph?', o: ['6', '8', '10', '12'], c: 1 },
      { t: 'Como se chama a rena de nariz vermelho?', o: ['Rudolph', 'Cometa', 'Relâmpago', 'Corredor'], c: 0 },
      { t: 'De que país vem o panetone?', o: ['Itália', 'França', 'Alemanha', 'Espanha'], c: 0 },
      { t: 'Em que mês começa o verão no Brasil?', o: ['Outubro', 'Novembro', 'Dezembro', 'Janeiro'], c: 2 },
      { t: 'Segundo a Bíblia, em que cidade Jesus nasceu?', o: ['Nazaré', 'Belém', 'Jerusalém', 'Galileia'], c: 1 },
      { t: 'Em que língua "Noite Feliz" foi composta?', o: ['Alemão', 'Inglês', 'Latim', 'Italiano'], c: 0 },
      { t: 'No filme "Esqueceram de Mim", para onde a família viaja?', o: ['Paris', 'Londres', 'Nova York', 'Flórida'], c: 0 },
      { t: 'Qual doce de Natal é feito com pão amanhecido, leite e ovos, e depois frito?', o: ['Rabanada', 'Pavê', 'Panetone', 'Bolo-rei'], c: 0 },
      { t: 'Em que dia se comemora o Dia de Reis?', o: ['25 de dezembro', '31 de dezembro', '1º de janeiro', '6 de janeiro'], c: 3 },
      { t: 'O costume da árvore de Natal começou em que país?', o: ['Alemanha', 'Estados Unidos', 'Portugal', 'Brasil'], c: 0 },
    ],
  },
  {
    id: 'fim-de-ano',
    nome: 'Festa de fim de ano',
    desc: 'Retrospectiva e conhecimentos gerais',
    titulo: 'Quiz de fim de ano',
    perguntas: [
      { t: 'Onde acontece a Copa do Mundo de 2026?', o: ['Catar', 'Brasil', 'Estados Unidos, Canadá e México', 'Espanha e Portugal'], c: 2 },
      { t: 'Quantas seleções disputam a Copa de 2026?', o: ['32', '40', '48', '64'], c: 2 },
      { t: 'Em que país foram os Jogos Olímpicos de Inverno de 2026?', o: ['Itália', 'Japão', 'Canadá', 'Noruega'], c: 0 },
      { t: 'Qual cidade brasileira recebeu a COP30, a conferência do clima da ONU?', o: ['Manaus', 'Belém', 'Rio de Janeiro', 'Brasília'], c: 1 },
      { t: 'Que nome escolheu o papa eleito em 2025?', o: ['Francisco II', 'João Paulo III', 'Leão XIV', 'Bento XVII'], c: 2 },
      { t: 'Em que país nasceu o papa Leão XIV?', o: ['Argentina', 'Itália', 'Estados Unidos', 'Peru'], c: 2 },
      { t: 'Por qual filme Wagner Moura ganhou o prêmio de melhor ator em Cannes?', o: ['Ainda Estou Aqui', 'O Agente Secreto', 'Cidade de Deus', 'Tropa de Elite'], c: 1 },
      { t: 'Em que ano "Ainda Estou Aqui" ganhou o Oscar de melhor filme internacional?', o: ['2023', '2024', '2025', '2026'], c: 2 },
      { t: 'Em que ano o Pix foi lançado no Brasil?', o: ['2018', '2019', '2020', '2021'], c: 2 },
      { t: 'Qual é o planeta mais próximo do Sol?', o: ['Mercúrio', 'Vênus', 'Marte', 'Terra'], c: 0 },
    ],
  },
  {
    id: 'futebol',
    nome: 'Futebol difícil',
    desc: 'Para a confra de amigos: só quem manja',
    titulo: 'Quiz de futebol',
    perguntas: [
      { t: 'Que seleção eliminou o Brasil na Copa de 2022?', o: ['Argentina', 'França', 'Croácia', 'Bélgica'], c: 2 },
      { t: 'Para quem o Brasil perdeu a final da Copa de 1950, no Maracanã?', o: ['Uruguai', 'Argentina', 'Itália', 'Suécia'], c: 0 },
      { t: 'Quantos gols Ronaldo fez na final de 2002, contra a Alemanha?', o: ['1', '2', '3', 'Nenhum, o gol foi do Rivaldo'], c: 1 },
      { t: 'Qual foi o placar de Brasil x Itália na final da Copa de 1970?', o: ['2 a 1', '3 a 0', '4 a 1', '1 a 0'], c: 2 },
      { t: 'Quantos gols Pelé marcou em Copas do Mundo?', o: ['8', '12', '15', '20'], c: 1 },
      { t: 'Qual time brasileiro ganhou o primeiro Mundial de Clubes da Fifa, em 2000?', o: ['Corinthians', 'Vasco', 'São Paulo', 'Palmeiras'], c: 0 },
      { t: 'Qual jogador entrou em campo mais vezes pela seleção brasileira?', o: ['Neymar', 'Cafu', 'Daniel Alves', 'Roberto Carlos'], c: 1 },
      { t: 'Em que cidade foi a final da Copa de 1994?', o: ['Pasadena', 'Nova York', 'Chicago', 'Dallas'], c: 0 },
      { t: 'Quem marcou o gol do título do Brasil na final da Copa de 1994?', o: ['Romário', 'Bebeto', 'Branco', 'Ninguém: foi 0 a 0 e o título veio nos pênaltis'], c: 3 },
      { t: 'Quem perdeu o último pênalti da Itália na final de 1994?', o: ['Baresi', 'Massaro', 'Roberto Baggio', 'Maldini'], c: 2 },
    ],
  },
  {
    id: 'despedida',
    nome: 'Despedida de solteiro(a)',
    desc: 'Quem conhece o casal? Troque as opções e marque a certa',
    titulo: 'Quem conhece o casal?',
    perguntas: [
      { t: 'Onde o casal se conheceu?', o: ['No trabalho', 'Na faculdade', 'Num aplicativo', 'Por amigos'], c: 0 },
      { t: 'Qual foi o primeiro encontro?', o: ['Barzinho', 'Cinema', 'Jantar', 'Show'], c: 0 },
      { t: 'Quanto tempo de namoro até o pedido?', o: ['Menos de 1 ano', 'De 1 a 3 anos', 'De 3 a 5 anos', 'Mais de 5 anos'], c: 0 },
      { t: 'Quem disse "eu te amo" primeiro?', o: ['A noiva', 'O noivo'], c: 0 },
      { t: 'Quem é mais ciumento?', o: ['A noiva', 'O noivo'], c: 0 },
      { t: 'Quem demora mais para se arrumar?', o: ['A noiva', 'O noivo'], c: 0 },
      { t: 'Qual é a comida preferida do casal?', o: ['Pizza', 'Japonês', 'Hambúrguer', 'Churrasco'], c: 0 },
      { t: 'Quem cozinha melhor?', o: ['A noiva', 'O noivo'], c: 0 },
      { t: 'Para onde foi a primeira viagem juntos?', o: ['Praia', 'Serra', 'Outro país', 'Interior'], c: 0 },
      { t: 'Quem fez o pedido de casamento?', o: ['A noiva', 'O noivo'], c: 0 },
    ],
  },
  {
    id: 'cha-bar',
    nome: 'Chá bar',
    desc: 'Bodas, drinques e casamento',
    titulo: 'Quiz do chá bar',
    perguntas: [
      { t: 'Quantos anos de casamento são as bodas de prata?', o: ['10', '15', '25', '50'], c: 2 },
      { t: 'E as bodas de ouro?', o: ['25', '40', '50', '60'], c: 2 },
      { t: 'Quantos anos de casamento são as bodas de papel?', o: ['1', '2', '5', '10'], c: 0 },
      { t: 'No Brasil, depois do casamento, em que mão a aliança costuma ficar?', o: ['Direita', 'Esquerda'], c: 1 },
      { t: 'Qual destes não é um drinque?', o: ['Negroni', 'Cosmopolitan', 'Tiramisù', 'Bellini'], c: 2 },
      { t: 'Qual é a bebida base da caipirinha tradicional?', o: ['Vodca', 'Cachaça', 'Rum', 'Saquê'], c: 1 },
      { t: 'O espumante prosecco vem de que país?', o: ['Itália', 'França', 'Espanha', 'Portugal'], c: 0 },
      { t: 'Que fruto dá o sabor principal do gim?', o: ['Limão', 'Zimbro', 'Laranja', 'Uva'], c: 1 },
      { t: 'Qual destes objetos serve para misturar drinques?', o: ['Fouet', 'Coqueteleira', 'Concha', 'Rolo'], c: 1 },
      { t: 'Em que taça se serve espumante?', o: ['Taça flute', 'Copo baixo', 'Caneca', 'Copo americano'], c: 0 },
    ],
  },
];
