import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createWorld,serializeWorld} from '../src/engine.js';
import {renderCrowNotebook} from '../src/garden-crow-ui.js';
import {renderRaptorNotebook,renderRaptorNotice} from '../src/garden-raptor-ui.js';
import {mountEncounterPanel} from '../src/encounter-controller.js';
const now=Date.UTC(2026,10,7);
function seed(){const w=createWorld(now);Object.assign(w.encounters.crow,{lastArrivalAt:now-86400000,gardenId:'komorebi',speciesId:'large-billed-crow',arrivalBirdId:w.birds[0].id});w.encounters.raptor.lastArrivalAt=now-86400000;w.encounters.crow.visits.push({id:'large-billed-crow',firstTick:0,lastTick:0,count:2,petPoints:20});for(const id of ['black-kite','osprey'])w.encounters.raptor.visits.push({id,firstTick:0,lastTick:0,count:2,petPoints:20});return w;}
test('predator A keeps species, live relationship, visitor count and source in a save-neutral card',()=>{
 const w=seed(),before=serializeWorld(w);
 for(const [render,id] of [[renderCrowNotebook,'large-billed-crow'],[renderRaptorNotebook,'black-kite'],[renderRaptorNotebook,'osprey']]){
  const win=new Window();win.document.body.innerHTML=render(w,{id});const d=win.document,card=d.querySelector('.finch-predator-record');assert.ok(card);
  assert.match(card.querySelector('.finch-record-portrait').textContent,id==='osprey'?/文鳥を襲わない/:/親しみ100/);
  assert.match(card.querySelector('.finch-friendship').textContent,/庭で会った回数 2 回/);assert.equal(card.querySelector('meter').getAttribute('value'),'20');
  assert.ok(card.querySelector('[data-encounter-rub][tabindex="0"]'));assert.equal(card.querySelector('[data-notebook-reading=ecology]').open,false);
  assert.ok(card.querySelector('[data-notebook-reading=sources] a[href^="https://"]'));assert.ok(card.querySelector('[data-finch-go-home]'));
  assert.match(card.textContent,/現実の野鳥には触れず/);
 }
 assert.equal(serializeWorld(w),before);
});
test('unseen predator remains unnamed and unpettable; osprey never gets hostile wording',()=>{
 const w=createWorld(now);for(const [render,id] of [[renderCrowNotebook,'large-billed-crow'],[renderRaptorNotebook,'osprey']])assert.doesNotMatch(render(w,{id}),/data-encounter-rub/);
 const known=renderRaptorNotebook(seed(),{id:'osprey'});assert.match(known,/最初から文鳥を襲いません/);assert.doesNotMatch(known,/親しみ100から/);
});
test('predator reading survives periodic refresh and does not hide independent warning',()=>{
 const w=seed(),win=new Window(),root=win.document.createElement('div');win.document.body.append(root);const panel=mountEncounterPanel(root,{getWorld:()=>w,transact:async fn=>fn(w)});
 root.querySelector('[data-crow-notebook]').click();root.querySelector('[data-raptor-entry=osprey]').click();let details=root.querySelector('[data-notebook-reading=ecology]');details.open=true;details.querySelector('summary').focus();w.revision++;panel.refresh();assert.equal(root.querySelector('[data-notebook-reading=ecology]').open,true);assert.equal(win.document.activeElement.textContent,'くわしい説明');
 assert.equal(renderRaptorNotice(w),'');root.querySelector('[data-crow-notebook]').click();root.querySelector('[data-crow-entry=large-billed-crow]').click();assert.equal(root.querySelector('[data-notebook-reading=ecology]').open,false);panel.destroy();
});
