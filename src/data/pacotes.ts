// Pacotes prontos de cada tema, usados quando a pessoa cria um quiz novo. A resposta certa é sempre
// a primeira aqui (c: 0); o editor embaralha as respostas.
import type { Question, Theme } from '../../shared/protocol';

export interface TemaInfo {
  nome: string;
  desc: string;
  cores: string[];
  chamada: string;
  pacote: Question[];
}

export const TEMAS: Record<Theme, TemaInfo> = {
  corp: {
    nome: 'Corporativo',
    desc: 'Convenção, apresentação, treinamento, confraternização',
    cores: ['#0E2A22', '#F3F2EF', '#13A07A', '#1E7FD6'],
    chamada: 'Quebra-gelo da equipe',
    pacote: [
      { t: 'Em que ano o Pix foi lançado no Brasil?', o: ['2020', '2018', '2021', '2019'], c: 0, tl: 15 },
      { t: 'O que significa a sigla KPI?', o: ['Indicador-chave de desempenho', 'Índice de produtividade interna', 'Chave de processos integrados', 'Indicador de planejamento interno'], c: 0, tl: 15 },
      { t: 'Qual é a jornada semanal padrão pela CLT?', o: ['44 horas', '40 horas', '48 horas', '36 horas'], c: 0, tl: 15 },
      { t: 'Em que ano a CLT foi criada?', o: ['1943', '1932', '1964', '1988'], c: 0, tl: 15 },
      { t: 'Qual empresa criou o Excel?', o: ['Microsoft', 'Apple', 'IBM', 'Oracle'], c: 0, tl: 15 },
      { t: 'Como se chama o símbolo @ em português?', o: ['Arroba', 'Arrouba', 'Ampersand', 'Cerquilha'], c: 0, tl: 15 },
      { t: 'Numa planilha, a célula C7 fica em qual coluna?', o: ['C', '7', 'G', 'Depende do arquivo'], c: 0, tl: 15 },
      { t: 'Qual destas redes sociais é focada em carreira?', o: ['LinkedIn', 'Pinterest', 'Telegram', 'Twitch'], c: 0, tl: 15 },
    ],
  },
  festa: {
    nome: 'Amigos & família',
    desc: 'Aniversário, churrasco, viagem, Natal, resenha',
    cores: ['#13A07A', '#FF7A1A', '#FFC83D', '#E5383B'],
    chamada: 'Quem manja mais da turma',
    pacote: [
      { t: 'Qual destas é uma fruta típica do Cerrado?', o: ['Pequi', 'Kiwi', 'Lichia', 'Mirtilo'], c: 0, tl: 15 },
      { t: 'Quantos jogadores um time de futebol tem em campo?', o: ['11', '10', '12', '9'], c: 0, tl: 15 },
      { t: 'Em que ano o Brasil ganhou o penta?', o: ['2002', '1998', '1994', '2006'], c: 0, tl: 15 },
      { t: 'Qual drinque leva cachaça, limão, açúcar e gelo?', o: ['Caipirinha', 'Batida', 'Quentão', 'Rabo de galo'], c: 0, tl: 15 },
      { t: 'Em que ano o homem pisou na Lua pela primeira vez?', o: ['1969', '1972', '1965', '1959'], c: 0, tl: 15 },
      { t: 'Qual é o maior animal do mundo?', o: ['Baleia-azul', 'Elefante-africano', 'Tubarão-baleia', 'Girafa'], c: 0, tl: 15 },
      { t: 'Quantos dias tem um ano bissexto?', o: ['366', '365', '364', '367'], c: 0, tl: 15 },
      { t: 'Qual é o maior estado do Brasil em área?', o: ['Amazonas', 'Pará', 'Mato Grosso', 'Minas Gerais'], c: 0, tl: 15 },
      { t: 'Qual planeta é conhecido como planeta vermelho?', o: ['Marte', 'Júpiter', 'Vênus', 'Saturno'], c: 0, tl: 15 },
      { t: 'De que país vem a pizza margherita?', o: ['Itália', 'Estados Unidos', 'França', 'Grécia'], c: 0, tl: 15 },
    ],
  },
  escola: {
    nome: 'Escola',
    desc: 'Revisão para prova, gincana, feira, aula diferente',
    cores: ['#2B59C3', '#FFC83D', '#7B4FD6', '#EEF4FF'],
    chamada: 'Valendo ponto na revisão',
    pacote: [
      { t: 'Qual é a capital do Brasil?', o: ['Brasília', 'Rio de Janeiro', 'São Paulo', 'Salvador'], c: 0, tl: 15 },
      { t: 'Quanto é 7 × 8?', o: ['56', '54', '64', '48'], c: 0, tl: 15 },
      { t: 'Qual é o maior planeta do Sistema Solar?', o: ['Júpiter', 'Saturno', 'Terra', 'Netuno'], c: 0, tl: 15 },
      { t: 'Quem escreveu "Dom Casmurro"?', o: ['Machado de Assis', 'José de Alencar', 'Monteiro Lobato', 'Clarice Lispector'], c: 0, tl: 15 },
      { t: 'Em que ano o Brasil declarou a independência?', o: ['1822', '1500', '1889', '1888'], c: 0, tl: 15 },
      { t: 'Qual é o plural de "pão"?', o: ['Pães', 'Pãos', 'Pões', 'Pãoes'], c: 0, tl: 15 },
      { t: 'A água ferve a quantos graus Celsius, ao nível do mar?', o: ['100', '90', '80', '120'], c: 0, tl: 15 },
      { t: 'Qual é o maior rio do Brasil em volume de água?', o: ['Amazonas', 'São Francisco', 'Paraná', 'Tietê'], c: 0, tl: 15 },
    ],
  },
};

/** Cópia do pacote com as respostas embaralhadas, para a certa não ficar sempre na letra A. */
export function pacote(theme: Theme): Question[] {
  return TEMAS[theme].pacote.map((q) => {
    const idx = q.o.map((_, i) => i).sort(() => Math.random() - 0.5);
    return { t: q.t, o: idx.map((i) => q.o[i]), c: idx.indexOf(q.c), tl: q.tl };
  });
}

export const CORES_MARCA: [string, string][] = [
  ['#111827', 'Preto'],
  ['#1D4ED8', 'Azul'],
  ['#0E7490', 'Petróleo'],
  ['#15803D', 'Verde'],
  ['#DC2626', 'Vermelho'],
  ['#EA580C', 'Laranja'],
  ['#DB2777', 'Rosa'],
  ['#7C3AED', 'Roxo'],
];
