import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createWorld} from '../src/engine.js';
import {createEncounterSystem} from '../src/encounters.js';
import {INITIAL_EIGHT} from '../src/data/encounter-catalog.js';
import {renderEncounterNotebook,renderEncounterPage,renderEncounterScene,renderJavaBaselinePage} from '../src/encounter-ui.js';
import {renderCrowNotebook} from '../src/garden-crow-ui.js';
import {renderRaptorNotebook} from '../src/garden-raptor-ui.js';
import {inviteFixture} from './fixtures/garden-invitation.js';

test('every notebook and encounter page groups its actions without changing the world',async()=>{
 const win=new Window(),w=createWorld(1000,42),system=createEncounterSystem(INITIAL_EIGHT),entry=system.catalog[0];
 const token=()=>({worldId:w.worldId,revision:w.revision});
 const check=(render,selectors)=>{
  const before=JSON.stringify(w);win.document.body.innerHTML=render();
  const actions=win.document.querySelector('.finch-page-actions');assert.ok(actions);
  for(const selector of selectors)assert.equal(win.document.querySelector(selector).parentElement,actions,selector);
  assert.equal(actions.querySelectorAll('button').length,selectors.length);
  assert.equal(JSON.stringify(w),before);
 };
 try{
  check(()=>renderEncounterNotebook(w,{system}),['[data-finch-go-garden]','[data-crow-notebook]']);
  check(()=>renderEncounterPage(w,entry.id,{system}),['[data-finch-go-garden]','[data-encounter-back]']);
  inviteFixture(system,w,entry.id);system.open(w,entry.id,token());
  check(()=>renderEncounterScene(w,{system}),['[data-encounter-act]','[data-encounter-close]']);
  for(const step of entry.steps)system.act(w,w.encounters.active.instanceId,step.action,token());
  check(()=>renderEncounterPage(w,entry.id,{system}),['[data-finch-go-garden]','[data-encounter-back]']);
  check(()=>renderJavaBaselinePage(w),['[data-encounter-back]']);
  check(()=>renderCrowNotebook(w),['[data-encounter-back]','[data-finch-go-garden]']);
  check(()=>renderRaptorNotebook(w),['[data-crow-notebook]','[data-finch-go-garden]']);
  w.encounters.crow.visits.push({id:'large-billed-crow',firstTick:0,lastTick:0,count:1,petPoints:0});
  w.encounters.raptor.visits.push({id:'black-kite',firstTick:0,lastTick:0,count:1,petPoints:0});
  check(()=>renderCrowNotebook(w,{id:'large-billed-crow'}),['[data-crow-notebook]','[data-finch-go-garden]']);
  check(()=>renderRaptorNotebook(w,{id:'black-kite'}),['[data-crow-notebook]','[data-finch-go-garden]']);
 }finally{await win.happyDOM.close();}
});
