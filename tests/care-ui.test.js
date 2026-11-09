import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Window } from 'happy-dom';
import { mountGame, careFloorOpacity, gameSpriteGeometry, gameCareBirdSvg } from '../src/game.js';
import { createCareAudio } from '../src/care-audio.js';
import { careWindow,renameBird,createWorld, advanceTicks, adoptBird, serializeWorld, validateWorld, bumpRevision } from '../src/engine.js';
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

test('care UI feeds captured bird, shows numeric fullness, cleans only cosmetic floor, and no-op repeats preserve revision',async t=>{
  const f=await fixture(t);await f.mount();assert.match(f.root.querySelector('[data-game-fullness]').textContent,/40 \/ 100/);assert.match(f.root.querySelector('.game-fullness').textContent,/おなか/);assert.equal(f.root.querySelector('meter[aria-label=おなか]').getAttribute('value'),'40');assert.equal(f.root.querySelector('meter[aria-label=元気]').getAttribute('value'),String(Math.round(f.initial.birds[0].needs.energy)));
  assert.equal(f.soundChecked(),false);assert.equal(f.rig.contexts.length,0);
  const imageBefore=f.root.querySelector('.game-room-bird .game-sprite img').getAttribute('src');
  assert.equal(Number(f.root.querySelector('.game-floor-soil').style.getPropertyValue('--care-soil-opacity')), .194);
  f.clickCare('feed');await f.settle();assert.equal(f.read().birds[0].needs.food,60);assert.match(f.root.querySelector('[data-game-fullness]').textContent,/60 \/ 100/);assert.equal(f.root.querySelector('meter[aria-label=おなか]').getAttribute('value'),'60');
  assert.equal(f.read().events.filter(e=>e.kind==='user-feed').length,1);const after=f.read();
  f.clickCare('feed');await f.settle();f.clickCare('feed');await f.settle();assert.equal(f.read().birds[0].needs.food,100);assert.equal(f.root.querySelector('meter[aria-label=おなか]').getAttribute('value'),'100');const full=f.read();f.clickCare('feed');await f.settle();assert.deepEqual(f.read(),full);assert.equal(f.root.querySelector('[data-game-care=feed]').disabled,true);
  f.clickCare('clean');await f.settle();assert.equal(f.read().care.cleanliness,100);assert.equal(f.root.querySelector('.game-floor-soil').style.getPropertyValue('--care-soil-opacity'),'0.000');assert.equal(f.root.querySelector('[data-game-cleanliness-value]').textContent,'100 / 100');
  const clean=f.read();f.clickCare('clean');await f.settle();assert.deepEqual(f.read(),clean);assert.equal(f.rig.starts,0);assert.equal(f.root.querySelector('.game-room-bird .game-sprite img').getAttribute('src'),imageBefore);
});

test('care UI pet response is silent by default, opt-in produces only one successful chirp and immediate mute stops it',async t=>{
  const f=await fixture(t);await f.mount();f.clickCare('pet');await f.settle();assert.equal(f.rig.contexts.length,0);assert.equal(f.read().birds[0].mood,64);assert.match(f.root.querySelector('.game-care-feedback').textContent,/ぴっ/);
  const world=f.read();world.tick++;world.birds[0].care.lastPetTick=null;world.birds[0].needs.energy=80;bumpRevision(world);f.write(world);await f.poll();
  await f.sound(true);assert.equal(f.read().settings.careSound,true);assert.equal(f.rig.starts,0);f.clickCare('pet');await f.settle();await until(()=>f.rig.starts===2);assert(f.root.querySelector('.game-care-cheer'));
  const after=f.read();f.clickCare('pet');f.clickCare('pet');await f.settle();assert.deepEqual(f.read(),after);assert.equal(f.rig.starts,2);
  f.change(f.soundControl(),false);assert(f.rig.contexts[0].nodes.every(node=>node.stops.includes(undefined)));await f.settle();assert.equal(f.read().settings.careSound,false);assert.equal(f.root.querySelector('.game-care-cheer'),null);
  f.closeCare();f.root.querySelector('[data-game-panel="help"]').click();const disclosure=f.root.querySelector('[data-game-details="help-care"]');assert(disclosure);disclosure.open=true;const copy=disclosure.cloneNode(true);copy.querySelectorAll('rt').forEach(node=>node.remove());assert.match(copy.textContent,/本物の文鳥には、むりにさわらないでね/);assert.match(copy.textContent,/文鳥の声を録音したものではないよ/);
});

test('care UI delayed transaction keeps immutable bird ID but suppresses old feedback and audio after selection changes',async t=>{
  const f=await fixture(t,{sound:true});await f.mount();const gate=f.hold();f.clickCare('feed');f.select('b2');gate.resolve();await f.settle();assert.equal(f.read().birds[0].needs.food,60);assert.equal(f.read().birds[1].needs.food,f.initial.birds[1].needs.food);assert.equal(f.root.querySelector('.game-care-feedback'),null);
  f.select('b1');const petGate=f.hold();f.clickCare('pet');f.select('b2');petGate.resolve();await f.settle();assert.equal(f.read().birds[0].mood,64);assert.equal(f.rig.starts,0);assert.equal(f.root.querySelector('.game-care-cheer'),null);
});

