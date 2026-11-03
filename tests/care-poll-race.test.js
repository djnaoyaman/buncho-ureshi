import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { mountGame } from '../src/game.js';
import { createCareAudio } from '../src/care-audio.js';
import { renameBird,createWorld, advanceTicks, adoptBird, serializeWorld, validateWorld, bumpRevision } from '../src/engine.js';
import { STORAGE_KEY } from '../src/game-store.js';
import { audioRig, deferred } from './audio-fixture.js';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn,label='UI update'){for(let i=0;i<300;i++){if(await fn())return;await sleep(2);}assert.fail('Timed out: '+label);}
function worldFixture({stage='adult',home='resident',sound=false}={}){
  const w=createWorld(Date.now(),1209);advanceTicks(w,1);adoptBird(w,w.birds[1].id,'こめ');w.paused=true;
  w.birds[0].stage=stage;w.birds[0].home=home;w.birds[0].needs.food=40;w.birds[0].mood=60;w.birds[0].care={lastFedTick:null,lastPetTick:null};
  w.care.cleanliness=12;w.settings.careSound=sound;return validateWorld(w);
}
async function fixture(t,options={}){
  const window=new Window({url:'https://djnaoyaman.github.io/buncho-ureshi/game/',settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
  const rig=options.rig||audioRig(),initial=worldFixture(options),timers=new Map(),globals=new Map();let dispose,tail=Promise.resolve(),nextGate=null,nextFailure=null,confirmResult=true;
  const locks={request(name,fn){const gate=nextGate,failure=nextFailure;nextGate=null;nextFailure=null;const job=tail.then(async()=>{if(gate)await gate.promise;if(failure)throw failure;return fn();});tail=job.catch(()=>{});return job;}};
  Object.defineProperty(window.navigator,'locks',{value:locks,configurable:true});
  window.localStorage.setItem(STORAGE_KEY,serializeWorld(initial));
  if(!options.legacyUnmarked)window.localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:initial.settings.careSound}));
  const values={window,document:window.document,location:window.location,navigator:window.navigator,localStorage:window.localStorage,FormData:window.FormData,matchMedia:window.matchMedia.bind(window),indexedDB:undefined,BroadcastChannel:undefined,confirm:()=>confirmResult,setInterval:callback=>{const id=timers.size+1;timers.set(id,callback);return id;},clearInterval:id=>timers.delete(id)};
  for(const [key,value]of Object.entries(values)){globals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});}
  const root=window.document.createElement('main');window.document.body.append(root);
  t.after(async()=>{dispose?.();await window.happyDOM.close();for(const[key,descriptor]of globals)descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];});
  const f={window,root,rig,initial,failNext(){nextFailure=new Error('test save failure');},setConfirm(value){confirmResult=value;},importWorld(world){const input=root.querySelector('#game-import'),file=new window.File(['save'],'care.json',{type:'application/json'});Object.defineProperty(file,'text',{value:async()=>serializeWorld(world)});Object.defineProperty(input,'files',{configurable:true,value:[file]});input.dispatchEvent(new window.Event('change',{bubbles:true}));},read:()=>{const raw=JSON.parse(window.localStorage.getItem(STORAGE_KEY));return raw.current||raw;},write:w=>window.localStorage.setItem(STORAGE_KEY,serializeWorld(w)),hold(){const gate=deferred();nextGate=gate;return gate;},async mount(){dispose=await mountGame(root,{audioFactory:()=>createCareAudio({Context:rig.Context})});if(options.home!=='departed')f.openCare();},soundControl(){f.closeCare();window.document.dispatchEvent(new window.CustomEvent('buncho-world-action',{detail:'settings'}));return root.querySelector('[data-game-care-sound]');},soundChecked(){const value=f.soundControl().checked;f.openCare();return value;},openCare(){const overlay=root.querySelector('.game-panel-overlay[open]'),profileAction=overlay?.querySelector('[data-game-open-bird]');if(profileAction)profileAction.click();else{if(overlay)root.querySelector('[data-game-close-panel]').click();root.querySelector('[data-game-open-bird]').click();}assert(root.querySelector('.game-bird-sheet').open);},closeCare(){if(root.querySelector('.game-bird-sheet')?.open)root.querySelector('[data-game-close-bird]').click();},stop(){dispose?.();dispose=null;},async settle(){await tail;await sleep(3);},async poll(){await [...timers.values()][0]();},change(node,value){if(node.type==='checkbox')node.checked=value;else node.value=value;node.dispatchEvent(new window.Event('change',{bubbles:true}));},select(id){f.closeCare();for(let n=0;n<128&&root.querySelector('.game-bird-carousel-face').dataset.birdId!==id;n++)root.querySelector('.game-bird-carousel [data-bird-step="1"]').click();assert.equal(root.querySelector('.game-bird-carousel-face').dataset.birdId,id);f.openCare();},clickCare(kind){if(kind==='clean'){f.closeCare();if(root.querySelector('.game-panel-overlay')?.open)root.querySelector('[data-game-close-panel]').click();}else if(!root.querySelector('.game-bird-sheet')?.open)f.openCare();root.querySelector(`[data-game-care="${kind}"]`).click();},async sound(enabled){f.change(f.soundControl(),enabled);await f.settle();f.openCare();}};
  return f;
}

