// Guias do site. Cada guia tem um corpo em HTML simples (h2, p, ul, ol).
// Guia sem corpo ainda não aparece na lista; é só colar o texto quando chegar.
export interface Guia {
  slug: string;
  titulo: string;
  resumo: string;
  publico: 'empresas' | 'festas' | 'todos';
  corpo: string;
}

export const GUIAS: Guia[] = [
  {
    slug: 'como-escrever-boas-perguntas',
    titulo: 'Como escrever boas perguntas',
    resumo: 'Regras rápidas e exemplos para o quiz render na sala',
    publico: 'todos',
    corpo: `
<p>Um bom quiz ao vivo é rápido de ler, tem uma resposta certa sem discussão e deixa a sala rindo, não brigando. Estas regras valem para a convenção da empresa e para o aniversário da tia.</p>
<h2>1. Uma ideia por pergunta</h2>
<p>A pergunta precisa caber numa olhada para a TV. Se você precisa de vírgula, provavelmente são duas perguntas.</p>
<ul><li>Ruim: “Considerando a última reunião, qual foi o número citado pelo diretor sobre vendas no Sul?”</li><li>Bom: “Quanto o Sul vendeu em março?”</li></ul>
<h2>2. Respostas do mesmo tamanho</h2>
<p>Quando a certa é a única longa, todo mundo acerta sem pensar. Deixe as quatro parecidas no tamanho e no jeito de escrever.</p>
<h2>3. Erradas que parecem certas</h2>
<p>A graça está nas alternativas plausíveis. Para anos, use anos próximos. Para nomes, use nomes da mesma turma.</p>
<h2>4. Tempo de acordo com a leitura</h2>
<ul><li>10 segundos: pergunta curta, resposta de uma palavra.</li><li>20 segundos: o padrão.</li><li>30 segundos: conta, foto mental, pergunta mais longa.</li></ul>
<h2>5. Misture fácil e difícil</h2>
<p>Comece com duas fáceis para todo mundo pontuar e entrar no clima. Coloque a mais difícil perto do fim, quando o ranking está apertado.</p>
<h2>6. Use os nomes da turma</h2>
<p>No tema Amigos & família, escreva {A} na pergunta e o nome do aniversariante entra no lugar. “Qual é a comida preferida de {A}?” rende mais risada que qualquer pergunta de almanaque.</p>
<h2>7. Revise antes de abrir a sala</h2>
<ol><li>Leia cada pergunta em voz alta.</li><li>Confira se a certa está marcada.</li><li>Jogue sozinho no celular uma vez, com a sala de teste.</li></ol>`,
  },
  { slug: 'quiz-convencao-de-vendas', titulo: 'Convenção de vendas', resumo: '7 rodadas que engajam o time', publico: 'empresas', corpo: '' },
  { slug: 'apresentacao-executiva-interativa', titulo: 'Apresentação executiva interativa', resumo: 'Como prender a sala do começo ao fim', publico: 'empresas', corpo: '' },
  { slug: 'sorteio-de-premios-depois-do-pitch', titulo: 'Sorteio de prêmios depois do pitch', resumo: 'Quiz e sorteio para fechar com energia', publico: 'empresas', corpo: '' },
  { slug: 'quiz-de-integracao-de-novos-funcionarios', titulo: 'Integração de novos funcionários', resumo: 'O primeiro dia sem slide chato', publico: 'empresas', corpo: '' },
  { slug: 'quiz-de-treinamento', titulo: 'Quiz de treinamento', resumo: 'Fixar o conteúdo jogando', publico: 'empresas', corpo: '' },
  { slug: 'quiz-de-aniversario', titulo: 'Quiz de aniversário', resumo: 'Quem conhece melhor o aniversariante', publico: 'festas', corpo: '' },
  { slug: 'quiz-despedida-de-solteiro', titulo: 'Despedida de solteiro e chá', resumo: 'Quem conhece melhor o casal', publico: 'festas', corpo: '' },
  { slug: 'quiz-de-natal-em-familia', titulo: 'Natal em família', resumo: 'Perguntas para a ceia ficar animada', publico: 'festas', corpo: '' },
  { slug: 'quiz-para-churrasco', titulo: 'Quiz para churrasco', resumo: 'Rodadas rápidas entre uma carne e outra', publico: 'festas', corpo: '' },
];
