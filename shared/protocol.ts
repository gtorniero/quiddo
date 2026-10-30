// Tipos compartilhados entre o navegador e o servidor (Worker + Durable Object).
// Toda mensagem é JSON e tem `type`. O servidor manda sempre o estado absoluto.

export type Theme = 'corp' | 'festa' | 'escola';
export type Phase = 'lobby' | 'question' | 'reveal' | 'ranking' | 'final';
export type DrawMode = 'all' | 'scored';

/** quiz: tem resposta certa e vale ponto. opiniao: enquete, ninguém erra. quem: "Quem é mais provável…", as opções são as pessoas da sala. */
export type Tipo = 'quiz' | 'opiniao' | 'quem';

export interface Question {
  t: string; // texto
  o: string[]; // 2 a 4 respostas (vazio em "quem": a sala vira a lista)
  c: number; // índice da certa (-1 nas perguntas de opinião)
  tipo?: Tipo; // ausente = quiz
  dobro?: boolean; // vale o dobro de pontos
  tl: number; // tempo em segundos: 10, 15, 20 ou 30
  img?: string; // imagem opcional: data URL ao abrir a sala; na sala vira '1' (guardada à parte)
}

export interface Brand {
  name: string; // até 40 caracteres
  color: string; // '' = cor do tema, ou #RRGGBB
}

export interface CreateRoomBody {
  questions: Question[];
  theme: Theme;
  brand: Brand; // ignorada no tema festa
  logo: string; // data URL (PNG/JPEG/WebP) ou ''
}

export interface CreateRoomResult {
  code: string;
  hostKey: string;
}

// ---------- navegador → servidor ----------
export type ClientMsg =
  | { type: 'host'; hostKey: string }
  | { type: 'join'; nick: string; playerId: string; avatar?: string } // avatar: "bicho.cabeca.rosto.cor" (shared/avatar.ts)
  | { type: 'answer'; qIndex: number; choice: number }
  | { type: 'start' }
  | { type: 'reveal' }
  | { type: 'showRanking' }
  | { type: 'next' }
  | { type: 'kick'; playerId: string }
  | { type: 'draw'; mode: DrawMode }
  | { type: 'restart' }
  | { type: 'close' }
  | { type: 'ping' };

// ---------- servidor → navegador ----------
export interface PublicQuestion {
  t: string;
  o: string[];
  oa?: string[]; // avatares das opções, em "quem"
  tipo: Tipo;
  dobro: boolean;
  tl: number;
  img: number; // 0 = sem imagem; senão a versão para montar /api/salas/{CODIGO}/img/{qIndex}?v=
}

export interface RankRow {
  id: string;
  nick: string;
  avatar: string;
  score: number;
  delta: number; // pontos da última pergunta
  rank: number; // 1 = primeiro
  prevRank: number; // posição antes da última pergunta (0 = não tinha)
  streak: number; // acertos seguidos
}

/** Quem acertou a pergunta, com o tempo de resposta. Vai só para a TV, depois da revelação. */
export interface Acerto {
  id: string;
  nick: string;
  avatar: string;
  ms: number;
}

export interface Drawn {
  id: string;
  nick: string;
  avatar?: string;
}

export interface BaseState {
  type: 'state';
  code: string;
  theme: Theme;
  brand: Brand & { logo: number }; // logo: versão (0 = sem logo)
  phase: Phase;
  qIndex: number;
  total: number;
  question: PublicQuestion | null;
  startsAt: number; // fim do "Prepare-se": antes disso ninguém responde (relógio do servidor)
  endsAt: number; // relógio do servidor
  serverNow: number;
  answeredCount: number;
  playerCount: number;
  correct: number | null; // só depois da revelação
  counts: number[] | null; // só depois da revelação
  podium: RankRow[]; // só no fim
  drawn: Drawn[];
}

export interface HostState extends BaseState {
  role: 'host';
  players: { id: string; nick: string; avatar: string; connected: boolean; answered: boolean }[];
  ranking: RankRow[]; // completo na fase final; top 8 na fase de ranking
  acertaram: Acerto[]; // depois da revelação: os 12 primeiros que acertaram, do mais rápido ao mais lento
}

export interface PlayerState extends BaseState {
  role: 'player';
  me: {
    id: string;
    nick: string;
    avatar: string;
    score: number;
    delta: number;
    rank: number;
    prevRank: number; // posição antes da última pergunta (0 = não tinha)
    streak: number; // acertos seguidos (0 antes da revelação)
    choice: number | null; // o que respondeu nesta pergunta
  };
  ranking: RankRow[]; // top 5
}

export type ErrorCode = 'not_found' | 'started' | 'full' | 'kicked' | 'bad_key' | 'bad_nick' | 'closed';

export type ServerMsg =
  | HostState
  | PlayerState
  | { type: 'error'; code: ErrorCode }
  | { type: 'kicked' }
  | { type: 'closed' }
  | { type: 'pong'; serverNow: number };
