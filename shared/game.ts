// Motor do jogo: estado da sala e transições de fase, sem rede nem relógio próprio.
// O Durable Object guarda um `Room`, chama estas funções e manda as visões para cada um.
import type { Brand, Drawn, DrawMode, HostState, Phase, PlayerState, Question, RankRow, Theme } from './protocol';
import { LIMITS, cleanNick, points } from './rules';
import { AVATAR_PADRAO, cleanAvatar, uniqueAvatar } from './avatar';

export interface Player {
  id: string;
  nick: string;
  avatar?: string; // salas antigas não tinham
  score: number;
  delta: number;
  prevRank: number;
  joinedAt: number;
  connected: boolean;
}

export interface Answer {
  choice: number;
  ms: number;
}

export interface Room {
  code: string;
  hostKey: string;
  theme: Theme;
  brand: Brand;
  logo: number; // versão do logo (0 = sem logo)
  questions: Question[];
  phase: Phase;
  qIndex: number;
  startedAt: number; // quando a pergunta atual foi enviada
  endsAt: number;
  players: Record<string, Player>;
  answers: Record<string, Answer>;
  counts: number[];
  kicked: string[];
  drawn: Drawn[];
  createdAt: number;
  endedAt: number; // 0 enquanto o jogo não acabou
}

export function newRoom(o: { code: string; hostKey: string; theme: Theme; brand: Brand; questions: Question[]; hasLogo: boolean; now: number }): Room {
  return {
    code: o.code,
    hostKey: o.hostKey,
    theme: o.theme,
    brand: o.brand,
    logo: o.hasLogo ? o.now : 0,
    questions: o.questions,
    phase: 'lobby',
    qIndex: 0,
    startedAt: 0,
    endsAt: 0,
    players: {},
    answers: {},
    counts: [],
    kicked: [],
    drawn: [],
    createdAt: o.now,
    endedAt: 0,
  };
}

export type JoinResult = { ok: true; player: Player } | { ok: false; code: 'started' | 'full' | 'kicked' | 'bad_nick' };

/** Entrada ou volta de um jogador. Quem já estava na sala volta com os pontos e o personagem, mesmo com o jogo andando. */
export function join(room: Room, playerId: string, rawNick: string, now: number, rawAvatar: unknown = ''): JoinResult {
  const id = String(playerId || '').slice(0, 64);
  if (!id) return { ok: false, code: 'bad_nick' };
  if (room.kicked.includes(id)) return { ok: false, code: 'kicked' };
  const existing = room.players[id];
  if (existing) {
    existing.connected = true;
    return { ok: true, player: existing };
  }
  const nick = cleanNick(rawNick);
  if (!nick) return { ok: false, code: 'bad_nick' };
  if (room.phase !== 'lobby') return { ok: false, code: 'started' };
  if (Object.keys(room.players).length >= LIMITS.maxPlayers) return { ok: false, code: 'full' };
  const avatar = uniqueAvatar(
    cleanAvatar(rawAvatar),
    Object.values(room.players).map((p) => avatarOf(p)),
  );
  const player: Player = { id, nick: uniqueNick(room, nick), avatar, score: 0, delta: 0, prevRank: 0, joinedAt: now, connected: true };
  room.players[id] = player;
  return { ok: true, player };
}

export const avatarOf = (p: Player) => p.avatar || AVATAR_PADRAO;

function uniqueNick(room: Room, nick: string): string {
  const taken = new Set(Object.values(room.players).map((p) => p.nick.toLowerCase()));
  if (!taken.has(nick.toLowerCase())) return nick;
  for (let n = 2; ; n++) {
    const suffix = ' ' + n;
    const cand = nick.slice(0, LIMITS.nick - suffix.length) + suffix;
    if (!taken.has(cand.toLowerCase())) return cand;
  }
}

export function kick(room: Room, playerId: string): boolean {
  if (!room.players[playerId]) return false;
  delete room.players[playerId];
  delete room.answers[playerId];
  room.kicked.push(playerId);
  return true;
}

function openQuestion(room: Room, qIndex: number, now: number) {
  room.qIndex = qIndex;
  room.phase = 'question';
  room.answers = {};
  room.counts = [];
  room.startedAt = now;
  room.endsAt = now + room.questions[qIndex].tl * 1000;
}

export function start(room: Room, now: number): boolean {
  if (room.phase !== 'lobby') return false;
  resetScores(room);
  openQuestion(room, 0, now);
  return true;
}

/** Jogar de novo com as mesmas pessoas: zera os pontos e volta para a primeira pergunta. */
export function restart(room: Room, now: number): boolean {
  if (room.phase !== 'final') return false;
  resetScores(room);
  room.drawn = [];
  room.endedAt = 0;
  openQuestion(room, 0, now);
  return true;
}

function resetScores(room: Room) {
  for (const p of Object.values(room.players)) {
    p.score = 0;
    p.delta = 0;
    p.prevRank = 0;
  }
}

/** Registra a resposta. O tempo é medido aqui, no servidor, a partir do envio da pergunta. */
export function answer(room: Room, playerId: string, qIndex: number, choice: number, now: number): boolean {
  if (room.phase !== 'question' || qIndex !== room.qIndex) return false;
  if (!room.players[playerId] || room.answers[playerId]) return false;
  const q = room.questions[room.qIndex];
  if (!Number.isInteger(choice) || choice < 0 || choice >= q.o.length) return false;
  if (now > room.endsAt) return false;
  room.answers[playerId] = { choice, ms: Math.max(0, now - room.startedAt) };
  return true;
}

