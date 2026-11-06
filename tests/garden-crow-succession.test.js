import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,createBird,advanceTo,validateWorld,serializeWorld,parseSave} from '../src/engine.js';
import {lifeStatus} from '../src/life-care.js';
import {getProtagonistId} from '../src/protagonist.js';
import {arriveGardenCrow,crowTarget,crowScene,crowFriendship,petGardenCrow} from '../src/garden-crows.js';
import {renderCrowScene,renderCrowNotice} from '../src/garden-crow-ui.js';
const NOW=Date.UTC(2026,10,4,9),DAY=86400000,id='large-billed-crow';
const token=w=>({worldId:w.worldId,revision:w.revision,gardenId:w.encounters.garden.id});
function family(){const w=createWorld(NOW,42);w.paused=true;w.settings.motion=false;const father=createBird(w,{sex:'male',home:'resident'});w.tick=10;const elder=createBird(w,{sex:'female',home:'resident',parents:['b1',father.id],generation:1});w.tick=20;const younger=createBird(w,{sex:'male',home:'resident',parents:['b1',father.id],generation:1});w.encounters.garden.open=true;w.encounters.gardenFriends.attendees=['b1',elder.id,younger.id];lifeStatus(w,'b1').condition={kind:'injury',sinceAt:NOW,deadlineAt:NOW+DAY};return {w,father,elder,younger};}
function nearDeath(w){advanceTo(w,NOW+DAY-1000);w.paused=false;return NOW+DAY-1000;}
function die(w){w.paused=true;advanceTo(w,NOW+DAY);w.paused=false;validateWorld(w);}
test('a just-arrived crow closes with the deceased founder and never transfers damage or identity to an heir',()=>{
 const {w,elder,younger}=family(),at=nearDeath(w);w.birds[0].needs.energy=80;elder.needs.energy=76;younger.needs.energy=62;
 assert.equal(arriveGardenCrow(w,id,at,token(w)).changed,true);const history=structuredClone(w.encounters.crow);
 die(w);assert.equal(getProtagonistId(w),elder.id);assert.equal(crowTarget(w),elder);assert.equal(elder.needs.energy,76);assert.equal(younger.needs.energy,62);assert.equal(crowScene(w,NOW+DAY),null);assert.equal(renderCrowScene(w,{now:NOW+DAY}),'');assert.equal(renderCrowNotice(w,{now:NOW+DAY}),'');assert.deepEqual(w.encounters.crow,history);
 assert.equal(arriveGardenCrow(w,'carrion-crow',at+600000,token(w)).changed,true);assert.equal(elder.needs.energy,38);assert.equal(younger.needs.energy,62);assert.equal(w.birds[0].needs.energy,40);assert.equal(w.encounters.crow.arrivalBirdId,elder.id);assert.match(renderCrowScene(w,{now:at+600000}),new RegExp(elder.name));assert.deepEqual(parseSave(serializeWorld(w)),w);
});
test('crow friendship belongs to the species and survives succession, reload, and a new visit',()=>{
 let {w,elder}=family();const at=nearDeath(w);arriveGardenCrow(w,id,at,token(w));for(let n=0;n<13;n++)petGardenCrow(w,id,8,token(w));die(w);w=parseSave(serializeWorld(w));elder=w.birds.find(b=>b.id===elder.id);const before=elder.needs.energy;
 assert.equal(crowFriendship(w,id).friendly,true);const result=arriveGardenCrow(w,id,at+600000,token(w));assert.equal(result.hostile,false);assert.equal(elder.needs.energy,before);assert.equal(crowScene(w,at+600000).retreat,false);assert.equal(w.encounters.crow.visits[0].count,2);validateWorld(w);
});
test('same-batch deaths choose the surviving child before any subsequent crow can affect the world',()=>{
 const {w,elder,younger}=family();lifeStatus(w,elder).condition={kind:'injury',sinceAt:NOW,deadlineAt:NOW+DAY};nearDeath(w);die(w);assert.equal(getProtagonistId(w),younger.id);const old=[w.birds[0].needs.energy,elder.needs.energy];younger.needs.energy=86;
 const result=arriveGardenCrow(w,id,NOW+DAY+1,token(w));assert.equal(result.changed,true);assert.equal(younger.needs.energy,43);assert.deepEqual([w.birds[0].needs.energy,elder.needs.energy],old);assert.equal(w.encounters.crow.arrivalBirdId,younger.id);validateWorld(w);
});

test('a saved crow arrival cannot reference a nonexistent bird',()=>{const {w}=family();const at=nearDeath(w);arriveGardenCrow(w,id,at,token(w));w.encounters.crow.arrivalBirdId='b999999';const before=structuredClone(w);assert.throws(()=>validateWorld(w));assert.deepEqual(w,before);});
