import {stripGrowthPace} from './fixtures/growth-legacy.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {IDBFactory} from 'fake-indexeddb';
import {createWorld,createBird,advanceTicks,advanceTo,validateWorld,readCompatibleWorld,migrateV1ToV2,parseSave,serializeWorld,feedBird,petBird,cleanGarden,getFullness,getCleanliness,talkToBird,renameBird,eventText,CARE_RULES,SAVE_VERSION,LIMITS,TICK_MS,isRelated} from '../src/engine.js';
import {openGameStore,DB_NAME,STORAGE_KEY} from '../src/game-store.js';
import {openGameStore as openLegacyStore} from './fixtures/game-store-v1.js';
import {validateWorld as validateLegacyWorld,createWorld as legacyCreateWorld,advanceTicks as legacyAdvanceTicks} from './fixtures/engine-v1.js';

const legacy=JSON.parse(await readFile(new URL('./fixtures/v1-world.json',import.meta.url),'utf8'));
class Storage { constructor(){this.data=new Map();this.writes=0;}getItem(key){return this.data.get(key)??null;}setItem(key,value){this.data.set(key,String(value));this.writes++;}removeItem(key){this.data.delete(key);} }
function locks(){let tail=Promise.resolve();return {request(name,fn){assert.equal(name,STORAGE_KEY);const next=tail.then(fn);tail=next.catch(()=>{});return next;}};}
async function dbConnection(indexedDB){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>req.result.createObjectStore('world');req.onerror=()=>reject(req.error);req.onsuccess=()=>resolve(req.result);});}
async function rawWrite(indexedDB,value){const db=await dbConnection(indexedDB);await new Promise((resolve,reject)=>{const tx=db.transaction('world','readwrite');tx.objectStore('world').put(value,'current');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}
async function rawRead(indexedDB){const db=await dbConnection(indexedDB);const value=await new Promise((resolve,reject)=>{const tx=db.transaction('world','readonly'),req=tx.objectStore('world').get('current');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});db.close();return value;}
function stripCare(world){const copy=structuredClone(world);copy.version=1;stripGrowthPace(copy);for(const k of ['clock','archive','journal'])delete copy[k];for(const e of copy.events)e.at=copy.epoch+e.tick*15000;delete copy.decor?.duplicateStreaks;delete copy.field;delete copy.decor;delete copy.care;delete copy.gems;delete copy.careSchedule;delete copy.encounters;delete copy.economy;delete copy.lifecycle;delete copy.protagonist;delete copy.adoption;delete copy.settings.adoptionMode;delete copy.settings.careSound;for(const bird of copy.birds){delete bird.care;delete bird.gemCare;delete bird.naming;}return copy;}

test('strict v1 migration preserves the complete world and adds only the documented care defaults',()=>{
 const before=JSON.stringify(legacy);validateLegacyWorld(legacy);
 const migrated=migrateV1ToV2(legacy);assert.equal(SAVE_VERSION,18);assert.equal(migrated.version,18);
 assert.deepEqual(stripCare(migrated),legacy);assert.deepEqual(migrated.care,{cleanliness:100,lastCleanTick:null});assert.equal(migrated.settings.careSound,true);
 assert.ok(migrated.birds.every(b=>b.care.lastFedTick===null&&b.care.lastPetTick===null));
 assert.deepEqual(readCompatibleWorld(migrated),migrated);const paused=structuredClone(legacy);paused.paused=true;paused.settings.motion=false;assert.deepEqual(stripCare(migrateV1ToV2(paused)),paused);assert.deepEqual(stripCare(parseSave(before)),legacy);assert.deepEqual(stripCare(parseSave(serializeWorld(legacy))),legacy);assert.equal(JSON.stringify(legacy),before);
 assert.throws(()=>validateWorld(legacy));assert.throws(()=>migrateV1ToV2(migrated));
});

test('legacy and current corrupt saves fail closed without getter execution or silent field dropping',()=>{
 for(const mutate of [w=>w.extra='not allowed',w=>w.birds[0].parents=['b1','b1'],w=>w.settings.careSound=false,w=>w.events[0].kind='user-feed',w=>w.birds[0].care={lastFedTick:null,lastPetTick:null}]){
  const bad=structuredClone(legacy);mutate(bad);const before=JSON.stringify(bad);assert.throws(()=>readCompatibleWorld(bad));assert.equal(JSON.stringify(bad),before);
 }
 const valid=createWorld(0);
 for(const mutate of [w=>delete w.care,w=>w.care.cleanliness=-1,w=>w.care.cleanliness=101,w=>w.care.cleanliness=.5,w=>w.care.cleanliness=NaN,w=>w.care.lastCleanTick=1,w=>w.care.extra=1,w=>w.settings.careSound='yes',w=>delete w.birds[0].care,w=>w.birds[0].care.lastFedTick=-1,w=>w.birds[0].care.lastPetTick=1,w=>w.birds[0].care.extra=0,w=>w.birds[0].care=null,w=>w.version=6]){
  const bad=structuredClone(valid);mutate(bad);assert.throws(()=>readCompatibleWorld(bad));
 }
 const accessor=structuredClone(legacy);Object.defineProperty(accessor,'version',{enumerable:true,get(){throw new Error('getter executed');}});assert.throws(()=>readCompatibleWorld(accessor),/版の形式/);
 const cyclic=structuredClone(valid);cyclic.care.loop=cyclic;assert.throws(()=>readCompatibleWorld(cyclic));
 const sparse=structuredClone(legacy);sparse.birds[0].memories=new Array(1000000000);assert.throws(()=>readCompatibleWorld(sparse),/JSONの配列/);
 assert.deepEqual(valid,createWorld(0));
});

test('cleanliness is a cosmetic 0–100 value with deterministic bounded decay and free idempotent cleaning',()=>{
 const w=createWorld(0);assert.equal(getCleanliness(w),100);const original=serializeWorld(w);assert.equal(cleanGarden(w).changed,false);assert.equal(serializeWorld(w),original);
 advanceTicks(w,20*27);assert.equal(w.care.cleanliness,80);const birds=structuredClone(w.birds),events=structuredClone(w.events),seed=w.seed;
 const cleaned=cleanGarden(w);assert.deepEqual({before:cleaned.before,after:cleaned.after,changed:cleaned.changed},{before:80,after:100,changed:true});assert.equal(w.care.lastCleanTick,20*27);
 assert.deepEqual(w.birds,birds);assert.deepEqual(w.events,events);assert.equal(w.seed,seed);const once=serializeWorld(w);for(let i=0;i<500;i++)assert.equal(cleanGarden(w).changed,false);assert.equal(serializeWorld(w),once);
 advanceTicks(w,100*27);assert.equal(w.care.cleanliness,0);cleanGarden(w);w.paused=true;advanceTicks(w,100);advanceTo(w,TICK_MS*100000);assert.equal(w.care.cleanliness,100);validateWorld(w);
});

test('floor cleanliness has no effect on autonomous state, reproduction or bounded offline absence',()=>{
 const clean=createWorld(0),dirty=createWorld(0);dirty.care.cleanliness=0;
 advanceTo(clean,TICK_MS*100000000);advanceTo(dirty,TICK_MS*100000000);
 assert.equal(clean.tick,100000000);assert.deepEqual(clean.birds,dirty.birds);assert.deepEqual(clean.events,dirty.events);assert.equal(clean.seed,dirty.seed);
 assert.equal(clean.care.cleanliness,0);assert.equal(dirty.care.cleanliness,0);assert.ok(clean.birds.every(b=>b.mood>=35&&b.needs.energy>=12));
 for(const b of clean.birds)if(b.partner)assert.equal(isRelated(clean,b.id,b.partner),false);
 const tick=clean.tick;advanceTo(clean,TICK_MS*100000000);assert.equal(clean.tick,tick);assert.deepEqual(parseSave(serializeWorld(clean)),clean);
});

test('feeding fills the single fullness source repeatedly to100, preserves plumage and relations',()=>{
 const w=createWorld(0),b=w.birds[0];b.needs.food=70;const color=b.color,relations=structuredClone(b.relations);
 const result=feedBird(w,b.id,0);assert.equal(result.before,70);assert.equal(result.after,90);assert.equal(getFullness(w,b.id),90);assert.equal(b.action.kind,'eat');assert.equal(b.memories.at(-1).kind,'user-feed');assert.equal(b.color,color);assert.deepEqual(b.relations,relations);
 assert.equal(feedBird(w,b.id,0).after,100);const once=serializeWorld(w);for(let i=0;i<500;i++)assert.equal(feedBird(w,b.id,0).reason,'full');assert.equal(serializeWorld(w),once);
 advanceTicks(w,20);assert.equal(getFullness(w,b.id),100);assert.equal(feedBird(w,b.id,0).changed,false);validateWorld(w);assert.deepEqual(parseSave(serializeWorld(w)),w);
});

test('petting fills energy and records a bounded fictional response without rewarding beyond100',()=>{
 const w=createWorld(0),b=w.birds[0];b.mood=70;b.needs.energy=40;
 const reply=petBird(w,b.id,0);assert.equal(reply.changed,true);assert.equal(reply.after,60);assert.equal(b.mood,74);assert.match(reply.message,/ぴっ♪/);assert.equal(b.memories.at(-1).kind,'user-pet');
 petBird(w,b.id,0);petBird(w,b.id,0);const once=serializeWorld(w);for(let i=0;i<500;i++)assert.equal(petBird(w,b.id,0).changed,false);assert.equal(serializeWorld(w),once);
 advanceTicks(w,20);assert.equal(petBird(w,b.id,0).changed,false);renameBird(w,b.id,'しらたま');assert.match(eventText(w,w.events.find(e=>e.kind==='user-pet')),/しらたま/);validateWorld(w);
});

test('completed real care window survives memory eviction, roundtrip, clock rollback and story pause',()=>{
 const w=createWorld(0);feedBird(w,'b1',0);petBird(w,'b1',0);w.birds[0].memories=[];
 const restored=parseSave(serializeWorld(w));assert.equal(feedBird(restored,'b1',0).changed,false);assert.equal(petBird(restored,'b1',0).changed,false);
 restored.paused=true;advanceTo(restored,1000000);advanceTo(restored,0);assert.equal(restored.tick,0);assert.equal(feedBird(restored,'b1',0).changed,false);assert.equal(petBird(restored,'b1',0).changed,false);
 const food=restored.birds[0].needs.food;for(let i=0;i<30;i++)talkToBird(restored,'b1','ごはん',0);assert.equal(restored.birds[0].needs.food,food);validateWorld(restored);
});

test('eggs, nestlings, departed and unknown birds cannot receive direct care; juvenile visitors can',()=>{
 const w=createWorld(0);const egg=createBird(w,{stage:'egg',home:'resident'}),chick=createBird(w,{stage:'chick',home:'resident'}),departed=createBird(w,{home:'departed'}),young=createBird(w,{stage:'juvenile',home:'visitor'});
 for(const id of [egg.id,chick.id,departed.id,'missing'])for(const action of [feedBird,petBird]){const before=serializeWorld(w);assert.throws(()=>action(w,id));assert.equal(serializeWorld(w),before);}
 assert.equal(feedBird(w,young.id).changed,true);assert.equal(petBird(w,young.id).changed,true);validateWorld(w);
 const bad=structuredClone(w);bad.birds.find(b=>b.id===egg.id).care.lastFedTick=0;assert.throws(()=>validateWorld(bad));
});

test('IndexedDB persists migration with no elapsed tick and no revision bump, using historical backend names',async()=>{
 assert.equal(DB_NAME,'buncho-ureshi-garden-v1');assert.equal(STORAGE_KEY,'buncho-ureshi-world-v1');
 const indexedDB=new IDBFactory();await rawWrite(indexedDB,legacy);const store=await openGameStore({indexedDB});
 const read=await store.transact(w=>w),raw=await rawRead(indexedDB);assert.equal(raw.version,18);assert.deepEqual(raw,read);assert.equal(raw.revision,legacy.revision);assert.equal(raw.lastUpdated,legacy.lastUpdated);assert.equal(raw.tick,legacy.tick);
 assert.deepEqual(await store.transact(w=>w),read);store.close();
});

test('failed migration transaction and future/corrupt persisted values leave raw IndexedDB unchanged',async()=>{
 for(const value of [legacy,{...legacy,version:99},null,false,0,'']){
  const indexedDB=new IDBFactory();await rawWrite(indexedDB,value);const store=await openGameStore({indexedDB});
  if(value===legacy)await assert.rejects(store.transact(()=>{throw new Error('cancel operation');}),/cancel/);
  else await assert.rejects(store.transact(w=>w));
  assert.deepEqual(await rawRead(indexedDB),value);store.close();
 }
});

test('simultaneous tabs migrate once and cannot duplicate care effects, lose edits or overwrite current from a v1 tab',async()=>{
 const indexedDB=new IDBFactory(),old=await openLegacyStore({indexedDB});await rawWrite(indexedDB,legacy);
 const a=await openGameStore({indexedDB}),b=await openGameStore({indexedDB});
 await Promise.all([a.transact(w=>w),b.transact(w=>w)]);assert.equal((await rawRead(indexedDB)).version,18);
 const before=await rawRead(indexedDB);await assert.rejects(old.transact(w=>{w.birds[0].name='old client';w.revision++;return w;}));assert.deepEqual(await rawRead(indexedDB),before);
 const next=createWorld(0);next.birds[0].needs.food=50;next.birds[0].mood=50;next.care.cleanliness=25;next.revision=before.revision+1;await a.transact(()=>next);
 const results=[];
 await Promise.all(Array.from({length:60},(_,i)=>(i%2?a:b).transact(w=>{const result=i%3===2?cleanGarden(w,0):[feedBird,petBird][i%3](w,'b1',0);results.push(result);return w;})));
 const current=await a.transact(w=>w);assert.equal(current.birds[0].needs.food,100);assert.equal(current.birds[0].mood,54);assert.equal(current.care.cleanliness,100);assert.equal(results.filter(r=>r.changed).length,5);assert.equal(current.events.filter(e=>e.kind==='user-feed').length,3);assert.equal(current.events.filter(e=>e.kind==='user-pet').length,1);validateWorld(current);
 a.close();b.close();old.close();
});

test('locked local migration is persisted once, cancellation/future versions preserve bytes, and concurrent care serializes',async()=>{
 const storage=new Storage(),lock=locks();storage.setItem(STORAGE_KEY,JSON.stringify(legacy));const platform={localStorage:storage,navigator:{locks:lock}};
 const a=await openGameStore(platform),b=await openGameStore(platform);const before=storage.writes;await Promise.all([a.transact(w=>w),b.transact(w=>w)]);assert.equal(storage.writes,before+2);assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).version,18);
 const old=await openLegacyStore(platform),migratedBytes=storage.getItem(STORAGE_KEY);await assert.rejects(old.transact(w=>w));assert.equal(storage.getItem(STORAGE_KEY),migratedBytes);old.close();
 const next=createWorld(0);next.birds[0].needs.food=50;next.revision=legacy.revision+1;await a.transact(()=>next);
 await Promise.all(Array.from({length:30},(_,i)=>(i%2?a:b).transact(w=>{feedBird(w,'b1',0);return w;})));assert.equal((await a.transact(w=>w)).birds[0].needs.food,100);
 const saved=storage.getItem(STORAGE_KEY);await assert.rejects(a.transact(()=>{throw new Error('cancel');}));assert.equal(storage.getItem(STORAGE_KEY),saved);
 storage.setItem(STORAGE_KEY,JSON.stringify({...legacy,version:99}));const future=storage.getItem(STORAGE_KEY);await assert.rejects(a.transact(w=>w));assert.equal(storage.getItem(STORAGE_KEY),future);a.close();b.close();
});


