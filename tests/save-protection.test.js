import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {IDBFactory,IDBObjectStore} from 'fake-indexeddb';
import {openGameStore,DB_NAME,STORAGE_KEY} from '../src/game-store.js';
import {createWorld,renameBird,SAVE_VERSION} from '../src/engine.js';
const NOW=1793869200000;
class Storage{data=new Map();fail=false;writes=0;getItem(k){return this.data.get(k)??null;}setItem(k,v){if(this.fail)throw new DOMException('full','QuotaExceededError');this.writes++;this.data.set(k,v);}removeItem(k){this.data.delete(k);}}
function locks(){let tail=Promise.resolve();return {request(_key,fn){const task=tail.then(fn);tail=task.catch(()=>{});return task;}};}
async function database(idb){return new Promise((resolve,reject)=>{const q=idb.open(DB_NAME,1);q.onupgradeneeded=()=>q.result.createObjectStore('world');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});}
async function record(db,value,key='current'){return new Promise((resolve,reject)=>{const tx=db.transaction('world',value===undefined?'readonly':'readwrite'),s=tx.objectStore('world'),q=value===undefined?s.get(key):s.put(value,key);tx.oncomplete=()=>resolve(q.result);tx.onerror=tx.onabort=()=>reject(tx.error);});}
for(const mode of ['device','locked-local','memory'])test(`snapshot is detached, read-only and closes safely: ${mode}`,async()=>{
 const storage=new Storage(),platform=mode==='device'?{indexedDB:new IDBFactory()}:mode==='locked-local'?{localStorage:storage,navigator:{locks:locks()}}:{};
 const store=await openGameStore(platform),w=createWorld(NOW);assert.equal(SAVE_VERSION,19);await store.transact(()=>w);const before=JSON.stringify(w),writes=storage.writes;
 const snapshot=JSON.parse(await store.exportSnapshot());assert.deepEqual(snapshot,w);snapshot.birds[0].name='not persisted';assert.equal(await store.exportSnapshot(),before);assert.equal(storage.writes,writes);assert.deepEqual(await store.transact(w=>w),w);assert.equal(await store.migrationBackup(19),null);await assert.rejects(store.migrationBackup(20),/対応/);store.close();await assert.rejects(store.exportSnapshot(),/閉じ/);
});
test('quota failure still exports the last committed IndexedDB world, never the rejected edit',async()=>{
 const idb=new IDBFactory(),store=await openGameStore({indexedDB:idb}),db=await database(idb),w=createWorld(NOW);await record(db,w);const put=IDBObjectStore.prototype.put;
 try{IDBObjectStore.prototype.put=function(){throw new DOMException('full','QuotaExceededError');};await assert.rejects(store.transact(w=>{renameBird(w,'b1','failed edit');return w;}));assert.equal(await store.exportSnapshot(),JSON.stringify(w));assert.deepEqual(await record(db),w);}finally{IDBObjectStore.prototype.put=put;store.close();db.close();}
});
test('locked-local quota failure exports exact original bytes and does not touch reset or migration copies',async()=>{
 const storage=new Storage(),w=createWorld(NOW),raw=JSON.stringify(w,null,2);storage.setItem(STORAGE_KEY,raw);storage.setItem(STORAGE_KEY+'-migration-v18','sentinel');const before=new Map(storage.data),store=await openGameStore({localStorage:storage,navigator:{locks:locks()}});storage.fail=true;
 await assert.rejects(store.transact(w=>{renameBird(w,'b1','failed');return w;}));assert.equal(await store.exportSnapshot(),raw);assert.deepEqual(storage.data,before);store.close();
});
test('legacy source export retains its raw version; future, malformed and absent saves fail without writes',async()=>{
 const legacy=JSON.parse(await readFile(new URL('./fixtures/v10-gacha-world.json',import.meta.url))),idb=new IDBFactory(),db=await database(idb),store=await openGameStore({indexedDB:idb});
 await assert.rejects(store.exportSnapshot(),/見つかりません/);
 await record(db,legacy);assert.deepEqual(JSON.parse(await store.exportSnapshot()),legacy);assert.equal(await record(db,undefined,'migration-backup-v11'),undefined);assert.deepEqual(await record(db),legacy);
 for(const bad of [{...createWorld(NOW),version:20},{...createWorld(NOW),seed:-1}]){await record(db,bad);await assert.rejects(store.exportSnapshot());assert.deepEqual(await record(db),bad);}
 store.close();db.close();
});
test('snapshot waits for a concurrent committed transaction and never rolls it back',async()=>{
 const idb=new IDBFactory(),a=await openGameStore({indexedDB:idb}),b=await openGameStore({indexedDB:idb});await a.transact(()=>createWorld(NOW));const change=a.transact(w=>{renameBird(w,'b1','newest');return w;});const read=b.exportSnapshot();assert.deepEqual(JSON.parse(await read),await change);a.close();b.close();
});
test('local envelope exports only its current original, preserves reset backup and rejects corruption',async()=>{
 const storage=new Storage(),w=createWorld(NOW),store=await openGameStore({localStorage:storage,navigator:{locks:locks()}});await store.transact(()=>w);await store.resetWorld(w.worldId);const raw=storage.getItem(STORAGE_KEY),parsed=JSON.parse(raw);assert.deepEqual(JSON.parse(await store.exportSnapshot()),parsed.current);assert.equal(storage.getItem(STORAGE_KEY),raw);assert.equal(await store.hasResetBackup(),true);
 storage.setItem(STORAGE_KEY,'{bad');const writes=storage.writes;await assert.rejects(store.exportSnapshot());assert.equal(storage.writes,writes);assert.equal(storage.getItem(STORAGE_KEY),'{bad');store.close();
});
test('aborted read transaction never reports a successful export and leaves the original intact',async()=>{
 const idb=new IDBFactory(),db=await database(idb),store=await openGameStore({indexedDB:idb}),w=createWorld(NOW);await record(db,w);const get=IDBObjectStore.prototype.get;
 try{IDBObjectStore.prototype.get=function(key){const q=get.call(this,key);if(key==='current'){const tx=this.transaction;q.addEventListener('success',()=>tx.abort(),{once:true});}return q;};await assert.rejects(store.exportSnapshot());}finally{IDBObjectStore.prototype.get=get;}
 assert.deepEqual(await record(db),w);assert.deepEqual(JSON.parse(await store.exportSnapshot()),w);store.close();db.close();
});