// A fixed clock makes the exact revision transition deterministic; advancing it
// while a poll is queued reproduces the live-browser race without native audio.
function clock(t){let now=Date.UTC(2026,10,3,6);const original=Date.now;Date.now=()=>now;t.after(()=>{Date.now=original;});return ms=>{now+=ms;};}
function act(f,kind){if(kind==='talk')f.root.querySelector('[data-game-talk="名前を呼ぶ"]').click();else f.clickCare(kind);}

for(const kind of ['feed','pet','talk'])test(`${kind} survives an own paused clock-only poll and reserves duplicate gestures`,async t=>{
 const advance=clock(t),f=await fixture(t,{sound:true});await f.mount();const before=f.read(),gate=f.hold();advance(1000);const polling=f.poll();
 act(f,kind);act(f,kind);assert.equal(f.rig.contexts.length,1,'unlock happens synchronously before held poll');assert.equal(f.rig.starts,0);
 gate.resolve();await polling;await f.settle();await until(()=>f.rig.starts===2);
 const after=f.read();assert.equal(after.economy.gold,before.economy.gold+4);assert.equal(after.decor.points,before.decor.points+(kind==='feed'?6:5));
 assert.equal(after.birds[0].needs[kind==='feed'?'food':'energy'],kind==='feed'?60:100);assert.equal(f.rig.starts,2);
});

test('live story-tick poll preserves feed intent without advancing it twice',async t=>{
 const advance=clock(t),f=await fixture(t,{sound:true});await f.mount();const live=f.read();live.paused=false;f.write(live);await f.poll();
 const before=f.read(),gate=f.hold();advance(15000);const polling=f.poll();f.clickCare('feed');gate.resolve();await polling;await f.settle();
 assert.equal(f.read().tick,before.tick+1);assert.equal(f.read().birds[0].needs.food,60);assert.equal(f.read().economy.gold,before.economy.gold+4);
});

for(const change of ['fill','rename','import'])test(`poll cannot rebase a care intent over peer ${change}`,async t=>{
 const advance=clock(t),f=await fixture(t,{sound:true});await f.mount();const gate=f.hold();advance(1000);const polling=f.poll();f.clickCare('feed');
 const peer=f.read();if(change==='fill')peer.birds[0].needs.food=100;if(change==='rename')renameBird(peer,'b1','別の名前');if(change==='import')peer.worldId+='-peer';bumpRevision(peer);f.write(peer);
 gate.resolve();await polling;await f.settle();const after=f.read();assert.equal(after.decor.points,peer.decor.points);assert.equal(after.economy.gold,peer.economy.gold);assert.equal(after.birds[0].needs.food,peer.birds[0].needs.food);assert.equal(f.rig.starts,0);
 if(change!=='import')assert.match(f.root.querySelector('.game-bird-sheet .game-sheet-message').textContent,/もう一度/);
 // A rejected reservation must not swallow a later legitimate interaction.
 if(!f.root.querySelector('.game-bird-sheet').open)f.openCare();f.clickCare('pet');await f.settle();assert.equal(f.read().birds[0].needs.energy,100);
});

