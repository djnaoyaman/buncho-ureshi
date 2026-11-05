import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {createWorld,createBird,petBird,validateWorld,readCompatibleWorld,parseSave,serializeWorld} from '../src/engine.js';
import {openGameStore,DB_NAME} from '../src/game-store.js';
import {GARDEN_IDS} from '../src/data/gardens.js';
import {CROW_RULES,CROW_SPECIES,initialCrowState,validateCrowState,createGardenCrowClock,arriveGardenCrow,crowCoolingDown,crowScene,petGardenCrow,crowFriendship} from '../src/garden-crows.js';
import {renderCrowNotebook,renderCrowFriendship,renderCrowNotice} from '../src/garden-crow-ui.js';
import {Window} from 'happy-dom';
import {syncLifecycle,lifeStatus,LIFE_RULES} from '../src/life-care.js';
const now=Date.UTC(2026,10,4,9),id=CROW_SPECIES[0].id;
const token=w=>({worldId:w.worldId,revision:w.revision,gardenId:w.encounters.garden.id});
function fixture(){const w=createWorld(now,42);w.encounters.garden.open=true;w.field.place='park';return w;}
function sample(clock,time,options={}){return clock.sample({key:'world:garden',now:time,eligible:true,...options});}
function run(clock,start,end,options={}){let result;for(let t=start;t<=end;t+=1000){const r=sample(clock,t,options);if(r)result=r;}return result;}
test('crow clock waits 120 continuous seconds, warns for six seconds, then fires once',()=>{
 let calls=0;const clock=createGardenCrowClock({earlyVisit:false,random:()=>{calls++;return 0;}});
 assert.equal(run(clock,0,119000),undefined);assert.equal(calls,0);
 assert.deepEqual(sample(clock,120000),{kind:'warning',id});assert.equal(clock.warning,id);
 assert.equal(run(clock,121000,125000),undefined);
 assert.deepEqual(sample(clock,126000),{kind:'arrive',id});assert.equal(clock.warning,null);
 assert.equal(run(clock,127000,180000),undefined);assert.equal(calls,2);
});
test('20 percent boundary and fifteen-second retry never consume world RNG',()=>{
 let calls=0;const values=[.2,.199999,.99];const clock=createGardenCrowClock({earlyVisit:false,random:()=>{calls++;return values.shift();}});
 assert.equal(run(clock,0,120000),undefined);assert.equal(calls,1);
 assert.equal(run(clock,121000,134000),undefined);assert.equal(calls,1);
 assert.deepEqual(sample(clock,135000),{kind:'warning',id:CROW_SPECIES.at(-1).id});assert.equal(calls,3);
});
test('ineligible, changed garden/world, suspended or backwards clock resets the full dwell',()=>{
 for(const interrupt of [c=>sample(c,119500,{eligible:false}),c=>sample(c,120000,{key:'other:garden'}),c=>sample(c,122000),c=>sample(c,118000),c=>sample(c,NaN)]){
  const clock=createGardenCrowClock({earlyVisit:false,random:()=>0});run(clock,0,119000);interrupt(clock);
  sample(clock,123000);const due=123000+CROW_RULES.dwellMs-clock.elapsed;assert.ok(clock.elapsed<=1000);assert.equal(run(clock,124000,due-1000),undefined);
  assert.equal(sample(clock,due)?.kind,'warning');
 }
});
test('canceled warning cannot fire, unavailable state suppresses arrivals',()=>{
 for(const interruption of [{eligible:false},{available:false}]){
  const clock=createGardenCrowClock({earlyVisit:false,random:()=>0});run(clock,0,120000);assert.equal(clock.warning,id);
  sample(clock,121000,interruption);assert.equal(clock.warning,null);
  assert.equal(run(clock,122000,126000),undefined);
 }
});
test('long timer gaps cancel warnings rather than completing offline',()=>{
 const clock=createGardenCrowClock({earlyVisit:false,random:()=>0});run(clock,0,120000);
 assert.equal(sample(clock,120000+CROW_RULES.maxSampleGapMs+1),null);assert.equal(clock.warning,null);assert.equal(clock.elapsed,0);
});
test('arrival changes only b1 energy, crow observations and revision',()=>{
 const w=fixture();createBird(w,{home:'resident'});w.birds[0].needs.energy=73;const before=structuredClone(w);
 assert.equal(arriveGardenCrow(w,id,now,token(w)).changed,true);assert.equal(w.birds[0].needs.energy,36.5);
 const projection=structuredClone(w);projection.revision=before.revision;projection.encounters.crow=before.encounters.crow;projection.birds[0].needs.energy=before.birds[0].needs.energy;
 assert.deepEqual(projection,before);validateWorld(w);assert.deepEqual(parseSave(serializeWorld(w)),w);
 assert.equal(w.encounters.crow.visits.length,1);assert.equal(w.encounters.discoveries.length,0);
});
test('cooldown persists through reload, rejects duplicates, and expires at exactly ten minutes',()=>{
 let w=fixture();arriveGardenCrow(w,id,now,token(w));w=parseSave(serializeWorld(w));const before=structuredClone(w);
 assert.equal(crowCoolingDown(w,now-1),true);assert.equal(crowCoolingDown(w,now+599999),true);
 assert.equal(arriveGardenCrow(w,id,now+599999,token(w)).reason,'cooldown');assert.deepEqual(w,before);
 assert.equal(crowCoolingDown(w,now+600000),false);assert.equal(arriveGardenCrow(w,id,now+600000,token(w)).changed,true);
 assert.equal(w.encounters.crow.visits[0].count,2);validateWorld(w);
});
test('scene retreat is transient presentation and tied to the arrival garden',()=>{
 const w=fixture();arriveGardenCrow(w,id,now,token(w));const before=structuredClone(w);
 assert.equal(crowScene(w,now).phase,'visiting');assert.equal(crowScene(w,now+18000).phase,'quiet');assert.equal(crowScene(w,now+45000),null);assert.deepEqual(w,before);
 w.encounters.garden.id=GARDEN_IDS.find(x=>x!==w.encounters.garden.id);assert.equal(crowScene(w,now),null);
});
test('stale or inactive arrivals never mutate the world',()=>{
 for(const alter of [w=>w.paused=true,w=>w.encounters.garden.open=false,w=>w.birds[0].home='departed',w=>w.birds[0].stage='chick',w=>w.birds[0].stage='egg']){
  const w=fixture();alter(w);const before=structuredClone(w);assert.equal(arriveGardenCrow(w,id,now,token(w)).changed,false);assert.deepEqual(w,before);
 }
 for(const patch of [{worldId:'other'},{revision:-1},{gardenId:'other'}]){const w=fixture(),before=structuredClone(w);assert.equal(arriveGardenCrow(w,id,now,{...token(w),...patch}).reason,'stale');assert.deepEqual(w,before);}
});
test('five crow species use bounded, strict, independent observation records',()=>{
 assert.equal(CROW_SPECIES.length,5);assert.equal(new Set(CROW_SPECIES.map(s=>s.id)).size,5);
 const w=fixture();for(let i=0;i<5;i++)arriveGardenCrow(w,CROW_SPECIES[i].id,now+i*600000,token(w));validateWorld(w);
 for(const alter of [s=>s.extra=true,s=>s.lastArrivalAt=-1,s=>s.speciesId='unknown',s=>s.visits.push({...s.visits[0]}),s=>s.visits[0].count=0,s=>s.visits[0].lastTick=1,s=>s.gardenId='unknown']){const s=structuredClone(w.encounters.crow);alter(s);assert.throws(()=>validateCrowState(s,w.tick,GARDEN_IDS));}
 assert.throws(()=>validateCrowState({...initialCrowState(),speciesId:id},0,GARDEN_IDS));
});
test('v6 migrates purely to encounter v8 while world remains v9',()=>{
 const old=fixture();old.encounters.version=6;delete old.encounters.homeGoodbyes;for(const id of ["java-rice","bali-terrace","paris-unrest"])delete old.encounters.garden.visits[id];delete old.encounters.crow;delete old.encounters.raptor;const before=structuredClone(old),next=readCompatibleWorld(old,now);
 assert.deepEqual(old,before);assert.equal(next.version,10);assert.equal(next.encounters.version,10);assert.deepEqual(next.encounters.crow,initialCrowState());
 const projected=structuredClone(next);projected.encounters.version=6;delete projected.encounters.homeGoodbyes;for(const id of ["java-rice","bali-terrace","paris-unrest"])delete projected.encounters.garden.visits[id];delete projected.encounters.crow;delete projected.encounters.raptor;assert.deepEqual(projected,before);
 const future=structuredClone(next);future.encounters.version=11;assert.throws(()=>validateWorld(future));
});
async function seed(indexedDB,w){const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});try{await new Promise((resolve,reject)=>{const tx=db.transaction('world','readwrite');tx.objectStore('world').put(w,'current');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
test('two stores migrate once and atomically allow only one arrival despite fresh guards',async()=>{
 const indexedDB=new IDBFactory(),old=fixture();old.encounters.version=6;delete old.encounters.homeGoodbyes;for(const id of ["java-rice","bali-terrace","paris-unrest"])delete old.encounters.garden.visits[id];delete old.encounters.crow;delete old.encounters.raptor;await seed(indexedDB,old);
 const a=await openGameStore({indexedDB}),b=await openGameStore({indexedDB});try{
  const migrated=await a.transact(w=>w);assert.equal(migrated.encounters.version,10);assert.equal(migrated.revision,old.revision);
  const results=[];await Promise.all([a,b].map(store=>store.transact(w=>{results.push(arriveGardenCrow(w,id,now,token(w)));return w;})));
  assert.equal(results.filter(r=>r.changed).length,1);assert.equal(results.filter(r=>r.reason==='cooldown').length,1);
  const persisted=await b.transact(w=>w);assert.equal(persisted.birds[0].needs.energy,old.birds[0].needs.energy/2);assert.equal(persisted.encounters.crow.visits[0].count,1);assert.equal(persisted.revision,old.revision+1);
 }finally{a.close();b.close();}
});

test('petting is discovered-only, revision guarded, bounded and otherwise side-effect free',()=>{
 const w=fixture();assert.deepEqual(crowFriendship(w,id),{discovered:false,points:0,friendly:false});
 assert.equal(petGardenCrow(w,id,8,token(w)).reason,'locked');arriveGardenCrow(w,id,now,token(w));
 const before=structuredClone(w);for(const amount of [0,-1,9,1.1,NaN,Infinity])assert.equal(petGardenCrow(w,id,amount,token(w)).changed,false);
 assert.equal(petGardenCrow(w,id,8,{...token(w),revision:-1}).reason,'stale');assert.equal(petGardenCrow(w,id,8,{...token(w),worldId:'other'}).reason,'stale');assert.deepEqual(w,before);
 assert.equal(petGardenCrow(w,id,8,token(w)).points,8);const projection=structuredClone(w);projection.revision=before.revision;projection.encounters.crow.visits[0].petPoints=0;assert.deepEqual(projection,before);validateWorld(w);
 w.encounters.crow.visits[0].petPoints=999999;assert.equal(petGardenCrow(w,id,8,token(w)).points,1000000);assert.equal(petGardenCrow(w,id,1,token(w)).reason,'full');validateWorld(w);
});
test('friendship threshold100 ends retreat and later friendly arrivals preserve energy after reload',()=>{
 let w=fixture();arriveGardenCrow(w,id,now,token(w));for(let i=0;i<12;i++)petGardenCrow(w,id,8,token(w));petGardenCrow(w,id,3,token(w));
 assert.equal(crowFriendship(w,id).points,99);assert.equal(crowFriendship(w,id).friendly,false);assert.equal(crowScene(w,now).retreat,true);
 const energy=w.birds[0].needs.energy;assert.equal(petGardenCrow(w,id,1,token(w)).friendly,true);assert.equal(crowScene(w,now).retreat,false);assert.equal(w.birds[0].needs.energy,energy);
 w=parseSave(serializeWorld(w));assert.equal(crowFriendship(w,id).friendly,true);assert.equal(w.encounters.crow.lastHostile,false);
 const r=arriveGardenCrow(w,id,now+600000,token(w));assert.equal(r.hostile,false);assert.equal(r.energyBefore,r.energyAfter);assert.equal(crowScene(w,now+600000).retreat,false);validateWorld(w);
 const other=CROW_SPECIES[1].id;assert.equal(arriveGardenCrow(w,other,now+1200000,token(w)).hostile,true);assert.equal(w.birds[0].needs.energy,energy/2);assert.equal(crowFriendship(w,other).points,0);
 assert.equal(petGardenCrow(w,id,1,token(w)).friendly,true);assert.equal(w.encounters.crow.lastHostile,true);
});
test('friendship record validation rejects missing, fractional, negative or oversized points and invalid hostility',()=>{
 const w=fixture();arriveGardenCrow(w,id,now,token(w));
 for(const points of [undefined,-1,1.5,1000001,NaN,Infinity]){const next=structuredClone(w);next.encounters.crow.visits[0].petPoints=points;assert.throws(()=>validateWorld(next));}
 for(const hostile of [undefined,0,'false',null]){const next=structuredClone(w);next.encounters.crow.lastHostile=hostile;assert.throws(()=>validateWorld(next));}
});
test('notebook exposes accessible petting only after discovery and friendly notice avoids damage claims',()=>{
 const w=fixture(),win=new Window();try{
  win.document.body.innerHTML=renderCrowNotebook(w,{id});assert.equal(win.document.querySelector('[data-encounter-rub]'),null);assert.equal(renderCrowFriendship(w,id),'');
  arriveGardenCrow(w,id,now,token(w));win.document.body.innerHTML=renderCrowNotebook(w,{id});
  const target=win.document.querySelector('[data-encounter-rub]');assert.equal(target.dataset.encounterRub,id);assert.equal(target.getAttribute('tabindex'),'0');assert.equal(target.getAttribute('role'),'button');assert.match(target.getAttribute('aria-label'),/Enter/);assert.ok(win.document.querySelector('[data-crow-friendship] meter'));assert.match(win.document.body.textContent,/現実の野鳥には触れず/);
  for(let i=0;i<13;i++)petGardenCrow(w,id,8,token(w));win.document.body.innerHTML=renderCrowFriendship(w,id);assert.match(win.document.body.textContent,/もう襲わない/);
  const notice=renderCrowNotice(w,{now});assert.match(notice,/なかよし/);assert.doesNotMatch(notice,/元気は半分|友達は安全な場所/);
 }finally{win.happyDOM.abort();}
});

test('crow energy loss recovers immediately in the same care slot even at both reward balance caps',()=>{
 const w=fixture();w.birds[0].needs.energy=100;w.decor.points=w.decor.lifetimePoints=1000000000;w.economy.gold=w.economy.lifetimeGold=1000000000;
 const slot=w.careSchedule.windowAt;validateWorld(w);assert.equal(arriveGardenCrow(w,id,now,token(w)).changed,true);assert.equal(w.birds[0].needs.energy,50);
 for(const energy of [70,90,100]){const r=petBird(w,'b1',now);assert.equal(r.changed,true);assert.equal(r.cooldownTicks,0);assert.equal(r.gemAward,0);assert.equal(r.goldAward,0);assert.equal(w.birds[0].needs.energy,energy);assert.equal(w.careSchedule.windowAt,slot);validateWorld(w);}
 assert.equal(petBird(w,'b1',now).reason,'full');assert.equal(w.decor.points,1000000000);assert.equal(w.economy.gold,1000000000);
});

test('death during a crow visit hides the transient scene without erasing encounters or damaging another bird',()=>{
 const w=fixture();w.tick=lifeStatus(w,'b1').ageOriginTick+LIFE_RULES.lifespanTicks-1;const other=createBird(w,{home:'resident'});arriveGardenCrow(w,id,now,token(w));
 const record=structuredClone(w.encounters.crow),otherEnergy=other.needs.energy;
 w.tick++;
 syncLifecycle(w,now+1000,{story:true});
 assert.equal(w.birds[0].home,'departed');assert.equal(crowScene(w,now+1000),null);
 assert.deepEqual(w.encounters.crow,record);assert.equal(other.needs.energy,otherEnergy);
 assert.equal(arriveGardenCrow(w,id,now+600001,token(w)).reason,'inactive');
 validateWorld(w);
});
test('crow target identity is strictly validated and scene never substitutes another resident',()=>{
 const w=fixture();arriveGardenCrow(w,id,now,token(w));assert.equal(w.encounters.crow.arrivalBirdId,'b1');
 for(const value of [null,0,'','someone','b0']){const s=structuredClone(w.encounters.crow);s.arrivalBirdId=value;assert.throws(()=>validateCrowState(s,w.tick,GARDEN_IDS));}
 w.birds[0].home='departed';createBird(w,{home:'resident'});assert.equal(crowScene(w,now),null);
});

test('undiscovered crow entries use five individual silhouettes and reveal only the encountered species',()=>{
 const w=fixture(),before=structuredClone(w),win=new Window();try{
  win.document.body.innerHTML=renderCrowNotebook(w);const shadows=[...win.document.querySelectorAll('.finch-crow-unknown img')];assert.equal(shadows.length,5);assert.equal(new Set(shadows.map(img=>img.getAttribute('src'))).size,5);
  for(const species of CROW_SPECIES){const card=win.document.querySelector(`[data-crow-entry="${species.id}"]`);assert.equal(card.disabled,true);assert.ok(card.querySelector(`.finch-crow-unknown img[src$="/${species.id}.webp"]`));assert.equal(card.querySelector('img').alt,'');assert.ok(!win.document.body.textContent.includes(species.name));}
  assert.deepEqual(w,before);arriveGardenCrow(w,id,now,token(w));win.document.body.innerHTML=renderCrowNotebook(w);assert.equal(win.document.querySelectorAll('.finch-crow-unknown').length,4);const seen=win.document.querySelector(`[data-crow-entry="${id}"]`);assert.equal(seen.disabled,false);assert.equal(seen.querySelector('.finch-crow-unknown'),null);assert.equal(seen.querySelector('img').alt,CROW_SPECIES[0].name);
 }finally{win.happyDOM.abort();}
});