test('care UI stale world IDs cannot feed or pet a same-ID bird imported by another tab',async t=>{
  const f=await fixture(t,{sound:true});await f.mount();const next=worldFixture({sound:true});next.worldId+='-replacement';renameBird(next,'b1','別の鳥');bumpRevision(next);f.write(next);
  f.clickCare('pet');await f.settle();assert.deepEqual(f.read(),next);assert.match(f.root.querySelector('.game-message').textContent,/別のタブで別の庭/);assert.equal(f.rig.starts,0);
  await f.poll();assert.equal(f.root.querySelector('.game-bird-sheet').open,false);f.openCare();assert.match(f.root.querySelector('#game-sheet-title').textContent,/別の鳥/);assert.equal(f.rig.starts,0);
});

test('care UI delayed audio cannot survive selection, panel, world replacement or route teardown',async t=>{
  for(const cancel of ['selection','panel','world','route','close']){
    await t.test(cancel,async t=>{const rig=audioRig({held:true}),f=await fixture(t,{sound:true,rig});await f.mount();f.clickCare('pet');await until(()=>f.read().birds[0].care.lastPetTick!==null);await sleep(3);
      if(cancel==='selection')f.select('b2');if(cancel==='panel'){f.closeCare();f.root.querySelector('[data-game-panel="diary"]').click();}if(cancel==='close')f.closeCare();if(cancel==='world'){const next=worldFixture({sound:true});next.worldId+='-replacement';bumpRevision(next);f.write(next);await f.poll();}if(cancel==='route')f.stop();
      rig.gate.resolve();await sleep(5);assert.equal(rig.starts,0);if(cancel==='route')assert.equal(rig.contexts[0].closes,1);
    });
  }
});

test('care UI eggs, chicks and departed birds get disabled buttons with explicit explanations',async t=>{
  for(const options of [{stage:'egg'},{stage:'chick'},{home:'departed'}])await t.test(JSON.stringify(options),async t=>{
    const f=await fixture(t,options);await f.mount();if(options.home){f.root.querySelector('[data-game-panel="roster"]').click();f.root.querySelector('[data-game-select="b1"]').click();f.openCare();}
    assert(f.root.querySelector('[data-game-care="feed"]').disabled);assert(f.root.querySelector('[data-game-care="pet"]').disabled);assert.match(f.root.querySelector('#game-care-explanation').textContent,options.home?/別の庭に巣立った/:/巣で育つ時間/);
    const before=f.read();f.clickCare('feed');f.clickCare('pet');await f.settle();assert.deepEqual(f.read(),before);assert.equal(f.rig.starts,0);
  });
});

test('care UI rapid opt-in then mute keeps saved and local audio off; reload of sound preference never autoplays',async t=>{
  const f=await fixture(t,{sound:true});await f.mount();assert.equal(f.rig.contexts.length,0);assert.equal(f.rig.starts,0);
  const gate=f.hold();f.change(f.soundControl(),true);f.change(f.soundControl(),false);gate.resolve();await f.settle();assert.equal(f.read().settings.careSound,false);assert.equal(f.soundChecked(),false);assert.equal(f.rig.starts,0);
  f.stop();await f.mount();assert.equal(f.rig.starts,0);assert.equal(f.soundChecked(),false);
});

test('care UI preserves reduced-motion choice, natural sprite contacts, floor opacity cap and bounded CSS-only ground patch',async t=>{
  const f=await fixture(t);const w=f.read();w.settings.motion=false;f.write(w);await f.mount();assert.equal(f.root.querySelector('.game-app').dataset.careMotion,'off');
  f.clickCare('pet');await f.settle();assert.equal(f.root.querySelector('.game-app').dataset.careMotion,'off');
  for(const value of [-100,0,20,100,1000,NaN,Infinity])assert(careFloorOpacity(value)>=0&&careFloorOpacity(value)<=.22);assert.equal(careFloorOpacity(100),0);
  const css=await readFile(new URL('../src/game.css',import.meta.url),'utf8');const additions=css.split('/* Care additions:')[1].split('/* Each atlas frame')[0];assert(additions);assert(!additions.includes('filter:'));assert(additions.includes('z-index:1'));assert(additions.includes('pointer-events:none'));assert(additions.includes('prefers-reduced-motion'));assert(additions.includes('clip-path:polygon'));
  const overlay=f.root.querySelector('.game-floor-soil');assert.equal(overlay.parentElement.className,'game-room');assert.equal(overlay.getAttribute('aria-hidden'),'true');assert(!f.root.querySelector('.game-sprite .game-floor-soil'));
  for(const color of ['white','sakura','silver','cinnamon'])for(const stage of ['adult','juvenile','chick','egg']){const geometry=gameSpriteGeometry(color,stage);assert(Math.abs(geometry.imageLeft+geometry.footX*geometry.scale/850-.54)<1e-9);assert(Math.abs(geometry.imageTop+geometry.footY*geometry.scale/1000-.975)<1e-9);}
});


test('care UI transaction failure never presents a success or plays a chirp',async t=>{
  const f=await fixture(t,{sound:true});await f.mount();const before=f.read();f.failNext();f.clickCare('pet');await f.settle();assert.deepEqual(f.read(),before);assert.equal(f.rig.starts,0);assert.equal(f.root.querySelector('.game-care-feedback'),null);assert.match(f.root.querySelector('.game-message').textContent,/test save failure/);
});