test('a peer write queued after our poll still meets the unchanged engine revision guard',async t=>{
 const advance=clock(t),f=await fixture(t,{sound:true});await f.mount();const gate=f.hold();advance(1000);const polling=f.poll();f.clickCare('feed');
 // This listener runs while poll restores the UI, before afterCarePoll resumes.
 const write=()=>{const peer=f.read();renameBird(peer,'b1','新しい名前');f.write(peer);};
 f.window.document.addEventListener('buncho-game-panel',write,{once:true});gate.resolve();await polling;await f.settle();
 assert.equal(f.read().birds[0].needs.food,40);assert.equal(f.read().economy.gold,0);assert.equal(f.rig.starts,0);assert.match(f.root.querySelector('.game-bird-sheet .game-sheet-message').textContent,/もう一度/);
 f.clickCare('feed');await f.settle();assert.equal(f.read().birds[0].needs.food,60);
});

for(const stop of ['selection','panel','dispose'])test(`pending poll care is cancelled by ${stop}`,async t=>{
 const advance=clock(t),f=await fixture(t,{sound:true});await f.mount();const gate=f.hold();advance(1000);const polling=f.poll();f.clickCare('feed');
 if(stop==='selection')f.select('b2');if(stop==='panel')f.closeCare();if(stop==='dispose')f.stop();gate.resolve();await polling;await f.settle();
 assert.equal(f.read().birds[0].needs.food,40);assert.equal(f.read().economy.gold,0);assert.equal(f.rig.starts,0);
 if(stop!=='dispose'){f.openCare();f.clickCare('pet');await f.settle();assert.equal(f.read().birds.find(b=>b.id===(stop==='selection'?'b2':'b1')).needs.energy,100);}
});

test('failed poll and failed care save release their reservation without reward or sound',async t=>{
 const advance=clock(t),f=await fixture(t,{sound:true});await f.mount();const before=f.read(),gate=f.hold();f.failNext();advance(1000);const polling=f.poll();f.clickCare('feed');gate.resolve();await polling;await f.settle();
 assert.equal(f.read().birds[0].needs.food,40);assert.equal(f.rig.starts,0);
 f.failNext();f.clickCare('feed');await f.settle();assert.equal(f.read().decor.points,before.decor.points);assert.equal(f.rig.starts,0);
 f.clickCare('feed');await f.settle();assert.equal(f.read().birds[0].needs.food,60);assert.equal(f.read().economy.gold,4);
});

for(const kind of ['pet','talk'])test(`${kind} may commit after a slow own poll but must never play its stale chirp`,async t=>{
 const advance=clock(t),f=await fixture(t,{sound:true});await f.mount();const gate=f.hold();advance(1000);const polling=f.poll();act(f,kind);advance(1501);gate.resolve();await polling;await f.settle();
 assert.equal(f.read().birds[0].needs.energy,100);assert.equal(f.read().economy.gold,4);assert.equal(f.rig.starts,0);
});

test('pet and talk queued behind the same poll share one pending care reservation',async t=>{
 const advance=clock(t),f=await fixture(t,{sound:true});await f.mount();const w=f.read();w.birds[0].needs.energy=40;bumpRevision(w);f.write(w);await f.poll();
 const before=f.read(),gate=f.hold();advance(1000);const polling=f.poll();act(f,'pet');act(f,'talk');gate.resolve();await polling;await f.settle();
 assert.equal(f.read().birds[0].needs.energy,60);assert.equal(f.read().economy.gold,before.economy.gold+4);assert.equal(f.rig.starts,2);
});

test('cancelled intent cannot clear a newer reservation while the same poll is pending',async t=>{
 const advance=clock(t),f=await fixture(t,{sound:true});await f.mount();const gate=f.hold();advance(1000);const polling=f.poll();f.clickCare('feed');f.closeCare();f.openCare();f.clickCare('feed');f.clickCare('feed');gate.resolve();await polling;await f.settle();
 assert.equal(f.read().birds[0].needs.food,60);assert.equal(f.read().economy.gold,4);assert.equal(f.rig.starts,2);
});
