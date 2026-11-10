import test from 'node:test';import assert from 'node:assert/strict';
import {parsePages,paidEntitlement,validateQuiz,costFromUsage,requestBody,textRequestBody,readBriefing} from '../worker/pdf-quiz/core.mjs';
import {fixture} from './fixtures.mjs';
test('page selection counts actual unique pages and rejects 51, out-of-range, and non-integers',()=>{
 assert.equal(parsePages('2-51',52).length,50);assert.deepEqual(parsePages('1,1,2-3',3),[1,2,3]);
 for(const p of ['1-51','0','5-4','1.5','53','1-9999999999',''])assert.throws(()=>parsePages(p,52));
});
test('paid monthly invoice only; denied annual, trial, pass, courtesy, unpaid, risk, mismatched owner, proration, stale and wrong price',()=>{
 const f=fixture();assert.ok(paidEntitlement({...f.billing,live:false},Date.now()).invoice);
 const mutations=[x=>x.subscription.items.data[0].price.recurring.interval='year',x=>x.subscription.status='trialing',x=>x.invoice.amount_paid=0,x=>x.invoice.status='open',x=>x.risk='refund',x=>x.customer='cus_wrong',x=>x.subscription.items.data[0].price.id='price_pass',x=>x.invoice.lines.data[0].parent.subscription_item_details.proration=true,x=>x.invoice.lines.data[0].period.start=1,x=>x.invoice.livemode=true,x=>x.invoice.lines.has_more=true,x=>x.subscription.items.data.push(x.subscription.items.data[0])];
 for(const mutate of mutations){const x=structuredClone(f.billing);mutate(x);assert.throws(()=>paidEntitlement({...x,live:false},Date.now()));}
});
test('reject inconsistent answer, duplicate options, evidence outside selection, duplicate questions and empty result',()=>{
 const q=fixture().quiz;assert.equal(validateQuiz(q,[2]).items[0].a[validateQuiz(q,[2]).items[0].c],q.questions[0].answer);
 const changes=[x=>x.questions[0].answer='inventado',x=>x.questions[0].options[1]=x.questions[0].options[0],x=>x.questions[0].page=1,x=>x.questions[0].evidence='',x=>x.questions.push(x.questions[0]),x=>x.questions=[]];
 for(const mutate of changes){const x=structuredClone(q);mutate(x);assert.throws(()=>validateQuiz(x,[2]));}
});
test('cost separates input/output/cache lifetimes and unknown usage',()=>{
 assert.equal(costFromUsage({input_tokens:1000,output_tokens:100}).usd,.00015);
 assert.equal(costFromUsage({input_tokens:12000,output_tokens:100,input_tokens_details:{cached_tokens:4000,cache_write_tokens:7000,cache_write_tokens_details:{ttl_30m_tokens:3000,ttl_12h_tokens:4000}}}).usd,.001565);
 assert.equal(costFromUsage({input_tokens:300000,output_tokens:100}).usd,.060075);
 assert.equal(costFromUsage({input_tokens:1000,output_tokens:100,input_tokens_details:{cache_write_tokens:500}}),null);
 assert.equal(costFromUsage({input_tokens:25006,output_tokens:875,input_tokens_details:{cache_write_tokens:25003,cached_tokens:0}},'gpt-6-luna','default','30m').usd,.003563175);
 assert.equal(costFromUsage({input_tokens:1000,output_tokens:100,input_tokens_details:{cache_write_tokens:500,cache_write_tokens_details:{ttl_30m_tokens:100,ttl_12h_tokens:100}}},'gpt-6-luna','default','30m'),null);
 assert.equal(costFromUsage(null),null);
});
test('structured generation constrains page and size; audit identifies invalid fields without changing rejection',()=>{
 const body=requestBody('data:application/pdf;base64,AA==',[2,4],{effort:'low',detail:'high'});
 assert.deepEqual(body.text.format.schema.properties.questions.items.properties.page.enum,[2,4]);
 assert.equal(body.prompt_cache_options.ttl,'30m');
 const q=structuredClone(fixture().quiz);q.questions[0].answer='not an option';
 assert.throws(()=>validateQuiz(q,[2]),e=>e.code==='invalid_result'&&e.fields.includes('questions.0.answer'));
});

test('briefing supports a short theme and text-only structured output without fabricated PDF evidence',async()=>{
 const make=(body,contentType='text/plain')=>new Request('https://stage.example/api/pdf/generate-text',{method:'POST',headers:{'content-type':contentType},body});
 const briefing=await readBriefing(make('  Encontro de família  '));
 assert.equal(briefing,'Encontro de família');
 await assert.rejects(readBriefing(make('  ')),{code:'briefing'});
 await assert.rejects(readBriefing(make('x'.repeat(4001))),{code:'size'});
 await assert.rejects(readBriefing(make('😀'.repeat(8000))),{code:'size'});
 await assert.rejects(readBriefing(make('quiz','application/pdf')),{code:'format'});
 const body=textRequestBody(briefing);
 assert.deepEqual(body.input[0].content,[{type:'input_text',text:briefing}]);
 assert.equal(body.store,false);
 const schema=body.text.format.schema.properties.questions.items;
 assert.equal(schema.properties.page,undefined);
 assert.equal(schema.properties.evidence,undefined);
 const quiz=fixture().quiz;
 delete quiz.questions[0].page;
 delete quiz.questions[0].evidence;
 const {items:[question]}=validateQuiz(quiz);
 assert.equal(question.page,undefined);
 assert.equal(question.evidence,undefined);
 assert.equal(question.a[question.c],quiz.questions[0].answer);
 assert.throws(()=>validateQuiz(quiz,[2]),{code:'invalid_result'});
});
