import test from 'node:test';
import {Window} from 'happy-dom';
import assert from 'node:assert/strict';
import {createWorld} from '../src/engine.js';
import {mountEncounterPanel} from '../src/encounter-controller.js';
// Minimal render sink: no browser, third-party dependencies or network access.
function sink(){return {ownerDocument:new Window().document,html:'',attrs:{},buttons:[],classList:{add(){},remove(){}},addEventListener(){},removeEventListener(){},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},querySelector(){return null;},querySelectorAll(){return this.buttons;},set innerHTML(s){this.html=s;this.buttons=Array.from(s.matchAll(/<button\b/g),()=>({disabled:false}));}};}
function setup(){const world=createWorld(1000,42),root=sink(),pending=[];const panel=mountEncounterPanel(root,{getWorld:()=>world,transact:fn=>new Promise(resolve=>pending.push(()=>resolve(fn(world))))});return {world,root,pending,panel};}
test('notebook navigation cancels a pending garden operation and releases disabled controls',async()=>{
 const {world,root,pending,panel}=setup();const first=panel.garden();await Promise.resolve();
 assert.equal(root.attrs['aria-busy'],'true');assert.ok(root.buttons.every(b=>b.disabled));
 panel.notebook();assert.equal(root.attrs['aria-busy'],'false');assert.ok(root.buttons.every(b=>!b.disabled));
 pending.shift()();assert.equal(await first,false);assert.equal(world.encounters.garden.open,false);
 const again=panel.garden();await Promise.resolve();pending.shift()();assert.equal(await again,true);
 assert.equal(root.attrs['aria-busy'],'false');assert.match(root.html,/finch-garden-selector/);panel.destroy();
});
test('old transaction cleanup cannot clear a newer garden operation busy state',async()=>{
 const {world,root,pending,panel}=setup();const first=panel.garden();await Promise.resolve();panel.notebook();
 const second=panel.garden('mizukagami');await Promise.resolve();assert.equal(pending.length,2);
 pending.shift()();assert.equal(await first,false);assert.equal(root.attrs['aria-busy'],'true');assert.equal(world.encounters.garden.open,false);
 pending.shift()();assert.equal(await second,true);assert.equal(world.encounters.garden.id,'mizukagami');assert.equal(root.attrs['aria-busy'],'false');panel.destroy();
});
test('destroyed operation does not write or resurrect a panel',async()=>{
 const {world,root,pending,panel}=setup();const first=panel.garden();await Promise.resolve();panel.destroy();pending.shift()();assert.equal(await first,false);assert.equal(world.encounters.garden.open,false);assert.equal(root.attrs['aria-busy'],undefined);
});

test('unrelated revision while garden selection waits does not discard the choice',async()=>{
 const {world,root,pending,panel}=setup();const choice=panel.garden('onsen');await Promise.resolve();
 world.revision++;pending.shift()();assert.equal(await choice,true);
 assert.equal(world.encounters.garden.id,'onsen');assert.equal(root.attrs['aria-busy'],'false');panel.destroy();
});
test('a newer different garden in another transaction is not overwritten',async()=>{
 const {world,root,pending,panel}=setup();const choice=panel.garden('onsen');await Promise.resolve();
 world.encounters.garden.id='komugi';world.revision++;pending.shift()();assert.equal(await choice,false);
 assert.equal(world.encounters.garden.id,'komugi');assert.match(root.html,/もう一度/);panel.destroy();
});