test('care UI import cancel preserves the exact world, confirmed snapshot import preserves care values and existing sound choice without autoplay',async t=>{
  const f=await fixture(t);await f.mount();f.closeCare();f.root.querySelector('[data-game-panel="settings"]').click();const before=f.read(),imported=worldFixture({sound:true});imported.worldId+='-import';imported.care.cleanliness=33;imported.birds[0].needs.food=77;
  f.setConfirm(false);f.importWorld(imported);await sleep(5);await f.settle();assert.deepEqual(f.read(),before);assert.equal(f.rig.starts,0);
  f.setConfirm(true);f.importWorld(imported);await until(()=>f.read().worldId!==before.worldId);assert.notEqual(f.read().worldId,imported.worldId);await f.settle();assert.equal(f.read().care.cleanliness,33);assert.equal(f.read().birds[0].needs.food,77);assert.equal(f.read().settings.careSound,before.settings.careSound);assert.equal(f.rig.starts,0);assert.equal(f.rig.contexts.length,0);
  f.root.querySelector('[data-game-panel="garden"]').click();f.openCare();assert.equal(f.root.querySelector('[data-game-fullness]').textContent,'77 / 100');assert.equal(f.root.querySelector('[data-game-cleanliness-value]').textContent,'33 / 100');
});

test('care UI denied audio still commits pet feedback, and failed preference persistence cannot unmute the current view',async t=>{
  const rig=audioRig({reject:true}),f=await fixture(t,{rig,sound:true});await f.mount();f.clickCare('pet');await f.settle();assert.equal(f.read().birds[0].mood,64);assert.match(f.root.querySelector('.game-care-feedback').textContent,/ぴっ/);assert.match(f.root.querySelector('.game-message').textContent,/合成音を鳴らせません/);assert.equal(rig.starts,0);
  f.failNext();f.change(f.soundControl(),false);await f.settle();assert.equal(f.read().settings.careSound,true,'failed write is not falsely reported persisted');assert.equal(f.soundChecked(),false,'local mute remains immediate despite storage failure');
});

test('care UI closing during a queued pet commits once without stale feedback, reopening or audio',async t=>{
  const f=await fixture(t,{sound:true});await f.mount();
  const sheet=f.root.querySelector('.game-bird-sheet'),gate=f.hold();
  f.clickCare('pet');f.closeCare();assert.equal(sheet.open,false);
  gate.resolve();await f.settle();
  assert.equal(f.read().birds[0].mood,64);assert.equal(f.read().events.filter(e=>e.kind==='user-pet').length,1);
  assert.equal(f.root.querySelector('.game-bird-sheet'),sheet,'stable native dialog node survives commits');
  assert.equal(sheet.open,false);assert.equal(f.root.querySelector('.game-care-feedback'),null);assert.equal(f.rig.starts,0);
  f.openCare();assert.equal(sheet.open,true);assert.equal(f.root.querySelector('.game-care-feedback'),null);
  f.clickCare('pet');await f.settle();assert.equal(f.read().birds[0].mood,64);assert.equal(f.read().events.filter(e=>e.kind==='user-pet').length,1);assert.equal(f.rig.starts,0);
});

test('bird sheet queued talk keeps committed history and an unsent draft but cannot reopen or show stale reply after close',async t=>{
  const f=await fixture(t);await f.mount();
  f.root.querySelector('[data-game-details="sheet-talk"]').open=true;
  const draft='まだ送らないことば',input=f.root.querySelector('#game-words');input.value=draft;input.dispatchEvent(new f.window.Event('input',{bubbles:true}));
  const before=f.read(),gate=f.hold(),sheet=f.root.querySelector('.game-bird-sheet');
  f.root.querySelector('[data-game-talk="名前を呼ぶ"]').click();f.closeCare();
  gate.resolve();await f.settle();
  const after=f.read();assert(after.revision>before.revision);assert.equal(after.birds[0].mood,before.birds[0].mood+2);assert.equal(after.birds[0].memories.at(-1).kind,'user-hello');assert.equal(after.birds[0].memories.length,before.birds[0].memories.length+1);
  assert.equal(sheet.open,false);assert.equal(f.root.querySelector('.game-reply'),null);assert.equal(f.rig.starts,0);
  f.openCare();assert.equal(f.root.querySelector('#game-words').value,draft);assert.equal(f.root.querySelector('.game-reply'),null);assert.deepEqual(f.read(),after,'reopening is view-only');
});

test('bird sheet queued text submission clears only its sent draft, not newer unsent words after close',async t=>{
  const f=await fixture(t);await f.mount();f.root.querySelector('[data-game-details="sheet-talk"]').open=true;
  const type=value=>{const input=f.root.querySelector('#game-words');input.value=value;input.dispatchEvent(new f.window.Event('input',{bubbles:true}));};
  type('こんにちは');const gate=f.hold();f.root.querySelector('[data-game-form="talk"]').dispatchEvent(new f.window.Event('submit',{bubbles:true,cancelable:true}));
  type('次に話す、まだ送らないことば');f.closeCare();gate.resolve();await f.settle();
  assert.equal(f.root.querySelector('.game-bird-sheet').open,false);assert.equal(f.root.querySelector('.game-reply'),null);
  assert.equal(f.read().birds[0].memories.at(-1).kind,'user-hello');f.openCare();assert.equal(f.root.querySelector('#game-words').value,'次に話す、まだ送らないことば');assert.equal(f.root.querySelector('.game-reply'),null);
});

