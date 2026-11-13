import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {createWorld,createBird,advanceTo,validateWorld,feedBird,petBird,claimCareBase,economyToken,parseSave,serializeWorld,readCompatibleWorld,prepareWorldReplacement,collectDropping,reconcileImportedCare} from '../src/engine.js';
import {syncRelaxedCare,validateRelaxedCare,relaxedBird,protectAbsentCare} from '../src/care-rules.js';
import {openGameStore} from '../src/game-store.js';
import {careFamily} from '../src/family-care.js';
const DAY=86400000,NOW=Date.parse('2026-11-12T12:00:00+09:00');
function world(){const w=createWorld(NOW);w.paused=true;for(const b of w.birds)b.needs.food=b.needs.energy=100;return w;}
test('24/48 hours, fractional reloads and 137 split updates produce identical bounded bars',()=>{
 const a=world(),b=world();advanceTo(a,NOW+DAY);assert.equal(a.birds[0].needs.food,70);
 for(let i=1;i<=137;i++)syncRelaxedCare(b,NOW+Math.floor(DAY*i/137));assert.equal(b.birds[0].needs.food,70);assert.deepEqual(b.careRules,a.careRules);
 const c=parseSave(serializeWorld(b));advanceTo(c,NOW+2*DAY);assert.equal(c.birds[0].needs.food,40);advanceTo(c,NOW+50*DAY);assert.equal(c.birds[0].needs.food,40);assert.equal(c.lifecycle.birds[0].death,null);validateWorld(c);
});
test('low old values stay low, newcomers/nestlings are not charged for time before joining/growth',()=>{
 const w=world();w.birds[0].needs.food=20;syncRelaxedCare(w,NOW+DAY);assert.equal(w.birds[0].needs.food,20);
 const b=createBird(w,{home:'resident'});b.needs.food=100;syncRelaxedCare(w,NOW+DAY);assert.equal(b.needs.food,100);
 const chick=createBird(w,{home:'resident',stage:'chick'});syncRelaxedCare(w,NOW+2*DAY);chick.stage='juvenile';chick.needs.food=100;syncRelaxedCare(w,NOW+2*DAY);assert.equal(chick.needs.food,100);
});
test('paid intervals restore bars and only post-contract time decays, including split updates',()=>{
 const a=world(),b=world();for(const w of [a,b])w.lifecycle.caretaker={fromAt:NOW,until:NOW+DAY};
 syncRelaxedCare(a,NOW+DAY*2);for(let i=1;i<=8;i++)syncRelaxedCare(b,NOW+DAY*i/4);assert.equal(a.birds[0].needs.food,70);assert.deepEqual(a.careRules,b.careRules);assert.deepEqual(a.birds[0].needs,b.birds[0].needs);
});
test('one household base receipt ignores bars, bird count and caretaker and remains unique across two tabs/reloads',async()=>{
 const indexedDB=new IDBFactory(),a=await openGameStore({indexedDB}),b=await openGameStore({indexedDB});try{
 const w=world();createBird(w,{home:'resident'});w.birds[0].needs.food=10;await a.transact(()=>w);const token=economyToken(w);let total=0;
 await Promise.all([a,b].map(s=>s.transact(w=>{total+=claimCareBase(w,token,NOW).gemAward||0;return w;})));assert.equal(total,30);const saved=await a.transact(w=>w);assert.equal(saved.decor.points,w.decor.points+30);assert.equal(claimCareBase(saved,economyToken(saved),NOW).gemAward,0);
 assert.equal(claimCareBase(saved,economyToken(saved),NOW+DAY).gemAward,30);validateWorld(saved);
 }finally{a.close();b.close();}
});
test('recovery and drops share 10 extra Gems, tiny care cannot farm the ledger and full reactions never feed',()=>{
 const w=world(),b=w.birds[0];b.needs.food=b.needs.energy=40;let earned=0;
 for(let i=0;i<3;i++)earned+=feedBird(w,b.id,NOW).gemAward;for(let i=0;i<3;i++)earned+=petBird(w,b.id,NOW).gemAward;assert.equal(earned,10);
 const life=structuredClone(w.lifecycle.birds[0]),points=w.decor.points;for(let i=0;i<100;i++)feedBird(w,b.id,NOW);assert.deepEqual(w.lifecycle.birds[0],life);assert.equal(w.decor.points,points);
 w.gems.droppings=[{id:'drop-1',birdId:'b1',createdTick:0,location:'home'}];w.gems.nextDropId=2;assert.equal(collectDropping(w,'drop-1',w.revision).gemAward,0);assert.equal(w.gems.droppings.length,0);
 const a=world(),c=world();for(const x of [a,c])x.birds[0].needs.food=99;
 assert.equal(feedBird(a,'b1',NOW).gemAward,0);assert.equal(a.careRules.extraRemainder,6*DAY);assert.equal(feedBird(a,'b1',NOW).gemAward,0);
});
test('single and family care have identical recovery and shared rewards',()=>{
 const a=world();for(let i=0;i<5;i++)createBird(a,{home:'resident'});for(const b of a.birds)b.needs.food=80;const c=structuredClone(a);const r=careFamily(a,'feed',economyToken(a),NOW);
 let earned=0;for(const b of c.birds)earned+=feedBird(c,b.id,NOW,economyToken(c)).gemAward;assert.equal(r.gemAward,10);assert.equal(earned,10);assert.deepEqual(a,c);
});
test('absence protects healthy, already ill and contract-expired birds, preserves original health stamps and never revives graves',()=>{
 for(const sick of [false,true]){const w=world(),life=w.lifecycle.birds[0];if(sick)life.condition={kind:'injury',sinceAt:NOW,deadlineAt:NOW+DAY};const original=structuredClone(life);advanceTo(w,NOW+4*DAY);assert.equal(life.death,null);assert.equal(life.lastCareAt,original.lastCareAt);assert.deepEqual(life.condition,original.condition);assert.equal(relaxedBird(w,'b1').healthGraceUntil,NOW+5*DAY);validateWorld(w);}
 const w=world();w.lifecycle.caretaker={fromAt:NOW,until:NOW+DAY};advanceTo(w,NOW+5*DAY);assert.equal(w.lifecycle.birds[0].death,null);
 const active=world();advanceTo(active,NOW+3*DAY,{present:true});assert.equal(active.lifecycle.birds[0].death.cause,'neglect');const grave=structuredClone(active.lifecycle.birds[0]);advanceTo(active,NOW+8*DAY);assert.deepEqual(active.lifecycle.birds[0],grave);
});
test('migration happens once from its actual timestamp, keeps values and known deadlines, and rejects malformed/future data',()=>{
 const old=world();delete old.careRules;old.version=15;delete old.collectionEndings;delete old.leafEvent;delete old.expedition;const before=structuredClone(old);const w=readCompatibleWorld(old,NOW+DAY);assert.deepEqual(old,before);assert.equal(w.version,19);assert.equal(w.careRules.startedAt,NOW+DAY);assert.deepEqual(w.birds,old.birds);assert.deepEqual(w.lifecycle,old.lifecycle);assert.equal(w.decor.points,old.decor.points);assert.deepEqual(readCompatibleWorld(w,NOW+2*DAY),w);
 const broken=structuredClone(w);broken.careRules.birds[0].foodRemainder=DAY;assert.throws(()=>validateWorld(broken));const future=structuredClone(w);future.careRules.version=2;assert.throws(()=>validateWorld(future));
});
test('same-world stale import cannot reopen rewards and different worlds keep their own ledgers',()=>{
 const current=world(),incoming=structuredClone(current);claimCareBase(current,economyToken(current),NOW);current.birds[0].needs.food=80;feedBird(current,'b1',NOW);const before=structuredClone(current);reconcileImportedCare(incoming,current,NOW);assert.equal(claimCareBase(incoming,economyToken(incoming),NOW).gemAward,0);assert.equal(incoming.careRules.extraUsed,current.careRules.extraUsed);assert.deepEqual(current,before);
 const other=world();other.worldId+='other';reconcileImportedCare(other,current,NOW);assert.equal(other.careRules.lastBaseDay,null);
 const replacement=prepareWorldReplacement(current,before,NOW+DAY,'replacement');assert.equal(replacement.careRules.lastBaseDay,replacement.careRules.day);validateWorld(replacement);
});
test('clock rollback neither refills nor reopens receipts; huge future jump is bounded',()=>{
 const w=world();claimCareBase(w,economyToken(w),NOW);syncRelaxedCare(w,NOW+DAY);const before=structuredClone(w);assert.equal(syncRelaxedCare(w,NOW).rollback,true);assert.deepEqual(w,before);
 syncRelaxedCare(w,253402268399999);assert.equal(w.birds[0].needs.food,40);validateRelaxedCare(w);
});

