import {performance} from 'node:perf_hooks';
import {mergeGeminiResponse,thinkingOptions} from './gemini-response.mjs';

const messages = {
  400:'Google afviste forespørgslen. Kontrollér API-nøgle og modelindstillinger.',
  401:'Google afviste godkendelsen. Kontrollér API-nøglen.',
  403:'Adgang afvist. Kontrollér nøglens begrænsninger, projektets API-adgang og region.',
  404:'Modellen eller API-endpointet blev ikke fundet.',
  429:'Google rapporterer kvote- eller ratebegrænsning. Kontrollér kvoten i Google AI Studio.',
  500:'Google rapporterer en intern fejl.',
  503:'Google rapporterer, at tjenesten er utilgængelig.',
  504:'Google rapporterer, at forespørgslen overskred sin tidsgrænse.'
};
export async function diagnose({apiKey=process.env.GEMINI_API_KEY,model=process.env.GEMINI_MODEL||'gemini-3.5-flash-lite',fetcher=fetch}={}) {
  const report={version:'diagnostics-2-stream',timestamp:new Date().toISOString(),model,steps:[]};
  if(!apiKey) return {...report,ok:false,conclusion:'GEMINI_API_KEY mangler på serveren.'};
  if(apiKey!==apiKey.trim()) return {...report,ok:false,conclusion:'API-nøglen har mellemrum eller linjeskift i starten/slutningen. Ret værdien i Render Environment.'};
  const headers={'x-goog-api-key':apiKey,'content-type':'application/json'};
  async function request(stage,url,options,timeout) {
    const start=performance.now();
    try {
      const response=await fetcher(url,{...options,headers,signal:AbortSignal.timeout(timeout)});
      const step={stage,http_status:response.status,ok:response.ok};
      // Do not expose provider messages, headers, URLs, credentials or stack traces.
      const data=await response.json().catch(()=>null);
      step.latency_ms=Math.round(performance.now()-start);
      if(!response.ok)step.explanation=messages[response.status]||'Google returnerede en HTTP-fejl.';
      report.steps.push(step);
      return response.ok ? data : null;
    } catch(error) {
      const code=error?.cause?.code || error?.code;
      const safeCodes=new Set(['ENOTFOUND','EAI_AGAIN','ECONNREFUSED','ECONNRESET','ENETUNREACH','ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT','CERT_HAS_EXPIRED','UNABLE_TO_VERIFY_LEAF_SIGNATURE']);
      report.steps.push({stage,ok:false,latency_ms:Math.round(performance.now()-start),error:error?.name==='TimeoutError'?'TIMEOUT':safeCodes.has(code)?code:'NETWORK_OR_RESPONSE_ERROR',explanation:error?.name==='TimeoutError'?'Intet fuldt svar inden tidsgrænsen. Dette beviser ikke, at gratis-kvoten er brugt.':'Forbindelsen eller læsning af svaret fejlede.'});
      return null;
    }
  }
  const list=await request('1. Google-forbindelse og modelliste','https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000',{method:'GET'},12000);
  if(!list) return {...report,ok:false,conclusion:'Modellisten kunne ikke hentes. Se første trin for HTTP-status eller forbindelsesfejl.'};
  if(!Array.isArray(list.models))return {...report,ok:false,conclusion:'Google returnerede ikke en gyldig modelliste.'};
  const eligible=list.models.filter(m=>m.supportedGenerationMethods?.includes('generateContent'));
  report.flash_models=eligible.map(m=>m.name?.replace(/^models\//,'')).filter(n=>typeof n==='string' && /^gemini-[a-z0-9.-]*flash[a-z0-9.-]*$/.test(n)).slice(0,25);
  report.configured_model_listed=eligible.some(m=>m.name===`models/${model}`);
  // Listing is not proof of generation quota. Test the configured model directly,
  // including aliases which need not appear in the returned list.
  const generationConfig={maxOutputTokens:256,...thinkingOptions(model)};
  const payload=await request('2. Kort streaming-kald uden politikdatabase',`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent`,{method:'POST',body:JSON.stringify({contents:[{role:'user',parts:[{text:'Reply with the single word OK.'}]}],generationConfig})},20000);
  if(!payload)return {...report,ok:false,conclusion:'Forbindelsen til modellisten virker, men tekstkaldet fejler. Se HTTP-status eller timeout i trin 2.'};
  let answer;try{answer=mergeGeminiResponse(payload);}catch{return {...report,ok:false,conclusion:'Google returnerede en fejl inde i streaming-svaret.'};}
  const hasText=Boolean(answer.candidates?.some(c=>c.content?.parts?.some(p=>!p.thought && typeof p.text==='string' && p.text.trim())));
  const u=answer.usageMetadata;
  report.tokens=u?{input:u.promptTokenCount??null,output:u.candidatesTokenCount??null,total:u.totalTokenCount??null}:null;
  return {...report,ok:hasText,conclusion:hasText?'Det korte Gemini-kald virker. Hvis policy-svar stadig fejler, ligger forskellen i prompt, kontekst, JSON-output eller belastning.':'Google svarede, men gav ingen synlig svartekst. Modeloutput eller tokenloft skal undersøges.'};
}

// One shared in-flight request and a one-minute cache avoid duplicate paid calls.
let cached=null,expires=0,pending=null;
export function cachedDiagnosis() {
  if(cached && Date.now()<expires)return Promise.resolve(cached);
  if(pending)return pending;
  pending=diagnose().then(result=>{cached=result;expires=Date.now()+60000;return result;}).finally(()=>{pending=null;});
  return pending;
}
