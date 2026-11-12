import {selectGarden} from './fixtures/select-garden-jog.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createWorld} from '../src/engine.js';
import {mountEncounterPanel} from '../src/encounter-controller.js';

const settle=()=>new Promise(resolve=>setTimeout(resolve,0));
test('garden menus stay open through refresh and friend actions, but honor close and garden navigation', async t=>{
 const window=new Window(), root=window.document.body, world=createWorld(1000);
 const panel=mountEncounterPanel(root,{getWorld:()=>world,transact:async fn=>fn(world),initialMode:'garden'});
 t.after(()=>{panel.destroy();window.happyDOM.close();});
 await panel.garden();
 const get=key=>root.querySelector(`[data-garden-details="${key}"]`);
 get('friends').open=true;
 panel.refresh();
 assert.equal(get('friends').open,true,'periodic refresh');
 get('friends').querySelector('[data-garden-friend-action]').click();
 await settle();
 assert.equal(get('friends').open,true,'interaction redraw');
 const memory=get('friends').querySelector('details[data-garden-details]');
 assert.ok(memory,'interaction creates a memory');
 const memoryKey=memory.dataset.gardenDetails;memory.open=true;
 panel.refresh();
 assert.equal(get(memoryKey).open,true,'nested memory');
 get('friends').open=false;panel.refresh();
 assert.equal(get('friends').open,false,'explicit close persists');
 get('companions').open=true;panel.refresh();assert.equal(get('companions').open,true);
 selectGarden(root,'mizukagami');await settle();
 assert.equal(get('companions').open,false,'new garden starts closed');
});

test('notebook and species-page round trips retain the visit; real exits begin a new visit',async t=>{
 const window=new Window(),root=window.document.body,world=createWorld(1000);
 const {encounterSystem}=await import('../src/encounters.js');
 const panel=mountEncounterPanel(root,{getWorld:()=>world,transact:async fn=>fn(world),initialMode:'garden'});
 t.after(()=>{panel.destroy();window.happyDOM.close();});
 await panel.garden('java-rice');
 const ids=()=>[...root.querySelectorAll('.finch-garden-stage [data-garden-friend]')].map(x=>x.dataset.gardenFriend);
 const first=ids(),visits=world.encounters.garden.visits['java-rice'],seed=world.seed;
 for(const detail of [false,true]){
  root.querySelector('[data-encounter-back]').click();await settle();
  assert.ok(root.querySelector('.finch-notebook'));assert.equal(world.encounters.garden.open,true);
  if(detail){root.querySelector('[data-encounter-page]').click();await settle();root.querySelector('[data-encounter-back]').click();await settle();}
  root.querySelector('[data-finch-go-garden]').click();await settle();
  assert.deepEqual(ids(),first);assert.equal(world.encounters.garden.visits['java-rice'],visits);assert.equal(world.seed,seed);
  panel.refresh();assert.deepEqual(ids(),first);
 }
 encounterSystem.leaveGarden(world,{worldId:world.worldId,revision:world.revision});
 await panel.garden('java-rice');
 assert.equal(world.encounters.garden.visits['java-rice'],visits+1);assert.notDeepEqual(new Set(ids()),new Set(first));
});
