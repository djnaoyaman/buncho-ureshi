import {useLegacyGardenFriends} from './fixtures/legacy-garden-friends.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {Window} from 'happy-dom';
import {createWorld,economyToken,completeEncounterReward,readCompatibleWorld,validateWorld,serializeWorld,parseSave,advanceTicks} from '../src/engine.js';
import {encounterSystem as system,createEncounterSystem,ENCOUNTER_LIMITS} from '../src/encounters.js';
import {ENCOUNTER_CANDIDATES} from '../src/data/encounter-catalog.js';
import {GARDEN_IDS} from '../src/data/gardens.js';
import {pendingGardenGuestLocation} from '../src/garden-visit-sessions.js';
import {renderFinchGarden,renderEncounterNotebook,renderEncounterPage} from '../src/encounter-ui.js';
import {mountEncounterPanel} from '../src/encounter-controller.js';
import {openGameStore,DB_NAME,STORAGE_KEY} from '../src/game-store.js';
const NOW=Date.UTC(2026,10,6),clone=structuredClone;
const fresh=()=>createWorld(NOW,42);
const select=(w,id)=>system.selectGarden(w,id,economyToken(w));
const observe=(w,scene)=>system.observeGarden(w,scene,economyToken(w));
function arrive(w,garden='komugi',scene='grass'){
  select(w,garden);const result=observe(w,scene);assert.equal(result.arrived,true);
  return w.encounters.queue[0];
}
function start(w,id){assert.equal(system.open(w,id,economyToken(w)).changed,true);return clone(w.encounters.active);}
function finish(w){let result;while(w.encounters.active){const a=w.encounters.active,entry=system.catalog.find(e=>e.id===a.id);result=completeEncounterReward(w,a.instanceId,entry.steps[a.step].action,economyToken(w),NOW);}return result;}
function legacy(w){const old=clone(w);old.encounters.version=10;useLegacyGardenFriends(old);delete old.encounters.gardenSessions;return old;}
function parked(w,id='komugi'){return w.encounters.gardenSessions.find(s=>s.gardenId===id);}
async function raw(indexedDB,value){
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  try{return await new Promise((resolve,reject)=>{const tx=db.transaction('world',value?'readwrite':'readonly'),store=tx.objectStore('world');let result;const req=value?store.put(value,'current'):store.get('current');req.onsuccess=()=>{result=req.result;};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);});}finally{db.close();}
}
function dom(html=''){const win=new Window();win.document.body.innerHTML=html;return {win,root:win.document.body};}

test('each garden can receive a guest while another garden has a pending queue',()=>{
  const w=fresh(),seed=w.seed,birds=clone(w.birds),a=arrive(w),original=clone(w.encounters.garden);
  select(w,'mizukagami');assert.deepEqual(w.encounters.queue,[]);assert.equal(w.encounters.active,null);
  assert.equal(system.status(w,a).ready,true);assert.equal(system.status(w,a).gardenId,'komugi');
  const b=arrive(w,'mizukagami','water');assert.notEqual(a,b);
  assert.equal(parked(w).queue[0],a);assert.equal(w.encounters.garden.turn,1);
  select(w,'komugi');assert.deepEqual(w.encounters.queue,[a]);assert.equal(w.encounters.garden.turn,original.turn);
  assert.deepEqual(w.birds,birds);assert.equal(w.seed,seed);validateWorld(w);
});

test('two independent active conversations preserve exact instance, step and rewards through real save reload',()=>{
  let w=fresh();const a=arrive(w);start(w,a);system.act(w,w.encounters.active.instanceId,system.catalog.find(e=>e.id===a).steps[0].action,economyToken(w));const first=clone(w.encounters.active);
  const b=arrive(w,'mizukagami','water');start(w,b);assert.notEqual(w.encounters.active.instanceId,first.instanceId);
  w=parseSave(serializeWorld(w));assert.deepEqual(parked(w).active,first);assert.equal(finish(w).gemAward,5);
  const reward=w.decor.points;select(w,'komugi');assert.deepEqual(w.encounters.active,first);assert.equal(finish(w).gemAward,5);
  assert.equal(w.decor.points,reward+5);assert.deepEqual(new Set(w.economy.firstMeetingClaimed),new Set([a,b]));
  assert.equal(w.encounters.discoveries.length,2);assert.ok(w.encounters.discoveries.every(d=>d.visits===1));validateWorld(w);
});

