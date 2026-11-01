import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
test('HTTP routes, offline comparison, validation and browser script syntax',async()=>{
  process.env.NODE_ENV='test';
  const oldKey=process.env.GEMINI_API_KEY;delete process.env.GEMINI_API_KEY;
  const {server}=await import('./server.mjs');
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try {
    for(const route of ['/','/style.css','/app.js','/api/health','/api/policies']) assert.equal((await fetch(base+route)).status,200,route);
    const response=await fetch(base+'/api/compare',{method:'POST',body:JSON.stringify({question:'How many vacation days do employees receive?'})});
    assert.equal(response.status,200);const data=await response.json();assert.equal(data.results.length,3);assert.match(data.results[0].answer,/15 vacation days/);assert.ok(data.results[1].error);assert.ok(data.results[2].error);
    assert.equal((await fetch(base+'/api/compare',{method:'POST',body:'bad json'})).status,400);
    assert.equal((await fetch(base+'/api/compare',{method:'POST',body:JSON.stringify({question:'x'.repeat(601)})})).status,400);
    assert.equal((await fetch(base+'/missing')).status,404);
    new vm.Script(await readFile(new URL('./public/app.js',import.meta.url),'utf8'));
  } finally {await new Promise(resolve=>server.close(resolve));if(oldKey!==undefined)process.env.GEMINI_API_KEY=oldKey;}
});
