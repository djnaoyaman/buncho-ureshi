import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {IDBFactory,IDBObjectStore} from 'fake-indexeddb';
import {mountGame} from '../src/game.js';
import {DB_NAME} from '../src/game-store.js';
import {consultationFixture,expectedDecision,NOW} from './fixtures/consultation-letter.js';

// Real engine/store in a DOM emulator; native focus and layout remain browser checks.
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function rawWorld(indexedDB, value) {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('world');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('world', value ? 'readwrite' : 'readonly');
      const store = tx.objectStore('world');
      const request = value ? store.put(value, 'current') : store.get('current');
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
async function fixture(t){
 const window=new Window({url:'https://djnaoyaman.github.io/buncho-ureshi/game/',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableJavaScriptEvaluation:true}});
 const indexedDB=new IDBFactory(),globals=new Map();let dispose,nextTimer=0;
 // Suppress background intervals so every saved-state assertion is deterministic.
 const values={window,document:window.document,location:window.location,navigator:window.navigator,localStorage:window.localStorage,
  FormData:window.FormData,matchMedia:window.matchMedia.bind(window),indexedDB,BroadcastChannel:undefined,
  setInterval:()=>++nextTimer,clearInterval:()=>{}};
 for(const [key,value] of Object.entries(values)){
  globals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));
  Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
 }
 t.after(async()=>{
  dispose?.();await window.happyDOM.abort();await window.happyDOM.close();
  for(const [key,descriptor] of globals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
 });
 const root=window.document.createElement('main');window.document.body.append(root);
 return {window,root,indexedDB,async mount(){dispose=await mountGame(root);}};
}
for(const kind of ['adoption','independence','successor'])for(const options of [{},{pair:true,long:true,returning:true}])test(`consultation mounted selectors and engine transition ${kind} ${JSON.stringify(options)}`,async t=>{
 const f=await fixture(t),spec=consultationFixture(kind,options),realNow=Date.now;
 Date.now=()=>NOW;t.after(()=>{Date.now=realNow;});
 f.window.localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));
 await rawWorld(f.indexedDB,spec.world);await f.mount();
 assert.deepEqual(await rawWorld(f.indexedDB),spec.world);
 if(kind!=='adoption'){
  assert.equal(f.root.querySelectorAll('#game-nav-open').length,1);
  f.root.querySelector('#game-nav-open').click();assert.equal(f.root.querySelectorAll('#game-menu-family').length,1);f.root.querySelector('#game-menu-family').click();
  if(kind==='independence')f.root.querySelector('.game-independence').open=true;
 }
 const askSelector=kind==='adoption'?'[data-adoption-open]':`[data-${kind}-open="${spec.id}"]`;
 assert.equal(f.root.querySelectorAll(askSelector).length,1);const ask=f.root.querySelector(askSelector);ask.click();
 const dialog=f.root.querySelector(`.game-${kind}-dialog`);assert.ok(dialog?.open);assert.equal(dialog.querySelectorAll('.game-consultation-letter').length,1);
 assert.equal(dialog.querySelectorAll('button').length,kind==='adoption'?3:2);
 assert.equal(dialog.querySelectorAll('.game-consultation-portrait .game-mini-bird').length,spec.ids.length);
 assert.ok(dialog.querySelectorAll('.game-consultation-portrait img').length>0);
 const cancel=dialog.querySelector(`[data-${kind}-cancel]`);assert.equal(f.window.document.activeElement,cancel);cancel.click();assert.equal(dialog.open,false);assert.deepEqual(await rawWorld(f.indexedDB),spec.world);
 // Cancel starts a real controller poll. Retry only the read-only open request until its guard clears.
 for(let i=0;i<100&&!dialog.open;i++){f.root.querySelector(askSelector).click();if(!dialog.open)await sleep(5);}
 assert.equal(dialog.open,true);
 const accept=dialog.querySelector(kind==='adoption'?'[data-adoption-decision="accept"]':`[data-${kind}-accept]`);
 const put=IDBObjectStore.prototype.put;
 try{
  IDBObjectStore.prototype.put=function(){throw new Error('Consultation persistence failure');};accept.click();
  for(let i=0;i<100&&!dialog.querySelector('[role=status]').textContent;i++)await sleep(5);
  assert.ok(dialog.querySelector('[role=status]').textContent);assert.ok(dialog.open);
  assert.ok([...dialog.querySelectorAll('button')].every(b=>!b.disabled));assert.deepEqual(await rawWorld(f.indexedDB),spec.world);
 }finally{IDBObjectStore.prototype.put=put;}
 accept.click();accept.click();
 assert.ok([...dialog.querySelectorAll('button')].every(b=>b.disabled));
 for(let i=0;i<100&&dialog.open;i++)await sleep(5);
 assert.equal(dialog.open,false);assert.deepEqual(await rawWorld(f.indexedDB),expectedDecision(spec.world,spec));
});
