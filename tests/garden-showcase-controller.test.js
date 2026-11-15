import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {IDBFactory} from 'fake-indexeddb';
import {createWorld,validateWorld,parseSave,serializeWorld} from '../src/engine.js';
import {GARDEN_IDS} from '../src/data/gardens.js';
import {encounterSystem} from '../src/encounters.js';
import {mountEncounterPanel} from '../src/encounter-controller.js';
import {openGameStore} from '../src/game-store.js';
import {leafEventStatus,leafEventToken,startLeafEvent,chooseLeafEvent,completeLeafEvent} from '../src/garden-leaf-event.js';
import {expeditionToken,startExpedition,chooseExpedition,completeExpedition} from '../src/garden-expedition.js';

function ready(){
 const w=createWorld(Date.parse('2026-11-13T12:00:00Z'),31);
 for(const id of GARDEN_IDS){encounterSystem.selectGarden(w,id,leafEventToken(w));if(leafEventStatus(w).available)break;}
 startLeafEvent(w,leafEventToken(w));chooseLeafEvent(w,'deliver',leafEventToken(w));
 encounterSystem.leaveGarden(w,leafEventToken(w));encounterSystem.enterGarden(w,leafEventToken(w));completeLeafEvent(w,leafEventToken(w));
 for(const r of w.encounters.gardenFriends.regulars)r.lastInteractionTick=0;
 const actors=w.encounters.gardenFriends.regulars.slice(0,2).map(r=>r.id);
 startExpedition(w,'brook',actors,expeditionToken(w));chooseExpedition(w,'look',expeditionToken(w));completeExpedition(w,expeditionToken(w));
 w.settings.motion=false;return validateWorld(w);
}
test('mounted showcase clicks purchase, complete themes, replay and open diary with durable single reward',async t=>{
 const win=new Window(),root=win.document.body,store=await openGameStore({indexedDB:new IDBFactory()});
 let world=await store.transact(()=>ready()),pending=Promise.resolve(),diaryCalls=0;
 const initialGold=world.economy.gold,initialGems=world.decor.points,expedition=structuredClone(world.expedition);
 const panel=mountEncounterPanel(root,{getWorld:()=>world,initialMode:'garden',crowRandom:()=>1,onDiary:()=>diaryCalls++,transact:fn=>{pending=store.transact(fn).then(next=>{world=next;return next;});return pending;}});
 t.after(async()=>{panel.destroy();store.close();await win.happyDOM.close();});
 const card=()=>root.querySelector('[data-garden-details=showcase]');
 async function click(selector){const button=card().querySelector(selector);assert.ok(button,selector);assert.equal(button.disabled,false,selector);button.click();await pending;await new Promise(r=>setTimeout(r,0));validateWorld(world);assert.deepEqual(parseSave(serializeWorld(world)),world);}
 card().open=true;
 await click('[data-showcase-buy=bell][data-showcase-payment=discovery]');
 assert.equal(world.economy.gold,initialGold);assert.deepEqual(world.expedition,expedition);assert.equal(world.showcase.purchases.length,1);
 card().querySelector('[data-showcase-item]').value='bell';
 const actors=[...card().querySelectorAll('[data-showcase-actor]')].map(s=>s.value);
 panel.refresh();assert.equal(card().querySelector('[data-showcase-item]').value,'bell');
 for(const theme of ['song','discovery','style','song']){
  if(card().querySelector('[data-showcase-next]'))await click('[data-showcase-next]');
  assert.equal(card().querySelectorAll('[data-showcase-start]').length,3);
  await click(`[data-showcase-start=${theme}]`);
  assert.equal(world.showcase.active.theme,theme);assert.deepEqual(world.showcase.active.actorIds,actors);
  assert.equal(world.showcase.active.completedTick,null);
  await click('[data-showcase-complete]');
  assert.notEqual(world.showcase.active.completedTick,null);assert.ok(card().querySelector('.showcase-result'));
  assert.ok(card().querySelector('[data-showcase-next]'));assert.equal(card().querySelector('[data-showcase-start]'),null);
 }
 assert.equal(world.showcase.entries.length,3);assert.equal(world.showcase.gemAward,5);assert.equal(world.decor.points,initialGems+5);assert.equal(world.economy.gold,initialGold);
 const before=serializeWorld(world);await click('[data-showcase-diary]');assert.equal(diaryCalls,1);assert.equal(serializeWorld(world),before);
 assert.deepEqual(await store.transact(w=>w),world);
});
