import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {Window} from 'happy-dom';
import {IDBFactory} from 'fake-indexeddb';
import {BASE_SOURCE,helpWorld,validated} from './fixtures/help-guide-world.js';
// Prep only: resolve all current game imports against the inspected base, replacing
// just help with this candidate. No shared source is copied or written. Once
// integrated, import the actual game directly rather than transforming it.
async function loadGame(){
 const url=pathToFileURL(resolve(BASE_SOURCE,'src/game.js'));
 if(!process.env.HELP_GUIDE_BASE_SOURCE)return import(url);
 const candidate=new URL('../src/game-help.js',import.meta.url).href;
 const source=readFileSync(url,'utf8').replace(/from (['"])(\.\/[^'"]+)\1/g,(_,q,p)=>`from ${q}${p==='./game-help.js'?candidate:new URL(p,url).href}${q}`).replaceAll('import.meta.url',JSON.stringify(url.href));
 return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
}
function record(db,value){return new Promise((resolve,reject)=>{
 const tx=db.transaction('world',value?'readwrite':'readonly');const r=value?tx.objectStore('world').put(value,'current'):tx.objectStore('world').get('current');
 tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);
});}
for(const known of [true,false])test(`actual game DOM: strict ${known?'known':'unknown'} holiday fixture, focus, repeat, poll, exact save`,async t=>{
 const world=helpWorld(known),window=new Window({url:'https://example.test/buncho-ureshi/game/'}),idb=new IDBFactory(),timers=new Map(),globals=new Map();
 const oldNow=Date.now;Date.now=()=>world.lastUpdated;let dispose,db;
 const values={window,document:window.document,location:window.location,navigator:window.navigator,localStorage:window.localStorage,FormData:window.FormData,matchMedia:window.matchMedia.bind(window),indexedDB:idb,BroadcastChannel:undefined,setInterval:fn=>{const id=timers.size+1;timers.set(id,fn);return id;},clearInterval:id=>timers.delete(id)};
 for(const[k,v]of Object.entries(values)){globals.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});}
 t.after(async()=>{dispose?.();db?.close();await window.happyDOM.close();for(const[k,d]of globals)d?Object.defineProperty(globalThis,k,d):delete globalThis[k];Date.now=oldNow;});
 db=await new Promise((resolve,reject)=>{const r=idb.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 window.localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));
 await record(db,world);const root=window.document.createElement('main');root.id='game-root';window.document.body.append(root);
 const {mountGame}=await loadGame();dispose=await mountGame(root,{audioFactory:()=>({setEnabled(){},unlockFromGesture:async()=>true,chirp:async()=>false,cancel(){},close(){}})});
 assert.deepEqual(await record(db),world);
 const url=window.location.href;
 const open=()=>window.document.dispatchEvent(new window.CustomEvent('buncho-world-action',{detail:'help'}));
 const select=()=>root.querySelector('[data-game-details="help-guide-step-1"]');
 for(let cycle=0;cycle<3;cycle++){
  open();assert.equal(root.querySelectorAll('.game-help-guide-card').length,5);assert.equal(window.document.activeElement,root.querySelector('.game-help h3'));
  assert.equal(root.querySelectorAll('.game-help details').length,8);
  const text=root.querySelector('[data-game-details="help-care"]').textContent;assert.equal(text.includes('この年'),!known);
  for(const detail of root.querySelectorAll('.game-help details')){assert.equal(detail.firstElementChild.tagName,'SUMMARY');detail.open=true;assert(detail.open);detail.open=false;assert(!detail.open);}
  select().open=true;select().querySelector('summary').focus();
  // A same-time peer revision forces the existing application/store rerender.
  const peer=structuredClone(world);peer.revision+=cycle+1;validated(peer);await record(db,peer);
  for(const poll of [...timers.values()])await poll();
  assert(select().open);assert.equal(window.document.activeElement,select().querySelector('summary'));
  assert.deepEqual(await record(db),peer);assert.equal(window.location.href,url);
  root.querySelector('[data-game-close-panel]').click();assert.equal(root.querySelector('.game-help'),null);assert.equal(window.document.activeElement,root.querySelector('#game-nav-open'));
  assert.deepEqual(await record(db),peer);
 }
});
