import {promoHash} from './promos.mjs';

// Fixed server-to-server report. No identities, access codes, report contents or provider mutations.
const QA = {quiddo:'995ed2bd-f8ad-4aa3-9f52-37b4bf67a04c',sportdna:'5de99ca1-bf2a-4fa6-a46f-29ece5358634'};
const names = {quiddo:'Quiddo',sportdna:'SPORT DNA'};
const classifications = ['founder_qa','unclassified_production'];
const dateFormat = new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'});
const reply = (body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});
const safeCodes = ['ACCESS_DENIED','NOT_FOUND','BAD_REQUEST','SOURCE_FAILED','QUOTA','INVALID_REPORT','IDENTITY_MISMATCH','REPORT_TOO_LARGE','INCOMPLETE_REPORT'];
const safeCode = error=>safeCodes.includes(error?.message)?error.message:'COLLECTION_FAILED';
function cents(value){
 if(value===null||value===undefined||value==='')return null;
 const text=String(value);if(!/^\d+(?:\.\d{1,2})?$/.test(text))throw Error('INVALID_REPORT');
 const [a,b='']=text.split('.'),n=Number(a)*100+Number(b.padEnd(2,'0'));
 if(!Number.isSafeInteger(n))throw Error('INVALID_REPORT');return n;
}
function integer(value){if(!Number.isSafeInteger(value)||value<0)throw Error('INVALID_REPORT');return value;}
function instant(value,future=false){if(value===null||value===undefined||value===''||value===0)return null;const n=typeof value==='number'?value:Date.parse(value);if(!Number.isFinite(n)||n<1577836800000||n>(future?4102444800000:Date.now()+86400000))throw Error('INVALID_REPORT');return new Date(n).toISOString();}
function row(product,r){
 const q=product==='quiddo',id=q?r.ref:r.id;
 if(typeof id!=='string'||id.length>128)throw Error('INVALID_REPORT');
 const amount=q?cents(r.valor):integer(r.amount);if(amount===null)throw Error('INVALID_REPORT');
 const originalMode=q?r.modo:r.mode;
 const mode=['live','ligada'].includes(originalMode)?'live':['test','teste'].includes(originalMode)?'test':originalMode==='simulacao'?'simulation':'unknown';
 const free=q?r.tipo==='promo':r.provider==='promo';
 const provider=q?free?'promo':r.ordem?.startsWith('stripe:')?'stripe':r.ordem?.startsWith('sim:')?'simulation':'mercadopago':r.provider;
 if(!['promo','simulation','stripe','mercadopago'].includes(provider))throw Error('INVALID_REPORT');
 return {id,amount,mode,free,provider,providerId:q?(provider==='stripe'?String(r.ordem||'').slice(7):String(r.ordem||'')):r.provider_id,
  state:q?r.status:r.state,recordedPaid:q?r.status==='pago':r.state==='paid',createdAt:instant(q?r.criado:r.created_at),
  confirmedAt:q?instant(r.pago):null,accessGenerated:q?r.access_generated===1:null,expiresAt:q?instant(r.expira,true):null,
  emailAttemptedAt:q?null:instant(r.email_attempted_at),grantId:free?(q?id.slice(6):r.grant_id):null,
  subscription:q?r.tipo==='assinatura':false,subscriptionRisk:q?r.subscription_risk:null,
  classification:id===QA[product]?'founder_qa':'unclassified_production'};
}
async function jsonGet(fetcher,url,token){
 const response=await fetcher(url,{method:'GET',headers:{Authorization:'Bearer '+token},redirect:'manual',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error([401,403].includes(response.status)?'ACCESS_DENIED':response.status===404?'NOT_FOUND':response.status===400?'BAD_REQUEST':response.status===429?'QUOTA':'SOURCE_FAILED');
 const body=await response.text();if(body.length>500000)throw Error('REPORT_TOO_LARGE');return JSON.parse(body);
}
export function parseMPPayment(payment,order){
 if(String(payment.external_reference)!==order.id||payment.currency_id!=='BRL'||payment.live_mode!==true||cents(payment.transaction_amount)!==order.amount)throw Error('IDENTITY_MISMATCH');
 if(!['approved','refunded','charged_back'].includes(payment.status)||!payment.date_approved)throw Error('INVALID_REPORT');
 return {status:'payment_verified',paid_cents:order.amount,paid_at:instant(payment.date_approved),refunded_cents:cents(payment.transaction_amount_refunded),
  fees_cents:null,provider_net_received_cents:cents(payment.transaction_details?.net_received_amount),provider_state:payment.status,
  refunded_at:null,chargeback:payment.status==='charged_back'};
}
async function reconcileMP(order,env,fetcher){
 const token=String(env.MP_TOKEN||'').trim().replace(/^['"]|['"]$/g,'').replace(/^Bearer\s+/i,'').trim();
 if(!token)return {status:'not_configured'};
 let verified={status:'not_verified'};
 if(/^ORD[A-Z0-9]{10,64}$/.test(order.providerId||'')){
  const value=await jsonGet(fetcher,'https://api.mercadopago.com/v1/orders/'+order.providerId,token);
  if(value.id!==order.providerId||value.external_reference!==order.id||cents(value.total_amount)!==order.amount||value.currency&&value.currency!=='BRL'||value.live_mode===false)throw Error('IDENTITY_MISMATCH');
  const settled=value.status==='processed'&&value.status_detail==='accredited'&&Array.isArray(value.transactions?.payments)&&value.transactions.payments.length>0&&value.transactions.payments.every(p=>p.status==='processed'&&p.status_detail==='accredited');
  const paid=settled?cents(value.total_paid_amount):null;
  verified={status:settled?'order_verified':'order_not_settled',paid_cents:paid,paid_at:null,fees_cents:null,refunded_cents:null,provider_net_received_cents:null,refunded_at:null,chargeback:null,provider_state:String(value.status||'unknown').slice(0,40)};
 }else if(!/^pay:\d{1,30}$/.test(order.providerId||''))return {status:'provider_id_unavailable'};
 try{
  let payments;
  if(order.providerId.startsWith('pay:'))payments=[await jsonGet(fetcher,'https://api.mercadopago.com/v1/payments/'+order.providerId.slice(4),token)];
  else{
   const query=new URLSearchParams({sort:'date_created',criteria:'desc',external_reference:order.id,range:'date_created',begin_date:'NOW-365DAYS',end_date:'NOW'});
   const data=await jsonGet(fetcher,'https://api.mercadopago.com/v1/payments/search?'+query,token);
   const result=Array.isArray(data)&&data.length===1?data[0]:data;
   if(!Array.isArray(result?.results)||!Number.isSafeInteger(result.paging?.total)||result.paging.total>result.results.length||result.results.length>30)throw Error('INCOMPLETE_REPORT');
   payments=result.results;
  }
  const paid=payments.filter(p=>['approved','refunded','charged_back'].includes(p.status)&&p.date_approved);
  if(paid.length>1)return {...verified,payment_lookup:'ambiguous'};
  if(paid.length===1)return parseMPPayment(paid[0],order);
  return {...verified,payment_lookup:'not_returned'};
 }catch(error){return {...verified,payment_lookup:safeCode(error)};}
}
const bucket=()=>({orders:0,gross_cents:0});
function add(target,amount){target.orders++;target.gross_cents+=amount;}
function seriesAdd(map,date,classification,amount){const key=date+'|'+classification;if(!map.has(key))map.set(key,{date,classification,...bucket()});add(map.get(key),amount);}
export function aggregatePayments(product,orders,observedAt){
 const recorded={...bucket(),by_classification:Object.fromEntries(classifications.map(k=>[k,bucket()]))};
 const verified={...bucket(),by_classification:Object.fromEntries(classifications.map(k=>[k,bucket()])),with_exact_paid_at:0,without_exact_paid_at:0,refunded_cents:null,fees_cents:null,provider_net_received_cents:null};
 const daily=new Map(),confirmed=new Map(),checks=new Map(),states=new Map(),grants=new Set();
 let refunds=0,refundCoverage=0,net=0,netCoverage=0,freeOrders=0,freeWithoutGrant=0,technicalOrders=0,technicalPaid=0,accessGenerated=0,activePaid=0,emailAttempts=0,subscriptions=0,unknownMode=0;
 for(const order of orders){
  const stateKey=[order.mode,order.provider,order.state].join('|');states.set(stateKey,(states.get(stateKey)||0)+1);
  if(order.mode==='unknown'){unknownMode++;continue;}
  if(order.mode!=='live'){technicalOrders++;if(order.recordedPaid)technicalPaid++;continue;}
  if(order.free){freeOrders++;if(order.grantId)grants.add(order.grantId);else freeWithoutGrant++;continue;}
  if(order.subscription)subscriptions++;
  if(order.recordedPaid&&order.amount>0){
   add(recorded,order.amount);add(recorded.by_classification[order.classification],order.amount);
   if(order.confirmedAt)seriesAdd(confirmed,dateFormat.format(new Date(order.confirmedAt)),order.classification,order.amount);
   if(order.accessGenerated){accessGenerated++;if(!order.expiresAt||order.expiresAt>observedAt)activePaid++;}
   if(order.emailAttemptedAt)emailAttempts++;
  }
  const check=order.reconciliation||{status:'not_collected'},key=order.provider+'|'+check.status+'|'+(check.payment_lookup||'');checks.set(key,(checks.get(key)||0)+1);
  if(['payment_verified','order_verified'].includes(check.status)&&check.paid_cents>0){
   add(verified,check.paid_cents);add(verified.by_classification[order.classification],check.paid_cents);
   if(check.paid_at){verified.with_exact_paid_at++;seriesAdd(daily,dateFormat.format(new Date(check.paid_at)),order.classification,check.paid_cents);}else verified.without_exact_paid_at++;
   if(check.refunded_cents!==null&&check.refunded_cents!==undefined){refunds+=check.refunded_cents;refundCoverage++;}
   if(check.provider_net_received_cents!==null&&check.provider_net_received_cents!==undefined){net+=check.provider_net_received_cents;netCoverage++;}
  }
 }
 if(verified.orders&&refundCoverage===verified.orders)verified.refunded_cents=refunds;
 if(verified.orders&&netCoverage===verified.orders)verified.provider_net_received_cents=net;
 return {status:'available',product:names[product],currency:'BRL',observed_at:observedAt,
  coverage:{scope:'all_persisted_orders',records_complete:true,records:orders.length,unknown_mode:unknownMode,source:'Cloudflare D1 + consultas GET aos provedores existentes',time_zone:'America/Sao_Paulo',subscription_rows:subscriptions,subscription_invoice_history_complete:subscriptions===0,unique_buyers:null},
  recorded_payments:recorded,verified_payments:verified,
  free_access:{orders:freeOrders,distinct_grants:freeWithoutGrant?null:grants.size,orders_without_grant:freeWithoutGrant},
  technical:{orders:technicalOrders,paid_orders:technicalPaid},
  daily_payments:[...daily.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.classification.localeCompare(b.classification)),
  daily_local_confirmations:[...confirmed.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.classification.localeCompare(b.classification)),
  delivery:{paid_access_generated:product==='quiddo'?accessGenerated:null,active_paid_access:product==='quiddo'?activePaid:null,paid_report_email_attempts:product==='sportdna'?emailAttempts:null,confirmed_deliveries:null,confirmed_usage:null},
  states:[...states].map(([k,count])=>{const [mode,provider,state]=k.split('|');return {mode,provider,state,count};}),
  provider_checks:[...checks].map(([k,count])=>{const [provider,status,payment_lookup]=k.split('|');return {provider,status,payment_lookup:payment_lookup||null,count};}),
  caveats:['Somente pedidos identificados na validação de 06/11 são classificados como QA do fundador. Outros pagamentos de produção ficam sem classificação comercial.',
   'Confirmação local, criação do pedido e checked_at não são usados como data de venda. A série diária usa apenas date_approved verificado no provedor.',
   'Acesso gerado ou tentativa de e-mail não comprovam entrega nem utilização. Taxas e valores ausentes permanecem desconhecidos.',
   'Renovações de assinaturas exigem histórico de faturas; um registro de assinatura não representa todas as cobranças.']};
}
export async function collectProduct(product,env,fetcher,now){
 const db=product==='quiddo'?env.DB:env.PROMO_SPORTDNA;if(!db)return {status:'not_configured',product:names[product]};
 const sql=product==='quiddo'?"SELECT p.ref,p.ordem,p.status,p.valor,p.modo,p.plano,p.tipo,p.criado,p.pago,p.expira,CASE WHEN p.codigo IS NOT NULL AND p.codigo!='' THEN 1 ELSE 0 END access_generated,a.status subscription_status,a.risk subscription_risk FROM compras p LEFT JOIN qd_assinaturas a ON a.ref=p.ref ORDER BY p.criado,p.ref LIMIT 1001":
  'SELECT o.id,o.product,o.provider,o.amount,o.mode,o.provider_id,o.state,o.created_at,e.attempted_at email_attempted_at,p.grant_id FROM orders o LEFT JOIN report_emails e ON e.order_id=o.id LEFT JOIN promo_order_emails p ON p.order_id=o.id ORDER BY o.created_at,o.id LIMIT 1001';
 const result=await db.prepare(sql).all();if(!Array.isArray(result.results)||result.results.length>1000)throw Error('REPORT_TOO_LARGE');
 const orders=result.results.map(r=>row(product,r)),ids=new Set();let readBudget=12;
 for(const order of orders){
  if(ids.has(order.id))throw Error('INVALID_REPORT');ids.add(order.id);
  if(order.mode!=='live'||order.free||!order.amount)continue;
  if(order.provider!=='mercadopago'){order.reconciliation={status:order.subscription?'invoice_history_required':'not_collected'};continue;}
  if(readBudget<=0){order.reconciliation={status:'read_limit'};continue;}readBudget--;
  try{order.reconciliation=await reconcileMP(order,env,fetcher);}catch(error){order.reconciliation={status:safeCode(error)};}
 }
 return aggregatePayments(product,orders,new Date(now).toISOString());
}
async function collectForReport(product,env,fetcher,now){
 if(product!=='sportdna')return collectProduct(product,env,fetcher,now);
 if(!env.SPORT_FINANCE)return collectProduct(product,{...env,MP_TOKEN:undefined},fetcher,now);
 const report=await env.SPORT_FINANCE.read();
 if(report?.product!=='SPORT DNA'||!['available','not_configured'].includes(report.status))throw Error('INVALID_REPORT');
 return report;
}
let cached;
export async function servicePayments(request,env,fetcher=fetch,now=Date.now()){
 try{
  if(!env.BTW_PROMOS_TOKEN||env.BTW_PROMOS_TOKEN.length<32||await promoHash(request.headers.get('Authorization')||'')!==await promoHash('Bearer '+env.BTW_PROMOS_TOKEN))return reply({error:'Unauthorized'},401);
  if(request.headers.has('Origin')||request.headers.has('Cookie'))return reply({error:'Service access required'},403);
  if(request.method!=='GET')return reply({error:'GET required'},405);
  if(new URL(request.url).search)return reply({error:'Invalid filter'},400);
  if(cached&&cached.env===env&&now-cached.time<60000)return reply(await cached.value);
  const value=Promise.all(Object.keys(names).map(async key=>{try{return [key,await collectForReport(key,env,fetcher,now)];}catch(error){return [key,{status:'error',product:names[key],error_code:safeCode(error)}];}})).then(entries=>({schema_version:1,observed_at:new Date(now).toISOString(),products:Object.fromEntries(entries)}));
  cached={env,time:now,value};return reply(await value);
 }catch{return reply({error:'Collection unavailable'},503);}
}
