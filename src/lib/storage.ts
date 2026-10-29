// localStorage com prefixo e sem quebrar em aba anônima ou com o armazenamento cheio.
const P = 'sr:';

export const store = {
  get<T>(k: string, fallback: T): T {
    try {
      const v = localStorage.getItem(P + k);
      return v == null ? fallback : (JSON.parse(v) as T);
    } catch {
      return fallback;
    }
  },
  set(k: string, v: unknown): boolean {
    try {
      localStorage.setItem(P + k, JSON.stringify(v));
      return true;
    } catch {
      return false;
    }
  },
  del(k: string) {
    try {
      localStorage.removeItem(P + k);
    } catch {}
  },
};

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
