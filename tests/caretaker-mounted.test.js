import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBObjectStore} from 'fake-indexeddb';
import {fixture,rawWorld,until} from './caretaker-mounted-fixture.mjs';
import {hireCaretaker,economyToken,validateWorld,bumpRevision} from '../src/engine.js';
const NOW=1794096000000;
function changedPaths(a,b,path=''){
 if(JSON.stringify(a)===JSON.stringify(b))return [];
 if(a&&b&&typeof a==='object'&&typeof b==='object')return [...new Set([...Object.keys(a),...Object.keys(b)])].flatMap(k=>changedPaths(a[k],b[k],path?path+'.'+k:k));
 return [path];
}
async function open(f){
 f.root.querySelector('#game-menu-health').click();
 const fold=f.root.querySelector('[data-game-details="health-caretaker"]');
 fold.open=true;
 assert.equal(fold.querySelectorAll('.caretaker-recruitment').length,1,'real mountGame must render integrated component');
 return fold.querySelector('.caretaker-recruitment');
}
test('mounted native action retains exact real-engine save transition and duplicate guard',async t=>{
 const f=await fixture(t);await f.mount();const section=await open(f),before=await rawWorld(f.indexedDB);
 const expected=structuredClone(before);assert.equal(hireCaretaker(expected,3,economyToken(expected),NOW).changed,true);validateWorld(expected);
 // Select within the actual visible panel; duplicate decorative labels are aria-hidden.
 assert.equal(f.root.querySelectorAll('.caretaker-recruitment').length,1);
 assert.equal(section.querySelectorAll('button[data-life-hire]').length,3);
 assert.equal(section.querySelector('[aria-hidden=true]').querySelectorAll('button').length,0);
 const b=section.querySelector('[data-life-hire="3"]');b.querySelector('strong').click();b.click();
 await until(async()=>(await rawWorld(f.indexedDB)).economy.gold===428,'single committed purchase');
 assert.deepEqual(await rawWorld(f.indexedDB),expected);
 assert.deepEqual(changedPaths(before,expected).sort(),['revision','birds.0.needs.energy','birds.0.needs.food','economy.gold','lifecycle.caretaker'].sort());
 assert.equal(expected.revision,before.revision+2);
 const again=await open(f);assert.match(again.textContent,/3日/);
 assert.equal(again.querySelector('[data-life-hire="1"]').textContent,'1日延長24 Gold');
});
test('opening, dismissing and reopening without purchase is exactly read-only',async t=>{
 const f=await fixture(t);await f.mount();const before=await rawWorld(f.indexedDB);
 for(let i=0;i<2;i++){await open(f);f.root.querySelector('[data-game-close-panel]').click();}
 assert.deepEqual(await rawWorld(f.indexedDB),before);
});
test('stale displayed revision cannot debit a newer persisted save',async t=>{
 const f=await fixture(t);await f.mount();const section=await open(f),newer=await rawWorld(f.indexedDB);bumpRevision(newer);validateWorld(newer);await rawWorld(f.indexedDB,newer);
 section.querySelector('[data-life-hire="1"]').click();
 await until(()=>!section.querySelector('[data-life-hire="1"]').isConnected,'rerender after stale action');
 assert.deepEqual(await rawWorld(f.indexedDB),newer);
});
test('storage failure preserves exact saved world and reports failure',async t=>{
 const f=await fixture(t);await f.mount();const section=await open(f),before=await rawWorld(f.indexedDB);
 const original=IDBObjectStore.prototype.put;let attempted=false;
 IDBObjectStore.prototype.put=function(...args){attempted=true;throw new Error('caretaker-test-storage-failure');};
 t.after(()=>{IDBObjectStore.prototype.put=original;});
 section.querySelector('[data-life-hire="1"]').click();
 await until(()=>f.root.textContent.includes('caretaker-test-storage-failure'),'visible failure');
 IDBObjectStore.prototype.put=original;
 assert.equal(attempted,true);assert.deepEqual(await rawWorld(f.indexedDB),before);
});
test('disabled insufficient-funds button cannot start a transaction',async t=>{
 const f=await fixture(t);const w=await rawWorld(f.indexedDB);w.economy.gold=0;await rawWorld(f.indexedDB,w);await f.mount();
 const section=await open(f),before=await rawWorld(f.indexedDB);assert.ok([...section.querySelectorAll('button')].every(b=>b.disabled));
 section.querySelector('button').click();assert.deepEqual(await rawWorld(f.indexedDB),before);
});
test('disposing the app before pending store callback cancels purchase',async t=>{
 const f=await fixture(t);await f.mount();const section=await open(f),before=await rawWorld(f.indexedDB);
 section.querySelector('[data-life-hire="1"]').click();f.stop();
 // A queued readwrite transaction completes before this later readonly read.
 assert.deepEqual(await rawWorld(f.indexedDB),before);
});
test('closing panel after accepted click does not cancel or repeat its single purchase',async t=>{
 const f=await fixture(t);await f.mount();const section=await open(f),before=await rawWorld(f.indexedDB),expected=structuredClone(before);
 hireCaretaker(expected,1,economyToken(expected),NOW);
 section.querySelector('[data-life-hire="1"]').click();f.root.querySelector('[data-game-close-panel]').click();
 await until(async()=>(await rawWorld(f.indexedDB)).economy.gold===476,'accepted purchase');
 assert.deepEqual(await rawWorld(f.indexedDB),expected);await open(f);assert.deepEqual(await rawWorld(f.indexedDB),expected);
});
