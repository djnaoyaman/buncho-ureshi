import {createEncounterSystem as oldEncounterSystem} from './fixtures/pre-garden35/encounters.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GARDEN35_PLAN,GARDEN35_IDS,GARDEN35_LEGACY_IDS} from '../src/data/garden35-plan.js';
import {prepareGarden35Visits} from '../src/garden35-migration.js';
import {OLD_GARDEN_IDS as GARDEN_IDS} from '../src/data/gardens.js';
import {ENCOUNTER_CATALOG} from '../src/data/encounter-catalog.js';
import {createWorld,serializeWorld,parseSave} from '../src/engine.js';
import {encounterSystem} from '../src/encounters.js';

test('approved plan has exactly one distinct resident in each of 35 gardens and keeps all old IDs',()=>{
 assert.equal(GARDEN35_PLAN.length,35);assert.equal(new Set(GARDEN35_IDS).size,35);assert.equal(new Set(GARDEN35_PLAN.map(g=>g.birdId)).size,35);
 assert.deepEqual(new Set(GARDEN35_LEGACY_IDS),new Set(GARDEN_IDS));
 assert.equal(GARDEN35_PLAN[0].birdId,'eurasian-tree-sparrow');assert.equal(GARDEN35_PLAN[0].name,'足立区梅島公園');assert.equal(GARDEN35_PLAN[0].backgroundFile,'game-art/gardens35/bird-garden-01.webp');
 assert.ok(!GARDEN35_PLAN.some(g=>g.birdId==='java-sparrow'));assert.equal(GARDEN35_PLAN[20].name,'落ち葉の小径');
 assert.match(GARDEN35_PLAN[29].musicStyle,/フラメンコ/);assert.match(GARDEN35_PLAN[34].musicStyle,/ボサノヴァ/);
 const additions=GARDEN35_PLAN.filter(g=>!ENCOUNTER_CATALOG.some(e=>e.id===g.birdId));
 assert.deepEqual(additions.map(g=>g.birdId),['red-throated-parrotfinch','masked-finch','hooded-siskin']);
 for(const g of GARDEN35_PLAN){assert.ok(g.description.length>20);assert.ok(g.musicStyle);if(g.number!==1){assert.ok(g.backgroundFile.endsWith('.webp'));assert.ok(g.width>0&&g.height>0);}}
});

test('visit projection is additive and idempotent for every old garden, with no mutation of the saved world',()=>{
 for(const gardenId of GARDEN_IDS){
  const w=createWorld(1000,42);
  for(const [i,id] of GARDEN_IDS.entries())w.encounters.garden.visits[id]=i*7+1;
  encounterSystem.selectGarden(w,gardenId,{worldId:w.worldId,revision:w.revision});
  // Keep an existing regular relationship and its exact memory text intact.
  w.encounters.gardenFriends.regulars[0].affinity=44;
  const before=serializeWorld(w),restored=parseSave(before),projected=prepareGarden35Visits(restored.encounters.garden.visits);
  assert.equal(Object.keys(projected).length,35);
  for(const id of GARDEN_IDS)assert.equal(projected[id],w.encounters.garden.visits[id]);
  for(const id of GARDEN35_IDS.filter(id=>!GARDEN_IDS.includes(id)))assert.equal(projected[id],0);
  assert.deepEqual(prepareGarden35Visits(projected),projected);
  assert.equal(serializeWorld(w),before);assert.equal(serializeWorld(restored),before);
 }
});

test('invalid, missing and accessor counters fail closed without reading getters or repairing saves',()=>{
 const visits=Object.fromEntries(GARDEN_IDS.map(id=>[id,0]));
 for(const patch of [{unexpected:1},{komorebi:-1},{komorebi:1.5},{komorebi:1000001}])assert.throws(()=>prepareGarden35Visits({...visits,...patch}));
 const missing={...visits};delete missing.komorebi;assert.throws(()=>prepareGarden35Visits(missing));
 let reads=0;const getter={...visits};Object.defineProperty(getter,'komorebi',{enumerable:true,get(){reads++;return 0;}});assert.throws(()=>prepareGarden35Visits(getter));assert.equal(reads,0);
 const future=prepareGarden35Visits(visits);future.unexpected=0;assert.throws(()=>prepareGarden35Visits(future));
});

test('previous published engine rejects future visit keys rather than overwriting them, while review page is storage-free',()=>{
 const w=createWorld(1000,42),before=serializeWorld(w),future=structuredClone(w);
 future.encounters.garden.visits=prepareGarden35Visits(future.encounters.garden.visits);
 assert.throws(()=>oldEncounterSystem().validate(future.encounters,future.tick));assert.equal(serializeWorld(w),before);
 const html=readFileSync(new URL('../public/garden35-plan/index.html',import.meta.url),'utf8');
 assert.equal((html.match(/<li>/g)||[]).length,35);assert.ok(!/<script\b|localStorage|indexedDB/i.test(html));assert.match(html,/35庭の背景と紹介をゲームに接続/);
});
