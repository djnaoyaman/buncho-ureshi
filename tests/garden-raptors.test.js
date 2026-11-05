import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {createWorld,createBird,validateWorld,readCompatibleWorld,serializeWorld,parseSave,advanceGardenRaptor} from '../src/engine.js';
import {lifeStatus} from '../src/life-care.js';
import {renderMemorialPanel} from '../src/life-care-ui.js';
import {openGameStore} from '../src/game-store.js';
import {arriveGardenCrow} from '../src/garden-crows.js';
import {RAPTOR_SPECIES,RAPTOR_RULES,initialRaptorState,raptorToken,arriveGardenRaptor,escapeGardenRaptor,petGardenRaptor,raptorFriendship,raptorCoolingDown,raptorScene,createGardenRaptorClock} from '../src/garden-raptors.js';
const NOW=Date.UTC(2026,10,4),id='black-kite';
const token=w=>({...raptorToken(w),gardenId:w.encounters.garden.id});
function fixture(){const w=createWorld(NOW,42);w.encounters.garden.open=true;w.field.place='park';return w;}
function arrive(w,id='black-kite',now=NOW){return arriveGardenRaptor(w,id,now,token(w));}
function run(w,start=NOW,count=60){for(let i=1;i<=count;i++)advanceGardenRaptor(w,1000,start+i*1000,token(w));}
test('arrival records nine separate species without world randomness, damage or economy changes',()=>{
 const w=fixture(),before=structuredClone(w);assert.equal(RAPTOR_SPECIES.length,9);assert.equal(arrive(w).hostile,true);
 assert.equal(w.encounters.raptor.active.remainingMs,60000);const p=structuredClone(w);p.revision=before.revision;p.encounters.raptor=before.encounters.raptor;assert.deepEqual(p,before);validateWorld(w);assert.deepEqual(parseSave(serializeWorld(w)),w);
});
test('visible minute expires at zero, creates accident grave and formally transfers to eldest child',()=>{
 const w=fixture(),father=createBird(w,{sex:'male',home:'resident'});w.tick=10;const child=createBird(w,{parents:['b1',father.id],generation:1,home:'resident'});const assets=structuredClone({economy:w.economy,decor:w.decor}),ids=w.birds.map(b=>b.id);arrive(w);run(w,NOW,59);assert.equal(lifeStatus(w,'b1').death,null);assert.equal(w.encounters.raptor.active.remainingMs,1000);
 const result=advanceGardenRaptor(w,1000,NOW+60000,token(w));assert.equal(result.death,true);assert.equal(lifeStatus(w,'b1').death.cause,'accident');assert.equal(w.protagonist.birdId,child.id);assert.equal(w.encounters.raptor.active,null);assert.deepEqual(w.birds.map(b=>b.id),ids);assert.deepEqual({economy:w.economy,decor:w.decor},assets);assert.equal(w.events.filter(e=>e.kind==='death').length,1);assert.equal(w.events.filter(e=>e.kind==='succession').length,1);assert.match(renderMemorialPanel(w),/事故死/);validateWorld(w);assert.deepEqual(parseSave(serializeWorld(w)),w);
});
test('no heir keeps identity and grave; stale expiry cannot kill twice or kill another bird',()=>{
 const w=fixture();createBird(w,{home:'resident'});arrive(w);run(w,NOW,59);const t=token(w);advanceGardenRaptor(w,1000,NOW+60000,t);const before=structuredClone(w);assert.equal(advanceGardenRaptor(w,1000,NOW+60000,t).reason,'stale');assert.deepEqual(w,before);assert.equal(w.protagonist.birdId,'b1');assert.equal(lifeStatus(w,'b2').death,null);validateWorld(w);
});
test('reload retains exact remaining time; hidden gaps never turn into catch-up',()=>{
 let w=fixture();arrive(w);run(w,NOW,12);w=parseSave(serializeWorld(w));assert.equal(w.encounters.raptor.active.remainingMs,48000);
 for(const elapsed of [0,-1,2501,86400000,NaN])assert.equal(advanceGardenRaptor(w,elapsed,NOW+86400000,token(w)).changed,false);
 advanceGardenRaptor(w,1000,NOW+86401000,token(w));assert.equal(w.encounters.raptor.active.remainingMs,47000);validateWorld(w);
});
test('stale progress and overlapping fresh tab samples never double-charge wall intervals',()=>{
 const w=fixture();arrive(w);const t=token(w);advanceGardenRaptor(w,1000,NOW+1000,t);assert.equal(advanceGardenRaptor(w,1000,NOW+1000,t).reason,'stale');assert.equal(advanceGardenRaptor(w,1000,NOW+1000,token(w)).changed,false);advanceGardenRaptor(w,1000,NOW+1500,token(w));assert.equal(w.encounters.raptor.active.remainingMs,58500);
});
test('normal navigation does not escape; explicit escape is immediate and retains daily cap',()=>{
 const w=fixture();arrive(w);w.encounters.garden.open=false;w.encounters.garden.id='komugi';advanceGardenRaptor(w,1000,NOW+1000,token(w));assert.equal(w.encounters.raptor.active.remainingMs,59000);assert.equal(escapeGardenRaptor(w,token(w)).escaped,true);assert.equal(w.field.place,'home');assert.equal(raptorCoolingDown(w,NOW-1),true);assert.equal(raptorCoolingDown(w,NOW+86400000-1),true);assert.equal(raptorCoolingDown(w,NOW+86400000),false);w.encounters.garden.open=true;assert.equal(arrive(w,'golden-eagle',NOW+86400000-1).reason,'cooldown');assert.equal(arrive(w,'golden-eagle',NOW+86400000).changed,true);
});
test('friendship at exactly 100 is species-specific and safely ends current threat',()=>{
 const w=fixture();assert.equal(petGardenRaptor(w,id,8,token(w)).reason,'locked');arrive(w);for(let i=0;i<12;i++)petGardenRaptor(w,id,8,token(w));petGardenRaptor(w,id,3,token(w));assert.equal(raptorFriendship(w,id).friendly,false);petGardenRaptor(w,id,1,token(w));assert.equal(raptorScene(w).hostile,false);assert.equal(w.encounters.raptor.active.remainingMs,18000);run(w,NOW,18);assert.equal(lifeStatus(w,'b1').death,null);w.encounters.garden.open=true;assert.equal(arrive(w,id,NOW+86400000).hostile,false);escapeGardenRaptor(w,token(w));w.encounters.garden.open=true;assert.equal(arrive(w,'golden-eagle',NOW+2*86400000).hostile,true);validateWorld(w);
});
test('osprey only visits water and never threatens even with no friendship',()=>{
 const w=fixture(),before=structuredClone(w);assert.equal(arrive(w,'osprey').changed,false);assert.deepEqual(w,before);w.encounters.garden.id='mizukagami';assert.equal(arrive(w,'osprey').hostile,false);run(w,NOW,18);assert.equal(lifeStatus(w,'b1').death,null);assert.equal(w.encounters.raptor.active,null);validateWorld(w);
});
test('current crow visit atomically blocks raptor without spending daily arrival',()=>{
 const w=fixture();arriveGardenCrow(w,'large-billed-crow',NOW,token(w));const before=structuredClone(w);assert.equal(arrive(w).reason,'busy');assert.deepEqual(w,before);
});
test('target identity never follows a replacement protagonist',()=>{
 const w=fixture();arrive(w);w.birds[0].home='departed';const b=createBird(w,{home:'resident'});assert.equal(raptorScene(w),null);advanceGardenRaptor(w,1000,NOW+1000,token(w));assert.equal(w.encounters.raptor.active,null);assert.equal(lifeStatus(w,b).death,null);
});
test('v7 migration is additive and all malformed or unknown raptor fields reject',()=>{
 const old=fixture();old.encounters.version=7;for(const id of ["java-rice","bali-terrace","paris-unrest"])delete old.encounters.garden.visits[id];delete old.encounters.raptor;const before=structuredClone(old),w=readCompatibleWorld(old,NOW);assert.deepEqual(old,before);assert.equal(w.encounters.version,9);assert.deepEqual(w.encounters.raptor,initialRaptorState());arrive(w);
 for(const alter of [s=>s.extra=1,s=>s.lastArrivalAt=-1,s=>s.active.extra=1,s=>s.active.targetBirdId='b999',s=>s.active.eventId='other',s=>s.active.lastProgressAt=NOW-1,s=>s.active.remainingMs=0,s=>s.active.remainingMs=60001,s=>s.active.hostile='yes',s=>s.active.hostile=false,s=>s.visits.push({...s.visits[0]}),s=>s.visits[0].petPoints=-1,s=>s.visits[0].petPoints=100,s=>s.active.speciesId='unknown']){const bad=structuredClone(w);alter(bad.encounters.raptor);assert.throws(()=>validateWorld(bad));}
});
test('clock is rare, continuous, garden-scoped, and excludes osprey away from water',()=>{
 for(const gardenId of ['komorebi','mizukagami']){let calls=0;const c=createGardenRaptorClock({earlyVisit:false,random:()=>++calls%2?0:.999});let result;for(let n=0;n<=120000;n+=1000)result=c.sample({key:gardenId,now:n,eligible:true,gardenId})||result;assert.equal(result.kind,'arrive');assert.equal(result.id=== 'osprey',gardenId==='mizukagami');assert.equal(calls,2);}
 let calls=0;const c=createGardenRaptorClock({earlyVisit:false,random:()=>{calls++;return .01;}});for(let n=0;n<=180000;n+=1000)c.sample({key:'a',now:n,eligible:true});assert.equal(calls,2);c.sample({key:'a',now:190000,eligible:true});assert.equal(c.elapsed,0);c.sample({key:'a',now:191000,eligible:false});assert.equal(c.elapsed,0);
});
test('two atomic stores commit one arrival and one countdown interval',async()=>{
 const indexedDB=new IDBFactory(),a=await openGameStore({indexedDB}),b=await openGameStore({indexedDB});try{
 await a.transact(()=>fixture());const results=[];await Promise.all([a,b].map(store=>store.transact(w=>{results.push(arrive(w));return w;})));assert.equal(results.filter(r=>r.changed).length,1);
 await Promise.all([a,b].map(store=>store.transact(w=>{advanceGardenRaptor(w,1000,NOW+1000,token(w));return w;})));const w=await a.transact(w=>w);assert.equal(w.encounters.raptor.active.remainingMs,59000);validateWorld(w);
 }finally{a.close();b.close();}
});

