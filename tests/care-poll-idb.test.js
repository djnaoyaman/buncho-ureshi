import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {IDBFactory} from 'fake-indexeddb';
import {mountGame} from '../src/game.js';
import {createWorld} from '../src/engine.js';
import {DB_NAME} from '../src/game-store.js';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function read(db){return new Promise((resolve,reject)=>{const tx=db.transaction('world','readonly'),r=tx.objectStore('world').get('current');tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);});}
test('real DOM + fake IndexedDB: a real store poll followed immediately by pet commits exactly once',async t=>{
 let now=Date.UTC(2026,10,3,6),starts=0;const oldNow=Date.now;Date.now=()=>now;
 const window=new Window({url:'https://example.test/game/'}),timers=new Map(),globals=new Map(),idb=new IDBFactory();let dispose;
 const values={window,document:window.document,location:window.location,navigator:window.navigator,localStorage:window.localStorage,FormData:window.FormData,matchMedia:window.matchMedia.bind(window),indexedDB:idb,BroadcastChannel:undefined,setInterval:fn=>{const id=timers.size+1;timers.set(id,fn);return id;},clearInterval:id=>timers.delete(id)};
 for(const[key,value]of Object.entries(values)){globals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});}
 const db=await new Promise((resolve,reject)=>{const r=idb.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 t.after(async()=>{dispose?.();db.close();await window.happyDOM.close();for(const[k,d]of globals)d?Object.defineProperty(globalThis,k,d):delete globalThis[k];Date.now=oldNow;});
 const initial=createWorld(now);initial.paused=true;
 await new Promise(resolve=>{const tx=db.transaction('world','readwrite');tx.objectStore('world').put(initial,'current');tx.oncomplete=resolve;});
 const root=window.document.createElement('main');root.id='game-root';window.document.body.append(root);
 const audio={setEnabled(){},unlockFromGesture:()=>Promise.resolve(true),chirp:async guard=>{if(!guard())return false;starts++;return true;},cancel(){},close(){}};
 dispose=await mountGame(root,{audioFactory:()=>audio});root.querySelector('#game-open-bird').click();
 const before=await read(db);assert.equal(before.birds[0].needs.energy,80);
 now+=1000;
 const polling=[...timers.values()][0](); // queues the real store's poll transaction
 root.querySelector('[data-game-care=pet]').click(); // captures pre-poll revision
 await polling;
 for(let i=0;i<30;i++)await sleep(2);
 const after=await read(db);
 assert.equal(after.revision,before.revision+3,'economy and lifecycle clock revisions plus exactly one care revision');
 assert.equal(after.birds[0].needs.energy,100);assert.equal(after.decor.points,before.decor.points+5);assert.equal(after.economy.gold,0);assert.equal(starts,1);
 assert.match(root.querySelector('.game-care-feedback').textContent,/ぴっ/);

});