test('unsent talk survives park and home travel; empty submission never mutates history',async t=>{
 const f=await fixture(t);await f.mount();f.root.querySelector('[data-game-details="sheet-talk"]').open=true;
 const input=f.root.querySelector('#game-words');input.value='あとで水浴びしよう';input.dispatchEvent(new f.window.Event('input',{bubbles:true}));f.closeCare();
 f.root.querySelector('[data-game-panel="outdoors"]').click();await f.settle();assert.equal(f.read().encounters.garden.open,true);f.root.querySelector('[data-game-close-panel]').click();await f.settle();assert.equal(f.read().encounters.garden.open,false);
 f.root.querySelector('[data-field-travel="home"]').click();await f.settle();assert.equal(f.read().field.place,'home');f.openCare();
 assert.equal(f.root.querySelector('#game-words').value,'あとで水浴びしよう');
 const before=f.read(),blank=f.root.querySelector('#game-words');blank.value='  ';blank.dispatchEvent(new f.window.Event('input',{bubbles:true}));f.root.querySelector('[data-game-form="talk"]').dispatchEvent(new f.window.Event('submit',{bubbles:true,cancelable:true}));await f.settle();
 assert.deepEqual(f.read(),before);assert.match(f.root.querySelector('.game-reply').textContent,/ひとこと/);
});

test('unmarked legacy mute migrates on once; explicit device mute survives remount',async t=>{
 const f=await fixture(t,{sound:false,legacyUnmarked:true});await f.mount();assert.equal(f.read().settings.careSound,true);assert.equal(f.rig.contexts.length,0);f.clickCare('feed');await f.settle();await until(()=>f.rig.starts===2);await f.sound(false);f.stop();await f.mount();assert.equal(f.read().settings.careSound,false);assert.equal(JSON.parse(f.window.localStorage.getItem('buncho.care-sound-choice.v1')).explicit,true);
});

test('explicit device mute remains authoritative after imported and peer ON worlds',async t=>{
 const f=await fixture(t,{sound:false});await f.mount();f.closeCare();f.root.querySelector('[data-game-panel="settings"]').click();
 const imported=worldFixture({sound:true});imported.worldId+='-import';f.importWorld(imported);await f.settle();f.root.querySelector('[data-game-panel="garden"]').click();f.openCare();assert.equal(f.soundChecked(),false);f.clickCare('pet');await f.settle();assert.equal(f.rig.starts,0);
 const peer=f.read();peer.worldId+='-peer';peer.settings.careSound=true;bumpRevision(peer);f.write(peer);await f.poll();f.openCare();assert.equal(f.soundChecked(),false);assert.equal(f.rig.starts,0);
});
test('pagehide cancels pending care chirp without needing visibilitychange',async t=>{
 const rig=audioRig({held:true}),f=await fixture(t,{sound:true,rig});await f.mount();f.clickCare('pet');await f.settle();f.window.dispatchEvent(new f.window.Event('pagehide'));rig.gate.resolve();await sleep(10);assert.equal(rig.starts,0);f.stop();f.window.dispatchEvent(new f.window.Event('pagehide'));assert.equal(rig.starts,0);
});
test('explicit peer mute storage event immediately cancels and persists across world refresh',async t=>{
 const rig=audioRig({held:true}),f=await fixture(t,{sound:true,rig});await f.mount();f.clickCare('pet');await f.settle();f.window.dispatchEvent(new f.window.StorageEvent('storage',{key:'buncho.care-sound-choice.v1',newValue:JSON.stringify({explicit:true,enabled:false})}));rig.gate.resolve();await sleep(10);assert.equal(rig.starts,0);assert.equal(f.soundChecked(),false);await f.poll();assert.equal(f.soundChecked(),false);
});

test('paused story reopens real-JST care and shows both bars without a fast-tick refill',async t=>{
 const f=await fixture(t);await f.mount();const w=f.read();w.paused=true;w.birds[0].needs.food=100;w.birds[0].needs.energy=100;const now=Date.now(),prior=careWindow(now).at-1;w.careSchedule={seenAt:prior,windowAt:careWindow(prior).at};bumpRevision(w);f.write(w);await f.poll();
 assert.equal(f.read().birds[0].needs.food,60);assert.equal(f.read().birds[0].needs.energy,60);assert.equal(f.root.querySelector('[data-game-care=feed]').disabled,false);assert.equal(f.root.querySelector('[data-game-care=pet]').disabled,false);
 f.clickCare('pet');await f.settle();f.clickCare('pet');await f.settle();assert.equal(f.read().birds[0].needs.energy,100);assert.equal(f.root.querySelector('[data-game-care=pet]').disabled,true);assert.equal(f.root.querySelector('[data-game-talk="名前を呼ぶ"]').disabled,true);assert.match(f.root.querySelector('[data-next-care]').textContent,/日本時間/);
});

test('queued talk after peer fills energy gives no Gem, no history and no success chirp',async t=>{
 const f=await fixture(t,{sound:true});await f.mount();const gate=f.hold();f.root.querySelector('[data-game-talk="名前を呼ぶ"]').click();const peer=f.read();peer.birds[0].needs.energy=100;bumpRevision(peer);f.write(peer);gate.resolve();await f.settle();
 assert.equal(f.read().decor.points,peer.decor.points);assert.deepEqual(f.read().birds[0].memories,peer.birds[0].memories);assert.equal(f.rig.starts,0);assert.equal(f.root.querySelector('[data-game-talk="名前を呼ぶ"]').disabled,true);assert.match(f.root.querySelector('.game-reply').textContent,/おうちが変わった/);
});