test('safe visits remain in their arrival garden while danger follows the protagonist',()=>{
 for(const speciesId of ['osprey','black-kite']){
  const w=fixture();w.encounters.garden.id='mizukagami';arrive(w,speciesId);
  if(speciesId==='black-kite')for(let i=0;i<13;i++)petGardenRaptor(w,speciesId,8,token(w));
  assert.equal(raptorScene(w).hostile,false);const saved=structuredClone(w.encounters.raptor);
  w.encounters.garden.id='komugi';assert.equal(raptorScene(w),null);assert.deepEqual(w.encounters.raptor,saved);
  advanceGardenRaptor(w,1000,NOW+1000,token(w));assert.equal(w.encounters.raptor.active.remainingMs,17000);
  w.encounters.garden.id='mizukagami';assert.equal(raptorScene(w).remainingMs,17000);
  w.encounters.garden.id='komugi';run(w,NOW+1000,17);assert.equal(w.encounters.raptor.active,null);assert.equal(lifeStatus(w,'b1').death,null);validateWorld(w);
 }
 const w=fixture();arrive(w);w.encounters.garden.id='komugi';assert.equal(raptorScene(w).hostile,true);assert.equal(raptorScene(w).targetBirdId,'b1');run(w,NOW,60);assert.equal(lifeStatus(w,'b1').death.cause,'accident');validateWorld(w);
});
