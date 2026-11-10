import { PDFDocument, PDFName } from '../../vendor/pdf-lib.js';
import { MAX_BYTES, PdfError, parsePages, sha } from './core.mjs';

export async function readPdf(req) {
  if (req.headers.get('content-type')?.split(';')[0] !== 'application/pdf') throw new PdfError('format','Envie um arquivo PDF.',415);
  const length = Number(req.headers.get('content-length') || 0);
  if (length > MAX_BYTES) throw new PdfError('size','Escolha um PDF de até 20 MB.',413);
  const reader = req.body?.getReader();
  if (!reader) throw new PdfError('file','Selecione um PDF.');
  const chunks = []; let size = 0;
  for (;;) {
    const {done,value} = await reader.read(); if (done) break;
    size += value.length;
    if (size > MAX_BYTES) { await reader.cancel(); throw new PdfError('size','Escolha um PDF de até 20 MB.',413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const c of chunks) { bytes.set(c,offset);offset+=c.length; }
  chunks.length = 0;
  if (new TextDecoder().decode(bytes.subarray(0,5)) !== '%PDF-') throw new PdfError('format','O arquivo não é um PDF válido.');
  let document;
  try { document = await PDFDocument.load(bytes,{ignoreEncryption:false,updateMetadata:false,throwOnInvalidObject:true}); }
  catch { throw new PdfError('read','PDF inválido ou protegido por senha. Envie uma cópia legível sem senha.'); }
  const count = document.getPageCount();
  if (!count || count > 5000) throw new PdfError('page_count','Não foi possível conferir as páginas desse PDF.');
  return {document,count,bytes,size,hash:await sha(bytes)};
}
export async function selectPdf(parsed, expression) {
  const pages = parsePages(expression,parsed.count);
  const selected = await PDFDocument.create();
  const copies = await selected.copyPages(parsed.document,pages.map(n=>n-1));
  for (const page of copies) {
    // Strip actions and annotations rather than carrying interactive content into the provider input.
    page.node.delete(PDFName.of('Annots'));page.node.delete(PDFName.of('AA'));
    selected.addPage(page);
  }
  selected.setProducer('Quiddo PDF staging');selected.setCreator('Quiddo');
  const bytes = await selected.save({useObjectStreams:true,addDefaultPage:false});
  if (bytes.length > MAX_BYTES) throw new PdfError('size','As páginas escolhidas excedem 20 MB.',413);
  let binary='';
  for (let i=0;i<bytes.length;i+=8192) binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return {pages,dataUrl:'data:application/pdf;base64,'+btoa(binary),bytes:bytes.length,hash:await sha(bytes),count:selected.getPageCount()};
}
