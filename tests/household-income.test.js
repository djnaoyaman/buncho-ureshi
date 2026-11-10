import {stripGrowthPace} from './fixtures/growth-legacy.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {createWorld,createBird,validateWorld,readCompatibleWorld,advanceTo,feedBird,petBird,talkToBird,economyToken,householdIncomeStatus,claimHouseholdIncome,hireCaretaker,serializeWorld,parseSave} from '../src/engine.js';
import {openGameStore,DB_NAME,STORAGE_KEY} from '../src/game-store.js';
const NOW=Date.parse('2026-11-10T12:00:00+09:00'), DAY=86400000;
function ready(now=NOW){const w=createWorld(now);w.paused=true;for(const b of w.birds)b.needs.food=b.needs.energy=100;return w;}
function legacy(w){const v=structuredClone(w);v.version=12;stripGrowthPace(v);v.economy.version=1;delete v.economy.household;return v;}
const claim=(w,now=NOW)=>claimHouseholdIncome(w,economyToken(w),now);
test('new household earns exactly30 once, receipt roundtrips and PRNG/history/Gems stay unchanged',()=>{
 const w=ready(),before=structuredClone(w);const r=claim(w);assert.equal(r.goldAward,30);assert.equal(w.economy.lifetimeGold,30);assert.equal(w.economy.household.lastClaimedDay,'2026-11-10');
 assert.equal(claim(w).goldAward,0);assert.deepEqual(parseSave(serializeWorld(w)),w);
 for(const key of ['birds','archive','journal','events','seed','decor','gems','protagonist'])assert.deepEqual(w[key],before[key],key);validateWorld(w);
});
test('per-action Gold is removed while exact6/5/5 Gems and stale-click guard remain',()=>{
 const w=createWorld(NOW);assert.equal(feedBird(w,'b1',NOW,economyToken(w)).goldAward,0);assert.equal(petBird(w,'b1',NOW,economyToken(w)).goldAward,0);assert.equal(w.decor.points,31);assert.equal(w.economy.gold,0);
 w.birds[0].needs.energy=80;const r=talkToBird(w,'b1','こんにちは',NOW,economyToken(w));assert.equal(r.gemAward,5);assert.equal(r.goldAward,0);assert.equal(w.economy.gold,0);
});
test('family care requirements exclude guests, eggs, chicks and departed birds; cleaning is checked even away',()=>{
 const w=ready();for(const stage of ['egg','chick']){const b=createBird(w,{home:'resident',stage});b.needs.food=b.needs.energy=0;}
 const guest=createBird(w,{home:'visitor'});guest.needs.food=guest.needs.energy=0;
 assert.equal(householdIncomeStatus(w).ready,true);w.birds[0].needs.food=80;assert.equal(claim(w).goldAward,0);w.birds[0].needs.food=100;w.birds[0].needs.energy=80;assert.equal(claim(w).goldAward,0);w.birds[0].needs.energy=100;
 w.care.cleanliness=20;w.field.place='park';assert.equal(householdIncomeStatus(w).reason,'care');w.care.cleanliness=21;assert.equal(claim(w).goldAward,30);
});
test('hospital shortage does not block household reward and caretaker retains24/day with income',()=>{
 const w=ready();w.lifecycle.birds[0].condition={kind:'respiratory',sinceAt:NOW,deadlineAt:NOW+DAY};assert.equal(householdIncomeStatus(w).ready,true);assert.equal(claim(w).goldAward,30);validateWorld(w);
 const c=ready();c.economy.gold=c.economy.lifetimeGold=100;assert.equal(hireCaretaker(c,1,economyToken(c),NOW).goldSpent,24);assert.equal(claim(c).goldAward,30);assert.equal(c.economy.gold,106);
});
test('JST midnight opens one new reward, rollback cannot reopen yesterday and missed days do not accumulate',()=>{
 const at=Date.parse('2026-11-10T23:59:59+09:00'),w=ready(at);assert.equal(claim(w,at).goldAward,30);
 const next=at+1000;advanceTo(w,next);for(const b of w.birds)b.needs.food=b.needs.energy=100;
 assert.equal(claim(w,next).goldAward,30);assert.equal(claim(w,at).goldAward,0);
 // Observe a later day without advancing paused story; renew care before claiming.
 advanceTo(w,next+2*DAY);for(const b of w.birds)b.needs.food=b.needs.energy=100;w.care.cleanliness=100;
 assert.equal(claim(w,next+2*DAY).goldAward,30);assert.equal(w.economy.gold,90);validateWorld(w);
});
test('migration preserves every old field, blocks update day and allows tomorrow even after reloading',()=>{
 const old=legacy(ready());old.economy.gold=127;old.economy.lifetimeGold=200;const before=structuredClone(old),w=readCompatibleWorld(old,NOW);assert.deepEqual(old,before);
 const projected=structuredClone(w);projected.version=12;stripGrowthPace(projected);projected.economy.version=1;delete projected.economy.household;assert.deepEqual(projected,before);
 assert.equal(householdIncomeStatus(w).reason,'migration');assert.equal(claim(w).goldAward,0);
 const reloaded=readCompatibleWorld(w,NOW+DAY);assert.equal(reloaded.economy.household.startedDay,'2026-11-11');advanceTo(reloaded,NOW+DAY);for(const b of reloaded.birds)b.needs.food=b.needs.energy=100;
 assert.equal(claim(reloaded,NOW+DAY).goldAward,30);assert.equal(reloaded.economy.gold,157);
});
test('Gold cap keeps receipt pending until the full30 can be paid',()=>{
 const w=ready();w.economy.gold=w.economy.lifetimeGold=1e9-29;assert.equal(claim(w).goldAward,0);assert.equal(w.economy.household.lastClaimedDay,null);
 w.economy.gold-=1;assert.equal(claim(w).goldAward,30);assert.equal(w.economy.gold,1e9);validateWorld(w);
});
test('strict receipt rejects extra, malformed or future claims without modifying input',()=>{
 for(const update of [h=>h.extra=1,h=>h.lastClaimedDay='2026-11-11',h=>h.startedDay='2026-02-30',h=>h.lastClaimedDay='2026-11-09']){const w=ready();update(w.economy.household);const before=structuredClone(w);assert.throws(()=>validateWorld(w));assert.deepEqual(w,before);}
});
async function seed(indexedDB,w){const db=await new Promise((resolve,reject)=>{const q=indexedDB.open(DB_NAME,1);q.onupgradeneeded=()=>q.result.createObjectStore('world');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});await new Promise((resolve,reject)=>{const tx=db.transaction('world','readwrite');tx.objectStore('world').put(w,'current');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}
test('two IDB tabs serialize fresh claims; stale token and a reloaded tab cannot double-credit',async()=>{
 const indexedDB=new IDBFactory();await seed(indexedDB,ready());const a=await openGameStore({indexedDB}),b=await openGameStore({indexedDB});
 const token=economyToken(await a.transact(w=>w));let first,second;await Promise.all([a.transact(w=>{first=claimHouseholdIncome(w,token,NOW);return w;}),b.transact(w=>{second=claimHouseholdIncome(w,token,NOW);return w;})]);
 assert.equal(first.goldAward+second.goldAward,30);assert.equal((await b.transact(w=>w)).economy.gold,30);a.close();b.close();
 const c=await openGameStore({indexedDB});assert.equal((await c.transact(w=>{assert.equal(claim(w).goldAward,0);return w;})).economy.gold,30);c.close();
});
test('IDB failed transaction rolls back both receipt and Gold',async()=>{
 const indexedDB=new IDBFactory();await seed(indexedDB,ready());const s=await openGameStore({indexedDB});
 await assert.rejects(s.transact(w=>{claim(w);throw new Error('simulated failure');}),/simulated failure/);
 const w=await s.transact(w=>w);assert.equal(w.economy.gold,0);assert.equal(w.economy.household.lastClaimedDay,null);s.close();
});
test('raw v12 migration backup is exact and independent of reset and previous v11 backup',async()=>{
 const indexedDB=new IDBFactory(),old=legacy(ready());await seed(indexedDB,old);const s=await openGameStore({indexedDB});const w=await s.transact(w=>w);
 assert.deepEqual(await s.migrationBackup(12),old);assert.equal(await s.migrationBackup(11),null);await s.resetWorld(w.worldId);assert.deepEqual(await s.migrationBackup(12),old);assert.equal(await s.hasResetBackup(),true);s.close();
});
test('locked-local failed writes leave wallet and receipt together, then retry succeeds',async()=>{
 const values=new Map([[STORAGE_KEY,JSON.stringify(ready())]]);let fail=false;
 const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(fail&&k===STORAGE_KEY)throw new Error('quota');values.set(k,v);},removeItem:k=>values.delete(k)};
 const s=await openGameStore({localStorage:storage,navigator:{locks:{request:async(k,fn)=>fn()}}});fail=true;await assert.rejects(s.transact(w=>{claim(w);return w;}),/quota/);assert.equal(JSON.parse(values.get(STORAGE_KEY)).economy.gold,0);assert.equal(JSON.parse(values.get(STORAGE_KEY)).economy.household.lastClaimedDay,null);
 fail=false;assert.equal((await s.transact(w=>{claim(w);return w;})).economy.gold,30);s.close();
});
test('one, two and six residents earn30/day for30 days with or without caretaker',()=>{
 for(const count of [1,2,6])for(const auto of [false,true]){
  const w=ready();for(let i=1;i<count;i++)createBird(w,{home:'resident'});
  w.economy.gold=w.economy.lifetimeGold=10000;
  for(let day=0;day<30;day++){
   const at=NOW+day*DAY;advanceTo(w,at);
   if(auto){const remaining=(w.lifecycle.caretaker?.until??0)-at;if(remaining<=0)hireCaretaker(w,1,economyToken(w),at);}
   else for(const bird of w.birds.filter(b=>b.home==='resident')){while(bird.needs.food<100)feedBird(w,bird.id,at,economyToken(w));while(bird.needs.energy<100)petBird(w,bird.id,at,economyToken(w));}
   assert.equal(claim(w,at).goldAward,30,`${count} birds, caretaker=${auto}, day${day}`);
  }
  assert.equal(w.economy.gold,10000+900-(auto?720:0));validateWorld(w);
 }
});
test('whole-world replacement restores receipt together with its corresponding wallet',async()=>{
 const indexedDB=new IDBFactory();await seed(indexedDB,ready());const s=await openGameStore({indexedDB});
 const received=await s.transact(w=>{claim(w);return w;});const restored=await s.replaceWorld(received.worldId,received,NOW);
 assert.equal(restored.economy.gold,30);assert.deepEqual(restored.economy.household,received.economy.household);assert.equal(claim(restored).goldAward,0);s.close();
});
test('local v12 migration preserves exact wrapper and keeps original v11 and reset copies',async()=>{
 const old=legacy(ready()),backup=legacy(ready(NOW-DAY)),raw=JSON.stringify({format:'buncho-world-with-reset-backup-v1',current:old,backup});
 const values=new Map([[STORAGE_KEY,raw],[STORAGE_KEY+'-migration-v11','{"keep":"old clock copy"}']]);
 const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const s=await openGameStore({localStorage:storage,navigator:{locks:{request:async(k,fn)=>fn()}}});const w=await s.transact(w=>w);
 assert.equal(values.get(STORAGE_KEY+'-migration-v12'),raw);assert.equal(values.get(STORAGE_KEY+'-migration-v11'),'{"keep":"old clock copy"}');assert.deepEqual(await s.migrationBackup(12),old);assert.equal(await s.hasResetBackup(),true);
 await s.resetWorld(w.worldId);assert.equal(values.get(STORAGE_KEY+'-migration-v12'),raw);s.close();
});
