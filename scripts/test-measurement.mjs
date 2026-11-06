import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
function bridge(file, brand, path) {
 const scripts=[],calls=[],handlers={};const parent={postMessage(){}};
 const window={addEventListener(n,f){handlers[n]=f}};
 const context={window,parent,location:{origin:'https://'+brand+'.com.br'},document:{head:{appendChild(s){scripts.push(s.src)}},createElement(){return {}}},URLSearchParams,Number};
 vm.runInNewContext(readFileSync(file,'utf8'),context);
 const send=(data,origin=context.location.origin,source=parent)=>handlers.message({data,origin,source});
 const prefix=brand==='quiddo'?'qd':'sd';
 send({type:prefix+'_init',analytics:true,marketing:true},'https://evil.invalid');assert.equal(scripts.length,0,'forged message initializes nothing');
 send({type:prefix+'_init',analytics:true,marketing:true});assert.equal(scripts.length,2);
 send({type:prefix+'_measure',event:'page_view',path:'/host/ABCD',params:{email:'secret@example.com'}});assert.equal(window.dataLayer.length,3,'private path rejected');
 send({type:prefix+'_measure',event:'page_view',path,params:{email:'secret@example.com',nome:'Private Name'},campaign:'?utm_source=instagram&token=secret&utm_term=secret%40example.com'});
 const event=Array.from(window.dataLayer.at(-1));assert.equal(event[0],'event');assert.equal(event[1],'page_view');const text=JSON.stringify(event);assert(!text.includes('secret'));assert(!text.includes('Private Name'));assert(text.includes('utm_source=instagram'));
 send({type:prefix+'_measure',event:'purchase',path,params:{transaction_id:'QD-SECRET',value:25,currency:'BRL',plano:'mensal'}});assert.equal(window.dataLayer.length,4,'access code cannot become transaction id');
 for(const plano of ['mensal','anual','semana','oferta']) {
  const before=window.dataLayer.length;
  send({type:prefix+'_measure',event:'purchase',path,params:{transaction_id:'a'.repeat(64),value:156,currency:'BRL',plano,email:'secret@example.com'}});
  assert.equal(window.dataLayer.length,before+1,'confirmed '+plano+' sale reaches GA');
  const sale=Array.from(window.dataLayer.at(-1))[2];assert.equal(sale.plano,plano);assert.equal(sale.value,156);assert(!JSON.stringify(sale).includes('secret'));
  assert.equal(window.fbq.queue.at(-1)[2],'Purchase');
 }
 const beforeInvalid=window.dataLayer.length;
 send({type:prefix+'_measure',event:'purchase',path,params:{transaction_id:'a'.repeat(64),value:156,currency:'BRL',plano:'unrecognized'}});
 assert.equal(window.dataLayer.length,beforeInvalid,'unknown plan remains rejected');
 const noScripts=[],noHandlers={};const noWindow={addEventListener(n,f){noHandlers[n]=f}};const noParent={postMessage(){}};
 vm.runInNewContext(readFileSync(file,'utf8'),{...context,window:noWindow,parent:noParent,document:{head:{appendChild(x){noScripts.push(x)}},createElement(){return {}}}});
 noHandlers.message({origin:context.location.origin,source:noParent,data:{type:prefix+'_init',analytics:false,marketing:false}});assert.equal(noScripts.length,0,'refusal loads no SDK');
 console.log(file+': privacy and consent checks passed');
}

bridge('public/medicao-vendor.js','quiddo','/precos');
