import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import * as old from './fixtures/engine-v13.js';
import {createWorld,createBird,advanceTo,advanceTicks,readCompatibleWorld,validateWorld,serializeWorld,parseSave,hireCaretaker,economyToken,canPair,claimHouseholdIncome,GROWTH_RULES} from '../src/engine.js';
import {allBirds} from '../src/world-birds.js';
import {openGameStore,DB_NAME,STORAGE_KEY} from '../src/game-store.js';
const NOW=Date.parse('2026-11-10T12:00:00+09:00'),MINUTE=60000;
function family(engine){const w=engine.createWorld(NOW);const father=engine.createBird(w,{home:'resident',sex:'male'}),child=engine.createBird(w,{home:'resident',sex:'male',stage:'egg',parents:['b1',father.id],generation:1});return {w,child};}
function protectedWorld(w){const result=structuredClone(w);result.version=13;for(const b of allBirds(result))delete b.growthPace;return result;}
function paid(w){w.economy.gold=w.economy.lifetimeGold=1000;hireCaretaker(w,7,economyToken(w),NOW);}
test('new eggs follow336/1008/5376 minute boundaries and keep exact stage event dates',()=>{
 const {w,child}=family({createWorld,createBird});paid(w);
 for(const [minute,stage] of [[335,'egg'],[336,'chick'],[1007,'chick'],[1008,'juvenile'],[5375,'juvenile'],[5376,'adult']]){advanceTo(w,NOW+minute*MINUTE);assert.equal(child.id,w.birds.find(b=>b.id===child.id).id);assert.equal(w.birds.find(b=>b.id===child.id).stage,stage,`${minute} minutes`);validateWorld(w);}
 const events=w.journal.filter(e=>e.ids[0]===child.id&&['hatch','grow'].includes(e.kind));assert.deepEqual(events.map(e=>[e.kind,e.tick,e.at]),[['hatch',336,NOW+336*MINUTE],['grow',1008,NOW+1008*MINUTE],['grow',5376,NOW+5376*MINUTE]]);assert.equal(w.decor.points,95);assert.equal(child.growthPace,'relaxed');
 assert.equal(GROWTH_RULES.relaxed.chick,672);assert.equal(GROWTH_RULES.relaxed.chick+GROWTH_RULES.relaxed.juvenile,5040);assert.deepEqual(parseSave(serializeWorld(w)),w);
});
test('migrating13 adds pace only, keeps all archive and wallet history, and old readers reject14',()=>{
 const {w}=family(old);for(let i=0;i<140;i++)old.createBird(w,{home:'departed'});old.advanceTicks(w,5,NOW);w.economy.gold=w.economy.lifetimeGold=321;
 const before=structuredClone(w),next=readCompatibleWorld(w,NOW+MINUTE);assert.deepEqual(w,before);assert.equal(next.version,14);assert(allBirds(next).every(b=>b.growthPace==='legacy'));assert(next.archive.length>0);assert.deepEqual(protectedWorld(next),before);assert.throws(()=>old.readCompatibleWorld(next,NOW));
});
test('existing eggs, chicks and juveniles finish at their original pace without changing prior stage times',()=>{
 for(const elapsed of [5,15,40]){const {w,child}=family(old);old.advanceTo(w,NOW+elapsed*MINUTE);const prior=structuredClone(w),next=readCompatibleWorld(w,NOW+elapsed*MINUTE);assert.deepEqual(protectedWorld(next),prior);advanceTo(next,NOW+84*MINUTE);assert.equal(next.birds.find(b=>b.id===child.id).stage,'adult');assert.deepEqual(next.journal.filter(e=>e.ids[0]===child.id&&['hatch','grow'].includes(e.kind)).map(e=>e.tick),[12,36,84]);validateWorld(next);}
});
test('new eggs in a migrated world receive the new pace while existing adults remain breedable',()=>{
 const w=old.createWorld(NOW),father=old.createBird(w,{home:'resident',sex:'male'}),next=readCompatibleWorld(w,NOW);assert.equal(canPair(next,next.birds[0],next.birds[1]),true);
 const egg=createBird(next,{home:'resident',stage:'egg',parents:['b1',father.id],generation:1});assert.equal(egg.growthPace,'relaxed');advanceTo(next,NOW+84*MINUTE);assert.equal(egg.stage,'egg');assert.equal(next.birds[0].stage,'adult');validateWorld(next);
});
test('new juvenile becomes breedable only on its adult transition; parent/child restriction stays intact',()=>{
 const {w,child}=family({createWorld,createBird}),mate=createBird(w,{home:'resident',sex:'female'});paid(w);advanceTo(w,NOW+5375*MINUTE);assert.equal(canPair(w,child,mate),false);advanceTo(w,NOW+5376*MINUTE);assert.equal(canPair(w,child,mate),true);assert.equal(canPair(w,child,w.birds[0]),false);
});
test('pause, reload and split absences preserve the new stage clock',()=>{
 const {w,child}=family({createWorld,createBird});paid(w);advanceTo(w,NOW+335*MINUTE);let resumed=parseSave(serializeWorld(w));advanceTo(resumed,NOW+336*MINUTE);assert.equal(resumed.birds.find(b=>b.id===child.id).stage,'chick');resumed.paused=true;advanceTo(resumed,NOW+600*MINUTE);assert.equal(resumed.tick,336);resumed.paused=false;advanceTo(resumed,NOW+601*MINUTE);assert.equal(resumed.tick,337);assert.equal(resumed.birds.find(b=>b.id===child.id).stage,'chick');validateWorld(resumed);
});
test('daily Gold receipt is preserved through13to14 migration without another migration-day block',()=>{
 const w=old.createWorld(NOW);w.paused=true;w.birds[0].needs.food=w.birds[0].needs.energy=100;assert.equal(old.claimHouseholdIncome(w,old.economyToken(w),NOW).goldAward,30);const before=structuredClone(w.economy),next=readCompatibleWorld(w,NOW);assert.deepEqual(next.economy,before);assert.equal(claimHouseholdIncome(next,economyToken(next),NOW).goldAward,0);assert.equal(next.economy.gold,30);
});
test('strict current and historical readers reject missing, unknown or forged pace without altering input',()=>{
 for(const mutate of [w=>delete w.birds[0].growthPace,w=>w.birds[0].growthPace='instant',w=>w.birds[0].growthPace={kind:'relaxed'},w=>w.birds[0].growthPace=['legacy']]){const w=createWorld(NOW);mutate(w);const before=structuredClone(w);assert.throws(()=>validateWorld(w));assert.deepEqual(w,before);}
 const forged=old.createWorld(NOW);forged.birds[0].growthPace='legacy';assert.throws(()=>readCompatibleWorld(forged,NOW));
});
async function seed(indexedDB,w){const db=await new Promise((resolve,reject)=>{const q=indexedDB.open(DB_NAME,1);q.onupgradeneeded=()=>q.result.createObjectStore('world');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});await new Promise((resolve,reject)=>{const tx=db.transaction('world','readwrite');tx.objectStore('world').put(w,'current');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}
test('two IDB readers migrate once and retain the exact13 original independent of reset backups',async()=>{
 const indexedDB=new IDBFactory(),before=family(old).w;await seed(indexedDB,before);const a=await openGameStore({indexedDB}),b=await openGameStore({indexedDB});const [one,two]=await Promise.all([a.transact(w=>w),b.transact(w=>w)]);assert.deepEqual(one,two);assert.deepEqual(await a.migrationBackup(13),before);assert.equal(await a.migrationBackup(12),null);await a.resetWorld(one.worldId);assert.deepEqual(await a.migrationBackup(13),before);assert.equal(await a.hasResetBackup(),true);a.close();b.close();
});
test('failed IDB migration preserves the raw13 save and allows a later complete retry',async()=>{
 const indexedDB=new IDBFactory(),before=family(old).w;await seed(indexedDB,before);const s=await openGameStore({indexedDB});await assert.rejects(s.transact(()=>{throw Error('cancel');}),/cancel/);assert.equal(await s.migrationBackup(13),null);const next=await s.transact(w=>w);assert.equal(next.version,14);assert.deepEqual(await s.migrationBackup(13),before);s.close();
});
test('locked local migration preserves raw wrapper, prior originals, wallet and reset backup atomically',async()=>{
 const before=family(old).w,raw=JSON.stringify({format:'buncho-world-with-reset-backup-v1',current:before,backup:old.createWorld(NOW)}),values=new Map([[STORAGE_KEY,raw],[STORAGE_KEY+'-migration-v12','{"keep":12}']]);let fail=false;
 const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(fail&&k===STORAGE_KEY)throw Error('quota');values.set(k,v);},removeItem:k=>values.delete(k)};
 const s=await openGameStore({localStorage:storage,navigator:{locks:{request:async(k,fn)=>fn()}}});fail=true;await assert.rejects(s.transact(w=>w),/quota/);assert.equal(values.get(STORAGE_KEY),raw);fail=false;const next=await s.transact(w=>w);assert.equal(next.version,14);assert.equal(values.get(STORAGE_KEY+'-migration-v13'),raw);assert.equal(values.get(STORAGE_KEY+'-migration-v12'),'{"keep":12}');assert.deepEqual(await s.migrationBackup(13),before);assert.equal(await s.hasResetBackup(),true);s.close();
});
