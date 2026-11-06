import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createWorld} from '../src/engine.js';
import {renderFinchGarden} from '../src/encounter-ui.js';
const ids=['grass','water','branch','song','quiet'];
test('C bookmark preserves five exact actions and marks only the current scene without saving',()=>{
 const w=createWorld(Date.UTC(2026,10,7));
 for(const scene of ids){w.encounters.garden.scene=scene;const before=structuredClone(w),win=new Window();win.document.body.innerHTML=renderFinchGarden(w);const panel=win.document.querySelector('.finch-observe-menu'),buttons=[...panel.querySelectorAll('[data-garden-observe]')];
  assert.equal(panel.querySelector('.finch-bookmark-title').textContent,'庭のしおり');assert.deepEqual(buttons.map(b=>b.dataset.gardenObserve),ids);
  assert.deepEqual(buttons.filter(b=>b.querySelector('.finch-bookmark-check').textContent==='✓').map(b=>b.dataset.gardenObserve),[scene]);
  assert.deepEqual(buttons.filter(b=>b.getAttribute('aria-pressed')==='true').map(b=>b.dataset.gardenObserve),[scene]);assert.deepEqual(w,before);
 }
});
test('C bookmark keeps waiting encounters disabled and the other tools reachable',()=>{
 const w=createWorld(Date.UTC(2026,10,7));w.encounters.queue=['gouldian-finch'];const win=new Window();win.document.body.innerHTML=renderFinchGarden(w);const d=win.document;
 assert.ok([...d.querySelectorAll('[data-garden-observe]')].every(b=>b.disabled));assert.ok(d.querySelector('[data-garden-details=companions]'));assert.ok(d.querySelector('[data-garden-details=about]'));
 assert.equal(d.querySelector('.finch-observe-menu').open,false);
});
