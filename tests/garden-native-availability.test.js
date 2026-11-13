import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,advanceTicks,serializeWorld,parseSave,completeEncounterReward,economyToken} from '../src/engine.js';
import {encounterSystem as system,getGardenVisitingBird,getGardenEncounterAvailability} from '../src/encounters.js';
import {GARDEN35_PLAN} from '../src/data/garden35-plan.js';
const token=w=>({worldId:w.worldId,revision:w.revision});
function meet(w,id){const e=system.catalog.find(e=>e.id===id);system.selectGarden(w,e.gardenEvent.gardenIds[0],token(w));system.observeGarden(w,e.gardenEvent.scene,token(w));finish(w,id);}
function finish(w,id){system.open(w,id,token(w));for(const step of system.catalog.find(e=>e.id===id).steps)system.act(w,w.encounters.active.instanceId,step.action,token(w));}
function closeFriend(w,id){meet(w,id);w.encounters.friendship.push({id,petPoints:50});}

test('every native wins on its matching observation even with a close non-native friend',()=>{
 for(const garden of GARDEN35_PLAN){
  const w=createWorld(1000);w.worldId='audit-10';
  const friend=system.catalog.find(e=>e.id!==garden.birdId);closeFriend(w,friend.id);
  system.selectGarden(w,garden.id,token(w));const native=system.catalog.find(e=>e.id===garden.birdId);
  assert.equal(system.observeGarden(w,native.gardenEvent.scene,token(w)).arrived,true);
  assert.deepEqual(w.encounters.queue,[garden.birdId]);
 }
});
test('matching observation ignores old saved encounter deadlines without destroying saved records',()=>{
 const w=createWorld(1000);meet(w,'eurasian-tree-sparrow');
 w.encounters.garden.nextTurn=100;w.encounters.garden.nextTick=100;
 const saved=parseSave(serializeWorld(w));
 assert.equal(system.observeGarden(saved,'quiet',token(saved)).arrived,true);
 assert.deepEqual(saved.encounters.queue,['eurasian-tree-sparrow']);
 finish(saved,'eurasian-tree-sparrow');assert.equal(saved.encounters.discoveries[0].visits,1);
});
test('availability distinguishes native waiting elsewhere, at home, and ready',()=>{
 const w=createWorld(1000),id='eurasian-tree-sparrow';
 system.selectGarden(w,'komugi',token(w));w.encounters.queue=[id];w.encounters.garden.guestGardenId='komugi';
 system.selectGarden(w,'java-rice',token(w));
 assert.equal(getGardenEncounterAvailability(w).reason,'pending-elsewhere');
 assert.equal(getGardenEncounterAvailability(w).gardenId,'komugi');
 assert.equal(system.observeGarden(w,'quiet',token(w)).arrived,false);
 system.selectGarden(w,'komugi',token(w));finish(w,id);
 w.encounters.friendship.push({id,petPoints:90});system.inviteCage(w,id,token(w));
 system.selectGarden(w,'java-rice',token(w));assert.equal(getGardenEncounterAvailability(w).reason,'at-home');
 assert.equal(system.observeGarden(w,'quiet',token(w)).arrived,false);
 system.dismissCage(w,id,token(w));assert.equal(getGardenEncounterAvailability(w).reason,'ready');
 assert.equal(system.observeGarden(w,'quiet',token(w)).arrived,true);
 assert.equal(getGardenEncounterAvailability(w).reason,'pending-here');
});
test('visiting friend is stable across reads and save reloads and never occupies native queue',()=>{
 let arrived=0;const total=250;
 for(let i=0;i<total;i++){
  const w=createWorld(1000);w.worldId=`visitor-sample-${i}`;closeFriend(w,'gouldian-finch');
  system.selectGarden(w,'java-rice',token(w));
  const before=serializeWorld(w),visitor=getGardenVisitingBird(w),id=visitor?.id??null;
  assert.ok(id===null||id==='gouldian-finch');
  for(let read=0;read<5;read++)assert.equal(getGardenVisitingBird(w)?.id??null,id);
  assert.equal(serializeWorld(w),before);assert.equal(getGardenVisitingBird(parseSave(before))?.id??null,id);
  system.observeGarden(w,'quiet',token(w));assert.deepEqual(w.encounters.queue,['eurasian-tree-sparrow']);
  if(visitor)arrived++;
 }
 assert.ok(arrived>40&&arrived<110,`30% visit sample should be plausible, observed ${arrived}/${total}`);
});
test('unrelated observation cannot create a close-friend conversation instead of native',()=>{
 const w=createWorld(1000);closeFriend(w,'gouldian-finch');system.selectGarden(w,'java-rice',token(w));
 system.observeGarden(w,'grass',token(w));assert.deepEqual(w.encounters.queue,[]);
});
test('reunion reward and affinity are independent: repeated conversation grants no extra gems or visits',()=>{
 const w=createWorld(1000),id='eurasian-tree-sparrow';system.selectGarden(w,'java-rice',token(w));
 let rewards=0;
 for(let i=0;i<5;i++){
  system.observeGarden(w,'quiet',token(w));system.open(w,id,token(w));
  for(const step of system.catalog.find(e=>e.id===id).steps){const result=completeEncounterReward(w,w.encounters.active.instanceId,step.action,economyToken(w),1000);rewards+=result.gemAward;}
 }
 assert.equal(rewards,5);assert.equal(w.encounters.discoveries[0].visits,1);
 advanceTicks(w,8);system.observeGarden(w,'quiet',token(w));finish(w,id);assert.equal(w.encounters.discoveries[0].visits,2);
});