test('five10000-tick new care simulations retain bounded protected family histories and stable care bars',()=>{
 for(const seed of [1,77,842911,20261102,4294967295]){
  const current=createWorld(0,seed);advanceTicks(current,10000);validateWorld(current);
  assert.equal(current.birds[0].needs.food,80);assert.equal(current.birds[0].needs.energy,80);
  assert.ok(current.birds.length<=LIMITS.birds);assert.ok(current.events.length<=LIMITS.events);
  for(const bird of current.birds)if(bird.partner)assert.equal(isRelated(current,bird.id,bird.partner),false);
  assert.deepEqual(parseSave(serializeWorld(current)),current);
 }
});

test('long mixed care and automatic-adoption progression remains bounded with protected families and safe care timestamps',()=>{
 const world=createWorld(0);world.settings.adoptionMode='auto';
 for(let i=0;i<100;i++){
  advanceTicks(world,50);feedBird(world,'b1');petBird(world,'b1');cleanGarden(world);validateWorld(world);
  for(const bird of world.birds){if(bird.partner)assert.equal(isRelated(world,bird.id,bird.partner),false);assert.ok(bird.memories.length<=LIMITS.memories);assert.ok(bird.milestones.length<=LIMITS.memories);}
 }
 assert.equal(world.tick,5000);assert.ok(world.birds.length<=LIMITS.birds);assert.equal(world.events.length,LIMITS.events);assert.ok(world.birds.some(b=>b.generation>=1));assert.deepEqual(parseSave(serializeWorld(world)),world);
});

test('full feeding cannot refresh a health deadline or rearm an already produced 8-Gem drop',()=>{
 const w=createWorld(0),b=w.birds[0];feedBird(w,b.id,0);advanceTicks(w,2);assert(w.gems.droppings.some(d=>d.birdId===b.id));
 const before=structuredClone(w),lastFed=w.lifecycle.birds.find(s=>s.birdId===b.id).lastCareAt;
 for(let i=0;i<50;i++)assert.equal(feedBird(w,b.id,0).changed,false);
 assert.deepEqual(w,before);assert.equal(w.lifecycle.birds.find(s=>s.birdId===b.id).lastCareAt,lastFed);assert.equal(b.gemCare.fullSinceTick,null);
});
