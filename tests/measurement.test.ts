import { describe, it, expect } from 'vitest';
import { publicPath, paymentPath, campaignQuery, readConsent, googleAdsAllowed, needsAdsChoice } from '../src/lib/measurement-policy';

describe('medição protege endereços privados e escolhas', () => {
 it('não transforma sala, conta ou rota desconhecida em página pública', () => {
  for (const path of ['/host/ABCD', '/ABCD', '/conta', '/api/acesso', '/guias/email@exemplo.com']) expect(publicPath(path)).toBeNull();
  expect(publicPath('/precos')).toBe('/precos');
  expect(paymentPath('/host/ABCD')).toBe('/pagamento');
  for (const path of ['/conta','/ABCD','/host/email@example.com','/host/ABCD/segredo']) expect(paymentPath(path)).toBeNull();
 });
 it('preserva rótulos de campanha, exclui e-mail, token, código e fragmento', () => {
  const out=campaignQuery('?utm_source=instagram&utm_medium=paid_social&utm_campaign=lancamento&ref=segredo&email=ana@exemplo.com&utm_term=ana%40exemplo.com');
  expect(out).toBe('?utm_source=instagram&utm_medium=paid_social&utm_campaign=lancamento');
 });
 it('exige aceite novo para Google Ads sem ampliar consentimento antigo ou recusa', () => {
  const legacy={version:1 as const,analytics:true,marketing:true,at:1000};
  expect(googleAdsAllowed(legacy)).toBe(false); expect(needsAdsChoice(legacy)).toBe(true);
  expect(googleAdsAllowed({...legacy,googleAdsMeasurement:true})).toBe(true);
  expect(googleAdsAllowed({...legacy,analytics:false,googleAdsMeasurement:true})).toBe(false);
  expect(googleAdsAllowed({...legacy,marketing:false,googleAdsMeasurement:true})).toBe(false);
  expect(needsAdsChoice({...legacy,marketing:false})).toBe(false);
  expect(needsAdsChoice({...legacy,googleAdsMeasurement:false})).toBe(false);
 });
 it('recusa consentimento inválido, futuro e expirado', () => {
  for (const raw of ['{}','null','invalid',JSON.stringify({version:1,analytics:true,marketing:true,at:2000})]) expect(readConsent(raw,1000)).toBeNull();
  expect(readConsent(JSON.stringify({version:1,analytics:false,marketing:false,at:1000}),1001)?.analytics).toBe(false);
 });
});