test('v15 originals are backed up independently and failed migration writes leave original bytes intact',async()=>{
 const raw=world();raw.version=15;delete raw.collectionEndings;delete raw.leafEvent;delete raw.expedition;delete raw.careRules;
 const indexedDB=new IDBFactory();const db=await new Promise((resolve,reject)=>{const q=indexedDB.open('buncho-ureshi-garden-v1',1);q.onupgradeneeded=()=>q.result.createObjectStore('world');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});
 await new Promise((resolve,reject)=>{const tx=db.transaction('world','readwrite');tx.objectStore('world').put(raw,'current');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();
 const store=await openGameStore({indexedDB});try{await assert.rejects(store.transact(()=>{throw Error('abort');}));assert.equal(await store.migrationBackup(15),null);const next=await store.transact(w=>w);assert.equal(next.version,19);assert.deepEqual(await store.migrationBackup(15),raw);}finally{store.close();}
 const bytes=JSON.stringify(raw),values=new Map([['buncho-ureshi-world-v1',bytes]]);let fail=true;
 const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(fail&&k==='buncho-ureshi-world-v1')throw Error('quota');values.set(k,v);},removeItem:k=>values.delete(k)};
 const local=await openGameStore({localStorage:storage,navigator:{locks:{request:async(_key,fn)=>fn()}}});try{await assert.rejects(local.transact(w=>w),/quota/);assert.equal(values.get('buncho-ureshi-world-v1'),bytes);fail=false;await local.transact(w=>w);assert.deepEqual(await local.migrationBackup(15),raw);}finally{local.close();}
});

