// Etiquetas UTM da primeira visita por anúncio. Ficam só neste navegador (90 dias) e vão ao nosso
// servidor junto com uma compra, para saber qual campanha trouxe a venda. Nunca vão para Google ou Meta
// por aqui, e identificadores de clique (gclid, fbclid) não entram.
import { ORIGIN_KEY, firstTouch } from './measurement-policy';

export function lembraOrigem(search = location.search) {
  try {
    const atual = localStorage.getItem(ORIGIN_KEY);
    const o = firstTouch(atual, search);
    if (o && JSON.stringify(o) !== atual) localStorage.setItem(ORIGIN_KEY, JSON.stringify(o));
  } catch { /* sem armazenamento: a compra segue sem origem */ }
}

export function origem(): string {
  try { return firstTouch(localStorage.getItem(ORIGIN_KEY), '')?.q || ''; } catch { return ''; }
}
