// Guias do site: 34 artigos em cinco grupos. Os textos ficam em src/data/guias/*.ts,
// com corpo em HTML simples (p, h2, ul, ol, li, strong, em).
import { CASAMENTO } from './guias/casamento';
import { EMPRESAS } from './guias/empresas';
import { FESTAS } from './guias/festas';
import { GERAIS } from './guias/gerais';
import { PERGUNTAS } from './guias/perguntas';

export interface Guia {
  slug: string;
  titulo: string;
  resumo: string;
  publico: 'todos' | 'perguntas' | 'festas' | 'casamento' | 'empresas' | 'escola';
  corpo: string;
}

export const GUIAS: Guia[] = [...GERAIS, ...PERGUNTAS, ...FESTAS, ...CASAMENTO, ...EMPRESAS];

/** Grupos na ordem em que aparecem na página de guias. */
export const GRUPOS_GUIAS: [Guia['publico'][], string, string][] = [
  [['todos'], 'Dicas para qualquer quiz', 'Perguntas, ritmo, apresentação e prêmios'],
  [['perguntas'], 'Perguntas prontas para o seu quiz', 'Listas com alternativas e resposta certa para copiar e jogar'],
  [['festas'], 'Festas, aniversários e fim de ano', 'Para animar a festa e a confraternização'],
  [['casamento'], 'Despedida de solteiro e chá bar', 'Quem conhece melhor o casal'],
  [['empresas', 'escola'], 'Empresas e escolas', 'Convenção, treinamento, palestra e sala de aula'],
];