test('inactive foreground sessions get the same nonfatal protection as a returning tab',async()=>{
 const {advanceObservedWorld}=await import('../src/away-session.js');const w=world();w.lifecycle.birds[0].condition={kind:'injury',sinceAt:NOW,deadlineAt:NOW+DAY};
 advanceObservedWorld(w,NOW+2*DAY,{returning:false,active:false});assert.equal(w.lifecycle.birds[0].death,null);assert.equal(w.careRules.birds[0].healthGraceUntil,NOW+3*DAY);validateWorld(w);
});

test('an eight-Gem dropping consumes only the remaining four extra Gems and still clears the drop',()=>{
 const w=world();w.birds[0].needs.food=80;feedBird(w,'b1',NOW);assert.equal(w.careRules.extraUsed,6);w.gems.droppings=[{id:'drop-1',birdId:'b1',createdTick:0,location:'home'}];w.gems.nextDropId=2;
 assert.equal(collectDropping(w,'drop-1',w.revision,NOW).gemAward,4);assert.equal(w.careRules.extraUsed,10);assert.equal(w.gems.droppings.length,0);
});

for(const days of [7,28])test(`actual engine fairness matrix for ${days} days: household size, visits and caretaker`,async()=>{
 const {hireCaretaker}=await import('../src/engine.js');const START=Date.parse('2026-11-16T00:00:00+09:00');
 for(const birds of [1,6])for(const visits of [1,3])for(const caretaker of [false,true]){
  const w=createWorld(START);w.paused=true;for(let i=1;i<birds;i++)createBird(w,{home:'resident'});for(const b of w.birds)b.needs.food=b.needs.energy=100;w.economy.gold=w.economy.lifetimeGold=days*24;
  if(caretaker)for(let d=0;d<days;d+=7)assert.equal(hireCaretaker(w,7,economyToken(w),START).changed,true);
  let base=0,extra=0;
  for(let d=0;d<days;d++)for(const hour of visits===1?[21]:[8,18,21]){
   const at=START+d*DAY+hour*3600000;advanceTo(w,at);base+=claimCareBase(w,economyToken(w),at).gemAward;
   for(const kind of ['feed','pet'])for(let n=0;n<5;n++){const r=careFamily(w,kind,economyToken(w),at);extra+=r.gemAward;if(!r.changed)break;}
   assert(w.careRules.extraUsed<=10);assert.equal(w.lifecycle.birds.some(s=>s.death),false);
  }
  assert.equal(base,days*30);assert.equal(extra,caretaker?0:days*10);assert.equal(w.decor.points,20+base+extra);assert.equal(w.economy.gold,caretaker?0:days*24);assert.equal(w.economy.household.lastClaimedDay,null);validateWorld(w);
 }
});

test('a return just before a known treatment deadline still provides a full day without rewriting diagnosis stamps',()=>{
 const w=world(),s=w.lifecycle.birds[0];s.condition={kind:'injury',sinceAt:NOW,deadlineAt:NOW+DAY};const diagnosis=structuredClone(s.condition);
 advanceTo(w,NOW+DAY-60000);assert.equal(s.death,null);assert.deepEqual(s.condition,diagnosis);assert.equal(w.careRules.birds[0].healthGraceUntil,NOW+2*DAY-60000);validateWorld(w);
 const max=253402268399999,x=createWorld(max-2*DAY);x.paused=true;advanceTo(x,max);assert.equal(x.lifecycle.birds[0].death,null);validateWorld(x);
});

test('successful feeding removes the return-grace prompt when the ordinary food deadline is later and no illness remains',async()=>{
 const {renderLifeCarePanel}=await import('../src/life-care-ui.js');const w=world(),at=NOW+4*DAY;advanceTo(w,at);assert.match(renderLifeCarePanel(w),/data-return-care/);
 for(let i=0;i<3;i++)feedBird(w,'b1',at);assert.equal(w.lifecycle.birds[0].lastCareAt,at);assert.doesNotMatch(renderLifeCarePanel(w),/data-return-care/);
 w.lifecycle.birds[0].condition={kind:'injury',sinceAt:NOW,deadlineAt:NOW+DAY};assert.match(renderLifeCarePanel(w),/data-return-care/);validateWorld(w);
});
