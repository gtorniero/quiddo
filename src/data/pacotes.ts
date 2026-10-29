// Pacotes prontos de cada tema. A resposta certa é sempre a primeira aqui (c: 0);
// o editor embaralha as respostas ao carregar o pacote.
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
    cores: ['#18181B', '#44403C', '#71717A', '#A16207'],
    chamada: 'Quebra-gelo da equipe',
    pacote: [
      { t: 'Em que ano o Pix foi lançado no Brasil?', o: ['2020', '2018', '2021', '2019'], c: 0, tl: 20 },
      { t: 'O que significa a sigla KPI?', o: ['Indicador-chave de desempenho', 'Índice de produtividade interna', 'Chave de processos integrados', 'Indicador de planejamento interno'], c: 0, tl: 20 },
      { t: 'Qual é a jornada semanal padrão pela CLT?', o: ['44 horas', '40 horas', '48 horas', '36 horas'], c: 0, tl: 20 },
      { t: 'Em que ano a CLT foi criada?', o: ['1943', '1932', '1964', '1988'], c: 0, tl: 20 },
      { t: 'Qual empresa criou o Excel?', o: ['Microsoft', 'Apple', 'IBM', 'Oracle'], c: 0, tl: 15 },
      { t: 'Como se chama o símbolo @ em português?', o: ['Arroba', 'Arrouba', 'Ampersand', 'Cerquilha'], c: 0, tl: 15 },
      { t: 'Numa planilha, a célula C7 fica em qual coluna?', o: ['C', '7', 'G', 'Depende do arquivo'], c: 0, tl: 10 },
      { t: 'Qual destas redes sociais é focada em carreira?', o: ['LinkedIn', 'Pinterest', 'Telegram', 'Twitch'], c: 0, tl: 15 },
    ],
  },
  festa: {
    nome: 'Amigos & família',
    desc: 'Aniversário, churrasco, viagem, Natal, resenha',
    cores: ['#FF4F8B', '#D97706', '#12A06A', '#7C5CFF'],
    chamada: 'Quem manja mais da turma',
    pacote: [
      { t: 'Qual é a comida preferida de {A}?', o: ['', '', '', ''], c: 0, tl: 20 },
      { t: 'Em que cidade {A} nasceu?', o: ['', '', '', ''], c: 0, tl: 20 },
      { t: 'Em que ano o Brasil ganhou o penta?', o: ['2002', '1998', '1994', '2006'], c: 0, tl: 15 },
      { t: 'Qual drinque leva cachaça, limão, açúcar e gelo?', o: ['Caipirinha', 'Batida', 'Quentão', 'Rabo de galo'], c: 0, tl: 15 },
      { t: 'Em que ano o homem pisou na Lua pela primeira vez?', o: ['1969', '1972', '1965', '1959'], c: 0, tl: 15 },
      { t: 'Qual é o maior animal do mundo?', o: ['Baleia-azul', 'Elefante-africano', 'Tubarão-baleia', 'Girafa'], c: 0, tl: 15 },
      { t: 'Quantos dias tem um ano bissexto?', o: ['366', '365', '364', '367'], c: 0, tl: 10 },
      { t: 'Qual é o maior estado do Brasil em área?', o: ['Amazonas', 'Pará', 'Mato Grosso', 'Minas Gerais'], c: 0, tl: 15 },
      { t: 'Qual planeta é conhecido como planeta vermelho?', o: ['Marte', 'Júpiter', 'Vênus', 'Saturno'], c: 0, tl: 10 },
      { t: 'De que país vem a pizza margherita?', o: ['Itália', 'Estados Unidos', 'França', 'Grécia'], c: 0, tl: 10 },
    ],
  },
};

/** Cópia do pacote com as respostas embaralhadas, para a certa não ficar sempre na letra A. */
export function pacote(theme: Theme): Question[] {
  return TEMAS[theme].pacote.map((q) => {
    if (!q.o.some((o) => o)) return { ...q, o: [...q.o] };
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
