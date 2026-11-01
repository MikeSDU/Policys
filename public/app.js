const $ = s => document.querySelector(s);
const names = {rules:'Rules-based search',full:'Gemini · no index',vector:'Gemini · vector index'};
let run=null, records=[];
const escape = x => String(x ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = x => x == null ? 'N/A' : x.toLocaleString();
function render(r,i) {
  if(r.error) return `<article><div class="number">0${i+1} / ${escape(r.method.toUpperCase())}</div><h2>${names[r.method]}</h2><p class="error">${escape(r.error)}</p></article>`;
  return `<article><div class="number">0${i+1} / ${r.method==='vector'?'TF-IDF + COSINE':r.method==='full'?'ALL 98 POLICIES':'KEYWORD OVERLAP'}</div><h2>${names[r.method]}</h2><div class="answer">${escape(r.answer)}</div><div class="metrics"><div class="metric"><strong>${num(r.latency_ms)}<small> ms</small></strong><small>RESPONSE TIME</small></div><div class="metric"><strong>${num(r.tokens.total)}</strong><small>TOTAL TOKENS</small></div></div><p class="token-detail">Input ${num(r.tokens.input)} · Output ${num(r.tokens.output)} · Thinking ${num(r.tokens.thinking)}<br>${r.context_count} policies ${r.method==='rules'?'searched':'in context'}${r.model?' · '+escape(r.model):''}</p><div class="support">${escape(r.support)}</div>${r.policies.map(p=>`<div class="policy"><b>${escape(p.id)} · ${escape(p.title)}</b><small>${escape(p.department)} / ${escape(p.category)}</small><br>${escape(p.policy_text)}</div>`).join('')}${r.evidence.map(e=>`<div class="quote">${escape(e.policy_id)}: “${escape(e.quote)}”</div>`).join('')}<label class="review">Your assessment of this answer<select data-review="${r.method}"><option value="unreviewed">Not reviewed</option><option value="supported">Supported and relevant</option><option value="unsupported">Unsupported or irrelevant</option><option value="abstained">Appropriate abstention</option><option value="missed">Incorrect abstention / missed policy</option></select></label></article>`;
}
$('#form').addEventListener('submit',async e=>{
  e.preventDefault(); const question=$('#question').value.trim(); if(!question)return;
  $('#submit').disabled=true;$('#download').disabled=true;$('#status').textContent='Comparing all three methods… Gemini may take up to 45 seconds.';
  try {const response=await fetch('/api/compare',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question})}); const data=await response.json();if(!response.ok)throw new Error(data.error);run=data;$('#results').innerHTML=data.results.map(render).join('');$('#download').disabled=false;$('#status').textContent='Comparison complete. Review the original text before marking each answer.';}
  catch(err){$('#status').textContent=err.message;}
  finally{$('#submit').disabled=false;}
});
document.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click',()=>{$('#question').value=b.dataset.q;$('#question').focus();}));
$('#results').addEventListener('change',e=>{if(e.target.dataset.review && run){run.reviews??={};run.reviews[e.target.dataset.review]=e.target.value;}});
$('#download').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(run,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='policy-comparison.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
function showPolicies(){const query=$('#filter').value.toLowerCase();$('#policies').innerHTML=records.filter(p=>Object.values(p).join(' ').toLowerCase().includes(query)).map(p=>`<div class="policy"><b>${escape(p.id)} · ${escape(p.title)}</b><small>${escape(p.department)} / ${escape(p.category)}</small><br>${escape(p.policy_text)}</div>`).join('');}
$('#filter').addEventListener('input',showPolicies);
fetch('/api/policies').then(r=>r.json()).then(p=>{records=p;showPolicies();}).catch(()=>{$('#policies').textContent='Could not load policies.';});
fetch('/api/health').then(r=>r.json()).then(s=>{$('#status').textContent=s.gemini_configured?`${s.policies} policies loaded · Gemini ready`:`${s.policies} policies loaded · Rules ready. Set GEMINI_API_KEY in Render to enable Gemini.`;}).catch(()=>{$('#status').textContent='Could not connect to the service.';});
