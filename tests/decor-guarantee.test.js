import {stripGrowthPace} from './fixtures/growth-legacy.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {IDBFactory} from 'fake-indexeddb';
import {createWorld,drawDecoration,decorDrawStatus,DECOR_SLOTS,DECOR_COLORS,DECOR_TIERS,DECOR_DRAW_COST,DECOR_DUPLICATE_LIMIT,readCompatibleWorld,parseSave,serializeWorld,validateWorld,buyOrdinaryFurniture,economyToken} from '../src/engine.js';
import {openGameStore,DB_NAME} from '../src/game-store.js';

const now=Date.UTC(2026,10,6,0),clone=structuredClone;
const item=(slot,color,tier)=>({id:`${slot}-${color}-${tier}`,slot,color,tier});
function world(){const w=createWorld(now,1);w.paused=true;w.decor.points=w.decor.lifetimePoints=1000;return w;}
function ownSlot(w,slot,tiers=DECOR_TIERS.map(t=>t.id),except=null){
 for(const tier of tiers)for(const {id:color} of DECOR_COLORS){const next=item(slot,color,tier);if(next.id!==except&&!w.decor.inventory.some(i=>i.id===next.id))w.decor.inventory.push(next);}
 return w;
}
function lateWorld(){return ownSlot(world(),'perch',undefined,'perch-aqua-special');}
function duplicate(w,slot='perch'){w.seed=1;return drawDecoration(w,slot);}
function nextTick(w){w.tick++;return w;}
async function raw(indexedDB,value){
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction('world',value?'readwrite':'readonly'),store=tx.objectStore('world'),r=value?store.put(value,'current'):store.get('current');tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);});}finally{db.close();}
}

test('two duplicate outcomes keep the 8 Gems refund; third grants the last unowned item for 20',()=>{
 const w=lateWorld(),points=w.decor.points,lifetime=w.decor.lifetimePoints,size=w.decor.inventory.length;
 assert.equal(DECOR_DRAW_COST,20);assert.equal(DECOR_DUPLICATE_LIMIT,2);
 assert.equal(duplicate(w).duplicate,true);assert.equal(w.decor.duplicateStreaks.perch,1);assert.equal(w.decor.points,points-12);
 assert.equal(duplicate(nextTick(w)).duplicate,true);assert.equal(w.decor.duplicateStreaks.perch,2);assert.equal(w.decor.points,points-24);
 const status=decorDrawStatus(w,'perch');assert.equal(status.guaranteed,true);assert.equal(status.remaining,1);
 assert.deepEqual(status.probabilities.map(t=>t.probability),[0,0,1]);
 const result=drawDecoration(nextTick(w),'perch');assert.equal(result.guaranteed,true);assert.equal(result.duplicate,false);assert.equal(result.item.id,'perch-aqua-special');
 assert.equal(w.decor.points,points-44);assert.equal(w.decor.lifetimePoints,lifetime);assert.equal(w.decor.inventory.length,size+1);assert.equal(w.decor.duplicateStreaks.perch,0);assert.equal(w.decor.draws,3);validateWorld(w);
});

test('a naturally new result resets only that category; another category never erases progress',()=>{
 const w=lateWorld();duplicate(w);duplicate(nextTick(w));const before=w.decor.duplicateStreaks.perch;
 w.decor.duplicateStreaks.toy=1;w.seed=1;const result=drawDecoration(nextTick(w),'toy');
 assert.equal(result.duplicate,false);assert.equal(result.guaranteed,false);assert.equal(w.decor.duplicateStreaks.toy,0);assert.equal(w.decor.duplicateStreaks.perch,before);
 const restored=parseSave(serializeWorld(w));assert.equal(restored.decor.duplicateStreaks.perch,2);
 nextTick(restored);assert.equal(drawDecoration(restored,'perch').guaranteed,true);validateWorld(restored);
});

test('guaranteed odds preserve relative base item weights and never unlock higher tiers early',()=>{
 const w=world();w.decor.lifetimePoints=160;w.decor.points=100;w.decor.duplicateStreaks.perch=2;
 ownSlot(w,'perch',['cozy'],'perch-rose-cozy');
 const s=decorDrawStatus(w,'perch'),total=.65/8+.35;
 assert.equal(s.tiers.length,2);assert.equal(s.remaining,9);assert.ok(Math.abs(s.probabilities[0].probability-(.65/8)/total)<1e-12);
 assert.ok(Math.abs(s.probabilities[1].probability-.35/total)<1e-12);
 const before=clone(w),first=drawDecoration(w,'perch'),second=drawDecoration(before,'perch');
 assert.deepEqual(first,second);assert.deepEqual(w,before);assert.equal(first.duplicate,false);assert.notEqual(first.item.tier,'special');
});

