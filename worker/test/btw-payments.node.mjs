import assert from 'node:assert/strict';
import {servicePayments,aggregatePayments,parseMPPayment} from '../btw-payments.mjs';
const now=Date.parse('2026-11-07T06:00:00Z'),qa='995ed2bd-f8ad-4aa3-9f52-37b4bf67a04c';
const rows=[{ref:qa,ordem:'ORD123456789012',status:'pago',valor:'12.99',modo:'ligada',tipo:null,criado:'2026-11-06T15:06:39Z',pago:'2026-11-06T15:07:17Z',expira:'2026-11-13T15:07:17Z',access_generated:1},
 {ref:'promo:abc',ordem:'promo:abc',status:'pago',valor:'0',modo:'ligada',tipo:'promo',criado:'2026-11-03T15:00:00Z',pago:'2026-11-03T15:00:00Z',expira:null,access_generated:1},
 {ref:'test-order',ordem:'sim:1',status:'pago',valor:'25.99',modo:'simulacao',tipo:null,criado:'2026-11-02T15:00:00Z',pago:'2026-11-02T15:00:00Z',expira:null,access_generated:1}];
const db={prepare(sql){assert(sql.startsWith('SELECT '));assert(!/\b(email|codigo|token_hash)\b/.test(sql.replace(/CASE WHEN p.codigo IS NOT NULL AND p.codigo!='' THEN 1 ELSE 0 END access_generated/,'')));return {all:async()=>({results:rows})};}};
const env={DB:db,BTW_PROMOS_TOKEN:'x'.repeat(40),MP_TOKEN:'private-mp'};
const url='https://www.quiddo.com.br/api/btw/payments',headers={Authorization:'Bearer '+env.BTW_PROMOS_TOKEN};
const calls=[];
const fetcher=async(u,o)=>{calls.push(u);assert.equal(o.method,'GET');assert.equal(o.redirect,'manual');assert(!u.includes(env.MP_TOKEN));assert.equal(o.headers.Authorization,'Bearer '+env.MP_TOKEN);
 return Response.json(u.includes('/orders/')?{id:'ORD123456789012',external_reference:qa,total_amount:'12.99',total_paid_amount:'12.99',status:'processed',currency:'BRL',live_mode:true}:
 {paging:{total:1},results:[{id:123,external_reference:qa,currency_id:'BRL',live_mode:true,transaction_amount:12.99,status:'approved',date_approved:'2026-11-06T15:07:12Z',transaction_amount_refunded:0,transaction_details:{net_received_amount:12.98}}]});};
const response=await servicePayments(new Request(url,{headers}),env,fetcher,now);assert.equal(response.status,200);
const data=await response.json(),q=data.products.quiddo;
assert.equal(q.recorded_payments.orders,1);assert.equal(q.recorded_payments.gross_cents,1299);assert.equal(q.recorded_payments.by_classification.founder_qa.orders,1);
assert.equal(q.free_access.orders,1);assert.equal(q.technical.paid_orders,1);assert.equal(q.verified_payments.refunded_cents,0);assert.equal(q.verified_payments.fees_cents,null);
assert.equal(q.verified_payments.provider_net_received_cents,1298);assert.equal(q.daily_payments[0].date,'2026-11-06');
assert.equal(q.delivery.paid_access_generated,1);assert.equal(q.delivery.confirmed_deliveries,null);
assert(!JSON.stringify(data).includes(qa));assert(!JSON.stringify(data).includes('private-mp'));assert.equal(calls.length,2);
await servicePayments(new Request(url,{headers}),env,fetcher,now+1000);assert.equal(calls.length,2,'Source cache avoids repeated provider reads');
for(const [request,status] of [[new Request(url),401],[new Request(url,{headers:{...headers,Origin:'https://www.quiddo.com.br'}}),403],[new Request(url,{headers:{...headers,Cookie:'session=example'}}),403],[new Request(url,{method:'POST',headers}),405],[new Request(url+'?sql=anything',{headers}),400]])assert.equal((await servicePayments(request,env,fetcher,now)).status,status);
assert.throws(()=>parseMPPayment({external_reference:'other',currency_id:'BRL',live_mode:true,transaction_amount:12.99},{id:qa,amount:1299}),/IDENTITY_MISMATCH/);
const sport=aggregatePayments('sportdna',[{id:'x',amount:1999,mode:'live',free:false,provider:'mercadopago',state:'paid',recordedPaid:true,createdAt:'2026-11-06T15:00:00Z',confirmedAt:null,emailAttemptedAt:'2026-11-06T16:00:00Z',classification:'unclassified_production',reconciliation:{status:'order_verified',paid_cents:1999,paid_at:null}}],new Date(now).toISOString());
assert.equal(sport.daily_payments.length,0);assert.equal(sport.daily_local_confirmations.length,0);assert.equal(sport.verified_payments.without_exact_paid_at,1);assert.equal(sport.delivery.paid_report_email_attempts,1);assert.equal(sport.delivery.confirmed_deliveries,null);
const pendingFetcher=async(u)=>Response.json(u.includes('/orders/')?{id:'ORD123456789012',external_reference:qa,total_amount:'12.99',total_paid_amount:'12.99',status:'created',currency:'BRL',live_mode:true,transactions:{payments:[{status:'action_required'}]}}:{paging:{total:0},results:[]});
const pending=await (await servicePayments(new Request(url,{headers}),{...env},pendingFetcher,now+120000)).json();
assert.equal(pending.products.quiddo.verified_payments.orders,0,'Quoted total_paid_amount on a pending order must never count as a settled sale');
assert.equal(pending.products.quiddo.provider_checks[0].status,'order_not_settled');
console.log('Product payments: read-only authorization/SQL/provider calls, no identifiers in report, exact paid date, QA/free/test separation, missing fees, conservative delivery and cache passed.');

let rpcCalls=0;
const withRPC=await (await servicePayments(new Request(url,{headers}),{...env,SPORT_FINANCE:{async read(...args){assert.equal(args.length,0);rpcCalls++;return sport;}}},fetcher,now+180000)).json();
assert.equal(rpcCalls,1);assert.equal(withRPC.products.sportdna.verified_payments.gross_cents,1999);
const mismatch=await (await servicePayments(new Request(url,{headers}),{...env,SPORT_FINANCE:{async read(){return {status:'available',product:'Other'};}}},fetcher,now+240000)).json();
assert.equal(mismatch.products.sportdna.error_code,'INVALID_REPORT');
console.log('Private SPORT binding: fixed no-argument RPC and product identity validation passed.');
