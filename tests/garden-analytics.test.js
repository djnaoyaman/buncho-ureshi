import test from 'node:test';
import assert from 'node:assert/strict';
import {createGardenAnalytics,predatorSnapshot,ACTIVE_MILESTONES} from '../src/garden-analytics.js';
import {createGardenPredatorClock} from '../src/garden-predator-clock.js';
import {createWorld} from '../src/engine.js';
import {arriveGardenRaptor,raptorToken,remainWithGardenRaptor,escapeGardenRaptor} from '../src/garden-raptors.js';
import {arriveGardenCrow} from '../src/garden-crows.js';
const NOW=Date.now();
function fixture(){const w=createWorld(NOW);w.field.place='park';w.encounters.garden.open=true;w.encounters.gardenFriends.attendees=['b1'];return w;}
function setup(){const events=[];return {events,a:createGardenAnalytics({send:(name,params)=>events.push({name,params})})};}
function commit(a,w,fn){const before=predatorSnapshot(w);fn();a.committed(before,w);}
test('clock accepted deltas alone count; hidden interruptions, large gaps and keys do not catch up',()=>{
 const {a,events}=setup();const clock=createGardenPredatorClock({random:()=>1,onElapsed:delta=>a.active(delta)});
 const sample=(now,eligible=true,key='a')=>clock.sample({now,eligible,key});
 clock.prime({now:0,eligible:true,key:'a'});sample(1000);sample(2000);sample(9000);sample(10000);
 assert.equal(events.length,1);assert.equal(events[0].params.active_seconds,3);
 sample(11000,false);sample(50000);sample(51000);sample(52000,true,'b');sample(53000,true,'b');
 for(let i=0;i<10;i++)a.active(1000);assert.equal(events.at(-1).params.milestone_seconds,15);
 for(let i=0;i<4000;i++)a.active(1000);assert.equal(events.length,ACTIVE_MILESTONES.length);
});
test('safe/danger crow and raptor arrivals and first elapsed occur once on committed state transitions',()=>{
 for(const kind of ['crow','raptor'])for(const danger of [true,false]){
  const {a,events}=setup(),w=fixture();if(!danger)w.encounters.gardenFriends.attendees=[];
  a.active(1000);a.active(1000);
  const arrive=()=>kind==='crow'?arriveGardenCrow(w,'carrion-crow',NOW,{worldId:w.worldId,revision:w.revision,gardenId:w.encounters.garden.id}):arriveGardenRaptor(w,'black-kite',NOW,{...raptorToken(w),gardenId:w.encounters.garden.id});
  commit(a,w,arrive);commit(a,w,()=>{});commit(a,w,arrive);
  assert.deepEqual(events.map(e=>e.name),['garden_predator_arrival','garden_first_predator']);
  assert.equal(events[0].params.encounter_safety,danger?'danger':'safe');assert.equal(events[1].params.active_seconds,2);
  const reloaded=setup();commit(reloaded.a,structuredClone(w),()=>{});assert.equal(reloaded.events.length,0);
 }
});
test('stay and home recorded once; failure before commit and world replacement do not produce arrival',()=>{
 const {a,events}=setup(),w=fixture();
 commit(a,w,()=>arriveGardenRaptor(w,'black-kite',NOW,{...raptorToken(w),gardenId:w.encounters.garden.id}));
 commit(a,w,()=>remainWithGardenRaptor(w,NOW,raptorToken(w)));commit(a,w,()=>remainWithGardenRaptor(w,NOW,raptorToken(w)));
 commit(a,w,()=>escapeGardenRaptor(w,raptorToken(w)));commit(a,w,()=>{});
 assert.deepEqual(events.filter(e=>e.name==='garden_predator_outcome').map(e=>e.params.outcome),['stay','home']);
 const failed=setup(),draft=fixture();arriveGardenRaptor(draft,'black-kite',NOW,{...raptorToken(draft),gardenId:draft.encounters.garden.id});assert.equal(failed.events.length,0);
 a.committed(predatorSnapshot(w),{...draft,worldId:'replacement'});assert.equal(events.length,4);
});
test('throwing collector cannot alter draws or save and event count is bounded',()=>{
 const clock=createGardenPredatorClock({random:()=>0,onElapsed(){throw Error('blocked');}});clock.prime({key:'a',now:0,eligible:true});clock.sample({key:'a',now:1000,eligible:true});clock.sample({key:'a',now:2000,eligible:true});assert.ok(clock.sample({key:'a',now:3000,eligible:true}));
 const a=createGardenAnalytics({send(){throw Error('blocked');}}),w=fixture();assert.doesNotThrow(()=>commit(a,w,()=>arriveGardenRaptor(w,'black-kite',NOW,{...raptorToken(w),gardenId:w.encounters.garden.id})));assert.ok(w.encounters.raptor.active);
 const bounded=setup();for(let i=0;i<1000;i++){const before=predatorSnapshot(w);w.encounters.raptor.lastArrivalAt++;bounded.a.committed(before,w);}assert.equal(bounded.events.length,200);
});

test('crow home is deduplicated across reopening and completed raptor outcomes retain safety',()=>{
 const {a,events}=setup(),w=fixture();
 commit(a,w,()=>arriveGardenCrow(w,'carrion-crow',Date.now(),{worldId:w.worldId,revision:w.revision,gardenId:w.encounters.garden.id}));
 for(let i=0;i<3;i++){w.encounters.garden.open=true;commit(a,w,()=>{w.encounters.garden.open=false;w.field.place='home';});}
 assert.equal(events.filter(e=>e.params.outcome==='home').length,1);
 const s=setup(),r=fixture();commit(s.a,r,()=>arriveGardenRaptor(r,'black-kite',NOW,{...raptorToken(r),gardenId:r.encounters.garden.id}));
 commit(s.a,r,()=>{r.encounters.raptor.active.hostile=false;});commit(s.a,r,()=>{r.encounters.raptor.active=null;});
 assert.deepEqual(s.events.filter(e=>e.params.outcome).map(e=>[e.params.outcome,e.params.encounter_safety]),[['friendly','danger'],['ended','safe']]);
});
