import {test} from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,rm,symlink,readFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {createServer} from 'node:http';import {execFileSync,spawnSync} from 'node:child_process';
import {verifyPages,publicFileURL} from '../scripts/verify-pages-live.mjs';
async function fixture(t,handler,files={'index.html':'abc'}){
 const root=await mkdtemp(join(tmpdir(),'pages-verify-'));t.after(()=>rm(root,{recursive:true,force:true}));
 for(const [name,data]of Object.entries(files)){await mkdir(join(root,name,'..'),{recursive:true});await writeFile(join(root,name),data);}
 const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));
 return {root,fetchImpl:(url,options)=>{
 assert.equal(url.origin,'https://djnaoyaman.github.io');assert.ok(url.pathname.startsWith('/buncho-ureshi/'));assert.equal(url.search,'');
 return fetch(`http://127.0.0.1:${server.address().port}/site/`+url.pathname.slice('/buncho-ureshi/'.length),options);
 }};
}
test('all files including zero bytes, nested Unicode names and binary must match',async t=>{
 const files={'index.html':'abc','.nojekyll':'','音 源/庭.wav':Buffer.from([0,255,7,1])};const requested=[];
 const f=await fixture(t,(q,s)=>{const name=decodeURIComponent(q.url.slice(6));requested.push(name);s.end(files[name]);},files);
 const r=await verifyPages(f);assert.equal(r.passed,true);assert.equal(r.matched,3);assert.deepEqual(requested.sort(),Object.keys(files).sort());
});
for(const [name,status,body,key]of [['same length stale file',200,'old','hashMismatch'],['truncated file',200,'ab','sizeMismatch'],['oversized response',200,'abcd','sizeMismatch'],['missing file',404,'abc','httpFailed'],['unavailable service',503,'abc','httpFailed']])test(name,async t=>{
 let requests=0;const f=await fixture(t,(_,s)=>{requests++;s.writeHead(status);s.end(body);});const r=await verifyPages(f);assert.equal(r.passed,false);assert.equal(r[key],1);assert.equal(requests,1);
});
test('redirect is not followed even to another local endpoint',async t=>{
 let requests=0;const f=await fixture(t,(_,s)=>{requests++;s.writeHead(302,{Location:'/other'});s.end();});const r=await verifyPages(f);assert.equal(r.networkFailed,1);assert.equal(requests,1);
});
test('stalled body times out and cannot pass a partial response',async t=>{
 const f=await fixture(t,(_,s)=>{s.writeHead(200);s.write('a');});const r=await verifyPages({...f,timeoutMs:60});assert.equal(r.passed,false);assert.equal(r.networkFailed,1);
});
test('mixed success still fails the whole comparison',async t=>{
 const f=await fixture(t,(q,s)=>s.end(q.url.endsWith('a')?'ok':'no'),{a:'ok',b:'ok'});const r=await verifyPages(f);assert.equal(r.expected,2);assert.equal(r.matched,1);assert.equal(r.hashMismatch,1);assert.equal(r.passed,false);
});
test('empty inventory and symlink are refused',async t=>{
 const f=await fixture(t,(_,s)=>s.end(),{});await assert.rejects(verifyPages(f),/empty_inventory/);await symlink('/etc/passwd',join(f.root,'link'));await assert.rejects(verifyPages(f),/invalid_inventory/);
});
test('concurrent requests remain bounded',async t=>{
 let active=0,peak=0;const f=await fixture(t,(_,s)=>{active++;peak=Math.max(peak,active);setTimeout(()=>{active--;s.end('x');},20);},Object.fromEntries(Array.from({length:9},(_,i)=>['f'+i,'x'])));
 assert.equal((await verifyPages({...f,concurrency:3})).passed,true);assert.equal(peak,3);
});

test('public target cannot escape the fixed deployment path',()=>{
 for(const name of ['../private','/other','a/../b','a\\b','//other/x','a//b'])assert.throws(()=>publicFileURL(name),/invalid_path/);
 for(const name of ['index.html','a?#.js','%2e%2e/x','音 源/庭.wav','.nojekyll']){
  const u=publicFileURL(name);assert.equal(u.origin,'https://djnaoyaman.github.io');assert.ok(u.pathname.startsWith('/buncho-ureshi/'));assert.equal(u.search,'');assert.equal(u.hash,'');
 }
});