test('legacy numbered name suggestions stay drafts, cancel safely and never cross birds or stale peer names',async t=>{
 const f=await fixture(t);const old=f.read();old.birds[0].name='こはく1';old.birds[0].naming={version:1,source:'legacy',assignedName:'こはく1'};f.write(old);await f.mount();f.closeCare();f.root.querySelector('[data-game-panel="profile"]').click();const before=f.read();
 f.root.querySelector('[data-game-name-suggest]').click();const suggestion=f.root.querySelector('#game-name').value;assert.doesNotMatch(suggestion,/[0-9]/);assert.notEqual(suggestion,'こはく1');assert.deepEqual(f.read(),before);
 f.root.querySelector('[data-bird-step="1"]').click();assert.equal(f.root.querySelector('#game-name').value,'こめ');f.root.querySelector('[data-bird-step="-1"]').click();assert.equal(f.root.querySelector('#game-name').value,suggestion);
 f.root.querySelector('[data-game-name-cancel]').click();assert.equal(f.root.querySelector('#game-name').value,'こはく1');assert.deepEqual(f.read(),before);
 f.root.querySelector('[data-game-name-suggest]').click();const stale=f.root.querySelector('[data-game-name-suggest]');const peer=f.read();renameBird(peer,'b1','大切な名前7');f.write(peer);await f.poll();stale.click();assert.equal(f.read().birds[0].name,'大切な名前7');assert.notEqual(f.root.querySelector('#game-name')?.value,'こめ');
});

test('suggested legacy name is saved only by the existing explicit save action',async t=>{
 const f=await fixture(t);const old=f.read();old.birds[0].name='すず1';old.birds[0].naming={version:1,source:'legacy',assignedName:'すず1'};f.write(old);await f.mount();f.closeCare();f.root.querySelector('[data-game-panel="profile"]').click();f.root.querySelector('[data-game-name-suggest]').click();const value=f.root.querySelector('#game-name').value;assert.equal(f.read().birds[0].name,'すず1');f.root.querySelector('[data-game-form="rename"] button[type="submit"]').click();await f.settle();assert.equal(f.read().birds[0].name,value);assert.equal(f.read().birds[0].naming.source,'manual');assert.equal(f.root.querySelector('[data-game-name-suggest]'),null);
});

test('saving a generated suggestion after peer rename rejects the stale name draft',async t=>{
 const f=await fixture(t);const old=f.read();old.birds[0].name='すず1';old.birds[0].naming={version:1,source:'legacy',assignedName:'すず1'};f.write(old);await f.mount();f.closeCare();f.root.querySelector('[data-game-panel="profile"]').click();f.root.querySelector('[data-game-name-suggest]').click();const peer=f.read();renameBird(peer,'b1','家族が決めた名前');f.write(peer);f.root.querySelector('[data-game-form="rename"] button[type="submit"]').click();await f.settle();assert.equal(f.read().birds[0].name,'家族が決めた名前');assert.equal(f.read().birds[0].naming.source,'manual');assert.match(f.root.textContent,/名前が変わったよ/);await f.poll();assert.equal(f.root.querySelector('#game-name').value,'家族が決めた名前');
});

test('game-only shell actions focus settings/help and their listener is removed on route exit',async t=>{
 const f=await fixture(t);await f.mount();document.dispatchEvent(new window.CustomEvent('buncho-world-action',{detail:'settings'}));assert(f.root.querySelector('.game-settings'));assert.equal(f.root.querySelector('.game-bird-sheet').open,false);assert.equal(document.activeElement.textContent,'暮らしの設定');document.dispatchEvent(new window.CustomEvent('buncho-world-action',{detail:'help'}));assert(f.root.querySelector('.game-help'));const before=f.root.innerHTML;f.stop();document.dispatchEvent(new window.CustomEvent('buncho-world-action',{detail:'settings'}));assert.equal(f.root.innerHTML,before);
});

