import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {compare,policies} from './core.mjs';
let active = 0;
const files = {'/':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8']};
export const server = http.createServer(async (req,res) => {
  const send = (status,data) => {res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  try {
    const path = new URL(req.url,'http://localhost').pathname;
    if (req.method==='GET' && path==='/api/health') return send(200,{ok:true,policies:policies.length,gemini_configured:Boolean(process.env.GEMINI_API_KEY)});
    if (req.method==='GET' && path==='/api/policies') return send(200,policies);
    if (req.method==='POST' && path==='/api/compare') {
      if (active>=3) return send(429,{error:'The service is busy. Please try again shortly.'});
      let body=''; for await (const chunk of req) {body+=chunk; if (body.length>8192) return send(413,{error:'Request too large.'});}
      let input; try {input=JSON.parse(body);} catch {return send(400,{error:'Invalid JSON.'});}
      if (typeof input.question!=='string' || !input.question.trim() || input.question.length>600) return send(400,{error:'Enter a question of 1–600 characters.'});
      active++; try {return send(200,{question:input.question.trim(),results:await compare(input.question.trim()),timestamp:new Date().toISOString()});} finally {active--;}
    }
    if(req.method==='GET' && files[path]) {const [name,type]=files[path];res.writeHead(200,{'Content-Type':type}); return res.end(await readFile(new URL(`./public/${name}`,import.meta.url)));}
    send(404,{error:'Not found.'});
  } catch {if(!res.headersSent) send(500,{error:'The request could not be completed.'});else res.end();}
});
server.requestTimeout=60000;
if(process.env.NODE_ENV!=='test') server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Policy Assistant is running.'));
