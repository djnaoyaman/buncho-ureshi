import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Window } from 'happy-dom';
import { mountGame, careFloorOpacity, gameSpriteGeometry } from '../src/game.js';
import { createCareAudio } from '../src/care-audio.js';
import { createWorld, advanceTicks, adoptBird, serializeWorld, validateWorld, bumpRevision } from '../src/engine.js';
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
  const values={window,document:window.document,location:window.location,navigator:window.navigator,localStorage:window.localStorage,FormData:window.FormData,matchMedia:window.matchMedia.bind(window),indexedDB:undefined,BroadcastChannel:undefined,confirm:()=>confirmResult,setInterval:callback=>{const id=timers.size+1;timers.set(id,callback);return id;},clearInterval:id=>timers.delete(id)};
  for(const [key,value]of Object.entries(values)){globals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});}
  const root=window.document.createElement('main');window.document.body.append(root);
  t.after(async()=>{dispose?.();await window.happyDOM.close();for(const[key,descriptor]of globals)descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];});
  const f={window,root,rig,initial,failNext(){nextFailure=new Error('test save failure');},setConfirm(value){confirmResult=value;},importWorld(world){const input=root.querySelector('#game-import'),file=new window.File(['save'],'care.json',{type:'application/json'});Object.defineProperty(file,'text',{value:async()=>serializeWorld(world)});Object.defineProperty(input,'files',{configurable:true,value:[file]});input.dispatchEvent(new window.Event('change',{bubbles:true}));},read:()=>JSON.parse(window.localStorage.getItem(STORAGE_KEY)),write:w=>window.localStorage.setItem(STORAGE_KEY,serializeWorld(w)),hold(){const gate=deferred();nextGate=gate;return gate;},async mount(){dispose=await mountGame(root,{audioFactory:()=>createCareAudio({Context:rig.Context})});},stop(){dispose?.();dispose=null;},async settle(){await tail;await sleep(3);},async poll(){await [...timers.values()][0]();},change(node,value){if(node.type==='checkbox')node.checked=value;else node.value=value;node.dispatchEvent(new window.Event('change',{bubbles:true}));},select(id){const picker=root.querySelector('[data-game-scene-choose]');f.change(picker,id);},clickCare(kind){root.querySelector(`[data-game-care="${kind}"]`).click();},async sound(enabled){f.change(root.querySelector('[data-game-care-sound]'),enabled);await f.settle();}};
  return f;
}

test('care UI feeds captured bird, shows numeric fullness, cleans only cosmetic floor, and no-op repeats preserve revision',async t=>{
  const f=await fixture(t);await f.mount();assert.match(f.root.querySelector('[data-game-fullness]').textContent,/40 \/ 100/);assert.match(f.root.textContent,/大きいほど、おなかいっぱい/);
  assert.equal(f.root.querySelector('[data-game-care-sound]').checked,false);assert.equal(f.rig.contexts.length,0);
  const imageBefore=f.root.querySelector('.game-room-bird .game-sprite img').getAttribute('src');
  assert.equal(Number(f.root.querySelector('.game-floor-soil').style.getPropertyValue('--care-soil-opacity')), .194);
  f.clickCare('feed');await f.settle();assert.equal(f.read().birds[0].needs.food,60);assert.match(f.root.querySelector('[data-game-fullness]').textContent,/60 \/ 100/);
  assert.equal(f.read().events.filter(e=>e.kind==='user-feed').length,1);const after=f.read();
  f.clickCare('feed');f.clickCare('feed');await f.settle();assert.deepEqual(f.read(),after);assert.match(f.root.querySelector('.game-care-feedback').textContent,/さっき食べた/);
  f.clickCare('clean');await f.settle();assert.equal(f.read().care.cleanliness,100);assert.equal(f.root.querySelector('.game-floor-soil').style.getPropertyValue('--care-soil-opacity'),'0.000');assert.equal(f.root.querySelector('[data-game-cleanliness-value]').textContent,'100 / 100');
  const clean=f.read();f.clickCare('clean');await f.settle();assert.deepEqual(f.read(),clean);assert.equal(f.rig.starts,0);assert.equal(f.root.querySelector('.game-room-bird .game-sprite img').getAttribute('src'),imageBefore);
});

