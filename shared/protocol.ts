// Tipos compartilhados entre o navegador e o servidor (Worker + Durable Object).
// Toda mensagem é JSON e tem `type`. O servidor manda sempre o estado absoluto.

export type Theme = 'corp' | 'festa';
export type Phase = 'lobby' | 'question' | 'reveal' | 'ranking' | 'final';
export type DrawMode = 'all' | 'scored';
/** speed: de 500 a 1000, quanto mais rápido mais pontos. fixed: "Sem pressa", acertou vale 1000. */
export type Scoring = 'speed' | 'fixed';

export interface Question {
  t: string; // texto
  o: string[]; // 2 a 4 respostas
  c: number; // índice da certa
  tl: number; // tempo em segundos: 10, 15, 20 ou 30
}

export interface Brand {
  name: string; // até 40 caracteres
  color: string; // '' = cor do tema, ou #RRGGBB
}

export interface CreateRoomBody {
  questions: Question[];
  theme: Theme;
  scoring: Scoring;
  brand: Brand;
  logo: string; // data URL (PNG/JPEG/WebP) ou ''
}

export interface CreateRoomResult {
  code: string;
  hostKey: string;
}

// ---------- navegador → servidor ----------
export type ClientMsg =
  | { type: 'host'; hostKey: string }
  | { type: 'join'; nick: string; playerId: string }
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
  tl: number;
}

export interface RankRow {
  id: string;
  nick: string;
  score: number;
  delta: number; // pontos da última pergunta
  rank: number; // 1 = primeiro
  prevRank: number; // posição antes da última pergunta (0 = não tinha)
}

export interface Drawn {
  id: string;
  nick: string;
}

export interface BaseState {
  type: 'state';
  code: string;
  theme: Theme;
  scoring: Scoring;
  brand: Brand & { logo: number }; // logo: versão (0 = sem logo)
  phase: Phase;
  qIndex: number;
  total: number;
  question: PublicQuestion | null;
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
  players: { id: string; nick: string; connected: boolean; answered: boolean }[];
  ranking: RankRow[]; // completo na fase final; top 8 na fase de ranking
}

export interface PlayerState extends BaseState {
  role: 'player';
  me: {
    id: string;
    nick: string;
    score: number;
    delta: number;
    rank: number;
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
