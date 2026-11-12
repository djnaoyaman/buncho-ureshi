import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {createWorld,serializeWorld} from '../src/engine.js';
import {encounterSystem} from '../src/encounters.js';
import {renderEncounterNotebook} from '../src/encounter-ui.js';

test('bird notebook keeps full content in one uncapped list with independent illustration and reading areas',t=>{
 const win=new Window();t.after(()=>win.happyDOM.close());const doc=win.document;doc.body.dataset.world='buncho';
 for(const file of ['encounter-ui.css','game.css']){const style=doc.createElement('style');style.textContent=readFileSync(new URL('../src/'+file,import.meta.url),'utf8');doc.head.append(style);}
 const world=createWorld(1000,42),before=serializeWorld(world);
 doc.body.innerHTML=`<div class="game-app"><div class="game-encounter-host"><div class="finch-overlay-content">${renderEncounterNotebook(world)}</div></div></div>`;
 const list=doc.querySelector('.finch-catalog'),style=win.getComputedStyle(list);
 assert.equal(style.gridTemplateColumns,'minmax(0,1fr)');assert.equal(style.maxHeight,'none');assert.equal(style.overflow,'visible');
 const cards=[...list.children];assert.equal(cards.length,encounterSystem.catalog.length);
 for(const card of cards){
  assert.equal(win.getComputedStyle(card).display,'grid');
  assert.equal(win.getComputedStyle(card.querySelector('.finch-media')).gridRow,'1 / 4');
  assert.equal(win.getComputedStyle(card.querySelector('strong')).gridColumn,'2');
  assert.equal(win.getComputedStyle(card.querySelector('small')).overflowWrap,'anywhere');
  assert.equal(win.getComputedStyle(card.querySelector('img')).objectFit,'contain');
  assert.equal(win.getComputedStyle(card.querySelector('img')).height,'132px');
  assert.equal(card.querySelector('strong').textContent,'？？？');
  assert.ok(card.querySelector('img').classList.contains('is-silhouette'));
  assert.ok(card.querySelector('small').textContent.length>0);
 }
 assert.equal(serializeWorld(world),before);
});
