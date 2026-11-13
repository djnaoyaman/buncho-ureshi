import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld} from '../src/engine.js';
import {encounterSystem as system,getGardenVisitingBird} from '../src/encounters.js';
import {renderGardenStage,renderGardenEncounterNotice} from '../src/encounter-ui.js';
const token=w=>({worldId:w.worldId,revision:w.revision});
function finish(w,id){system.open(w,id,token(w));for(const step of system.catalog.find(e=>e.id===id).steps)system.act(w,w.encounters.active.instanceId,step.action,token(w));}
test('native guidance gives the correct observation and identifies the native on stage',()=>{
 const w=createWorld(1000);system.selectGarden(w,'java-rice',token(w));
 assert.match(renderGardenEncounterNotice(w),/「ひとやすみ」/);
 system.observeGarden(w,'quiet',token(w));
 const html=renderGardenStage(w);assert.match(html,/この庭の鳥/);assert.match(html,/data-encounter-open="eurasian-tree-sparrow"/);
 assert.match(renderGardenEncounterNotice(w),/出会いのつづきを見る/);
});
test('native waiting elsewhere has a direct route, without discarding the conversation',()=>{
 const w=createWorld(1000);system.selectGarden(w,'komugi',token(w));
 w.encounters.queue=['eurasian-tree-sparrow'];w.encounters.garden.guestGardenId='komugi';
 system.selectGarden(w,'java-rice',token(w));const before=JSON.stringify(w);
 const html=renderGardenEncounterNotice(w);assert.match(html,/別の庭で待っている/);assert.match(html,/data-garden-select="komugi"/);
 assert.equal(JSON.stringify(w),before);
});
test('native visiting home has an existing home navigation action',()=>{
 const w=createWorld(1000);system.selectGarden(w,'java-rice',token(w));system.observeGarden(w,'quiet',token(w));finish(w,'eurasian-tree-sparrow');
 w.encounters.friendship=[{id:'eurasian-tree-sparrow',petPoints:90}];system.inviteCage(w,'eurasian-tree-sparrow',token(w));
 const html=renderGardenEncounterNotice(w);assert.match(html,/おうちに遊びに来ている/);assert.match(html,/data-finch-go-home/);
});
test('visiting friend has a separate labelled button and never replaces the native',()=>{
 let example;
 for(let n=0;n<300&&!example;n++){
  const w=createWorld(1000);w.worldId=`guidance-${n}`;
  const e=system.catalog.find(e=>e.id==='gouldian-finch');system.selectGarden(w,e.gardenEvent.gardenIds[0],token(w));system.observeGarden(w,e.gardenEvent.scene,token(w));finish(w,e.id);
  w.encounters.friendship=[{id:e.id,petPoints:50}];system.selectGarden(w,'java-rice',token(w));
  if(getGardenVisitingBird(w))example=w;
 }
 assert.ok(example,'bounded deterministic fixture includes a visiting friend');
 system.observeGarden(example,'quiet',token(example));assert.deepEqual(example.encounters.queue,['eurasian-tree-sparrow']);
 const before=JSON.stringify(example),html=renderGardenStage(example);
 assert.match(html,/data-garden-visiting-friend="gouldian-finch"/);assert.match(html,/遊びに来た友達/);assert.match(html,/この庭の鳥/);
 assert.equal(JSON.stringify(example),before);
});
