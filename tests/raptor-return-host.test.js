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
async function host(t){
 const window=new Window({url:'https://djnaoyaman.github.io/buncho-ureshi/game/',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableJavaScriptEvaluation:true}});
 const indexedDB=new IDBFactory(),globals=new Map(),timers=new Map();let dispose,id=0;
 for(const [key,value]of Object.entries({window,document:window.document,location:window.location,navigator:window.navigator,localStorage:window.localStorage,FormData:window.FormData,matchMedia:window.matchMedia.bind(window),indexedDB,BroadcastChannel:undefined,setInterval:fn=>{timers.set(++id,fn);return id;},clearInterval:id=>timers.delete(id)})){
  globals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
 }
 t.after(async()=>{dispose?.();await window.happyDOM.abort();await window.happyDOM.close();for(const[key,descriptor]of globals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
 const world=createWorld(Date.now(),301);world.field.place='park';world.encounters.garden.open=true;world.encounters.gardenFriends.attendees=['b1'];
 assert.equal(arriveGardenRaptor(world,'black-kite',Date.now(),{...raptorToken(world),gardenId:world.encounters.garden.id}).changed,true);
 world.paused=true;await saved(indexedDB,world);
 const root=window.document.createElement('main');window.document.body.append(root);
 const mount=async()=>{dispose=await mountGame(root);};await mount();
 return {root,window,world,read:()=>saved(indexedDB),poll:async()=>{await [...timers.values()][0]();},reload:async()=>{dispose?.();dispose=null;await mount();}};
}

test('host return choice reaches saved home and the actual home screen, without losing history',async t=>{
 const h=await host(t),dialog=h.root.querySelector('.game-raptor-return-dialog[open]');assert.ok(dialog);
 assert.equal(h.root.querySelector('.game-app').dataset.panel,'outdoors');
 assert.equal(h.window.document.activeElement.dataset.raptorChoice,'home');
 const before=await h.read();dialog.querySelector('[data-raptor-choice=home]').click();
 await until(()=>h.root.querySelector('.game-app').dataset.panel==='garden','home screen after choosing return');
 const after=await h.read();assert.equal(after.field.place,'home');assert.equal(after.encounters.garden.open,false);assert.equal(after.encounters.raptor.active,null);
 assert.deepEqual(after.encounters.raptor.visits,before.encounters.raptor.visits);assert.deepEqual(after.birds,before.birds);assert.equal(after.worldId,before.worldId);
 assert.equal(h.root.querySelector('.game-raptor-return-dialog'),null);assert.match(h.root.querySelector('.game-message').textContent,/おうちに戻った/);validateWorld(after);
 await h.reload();assert.equal(h.root.querySelector('.game-raptor-return-dialog'),null);assert.equal(h.root.querySelector('.game-app').dataset.panel,'garden');
});

test('host remain persists the answer, leaves the warning and a later safe home exit, including reload',async t=>{
 const h=await host(t),before=await h.read();h.root.querySelector('[data-raptor-choice=stay]').click();
 await until(()=>!h.root.querySelector('.game-raptor-return-dialog'),'remain removes prompt');
 const after=await h.read();assert.equal(after.encounters.raptor.active.returnChoicePending,false);assert.equal(after.encounters.raptor.active.remainingMs,before.encounters.raptor.active.remainingMs);
 assert.equal(h.root.querySelector('.game-app').dataset.panel,'outdoors');assert.ok(h.root.querySelector('[data-game-raptor-home]'));validateWorld(after);
 await h.reload();assert.equal(h.root.querySelector('.game-raptor-return-dialog'),null);assert.ok(h.root.querySelector('[data-raptor-notice]'));
 h.root.querySelector('[data-game-raptor-home]').click();await until(()=>h.root.querySelector('.game-app').dataset.panel==='garden','later home exit');assert.equal((await h.read()).field.place,'home');
});

test('host prompt traps Tab in its two choices and Escape uses the safe home path once',async t=>{
 const h=await host(t),dialog=h.root.querySelector('.game-raptor-return-dialog[open]'),home=dialog.querySelector('[data-raptor-choice=home]'),stay=dialog.querySelector('[data-raptor-choice=stay]');
 const key=(target,key,extra={})=>target.dispatchEvent(new h.window.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...extra}));
 home.focus();key(home,'Tab');assert.equal(h.window.document.activeElement,stay);key(stay,'Tab');assert.equal(h.window.document.activeElement,home);key(home,'Tab',{shiftKey:true});assert.equal(h.window.document.activeElement,stay);
 key(stay,'Escape');key(stay,'Escape');
 await until(()=>h.root.querySelector('.game-app').dataset.panel==='garden','Escape safely returns');const after=await h.read();assert.equal(after.encounters.raptor.active,null);assert.equal(after.field.place,'home');assert.equal(after.encounters.raptor.visits[0].count,1);validateWorld(after);
});

test('host redraw and reload preserve the unanswered question and its remaining time',async t=>{
 const h=await host(t),before=await h.read();await h.poll();assert.ok(h.root.querySelector('.game-raptor-return-dialog[open]'));
 await h.reload();const after=await h.read();assert.equal(after.encounters.raptor.active.returnChoicePending,true);assert.equal(after.encounters.raptor.active.remainingMs,before.encounters.raptor.active.remainingMs);assert.ok(h.root.querySelector('.game-raptor-return-dialog[open]'));validateWorld(after);
});