test('completed guest stays in its own garden and reunion is immediate without extra meeting credit',()=>{
  const w=fresh(),a=arrive(w);start(w,a);finish(w);const original=clone(w.encounters.garden);
  system.leaveGarden(w,economyToken(w));select(w,'komugi');assert.equal(w.encounters.garden.scene,original.scene);
  const b=arrive(w,'mizukagami','water');assert.ok(b);select(w,'komugi');assert.equal(w.encounters.garden.lastGuest,a);
  assert.equal(observe(w,'grass').arrived,true);start(w,a);finish(w);
  assert.equal(w.encounters.discoveries.find(d=>d.id===a).visits,1);assert.equal(w.tick,0);
  advanceTicks(w,8,NOW);assert.equal(observe(w,'grass').arrived,true);start(w,a);finish(w);
  assert.equal(w.encounters.discoveries.find(d=>d.id===a).visits,2);validateWorld(w);
});

for(const kind of ['queue','active','completed'])test(`legacy switched-away ${kind} is migrated to its origin without altering player data`,()=>{
  const w=fresh(),a=arrive(w);if(kind!=='queue')start(w,a);if(kind==='active')system.act(w,w.encounters.active.instanceId,system.catalog.find(e=>e.id===a).steps[0].action,economyToken(w));if(kind==='completed')finish(w);
  const old=legacy(w);old.encounters.garden.id='mizukagami';old.encounters.garden.scene='water';old.encounters.garden.visits.mizukagami=1;const before=clone(old),pending=clone(old.encounters.active);
  const next=readCompatibleWorld(old,NOW);assert.deepEqual(old,before);assert.equal(next.version,old.version);assert.equal(next.revision,old.revision);assert.equal(next.seed,old.seed);
  assert.equal(next.encounters.version,14);assert.equal(next.encounters.garden.id,'mizukagami');assert.equal(next.encounters.garden.scene,'water');assert.equal(next.encounters.garden.nextTick,0);assert.deepEqual(next.encounters.queue,[]);
  assert.deepEqual(parked(next).active,pending);assert.deepEqual(parked(next).queue,old.encounters.queue);assert.equal(parked(next).lastGuest,old.encounters.garden.lastGuest);
  for(const key of ['birds','events','decor','economy','careSchedule','protagonist','adoption'])assert.deepEqual(next[key],old[key]);
  for(const key of ['discoveries','friendship','cageVisitors','homeClosedUntil','homeGoodbyes'])assert.deepEqual(next.encounters[key],old.encounters[key]);
  assert.deepEqual(next.encounters.gardenFriends,{...old.encounters.gardenFriends,version:2,accompany:false,attendees:[],visits:[]});
  assert.deepEqual(parseSave(serializeWorld(next)),next);assert.equal(arrive(next,'mizukagami','water').length>0,true);select(next,'komugi');
  if(kind==='active')assert.deepEqual(next.encounters.active,pending);else if(kind==='queue')assert.equal(next.encounters.queue[0],a);else assert.equal(next.encounters.garden.lastGuest,a);
  validateWorld(next);
});

test('legacy malformed state is rejected before any migration and is never repaired or mutated',()=>{
  const w=fresh();arrive(w);const old=legacy(w);old.encounters.garden.id='mizukagami';
  for(const mutate of [s=>s.queue.push('unknown'),s=>s.extra=true,s=>s.garden.turn=-1,s=>s.garden.guestGardenId='missing',s=>s.gardenSessions=[]]){const bad=clone(old);mutate(bad.encounters);const before=clone(bad);assert.throws(()=>readCompatibleWorld(bad,NOW));assert.deepEqual(bad,before);}
});

test('all gardens are bounded snapshots and same-garden resume does not consume IDs or visits',()=>{
  const w=fresh();for(const id of GARDEN_IDS)select(w,id);assert.equal(w.encounters.gardenSessions.length,GARDEN_IDS.length-1);
  const before=clone(w);assert.equal(select(w,w.encounters.garden.id).resumed,true);assert.deepEqual(w,before);assert.equal(select(w,'missing').reason,'garden');assert.deepEqual(w,before);validateWorld(w);
});

