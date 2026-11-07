import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {IDBFactory} from 'fake-indexeddb';
import {mountGame} from '../src/game.js';
import {createWorld,createBird,bumpRevision,renameBird,serializeWorld} from '../src/engine.js';
import {DB_NAME,openGameStore} from '../src/game-store.js';
const NOW=Date.UTC(2026,10,5),sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<300;i++){if(await fn())return;await sleep(5);}assert.fail('Timed out waiting for UI');}
async function raw(idb,value){const db=await new Promise((resolve,reject)=>{const r=idb.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});try{return await new Promise((resolve,reject)=>{const tx=db.transaction('world',value?'readwrite':'readonly'),r=value?tx.objectStore('world').put(value,'current'):tx.objectStore('world').get('current');tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
function family(){const w=createWorld(NOW);w.paused=true;w.settings.motion=false;for(let i=1;i<6;i++)createBird(w,{home:'resident',name:`家族${i}`,sex:i%2?'male':'female'});w.birds[0].partner='b2';w.birds[1].partner='b1';w.birds[0].pairTick=w.birds[1].pairTick=0;return w;}
async function setup(t,{paused=true}={}){
 const win=new Window({url:'https://djnaoyaman.github.io/buncho-ureshi/game/',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableJavaScriptEvaluation:true}}),idb=new IDBFactory(),globals=new Map(),timers=new Map();let n=0,dispose,failSave=false,clock=NOW;
 const open=idb.open.bind(idb);idb.open=(...args)=>{const r=open(...args);r.addEventListener('success',()=>{const db=r.result,transaction=db.transaction.bind(db);db.transaction=(names,mode,...rest)=>{const tx=transaction(names,mode,...rest);if(failSave&&mode==='readwrite'){failSave=false;queueMicrotask(()=>tx.abort());}return tx;};});return r;};
 const now=Date.now;Date.now=()=>clock;
 const values={window:win,document:win.document,location:win.location,navigator:win.navigator,localStorage:win.localStorage,FormData:win.FormData,matchMedia:win.matchMedia.bind(win),indexedDB:idb,BroadcastChannel:undefined,confirm:()=>true,setInterval:fn=>{timers.set(++n,fn);return n;},clearInterval:id=>timers.delete(id)};
 for(const [key,value]of Object.entries(values)){globals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});}
 t.after(async()=>{dispose?.();await win.happyDOM.abort();await win.happyDOM.close();Date.now=now;for(const [key,d]of globals){if(d)Object.defineProperty(globalThis,key,d);else delete globalThis[key];}});
 const initial=family();initial.paused=paused;await raw(idb,initial);const root=win.document.createElement('main');win.document.body.append(root);dispose=await mountGame(root);root.querySelector('[data-game-panel="family"]').click();
 return {win,root,idb,time:ms=>{clock=NOW+ms;},read:()=>raw(idb),write:w=>raw(idb,w),poll:()=>[...timers.values()].find(fn=>fn.name==='poll')(),fail:()=>{failSave=true;},stop:()=>{dispose();dispose=null;},open:()=>root.querySelector('[data-independence-open="b3"]').click()};
}

test('family consultation protects protagonist/mate and cancel or Escape leaves the save exact',async t=>{
 const f=await setup(t),before=await f.read();assert.equal(f.root.querySelector('[data-independence-open="b1"]'),null);assert.equal(f.root.querySelector('[data-independence-open="b2"]'),null);
 f.open();let dialog=f.root.querySelector('.game-independence-dialog');assert.ok(dialog.open);assert.equal(f.win.document.activeElement,dialog.querySelector('[data-independence-cancel]'));await f.poll();assert.ok(dialog.open);assert.deepEqual(await f.read(),before);
 dialog.querySelector('[data-independence-cancel]').click();await until(()=>!dialog.open);assert.deepEqual(await f.read(),before);
 f.open();dialog.dispatchEvent(new f.win.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(dialog.open,false);assert.deepEqual(await f.read(),before);
});

test('rapid duplicate acceptance changes one resident and keeps family graph plus history',async t=>{
 const f=await setup(t);f.open();const button=f.root.querySelector('[data-independence-accept]');button.click();button.click();await until(async()=>(await f.read()).birds[2].home==='departed');
 const w=await f.read();assert.equal(w.birds.length,6);assert.equal(w.birds.filter(b=>b.home==='resident').length,5);assert.equal(w.events.filter(e=>e.kind==='depart').length,1);assert.equal(f.root.querySelector('.game-independence-dialog').open,false);assert.ok(f.root.querySelector('[data-family-focus="b3"]'));assert.equal(f.root.querySelector('.game-independence'),null);
});

test('peer revision or world replacement invalidates the open consent without moving anyone',async t=>{
 const f=await setup(t);for(const replacement of [false,true]){f.open();const w=replacement?family():await f.read();if(replacement)w.worldId='another-family';else{renameBird(w,'b3','新しい名前');}await f.write(w);await until(async()=>{await f.poll();return !f.root.querySelector('.game-independence-dialog').open;});assert.equal(f.root.querySelector('.game-independence-dialog').open,false);assert.equal((await f.read()).birds[2].home,'resident');}
});

test('failed persistence leaves consent retryable and does not move any bird',async t=>{
 const f=await setup(t),before=await f.read();f.open();f.fail();f.root.querySelector('[data-independence-accept]').click();await until(()=>f.root.querySelector('[data-independence-notice]').textContent.length>0);assert.deepEqual(await f.read(),before);assert.ok(f.root.querySelector('.game-independence-dialog').open);await until(()=>!f.root.querySelector('[data-independence-accept]').disabled);f.root.querySelector('[data-independence-accept]').click();await until(async()=>(await f.read()).birds[2].home==='departed');
});

test('navigation and disposal close consent without applying it',async t=>{
 const f=await setup(t),before=await f.read();f.open();f.root.querySelector('[data-game-close-panel]').click();await until(()=>!f.root.querySelector('.game-independence-dialog').open);assert.deepEqual(await f.read(),before);f.root.querySelector('[data-game-panel="family"]').click();f.open();f.stop();assert.equal(f.root.querySelector('.game-independence-dialog').open,false);assert.deepEqual(await f.read(),before);
});

// The app remains unpaused; only the captured consent avoids ordinary story polling.
test('an unpaused consultation survives background time and acceptance synchronizes real care time',async t=>{
 const f=await setup(t,{paused:false}),before=await f.read();f.open();f.time(45000);await f.poll();assert.ok(f.root.querySelector('.game-independence-dialog').open);assert.equal((await f.read()).tick,before.tick);
 f.root.querySelector('[data-independence-accept]').click();await until(async()=>(await f.read()).birds[2].home==='departed');const after=await f.read();assert.equal(after.lifecycle.seenAt,NOW+45000);assert.equal(after.paused,false);assert.equal(after.events.filter(e=>e.kind==='depart').length,1);
});

test('A family cards identify the selected bird while zoom and navigation leave saves exact',async t=>{
 const f=await setup(t),before=await f.read(),root=f.root;
 assert.ok(root.querySelector('.game-family-cards-a'));
 assert.equal(root.querySelectorAll('.game-family-node[aria-pressed="true"]').length,1);
 assert.equal(root.querySelector('.game-family-node[aria-pressed="true"]').dataset.familyFocus,'b1');
 assert.equal(root.querySelector('.game-family-selected').textContent,'✓');
 const section=root.querySelector('.game-family-cards-a'),children=[...section.children];
 assert.ok(children.indexOf(section.querySelector('.game-family-pan'))<children.indexOf(section.querySelector('.game-family-zoom')));
 root.querySelector('.game-family-node[data-family-focus="b2"]').click();
 assert.equal(root.querySelector('.game-family-node[aria-pressed="true"]').dataset.familyFocus,'b2');
 assert.match(root.querySelector('.game-family-heading').textContent,/家族1/);
 root.querySelector('[data-family-zoom="1"]').click();
 assert.equal(root.querySelector('.game-family-node[aria-pressed="true"]').dataset.familyFocus,'b2');
 assert.deepEqual(await f.read(),before);
});
