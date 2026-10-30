// Guias do site: 20 artigos em quatro grupos. Os textos ficam em src/data/guias/*.ts,
// com corpo em HTML simples (p, h2, ul, ol, li, strong, em).
import { CASAMENTO } from './guias/casamento';
import { EMPRESAS } from './guias/empresas';
import { FESTAS } from './guias/festas';
import { GERAIS } from './guias/gerais';

export interface Guia {
  slug: string;
  titulo: string;
  resumo: string;
  publico: 'todos' | 'festas' | 'casamento' | 'empresas' | 'escola';
  corpo: string;
}

export const GUIAS: Guia[] = [...GERAIS, ...FESTAS, ...CASAMENTO, ...EMPRESAS];

/** Grupos na ordem em que aparecem na página de guias. */
export const GRUPOS_GUIAS: [Guia['publico'][], string, string][] = [
  [['todos'], 'Dicas para qualquer quiz', 'Perguntas, ritmo, apresentação e prêmios'],
  [['festas'], 'Festas, aniversários e fim de ano', 'Para animar a festa e a confraternização'],
  [['casamento'], 'Despedida de solteiro e chá bar', 'Quem conhece melhor o casal'],
  [['empresas', 'escola'], 'Empresas e escolas', 'Convenção, treinamento, palestra e sala de aula'],
];
