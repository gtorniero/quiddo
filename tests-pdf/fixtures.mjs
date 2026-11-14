import {MONTHLY_PRICE} from '../worker/pdf-quiz/core.mjs';
import {PRECOS,centavos} from '../shared/precos.mjs';
const MENSAL_CENTAVOS=centavos(PRECOS.mensal);
export function fixture(overrides={}) {
  const now=Date.now(),start=Math.floor(now/1000)-3600,end=start+30*86400;
  const customer='cus_stage_owner',sub='sub_stage_monthly';
  return {providerMode:'mock',billing:{customer,risk:'',subscription:{id:sub,livemode:false,customer,status:'active',items:{data:[{quantity:1,current_period_start:start,current_period_end:end,price:{id:MONTHLY_PRICE,livemode:false,currency:'brl',unit_amount:MENSAL_CENTAVOS,recurring:{interval:'month',interval_count:1,usage_type:'licensed'}}}]}},invoice:{id:'in_stage_paid',livemode:false,customer,status:'paid',currency:'brl',amount_paid:MENSAL_CENTAVOS,parent:{subscription_details:{subscription:sub}},lines:{has_more:false,data:[{quantity:1,amount:MENSAL_CENTAVOS,period:{start,end},pricing:{price_details:{price:MONTHLY_PRICE}},parent:{subscription_item_details:{subscription:sub,proration:false}}}]}}},quiz:{title:'Quiz de teste do servidor',questions:[{question:'Qual é a proposta principal da Vento?',options:['Uma fila compartilhada de pedidos','Uma fila independente por pessoa','Substituir todos os atendentes','Excluir os canais de venda'],answer:'Uma fila compartilhada de pedidos',page:2,evidence:'A Vento reúne pedidos de todas as lojas e canais em uma única fila.',topic:'Proposta de valor'}]},...overrides};
}
export function renew(s) {
  const f=structuredClone(s);const old=f.billing.subscription.items.data[0],start=old.current_period_end,end=start+30*86400;
  old.current_period_start=start;old.current_period_end=end;f.billing.invoice.id='in_stage_next';f.billing.invoice.lines.data[0].period={start,end};f.now=start*1000+1000;return f;
}
