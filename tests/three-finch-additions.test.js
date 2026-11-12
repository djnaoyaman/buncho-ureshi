import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Window} from 'happy-dom';
import {ENCOUNTER_CANDIDATES,ENCOUNTER_CATALOG,THREE_FINCH_ADDITIONS,JAVA_BASELINE,ROSEFINCH_ADDITIONS} from '../src/data/encounter-catalog.js';
import {createWorld,validateWorld,parseSave,serializeWorld} from '../src/engine.js';
import {createEncounterSystem} from '../src/encounters.js';
import {renderEncounterNotebook,renderEncounterPage} from '../src/encounter-ui.js';
import {inviteFixture} from './fixtures/garden-invitation.js';

const ids=['red-throated-parrotfinch','masked-finch','hooded-siskin'];
const token=w=>({worldId:w.worldId,revision:w.revision});
const system=createEncounterSystem(ENCOUNTER_CATALOG);
const sha=value=>createHash('sha256').update(value).digest('hex');
const photos=[
 ['734d8e468e36333a183ead0a3a4231296540e369e84476a5a4ff7ff76dfcb72c','CC BY-SA 3.0','https://creativecommons.org/licenses/by-sa/3.0/'],
 ['a66ed1337f63f17f40dcae9df0be3f14f26d4676f0324fbc5c60e97fd97ae399','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/'],
 ['a0f7f2300702b87410d37ab65686147648a697ae85a5a13b697ba09ca61e4735','CC0 1.0','https://creativecommons.org/publicdomain/zero/1.0/']
];
function finish(w,id){
 inviteFixture(system,w,id);
 assert.ok(system.open(w,id,token(w)).changed);
 for(const step of system.catalog.find(e=>e.id===id).steps)assert.ok(system.act(w,w.encounters.active.instanceId,step.action,token(w)).changed);
}

test('three distinct species append while all previous IDs and the Java baseline are retained',()=>{
 assert.equal(ENCOUNTER_CANDIDATES.length,35);
 assert.equal(ENCOUNTER_CATALOG.length,35);
 assert.deepEqual(ENCOUNTER_CANDIDATES.slice(32),THREE_FINCH_ADDITIONS);
 assert.deepEqual(THREE_FINCH_ADDITIONS.map(e=>e.id),ids);
 assert.deepEqual(THREE_FINCH_ADDITIONS.map(e=>e.scientific),['Erythrura psittacea','Poephila personata','Spinus magellanicus']);
 assert.deepEqual(THREE_FINCH_ADDITIONS.map(e=>e.family),['カエデチョウ科','カエデチョウ科','アトリ科']);
 // Existing IDs and script action sequences are covered by the legacy save regression.
 assert.equal(sha(JSON.stringify(JAVA_BASELINE)),'ddc7b5ad79eb579d54535a0e292f921ac282117140c4035dbabf640fc609ece6');
 assert.deepEqual(ENCOUNTER_CANDIDATES.slice(30,32),ROSEFINCH_ADDITIONS);
 assert.equal(new Set(ENCOUNTER_CANDIDATES.map(e=>e.id)).size,35);
 assert.equal(new Set(THREE_FINCH_ADDITIONS.map(e=>e.scientific)).size,3);
 assert.equal(new Set(THREE_FINCH_ADDITIONS.map(e=>e.art.src)).size,3);
 for(const e of THREE_FINCH_ADDITIONS){assert.equal(e.kind,'species');assert.equal(e.parentId,null);assert.equal(e.gardenEvent.fictional,true);assert.equal(e.releaseReady,false);assert.equal(e.gates.layout,false);assert.ok(e.sources.length>=2);assert.ok(e.summary.length>40);assert.ok(!e.aliases.includes('ヒワヒワ'));}
});

