import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Window} from 'happy-dom';
import {ENCOUNTER_CANDIDATES,ENCOUNTER_CATALOG,ROSEFINCH_ADDITIONS,JAVA_BASELINE,INITIAL_EIGHT,NEXT_THIRTEEN,FINAL_EIGHT} from '../src/data/encounter-catalog.js';
import {createWorld,validateWorld,parseSave,serializeWorld} from '../src/engine.js';
import {createEncounterSystem} from '../src/encounters.js';
import {renderEncounterNotebook,renderEncounterPage} from '../src/encounter-ui.js';
import {inviteFixture} from './fixtures/garden-invitation.js';
const token=w=>({worldId:w.worldId,revision:w.revision});
const system=createEncounterSystem(ENCOUNTER_CATALOG);
const ids=['long-tailed-rosefinch','pallass-rosefinch'];
function finish(w,id){inviteFixture(system,w,id);assert.ok(system.open(w,id,token(w)).changed);for(const step of system.catalog.find(e=>e.id===id).steps)assert.ok(system.act(w,w.encounters.active.instanceId,step.action,token(w)).changed);}
const photoHashes=['bff33d739a535e6e45f96dd290865ce52ca13cfecdc72666818a875fb470c648','a7bdab296b9e2e8f903bbacdbde44d5da575dbcd8420f87aae6526ec471e8fd5'];

test('two distinct rosefinch species append after the original 30 without reclassifying earlier batches',()=>{
 assert.equal(ENCOUNTER_CANDIDATES.length,35);assert.deepEqual(ENCOUNTER_CANDIDATES.slice(30,32),ROSEFINCH_ADDITIONS);assert.deepEqual(ROSEFINCH_ADDITIONS.map(e=>e.id),ids);
 assert.deepEqual([INITIAL_EIGHT.length,NEXT_THIRTEEN.length,FINAL_EIGHT.length],[8,13,8]);assert.equal(ENCOUNTER_CANDIDATES[29].id,'eurasian-tree-sparrow');assert.equal(JAVA_BASELINE.id,'java-sparrow');
 assert.deepEqual(ROSEFINCH_ADDITIONS.map(e=>e.scientific),['Carpodacus sibiricus','Carpodacus roseus']);
 assert.equal(new Set(ENCOUNTER_CATALOG.map(e=>e.id)).size,35);assert.equal(new Set(ROSEFINCH_ADDITIONS.map(e=>e.art.src)).size,2);
 for(const e of ROSEFINCH_ADDITIONS){assert.equal(e.kind,'species');assert.equal(e.family,'アトリ科');assert.ok(e.sources.some(s=>s.url.startsWith('https://www.birdfan.net/')));assert.match(e.appearance,/オス/);assert.match(e.appearance,/メス/);assert.equal(e.gardenEvent.fictional,true);}
});

test('both licensed real photographs stay byte-identical and include the complete rights record',()=>{
 ROSEFINCH_ADDITIONS.forEach((e,i)=>{const p=e.photo;assert.equal(createHash('sha256').update(readFileSync(new URL('../public/'+p.src,import.meta.url))).digest('hex'),photoHashes[i]);assert.equal(p.license,'CC BY-SA 3.0');assert.equal(p.licenseUrl,'https://creativecommons.org/licenses/by-sa/3.0/');assert.equal(p.canCrop,false);assert.equal(p.canColorFilter,false);assert.equal(p.display,'contain');assert.ok(p.creator);assert.match(p.source,/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);assert.match(p.caption,/ゲームの庭や当日の記録ではありません/);});
});

test('unseen silhouettes reveal one at a time, with photo attribution outside the image',()=>{
 const w=createWorld(1000),win=new Window();try{
 const old=serializeWorld(w);win.document.body.innerHTML=renderEncounterNotebook(w);for(const e of ROSEFINCH_ADDITIONS){const card=win.document.querySelector(`[data-encounter-page="${e.id}"]`);assert.ok(card.querySelector('.is-silhouette'));assert.ok(!card.textContent.includes(e.name));assert.equal(card.querySelector('img').alt,'');}assert.equal(serializeWorld(w),old);
 finish(w,ids[0]);win.document.body.innerHTML=renderEncounterNotebook(w);assert.equal(win.document.querySelector(`[data-encounter-page="${ids[0]}"] .is-silhouette`),null);assert.ok(win.document.querySelector(`[data-encounter-page="${ids[1]}"] .is-silhouette`));
 for(const e of ROSEFINCH_ADDITIONS){if(!w.encounters.discoveries.some(d=>d.id===e.id))finish(w,e.id);win.document.body.innerHTML=renderEncounterPage(w,e.id,{showPhoto:true});const img=win.document.querySelector('.finch-photo img');assert.equal(img.style.objectFit,'contain');assert.equal(img.style.filter,'none');assert.equal(img.style.clipPath,'none');assert.match(win.document.querySelector('figcaption').textContent,new RegExp(e.photo.creator));assert.equal(win.document.querySelector(`figcaption a[href="${e.photo.licenseUrl}"]`).textContent,e.photo.license);}
 }finally{win.happyDOM.abort();}
});

test('old discoveries, friendship, visitors and an interrupted story survive catalog expansion',()=>{
 const w=createWorld(1000);finish(w,'gouldian-finch');for(let p=10;p<100;p+=Math.min(8,100-p))system.pet(w,'gouldian-finch',Math.min(8,100-p),token(w));system.inviteCage(w,'gouldian-finch',token(w));
 inviteFixture(system,w,'double-barred-finch');system.open(w,'double-barred-finch',token(w));system.act(w,w.encounters.active.instanceId,'watch',token(w));
 const before=structuredClone(w);const restored=parseSave(serializeWorld(w));assert.deepEqual(restored,before);assert.deepEqual(restored.encounters.active,before.encounters.active);assert.deepEqual(restored.encounters.friendship,before.encounters.friendship);assert.deepEqual(restored.encounters.cageVisitors,before.encounters.cageVisitors);assert.equal(restored.encounters.discoveries.some(d=>ids.includes(d.id)),false);
});

test('new arrivals require the matching garden and observation and preserve non-encounter state',()=>{
 for(const e of ROSEFINCH_ADDITIONS){const s=createEncounterSystem([e],{knownCatalog:ENCOUNTER_CANDIDATES}),w=createWorld(1000),before=structuredClone({birds:w.birds,decor:w.decor,seed:w.seed,economy:w.economy});s.enterGarden(w,token(w));s.observeGarden(w,e.gardenEvent.scene,token(w));assert.deepEqual(w.encounters.queue,[]);s.selectGarden(w,e.gardenEvent.gardenIds[0],token(w));s.observeGarden(w,e.gardenEvent.scene,token(w));assert.deepEqual(w.encounters.queue,[e.id]);s.open(w,e.id,token(w));s.act(w,w.encounters.active.instanceId,e.steps[0].action,token(w));const resumed=parseSave(serializeWorld(w));assert.equal(resumed.encounters.active.step,1);for(const step of e.steps.slice(1))s.act(resumed,resumed.encounters.active.instanceId,step.action,token(resumed));assert.equal(resumed.encounters.discoveries.length,1);assert.equal(resumed.encounters.discoveries[0].id,e.id);validateWorld(resumed);assert.deepEqual({birds:resumed.birds,decor:resumed.decor,seed:resumed.seed,economy:resumed.economy},before);assert.deepEqual(parseSave(serializeWorld(resumed)),resumed);}
});
