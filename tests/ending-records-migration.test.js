import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {IDBFactory,IDBObjectStore} from 'fake-indexeddb';
import {readCompatibleWorld,validateWorld} from '../src/engine.js';
import {validateWorld as validateOld,readCompatibleWorld as readOld} from './fixtures/engine-v19.js';
import {openGameStore as openOld} from './fixtures/game-store-v19.js';
import {openGameStore,DB_NAME,STORAGE_KEY} from '../src/game-store.js';
import {recordCollectionEndingPlayback,claimCollectionEnding} from '../src/collection-endings.js';
const source=JSON.parse(await readFile(new URL('./fixtures/v19-before-ending-records.json',import.meta.url)));
const migrated=()=>readCompatibleWorld(source);
const expected=structuredClone(source);expected.version=22;for(const b of [...expected.birds,...expected.archive])b.foodGrowth={bonusTicks:0,lastBonusAt:null,lastFood:null};expected.collectionEndings.version=2;for(const e of expected.collectionEndings.entries)e.playback=e.acknowledged?'legacy':'pending';
class Storage{data=new Map();fail=null;getItem(k){return this.data.get(k)??null;}setItem(k,v){if(k===this.fail)throw new DOMException('full','QuotaExceededError');this.data.set(k,v);}removeItem(k){this.data.delete(k);}}
function locks(){let tail=Promise.resolve();return {request(_key,fn){const next=tail.then(fn);tail=next.catch(()=>{});return next;}};}
async function database(idb){return new Promise((resolve,reject)=>{const q=idb.open(DB_NAME,1);q.onupgradeneeded=()=>q.result.createObjectStore('world');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});}
async function record(db,value,key='current'){return new Promise((resolve,reject)=>{const tx=db.transaction('world',value===undefined?'readonly':'readwrite'),s=tx.objectStore('world'),q=value===undefined?s.get(key):s.put(value,key);tx.oncomplete=()=>resolve(q.result);tx.onerror=tx.onabort=()=>reject(tx.error);});}
test('v19 migration changes only format and playback provenance, never time, identity, revision or RNG',()=>{
 const before=JSON.stringify(source);validateOld(source);
 for(const now of [0,source.lastUpdated-1,source.lastUpdated+365*86400000])assert.deepEqual(readCompatibleWorld(source,now),expected);
 assert.equal(JSON.stringify(source),before);assert.deepEqual(migrated().collectionEndings.entries.map(e=>e.playback),['legacy','pending','pending']);validateWorld(expected);assert.throws(()=>readOld(expected));
});
test('v20 rejects invented or inconsistent playback and v19 rejects new fields',()=>{
 for(const state of ['seen','completed',undefined]){const w=migrated();w.collectionEndings.entries[1].playback=state;assert.throws(()=>validateWorld(w));}
 const old=structuredClone(source);old.collectionEndings.entries[0].playback='legacy';assert.throws(()=>readCompatibleWorld(old));
});
test('two tabs migrate once, keep exact raw v19 and reject a genuine old client before its callback',async()=>{
 const idb=new IDBFactory(),db=await database(idb);await record(db,source);
 const a=await openGameStore({indexedDB:idb}),b=await openGameStore({indexedDB:idb}),old=await openOld({indexedDB:idb});
 try{const values=await Promise.all([a.transact(w=>w),b.transact(w=>w)]);for(const w of values)assert.deepEqual(w,expected);assert.deepEqual(await a.migrationBackup(19),source);
 let called=false;await assert.rejects(old.transact(w=>{called=true;return w;}));assert.equal(called,false);assert.deepEqual(await record(db),expected);
 await a.transact(w=>{recordCollectionEndingPlayback(w,'garden','replay','completed');return w;});assert.deepEqual(await b.migrationBackup(19),source);
 }finally{a.close();b.close();old.close();db.close();}
});
test('aborted migration atomically retains v19 and leaves no partial backup, then retries',async()=>{
 const idb=new IDBFactory(),db=await database(idb);await record(db,source);const store=await openGameStore({indexedDB:idb}),put=IDBObjectStore.prototype.put;
 try{IDBObjectStore.prototype.put=function(value,key){const q=put.call(this,value,key);if(key==='migration-backup-v19'){const tx=this.transaction;q.addEventListener('success',()=>tx.abort(),{once:true});}return q;};await assert.rejects(store.transact(w=>w));}finally{IDBObjectStore.prototype.put=put;}
 assert.deepEqual(await record(db),source);assert.equal(await store.migrationBackup(19),null);assert.deepEqual(await store.transact(w=>w),expected);assert.deepEqual(await store.migrationBackup(19),source);store.close();db.close();
});
for(const failure of ['backup','current'])test(`locked fallback ${failure} quota never overwrites original and retries safely`,async()=>{
 const storage=new Storage(),raw=JSON.stringify(source,null,2),backup=STORAGE_KEY+'-migration-v19';storage.setItem(STORAGE_KEY,raw);const store=await openGameStore({localStorage:storage,navigator:{locks:locks()}});storage.fail=failure==='backup'?backup:STORAGE_KEY;
 await assert.rejects(store.transact(w=>w));assert.equal(storage.getItem(STORAGE_KEY),raw);assert.equal(await store.exportSnapshot(),raw);if(failure==='backup')assert.equal(storage.getItem(backup),null);else assert.equal(storage.getItem(backup),raw);
 storage.fail=null;assert.deepEqual(await store.transact(w=>w),expected);assert.deepEqual(await store.migrationBackup(19),source);assert.equal(storage.getItem(backup),raw);store.close();
});
test('playback records are owner guarded, idempotent and completion cannot regress; no rewards or history change',()=>{
 const w=migrated(),original=structuredClone(w);assert.equal(recordCollectionEndingPlayback(w,'crows','other','completed').changed,false);
 assert.equal(recordCollectionEndingPlayback(w,'crows','prior-tab','deferred').changed,true);assert.equal(w.collectionEndings.entries[1].playback,'deferred');assert.equal(recordCollectionEndingPlayback(w,'crows','replay','started').changed,true);const rev=w.revision;assert.equal(recordCollectionEndingPlayback(w,'crows','replay','started').changed,false);assert.equal(w.revision,rev);
 assert.equal(recordCollectionEndingPlayback(w,'crows','replay','completed').changed,true);for(const state of ['deferred','started'])assert.equal(recordCollectionEndingPlayback(w,'crows','other',state).changed,false);
 assert.equal(claimCollectionEnding(w,'raptors','mine',source.lastUpdated).changed,true);assert.equal(recordCollectionEndingPlayback(w,'raptors','mine','deferred').changed,true);
 w.collectionEndings=original.collectionEndings;w.revision=original.revision;assert.deepEqual(w,original);
});
test('synchronous quota while writing IndexedDB migration backup aborts current write and permits retry',async()=>{
 const idb=new IDBFactory(),db=await database(idb);await record(db,source);const store=await openGameStore({indexedDB:idb}),put=IDBObjectStore.prototype.put;
 try{IDBObjectStore.prototype.put=function(value,key){if(key==='migration-backup-v19')throw new DOMException('full','QuotaExceededError');return put.call(this,value,key);};await assert.rejects(store.transact(w=>w));}finally{IDBObjectStore.prototype.put=put;}
 assert.deepEqual(await record(db),source);assert.equal(await store.migrationBackup(19),null);assert.deepEqual(await store.transact(w=>w),expected);assert.deepEqual(await store.migrationBackup(19),source);store.close();db.close();
});
