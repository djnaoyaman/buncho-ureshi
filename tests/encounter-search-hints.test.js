import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createWorld} from '../src/engine.js';
import {createEncounterSystem,GARDEN_SCENES} from '../src/encounters.js';
import {ENCOUNTER_CANDIDATES} from '../src/data/encounter-catalog.js';
import {GARDENS,gardenById} from '../src/data/gardens.js';
import {encounterSearchHint,renderEncounterNotebook,renderEncounterPage,renderEncounterClues,renderFinchGarden} from '../src/encounter-ui.js';
import {inviteFixture} from './fixtures/garden-invitation.js';

const system=createEncounterSystem(ENCOUNTER_CANDIDATES),guard=w=>({worldId:w.worldId,revision:w.revision});
const dom=html=>{const win=new Window();win.document.body.innerHTML=html;return win.document.body;};
const actions={grass:'草をそっと観察',water:'水辺をそっと観察',branch:'枝を見上げ',song:'歌を聴',quiet:'ひとやすみ'};

test('all 32 hidden birds have source-derived gardens, real observation actions and gentle appearance clues',()=>{
 assert.equal(ENCOUNTER_CANDIDATES.length,35);
 for(const entry of ENCOUNTER_CANDIDATES){
  assert.ok(entry.searchClue,entry.id);
  const hint=encounterSearchHint(entry),names=entry.gardenEvent.gardenIds.map(id=>gardenById(id).name);
  for(const garden of GARDENS)assert.equal(hint.includes(garden.name),names.includes(garden.name),`${entry.id}: ${garden.id}`);
  assert.ok(hint.includes(actions[entry.gardenEvent.scene]),entry.id);
  assert.ok(hint.includes(entry.searchClue),entry.id);
  assert.match(hint,/^庭の友達より「/);
  assert.match(hint,/を見かけたよ」$/);
  assert.doesNotMatch(hint,/必ず|絵本を|ページを|ノートを|しおりを/);
  for(const name of [entry.name,entry.english,entry.scientific].filter(Boolean))assert.ok(!hint.includes(name),entry.id);
 }
});

test('every hinted first-meeting garden and action is reachable; all other combinations stay ineligible',()=>{
 for(const garden of GARDENS){
  const w=createWorld(1000);system.selectGarden(w,garden.id,guard(w));
  const controls=renderFinchGarden(w,{system});
  for(const scene of GARDEN_SCENES)assert.ok(controls.includes(`data-garden-observe="${scene}"`));
 }
 let combinations=0;
 for(const entry of ENCOUNTER_CANDIDATES){
  const isolated=createEncounterSystem([entry]);
  for(const garden of GARDENS)for(const scene of GARDEN_SCENES){
   const w=createWorld(1000,42);
   isolated.selectGarden(w,garden.id,guard(w));
   isolated.observeGarden(w,scene,guard(w));
   const eligible=entry.gardenEvent.gardenIds.includes(garden.id)&&entry.gardenEvent.scene===scene;
   assert.deepEqual(w.encounters.queue,eligible?[entry.id]:[],`${entry.id}: ${garden.id}/${scene}`);
   combinations++;
  }
 }
 assert.equal(combinations,35*35*5);
});

test('cards keep long garden lists compact and detail shows every exact garden without revealing names',()=>{
 const w=createWorld(1000),before=structuredClone(w),notebook=dom(renderEncounterNotebook(w,{system}));
 for(const entry of ENCOUNTER_CANDIDATES){
  const card=notebook.querySelector(`[data-encounter-page="${entry.id}"]`),page=dom(renderEncounterPage(w,entry.id,{system}));
  assert.equal(card.querySelector('small').textContent,encounterSearchHint(entry,{compact:true}));
  assert.equal(page.querySelector('[data-encounter-search-hint]').textContent,encounterSearchHint(entry));
  const garden=gardenById(entry.gardenEvent.gardenIds[0]),art=garden.background.landscape||garden.background;const landscape=page.querySelector('.finch-mystery-landscape');assert.ok(landscape,entry.id);assert.equal(landscape.getAttribute('src'),'/buncho-ureshi/'+art.src.replace(/\.png$/,'.screen.webp'));assert.equal(landscape.alt,'');assert.equal(page.querySelector('.finch-mystery-stamp .finch-art').alt,'');assert.ok(page.querySelector('.finch-mystery-stamp .is-silhouette'));assert.equal(page.querySelector('.finch-mystery-letter h4').textContent,garden.name+'より');
  assert.equal(card.querySelector('strong').textContent,'？？？');
  assert.ok(!card.getAttribute('aria-label').includes(entry.name));
  assert.ok(!page.textContent.includes(entry.name));
  assert.match(page.textContent,/庭の「観察する」/);
  assert.match(page.textContent,/ゲームの庭に伝わる目撃ばなし/);
  assert.match(page.textContent,/いつもいるとはかぎらない/);
  assert.equal(page.querySelector('.finch-photo'),null);
  for(const img of [...card.querySelectorAll('img'),...page.querySelectorAll('img')])assert.equal(img.alt,'');
  if(entry.gardenEvent.gardenIds.length>2)assert.match(card.querySelector('small').textContent,/などで/);
 }
 assert.deepEqual(w,before);
});

test('pending arrivals retain original story clues and resume; discovered pages retain friendship instead of search hints',()=>{
 const w=createWorld(1000),entry=ENCOUNTER_CANDIDATES[0];
 inviteFixture(system,w,entry.id);
 const pending=structuredClone(w);
 assert.ok(dom(renderEncounterClues(w,{system})).textContent.includes(entry.hint));
 assert.equal(dom(renderEncounterNotebook(w,{system})).querySelector(`[data-encounter-page="${entry.id}"] small`).textContent,'庭で待っているよ');
 assert.ok(dom(renderEncounterPage(w,entry.id,{system})).querySelector(`[data-encounter-open="${entry.id}"]`));
 assert.deepEqual(w,pending);
 system.open(w,entry.id,guard(w));
 for(const step of entry.steps)system.act(w,w.encounters.active.instanceId,step.action,guard(w));
 const before=structuredClone(w),page=dom(renderEncounterPage(w,entry.id,{system}));
 assert.equal(page.querySelector('[data-encounter-search-hint]'),null);
 assert.ok(page.querySelector('[data-finch-friendship]'));
 assert.equal(page.querySelector('#finch-entry-title').textContent,entry.name);
 assert.deepEqual(w,before);
});

test('untrusted appearance text is escaped and incomplete trial entries fall back safely',()=>{
 const entry={...ENCOUNTER_CANDIDATES[0],searchClue:'<img src=x onerror=alert(1)>'},s=createEncounterSystem([entry]);
 const page=dom(renderEncounterPage(createWorld(1000),entry.id,{system:s}));
 assert.equal(page.querySelector('[onerror]'),null);
 assert.ok(page.querySelector('[data-encounter-search-hint]').textContent.includes(entry.searchClue));
 assert.equal(encounterSearchHint({...entry,gardenEvent:undefined}),entry.hint);
});
