// Visuais (templates) de cada modo. O anfitrião escolhe o modo e, só depois, o visual.
// Floresta é o padrão de todos: o Quiddo de sempre (olho do tucano, cortina de folhas, pódio na mata).
import type { Visual } from '../../shared/protocol';

export interface VisualInfo {
  nome: string;
  desc: string;
  cores: string[]; // amostra no editor
  prep: string; // frase do "Prepare-se"
  vai: string; // palavra que aparece no lugar do número no fim da contagem
  campeao: string; // título do pódio: "{nome} venceu!" etc. ({n} = apelido)
}

export const VISUAIS: Record<Visual, VisualInfo> = {
  floresta: {
    nome: 'Floresta',
    desc: 'O Quiddo de sempre: mata, tucano e cortina de folhas',
    cores: ['#0B5D45', '#13A07A', '#FFC83D', '#FF7A1A'],
    prep: 'Prepare-se!',
    vai: 'Bora!',
    campeao: '{n} venceu!',
  },
  escritorio: {
    nome: 'Escritório',
    desc: 'Escritório descolado: post-its, café, pufes e neon',
    cores: ['#F4F1FF', '#4C6FFF', '#FF5C8A', '#FFC23D'],
    prep: 'Pega o café e vem!',
    vai: 'Partiu!',
    campeao: '{n} é destaque do time!',
  },
  entretenimento: {
    nome: 'Entretenimento',
    desc: 'Noite de estreia: cinema, pipoca e tapete vermelho',
    cores: ['#121216', '#D7263D', '#F5B800', '#F5F0E6'],
    prep: 'Luz, câmera…',
    vai: 'Ação!',
    campeao: '{n} é a estrela da noite!',
  },
  sala: {
    nome: 'Sala de aula',
    desc: 'Lousa, giz, cadernos e aviãozinho de papel',
    cores: ['#2E4A3A', '#F2F2EA', '#FFE066', '#C9A06A'],
    prep: 'Lápis na mão!',
    vai: 'Valendo!',
    campeao: '{n} tirou nota 10!',
  },
  album: {
    nome: 'Álbum de figurinhas',
    desc: 'Cada aluno é uma figurinha, o pódio é a página do álbum',
    cores: ['#FFFDF5', '#2B59C3', '#FFC83D', '#E5383B'],
    prep: 'Abrindo o pacotinho…',
    vai: 'Cola!',
    campeao: '{n} completou o álbum!',
  },
  espaco: {
    nome: 'Espaço',
    desc: 'Missão espacial: foguete, planetas e pódio na Lua',
    cores: ['#0B1033', '#7B4FD6', '#FFC83D', '#5BC0EB'],
    prep: 'Contagem regressiva!',
    vai: 'Decolar!',
    campeao: '{n} chegou primeiro à Lua!',
  },
  amor: {
    nome: 'Amor',
    desc: 'Todo mundo apaixonado: corações, balões e bolo',
    cores: ['#FFE3EA', '#E5383B', '#FF8FB1', '#5A1027'],
    prep: 'Coração acelerado…',
    vai: 'Já!',
    campeao: '{n} conquistou todo mundo!',
  },
};
