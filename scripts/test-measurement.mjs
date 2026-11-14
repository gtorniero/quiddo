import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
function bridge(file, brand, path) {
 const scripts=[],calls=[],handlers={};const parent={postMessage(){}};
 const window={addEventListener(n,f){handlers[n]=f}};
 const context={window,parent,location:{origin:'https://'+brand+'.com.br'},document:{head:{appendChild(s){scripts.push(s.src)}},createElement(){return {}}},URL,URLSearchParams,Number};
 vm.runInNewContext(readFileSync(file,'utf8'),context);
 const send=(data,origin=context.location.origin,source=parent)=>handlers.message({data,origin,source});
 const prefix=brand==='quiddo'?'qd':'sd';
 send({type:prefix+'_init',analytics:true,marketing:true,productUsageMeasurement:true},'https://evil.invalid');assert.equal(scripts.length,0,'forged message initializes nothing');
 send({type:prefix+'_init',analytics:true,marketing:true,productUsageMeasurement:true});assert.equal(scripts.length,2);
 const initial=window.dataLayer.length;assert.deepEqual(Array.from(window.dataLayer[0]).slice(0,2),['consent','default'],'Consent Mode default comes first');assert.equal(window.dataLayer[0][2].analytics_storage,'denied');
 send({type:prefix+'_measure',event:'page_view',path:'/host/ABCD',params:{email:'secret@example.com'}});assert.equal(window.dataLayer.length,initial,'private path rejected');
 send({type:prefix+'_measure',event:'page_view',path,params:{email:'secret@example.com',nome:'Private Name'},campaign:'?utm_source=instagram&token=secret&utm_term=secret%40example.com'});
 const event=Array.from(window.dataLayer.at(-1));assert.equal(event[0],'event');assert.equal(event[1],'page_view');const text=JSON.stringify(event);assert(!text.includes('secret'));assert(!text.includes('Private Name'));assert(text.includes('utm_source=instagram'));
 send({type:prefix+'_measure',event:'purchase',path,params:{transaction_id:'QD-SECRET',value:25,currency:'BRL',plano:'mensal'}});assert.equal(window.dataLayer.length,initial+1,'access code cannot become transaction id');
 for(const plano of ['mensal','anual','semana','oferta']) {
  const before=window.dataLayer.length;
  send({type:prefix+'_measure',event:'purchase',path,params:{transaction_id:'a'.repeat(64),value:156,currency:'BRL',plano,email:'secret@example.com'}});
  assert.equal(window.dataLayer.length,before+1,'confirmed '+plano+' sale reaches GA');
  const sale=Array.from(window.dataLayer.at(-1))[2];assert.equal(sale.plano,plano);assert.equal(sale.value,156);assert(!JSON.stringify(sale).includes('secret'));
  const last=window.fbq.queue.filter(x=>x[0]==='trackSingle').map(x=>x[2]);assert(last.includes('Purchase'));if(['mensal','anual'].includes(plano))assert.equal(last.at(-1),'Subscribe');
 }
 const beforeInvalid=window.dataLayer.length;
 send({type:prefix+'_measure',event:'purchase',path,params:{transaction_id:'a'.repeat(64),value:156,currency:'BRL',plano:'unrecognized'}});
 assert.equal(window.dataLayer.length,beforeInvalid,'unknown plan remains rejected');
 const metaCount=window.fbq.queue.length;
 send({type:prefix+'_measure',event:'game_complete',path:'/partida/jogador',referrer:'https://www.google.com/search?q=secret@example.com',params:{role:'player',nick:'Private Name',choice:2,room:'ABCD',email:'secret@example.com'}});
 const usage=Array.from(window.dataLayer.at(-1));assert.equal(usage[1],'game_complete');assert.equal(usage[2].role,'player');assert.equal(usage[2].page_referrer,'https://www.google.com/');
 assert(!/Private Name|ABCD|secret@example|choice/.test(JSON.stringify(usage)),'product content and identities are never forwarded');
 assert.equal(window.fbq.queue.length,metaCount,'detailed product use stays out of Meta');
 const afterGame=window.dataLayer.length;
 send({type:prefix+'_measure',event:'page_view',path:'/partida/jogador'});assert.equal(window.dataLayer.length,afterGame,'private category is not a public page view');
 const stagedScripts=[];
 vm.runInNewContext(readFileSync(file,'utf8'),{...context,location:{origin:'https://quiddo-stage.workers.dev',hostname:'quiddo-stage.workers.dev'},document:{head:{appendChild(x){stagedScripts.push(x)}},createElement(){return {}}}});
 assert.equal(stagedScripts.length,0,'staging cannot initialize production vendors');
 const noScripts=[],noHandlers={};const noWindow={addEventListener(n,f){noHandlers[n]=f}};const noParent={postMessage(){}};
 vm.runInNewContext(readFileSync(file,'utf8'),{...context,window:noWindow,parent:noParent,document:{head:{appendChild(x){noScripts.push(x)}},createElement(){return {}}}});
 noHandlers.message({origin:context.location.origin,source:noParent,data:{type:prefix+'_init',analytics:false,marketing:false}});assert.equal(noScripts.length,0,'refusal loads no SDK');
 console.log(file+': privacy and consent checks passed');
}

bridge('public/medicao-vendor.js','quiddo','/precos');
