import qrcode from 'qrcode-generator';

/** SVG do QR code de um link. */
export function qrSvg(text: string): string {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true, alt: 'QR code para entrar na sala' } as Parameters<typeof qr.createSvgTag>[0]);
}