test('the three real photographs retain each distinct original license and identical bytes',()=>{
 THREE_FINCH_ADDITIONS.forEach((e,i)=>{
  const p=e.photo,[hash,license,url]=photos[i];
  assert.equal(sha(readFileSync(new URL('../public/'+p.src,import.meta.url))),hash);
  assert.equal(p.license,license);assert.equal(p.licenseUrl,url);
  assert.equal(p.canCrop,false);assert.equal(p.canColorFilter,false);assert.equal(p.display,'contain');
  assert.ok(p.creator);assert.match(p.source,/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
  assert.match(p.caption,/ゲームの庭や当日の記録ではありません/);
 });
 assert.match(THREE_FINCH_ADDITIONS[0].appearance,/性別.*特定していません/);
 assert.match(THREE_FINCH_ADDITIONS[1].appearance,/性別.*特定していません/);
 assert.match(THREE_FINCH_ADDITIONS[2].appearance,/オス/);
});

test('three unknown silhouettes reveal separately and attribution stays outside unmodified photographs',()=>{
 const w=createWorld(1000),win=new Window();
 try{
  const before=serializeWorld(w);win.document.body.innerHTML=renderEncounterNotebook(w);
  for(const e of THREE_FINCH_ADDITIONS){const card=win.document.querySelector(`[data-encounter-page="${e.id}"]`);assert.ok(card.querySelector('.is-silhouette'));assert.ok(!card.textContent.includes(e.name));assert.equal(card.querySelector('img').alt,'');}
  assert.equal(serializeWorld(w),before);
  for(const e of THREE_FINCH_ADDITIONS){
   finish(w,e.id);win.document.body.innerHTML=renderEncounterNotebook(w);
   for(const other of THREE_FINCH_ADDITIONS){const found=w.encounters.discoveries.some(d=>d.id===other.id);assert.equal(Boolean(win.document.querySelector(`[data-encounter-page="${other.id}"] .is-silhouette`)),!found);}
   win.document.body.innerHTML=renderEncounterPage(w,e.id,{showPhoto:true});const figure=win.document.querySelector('.finch-photo'),img=figure.querySelector('img');
   assert.equal(img.style.objectFit,'contain');assert.equal(img.style.filter,'none');assert.equal(img.style.clipPath,'none');assert.equal(figure.lastElementChild.tagName,'FIGCAPTION');assert.ok(figure.querySelector('figcaption').textContent.includes(e.photo.creator));assert.equal(figure.querySelector(`a[href="${e.photo.licenseUrl}"]`).textContent,e.photo.license);
  }
 }finally{win.happyDOM.abort();}
});

test('all 32 existing discoveries, friendship and cage invitations survive the additive catalog and reload',()=>{
 const w=createWorld(1000);
 for(const e of ENCOUNTER_CATALOG.slice(0,32))finish(w,e.id);
 for(let p=10;p<100;p+=Math.min(8,100-p))system.pet(w,'long-tailed-rosefinch',Math.min(8,100-p),token(w));
 assert.ok(system.inviteCage(w,'long-tailed-rosefinch',token(w)).changed);
 const before=structuredClone(w),restored=parseSave(serializeWorld(w));
 assert.deepEqual(restored,before);assert.equal(restored.encounters.discoveries.length,32);assert.equal(restored.encounters.discoveries.some(d=>ids.includes(d.id)),false);
 finish(restored,ids[0]);assert.deepEqual(restored.encounters.discoveries.slice(0,32),before.encounters.discoveries);assert.deepEqual(restored.encounters.friendship,before.encounters.friendship);assert.deepEqual(restored.encounters.cageVisitors,before.encounters.cageVisitors);
});

test('each new story requires its own garden and resumes without changing birds, decoration or random state',()=>{
 for(const e of THREE_FINCH_ADDITIONS){
  const s=createEncounterSystem([e],{knownCatalog:ENCOUNTER_CANDIDATES}),w=createWorld(1000),before=structuredClone({birds:w.birds,decor:w.decor,seed:w.seed,economy:w.economy});
  s.enterGarden(w,token(w));s.selectGarden(w,'mizukagami',token(w));s.observeGarden(w,e.gardenEvent.scene,token(w));assert.deepEqual(w.encounters.queue,[]);
  s.selectGarden(w,e.gardenEvent.gardenIds[0],token(w));s.observeGarden(w,'water',token(w));assert.deepEqual(w.encounters.queue,[]);s.observeGarden(w,e.gardenEvent.scene,token(w));assert.deepEqual(w.encounters.queue,[e.id]);
  s.open(w,e.id,token(w));s.act(w,w.encounters.active.instanceId,e.steps[0].action,token(w));const resumed=parseSave(serializeWorld(w));assert.equal(resumed.encounters.active.step,1);
  for(const step of e.steps.slice(1))assert.ok(s.act(resumed,resumed.encounters.active.instanceId,step.action,token(resumed)).changed);
  assert.equal(resumed.encounters.discoveries.length,1);assert.equal(resumed.encounters.discoveries[0].id,e.id);validateWorld(resumed);
  assert.deepEqual({birds:resumed.birds,decor:resumed.decor,seed:resumed.seed,economy:resumed.economy},before);assert.deepEqual(parseSave(serializeWorld(resumed)),resumed);
 }
});
