// Pacotes prontos de cada modo, usados quando a pessoa cria um quiz novo: só duas perguntas de modelo,
// uma de verdadeiro ou falso e uma de múltipla escolha. A resposta certa da múltipla escolha é sempre
// a primeira aqui (c: 0); o editor embaralha as respostas. Verdadeiro ou falso não embaralha.
import type { Question, Theme } from '../../shared/protocol';

export interface TemaInfo {
  nome: string;
  desc: string;
  cores: string[];
  chamada: string;
  pacote: (Question & { vf?: boolean })[];
}

export const TEMAS: Record<Theme, TemaInfo> = {
  corp: {
    nome: 'Corporativo',
    desc: 'Convenção, apresentação, treinamento, confraternização',
    cores: ['#0E2A22', '#F3F2EF', '#13A07A', '#1E7FD6'],
    chamada: 'Quebra-gelo da equipe',
    pacote: [
      { t: 'O Pix foi lançado no Brasil em 2020.', o: ['Verdadeiro', 'Falso'], c: 0, tl: 20, vf: true },
      { t: 'O que significa a sigla KPI?', o: ['Indicador-chave de desempenho', 'Índice de produtividade interna', 'Chave de processos integrados', 'Indicador de planejamento interno'], c: 0, tl: 20 },
    ],
  },
  festa: {
    nome: 'Amigos & família',
    desc: 'Aniversário, churrasco, viagem, Natal, resenha',
    cores: ['#13A07A', '#FF7A1A', '#FFC83D', '#E5383B'],
    chamada: 'Quem manja mais da turma',
    pacote: [
      { t: 'O Brasil ganhou o penta em 2002.', o: ['Verdadeiro', 'Falso'], c: 0, tl: 15, vf: true },
      { t: 'Qual destas é uma fruta típica do Cerrado?', o: ['Pequi', 'Kiwi', 'Lichia', 'Mirtilo'], c: 0, tl: 15 },
    ],
  },
  escola: {
    nome: 'Escola',
    desc: 'Revisão para prova, gincana, feira, aula diferente',
    cores: ['#2B59C3', '#FFC83D', '#7B4FD6', '#EEF4FF'],
    chamada: 'Valendo ponto na revisão',
    pacote: [
      { t: 'Brasília é a capital do Brasil.', o: ['Verdadeiro', 'Falso'], c: 0, tl: 20, vf: true },
      { t: 'Qual é o maior planeta do Sistema Solar?', o: ['Júpiter', 'Saturno', 'Terra', 'Netuno'], c: 0, tl: 20 },
    ],
  },
};

/** Cópia do pacote com as respostas embaralhadas, para a certa não ficar sempre na letra A. */
export function pacote(theme: Theme): (Question & { vf?: boolean })[] {
  return TEMAS[theme].pacote.map((q) => {
    if (q.vf) return { ...q, o: [...q.o] };
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
