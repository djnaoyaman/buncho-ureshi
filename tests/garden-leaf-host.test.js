import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {IDBFactory} from 'fake-indexeddb';
import {mountGame} from '../src/game.js';
import {createWorld,validateWorld} from '../src/engine.js';
import {arriveGardenRaptor,raptorToken} from '../src/garden-raptors.js';
import {encounterSystem} from '../src/encounters.js';
import {startLeafEvent,chooseLeafEvent,leafEventToken} from '../src/garden-leaf-event.js';
import {DB_NAME} from '../src/game-store.js';

// Real mountGame + IndexedDB in a DOM emulator. No browser/visual acceptance.
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check,label){
 const end=Date.now()+3000;
 while(Date.now()<end){if(await check())return;await sleep(5);}
 assert.fail(`Timed out: ${label}`);
}
async function saved(indexedDB,value){
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction('world',value?'readwrite':'readonly'),r=value?tx.objectStore('world').put(value,'current'):tx.objectStore('world').get('current');tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);});}finally{db.close();}
}
async function host(t,{danger=false}={}){
 const window=new Window({url:'https://djnaoyaman.github.io/buncho-ureshi/game/',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableJavaScriptEvaluation:true}});
 const indexedDB=new IDBFactory(),globals=new Map(),timers=new Map();let dispose,id=0;
 for(const [key,value]of Object.entries({window,document:window.document,location:window.location,navigator:window.navigator,localStorage:window.localStorage,FormData:window.FormData,matchMedia:window.matchMedia.bind(window),indexedDB,BroadcastChannel:undefined,setInterval:fn=>{timers.set(++id,fn);return id;},clearInterval:id=>timers.delete(id)})){
  globals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
 }
 t.after(async()=>{dispose?.();await window.happyDOM.abort();await window.happyDOM.close();for(const[key,descriptor]of globals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
 const world=createWorld(Date.now(),842911);world.worldId=`garden-${Date.UTC(2026,10,14,8)}-842911`;
 if(danger)assert.equal(arriveGardenRaptor(world,'black-kite',Date.now(),{...raptorToken(world),gardenId:world.encounters.garden.id}).changed,true);
 encounterSystem.selectGarden(world,'komorebi',leafEventToken(world));assert.equal(startLeafEvent(world,leafEventToken(world)).changed,true,'fixture has leaf observers');assert.equal(chooseLeafEvent(world,'display',leafEventToken(world)).changed,true);encounterSystem.leaveGarden(world,leafEventToken(world));
 window.HTMLMediaElement.prototype.play=function(){return Promise.reject(Error('NotAllowedError'));};
 window.HTMLMediaElement.prototype.pause=function(){};window.HTMLMediaElement.prototype.load=function(){};
 await saved(indexedDB,world);
 const root=window.document.createElement('main');window.document.body.append(root);
 const mount=async()=>{dispose=await mountGame(root);};await mount();
 return {root,window,world,read:()=>saved(indexedDB),write:value=>saved(indexedDB,value),poll:async()=>{await [...timers.values()][0]();},reload:async()=>{dispose?.();dispose=null;await mount();}};
}

test('diary returns to original leaf garden and restores the pending story without a second reward',async t=>{
 const h=await host(t);h.root.querySelector('[data-game-panel="diary"]').click();
 await until(()=>h.root.querySelector('[data-leaf-go-garden]'),'diary link');
 assert.equal(h.root.querySelector('[data-leaf-go-garden]').dataset.leafGoGarden,'komorebi');
 h.root.querySelector('[data-leaf-go-garden]').click();
 await until(()=>h.root.querySelector('[data-leaf-complete]'),'story continuation');
 const before=(await h.read()).economy.gold;
 h.root.querySelector('[data-leaf-complete]').click();await until(async()=>(await h.read()).leafEvent.entry.completedTick!==null,'complete');
 assert.equal((await h.read()).economy.gold,before+3);validateWorld(await h.read());
});
