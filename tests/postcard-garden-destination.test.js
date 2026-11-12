import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createWorld,serializeWorld} from '../src/engine.js';
import {encounterSystem} from '../src/encounters.js';
import {gardenById} from '../src/data/gardens.js';
import {renderEncounterPage} from '../src/encounter-ui.js';
import {mountEncounterPanel} from '../src/encounter-controller.js';

test('each unknown postcard links its shown garden without revealing the bird or writing a save',t=>{
 const win=new Window();t.after(()=>win.happyDOM.close());const w=createWorld(1000,42),before=serializeWorld(w);
 for(const entry of encounterSystem.catalog){
  win.document.body.innerHTML=renderEncounterPage(w,entry.id);
  const place=(entry.gardenEvent?.gardenIds||[]).map(gardenById).find(Boolean);
  const button=win.document.querySelector('[data-finch-go-garden]');
  if(button){assert.equal(button.dataset.finchGoGarden,place?.id||'');assert.match(win.document.querySelector('h4').textContent,new RegExp(place?.name||'庭の友達'));}
 }
 assert.equal(serializeWorld(w),before);
});

test('postcard button changes to its specific garden, preserves discoveries and rejects an invalid destination',async t=>{
 const win=new Window(),root=win.document.createElement('div');win.document.body.append(root);t.after(()=>win.happyDOM.close());
 const w=createWorld(1000,42),entry=encounterSystem.catalog.find(e=>e.gardenEvent.gardenIds[0]!==w.encounters.garden.id);
 const destination=entry.gardenEvent.gardenIds[0],birds=structuredClone(w.birds),discoveries=structuredClone(w.encounters.discoveries);
 const panel=mountEncounterPanel(root,{getWorld:()=>w,transact:async fn=>fn(w)});t.after(()=>panel.destroy());
 panel.entry(entry.id);const button=root.querySelector('[data-finch-go-garden]');assert.ok(button);assert.equal(button.dataset.finchGoGarden,destination);button.click();
 await new Promise(resolve=>setTimeout(resolve,30));assert.equal(w.encounters.garden.id,destination);assert.match(root.querySelector('#finch-garden-title').textContent,new RegExp(gardenById(destination).name));
 assert.deepEqual(w.encounters.discoveries,discoveries);assert.deepEqual(w.birds,birds);
 panel.entry(entry.id);const before=serializeWorld(w);root.querySelector('[data-finch-go-garden]').dataset.finchGoGarden='not-a-garden';root.querySelector('[data-finch-go-garden]').click();
 await new Promise(resolve=>setTimeout(resolve,30));assert.equal(serializeWorld(w),before);
});