export function connectedPlayers(room: Room): Player[] {
  return Object.values(room.players).filter((p) => p.connected);
}

/** Todo mundo que está conectado já respondeu? */
export function everyoneAnswered(room: Room): boolean {
  const live = connectedPlayers(room);
  return live.length > 0 && live.every((p) => room.answers[p.id]);
}

/** Fecha a pergunta: conta as respostas e soma os pontos. */
export function reveal(room: Room): boolean {
  if (room.phase !== 'question') return false;
  const q = room.questions[room.qIndex];
  const before = rankMap(room);
  room.counts = q.o.map(() => 0);
  for (const p of Object.values(room.players)) {
    p.prevRank = before[p.id] || 0;
    const a = room.answers[p.id];
    p.delta = a && a.choice === q.c ? points(a.ms, q.tl) : 0;
    p.score += p.delta;
    if (a) room.counts[a.choice]++;
  }
  room.phase = 'reveal';
  room.endsAt = 0;
  return true;
}

export function showRanking(room: Room): boolean {
  if (room.phase !== 'reveal') return false;
  room.phase = 'ranking';
  return true;
}

/** Próxima pergunta ou, depois da última, o pódio. */
export function next(room: Room, now: number): boolean {
  if (room.phase !== 'ranking' && room.phase !== 'reveal') return false;
  if (room.qIndex >= room.questions.length - 1) {
    room.phase = 'final';
    room.endedAt = now;
  } else {
    openQuestion(room, room.qIndex + 1, now);
  }
  return true;
}

/** Sorteia um nome que ainda não saiu. `rand` entra como parâmetro para os testes. */
export function draw(room: Room, mode: DrawMode, rand: () => number = Math.random): Drawn | null {
  if (room.phase !== 'final') return null;
  const out = new Set(room.drawn.map((d) => d.id));
  const pool = Object.values(room.players).filter((p) => !out.has(p.id) && (mode === 'all' || p.score > 0));
  if (!pool.length) return null;
  const win = pool[Math.floor(rand() * pool.length)];
  const d = { id: win.id, nick: win.nick, avatar: avatarOf(win) };
  room.drawn.push(d);
  return d;
}

// ---------- ranking ----------

export function ranking(room: Room): RankRow[] {
  return Object.values(room.players)
    .sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt)
    .map((p, i) => ({ id: p.id, nick: p.nick, avatar: avatarOf(p), score: p.score, delta: p.delta, rank: i + 1, prevRank: p.prevRank }));
}

function rankMap(room: Room): Record<string, number> {
  const m: Record<string, number> = {};
  for (const r of ranking(room)) m[r.id] = r.rank;
  return m;
}

// ---------- visões ----------
// O anfitrião vê tudo; o jogador nunca recebe a resposta certa antes da revelação.

function base(room: Room, now: number) {
  const q = room.phase === 'lobby' || room.phase === 'final' ? null : room.questions[room.qIndex];
  const revealed = room.phase === 'reveal' || room.phase === 'ranking';
  return {
    type: 'state' as const,
    code: room.code,
    theme: room.theme,
    brand: { ...room.brand, logo: room.logo },
    phase: room.phase,
    qIndex: room.qIndex,
    total: room.questions.length,
    question: q ? { t: q.t, o: q.o, tl: q.tl } : null,
    endsAt: room.endsAt,
    serverNow: now,
    answeredCount: Object.keys(room.answers).length,
    playerCount: Object.keys(room.players).length,
    correct: revealed && q ? q.c : null,
    counts: revealed ? room.counts : null,
    drawn: room.drawn,
  };
}

export function hostView(room: Room, now: number, rk: RankRow[] = ranking(room)): HostState {
  return {
    ...base(room, now),
    role: 'host',
    podium: room.phase === 'final' ? rk.slice(0, 3) : [],
    players: Object.values(room.players)
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((p) => ({ id: p.id, nick: p.nick, avatar: avatarOf(p), connected: p.connected, answered: !!room.answers[p.id] })),
    ranking: room.phase === 'final' ? rk : room.phase === 'ranking' || room.phase === 'reveal' ? rk.slice(0, 8) : [],
  };
}

export function playerView(room: Room, playerId: string, now: number, rk: RankRow[] = ranking(room)): PlayerState | null {
  const p = room.players[playerId];
  if (!p) return null;
  const mine = rk.find((r) => r.id === playerId);
  const a = room.answers[playerId];
  const showRank = room.phase === 'reveal' || room.phase === 'ranking' || room.phase === 'final';
  return {
    ...base(room, now),
    role: 'player',
    podium: room.phase === 'final' ? rk.slice(0, 3) : [],
    me: { id: p.id, nick: p.nick, avatar: avatarOf(p), score: p.score, delta: p.delta, rank: mine ? mine.rank : 0, prevRank: mine ? mine.prevRank : 0, choice: a ? a.choice : null },
    ranking: showRank ? rk.slice(0, 5) : [],
  };
}
