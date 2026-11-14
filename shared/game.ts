// Motor do jogo: estado da sala e transições de fase, sem rede nem relógio próprio.
// O Durable Object guarda um `Room`, chama estas funções e manda as visões para cada um.
import type { Acerto, Brand, Drawn, DrawMode, HostState, Phase, PlayerState, Question, RankRow, Theme, Visual } from './protocol';
import { LIMITS, cleanNick, marcaPropria, points } from './rules';
import { AVATAR_PADRAO, cleanAvatar, uniqueAvatar } from './avatar';

export interface Player {
  id: string;
  nick: string;
  avatar?: string; // salas antigas não tinham
  score: number;
  delta: number;
  prevRank: number;
  streak?: number; // acertos seguidos nas perguntas que valem ponto (salas antigas não tinham)
  joinedAt: number;
  connected: boolean;
  bot?: boolean; // bicho de teste do ensaio: o servidor responde por ele
}

/** Opção de "Quem é mais provável…": uma pessoa da sala. */
export interface Pessoa {
  id: string;
  nick: string;
  avatar: string;
}

/** Duração do "Prepare-se" antes de cada pergunta. */
/** Tempo máximo de leitura da pergunta antes das respostas aparecerem (se o anfitrião não tocar em "Mostrar as respostas"). */
export const PREP_MS = 10_000;
/** Contagem final antes das respostas: 3, 2, 1. */
export const CONTAGEM_MS = 3000;
/** Sala parada fecha (pausa) depois de 20 minutos sem ninguém mexer e sem a tela do anfitrião aberta. */
export const INATIVA_MS = 20 * 60 * 1000;
/** Bichos de teste do ensaio: o anfitrião vê ranking e pódio antes de chamar a turma. */
export const ENSAIO_BICHOS: { id: string; nick: string; avatar: string }[] = [
  { id: 'bot:1', nick: 'Capivara (teste)', avatar: 'capivara.bone.-.5' },
  { id: 'bot:2', nick: 'Arara (teste)', avatar: 'arara.-.escuros.2' },
  { id: 'bot:3', nick: 'Tatu (teste)', avatar: 'tatu.festa.-.8' },
];
/** Chance de cada bicho de teste acertar. */
const ENSAIO_ACERTO = 0.7;

export interface Answer {
  choice: number;
  ms: number;
}

export interface Room {
  code: string;
  hostKey: string;
  maxPlayers?: number; // ausente = LIMITS.maxPlayers (salas antigas e cobrança desligada)
  theme: Theme;
  visual?: Visual; // salas antigas não têm: Floresta
  brand: Brand;
  logo: number; // versão do logo (0 = sem logo)
  questions: Question[];
  phase: Phase;
  qIndex: number;
  startedAt: number; // quando a pergunta atual liberou as respostas (fim do "Prepare-se")
  endsAt: number;
  opts?: Pessoa[]; // opções da pergunta "quem" atual
  players: Record<string, Player>;
  answers: Record<string, Answer>;
  counts: number[];
  kicked: string[];
  drawn: Drawn[];
  createdAt: number;
  mexeu?: number; // última mensagem de alguém na sala (para fechar a sala parada)
  hostVisto?: number; // último sinal da tela do anfitrião aberta (o ping que ela manda a cada 25 s)
  pausada?: number; // a sala pausou por inatividade: guarda tudo e reabre com o mesmo código
  barrados?: string[]; // quem tentou entrar com a sala grátis cheia (esperando vaga)
  endedAt: number; // 0 enquanto o jogo não acabou
  ensaio?: boolean; // jogo de ensaio com os bichos de teste (não conta como jogo)
  botPlano?: { id: string; choice: number; ms: number }[]; // respostas dos bichos de teste na pergunta atual
  pagar?: string; // chave que só serve para pagar a oferta desta sala (o QR da TV abre no celular do anfitrião)
  interno?: boolean; // sala de teste da equipe (?btw_interno=1): fica fora dos contadores de uso
  cheiaVista?: boolean; // já contou a sala grátis cheia uma vez
}