test('a complete unlocked category charges nothing, even with no Gems or a same-tick request',()=>{
 const w=world();w.decor.lifetimePoints=20;w.decor.points=0;ownSlot(w,'perch',['cozy']);w.decor.lastDrawTick=w.tick;
 const before=clone(w),status=decorDrawStatus(w,'perch');assert.equal(status.complete,true);assert.equal(status.nextTier.level,3);
 const r=drawDecoration(w,'perch');assert.equal(r.changed,false);assert.equal(r.complete,true);assert.deepEqual(w,before);
 w.decor.lifetimePoints=400;ownSlot(w,'perch');const full=clone(w);assert.equal(decorDrawStatus(w,'perch').nextTier,null);assert.equal(drawDecoration(w,'perch').changed,false);assert.deepEqual(w,full);
});

test('Gold purchases and level unlocks keep saved protection without granting a free extra item',()=>{
 const w=world();w.decor.lifetimePoints=20;w.decor.points=20;w.decor.duplicateStreaks.perch=2;w.economy.gold=w.economy.lifetimeGold=16;
 ownSlot(w,'perch',['cozy'],'perch-aqua-cozy');assert.equal(buyOrdinaryFurniture(w,'perch-aqua-cozy',economyToken(w),now).changed,true);
 const before=clone(w);assert.equal(drawDecoration(w,'perch').complete,true);assert.deepEqual(w,before);assert.equal(w.decor.duplicateStreaks.perch,2);
 w.decor.lifetimePoints=160;const status=decorDrawStatus(w,'perch');assert.equal(status.complete,false);assert.equal(status.guaranteed,true);assert.equal(status.remaining,8);
 const r=drawDecoration(w,'perch');assert.equal(r.item.tier,'lovely');assert.equal(w.decor.points,0);assert.equal(w.decor.duplicateStreaks.perch,0);validateWorld(w);
});

test('cooldown, insufficient Gems and invalid category never spend or advance protection',()=>{
 const w=lateWorld();w.decor.duplicateStreaks.perch=2;w.decor.points=19;const before=clone(w);
 assert.throws(()=>drawDecoration(w,'perch'));assert.deepEqual(w,before);assert.throws(()=>drawDecoration(w,'missing'));assert.deepEqual(w,before);
 w.decor.points=20;w.decor.lastDrawTick=w.tick;const same=clone(w);assert.equal(drawDecoration(w,'perch').changed,false);assert.deepEqual(w,same);
});

test('frozen v10 migration adds only zero counters and preserves all former data without mutation',()=>{
 const old=JSON.parse(readFileSync(new URL('./fixtures/v10-gacha-world.json',import.meta.url))),before=clone(old);
 const w=readCompatibleWorld(old,now+86400000),projection=clone(w);assert.equal(w.version,15);assert.deepEqual(w.decor.duplicateStreaks,Object.fromEntries(DECOR_SLOTS.map(s=>[s.id,0])));
 projection.version=10;stripGrowthPace(projection);if(projection.economy){projection.economy.version=1;delete projection.economy.household;}for(const k of ['clock','archive','journal'])delete projection[k];for(const e of projection.events)e.at=projection.epoch+e.tick*15000;delete projection.decor.duplicateStreaks;assert.equal(projection.encounters.version,13);projection.encounters.version=old.encounters.version;assert.deepEqual(projection,old);assert.deepEqual(old,before);
 assert.deepEqual(readCompatibleWorld(w),w);assert.deepEqual(parseSave(serializeWorld(w)),w);
 const forged=clone(old);forged.decor.duplicateStreaks=clone(w.decor.duplicateStreaks);assert.throws(()=>readCompatibleWorld(forged));
});

test('missing, extra, malformed and future protection states fail closed without input mutation',()=>{
 const mutations=[w=>delete w.decor.duplicateStreaks,w=>w.decor.duplicateStreaks=null,w=>delete w.decor.duplicateStreaks.toy,w=>w.decor.duplicateStreaks.other=0,w=>w.decor.duplicateStreaks.toy=-1,w=>w.decor.duplicateStreaks.toy=3,w=>w.decor.duplicateStreaks.toy=.5,w=>w.decor.duplicateStreaks.toy='2',w=>w.decor.duplicateStreaks.toy=NaN,w=>w.version=999];
 for(const mutate of mutations){const w=world();mutate(w);const before=clone(w);assert.throws(()=>readCompatibleWorld(w));assert.deepEqual(w,before);}
 const w=world();let touched=false;Object.defineProperty(w.decor.duplicateStreaks,'perch',{get(){touched=true;return 2;},enumerable:true});assert.throws(()=>validateWorld(w));assert.equal(touched,false);
});