test('reset defaults cancel, confirms once, preserves Gem and focus, full reset has second confirmation',async t=>{
 const f=await fixture(t);await f.mount();f.closeCare();f.window.document.dispatchEvent(new f.window.CustomEvent('buncho-world-action',{detail:'settings'}));
 const open=()=>f.root.querySelector('[data-game-action="reset-state"]').click();const before=f.read();open();assert.equal(f.window.document.activeElement.dataset.gameAction,'reset-cancel');f.root.querySelector('[data-reset-kind="care"]').click();assert.match(f.root.querySelector('.game-reset-dialog').textContent,/家族・Gem・家具などは残ります/);f.root.querySelector('[data-game-action="reset-cancel"]').click();assert.deepEqual(f.read(),before);assert.equal(f.window.document.activeElement.dataset.gameAction,'reset-state');
 open();f.root.querySelector('[data-reset-kind="care"]').click();const gate=f.hold(),confirm=f.root.querySelector('[data-game-action="reset-confirm"]');confirm.click();confirm.click();assert.equal(confirm.disabled,true);gate.resolve();await f.settle();assert.equal(f.read().birds[0].needs.food,80);assert.equal(f.read().decor.points,before.decor.points);assert.equal(f.root.querySelector('.game-reset-dialog').open,false);assert.equal(f.window.document.activeElement.dataset.gameAction,'reset-state');
 open();f.root.querySelector('[data-reset-kind="all"]').click();f.root.querySelector('[data-game-action="reset-confirm"]').click();assert.match(f.root.querySelector('.game-reset-dialog').textContent,/最後の確認/);assert.equal(f.window.document.activeElement.dataset.gameAction,'reset-cancel');f.root.querySelector('.game-reset-dialog').dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(f.root.querySelector('.game-reset-dialog').open,false);assert.equal(f.read().worldId,before.worldId);
});
test('reset uses fresh peer state and failed save leaves world intact',async t=>{
 const f=await fixture(t);await f.mount();f.closeCare();f.window.document.dispatchEvent(new f.window.CustomEvent('buncho-world-action',{detail:'settings'}));const open=()=>{f.root.querySelector('[data-game-action="reset-state"]').click();f.root.querySelector('[data-reset-kind="care"]').click();};open();const peer=f.read();peer.birds[0].needs.food=100;peer.decor.points+=7;peer.decor.lifetimePoints+=7;bumpRevision(peer);f.write(peer);f.root.querySelector('[data-game-action="reset-confirm"]').click();await f.settle();assert.equal(f.read().birds[0].needs.food,100);assert.equal(f.read().decor.points,peer.decor.points);const low=f.read();low.birds[0].needs.food=20;bumpRevision(low);f.write(low);await f.poll();const persisted=f.read();open();f.failNext();f.root.querySelector('[data-game-action="reset-confirm"]').click();await f.settle();assert.deepEqual(f.read(),persisted);assert.match(f.root.textContent,/test save failure/);
});
test('full reset requires two confirmations, preserves owner/music, and can restore last local backup',async t=>{
 const f=await fixture(t);await f.mount();f.closeCare();f.window.localStorage.setItem('buncho.owner-name.v1','家族の名前');f.window.localStorage.setItem('buncho.music.v1','{"enabled":false,"volume":0.2}');f.window.document.dispatchEvent(new f.window.CustomEvent('buncho-world-action',{detail:'settings'}));
 const old=f.read(),open=()=>f.root.querySelector('[data-game-action="reset-state"]').click();open();f.root.querySelector('[data-reset-kind="all"]').click();f.root.querySelector('[data-game-action="reset-confirm"]').click();assert.equal(f.read().worldId,old.worldId);f.root.querySelector('[data-game-action="reset-confirm"]').click();await f.settle();const fresh=f.read();assert.equal(fresh.birds.length,1);assert.equal(fresh.birds[0].name,'エド');assert.notEqual(fresh.worldId,old.worldId);assert.equal(f.window.localStorage.getItem('buncho.owner-name.v1'),'家族の名前');assert.equal(f.window.localStorage.getItem('buncho.music.v1'),'{"enabled":false,"volume":0.2}');assert.deepEqual(fresh.settings,old.settings);
 open();await until(()=>!f.root.querySelector('[data-reset-kind="restore"]').disabled);f.root.querySelector('[data-reset-kind="restore"]').click();f.root.querySelector('[data-game-action="reset-confirm"]').click();await f.settle();const restored=f.read();assert.notEqual(restored.worldId,old.worldId);assert.notEqual(restored.worldId,fresh.worldId);assert.deepEqual(restored.birds,old.birds);assert.deepEqual(restored.decor,old.decor);
});
test('removed character settings do not remove saved profile or remaining care settings',async t=>{
 const f=await fixture(t);await f.mount();f.closeCare();const raw='{"version":1,"name":"保管する名前","hair":"wave"}';f.window.localStorage.setItem('buncho.owner-profile.v1',raw);
 f.window.document.dispatchEvent(new f.window.CustomEvent('buncho-world-action',{detail:'settings'}));const before=f.read();
 assert.equal(f.root.querySelector('.game-owner-setting,[data-game-panel="owner"],.buncho-owner-editor'),null);assert.ok(f.root.querySelector('[data-game-care-sound]'));assert.ok(f.root.querySelector('[data-game-action="export"]'));
 assert.deepEqual(f.read(),before);await f.poll();assert.equal(f.window.localStorage.getItem('buncho.owner-profile.v1'),raw);
 const after=f.read();for(const field of ['worldId','birds','protagonist','decor','settings','events','field'])assert.deepEqual(after[field],before[field],field);
});



test('care dock keeps its labelled button and bird-coloured line icon through repeated open and close',async t=>{
  const f=await fixture(t);await f.mount();f.closeCare();const before=f.read();
  for(let i=0;i<3;i++){
    const button=f.root.querySelector('#game-open-bird'),svg=button.querySelector('svg');
    assert.equal(button.textContent,'ふれあう');assert(button.hasAttribute('data-game-open-bird'));
    assert.equal(svg.getAttribute('viewBox'),'0 0 32 32');assert.equal(svg.getAttribute('aria-hidden'),'true');
    assert.equal(svg.getAttribute('fill'),'none');assert.equal(svg.getAttribute('stroke'),'currentColor');
    assert.equal(svg.getAttribute('stroke-width'),'1.7');assert.equal(svg.querySelectorAll('path').length,2);
    assert.equal(svg.querySelector('circle').getAttribute('fill'),'currentColor');assert.equal(svg.querySelector('circle').getAttribute('stroke'),'none');
    svg.querySelector('path').dispatchEvent(new f.window.MouseEvent('click',{bubbles:true}));
    assert(f.root.querySelector('.game-bird-sheet').open);assert.equal(f.root.querySelector('#game-sheet-title').textContent,before.birds[0].name);
    f.closeCare();assert.equal(f.root.querySelector('.game-bird-sheet').open,false);
  }
  await f.settle();assert.deepEqual(f.read(),before,'opening and closing care leaves the saved world unchanged');
});


