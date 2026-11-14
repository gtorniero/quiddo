// Cartão de resultado do jogador: uma imagem 9:16 (1080×1920) para o Status do WhatsApp ou os Stories,
// feita no próprio celular, com o pódio, a posição, os pontos, o nome do quiz e quiddo.com.br.
// Nada sai do aparelho: a imagem vai direto para o compartilhamento do celular (ou para baixar).
import type { RankRow } from '../../shared/protocol';
import { avatarSvg } from './avatar-art';

export interface DadosCartao {
  rank: number;
  total: number;
  score: number;
  avatar: string;
  podium: RankRow[];
  quiz: string; // nome do quiz (pode ser vazio)
}

const W = 1080;
const H = 1920;
const INK = '#0E2A22';
const fmt = (n: number) => n.toLocaleString('pt-BR');

/** Título grande do cartão. */
export function tituloCartao(rank: number): string {
  return rank === 1 ? 'Ganhei o quiz!' : rank > 0 ? `Fiquei em ${rank}º!` : 'Joguei o quiz!';
}

/** Texto que acompanha a imagem; o link leva ?de=cartao para medir quem chegou pelo cartão. */
export const TEXTO_CARTAO = 'Joguei um quiz ao vivo com a turma no Quiddo. Crie o seu: https://www.quiddo.com.br/?de=cartao';

function imagem(svg: string): Promise<HTMLImageElement> {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = erro;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
  });
}

