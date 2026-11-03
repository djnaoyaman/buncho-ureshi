import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { openGameStore, STORAGE_KEY } from '../src/game-store.js';
import { createWorld, renameBird } from '../src/engine.js';
class Storage {constructor(){this.data=new Map();this.fail=false;}getItem(k){return this.data.get(k)??null;}setItem(k,v){if(this.fail)throw Error('QuotaExceededError');this.data.set(k,String(v));}removeItem(k){this.data.delete(k);}}
function locks(){let tail=Promise.resolve();return {request(_name,fn){const task=tail.then(fn);tail=task.catch(()=>{});return task;}};}
function fixture(){const w=createWorld(1793617200000);renameBird(w,'b1','以前のおもち');w.settings.careSound=false;return w;}
for(const mode of ['idb','local','memory'])test(`${mode}: reset and restore preserve settings, change identity and consume backup`,async()=>{
 const storage=new Storage();storage.setItem('buncho.owner-name.v1','飼い主');storage.setItem('observation-note','残す');
 const platform=mode==='idb'?{indexedDB:new IDBFactory(),localStorage:storage}:mode==='local'?{localStorage:storage,navigator:{locks:locks()}}:{};
 const s=await openGameStore(platform),original=await s.transact(()=>fixture());assert.equal(await s.hasResetBackup(),false);
 await assert.rejects(s.resetWorld('wrong-id'));assert.deepEqual(await s.transact(w=>w),original);
 const fresh=await s.resetWorld(original.worldId);assert.equal(fresh.birds.length,1);assert.equal(fresh.birds[0].name,'おもち');assert.equal(fresh.tick,0);assert.notEqual(fresh.worldId,original.worldId);assert.deepEqual(fresh.settings,original.settings);assert(await s.hasResetBackup());
 await assert.rejects(s.resetWorld(original.worldId));await assert.rejects(s.restoreResetBackup(original.worldId));
 await s.transact(w=>{w.settings.careSound=true;w.revision++;return w;});const restored=await s.restoreResetBackup(fresh.worldId);
 assert.notEqual(restored.worldId,original.worldId);assert.notEqual(restored.worldId,fresh.worldId);assert.equal(await s.hasResetBackup(),false);
 const expected=structuredClone(original);expected.worldId=restored.worldId;expected.settings.careSound=true;assert.deepEqual(restored,expected);
 await assert.rejects(s.restoreResetBackup(restored.worldId));assert.equal(storage.getItem('buncho.owner-name.v1'),'飼い主');assert.equal(storage.getItem('observation-note'),'残す');
 const again=await s.resetWorld(restored.worldId);assert.notEqual(again.worldId,fresh.worldId);assert(await s.hasResetBackup());
 s.close();await assert.rejects(s.resetWorld(again.worldId),/閉じ/);await assert.rejects(s.restoreResetBackup(again.worldId),/閉じ/);await assert.rejects(s.hasResetBackup(),/閉じ/);
});
for(const mode of ['idb','local'])test(`${mode}: simultaneous resets reject stale identity and persist backup across reload`,async()=>{
 const platform=mode==='idb'?{indexedDB:new IDBFactory()}:{localStorage:new Storage(),navigator:{locks:locks()}};
 const a=await openGameStore(platform),b=await openGameStore(platform),old=await a.transact(()=>fixture());
 const outcomes=await Promise.allSettled([a.resetWorld(old.worldId),b.resetWorld(old.worldId)]);assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal(outcomes.filter(r=>r.status==='rejected').length,1);
 const fresh=await b.transact(w=>w);await assert.rejects(b.transact(w=>{if(w.worldId!==old.worldId)throw Error('stale');renameBird(w,'b1','古いタブ');return w;}),/stale/);
 assert.equal((await a.transact(w=>w)).birds[0].name,'おもち');assert(await a.hasResetBackup());a.close();b.close();
 const reopened=await openGameStore(platform);assert(await reopened.hasResetBackup());assert.equal((await reopened.transact(w=>w)).worldId,fresh.worldId);reopened.close();
});
test('local quota failure leaves current and backup in the original single-key bytes',async()=>{
 const storage=new Storage(),s=await openGameStore({localStorage:storage,navigator:{locks:locks()}}),old=await s.transact(()=>fixture()),raw=storage.getItem(STORAGE_KEY);storage.fail=true;
 await assert.rejects(s.resetWorld(old.worldId),/Quota/);assert.equal(storage.getItem(STORAGE_KEY),raw);assert.equal(await s.hasResetBackup(),false);
 storage.fail=false;const fresh=await s.resetWorld(old.worldId),encoded=storage.getItem(STORAGE_KEY);assert.equal(JSON.parse(encoded).current.worldId,fresh.worldId);assert.deepEqual(JSON.parse(encoded).backup,old);
 storage.fail=true;await assert.rejects(s.restoreResetBackup(fresh.worldId),/Quota/);assert.equal(storage.getItem(STORAGE_KEY),encoded);assert(await s.hasResetBackup());s.close();
});
test('IndexedDB second put failure aborts both backup and current writes',async()=>{
 const s=await openGameStore({indexedDB:new IDBFactory()}),old=await s.transact(()=>fixture());const originalPut=IDBObjectStore.prototype.put;let writes=0;
 IDBObjectStore.prototype.put=function(...args){if(++writes===2)throw Error('fixture put failure');return originalPut.apply(this,args);};
 try{await assert.rejects(s.resetWorld(old.worldId),/fixture put failure/);}finally{IDBObjectStore.prototype.put=originalPut;}
 assert.deepEqual(await s.transact(w=>w),old);assert.equal(await s.hasResetBackup(),false);s.close();
});
test('IDB writes changed worldId even when revision and timestamp are unchanged',async()=>{
 const s=await openGameStore({indexedDB:new IDBFactory()});await s.transact(()=>fixture());await s.transact(w=>{w.worldId='garden-replacement-test';return w;});assert.equal((await s.transact(w=>w)).worldId,'garden-replacement-test');s.close();
});
test('corrupt local backup is preserved and prevents reset',async()=>{
 const storage=new Storage(),raw=JSON.stringify({format:'buncho-world-with-reset-backup-v1',current:fixture(),backup:{bad:true}});storage.setItem(STORAGE_KEY,raw);
 const s=await openGameStore({localStorage:storage,navigator:{locks:locks()}});await assert.rejects(s.hasResetBackup());await assert.rejects(s.resetWorld(fixture().worldId));assert.equal(storage.getItem(STORAGE_KEY),raw);s.close();
});
test('restore delete failure rolls back restored world and preserves original backup',async()=>{
 const s=await openGameStore({indexedDB:new IDBFactory()}),old=await s.transact(()=>fixture()),fresh=await s.resetWorld(old.worldId);const originalDelete=IDBObjectStore.prototype.delete;
 IDBObjectStore.prototype.delete=function(){throw Error('fixture delete failure');};
 try{await assert.rejects(s.restoreResetBackup(fresh.worldId),/fixture delete failure/);}finally{IDBObjectStore.prototype.delete=originalDelete;}
 assert.deepEqual(await s.transact(w=>w),fresh);assert(await s.hasResetBackup());assert.equal((await s.restoreResetBackup(fresh.worldId)).birds[0].name,old.birds[0].name);s.close();
});
test('same-millisecond reset and restore always produce distinct world identities',async(t)=>{
 t.mock.method(Date,'now',()=>1793617200000);const s=await openGameStore({}),old=await s.transact(()=>fixture()),fresh=await s.resetWorld(old.worldId),restored=await s.restoreResetBackup(fresh.worldId),again=await s.resetWorld(restored.worldId);
 assert.equal(new Set([old.worldId,fresh.worldId,restored.worldId,again.worldId]).size,4);assert.equal(fresh.epoch,again.epoch);s.close();
});