export function newRoom(o: { code: string; hostKey: string; theme: Theme; visual?: Visual; brand: Brand; questions: Question[]; hasLogo: boolean; now: number; maxPlayers?: number; pagar?: string; interno?: boolean }): Room {
  return {
    code: o.code,
    hostKey: o.hostKey,
    ...(o.pagar ? { pagar: o.pagar } : {}),
    ...(o.interno ? { interno: true } : {}),
    maxPlayers: o.maxPlayers ?? LIMITS.maxPlayers,
    theme: o.theme,
    visual: o.visual || 'floresta',
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

export type JoinResult = { ok: true; player: Player } | { ok: false; code: 'started' | 'full' | 'cheia_gratis' | 'kicked' | 'bad_nick' };

/** Quantos tentaram entrar na sala grátis cheia e ainda não entraram. */
export const esperandoVaga = (room: Room) => (room.barrados || []).filter((id) => !room.players[id] && !room.kicked.includes(id)).length;

export const limiteDe = (room: Room) => room.maxPlayers ?? LIMITS.maxPlayers;

/** Sala liberada: Passe 7 dias, Premium ou cobrança que não vale. Libera junto as 200 pessoas e a marca própria. */
export const salaLiberada = (room: Room) => limiteDe(room) >= LIMITS.maxPlayers;

/**
 * O que a sala mostra da marca. O nome do quiz vale sempre; logo e cor só na sala liberada (shared/rules.ts,
 * marcaPropria). Na sala grátis, logo e cor salvos ficam guardados e aparecem na hora se o anfitrião liberar.
 */
export function marcaDaSala(room: Room): Brand & { logo: number } {
  const b = room.brand || { name: '', color: '' };
  const pode = marcaPropria(room.theme, salaLiberada(room));
  return { name: b.name || '', color: pode ? b.color || '' : '', logo: pode ? room.logo || 0 : 0 };
}

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
  // a primeira pessoa de verdade encerra o ensaio: os bichos de teste saem e a sala volta para a espera
  if (room.ensaio) fimEnsaio(room);
  if (room.phase !== 'lobby') return { ok: false, code: 'started' };
  if (Object.keys(room.players).length >= limiteDe(room)) {
    if (limiteDe(room) >= LIMITS.maxPlayers) return { ok: false, code: 'full' };
    // sala grátis cheia: anota quem ficou de fora, para o anfitrião ver quantos estão esperando
    const b = (room.barrados ||= []);
    if (!b.includes(id) && b.length < LIMITS.maxPlayers) b.push(id);
    return { ok: false, code: 'cheia_gratis' };
  }
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

/** O anfitrião toca em "Mostrar as respostas": encurta a leitura para a contagem final de 3 segundos. */
export function mostrarRespostas(room: Room, now: number): boolean {
  if (room.phase !== 'question' || now >= room.startedAt - CONTAGEM_MS) return false;
  const q = room.questions[room.qIndex];
  room.startedAt = now + CONTAGEM_MS;
  room.endsAt = room.startedAt + q.tl * 1000;
  return true;
}

function openQuestion(room: Room, qIndex: number, now: number, rand: () => number = Math.random) {
  const q = room.questions[qIndex];
  room.qIndex = qIndex;
  room.phase = 'question';
  room.answers = {};
  room.counts = [];
  room.startedAt = now + PREP_MS;
  room.endsAt = room.startedAt + q.tl * 1000;
  // "Quem é mais provável…": a lista é a sala no momento em que a pergunta abre
  room.opts =
    q.tipo === 'quem'
      ? Object.values(room.players)
          .sort((a, b) => a.nick.localeCompare(b.nick, 'pt-BR'))
          .map((p) => ({ id: p.id, nick: p.nick, avatar: avatarOf(p) }))
      : undefined;
  room.botPlano = room.ensaio ? planoDosBots(room, rand) : undefined;
}

/**
 * Ensaio: cada bicho de teste escolhe uma resposta (acerta 70% das vezes) e um momento para responder,
 * entre 1,2 s e 60% do tempo da pergunta (no máximo 7 s), contado do fim do "Prepare-se".
 */
function planoDosBots(room: Room, rand: () => number) {
  const q = room.questions[room.qIndex];
  const n = nOpcoes(room);
  const max = Math.max(1500, Math.min(7000, q.tl * 1000 * 0.6));
  return Object.values(room.players)
    .filter((p) => p.bot)
    .map((p) => {
      const valePonto = (!q.tipo || q.tipo === 'quiz') && q.c >= 0;
      const erradas = Array.from({ length: n }, (_, k) => k).filter((k) => k !== q.c);
      const choice = valePonto && (rand() < ENSAIO_ACERTO || !erradas.length) ? q.c : erradas.length && valePonto ? erradas[Math.floor(rand() * erradas.length)] : Math.floor(rand() * n);
      return { id: p.id, choice, ms: Math.round(1200 + rand() * (max - 1200)) };
    });
}

/** Começa o ensaio: só na sala de espera vazia. Três bichos de teste entram e a primeira pergunta abre. */
export function comecarEnsaio(room: Room, now: number, rand: () => number = Math.random): boolean {
  if (room.phase !== 'lobby' || Object.keys(room.players).length) return false;
  ENSAIO_BICHOS.forEach((b, i) => {
    room.players[b.id] = { id: b.id, nick: b.nick, avatar: b.avatar, score: 0, delta: 0, prevRank: 0, joinedAt: now + i, connected: true, bot: true };
  });
  room.ensaio = true;
  resetScores(room);
  room.drawn = [];
  room.endedAt = 0;
  openQuestion(room, 0, now, rand);
  return true;
}

/** Fim do ensaio: os bichos de teste saem e a sala volta para a espera, pronta para a turma. */
export function fimEnsaio(room: Room): boolean {
  if (!room.ensaio) return false;
  for (const p of Object.values(room.players)) if (p.bot) delete room.players[p.id];
  room.ensaio = false;
  room.botPlano = undefined;
  room.phase = 'lobby';
  room.qIndex = 0;
  room.answers = {};
  room.counts = [];
  room.opts = undefined;
  room.startedAt = 0;
  room.endsAt = 0;
  room.drawn = [];
  room.endedAt = 0;
  resetScores(room);
  return true;
}

/** Quando o próximo bicho de teste responde (relógio do servidor), ou 0 se não tem mais ninguém para responder. */
export function proximoBot(room: Room): number {
  if (room.phase !== 'question' || !room.botPlano) return 0;
  const falta = room.botPlano.filter((b) => !room.answers[b.id] && room.players[b.id]);
  return falta.length ? room.startedAt + Math.min(...falta.map((b) => b.ms)) : 0;
}

/** Registra as respostas dos bichos de teste que já deviam ter respondido. Devolve quantas entraram. */
export function respondeBots(room: Room, now: number): number {
  if (room.phase !== 'question' || !room.botPlano) return 0;
  let n = 0;
  for (const b of room.botPlano) {
    if (room.answers[b.id] || now < room.startedAt + b.ms) continue;
    if (answer(room, b.id, room.qIndex, b.choice, Math.min(now, room.startedAt + b.ms))) n++;
  }
  return n;
}

/** Pessoas de verdade na sala (sem os bichos de teste). */
export const pessoas = (room: Room) => Object.values(room.players).filter((p) => !p.bot).length;

/** Faixa do tamanho do jogo para o contador de uso (sem nomes, só a quantidade). */
export function faixaTamanho(n: number): 'tamanho_0' | 'tamanho_1' | 'tamanho_2a4' | 'tamanho_5a10' | 'tamanho_11mais' {
  return n <= 0 ? 'tamanho_0' : n === 1 ? 'tamanho_1' : n <= 4 ? 'tamanho_2a4' : n <= 10 ? 'tamanho_5a10' : 'tamanho_11mais';
}

// ---------- sala parada ----------

/**
 * A sala está parada? Ninguém mexeu nela e a tela do anfitrião não deu sinal por 20 minutos.
 * Enquanto a tela do anfitrião está aberta, o ping dela (a cada 25 s) conta como atividade, até o limite de 12 horas.
 */
export function salaParada(room: Room, now: number, hostVisto = 0): boolean {
  if (room.pausada) return false;
  return now >= ultimaAtividade(room, hostVisto) + INATIVA_MS;
}

/** Último sinal de vida da sala: uma mensagem de alguém ou o ping da tela do anfitrião. */
export const ultimaAtividade = (room: Room, hostVisto = 0) => Math.max(room.mexeu || room.createdAt, room.hostVisto || 0, hostVisto);

/** Pausa a sala parada: guarda tudo (perguntas, quem entrou, pontos) para reabrir com o mesmo código. */
export function pausar(room: Room, now: number): boolean {
  if (room.pausada) return false;
  room.pausada = now;
  for (const p of Object.values(room.players)) if (!p.bot) p.connected = false;
  return true;
}

/** O anfitrião voltou: a sala reabre com o mesmo código, e o convite já enviado volta a valer. */
export function retomar(room: Room, now: number): boolean {
  if (!room.pausada) return false;
  room.pausada = undefined;
  room.mexeu = now;
  // pergunta que estava aberta quando a sala pausou: revela, para o jogo seguir do ponto em que parou
  if (room.phase === 'question' && now > room.endsAt) reveal(room);
  return true;
}

/** Quantas opções a pergunta atual tem. */
function nOpcoes(room: Room): number {
  const q = room.questions[room.qIndex];
  return q.tipo === 'quem' ? (room.opts || []).length : q.o.length;
}

export function start(room: Room, now: number, rand: () => number = Math.random): boolean {
  if (room.phase !== 'lobby') return false;
  resetScores(room);
  openQuestion(room, 0, now, rand);
  return true;
}

/** Jogar de novo com as mesmas pessoas: zera os pontos e volta para a primeira pergunta. */
export function restart(room: Room, now: number, rand: () => number = Math.random): boolean {
  if (room.phase !== 'final') return false;
  resetScores(room);
  room.drawn = [];
  room.endedAt = 0;
  openQuestion(room, 0, now, rand);
  return true;
}

function resetScores(room: Room) {
  for (const p of Object.values(room.players)) {
    p.score = 0;
    p.delta = 0;
    p.prevRank = 0;
    p.streak = 0;
  }
}

/** Registra a resposta. O tempo é medido aqui, no servidor, a partir do fim do "Prepare-se". */
export function answer(room: Room, playerId: string, qIndex: number, choice: number, now: number): boolean {
  if (room.phase !== 'question' || qIndex !== room.qIndex) return false;
  if (!room.players[playerId] || room.answers[playerId]) return false;
  if (!Number.isInteger(choice) || choice < 0 || choice >= nOpcoes(room)) return false;
  if (now < room.startedAt || now > room.endsAt) return false;
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
  room.counts = Array.from({ length: nOpcoes(room) }, () => 0);
  const valePonto = !q.tipo || q.tipo === 'quiz';
  for (const p of Object.values(room.players)) {
    p.prevRank = before[p.id] || 0;
    const a = room.answers[p.id];
    // pergunta de opinião não tem certa nem errada: não mexe no placar
    const acertou = valePonto && !!a && a.choice === q.c;
    p.delta = acertou ? points(a.ms, q.tl) * (q.dobro ? 2 : 1) : 0;
    p.score += p.delta;
    // sequência: só as perguntas que valem ponto contam; opinião não quebra nem soma
    if (valePonto) p.streak = acertou ? (p.streak || 0) + 1 : 0;
    if (a) room.counts[a.choice]++;
  }
  room.phase = 'reveal';
  room.endsAt = 0;
  return true;
}

export function showRanking(room: Room): boolean {
  // depois da última pergunta não tem ranking: ele entregaria o vencedor antes do pódio
  if (room.phase !== 'reveal' || room.qIndex >= room.questions.length - 1) return false;
  room.phase = 'ranking';
  return true;
}

/** Próxima pergunta ou, depois da última, o pódio. */
export function next(room: Room, now: number, rand: () => number = Math.random): boolean {
  if (room.phase !== 'ranking' && room.phase !== 'reveal') return false;
  if (room.qIndex >= room.questions.length - 1) {
    room.phase = 'final';
    room.endedAt = now;
    room.botPlano = undefined;
  } else {
    openQuestion(room, room.qIndex + 1, now, rand);
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
    .map((p, i) => ({ id: p.id, nick: p.nick, avatar: avatarOf(p), score: p.score, delta: p.delta, rank: i + 1, prevRank: p.prevRank, streak: p.streak || 0 }));
}

/** Quem acertou a pergunta atual, do mais rápido para o mais lento. Só existe depois da revelação. */
export function acertaram(room: Room): Acerto[] {
  if (room.phase !== 'reveal' && room.phase !== 'ranking') return [];
  const q = room.questions[room.qIndex];
  if (q.tipo && q.tipo !== 'quiz') return [];
  return Object.entries(room.answers)
    .filter(([id, a]) => a.choice === q.c && room.players[id])
    .sort((x, y) => x[1].ms - y[1].ms)
    .map(([id, a]) => ({ id, nick: room.players[id].nick, avatar: avatarOf(room.players[id]), ms: a.ms }));
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
    visual: room.visual || 'floresta',
    brand: marcaDaSala(room),
    phase: room.phase,
    qIndex: room.qIndex,
    total: room.questions.length,
    question: q
      ? {
          t: q.t,
          o: q.tipo === 'quem' ? (room.opts || []).map((p) => p.nick) : q.o,
          ...(q.tipo === 'quem' ? { oa: (room.opts || []).map((p) => p.avatar) } : {}),
          tipo: q.tipo || 'quiz',
          dobro: !!q.dobro,
          tl: q.tl,
          img: q.img ? room.createdAt : 0,
        }
      : null,
    startsAt: room.phase === 'question' ? room.startedAt : 0,
    endsAt: room.endsAt,
    serverNow: now,
    answeredCount: Object.keys(room.answers).length,
    playerCount: Object.keys(room.players).length,
    correct: revealed && q && q.c >= 0 ? q.c : null,
    counts: revealed ? room.counts : null,
    drawn: room.drawn,
    // sala grátis: os celulares mostram o selo "Crie o seu em quiddo.com.br"; sala paga, nunca
    selo: !salaLiberada(room),
  };
}

export function hostView(room: Room, now: number, rk: RankRow[] = ranking(room)): HostState {
  return {
    ...base(room, now),
    role: 'host',
    maxPlayers: limiteDe(room),
    esperando: esperandoVaga(room),
    ensaio: !!room.ensaio,
    pagar: room.pagar || '',
    podium: room.phase === 'final' ? rk.slice(0, 3) : [],
    players: Object.values(room.players)
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((p) => ({ id: p.id, nick: p.nick, avatar: avatarOf(p), connected: p.connected, answered: !!room.answers[p.id], ...(p.bot ? { bot: true } : {}) })),
    ranking: room.phase === 'final' ? rk : room.phase === 'ranking' || room.phase === 'reveal' ? rk.slice(0, 8) : [],
    acertaram: acertaram(room).slice(0, 12),
  };
}

/** Troca o personagem de quem já está na sala (o lápis no celular). Mantém o visual único na sala. */
export function setAvatar(room: Room, playerId: string, raw: unknown): boolean {
  const p = room.players[playerId];
  if (!p) return false;
  const outros = Object.values(room.players).filter((x) => x.id !== playerId).map((x) => avatarOf(x));
  const novo = uniqueAvatar(cleanAvatar(raw), outros);
  if (novo === p.avatar) return false;
  p.avatar = novo;
  return true;
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
    me: {
      id: p.id,
      nick: p.nick,
      avatar: avatarOf(p),
      score: p.score,
      delta: p.delta,
      rank: mine ? mine.rank : 0,
      prevRank: mine ? mine.prevRank : 0,
      streak: showRank ? p.streak || 0 : 0,
      choice: a ? a.choice : null,
      vizinho: showRank && mine ? vizinhoDe(rk, mine.rank) : null,
    },
    // no fim, todo mundo vê os 10 primeiros depois do pódio
    ranking: room.phase === 'final' ? rk.slice(0, 10) : showRank ? rk.slice(0, 5) : [],
  };
}

/** Quem está logo à frente no ranking e por quantos pontos; para o 1º, quem vem logo atrás. */
function vizinhoDe(rk: RankRow[], rank: number): { nick: string; pontos: number; atras: boolean } | null {
  const eu = rk[rank - 1];
  if (!eu) return null;
  if (rank > 1) return { nick: rk[rank - 2].nick, pontos: rk[rank - 2].score - eu.score, atras: true };
  const segundo = rk[1];
  return segundo ? { nick: segundo.nick, pontos: eu.score - segundo.score, atras: false } : null;
}