function caixa(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/** Corta o texto com reticências para caber na largura. */
function cabe(c: CanvasRenderingContext2D, t: string, max: number) {
  if (c.measureText(t).width <= max) return t;
  let s = t;
  while (s.length > 1 && c.measureText(s + '…').width > max) s = s.slice(0, -1);
  return s + '…';
}

/** Desenha o cartão e devolve o PNG. */
export async function cartaoResultado(d: DadosCartao): Promise<Blob> {
  await Promise.all(['900 120px Fraunces', '800 48px Nunito', '900 48px Nunito'].map((f) => document.fonts?.load(f).catch(() => null)));
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d')!;
  // fundo creme com o cartão branco por cima, como os cartões do site
  c.fillStyle = '#FFF6E6';
  c.fillRect(0, 0, W, H);
  caixa(c, 48, 48, W - 96, H - 96, 56);
  c.fillStyle = '#fff';
  c.fill();
  c.lineWidth = 8;
  c.strokeStyle = INK;
  c.stroke();
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';

  // topo: nome do quiz e data
  const data = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  c.fillStyle = '#3F5A50';
  c.font = '900 40px Nunito, sans-serif';
  c.fillText(cabe(c, `${(d.quiz || 'Quiz ao vivo').toUpperCase()} · ${data}`, W - 220), W / 2, 190);

  // título
  c.fillStyle = INK;
  c.font = '900 132px Fraunces, serif';
  const titulo = tituloCartao(d.rank);
  const linhas = c.measureText(titulo).width > W - 200 ? titulo.replace(/ (em|o) /, '\n$1 ').split('\n') : [titulo];
  linhas.forEach((l, i) => c.fillText(l, W / 2, 360 + i * 140));
  const yTit = 360 + (linhas.length - 1) * 140;
  if (d.rank > 0 && d.total > 1) {
    c.fillStyle = '#3F5A50';
    c.font = '800 46px Nunito, sans-serif';
    c.fillText(`${d.rank}º de ${d.total} na sala`, W / 2, yTit + 84);
  }

  // pódio: cena noturna da mata com os três degraus
  // quem está no pódio não tem o próprio bicho embaixo: o pódio desce um pouco para o cartão ficar equilibrado
  const folga = d.rank > 3 ? 0 : 90;
  const px = 150;
  const py = yTit + 150 + folga;
  const pw = W - 300;
  const ph = 760;
  caixa(c, px, py, pw, ph, 40);
  c.save();
  c.clip();
  c.fillStyle = '#0E2A22';
  c.fillRect(px, py, pw, ph);
  c.fillStyle = '#0B5D45';
  c.beginPath();
  c.ellipse(px + pw * 0.3, py + ph * 0.78, pw * 0.7, 180, 0, 0, Math.PI * 2);
  c.ellipse(px + pw * 0.85, py + ph * 0.8, pw * 0.5, 160, 0, 0, Math.PI * 2);
  c.fill();
  // vaga-lumes
  const luzes = [[0.12, 0.14], [0.3, 0.3], [0.52, 0.1], [0.78, 0.2], [0.9, 0.36], [0.2, 0.48], [0.66, 0.4], [0.42, 0.22]];
  for (const [lx, ly] of luzes) {
    c.fillStyle = 'rgba(255,200,61,0.25)';
    c.beginPath();
    c.arc(px + pw * lx, py + ph * ly, 18, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#FFC83D';
    c.beginPath();
    c.arc(px + pw * lx, py + ph * ly, 7, 0, Math.PI * 2);
    c.fill();
  }
  const degraus: [number, number, string, string][] = [
    [1, 300, '#D9DEE3', '#B8C0C8'],
    [0, 400, '#FFD25C', '#F2B705'],
    [2, 240, '#F0A877', '#D9824A'],
  ];
  const bw = (pw - 120) / 3;
  const base = py + ph - 40;
  for (let i = 0; i < 3; i++) {
    const [idx, alt, cor, sombra] = degraus[i];
    const r = d.podium[idx];
    const x = px + 60 + i * bw;
    const y = base - alt;
    c.fillStyle = sombra;
    c.fillRect(x + 6, y, bw - 12, 22);
    c.fillStyle = cor;
    c.fillRect(x + 6, y + 22, bw - 12, alt - 22);
    c.lineWidth = 5;
    c.strokeStyle = INK;
    c.strokeRect(x + 6, y, bw - 12, alt);
    c.fillStyle = INK;
    c.font = '900 84px Fraunces, serif';
    c.fillText(String(idx + 1), x + bw / 2, y + 100);
    if (!r) continue;
    c.font = '900 34px Nunito, sans-serif';
    c.fillText(cabe(c, r.nick, bw - 30), x + bw / 2, y + 150);
    c.font = '800 28px Nunito, sans-serif';
    c.fillText(`${fmt(r.score)} pts`, x + bw / 2, y + 190);
    const tam = idx === 0 ? 170 : 140;
    try {
      c.drawImage(await imagem(avatarSvg(r.avatar, tam)), x + bw / 2 - tam / 2, y - tam - 10, tam, tam);
    } catch {}
  }
  c.restore();
  caixa(c, px, py, pw, ph, 40);
  c.lineWidth = 6;
  c.strokeStyle = INK;
  c.stroke();

  // eu: quem ficou fora do pódio aparece com o próprio bicho
  let y = py + ph + 90 + folga / 2;
  if (d.rank > 3) {
    try {
      c.drawImage(await imagem(avatarSvg(d.avatar, 150)), W / 2 - 75, y - 20, 150, 150);
    } catch {}
    y += 190;
  }
  c.fillStyle = INK;
  c.font = '900 64px Nunito, sans-serif';
  c.fillText(`${fmt(d.score)} pontos`, W / 2, y + 30);

  // rodapé com o endereço
  c.fillStyle = '#3F5A50';
  c.font = '800 44px Nunito, sans-serif';
  c.fillText('quiddo.com.br · quiz ao vivo com a turma', W / 2, H - 130);

  return new Promise((ok, erro) => cv.toBlob((b) => (b ? ok(b) : erro(new Error('Não deu para gerar a imagem.'))), 'image/png'));
}

/** Compartilha pelo celular (Status, Stories, WhatsApp). Sem compartilhamento de arquivo, devolve false. */
export async function compartilharCartao(blob: Blob): Promise<'ok' | 'cancelou' | 'sem'> {
  const file = new File([blob], 'quiddo-resultado.png', { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (!nav.share || !nav.canShare?.({ files: [file] })) return 'sem';
  try {
    await nav.share({ files: [file], text: TEXTO_CARTAO });
    return 'ok';
  } catch (e) {
    return e instanceof DOMException && e.name === 'AbortError' ? 'cancelou' : 'sem';
  }
}
