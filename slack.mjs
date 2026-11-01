import bolt from '@slack/bolt';
import {llm} from './core.mjs';
if(!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_APP_TOKEN || !process.env.GEMINI_API_KEY) throw new Error('Set SLACK_BOT_TOKEN, SLACK_APP_TOKEN and GEMINI_API_KEY.');
const app = new bolt.App({token:process.env.SLACK_BOT_TOKEN,appToken:process.env.SLACK_APP_TOKEN,socketMode:true});
const escape = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
app.event('app_mention',async ({event,say})=>{
  const question=event.text.replace(/<@[A-Z0-9]+>/g,'').trim();
  if(!question || question.length>600) return say({text:'Mention me with a policy question (up to 600 characters).',thread_ts:event.ts});
  try {
    const r=await llm(question,true);
    const text=r.error || `${r.answer}\n\nRelevant policies: ${r.policies.map(p=>`${p.id} — ${p.title} (${p.department})`).join('; ') || 'None'}\n${r.evidence.map(e=>`[${e.policy_id}] “${e.quote}”`).join('\n')}\nEvidence: ${r.support}`;
    await say({text:escape(text),thread_ts:event.ts,unfurl_links:false,unfurl_media:false});
  } catch {await say({text:'The policy service is unavailable. Please retry shortly.',thread_ts:event.ts});}
});
await app.start(); console.log('Policy bot connected through Socket Mode.');
