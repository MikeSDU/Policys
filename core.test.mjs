import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCsv,policies,rules,retrieve,llm} from './core.mjs';
test('CSV handles quoted commas, escaped quotes and line breaks',()=>{
  const p=parseCsv('title,department,policy_text,category\r\n"A, B",IT,"Say ""hello""\nand stop",Test\r\n');
  assert.equal(p[0].title,'A, B'); assert.equal(p[0].policy_text,'Say "hello"\nand stop');
});
test('all 98 source policies load with stable unique IDs',()=>{assert.equal(policies.length,98);assert.equal(new Set(policies.map(p=>p.id)).size,98);});
test('rules quote the vacation policy without generating text',()=>{const r=rules('How many vacation days do employees receive?');assert.equal(r.policies[0].title,'Vacation Policy');assert.equal(r.answer,r.policies[0].policy_text);assert.equal(r.tokens.total,0);});
test('vector search retrieves work abroad and does not invent results for unknown terms',()=>{assert.equal(retrieve('Can employees work abroad?')[0].title,'Work From Abroad Policy');assert.deepEqual(retrieve('zzzzz'),[]);});
const mock = (answer, capture) => async (url,options)=>{if(capture)capture(JSON.parse(options.body));return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(answer)}]}}],usageMetadata:{promptTokenCount:100,candidatesTokenCount:20,totalTokenCount:130,thoughtsTokenCount:10}})};};
test('full context sends 98 records and preserves API token counts',async()=>{let prompt;const p=policies[0];const r=await llm('performance review',false,{apiKey:'test',fetcher:mock({answer:p.policy_text,abstain:false,evidence:[{policy_id:p.id,quote:p.policy_text}]},x=>prompt=x)});assert.equal(JSON.parse(prompt.contents[0].parts[0].text).policies.length,98);assert.equal(r.tokens.total,130);assert.match(r.support,/Quotes verified/);});
test('vector mode restricts context and flags fabricated quotations',async()=>{const r=await llm('vacation days',true,{apiKey:'test',fetcher:mock({answer:'You receive 999 days.',abstain:false,evidence:[{policy_id:'P095',quote:'999 days'}]})});assert.ok(r.context_count<=5);assert.match(r.support,/Unsupported/);});
test('missing key is explicit and does not fabricate a model answer',async()=>{const r=await llm('vacation',true,{apiKey:''});assert.ok(r.error);assert.equal(r.answer,undefined);});
test('upstream API failure is actionable and does not leak provider response',async()=>{await assert.rejects(llm('vacation',true,{apiKey:'test',fetcher:async()=>({ok:false,status:429})}),/HTTP 429/);});
