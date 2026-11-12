import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,serializeWorld,parseSave,advanceTicks} from '../src/engine.js';
import {encounterSystem as system} from '../src/encounters.js';
import {GARDEN35_PLAN} from '../src/data/garden35-plan.js';
import {ENCOUNTER_CATALOG} from '../src/data/encounter-catalog.js';
const token=w=>({worldId:w.worldId,revision:w.revision});
function finish(w,id){system.open(w,id,token(w));for(const step of ENCOUNTER_CATALOG.find(e=>e.id===id).steps)assert.ok(system.act(w,w.encounters.active.instanceId,step.action,token(w)).changed);}
test('all 35 gardens have exactly one native, explicit first discovery and repeat meeting',()=>{
 for(const garden of GARDEN35_PLAN){
  const w=createWorld(1000),e=ENCOUNTER_CATALOG.find(e=>e.id===garden.birdId);
  assert.deepEqual(ENCOUNTER_CATALOG.filter(e=>e.gardenEvent.gardenIds.includes(garden.id)).map(e=>e.id),[garden.birdId]);
  system.selectGarden(w,garden.id,token(w));assert.equal(w.encounters.discoveries.length,0);
  system.observeGarden(w,e.gardenEvent.scene,token(w));assert.deepEqual(w.encounters.queue,[e.id]);finish(w,e.id);
  const first=structuredClone(w.encounters.discoveries[0]);
  advanceTicks(w,8);for(let i=0;i<3;i++)system.observeGarden(w,e.gardenEvent.scene,token(w));
  assert.deepEqual(w.encounters.queue,[e.id]);finish(w,e.id);
  assert.equal(w.encounters.discoveries.length,1);assert.equal(w.encounters.discoveries[0].visits,2);
  assert.equal(w.encounters.discoveries[0].instanceId,first.instanceId);
  assert.deepEqual(parseSave(serializeWorld(w)),w);
 }
});
test('legacy conversation in a different garden completes before the new native and keeps family state',()=>{
 const w=createWorld(1000),e=ENCOUNTER_CATALOG[0];
 system.selectGarden(w,'komugi',token(w));w.encounters.queue=[e.id];w.encounters.garden.guestGardenId='komugi';
 system.open(w,e.id,token(w));system.act(w,w.encounters.active.instanceId,e.steps[0].action,token(w));
 const before=structuredClone({birds:w.birds,seed:w.seed,economy:w.economy,decor:w.decor,regulars:w.encounters.gardenFriends.regulars});
 const restored=parseSave(serializeWorld(w));assert.equal(restored.encounters.active.step,1);
 assert.equal(system.observeGarden(restored,'grass',token(restored)).reason,'guest');
 for(const step of e.steps.slice(1))system.act(restored,restored.encounters.active.instanceId,step.action,token(restored));
 assert.equal(restored.encounters.discoveries[0].id,e.id);
 assert.deepEqual({birds:restored.birds,seed:restored.seed,economy:restored.economy,decor:restored.decor,regulars:restored.encounters.gardenFriends.regulars},before);
});