function directRub(f,type,{x=80,y=100,id=1,primary=true,target}={}){
  const surface=f.root.querySelector('[data-care-rub]');
  if(surface){const box=()=>({left:0,top:0,right:280,bottom:330,width:280,height:330});surface.getBoundingClientRect=box;surface.querySelector('.game-sprite').getBoundingClientRect=box;}
  const event=new f.window.PointerEvent(type,{bubbles:true,cancelable:true,pointerId:id,isPrimary:primary,button:0,clientX:x,clientY:y,pointerType:'touch'});
  (target||surface||f.window.document).dispatchEvent(event);return event;
}

test('direct care replaces the upper miniature with exactly one large bird, with accessible keyboard instructions',async t=>{
  const f=await fixture(t);await f.mount();
  assert.equal(f.root.querySelectorAll('.game-care-actions button').length,2);
  const sheet=f.root.querySelector('.game-bird-sheet');
  assert.equal(sheet.querySelectorAll('img').length,1,'the whole care sheet shows one bird, not a second miniature');
  assert.equal(sheet.querySelectorAll('.game-mini-bird').length,0);
  const target=f.root.querySelector('[data-care-rub]');assert(target.querySelector('.game-sprite img'));
  assert.equal(target.closest('.game-sheet-heading'),sheet.querySelector('.game-sheet-heading'),'the original upper portrait is enlarged');
  assert.equal(sheet.querySelector('.game-care [data-care-rub]'),null,'no second portrait below care actions');
  assert.equal(target.dataset.careBirdId,'b1');assert.match(target.getAttribute('aria-label'),/なでる/);
  assert.equal(target.getAttribute('aria-describedby'),'game-care-pet-help game-care-pet-keyboard');
  assert.match(f.root.querySelector('#game-care-pet-keyboard').textContent,/Enter.*Space/);
  assert.equal(f.root.querySelector('.game-care-actions [data-game-care=pet]'),null);
});

test('direct care ignores taps and short movement, then commits exactly one reward at gesture release',async t=>{
  const f=await fixture(t);await f.mount();const before=f.read();
  directRub(f,'pointerdown');directRub(f,'pointerup');
  f.root.querySelector('[data-care-rub]').dispatchEvent(new f.window.MouseEvent('click',{bubbles:true,detail:1}));
  directRub(f,'pointerdown');directRub(f,'pointermove',{x:95});directRub(f,'pointerup',{x:95});await f.settle();assert.deepEqual(f.read(),before);
  directRub(f,'pointerdown');directRub(f,'pointermove',{x:145});directRub(f,'pointermove',{x:80});
  assert.deepEqual(f.read(),before,'movement is not a save');assert.equal(f.root.querySelector('[data-care-rub]').dataset.rubbing,'ready');
  directRub(f,'pointerup');await f.settle();const after=f.read();
  assert.equal(after.events.filter(e=>e.kind==='user-pet').length,1);assert.equal(after.birds[0].mood,before.birds[0].mood+4);
  assert.equal(after.economy.gold,before.economy.gold+4);assert.equal(after.decor.points,before.decor.points+5);
  assert.deepEqual(after.encounters,before.encounters,'catalog affection is independent');
  assert.equal(f.root.querySelector('#game-sheet-title').textContent,before.birds[0].name,'rubbing never switches birds');
  directRub(f,'pointerup');await f.settle();assert.deepEqual(f.read(),after,'duplicate release cannot award twice');
  f.stop();await f.mount();assert.equal(f.read().economy.gold,after.economy.gold);assert.equal(f.read().birds[0].mood,after.birds[0].mood);
});

test('direct care cancels on pointercancel, leaving the bird, second touch, close and bird change',async t=>{
  const f=await fixture(t);await f.mount();
  for(const kind of ['cancel','outside','second','close','switch']){
    if(!f.root.querySelector('.game-bird-sheet').open)f.openCare();
    const before=f.read();directRub(f,'pointerdown');directRub(f,'pointermove',{x:150});
    if(kind==='cancel')directRub(f,'pointercancel',{x:150});
    if(kind==='outside')directRub(f,'pointermove',{x:400});
    if(kind==='second'){directRub(f,'pointerdown',{id:2,primary:false});directRub(f,'pointerup',{id:2,primary:false});}
    if(kind==='close')f.closeCare();
    if(kind==='switch')f.root.querySelector('.game-bird-sheet [data-bird-step="1"]').click();
    directRub(f,'pointerup',{x:150,target:f.window.document});await f.settle();assert.deepEqual(f.read(),before,kind);
  }
});

test('direct care keeps the active surface through a poll and supports sparse slow movement',async t=>{
  const f=await fixture(t);await f.mount();const target=f.root.querySelector('[data-care-rub]');
  directRub(f,'pointerdown');const next=f.read();next.birds[0].mood=50;bumpRevision(next);f.write(next);await f.poll();
  assert.equal(f.root.querySelector('[data-care-rub]'),target);
  await sleep(50);directRub(f,'pointermove',{x:140});directRub(f,'pointerup',{x:140});await f.settle();
  assert.equal(f.read().birds[0].mood,54);assert.equal(f.read().events.filter(e=>e.kind==='user-pet').length,1);
});

