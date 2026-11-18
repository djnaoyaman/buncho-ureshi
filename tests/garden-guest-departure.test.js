import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,economyToken,serializeWorld,parseSave,validateWorld,advanceTicks,advanceTo,TICK_MS} from '../src/engine.js';
import {encounterSystem as system,expireEncounterVisitors,FRIENDSHIP_RULES} from '../src/encounters.js';
const NOW=Date.UTC(2026,10,18),token=economyToken;
function arrive(w,garden='komugi',scene='grass',complete=true){
 system.selectGarden(w,garden,token(w));system.observeGarden(w,scene,token(w));const id=w.encounters.queue[0];
 if(complete){system.open(w,id,token(w));while(w.encounters.active){const a=w.encounters.active;system.act(w,a.instanceId,system.catalog.find(e=>e.id===id).steps[a.step].action,token(w));}}
 return id;
}
const session=(w,id)=>w.encounters.gardenSessions.find(s=>s.gardenId===id);
function expectOnlyGuestChanges(before,after,changed){const expected=structuredClone(before);changed(expected);assert.deepEqual(after,expected);}
test('completed current and parked guests expire only after 96 ticks; unrelated state remains byte-equivalent',()=>{
 const w=createWorld(NOW);const a=arrive(w),b=arrive(w,'mizukagami','water');w.tick=FRIENDSHIP_RULES.visitTicks;
 let before=structuredClone(w);expireEncounterVisitors(w);assert.deepEqual(w,before);assert.equal(session(w,'komugi').lastGuest,a);assert.equal(w.encounters.garden.lastGuest,b);
 w.tick++;before=structuredClone(w);expireEncounterVisitors(w);
 expectOnlyGuestChanges(before,w,x=>{x.encounters.garden.lastGuest=null;session(x,'komugi').lastGuest=null;});validateWorld(w);
 const loaded=parseSave(serializeWorld(w));assert.equal(loaded.encounters.garden.lastGuest,null);assert.equal(session(loaded,'komugi').lastGuest,null);
});
for(const kind of ['queue','active'])test(`home and timeout preserve ${kind} and clear only completed guests across gardens`,()=>{
 const w=createWorld(NOW),id=arrive(w,'komugi','grass',false);
 if(kind==='active')system.open(w,id,token(w));
 arrive(w,'mizukagami','water');const pending=structuredClone(session(w,'komugi'));
 const before=structuredClone(w);system.leaveGarden(w,token(w));
 assert.equal(w.encounters.garden.lastGuest,null);assert.deepEqual(session(w,'komugi'),pending);
 for(const key of ['birds','seed','events','decor','economy','lifecycle'])assert.deepEqual(w[key],before[key]);
 assert.deepEqual(w.encounters.discoveries,before.encounters.discoveries);assert.deepEqual(w.encounters.friendship,before.encounters.friendship);
 w.tick=FRIENDSHIP_RULES.visitTicks+1;expireEncounterVisitors(w);assert.deepEqual(session(w,'komugi'),pending);
 const restored=parseSave(serializeWorld(w));system.selectGarden(restored,'komugi',token(restored));
 assert.deepEqual(restored.encounters.queue,pending.queue);assert.deepEqual(restored.encounters.active,pending.active);validateWorld(restored);
});
test('home clears completed guests in other gardens as well as the visible garden',()=>{
 const w=createWorld(NOW);arrive(w);arrive(w,'mizukagami','water');system.leaveGarden(w,token(w));
 assert.equal(w.encounters.garden.lastGuest,null);assert.equal(session(w,'komugi').lastGuest,null);validateWorld(w);
});
test('explicit garden invitation starts a fresh guest stay, not the old encounter clock',()=>{
 const w=createWorld(NOW),id=arrive(w);system.leaveGarden(w,token(w));w.tick=200;
 assert.equal(system.inviteGarden(w,id,token(w)).changed,true);assert.equal(w.encounters.garden.nextTick,200);
 w.tick=296;expireEncounterVisitors(w);assert.equal(w.encounters.garden.lastGuest,id);
 w.tick=297;expireEncounterVisitors(w);assert.equal(w.encounters.garden.lastGuest,null);validateWorld(w);
});
test('paused elapsed wall time does not expire a completed garden guest',()=>{
 const w=createWorld(NOW),id=arrive(w);w.paused=true;const tick=w.tick;
 advanceTo(w,NOW+200*TICK_MS);assert.equal(w.tick,tick);assert.equal(w.encounters.garden.lastGuest,id);validateWorld(w);
});

for(const route of ['online','long-absent'])test(`engine ${route} path retires current and parked completed guests after 97 real minutes`,()=>{
 const w=createWorld(NOW),a=arrive(w),b=arrive(w,'mizukagami','water');
 const discoveries=structuredClone(w.encounters.discoveries),friendship=structuredClone(w.encounters.friendship);
 if(route==='online'){
  for(let minute=1;minute<=96;minute++)advanceTicks(w,1,NOW+minute*TICK_MS);
 }else advanceTo(w,NOW+96*TICK_MS);
 assert.equal(w.tick,96);assert.equal(w.encounters.garden.lastGuest,b);assert.equal(session(w,'komugi').lastGuest,a);
 if(route==='online')advanceTicks(w,1,NOW+97*TICK_MS);
 else {
  // Use a fresh snapshot so 97 minutes exercises the long-absence path itself,
  // rather than its one-minute follow-up branch.
  const fresh=createWorld(NOW);arrive(fresh);arrive(fresh,'mizukagami','water');
  advanceTo(fresh,NOW+97*TICK_MS);Object.assign(w,fresh);
 }
 assert.equal(w.tick,97);assert.equal(w.encounters.garden.lastGuest,null);assert.equal(session(w,'komugi').lastGuest,null);
 assert.deepEqual(w.encounters.discoveries,discoveries);assert.deepEqual(w.encounters.friendship,friendship);
 validateWorld(w);assert.deepEqual(parseSave(serializeWorld(w)),w);
});