test('care UI pet response is silent by default, opt-in produces only one successful chirp and immediate mute stops it',async t=>{
  const f=await fixture(t);await f.mount();f.clickCare('pet');await f.settle();assert.equal(f.rig.contexts.length,0);assert.equal(f.read().birds[0].mood,64);assert.match(f.root.querySelector('.game-care-feedback').textContent,/ぴっ/);
  const world=f.read();world.tick++;world.birds[0].care.lastPetTick=null;bumpRevision(world);f.write(world);await f.poll();
  await f.sound(true);assert.equal(f.read().settings.careSound,true);assert.equal(f.rig.starts,0);f.clickCare('pet');await f.settle();await until(()=>f.rig.starts===2);assert(f.root.querySelector('.game-care-cheer'));
  const after=f.read();f.clickCare('pet');f.clickCare('pet');await f.settle();assert.deepEqual(f.read(),after);assert.equal(f.rig.starts,2);
  f.change(f.root.querySelector('[data-game-care-sound]'),false);assert(f.rig.contexts[0].nodes.every(node=>node.stops.includes(undefined)));await f.settle();assert.equal(f.read().settings.careSound,false);assert.equal(f.root.querySelector('.game-care-cheer'),null);
  assert.match(f.root.textContent,/本物の文鳥は触れられるのを嫌がる/);assert.match(f.root.textContent,/実際のおもちや文鳥の鳴き声ではありません/);
});

test('care UI delayed transaction keeps immutable bird ID but suppresses old feedback and audio after selection changes',async t=>{
  const f=await fixture(t,{sound:true});await f.mount();const gate=f.hold();f.clickCare('feed');f.select('b2');gate.resolve();await f.settle();assert.equal(f.read().birds[0].needs.food,60);assert.equal(f.read().birds[1].needs.food,f.initial.birds[1].needs.food);assert.equal(f.root.querySelector('.game-care-feedback'),null);
  f.select('b1');const petGate=f.hold();f.clickCare('pet');f.select('b2');petGate.resolve();await f.settle();assert.equal(f.read().birds[0].mood,64);assert.equal(f.rig.starts,0);assert.equal(f.root.querySelector('.game-care-cheer'),null);
});

test('care UI stale world IDs cannot feed or pet a same-ID bird imported by another tab',async t=>{
  const f=await fixture(t,{sound:true});await f.mount();const next=worldFixture({sound:true});next.worldId+='-replacement';next.birds[0].name='別の鳥';bumpRevision(next);f.write(next);
  f.clickCare('pet');await f.settle();assert.deepEqual(f.read(),next);assert.match(f.root.querySelector('.game-message').textContent,/別のタブで別の庭/);assert.equal(f.rig.starts,0);
  await f.poll();assert.match(f.root.querySelector('.game-profile-heading h3').textContent,/別の鳥/);assert.equal(f.rig.starts,0);
});

test('care UI delayed audio cannot survive selection, panel, world replacement or route teardown',async t=>{
  for(const cancel of ['selection','panel','world','route']){
    await t.test(cancel,async t=>{const rig=audioRig({held:true}),f=await fixture(t,{sound:true,rig});await f.mount();f.clickCare('pet');await until(()=>f.read().birds[0].care.lastPetTick!==null);await sleep(3);
      if(cancel==='selection')f.select('b2');if(cancel==='panel')f.root.querySelector('[data-game-panel="diary"]').click();if(cancel==='world'){const next=worldFixture({sound:true});next.worldId+='-replacement';bumpRevision(next);f.write(next);await f.poll();}if(cancel==='route')f.stop();
      rig.gate.resolve();await sleep(5);assert.equal(rig.starts,0);if(cancel==='route')assert.equal(rig.contexts[0].closes,1);
    });
  }
});

test('care UI eggs, chicks and departed birds get disabled buttons with explicit explanations',async t=>{
  for(const options of [{stage:'egg'},{stage:'chick'},{home:'departed'}])await t.test(JSON.stringify(options),async t=>{
    const f=await fixture(t,options);await f.mount();if(options.home){f.root.querySelector('[data-game-panel="roster"]').click();f.root.querySelector('[data-game-select="b1"]').click();}
    assert(f.root.querySelector('[data-game-care="feed"]').disabled);assert(f.root.querySelector('[data-game-care="pet"]').disabled);assert.match(f.root.querySelector('#game-care-explanation').textContent,options.home?/別の庭に巣立った/:/巣で育つ時間/);
    const before=f.read();f.clickCare('feed');f.clickCare('pet');await f.settle();assert.deepEqual(f.read(),before);assert.equal(f.rig.starts,0);
  });
});

