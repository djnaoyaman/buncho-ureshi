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

test('C bookmark actions match the existing engine and roundtrip the complete saved world',async t=>{
 const {IDBFactory}=await import('fake-indexeddb');const {openGameStore}=await import('../src/game-store.js');
 const {createEncounterSystem}=await import('../src/encounters.js');const {mountEncounterPanel}=await import('../src/encounter-controller.js');
 const {validateWorld}=await import('../src/engine.js');const store=await openGameStore({indexedDB:new IDBFactory()});
 let w=createWorld(Date.UTC(2026,10,7));w.paused=true;w.encounters.garden.open=true;validateWorld(w);w=await store.transact(()=>w);
 let pending;const win=new Window(),system=createEncounterSystem([]),panel=mountEncounterPanel(win.document.body,{system,getWorld:()=>w,transact:fn=>pending=store.transact(draft=>{fn(draft);return draft;}).then(saved=>{w=saved;return saved;}),initialMode:'garden'});
 t.after(()=>{panel.destroy();win.happyDOM.abort();store.close();});
 for(const id of ids){const expected=structuredClone(w);system.observeGarden(expected,id,{worldId:w.worldId,revision:w.revision});win.document.querySelector(`[data-garden-observe=${id}]`).click();await pending;await new Promise(r=>setTimeout(r,0));assert.deepEqual(w,expected);validateWorld(w);assert.deepEqual(await store.transact(x=>x),expected);}
 const before=structuredClone(w);panel.refresh();assert.deepEqual(await store.transact(x=>x),before);
});
test('C bookmark disables all five actions while an encounter is active',()=>{
 const w=createWorld(Date.UTC(2026,10,7));w.encounters.active={id:'gouldian-finch'};const win=new Window();try{win.document.body.innerHTML=renderFinchGarden(w);assert.equal(win.document.querySelectorAll('[data-garden-observe]:disabled').length,5);}finally{win.happyDOM.abort();}
});
