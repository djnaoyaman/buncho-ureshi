import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createWorld} from '../src/engine.js';
import {createEncounterSystem} from '../src/encounters.js';
import {INITIAL_EIGHT} from '../src/data/encounter-catalog.js';
import {renderEncounterNotebook,renderEncounterPage,renderEncounterCageGuest,renderFinchGarden,renderEncounterScene} from '../src/encounter-ui.js';
import {inviteFixture} from './fixtures/garden-invitation.js';
const system=createEncounterSystem(INITIAL_EIGHT),token=w=>({worldId:w.worldId,revision:w.revision});
const parse=(win,html)=>{win.document.body.innerHTML=html;return win.document.body;};

test('all game notebook entrances and returns use the same specific name without changing save data',async()=>{
 const win=new Window(),w=createWorld(1000,42),before=JSON.stringify(w),opts={system};
 let root=parse(win,renderEncounterNotebook(w,opts));
 assert.equal(root.querySelector('h3').textContent,'庭の鳥図鑑');
 assert.match(root.querySelector('.finch-notebook-intro').textContent,/庭で出会った鳥と、仲よくなった記録/);
 assert.equal(root.querySelector('section').getAttribute('aria-labelledby'),root.querySelector('h3').id);
 root=parse(win,renderEncounterPage(w,INITIAL_EIGHT[0].id,opts));
 assert.equal(root.querySelector('[data-encounter-back]').textContent,'庭の鳥図鑑へ戻る');
 root=parse(win,renderFinchGarden(w,opts));
 assert.equal(root.querySelector('header [data-encounter-back]').textContent,'庭の鳥図鑑');
 root=parse(win,renderEncounterCageGuest(INITIAL_EIGHT[0]));
 assert.match(root.querySelector('button').getAttribute('aria-label'),/庭の鳥図鑑をひらく/);
 assert.equal(JSON.stringify(w),before);await win.happyDOM.close();
});

test('discovery reward and unlocked detail identify the garden notebook',async()=>{
 const win=new Window(),w=createWorld(1000,42),entry=INITIAL_EIGHT[0];w.field.place='park';
 inviteFixture(system,w,entry.id);system.open(w,entry.id,token(w));
 for(const step of entry.steps.slice(0,-1))system.act(w,w.encounters.active.instanceId,step.action,token(w));
 let before=JSON.stringify(w),root=parse(win,renderEncounterScene(w,{system}));
 assert.equal(root.querySelector('[data-encounter-act]').textContent,'庭の鳥図鑑をひらく · 5 Gems');assert.equal(JSON.stringify(w),before);
 system.act(w,w.encounters.active.instanceId,entry.steps.at(-1).action,token(w));
 before=JSON.stringify(w);root=parse(win,renderEncounterPage(w,entry.id,{system}));
 assert.equal(root.querySelector('[data-encounter-back]').textContent,'庭の鳥図鑑へ戻る');assert.equal(JSON.stringify(w),before);
 await win.happyDOM.close();
});