test('snapshot schema rejects unknown keys, invalid ownership, malformed scripts and duplicate pending guests or instance IDs',()=>{
  const w=fresh(),a=arrive(w);start(w,a);arrive(w,'mizukagami','water');start(w,w.encounters.queue[0]);const base=clone(w);
  const mutations=[
    s=>s.gardenSessions=null,s=>s.gardenSessions.push(null),s=>s.gardenSessions.push(clone(s.gardenSessions[0])),
    s=>s.gardenSessions[0].gardenId=s.garden.id,s=>s.gardenSessions[0].gardenId='unknown',s=>s.gardenSessions[0].extra=1,
    s=>s.gardenSessions[0].scene='unknown',s=>s.gardenSessions[0].turn=-1,s=>s.gardenSessions[0].turn=ENCOUNTER_LIMITS.activity+1,
    s=>s.gardenSessions[0].nextTurn=0,s=>s.gardenSessions[0].nextTick=1.5,s=>s.gardenSessions[0].guestGardenId=null,
    s=>s.gardenSessions[0].guestGardenId=s.garden.id,s=>s.garden.guestGardenId='komugi',s=>s.gardenSessions[0].lastGuest='unknown',
    s=>s.gardenSessions[0].queue=['unknown'],s=>s.gardenSessions[0].queue=[a],s=>s.gardenSessions[0].active.step=999,
    s=>s.gardenSessions[0].active.createdTick=1,s=>s.gardenSessions[0].active.scriptVersion=999,
    s=>s.gardenSessions[0].active.instanceId=s.active.instanceId,s=>s.gardenSessions[0].active.id=s.active.id,
    s=>s.gardenSessions[0].active.extra=true,s=>delete s.gardenSessions[0].active,
    s=>s.garden.lastGuest=s.gardenSessions[0].active.id,s=>{s.garden.lastGuest=a;s.gardenSessions[0].lastGuest=a;},
  ];
  // First stored snapshot is the empty starting garden; target the pending origin for mutations.
  base.encounters.gardenSessions=base.encounters.gardenSessions.filter(s=>s.gardenId==='komugi');
  for(const mutate of mutations){const bad=clone(base);mutate(bad.encounters);assert.throws(()=>parseSave(JSON.stringify(bad)),mutate.toString());}
  const discovered=clone(base);discovered.encounters.discoveries.push({id:system.catalog.find(e=>e.id!==a&&e.id!==base.encounters.active.id).id,firstTick:0,lastTick:0,visits:1,instanceId:base.encounters.gardenSessions[0].active.instanceId});assert.throws(()=>validateWorld(discovered));
});

test('a waiting guest cannot be duplicated by arrival or invitation in another garden or cage',()=>{
  const w=fresh(),a=arrive(w);start(w,a);finish(w);system.pet(w,a,8,economyToken(w));for(let i=0;i<11;i++)system.pet(w,a,8,economyToken(w));
  w.encounters.garden.nextTurn=1;w.encounters.garden.nextTick=0;w.encounters.queue=[a];w.encounters.garden.lastGuest=null;
  select(w,'mizukagami');const before=clone(w);assert.equal(system.inviteGarden(w,a,economyToken(w)).reason,'guest');assert.equal(system.inviteCage(w,a,economyToken(w)).reason,'guest');assert.deepEqual(w,before);
  const duplicate=clone(w);duplicate.encounters.cageVisitors.push({id:a,arrivedTick:0});assert.throws(()=>validateWorld(duplicate));
  const entries=system.catalog.filter(e=>(e.gardenEvent?.gardenIds||[]).includes('komugi')&&e.gardenEvent?.scene==='grass');
  const one=createEncounterSystem([{...entries.find(e=>e.id===a),gardenEvent:{gardenIds:['komugi','mizukagami'],scene:'grass'}}]);
  assert.equal(one.observeGarden(w,'grass',economyToken(w)).arrived,false);assert.deepEqual(w.encounters.queue,[]);validateWorld(w);
});

test('moving a completed invited friend clears its old display, without changing history or cancelling other pending scripts',()=>{
  const w=fresh(),a=arrive(w);start(w,a);finish(w);select(w,'mizukagami');
  assert.equal(system.inviteGarden(w,a,economyToken(w)).changed,true);assert.equal(parked(w).lastGuest,null);assert.equal(w.encounters.garden.lastGuest,a);
  for(let i=0;i<12;i++)system.pet(w,a,8,economyToken(w));assert.equal(system.inviteCage(w,a,economyToken(w)).changed,true);assert.equal(w.encounters.garden.lastGuest,null);
  assert.equal(w.encounters.discoveries[0].visits,1);validateWorld(w);
});