test('two tabs commit one guaranteed draw and preserve the same durable outcome',async()=>{
 const indexedDB=new IDBFactory(),w=lateWorld();w.decor.duplicateStreaks.perch=2;await raw(indexedDB,w);
 const a=await openGameStore({indexedDB}),b=await openGameStore({indexedDB});const results=[];
 try{await Promise.all([a,b].map(store=>store.transact(current=>{results.push(drawDecoration(current,'perch'));return current;})));
 const saved=validateWorld(await raw(indexedDB));assert.equal(results.filter(r=>r.changed).length,1);assert.equal(saved.decor.draws,1);assert.equal(saved.decor.points,w.decor.points-20);assert.equal(saved.decor.duplicateStreaks.perch,0);assert.equal(saved.decor.inventory.filter(i=>i.id==='perch-aqua-special').length,1);
 }finally{a.close();b.close();}
});

test('v10 no-op store read persists its additive migration exactly once',async()=>{
 const indexedDB=new IDBFactory(),old=JSON.parse(readFileSync(new URL('./fixtures/v10-gacha-world.json',import.meta.url)));await raw(indexedDB,old);const store=await openGameStore({indexedDB});
 try{const first=await store.transact(w=>w),persisted=await raw(indexedDB);assert.deepEqual(first,persisted);assert.equal(persisted.version,15);assert.equal(persisted.revision,old.revision);assert.deepEqual(await store.transact(w=>w),persisted);}finally{store.close();}
});

test('the previous published v10 store rejects the new save before any write callback',async()=>{
 const {openGameStore:openOld}=await import('./fixtures/game-store-v10.js'),indexedDB=new IDBFactory(),w=lateWorld();w.decor.duplicateStreaks.perch=2;await raw(indexedDB,w);
 const old=await openOld({indexedDB});let called=false;
 try{await assert.rejects(old.transact(current=>{called=true;current.decor.points=0;return current;}));assert.equal(called,false);assert.deepEqual(await raw(indexedDB),w);await assert.rejects(old.resetWorld(w.worldId));assert.deepEqual(await raw(indexedDB),w);}finally{old.close();}
});

test('locked local tabs serialize the guaranteed draw and the old tab cannot erase it',async()=>{
 const {openGameStore:openOld}=await import('./fixtures/game-store-v10.js');
 const w=lateWorld();w.decor.duplicateStreaks.perch=2;const data=new Map([['buncho-ureshi-world-v1',JSON.stringify(w)]]);let tail=Promise.resolve();
 const platform={localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},navigator:{locks:{request(_name,callback){const task=tail.then(callback);tail=task.catch(()=>{});return task;}}}};
 const a=await openGameStore(platform),b=await openGameStore(platform),old=await openOld(platform),results=[];
 try{await Promise.all([a,b].map(store=>store.transact(current=>{results.push(drawDecoration(current,'perch'));return current;})));assert.equal(results.filter(r=>r.changed).length,1);
 const saved=await a.transact(w=>w);assert.equal(saved.decor.points,w.decor.points-20);assert.equal(saved.decor.draws,1);assert.equal(saved.decor.duplicateStreaks.perch,0);const before=data.get('buncho-ureshi-world-v1');let called=false;await assert.rejects(old.transact(w=>{called=true;return w;}));assert.equal(called,false);assert.equal(data.get('buncho-ureshi-world-v1'),before);
 }finally{a.close();b.close();old.close();}
});

test('root migration preserves PR110 visit snapshots, companion choices and exact active warning',async()=>{
 const old=await import('./fixtures/engine-v10.js'),{encounterSystem:system}=await import('../src/encounters.js'),{arriveGardenRaptor,raptorToken}=await import('../src/garden-raptors.js');
 const w=old.createWorld(now,42);system.chooseCompanions(w,['b1'],old.economyToken(w));system.chooseAccompaniment(w,true,old.economyToken(w));system.selectGarden(w,'komugi',old.economyToken(w));
 assert.equal(arriveGardenRaptor(w,'black-kite',now,{...raptorToken(w),gardenId:w.encounters.garden.id}).changed,true);old.advanceGardenRaptor(w,1000,now+1000,raptorToken(w));assert.equal(w.encounters.raptor.active.remainingMs,59000);const prior=old.validateWorld(w),snapshot=clone(prior),m=readCompatibleWorld(prior),projected=clone(m);projected.version=10;stripGrowthPace(projected);if(projected.economy){projected.economy.version=1;delete projected.economy.household;}for(const k of ['clock','archive','journal'])delete projected[k];for(const e of projected.events)e.at=projected.epoch+e.tick*15000;delete projected.decor.duplicateStreaks;
 assert.deepEqual(projected,snapshot);assert.deepEqual(m.encounters,prior.encounters);assert.deepEqual(prior,snapshot);assert.equal(m.encounters.version,13);assert.equal(m.encounters.gardenFriends.version,2);
});
