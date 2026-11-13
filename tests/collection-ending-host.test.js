import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {IDBFactory} from 'fake-indexeddb';
import {mountGame} from '../src/game.js';
import {createWorld,validateWorld} from '../src/engine.js';
import {arriveGardenRaptor,raptorToken} from '../src/garden-raptors.js';
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
 const world=createWorld(Date.now(),301);world.field.place='park';world.encounters.garden.open=true;world.encounters.gardenFriends.attendees=['b1'];
 if(danger)assert.equal(arriveGardenRaptor(world,'black-kite',Date.now(),{...raptorToken(world),gardenId:world.encounters.garden.id}).changed,true);
 world.collectionEndings.entries=[{id:'garden',unlockedTick:0,acknowledged:false,lease:null}];
 window.HTMLMediaElement.prototype.play=function(){return Promise.reject(Error('NotAllowedError'));};
 window.HTMLMediaElement.prototype.pause=function(){};window.HTMLMediaElement.prototype.load=function(){};
 world.paused=true;await saved(indexedDB,world);
 const root=window.document.createElement('main');window.document.body.append(root);
 const mount=async()=>{dispose=await mountGame(root);};await mount();
 return {root,window,world,read:()=>saved(indexedDB),write:value=>saved(indexedDB,value),poll:async()=>{await [...timers.values()][0]();},reload:async()=>{dispose?.();dispose=null;await mount();}};
}

test('earned ending integrates with game persistence, close and diary replay',async t=>{
 const h=await host(t);await until(()=>h.root.querySelector('[data-ending-skip]'),'ending opens');
 h.root.querySelector('[data-ending-skip]').click();await until(async()=>(await h.read()).collectionEndings.entries[0].acknowledged,'ack saved');
 await until(()=>!h.root.querySelector('[data-ending-skip]'),'ending closes');
 h.root.querySelector('[data-game-panel="diary"]').click();await until(()=>h.root.querySelector('[data-ending-replay="garden"]'),'diary ending visible');
 h.root.querySelector('[data-ending-replay="garden"]').click();await until(()=>h.root.querySelector('[data-ending-skip]'),'manual replay');
 validateWorld(await h.read());
});
test('dangerous encounter defers earned ending until safe home return',async t=>{
 const h=await host(t,{danger:true});assert.ok(h.root.querySelector('.game-raptor-return-dialog[open]'));assert.equal(h.root.querySelector('[data-ending-skip]'),null);
 h.root.querySelector('[data-raptor-choice=home]').click();await until(()=>h.root.querySelector('[data-ending-skip]'),'ending after safe return');
 assert.equal((await h.read()).encounters.raptor.active,null);validateWorld(await h.read());
});

test('active ending poll observes another tab world replacement without advancing or overwriting it',async t=>{
 const h=await host(t);await until(()=>h.root.querySelector('[data-ending-skip]'),'ending opens');
 const replacement=createWorld(Date.now()+1000,404);replacement.paused=true;validateWorld(replacement);
 await h.write(replacement);await h.poll();await until(()=>!h.root.querySelector('[data-ending-skip]'),'old movie removed');
 assert.equal(h.window.document.body.hasAttribute('data-game-ending-active'),false);
 assert.deepEqual(await h.read(),replacement);assert.equal(h.root.querySelector('[data-ending-replay]'),null);
});
