import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,advanceTicks,validateWorld} from '../src/engine.js';import {createEncounterSystem} from '../src/encounters.js';import {ENCOUNTER_CANDIDATES} from '../src/data/encounter-catalog.js';import {renderFinchGarden,renderEncounterNotebook} from '../src/encounter-ui.js';
const guard=w=>({worldId:w.worldId,revision:w.revision}),system=createEncounterSystem(ENCOUNTER_CANDIDATES);
function finish(w){const id=w.encounters.queue[0];system.open(w,id,guard(w));for(const step of system.catalog.find(e=>e.id===id).steps)system.act(w,w.encounters.active.instanceId,step.action,guard(w));return id;}
test('garden is separate from public park and never changes household or simulation state',()=>{const w=createWorld(1000),before=structuredClone({birds:w.birds,field:w.field,seed:w.seed,gems:w.gems,care:w.careSchedule,decor:w.decor});system.selectGarden(w,'komugi',guard(w));system.observeGarden(w,'grass',guard(w));assert.equal(w.encounters.queue.length,1);assert.deepEqual({birds:w.birds,field:w.field,seed:w.seed,gems:w.gems,care:w.careSchedule,decor:w.decor},before);finish(w);assert.equal(w.encounters.discoveries.length,1);assert.deepEqual({birds:w.birds,field:w.field,seed:w.seed,gems:w.gems,care:w.careSchedule,decor:w.decor},before);validateWorld(w);});
test('one conversation at a time, immediate reunion, no spam friendship or automatic absent discovery',()=>{
 const w=createWorld(1000);system.selectGarden(w,'komugi',guard(w));system.observeGarden(w,'grass',guard(w));
 assert.equal(system.observeGarden(w,'water',guard(w)).reason,'guest');const id=finish(w);
 for(let i=0;i<20;i++){assert.equal(system.observeGarden(w,'grass',guard(w)).arrived,true);assert.equal(finish(w),id);}
 assert.equal(w.encounters.discoveries.length,1);assert.equal(w.encounters.discoveries[0].visits,1);
 system.leaveGarden(w,guard(w));advanceTicks(w,8);assert.equal(w.encounters.discoveries.length,1);assert.equal(w.encounters.queue.length,0);
 system.selectGarden(w,'komugi',guard(w));system.observeGarden(w,'grass',guard(w));assert.equal(finish(w),id);
 assert.equal(w.encounters.discoveries[0].visits,2);validateWorld(w);
});
test('scene-specific fictional events cover35 with one native bird and repeat meetings',()=>{assert.equal(ENCOUNTER_CANDIDATES.length,35);assert.ok(ENCOUNTER_CANDIDATES.every(e=>e.gardenEvent?.fictional&&e.gardenEvent.invitation));const w=createWorld(1000);system.selectGarden(w,'mizukagami',guard(w));system.observeGarden(w,'water',guard(w));const first=w.encounters.queue[0];assert.ok(ENCOUNTER_CANDIDATES.some(e=>e.id===first&&e.gardenEvent.scene==='water'));finish(w);advanceTicks(w,8);for(let i=0;i<3;i++)system.observeGarden(w,'water',guard(w));assert.ok(w.encounters.queue[0]);assert.equal(w.encounters.queue[0],first);});
test('garden route and silhouette notebook do not pretend park travel or compulsory long notes',()=>{const w=createWorld(1000),html=renderFinchGarden(w,{system});assert.match(html,/ふたつの輪の木陰/);assert.match(html,/finch-garden-scenery/);assert.match(html,/<details(?:\s[^>]*)?>/);assert.doesNotMatch(html,/data-game-travel/);assert.match(renderEncounterNotebook(w,{system}),/data-finch-go-garden/);});
test('full reset creates fresh garden and stale old-world callbacks cannot change it',()=>{const old=createWorld(1000);system.enterGarden(old,guard(old));system.observeGarden(old,'grass',guard(old));const stale=guard(old),fresh=createWorld(2000),before=structuredClone(fresh);assert.equal(system.observeGarden(fresh,'water',stale).reason,'stale');assert.equal(system.enterGarden(fresh,stale).reason,'stale');assert.deepEqual(fresh,before);assert.equal(fresh.encounters.discoveries.length,0);assert.equal(fresh.encounters.garden.open,false);});
// Intentional policy change: completed guests no longer survive a trip home forever.
test('completed guest leaves on going home while notebook and friendship survive reload',()=>{
 const w=createWorld(1000);system.selectGarden(w,'komugi',guard(w));system.observeGarden(w,'grass',guard(w));const id=finish(w);
 assert.match(renderFinchGarden(w,{system}),new RegExp(`data-encounter-page="${id}"`));
 const before=structuredClone(w);system.leaveGarden(w,guard(w));
 assert.equal(w.encounters.garden.lastGuest,null);
 for(const key of ['birds','seed','decor','economy','events','lifecycle'])assert.deepEqual(w[key],before[key]);
 for(const key of ['discoveries','friendship'])assert.deepEqual(w.encounters[key],before.encounters[key]);
 const restored=JSON.parse(JSON.stringify(w));validateWorld(restored);system.selectGarden(restored,'komugi',guard(restored));
 assert.equal(restored.encounters.garden.lastGuest,null);
 assert.doesNotMatch(renderFinchGarden(restored,{system}),new RegExp(`data-encounter-page="${id}"`));
 assert.equal(restored.encounters.discoveries[0].visits,1);
 assert.equal(system.observeGarden(restored,'grass',guard(restored)).arrived,true);assert.equal(finish(restored),id);
 assert.equal(restored.encounters.discoveries[0].visits,1);validateWorld(restored);
});

test('garden dock removes redundant guest shortcut and names observation clearly',()=>{const w=createWorld(1000);const html=renderFinchGarden(w,{system});assert.doesNotMatch(html,/のお客さまへ|<summary>眺める<\/summary>/);assert.match(html,/<summary>観察する<\/summary>/);assert.match(html,/草を観察する/);assert.match(html,/水辺を観察する/);for(const control of ['observe','friends','companions','about'])assert.match(html,new RegExp(`data-garden-details="${control}"`));});