import { vi } from 'vitest';
describe('eventos aguardam o componente e respeitam revogação', () => {
 it('mede uma página por navegação, preserva origem sanitizada e não expõe sala', async()=>{
  vi.resetModules();
  const sent:any[]=[],handlers:Record<string,(e:any)=>void>={};const origin='https://www.quiddo.com.br';
  const source={postMessage(data:any){sent.push(data);if(data.type==='qd_measure'&&typeof data.id==='number')queueMicrotask(()=>handlers.message({origin,source,data:{type:'qd_done',id:data.id,queued:true}}));}};
  const values=new Map([['btw_capi_choice_v1','no'],['qd_consent_v1',JSON.stringify({version:1,analytics:true,marketing:false,productUsageMeasurement:true,at:Date.now()})]]);
  vi.stubGlobal('location',{origin,hostname:'www.quiddo.com.br',search:'?utm_source=google&gclid=PRIVATECLICK'});
  vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)||null,setItem:(k:string,v:string)=>values.set(k,v)});
  vi.stubGlobal('window',{setTimeout,addEventListener:(n:string,f:any)=>handlers[n]=f});
  vi.stubGlobal('document',{referrer:'https://www.google.com/search?q=private@example.com',cookie:'',getElementById:()=>null,createElement:()=>({contentWindow:source,remove(){}}),body:{appendChild(){}}});
  try{
   const m=await import('../src/lib/measurement');m.initMeasurement();m.measurePage('/');handlers.message({origin,source,data:{type:'qd_ready'}});
   m.measurePage('/');m.measurePage('/criar');m.measurePage('/criar');m.measurePage('/host/ABCD');
   await m.track('game_start',{role:'host'});m.measurePage('/criar');
   const views=sent.filter(x=>x.event==='page_view');expect(views.map(x=>x.path)).toEqual(['/','/criar','/criar']);
   expect(views[0].referrer).toBe('https://www.google.com/');expect(views[1].referrer).toBe('https://www.quiddo.com.br/');
   expect(JSON.stringify(sent)).not.toMatch(/ABCD|private@example|PRIVATECLICK/);
   expect(sent.find(x=>x.event==='game_start').path).toBe('/partida/anfitriao');
  }finally{vi.unstubAllGlobals();}
 });
 it('staging não carrega medição de produção nem aceita eventos',async()=>{
  vi.resetModules();vi.stubGlobal('location',{hostname:'quiddo-premium-pdf-stage-20261107.guitorniero.workers.dev',search:''});
  try{const m=await import('../src/lib/measurement');m.initMeasurement();expect(await m.track('ai_generation_success',{source:'pdf'})).toBe(false);}finally{vi.unstubAllGlobals();}
 });
 it('não perde a criação de sala enquanto o iframe inicializa', async () => {
  vi.resetModules();
  const handlers: Record<string, (e: any) => void> = {}, sent: any[] = [];
  const origin='https://www.quiddo.com.br';
  const source={postMessage(data: any) { sent.push(data); if(data.type==='qd_measure') queueMicrotask(()=>handlers.message({origin,source,data:{type:'qd_done',id:data.id,queued:true}})); }};
  const values=new Map([['btw_capi_choice_v1','no'],['qd_consent_v1',JSON.stringify({version:1,analytics:true,marketing:false,productUsageMeasurement:true,at:Date.now()})]]);
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

describe('compra em sala privada e reconhecimento de envio', () => {
 async function setup(ack: 'yes'|'no'|'timeout') {
  vi.resetModules();vi.useFakeTimers();
  const handlers:Record<string,(e:any)=>void>={},sent:any[]=[];
  const origin='https://www.quiddo.com.br';let acknowledgment=ack;
  const source={postMessage(data:any){sent.push(data);if(data.type==='qd_measure' && acknowledgment!=='timeout')queueMicrotask(()=>handlers.message({origin,source,data:{type:'qd_done',id:data.id,queued:acknowledgment==='yes'}}));}};
  const values=new Map([['btw_capi_choice_v1','no'],['qd_consent_v1',JSON.stringify({version:1,analytics:true,marketing:false,productUsageMeasurement:true,at:Date.now()})]]);
  vi.stubGlobal('location',{origin,hostname:'www.quiddo.com.br',search:'?utm_source=teste&ref=PRIVATE'});
  vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)||null,setItem:(k:string,v:string)=>values.set(k,v)});
  vi.stubGlobal('window',{setTimeout,addEventListener:(n:string,f:any)=>handlers[n]=f});
  vi.stubGlobal('document',{cookie:'',getElementById:()=>null,createElement:()=>({contentWindow:source,remove(){}}),body:{appendChild(){}}});
  const m=await import('../src/lib/measurement');m.initMeasurement();m.measurePage('/host/ABCD');
  const ready=()=>handlers.message({origin,source,data:{type:'qd_ready'}});
  return {m,values,sent,ready,handlers,ack:(v:typeof ack)=>{acknowledgment=v;}};
 }
 const sale={transaction_id:'b'.repeat(64),value:12.99,currency:'BRL' as const,plano:'semana' as const};
 it('emite só a conversão agregada, sem URL da sala ou page_view privado; não duplica',async()=>{
  try{
   const x=await setup('yes');expect(x.sent).toHaveLength(0);
   const p=x.m.trackPurchase(sale);x.ready();await vi.advanceTimersByTimeAsync(0);await p;
   const events=x.sent.filter(d=>d.type==='qd_measure');expect(events).toHaveLength(1);expect(events[0].event).toBe('purchase');expect(events[0].path).toBe('/pagamento');
   expect(JSON.stringify(x.sent)).not.toMatch(/ABCD|PRIVATE|\/host/);expect(x.values.get('qd_sale_'+sale.transaction_id)).toBe('1');
   await x.m.trackPurchase(sale);expect(x.sent.filter(d=>d.event==='purchase')).toHaveLength(1);
   await x.m.track('create_room');expect(x.sent.filter(d=>d.event==='create_room')).toHaveLength(0);
  }finally{vi.useRealTimers();vi.unstubAllGlobals();}
 });
 it('timeout não marca venda como enviada; tentativa seguinte pode ser confirmada',async()=>{
  try{
   const x=await setup('timeout');const p=x.m.trackPurchase(sale);x.ready();await vi.advanceTimersByTimeAsync(2100);await p;
   expect(x.values.has('qd_sale_'+sale.transaction_id)).toBe(false);
   x.ack('yes');const retry=x.m.trackPurchase(sale);await vi.advanceTimersByTimeAsync(0);await retry;
   expect(x.values.get('qd_sale_'+sale.transaction_id)).toBe('1');
  }finally{vi.useRealTimers();vi.unstubAllGlobals();}
 });
 it('duas consultas simultâneas usam uma emissão; revogação cancela pendência',async()=>{
  try{
   const x=await setup('timeout');const p=x.m.trackPurchase(sale);const duplicate=x.m.trackPurchase(sale);x.ready();await vi.advanceTimersByTimeAsync(0);
   expect(x.sent.filter(d=>d.event==='purchase')).toHaveLength(1);
   x.values.set('qd_consent_v1',JSON.stringify({version:1,analytics:false,marketing:false,at:Date.now()}));x.handlers.storage({key:'qd_consent_v1'});await p;await duplicate;
   expect(x.values.has('qd_sale_'+sale.transaction_id)).toBe(false);await x.m.trackPurchase(sale);expect(x.sent.filter(d=>d.event==='purchase')).toHaveLength(1);
  }finally{vi.useRealTimers();vi.unstubAllGlobals();}
 });
});
