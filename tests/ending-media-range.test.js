import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
test('local media server honors ranges, suffix, invalid ranges and HEAD without changing bytes',async t=>{
 const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
 t.after(()=>server.kill());
 const url=await new Promise((resolve,reject)=>{server.stdout.once('data',b=>resolve(b.toString().trim()));server.once('error',reject);server.once('exit',c=>reject(Error('server exited '+c)));});
 const path='game-endings/omochi-ending02-revised-87.mp4',bytes=await readFile('dist/'+path);
 for(const [range,start,end] of [['bytes=0-31',0,31],['bytes=-16',bytes.length-16,bytes.length-1],['bytes=16618430-',16618430,bytes.length-1]]){
  const r=await fetch(url+path,{headers:{Range:range}});assert.equal(r.status,206);assert.equal(r.headers.get('content-range'),`bytes ${start}-${end}/${bytes.length}`);assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes.subarray(start,end+1));
 }
 for(const range of ['bytes=999999999-','bytes=3-1','bytes=-0','bytes=0-1,3-4'])assert.equal((await fetch(url+path,{headers:{Range:range}})).status,416);
 const head=await fetch(url+path,{method:'HEAD'});assert.equal(head.status,200);assert.equal(Number(head.headers.get('content-length')),bytes.length);assert.equal((await head.arrayBuffer()).byteLength,0);
});
