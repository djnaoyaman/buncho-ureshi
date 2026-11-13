import test from 'node:test';
import assert from 'node:assert/strict';
import {createGardenPredatorClock} from '../src/garden-predator-clock.js';
import {createGardenCrowClock} from '../src/garden-crows.js';
import {createWorld,readCompatibleWorld,serializeWorld,parseSave,validateWorld,advanceGardenRaptor} from '../src/engine.js';
import {arriveGardenRaptor,escapeGardenRaptor,raptorToken,raptorThreatCoolingDown,RAPTOR_RULES} from '../src/garden-raptors.js';
const NOW=Date.UTC(2026,10,14);
const token=w=>({...raptorToken(w),gardenId:w.encounters.garden.id});
const fresh=()=>{const w=createWorld(NOW,42);w.encounters.garden.open=true;w.encounters.gardenFriends.attendees=['b1'];w.field.place='park';return w;};
const reopen=w=>{w.encounters.garden.open=true;w.encounters.gardenFriends.attendees=['b1'];};
const arrive=(w,id,now)=>arriveGardenRaptor(w,id,now,token(w));
function run(clock,start,end,key='A',extra={}){for(let now=start;now<=end;now+=1000)clock.sample({key,now,eligible:true,gardenId:'komorebi',...extra});}
test('misses repeat every120 seconds while staying in the same visible garden',()=>{
 let draws=0;const clock=createGardenPredatorClock({random:()=>{draws++;return 1;}});
 run(clock,0,122000);assert.equal(draws,1);run(clock,123000,243000);assert.equal(draws,3);
});
test('an entry inside the shared cooldown does not consume the next opportunity',()=>{
 let draws=0;const clock=createGardenPredatorClock({random:()=>{draws++;return 1;}});
 run(clock,0,59000);run(clock,60000,122000,'B');assert.equal(draws,1);run(clock,123000,123000,'B');assert.equal(draws,2);
});
test('fast garden switching does not buy extra draws, blocked time has no backlog burst',()=>{
 let draws=0;const clock=createGardenPredatorClock({random:()=>{draws++;return 1;}});
 for(let start=0;start<120000;start+=4000)run(clock,start,start+3000,`${start}`);assert.equal(draws,1);
 run(clock,120000,600000,'final',{available:false});assert.equal(draws,1);run(clock,601000,601000,'final');assert.equal(draws,2);run(clock,602000,720000,'final');assert.equal(draws,2);
});
test('shared host can disable old crow lottery without disabling a selected six-second warning',()=>{
 let draws=0;const clock=createGardenCrowClock({random:()=>{draws++;return 0;}});
 for(let now=0;now<=300000;now+=1000)clock.sample({key:'A',now,eligible:true,allowLottery:false});assert.equal(draws,0);
 assert.equal(clock.startWarning('large-billed-crow',300000),true);
 let result;for(let now=301000;now<=306000;now+=1000)result=clock.sample({key:'A',now,eligible:true,allowLottery:false})||result;
 assert.deepEqual(result,{kind:'arrive',id:'large-billed-crow'});assert.equal(draws,0);
});
test('all nine raptors remain discoverable in a day, but only one dangerous arrival occurs',()=>{
 let w=fresh();const ids=['black-kite','northern-goshawk','peregrine-falcon','ural-owl','common-kestrel','japanese-sparrowhawk','golden-eagle','brown-hawk-owl','osprey'];
 const protectedBefore=structuredClone({birds:w.birds,seed:w.seed,economy:w.economy,decor:w.decor,journal:w.journal});
 for(const [i,id] of ids.entries()){
  reopen(w);if(id==='osprey')w.encounters.garden.id='mizukagami';
  const r=arrive(w,id,NOW+i*120000);assert.equal(r.changed,true);assert.equal(r.hostile,i===0);assert.equal(w.encounters.raptor.visits.some(v=>v.id===id),true);
  if(i===0)assert.equal(w.encounters.raptor.active.returnChoicePending,true);
  w=parseSave(serializeWorld(w));assert.equal(escapeGardenRaptor(w,token(w)).escaped,true);
 }
 assert.equal(w.encounters.raptor.visits.length,9);assert.equal(w.encounters.raptor.lastThreatAt,NOW);
 assert.deepEqual({birds:w.birds,seed:w.seed,economy:w.economy,decor:w.decor,journal:w.journal},protectedBefore);
});
test('safe repeated visit expires without damage and does not prolong the24h danger cooldown',()=>{
 const w=fresh();arrive(w,'black-kite',NOW);escapeGardenRaptor(w,token(w));reopen(w);
 assert.equal(arrive(w,'golden-eagle',NOW+119999).reason,'cooldown');assert.equal(arrive(w,'golden-eagle',NOW+120000).hostile,false);
 assert.equal(w.encounters.raptor.active.returnChoicePending,false);
 for(let n=1;n<=18;n++)advanceGardenRaptor(w,1000,NOW+120000+n*1000,token(w));
 assert.equal(w.encounters.raptor.active,null);assert.equal(w.encounters.raptor.lastThreatAt,NOW);assert.equal(raptorThreatCoolingDown(w,NOW+86400000-1),true);assert.equal(raptorThreatCoolingDown(w,NOW+86400000),false);
 assert.equal(arrive(w,'peregrine-falcon',NOW+86400000).hostile,true);assert.equal(w.encounters.raptor.active.returnChoicePending,true);validateWorld(w);
});
test('v15 migration preserves exact warning/countdown and other state while seeding conservative danger cap',()=>{
 const w=fresh();arrive(w,'black-kite',NOW);const old=structuredClone(w);old.encounters.version=15;delete old.encounters.raptor.lastThreatAt;
 const original=structuredClone(old),migrated=readCompatibleWorld(old,NOW);assert.deepEqual(old,original);
 const expected=structuredClone(original);expected.encounters.version=16;expected.encounters.raptor.lastThreatAt=NOW;assert.deepEqual(migrated,expected);
 assert.deepEqual(parseSave(serializeWorld(migrated)),migrated);
 for(const value of [-1,NOW+1,1.5]){const bad=structuredClone(migrated);bad.encounters.raptor.lastThreatAt=value;assert.throws(()=>validateWorld(bad));}
 assert.equal(RAPTOR_RULES.visitCooldownMs,120000);assert.equal(RAPTOR_RULES.threatCooldownMs,86400000);
});

test('shared crow warning can rearm after an arrival without remounting the garden',()=>{
 const c=createGardenCrowClock();c.sample({key:'A',now:0,eligible:true,allowLottery:false});
 assert.equal(c.startWarning('large-billed-crow',0,{repeat:true}),true);
 for(let now=1000;now<=6000;now+=1000)c.sample({key:'A',now,eligible:true,allowLottery:false});
 for(let now=7000;now<=606000;now+=1000)c.sample({key:'A',now,eligible:true,allowLottery:false});
 assert.equal(c.startWarning('carrion-crow',606000,{repeat:true}),true);
 let event;for(let now=607000;now<=612000;now+=1000)event=c.sample({key:'A',now,eligible:true,allowLottery:false})||event;
 assert.deepEqual(event,{kind:'arrive',id:'carrion-crow'});
});
