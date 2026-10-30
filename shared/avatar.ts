// Personagens: cada jogador é um bicho do Brasil + até 1 item na cabeça + até 1 no rosto + uma cor de fundo.
// O avatar viaja como texto curto "bicho.cabeca.rosto.cor" (ex.: "capivara.bone.escuros.5"; "-" = nenhum).
// Os desenhos ficam no site (src/lib/avatar-art.ts); aqui só as regras, usadas pelo servidor e testadas.

export const BICHOS = {
  tucano: 'Tucano',
  capivara: 'Capivara',
  onca: 'Onça',
  preguica: 'Preguiça',
  arara: 'Arara',
  mico: 'Mico-leão',
  tamandua: 'Tamanduá',
  tatu: 'Tatu',
  boto: 'Boto',
  jacare: 'Jacaré',
  loboguara: 'Lobo-guará',
  quati: 'Quati',
  sapo: 'Sapo',
  coruja: 'Coruja',
  jabuti: 'Jabuti',
  papagaio: 'Papagaio',
  bemtevi: 'Bem-te-vi',
  caramelo: 'Caramelo',
  gato: 'Gato',
  peixeboi: 'Peixe-boi',
} as const;

export const CABECA = {
  bone: 'Boné',
  palha: 'Chapéu de palha',
  coroa: 'Coroa',
  laranja: 'Laranja',
  flor: 'Flor',
  fone: 'Fone',
  festa: 'Chapéu de festa',
  gorro: 'Gorro',
  faixa: 'Faixa',
  cartola: 'Cartola',
} as const;

export const ROSTO = {
  escuros: 'Óculos escuros',
  redondos: 'Óculos redondos',
  coracao: 'Óculos de coração',
  bigode: 'Bigode',
  estrela: 'Adesivo de estrela',
} as const;

/** Quantidade de cores de fundo (a lista de cores fica no desenho). */
export const CORES_N = 10;

export type Bicho = keyof typeof BICHOS;
export type ItemCabeca = keyof typeof CABECA;
export type ItemRosto = keyof typeof ROSTO;

export interface Avatar {
  a: Bicho;
  h: ItemCabeca | null;
  f: ItemRosto | null;
  c: number; // 0 a CORES_N - 1
}

export const AVATAR_PADRAO = 'tucano.-.-.0';

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/** Lê o texto do avatar. Devolve null se não for um avatar válido. */
export function parseAvatar(raw: unknown): Avatar | null {
  const parts = String(raw ?? '').split('.');
  if (parts.length !== 4) return null;
  const [a0, h, f, cs] = parts;
  const a = a0 === 'perereca' ? 'sapo' : a0; // nome antigo, guardado em celulares de quem já jogou
  if (!has(BICHOS, a)) return null;
  if (h !== '-' && !has(CABECA, h)) return null;
  if (f !== '-' && !has(ROSTO, f)) return null;
  if (!/^\d$/.test(cs) || Number(cs) >= CORES_N) return null;
  return { a: a as Bicho, h: h === '-' ? null : (h as ItemCabeca), f: f === '-' ? null : (f as ItemRosto), c: Number(cs) };
}

export function encodeAvatar(v: Avatar): string {
  return [v.a, v.h || '-', v.f || '-', v.c].join('.');
}

/** Avatar válido ou o padrão. */
export function cleanAvatar(raw: unknown): string {
  const v = parseAvatar(raw);
  return v ? encodeAvatar(v) : AVATAR_PADRAO;
}

/** Nome sugerido a partir do visual: "Capivara de Boné", "Onça de Óculos escuros" ou só "Tatu". */
export function avatarName(v: Avatar): string {
  const item = v.h ? CABECA[v.h] : v.f ? ROSTO[v.f] : '';
  return item ? `${BICHOS[v.a]} de ${item}` : BICHOS[v.a];
}

/** Se alguém na sala já tem exatamente esse visual, troca a cor de fundo pela próxima livre. */
export function uniqueAvatar(code: string, taken: Iterable<string>): string {
  const v = parseAvatar(code);
  if (!v) return AVATAR_PADRAO;
  const used = new Set(taken);
  for (let i = 0; i < CORES_N; i++) {
    const cand = encodeAvatar({ ...v, c: (v.c + i) % CORES_N });
    if (!used.has(cand)) return cand;
  }
  return encodeAvatar(v); // todas as cores ocupadas: repete, o apelido diferencia
}

/** Visual inicial de quem chega: bicho e cor sorteados, sem nada na cabeça nem no rosto. A pessoa inclui se quiser. */
export function startAvatar(rand: () => number = Math.random): Avatar {
  return { ...randomAvatar(rand), h: null, f: null };
}

/** Sorteia um visual. `rand` entra como parâmetro para os testes. */
export function randomAvatar(rand: () => number = Math.random): Avatar {
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
  const r = rand();
  return {
    a: pick(Object.keys(BICHOS) as Bicho[]),
    h: r < 0.8 ? pick(Object.keys(CABECA) as ItemCabeca[]) : null,
    f: r > 0.45 ? pick(Object.keys(ROSTO) as ItemRosto[]) : null,
    c: Math.floor(rand() * CORES_N),
  };
}
