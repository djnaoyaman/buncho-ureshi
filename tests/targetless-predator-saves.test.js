import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {createWorld,createBird,readCompatibleWorld,validateWorld,serializeWorld,parseSave,advanceGardenRaptor} from '../src/engine.js';
import {arriveGardenCrow,crowScene,crowCoolingDown} from '../src/garden-crows.js';
import {arriveGardenRaptor,raptorScene,raptorTarget,raptorToken,raptorCoolingDown} from '../src/garden-raptors.js';
import {gardenCompanionRoster} from '../src/data/gardens.js';
import {lifeStatus,accidentLifeBird} from '../src/life-care.js';
import {openGameStore,DB_NAME,STORAGE_KEY} from '../src/game-store.js';

const NOW=Date.UTC(2026,10,7),clone=structuredClone;
const fresh=()=>{const w=createWorld(NOW,42);w.encounters.garden.open=true;return w;};
const token=w=>({...raptorToken(w),gardenId:w.encounters.garden.id});
const protectedState=w=>{const result=clone(w);delete result.revision;delete result.encounters.crow;delete result.encounters.raptor;return result;};
const arrive=(w,kind)=>kind==='crow'?arriveGardenCrow(w,'large-billed-crow',NOW,token(w)):arriveGardenRaptor(w,'black-kite',NOW,token(w));

for(const kind of ['crow','raptor'])test(`${kind} visits without requiring the protagonist or harming any other bird`,()=>{
  for(const condition of ['solo','other-family','departed','chick','egg','dead']){
    const w=fresh(),other=createBird(w,{home:'resident'});
    if(condition==='other-family')w.encounters.gardenFriends.attendees=[other.id];
    if(condition==='departed')w.birds[0].home='departed';
    if(condition==='chick'||condition==='egg')w.birds[0].stage=condition;
    if(condition==='dead')accidentLifeBird(w,'b1',NOW);
    const before=protectedState(w),result=arrive(w,kind);
    assert.equal(result.changed,true);assert.equal(result.hostile,false);
    assert.deepEqual(protectedState(w),before);
    if(kind==='crow'){
      assert.equal(w.encounters.crow.arrivalBirdId,null);
      assert.equal(result.energyBefore,null);assert.equal(result.energyAfter,null);
      assert.equal(crowScene(w,NOW).targetBirdId,null);
    }else{
      assert.equal(w.encounters.raptor.active.targetBirdId,null);
      assert.equal(w.encounters.raptor.active.remainingMs,18000);
      assert.equal(raptorTarget(w),null);assert.equal(raptorScene(w).phase,'visiting');
    }
  }
});

test('targetless raptor survives reload, never acquires a later attendee, and expires without damage',()=>{
  let w=fresh();arrive(w,'raptor');
  for(let i=1;i<=5;i++)advanceGardenRaptor(w,1000,NOW+i*1000,token(w));
  w=parseSave(serializeWorld(w));assert.equal(w.encounters.raptor.active.remainingMs,13000);
  w.encounters.gardenFriends.attendees=['b1'];
  assert.equal(raptorTarget(w),null);assert.deepEqual(gardenCompanionRoster(w).map(b=>b.birdId),['b1']);
  const before=protectedState(w);
  for(const elapsed of [0,-1,2501,86400000])assert.equal(advanceGardenRaptor(w,elapsed,NOW+86400000,token(w)).changed,false);
  for(let i=6;i<=18;i++){
    const result=advanceGardenRaptor(w,1000,NOW+i*1000,token(w));
    assert.ok(!result.death&&!result.deathBirdId);
  }
  assert.equal(w.encounters.raptor.active,null);assert.deepEqual(protectedState(w),before);
  assert.equal(lifeStatus(w,'b1').death,null);assert.equal(raptorCoolingDown(w,NOW+18000),true);
  assert.deepEqual(parseSave(serializeWorld(w)),w);
});

