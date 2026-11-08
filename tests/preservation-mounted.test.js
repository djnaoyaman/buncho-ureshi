import test from 'node:test';import assert from 'node:assert/strict';
import {Window} from 'happy-dom';import {IDBFactory,IDBObjectStore} from 'fake-indexeddb';
import {mountGame} from '../src/game.js';import {DB_NAME} from '../src/game-store.js';
import {serializeWorld,prepareWorldReplacement} from '../src/engine.js';
import {fixture,NOW,exact} from './fixtures/preservation.js';
const settle=()=>new Promise(r=>setTimeout(r,35));
async function harness(t){
 const win=new Window({url:'https://example.test/game/',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}}),idb=new IDBFactory(),globals=new Map();let dispose,confirmed=true,prompts=[];
 const values={window:win,document:win.document,location:win.location,navigator:win.navigator,localStorage:win.localStorage,FormData:win.FormData,matchMedia:win.matchMedia.bind(win),indexedDB:idb,BroadcastChannel:undefined,setInterval:()=>1,clearInterval:()=>{},confirm:s=>{prompts.push(s);return confirmed;}};
 for(const[k,v]of Object.entries(values)){globals.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});}
 win.localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));
 const oldNow=Date.now;Date.now=()=>NOW;
 const db=await new Promise((resolve,reject)=>{const r=idb.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 async function record(value){return new Promise((resolve,reject)=>{const tx=db.transaction('world',value?'readwrite':'readonly'),s=tx.objectStore('world'),r=value?s.put(value,'current'):s.get('current');tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);});}
 t.after(async()=>{dispose?.();db.close();await win.happyDOM.close();Date.now=oldNow;for(const[k,d]of globals)d?Object.defineProperty(globalThis,k,d):delete globalThis[k];});
 const initial=fixture();await record(initial);const root=win.document.createElement('main');win.document.body.append(root);
 dispose=await mountGame(root,{audioFactory:()=>({setEnabled(){},unlockFromGesture:async()=>true,cancel(){},close(){}})});
 root.querySelector('#game-nav-open').click();
 assert.ok(root.querySelector('#game-menu-settings'));root.querySelector('#game-menu-settings').click();
 // Assert the real integrated renderer after every application rerender; never inject test markup.
 function box(){const management=root.querySelector('[data-game-details=management]');assert.ok(management);assert.equal(management.querySelectorAll('.game-preservation').length,1);assert.equal(root.querySelectorAll('#game-import').length,1);management.open=true;return root.querySelector('#game-import');}
 function select(file){const input=box();Object.defineProperty(input,'files',{value:file?[file]:[],configurable:true});input.dispatchEvent(new win.Event('change',{bubbles:true}));return input;}
 exact(await record(),initial);box();
 return {root,record,initial,prompts,select,box,confirm:v=>confirmed=v,unmount:()=>{dispose();dispose=null;},file:w=>({size:serializeWorld(w).length,text:async()=>serializeWorld(w)})};
}
test('current mounted delegated controls: cancel/invalid/oversize/future version are byte-identical, then valid retry',async t=>{
 const h=await harness(t),incoming=fixture(500);h.select(null);await settle();exact(await h.record(),h.initial);assert.equal(h.prompts.length,0);
 for(const file of [{size:1,text:async()=>'{bad'},{size:4000001,text:async()=>{throw Error('must not read');}},{size:100,text:async()=>JSON.stringify({...incoming,version:999})}]){h.select(file);await settle();exact(await h.record(),h.initial);assert.equal(h.prompts.length,0);assert.match(h.root.textContent,/読み込めませんでした/);}
 h.confirm(false);const input=h.select(h.file(incoming));await settle();exact(await h.record(),h.initial);assert.equal(h.prompts.length,1);assert.equal(input.value,'');
 h.confirm(true);h.select(h.file(incoming));await settle();const after=await h.record();exact(after,prepareWorldReplacement(h.initial,incoming,NOW,after.worldId));assert.notEqual(after.worldId,h.initial.worldId);assert.equal(h.prompts.length,2);
});
test('out-of-order reads: only newest selection prompts and replaces, exact allowed transition',async t=>{
 const h=await harness(t),incoming=fixture(501);let release;h.select({size:10,text:()=>new Promise(r=>release=r)});h.select(h.file(incoming));await settle();const after=await h.record();exact(after,prepareWorldReplacement(h.initial,incoming,NOW,after.worldId));release(serializeWorld(fixture(502)));await settle();exact(await h.record(),after);assert.equal(h.prompts.length,1);
});
test('unmount during read suppresses confirmation and replacement',async t=>{
 const h=await harness(t);let release;h.select({size:10,text:()=>new Promise(r=>release=r)});h.unmount();release(serializeWorld(fixture(503)));await settle();exact(await h.record(),h.initial);assert.equal(h.prompts.length,0);
});
test('stale-tab replacement cannot overwrite externally changed world',async t=>{
 const h=await harness(t);let release;h.select({size:10,text:()=>new Promise(r=>release=r)});const peer=prepareWorldReplacement(h.initial,fixture(504),NOW,'peer-world');await h.record(peer);release(serializeWorld(fixture(505)));await settle();exact(await h.record(),peer);assert.match(h.root.textContent,/別のタブ/);
});
test('repeated export uses JSON downloads and leaves frozen paused save exactly unchanged',async t=>{
 const h=await harness(t),blobs=[],oldCreate=URL.createObjectURL,oldRevoke=URL.revokeObjectURL,oldTimeout=globalThis.setTimeout;
 URL.createObjectURL=b=>{blobs.push(b);return 'blob:fixture';};URL.revokeObjectURL=()=>{};
 globalThis.setTimeout=(fn,ms,...args)=>ms===10000?0:oldTimeout(fn,ms,...args);
 t.after(()=>{URL.createObjectURL=oldCreate;URL.revokeObjectURL=oldRevoke;globalThis.setTimeout=oldTimeout;});
 const b=h.root.querySelector('[data-game-action=export]');b.click();h.root.querySelector('[data-game-action=export]').click();for(let i=0;i<20&&blobs.length<2;i++)await settle();assert.equal(blobs.length,2);
 for(const blob of blobs){assert.equal(blob.type,'application/json');assert.equal(await blob.text(),serializeWorld(h.initial));}exact(await h.record(),h.initial);
});
test('reset all first confirmation then cancel does not alter save',async t=>{
 const h=await harness(t);h.root.querySelector('#game-reset-open').click();await settle();h.root.querySelector('[data-reset-kind=all]').click();h.root.querySelector('[data-game-action=reset-confirm]').click();await settle();assert.match(h.root.querySelector('.game-reset-dialog').textContent,/最後の確認/);h.root.querySelector('[data-game-action=reset-cancel]').click();await settle();exact(await h.record(),h.initial);assert.equal(h.root.querySelector('.game-reset-dialog')?.open,false);
});
test('mounted storage failure exposes escaped error and preserves save, then retry releases lock',async t=>{
 const h=await harness(t),incoming=fixture(506),put=IDBObjectStore.prototype.put;
 try{IDBObjectStore.prototype.put=function(){throw Error('<img src=x onerror=bad> fixture quota');};h.select(h.file(incoming));await settle();exact(await h.record(),h.initial);assert.match(h.root.textContent,/fixture quota/);assert.equal(h.root.querySelector('img[src=x]'),null);}finally{IDBObjectStore.prototype.put=put;}
 h.select(h.file(incoming));await settle();const after=await h.record();exact(after,prepareWorldReplacement(h.initial,incoming,NOW,after.worldId));
});
