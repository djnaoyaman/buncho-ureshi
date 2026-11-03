import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { openGameStore, STORAGE_KEY, DB_NAME } from '../src/game-store.js';
import { createWorld, renameBird, advanceTo, TICK_MS } from '../src/engine.js';
const now=Date.UTC(2026,10,2,3);
class Storage {
 constructor(){this.data=new Map();this.writes=0;}
 getItem(k){return this.data.get(k)??null;}
 setItem(k,v){this.data.set(k,String(v));this.writes++;}
 removeItem(k){this.data.delete(k);}
}
function locks(){let tail=Promise.resolve();return {request(_name,fn){const task=tail.then(fn);tail=task.catch(()=>{});return task;}};}
const settle=()=>new Promise(r=>setTimeout(r,0));

test('IndexedDB transactions preserve forty simultaneous edits and advance one shared interval only once',async()=>{
 const indexedDB=new IDBFactory(),a=await openGameStore({indexedDB}),b=await openGameStore({indexedDB});
 const world=createWorld(now);renameBird(world,'b1','0');await a.transact(()=>world);
 await Promise.all(Array.from({length:40},(_,i)=>(i%2?a:b).transact(w=>{advanceTo(w,now+20*TICK_MS);renameBird(w,'b1',String(Number(w.birds[0].name)+1));return w;})));
 const result=await a.transact(w=>w);assert.equal(result.tick,20);assert.equal(result.birds[0].name,'40');assert.equal(new Set(result.events.map(e=>e.id)).size,result.events.length);a.close();b.close();
});

test('a rejected transactional result leaves the original IndexedDB world intact',async()=>{
 const store=await openGameStore({indexedDB:new IDBFactory()});const original=await store.transact(()=>createWorld(now));
 await assert.rejects(store.transact(w=>{w.birds[0].parents=['b1','b1'];w.revision++;return w;}));
 assert.deepEqual(await store.transact(w=>w),original);store.close();await assert.rejects(store.transact(w=>w),/閉じ/);
});

test('blocked IndexedDB does not silently open a different local world; late success is closed',async()=>{
 const storage=new Storage();let closed=0;const req={result:{close(){closed++;}}};
 const platform={indexedDB:{open(){queueMicrotask(()=>req.onblocked());return req;}},localStorage:storage,navigator:{locks:locks()}};
 await assert.rejects(openGameStore(platform),/別の庭には切り替えていません/);assert.equal(storage.writes,0);
 req.onsuccess();assert.equal(closed,1);
});

test('a newer incompatible database or synchronous open error is not replaced by fallback storage',async()=>{
 for(const kind of ['VersionError','SecurityError']){
  const storage=new Storage();const error=new Error(kind);error.name=kind;
  await assert.rejects(openGameStore({indexedDB:{open(){throw error;}},localStorage:storage,navigator:{locks:locks()}}),new RegExp(kind));assert.equal(storage.writes,0);
 }
});

test('a previously saved locked-local world remains the same backend after IndexedDB becomes available',async()=>{
 const storage=new Storage(),world=createWorld(now);renameBird(world,'b1','0');storage.setItem(STORAGE_KEY,JSON.stringify(world));let opens=0;const platform={indexedDB:{open(){opens++;throw Error('must not open');}},localStorage:storage,navigator:{locks:locks()}};
 const a=await openGameStore(platform),b=await openGameStore(platform);assert.equal(a.mode,'locked-local');assert.equal(opens,0);
 await Promise.all(Array.from({length:20},(_,i)=>(i%2?a:b).transact(w=>{renameBird(w,'b1',String(Number(w.birds[0].name)+1));return w;})));
 assert.equal((await a.transact(w=>w)).birds[0].name,'20');a.close();b.close();
});

test('corrupt fallback JSON and missing locks preserve existing bytes rather than starting anew',async()=>{
 const storage=new Storage();storage.setItem(STORAGE_KEY,'{ broken');const before=storage.writes;
 const store=await openGameStore({localStorage:storage,navigator:{locks:locks()}});await assert.rejects(store.transact(w=>w));assert.equal(storage.getItem(STORAGE_KEY),'{ broken');assert.equal(storage.writes,before);store.close();
 await assert.rejects(openGameStore({localStorage:storage}),/以前の保存/);assert.equal(storage.writes,before);
});

test('memory-only mode is explicit, transactional and closes safely',async()=>{
 const store=await openGameStore({});assert.equal(store.mode,'memory');const original=await store.transact(w=>w);
 await assert.rejects(store.transact(w=>{w.birds.length=0;return w;}));assert.deepEqual(await store.transact(w=>w),original);store.close();await assert.rejects(store.transact(w=>w),/閉じ/);
});
