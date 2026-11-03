import { describe, it, expect } from 'vitest';
import { publicPath, campaignQuery, readConsent } from '../src/lib/measurement-policy';

describe('medição protege endereços privados e escolhas', () => {
 it('não transforma sala, conta ou rota desconhecida em página pública', () => {
  for (const path of ['/host/ABCD', '/ABCD', '/conta', '/api/acesso', '/guias/email@exemplo.com']) expect(publicPath(path)).toBeNull();
  expect(publicPath('/precos')).toBe('/precos');
 });
 it('preserva rótulos de campanha, exclui e-mail, token, código e fragmento', () => {
  const out=campaignQuery('?utm_source=instagram&utm_medium=paid_social&utm_campaign=lancamento&ref=segredo&email=ana@exemplo.com&utm_term=ana%40exemplo.com');
  expect(out).toBe('?utm_source=instagram&utm_medium=paid_social&utm_campaign=lancamento');
 });
 it('recusa consentimento inválido, futuro e expirado', () => {
  for (const raw of ['{}','null','invalid',JSON.stringify({version:1,analytics:true,marketing:true,at:2000})]) expect(readConsent(raw,1000)).toBeNull();
  expect(readConsent(JSON.stringify({version:1,analytics:false,marketing:false,at:1000}),1001)?.analytics).toBe(false);
 });
});

import { vi } from 'vitest';
describe('eventos aguardam o componente e respeitam revogação', () => {
 it('não perde a criação de sala enquanto o iframe inicializa', async () => {
  vi.resetModules();
  const handlers: Record<string, (e: any) => void> = {}, sent: any[] = [];
  const origin='https://www.quiddo.com.br';
  const source={postMessage(data: any) { sent.push(data); if(data.type==='qd_measure') queueMicrotask(()=>handlers.message({origin,source,data:{type:'qd_done',id:data.id}})); }};
  const values=new Map([['qd_consent_v1',JSON.stringify({version:1,analytics:true,marketing:false,at:Date.now()})]]);
  vi.stubGlobal('location',{origin,hostname:'www.quiddo.com.br',search:''});
  vi.stubGlobal('localStorage',{getItem:(k: string)=>values.get(k)||null,setItem:(k: string,v: string)=>values.set(k,v)});
  vi.stubGlobal('window',{setTimeout,addEventListener:(n: string,f: any)=>handlers[n]=f});
  vi.stubGlobal('document',{cookie:'',getElementById:()=>null,createElement:()=>({contentWindow:source,remove(){}}),body:{appendChild(){}}});
  try {
   const measurement=await import('../src/lib/measurement');measurement.initMeasurement();measurement.measurePage('/precos');
   const result=measurement.track('create_room');
   expect(sent).toHaveLength(0);
   handlers.message({origin,source,data:{type:'qd_ready'}});
   await result;
   expect(sent.filter(d=>d.event==='create_room')).toHaveLength(1);
   values.set('qd_consent_v1',JSON.stringify({version:1,analytics:false,marketing:false,at:Date.now()}));
   handlers.storage({key:'qd_consent_v1'});
   await measurement.track('create_room');
   expect(sent.filter(d=>d.event==='create_room')).toHaveLength(1);
  } finally {vi.unstubAllGlobals();}
 });
});
