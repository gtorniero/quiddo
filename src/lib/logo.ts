// Reduz imagens no navegador antes de guardar: o logo (480×160) e as imagens das perguntas (960×540).
import { LIMITS } from '../../shared/rules';

export function readLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(file.type)) return reject(new Error('Use PNG, JPG ou SVG.'));
    if (file.size > 5e6) return reject(new Error('Logo grande demais: use um arquivo de até 5 MB.'));
    const rd = new FileReader();
    rd.onerror = () => reject(new Error('Não deu para ler essa imagem.'));
    rd.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Não deu para ler essa imagem. Tente PNG ou JPG.'));
      img.onload = () => {
        const W = 480;
        const H = 160;
        const w0 = img.naturalWidth || W;
        const h0 = img.naturalHeight || H;
        const r = Math.min(1, W / w0, H / h0);
        const cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(w0 * r));
        cv.height = Math.max(1, Math.round(h0 * r));
        cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
        let out = cv.toDataURL('image/png');
        if (out.length > LIMITS.logoBytes) out = cv.toDataURL('image/webp', 0.85);
        if (!out.startsWith('data:image/webp') && out.length > LIMITS.logoBytes) out = cv.toDataURL('image/jpeg', 0.85);
        if (out.length > LIMITS.logoBytes) return reject(new Error('Logo pesado demais mesmo reduzido. Tente outro arquivo.'));
        resolve(out);
      };
      img.src = String(rd.result);
    };
    rd.readAsDataURL(file);
  });
}

/** Imagem de pergunta: no máximo 960×540, em JPEG, abaixo do limite do servidor. */
export function readFoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return reject(new Error('Use uma imagem JPG, PNG ou WebP.'));
    if (file.size > 15e6) return reject(new Error('Imagem grande demais: use um arquivo de até 15 MB.'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não deu para ler essa imagem. Tente JPG ou PNG.'));
    };
    img.onload = () => {
      URL.revokeObjectURL(url);
      const r = Math.min(1, 960 / img.naturalWidth, 540 / img.naturalHeight);
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(img.naturalWidth * r));
      cv.height = Math.max(1, Math.round(img.naturalHeight * r));
      const g = cv.getContext('2d')!;
      g.fillStyle = '#ffffff'; // PNG transparente vira fundo branco no JPEG
      g.fillRect(0, 0, cv.width, cv.height);
      g.drawImage(img, 0, 0, cv.width, cv.height);
      for (const qual of [0.8, 0.7, 0.6, 0.5, 0.4]) {
        const out = cv.toDataURL('image/jpeg', qual);
        if (out.length <= LIMITS.imgBytes) return resolve(out);
      }
      reject(new Error('Essa imagem ficou pesada demais. Tente outra.'));
    };
    img.src = url;
  });
}
