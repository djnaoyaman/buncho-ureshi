import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {IDBFactory} from 'fake-indexeddb';
import {mountGame} from '../src/game.js';
import {DB_NAME} from '../src/game-store.js';
import {createWorld,createBird,renameBird,bumpRevision,validateWorld,serializeWorld,parseSave,ACTIONS,adoptBird,talkToBird} from '../src/engine.js';

import {accidentLifeBird,isAlive} from '../src/life-care.js';

const NOW=Date.UTC(2026,10,8), LONG_NAME='あいうえおかきくけこさしすせそた';

function validated(world){
  validateWorld(world);
  const restored=parseSave(serializeWorld(world));
  assert.deepEqual(restored,world,'the fixture must survive the real save format before rendering');
  return restored;
}
function fixture(kind='fresh'){
  const world=createWorld(NOW,418);world.paused=true;world.settings.motion=false;world.settings.careSound=false;
  if(kind==='manual-omochi')renameBird(world,'b1','おもち');
  if(kind==='mixed'){
    for(const options of [
      {name:LONG_NAME,color:'sakura',home:'visitor'},
      {name:LONG_NAME,color:'silver',home:'resident'},
      {name:'<友&"子>',color:'cinnamon',home:'resident'},
      {name:'ひな',stage:'chick',color:'white',home:'resident'},
      {name:'たまご',stage:'egg',color:'white',home:'resident'},
      {name:'来訪の子',color:'sakura',home:'visitor'},
      {name:LONG_NAME,color:'white',home:'visitor'},
      {name:'別の庭の子',color:'silver',home:'departed'},
      {name:'幼鳥',stage:'juvenile',color:'cinnamon',home:'visitor'},
      {name:LONG_NAME,color:'cinnamon',home:'departed'},
    ])createBird(world,options);
  }
  if(kind==='mixed')adoptBird(world,'b2',LONG_NAME);
  if(kind==='deceased'){const bird=createBird(world,{name:'大切な仲間',home:'resident'});accidentLifeBird(world,bird.id,NOW);}
  return validated(world);
}
async function record(indexedDB,value){
  const db=await new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>request.result.createObjectStore('world');
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
  try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction('world',value?'readwrite':'readonly');
    const request=value?tx.objectStore('world').put(value,'current'):tx.objectStore('world').get('current');
    tx.oncomplete=()=>resolve(request.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });}finally{db.close();}
}
async function setup(t,kind){
  const win=new Window({url:'https://djnaoyaman.github.io/buncho-ureshi/game/',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableJavaScriptEvaluation:true}});
  const indexedDB=new IDBFactory(),globals=new Map(),timers=new Map();let dispose,nextTimer=0;
  const originalNow=Date.now;Date.now=()=>NOW;
  const values={window:win,document:win.document,location:win.location,navigator:win.navigator,
    localStorage:win.localStorage,FormData:win.FormData,matchMedia:win.matchMedia.bind(win),indexedDB,
    BroadcastChannel:undefined,setInterval:callback=>{timers.set(++nextTimer,callback);return nextTimer;},clearInterval:id=>timers.delete(id)};
  for(const [key,value]of Object.entries(values)){
    globals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));
    Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
  }
  t.after(async()=>{
    dispose?.();await win.happyDOM.abort();await win.happyDOM.close();Date.now=originalNow;
    for(const [key,descriptor]of globals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
  });
  win.localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));
  const initial=fixture(kind);await record(indexedDB,initial);
  const articles=[],art=[];const options={goArticle:id=>articles.push(id),goArt:value=>art.push(value)};
  const root=win.document.createElement('main');win.document.body.append(root);dispose=await mountGame(root,options);
  const open=(id='b1')=>{root.querySelector('#game-menu-roster').click();root.querySelector(`.game-roster-card[data-game-select="${id}"]`).click();};open();
  return {win,root,initial,open,articles,art,read:()=>record(indexedDB),write:value=>record(indexedDB,value),
    poll:()=>[...timers.values()].find(callback=>callback.name==='poll')(),
    remount:async()=>{dispose();dispose=await mountGame(root,options);open();}};
}
function personality(b){return `${b.personality.curiosity>60?'好奇心いっぱい':b.personality.caution>60?'慎重にゆっくり':'おだやか'}・${b.personality.sociability>65?'お話好き':'自分の時間も好き'}`;}
function expectProfile(root,b){
  const profile=root.querySelector('.game-profile-card-screen');assert.ok(profile);
  assert.equal(profile.querySelector('.game-profile-heading h3').textContent,b.name);
  assert.ok(profile.querySelector('.game-profile-identity').textContent.includes(personality(b)));
  assert.ok(profile.querySelector('.game-profile-likes').textContent.includes(b.preference));
  assert.equal(profile.querySelector('#game-name').value,b.name);
  assert.equal(profile.querySelector('#game-name').dataset.gameDraftBird,b.id);
  assert.equal(profile.querySelector('[data-game-art]').dataset.gameArt,b.id);
  if(['adult','juvenile'].includes(b.stage))assert.equal(profile.querySelector('.game-profile-portrait .game-sprite').dataset.pose,'left');
  for(const selector of ['[data-game-open-bird]','[data-game-form="rename"]','[data-game-panel="relations"]','[data-game-panel="family"]','[data-game-article]','.game-profile-details'])assert.ok(profile.querySelector(selector),selector);
}
async function settled(check){for(let i=0;i<100;i++){if(await check())return;await new Promise(resolve=>setTimeout(resolve,5));}assert.fail('state did not settle');}
for(const kind of ['fresh','manual-omochi'])test(`profile A uses real ${kind} identity and never writes on navigation`,async t=>{
  const f=await setup(t,kind),before=await f.read();expectProfile(f.root,before.birds[0]);assert.deepEqual(before,f.initial);
  assert.equal(before.birds[0].naming.source,kind==='fresh'?'automatic':'manual');
  for(let i=0;i<3;i++){
    f.root.querySelector('.game-profile-details').open=true;
    f.root.querySelector('[data-game-open-bird]').click();assert.equal(f.root.querySelector('.game-bird-sheet').open,true);
    f.root.querySelector('#game-sheet-close').click();expectProfile(f.root,before.birds[0]);
    f.root.querySelector('[data-game-close-panel]').click();f.open();expectProfile(f.root,before.birds[0]);
  }
  await f.remount();expectProfile(f.root,before.birds[0]);assert.deepEqual(await f.read(),before);
});
for(const id of ['b2','b3','b4','b5','b6','b7','b9','b10'])test(`profile A renders valid ${id} stage/home identity without mutating the world`,async t=>{
  const f=await setup(t,'mixed'),before=await f.read();
  for(const b of before.birds.filter(b=>b.id===id)){f.open(b.id);expectProfile(f.root,b);assert.equal(f.root.querySelector('.game-profile-heading h3').childElementCount,0);
    assert.ok(f.root.querySelector('.game-profile-identity').textContent.includes(ACTIONS[b.action.kind]));
    f.root.querySelector('[data-game-open-bird]').click();
    assert.equal(f.root.querySelector('#game-talk-call').disabled,b.home==='departed'||!['juvenile','adult'].includes(b.stage)||b.needs.energy>=100);
    f.root.querySelector('#game-sheet-close').click();
  }
  assert.deepEqual(await f.read(),before);
});
test('profile A retains deceased identity and memorial route without enabling care',async t=>{
  const f=await setup(t,'deceased'),before=await f.read(),b=before.birds[1];assert.equal(isAlive(before,b),false);f.open(b.id);expectProfile(f.root,b);
  f.root.querySelector('[data-game-open-bird]').click();assert.equal(f.root.querySelector('#game-sheet-health').dataset.gamePanel,'memorial');
  assert.equal(f.root.querySelector('#game-care-feed').disabled,true);assert.equal(f.root.querySelector('#game-talk-call').disabled,true);
  f.root.querySelector('#game-sheet-close').click();assert.deepEqual(await f.read(),before);
});
test('profile A keeps unsaved names isolated by bird, preserves refresh focus and scroll, and saves manual naming metadata',async t=>{
  const f=await setup(t,'mixed'),before=await f.read();f.open('b2');
  let input=f.root.querySelector('#game-name');input.value='まだ保存しない';input.dispatchEvent(new f.win.Event('input',{bubbles:true}));
  f.open('b3');assert.equal(f.root.querySelector('#game-name').value,LONG_NAME);f.open('b2');assert.equal(f.root.querySelector('#game-name').value,'まだ保存しない');
  input=f.root.querySelector('#game-name');input.focus();input.setSelectionRange(2,4);
  f.root.querySelector('.game-profile-details').open=true;f.root.querySelector('.game-panel-overlay > .game-panel').scrollTop=170;
  const peer=await f.read();renameBird(peer,'b3','別の子の新しい名前');bumpRevision(peer);validated(peer);await f.write(peer);await f.poll();
  assert.equal(f.win.document.activeElement,f.root.querySelector('#game-name'));assert.equal(f.root.querySelector('#game-name').value,'まだ保存しない');assert.equal(f.root.querySelector('#game-name').selectionStart,2);
  assert.equal(f.root.querySelector('.game-profile-details').open,true);assert.equal(f.root.querySelector('.game-panel-overlay > .game-panel').scrollTop,170);assert.deepEqual(await f.read(),peer);
  f.root.querySelector('[data-game-form="rename"]').dispatchEvent(new f.win.Event('submit',{bubbles:true,cancelable:true}));
  await settled(async()=> (await f.read()).birds.find(b=>b.id==='b2').name==='まだ保存しない');
  const after=await f.read();validateWorld(after);assert.deepEqual(parseSave(serializeWorld(after)),after);
  assert.equal(after.birds.find(b=>b.id==='b2').naming.source,'manual');assert.equal(after.seed,peer.seed);
  assert.deepEqual(after.encounters,peer.encounters);assert.deepEqual(after.encounters.gardenFriends,peer.encounters.gardenFriends);assert.deepEqual(after.lifecycle,peer.lifecycle);
  await f.remount();f.open('b2');expectProfile(f.root,after.birds.find(b=>b.id==='b2'));
});

test('profile A preserves the selected bird card payload and natural-habits callback without entering the held studio',async t=>{
  const f=await setup(t,'mixed'),before=await f.read();f.open('b3');const b=before.birds.find(b=>b.id==='b3');
  f.root.querySelector('.game-profile-card-screen [data-game-art]').click();
  assert.equal(f.art.length,1);assert.equal(f.art[0].source,'game');assert.equal(f.art[0].name,b.name);
  assert.deepEqual(f.art[0].birds,[{id:b.id,name:b.name,color:b.color,stage:b.stage}]);assert.deepEqual(f.art[0].names,[b.name]);
  f.root.querySelector('.game-profile-card-screen [data-game-article]').click();assert.deepEqual(f.articles,['behavior']);assert.deepEqual(await f.read(),before);
});