test('direct care suppresses repeated keyboard activation and handles failed save without reward',async t=>{
  const f=await fixture(t);await f.mount();const target=f.root.querySelector('[data-care-rub]');
  for(const key of ['Enter',' ']){const event=new f.window.KeyboardEvent('keydown',{bubbles:true,cancelable:true,key,repeat:true});target.dispatchEvent(event);assert(event.defaultPrevented);}
  const before=f.read();f.failNext();directRub(f,'pointerdown');directRub(f,'pointermove',{x:160});directRub(f,'pointerup',{x:160});await f.settle();assert.deepEqual(f.read(),before);assert.match(f.root.querySelector('.game-message').textContent,/test save failure/);
  f.root.querySelector('[data-care-rub]').click();await f.settle();assert.equal(f.read().events.filter(e=>e.kind==='user-pet').length,1,'assistive/keyboard click remains supported');
});

test('direct care preserves a second slow stroke while the previous feedback timer clears',async t=>{
  const f=await fixture(t);const initial=f.read();initial.birds[0].needs.energy=0;f.write(initial);await f.mount();
  f.root.querySelector('[data-care-rub]').click();await f.settle();
  const target=f.root.querySelector('[data-care-rub]');directRub(f,'pointerdown');directRub(f,'pointermove',{x:140});
  await sleep(900);assert.ok(f.root.querySelector('[data-care-rub]')===target,'old feedback must not remove an active gesture target');
  directRub(f,'pointerup',{x:140});await f.settle();assert.equal(f.read().events.filter(e=>e.kind==='user-pet').length,2);
});

test('reset cancel keeps its semantic focus when a new health notice changes the background control order',async t=>{
 const f=await fixture(t);await f.mount();f.closeCare();f.window.document.dispatchEvent(new f.window.CustomEvent('buncho-world-action',{detail:'settings'}));f.root.querySelector('[data-game-details="management"]').open=true;
 f.root.querySelector('[data-game-action="reset-state"]').click();f.root.querySelector('[data-reset-kind="all"]').click();f.root.querySelector('[data-game-action="reset-confirm"]').click();f.root.querySelector('.game-reset-dialog').dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(f.window.document.activeElement.dataset.gameAction,'reset-state');
 const before=f.read(),peer=structuredClone(before);peer.lifecycle.birds[0].condition={kind:'injury',sinceAt:peer.lifecycle.seenAt,deadlineAt:peer.lifecycle.seenAt+86400000};bumpRevision(peer);f.write(peer);await f.poll();
 assert.equal(f.root.querySelector('.game-reset-dialog').open,false);assert.equal(f.window.document.activeElement.dataset.gameAction,'reset-state');assert.equal(f.read().worldId,before.worldId);assert.deepEqual(f.read().birds,before.birds);assert.deepEqual({...f.read().economy,seenAt:before.economy.seenAt},before.economy);assert(f.read().economy.seenAt>=before.economy.seenAt);
});

test('care illustrations preserve all color and growth variants without changing room atlases',()=>{
  for(const color of ['white','sakura','silver','cinnamon'])for(const stage of ['adult','juvenile','chick','egg']) {
    const markup=gameCareBirdSvg(color,stage);
    assert.equal((markup.match(/<img /g)||[]).length,1);
    assert.match(markup,new RegExp(`data-color="${color}"`));
    assert.match(markup,new RegExp(`data-stage="${stage}"`));
    if(stage==='egg')assert.match(markup,/egg\.svg/);
    else {
      assert.match(markup,/data-art-style="finch-illustration"/);
      assert.match(markup,new RegExp(`care-illustrations/${stage==='chick'?'chick':color+'-'+stage}\\.webp`));
      assert.doesNotMatch(markup,/-poses\.webp/);
    }
  }
  assert.match(gameCareBirdSvg('not-a-color','not-a-stage'),/care-illustrations\/white-adult\.webp/);
  assert.equal(gameSpriteGeometry('white','adult','left').asset,'white-poses');
});

test('settings heading retains focus after a saved peer update replaces the panel markup',async t=>{
 const f=await fixture(t);await f.mount();f.closeCare();f.window.document.dispatchEvent(new f.window.CustomEvent('buncho-world-action',{detail:'settings'}));
 const heading=f.root.querySelector('.game-settings h3');assert.equal(f.window.document.activeElement,heading);
 const peer=f.read();peer.settings.motion=!peer.settings.motion;bumpRevision(peer);f.write(peer);await f.poll();
 const next=f.root.querySelector('.game-settings h3');assert.notEqual(next,heading);assert.ok(f.window.document.activeElement===next,'settings heading keeps focus after polling');assert.equal(next.tabIndex,-1);
});


test('guidance follows only the selected bird and durable care changes',async t=>{
 const f=await fixture(t);await f.mount();
 const guide=()=>f.root.querySelector('.game-bird-sheet [data-care-guidance]');
 assert.equal(guide().dataset.guidanceBird,'b1');assert.match(guide().textContent,/ごはん/);
 for(let i=0;i<3;i++){f.clickCare('feed');await f.settle();}
 assert.match(guide().textContent,/名前を呼ぶ/);
 f.select('b2');assert.equal(guide().dataset.guidanceBird,'b2');
 assert.doesNotMatch(guide().textContent,/家族.*完了/);
 f.closeCare();assert(!f.root.querySelector('.game-bird-sheet[open] [data-care-guidance]'));
});