test('withheld catalog preserves inactive scripts but cannot make them runnable',()=>{
  const w=fresh(),a=arrive(w);start(w,a);select(w,'mizukagami');const held=createEncounterSystem([],{knownCatalog:ENCOUNTER_CANDIDATES}),before=clone(w);
  held.validate(w.encounters,w.tick);assert.equal(held.status(w,a).active,true);assert.equal(held.open(w,a,economyToken(w)).reason,'unknown');assert.deepEqual(w,before);
  held.selectGarden(w,'komugi',economyToken(w));const active=clone(w);assert.equal(held.act(w,w.encounters.active.instanceId,'watch',economyToken(w)).changed,false);assert.deepEqual(w,active);
});

test('paused/offline story never fabricates discoveries or consumes the family PRNG',()=>{
  const w=fresh();w.paused=true;const a=arrive(w);start(w,a);select(w,'mizukagami');const before=clone(w);advanceTicks(w,576,NOW);assert.equal(w.tick,0);assert.equal(w.seed,before.seed);assert.deepEqual(w.encounters, before.encounters);
});

test('atomic migration persists when root schema/revision stay unchanged and stale tab actions do not lose parked state',async()=>{
  const indexedDB=new IDBFactory(),w=fresh(),a=arrive(w);start(w,a);const old=legacy(w);old.encounters.garden.id='mizukagami';old.encounters.garden.scene='water';await raw(indexedDB,old);
  const one=await openGameStore({indexedDB}),two=await openGameStore({indexedDB});
  try{const migrated=await one.transact(x=>x);assert.equal(migrated.revision,old.revision);assert.deepEqual(await raw(indexedDB),migrated);
    const stale=economyToken(migrated);await one.transact(x=>{select(x,'komugi');return x;});let result;
    await two.transact(x=>{result=system.observeGarden(x,'water',stale);return x;});assert.equal(result.reason,'stale');
    const current=await two.transact(x=>x);assert.equal(current.encounters.active.id,a);assert.equal(current.encounters.garden.id,'komugi');assert.deepEqual(await raw(indexedDB),current);
  }finally{one.close();two.close();}
});

test('locked local save upgrades and persists the same per-garden state',async()=>{
  const w=fresh();arrive(w);const old=legacy(w);old.encounters.garden.id='mizukagami';old.encounters.garden.scene='water';
  const memory=new Map([[STORAGE_KEY,JSON.stringify(old)]]),localStorage={getItem:key=>memory.has(key)?memory.get(key):null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)};
  const store=await openGameStore({localStorage,navigator:{locks:{request:async(name,operation)=>operation()}}});
  try{const result=await store.transact(x=>x);assert.equal(result.encounters.version,14);assert.equal(parked(result).queue.length,1);const raw=JSON.parse(memory.get(STORAGE_KEY));assert.deepEqual(raw.encounters,result.encounters);}finally{store.close();}
});

test('different-garden UI enables observation, names waiting locations and resumes the exact stored event',async()=>{
  const w=fresh(),a=arrive(w);start(w,a);system.act(w,w.encounters.active.instanceId,system.catalog.find(e=>e.id===a).steps[0].action,economyToken(w));const active=clone(w.encounters.active);select(w,'mizukagami');
  const {win,root}=dom(renderFinchGarden(w));try{
    assert.equal(root.querySelectorAll('[data-garden-observe]:disabled').length,0);
    root.innerHTML=renderEncounterNotebook(w);const link=root.querySelector(`[data-encounter-open="${a}"]`);assert.ok(link);assert.match(link.textContent,/栗いろの実り庭/);
    root.innerHTML=renderEncounterPage(w,a);assert.ok(root.querySelector(`[data-encounter-open="${a}"]`));
    const panel=mountEncounterPanel(root,{getWorld:()=>w,transact:async op=>op(w)});
    try{await panel.open(a);assert.equal(w.encounters.garden.id,'komugi');assert.deepEqual(w.encounters.active,active);assert.equal(root.querySelector('[data-encounter-instance]').dataset.encounterInstance,String(active.instanceId));
      root.querySelector('[data-encounter-close]').click();await panel.garden('mizukagami');assert.equal(root.querySelectorAll('[data-garden-observe]:disabled').length,0);
      await panel.open(a);assert.deepEqual(w.encounters.active,active);
    }finally{panel.destroy();}
  }finally{await win.happyDOM.close();}
});
