import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
test('one unchanged real Omochi photo and three distinct original art backgrounds retain recorded provenance',async()=>{
 const records=JSON.parse(await readFile(new URL('docs/REFINEMENT-ASSETS.json',root),'utf8'));assert.equal(records.length,4);const hashes=new Set();
 for(const r of records){const bytes=await readFile(new URL('public/'+r.path,root));const hash=createHash('sha256').update(bytes).digest('hex');assert.equal(hash,r.sha256);hashes.add(hash);assert(r.provenance&&r.modifications);}
 assert.equal(hashes.size,4);
 const home=await readFile(new URL('src/home.js',root),'utf8'),app=await readFile(new URL('src/app.js',root),'utf8');assert(home.includes('omochi/omochi-original.jpeg'));assert(app.includes('omochi/omochi-original.jpeg'));assert(!home.includes('おもち本人ではありません'));assert(app.includes('ゲームの出来事とは別の記録'));
});