test('care UI rapid opt-in then mute keeps saved and local audio off; reload of sound preference never autoplays',async t=>{
  const f=await fixture(t,{sound:true});await f.mount();assert.equal(f.rig.contexts.length,0);assert.equal(f.rig.starts,0);
  const gate=f.hold();f.change(f.root.querySelector('[data-game-care-sound]'),true);f.change(f.root.querySelector('[data-game-care-sound]'),false);gate.resolve();await f.settle();assert.equal(f.read().settings.careSound,false);assert.equal(f.root.querySelector('[data-game-care-sound]').checked,false);assert.equal(f.rig.starts,0);
  f.stop();await f.mount();assert.equal(f.rig.starts,0);assert.equal(f.root.querySelector('[data-game-care-sound]').checked,false);
});

test('care UI preserves reduced-motion choice, natural sprite contacts, floor opacity cap and bounded CSS-only ground patch',async t=>{
  const f=await fixture(t);const w=f.read();w.settings.motion=false;f.write(w);await f.mount();assert.equal(f.root.querySelector('.game-app').dataset.careMotion,'off');
  f.clickCare('pet');await f.settle();assert.equal(f.root.querySelector('.game-app').dataset.careMotion,'off');
  for(const value of [-100,0,20,100,1000,NaN,Infinity])assert(careFloorOpacity(value)>=0&&careFloorOpacity(value)<=.22);assert.equal(careFloorOpacity(100),0);
  const css=await readFile(new URL('../src/game.css',import.meta.url),'utf8');const additions=css.split('/* Care additions:')[1];assert(additions);assert(!additions.includes('filter:'));assert(additions.includes('z-index:1'));assert(additions.includes('pointer-events:none'));assert(additions.includes('prefers-reduced-motion'));assert(additions.includes('clip-path:polygon'));
  const overlay=f.root.querySelector('.game-floor-soil');assert.equal(overlay.parentElement.className,'game-room');assert.equal(overlay.getAttribute('aria-hidden'),'true');assert(!f.root.querySelector('.game-sprite .game-floor-soil'));
  for(const color of ['white','sakura','silver','cinnamon'])for(const stage of ['adult','juvenile','chick','egg']){const geometry=gameSpriteGeometry(color,stage);assert(Math.abs(geometry.imageLeft+geometry.footX*geometry.scale/850-.54)<1e-9);assert(Math.abs(geometry.imageTop+geometry.footY*geometry.scale/1000-.975)<1e-9);}
});


test('care UI transaction failure never presents a success or plays a chirp',async t=>{
  const f=await fixture(t,{sound:true});await f.mount();const before=f.read();f.failNext();f.clickCare('pet');await f.settle();assert.deepEqual(f.read(),before);assert.equal(f.rig.starts,0);assert.equal(f.root.querySelector('.game-care-feedback'),null);assert.match(f.root.querySelector('.game-message').textContent,/test save failure/);
});

test('care UI import cancel preserves the exact world, confirmed v2 import preserves care values and never autoplays',async t=>{
  const f=await fixture(t);await f.mount();f.root.querySelector('[data-game-panel="settings"]').click();const before=f.read(),imported=worldFixture({sound:true});imported.worldId+='-import';imported.care.cleanliness=33;imported.birds[0].needs.food=77;
  f.setConfirm(false);f.importWorld(imported);await sleep(5);await f.settle();assert.deepEqual(f.read(),before);assert.equal(f.rig.starts,0);
  f.setConfirm(true);f.importWorld(imported);await until(()=>f.read().worldId===imported.worldId);await f.settle();assert.equal(f.read().care.cleanliness,33);assert.equal(f.read().birds[0].needs.food,77);assert.equal(f.read().settings.careSound,true);assert.equal(f.rig.starts,0);assert.equal(f.rig.contexts.length,0);
  f.root.querySelector('[data-game-panel="garden"]').click();assert.equal(f.root.querySelector('[data-game-fullness]').textContent,'77 / 100');assert.equal(f.root.querySelector('[data-game-cleanliness-value]').textContent,'33 / 100');
});

test('care UI denied audio still commits pet feedback, and failed preference persistence cannot unmute the current view',async t=>{
  const rig=audioRig({reject:true}),f=await fixture(t,{rig,sound:true});await f.mount();f.clickCare('pet');await f.settle();assert.equal(f.read().birds[0].mood,64);assert.match(f.root.querySelector('.game-care-feedback').textContent,/ぴっ/);assert.match(f.root.querySelector('.game-message').textContent,/合成音を鳴らせません/);assert.equal(rig.starts,0);
  f.failNext();f.change(f.root.querySelector('[data-game-care-sound]'),false);await f.settle();assert.equal(f.read().settings.careSound,true,'failed write is not falsely reported persisted');assert.equal(f.root.querySelector('[data-game-care-sound]').checked,false,'local mute remains immediate despite storage failure');
});