test('targetless crow keeps its saved target and phases when the protagonist joins later',()=>{
  const w=fresh();arrive(w,'crow');w.encounters.gardenFriends.attendees=['b1'];const before=clone(w);
  for(const [elapsed,phase]of [[0,'visiting'],[17999,'visiting'],[18000,'quiet'],[44999,'quiet']]){
    const scene=crowScene(w,NOW+elapsed);assert.equal(scene.phase,phase);assert.equal(scene.targetBirdId,null);assert.equal(scene.retreat,false);
  }
  assert.equal(crowScene(w,NOW+45000),null);assert.deepEqual(w,before);
  assert.equal(crowCoolingDown(w,NOW+599999),true);assert.equal(crowCoolingDown(w,NOW+600000),false);
  assert.deepEqual(parseSave(serializeWorld(w)),w);
});

test('v12 migration changes only the encounter version and preserves a pinned warning exactly',()=>{
  for(const withWarning of [false,true]){
    const old=fresh();old.encounters.gardenFriends.attendees=['b1'];
    if(withWarning){arrive(old,'raptor');advanceGardenRaptor(old,1000,NOW+1000,token(old));}
    old.encounters.version=12;const before=clone(old),expected=clone(old);expected.encounters.version=13;
    const migrated=readCompatibleWorld(old,NOW+1000);
    assert.deepEqual(old,before);assert.deepEqual(migrated,expected);
    assert.equal(migrated.version,13);assert.equal(migrated.encounters.gardenFriends.version,2);
    if(withWarning){assert.equal(migrated.encounters.raptor.active.targetBirdId,'b1');assert.equal(migrated.encounters.raptor.active.remainingMs,59000);}
  }
});

test('strict v12 schemas still reject null arrivals before any migration',()=>{
  for(const kind of ['crow','raptor']){
    const w=fresh();arrive(w,kind);w.encounters.version=12;const before=clone(w);
    assert.throws(()=>readCompatibleWorld(w));assert.deepEqual(w,before);
  }
});

test('targetless validation rejects hostility, omitted/unknown targets and inconsistent event IDs',()=>{
  for(const mutate of [
    w=>w.encounters.raptor.active.hostile=true,
    w=>delete w.encounters.raptor.active.targetBirdId,
    w=>w.encounters.raptor.active.targetBirdId='b999',
    w=>w.encounters.raptor.active.eventId=w.encounters.raptor.active.eventId.replace(':none',':null'),
    w=>w.encounters.raptor.active.remainingMs=18001,
  ]){const w=fresh();arrive(w,'raptor');mutate(w);assert.throws(()=>validateWorld(w));}
  for(const mutate of [
    w=>w.encounters.crow.lastHostile=true,
    w=>delete w.encounters.crow.arrivalBirdId,
    w=>w.encounters.crow.arrivalBirdId='b999',
  ]){const w=fresh();arrive(w,'crow');mutate(w);assert.throws(()=>validateWorld(w));}
});

async function raw(indexedDB,value){
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  try{return await new Promise((resolve,reject)=>{const tx=db.transaction('world',value===undefined?'readonly':'readwrite'),r=value===undefined?tx.objectStore('world').get('current'):tx.objectStore('world').put(value,'current');tx.oncomplete=()=>resolve(r.result);tx.onerror=tx.onabort=()=>reject(tx.error);});}finally{db.close();}
}
test('atomic and locked local stores durably migrate v12 without touching warnings or currencies',async()=>{
  const old=fresh();old.encounters.gardenFriends.attendees=['b1'];arrive(old,'raptor');old.encounters.version=12;
  const expected=clone(old);expected.encounters.version=13;
  const indexedDB=new IDBFactory();await raw(indexedDB,old);
  const a=await openGameStore({indexedDB}),b=await openGameStore({indexedDB});
  try{const results=await Promise.all([a,b].map(store=>store.transact(w=>w)));assert.deepEqual(results,[expected,expected]);assert.deepEqual(await raw(indexedDB),expected);}finally{a.close();b.close();}
  const data=new Map([[STORAGE_KEY,JSON.stringify(old)]]),localStorage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
  const store=await openGameStore({localStorage,navigator:{locks:{request:async(_name,operation)=>operation()}}});
  try{assert.deepEqual(await store.transact(w=>w),expected);assert.deepEqual(JSON.parse(data.get(STORAGE_KEY)),expected);}finally{store.close();}
});
