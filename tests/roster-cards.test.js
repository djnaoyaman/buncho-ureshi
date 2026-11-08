import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {IDBFactory} from 'fake-indexeddb';
import {mountGame} from '../src/game.js';
import {DB_NAME} from '../src/game-store.js';
import {createWorld,createBird,renameBird,bumpRevision,validateWorld,serializeWorld,parseSave} from '../src/engine.js';

const NOW=Date.UTC(2026,10,8), LONG_NAME='あいうえおかきくけこさしすせそた';
const CAPACITY='家族は6羽、お友達の来訪は文鳥もほかの鳥も合わせて6羽まで。以前から7〜10羽の家族がいるおうちは、そのまま暮らせます。名簿は128羽まで残します。お迎え・誕生は家族6羽を上限に、新規来訪は名簿に空きがある間楽しめます。';
const GROUPS=['resident','visitor','departed'];

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
      {name:LONG_NAME,color:'sakura',home:'resident'},
      {name:LONG_NAME,color:'silver',home:'resident'},
      {name:'<友&"子>',color:'cinnamon',home:'resident'},
      {name:'ひな',stage:'chick',color:'white',home:'resident'},
      {name:'たまご',stage:'egg',color:'white',home:'resident'},
      {name:'来訪の子',color:'sakura',home:'visitor'},
      {name:LONG_NAME,color:'white',home:'visitor'},
      {name:'別の庭の子',color:'silver',home:'departed'},
      {name:LONG_NAME,color:'cinnamon',home:'departed'},
    ])createBird(world,options);
  }
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
  const root=win.document.createElement('main');win.document.body.append(root);dispose=await mountGame(root);
  const open=()=>root.querySelector('#game-menu-roster').click();open();
  return {win,root,initial,open,read:()=>record(indexedDB),write:value=>record(indexedDB,value),
    poll:()=>[...timers.values()].find(callback=>callback.name==='poll')(),
    remount:async()=>{dispose();dispose=await mountGame(root);open();}};
}
function expectRoster(root,world,selected='b1'){
  const catalog=root.querySelector('section.game-roster-catalog');assert.ok(catalog);
  assert.equal(catalog.querySelector('h3').textContent,'みんなの名簿');
  assert.deepEqual([...catalog.querySelectorAll('[data-roster-group]')].map(group=>group.dataset.rosterGroup),GROUPS);
  for(const home of GROUPS){
    const group=catalog.querySelector(`[data-roster-group="${home}"]`),birds=world.birds.filter(bird=>bird.home===home);
    assert.equal(group.querySelector('h4 [data-roster-count]').textContent,`${birds.length}羽`);
    assert.deepEqual([...group.querySelectorAll('.game-roster-card')].map(card=>card.dataset.gameSelect),birds.map(bird=>bird.id));
    assert.equal(group.querySelectorAll('.game-roster-empty').length,birds.length?0:1);
    for(const bird of birds){
      const card=group.querySelector(`.game-roster [data-game-select="${bird.id}"]`);assert.ok(card);
      assert.equal(card.tagName,'BUTTON');assert.equal(card.type,'button');assert.equal(card.disabled,false);
      assert.equal(card.querySelector('strong').textContent,bird.name);
      assert.equal(card.getAttribute('aria-pressed'),String(bird.id===selected));
      assert.equal(card.querySelector('.game-roster-check').textContent,bird.id===selected?'✓':'');
      assert.ok(card.querySelector('.game-mini-bird'),'each card has a portrait');
    }
  }
  assert.equal(catalog.querySelectorAll('.game-roster-card[aria-pressed="true"]').length,1);
  assert.ok(catalog.querySelector('.game-roster-current').textContent.includes(world.birds.find(bird=>bird.id===selected).name));
  assert.equal(catalog.querySelector('details[data-game-details="roster-capacity"] > p').textContent,CAPACITY);
}

for(const kind of ['fresh','manual-omochi'])test(`roster cards preserve ${kind} founder and show explicit empty groups`,async t=>{
  const f=await setup(t,kind),before=await f.read();expectRoster(f.root,before);
  assert.equal(before.birds[0].name,kind==='fresh'?'エド':'おもち');
  assert.equal(before.birds[0].naming.source,kind==='fresh'?'automatic':'manual');
  assert.deepEqual(before,f.initial,'opening the roster does not alter even the complete initial save');
  f.root.querySelector('[data-game-details="roster-capacity"]').open=true;
  assert.equal(f.root.querySelector('[data-game-details="roster-capacity"] > p').textContent,CAPACITY);
  f.root.querySelector('[data-game-close-panel]').click();assert.equal(f.root.querySelector('.game-panel-overlay').open,false);
  f.open();expectRoster(f.root,before);assert.deepEqual(await f.read(),before);
  await f.remount();expectRoster(f.root,before);assert.deepEqual(await f.read(),before);
});

test('mixed roster keeps every home group, long duplicate name and escaped name distinct',async t=>{
  const f=await setup(t,'mixed'),before=await f.read();expectRoster(f.root,before);
  const names=[...f.root.querySelectorAll('.game-roster-card > strong')].map(node=>node.textContent);
  assert.equal(names.filter(name=>name===LONG_NAME).length,4);
  assert.ok(names.includes('<友&"子>'));assert.equal(f.root.querySelector('.game-roster-card[data-game-select="b4"] strong').childElementCount,0);
  for(const bird of before.birds){
    f.root.querySelector(`.game-roster-card[data-game-select="${bird.id}"]`).click();
    assert.equal(f.root.querySelector('.game-app').dataset.panel,'profile');
    assert.equal(f.root.querySelector('.game-profile-heading h3').textContent,bird.name);
    assert.equal(f.root.querySelector('#game-name').dataset.gameDraftBird,bird.id,'identity is not inferred from duplicate names');
    assert.equal(f.win.document.activeElement,f.root.querySelector('.game-profile-heading h3'));
    f.open();expectRoster(f.root,before,bird.id);
  }
  assert.deepEqual(await f.read(),before,'all profile and roster navigation is save-neutral');
});

test('selected resident survives close/reopen and current-label redraw without changing the save',async t=>{
  const f=await setup(t,'mixed'),before=await f.read();
  f.root.querySelector('.game-roster-card[data-game-select="b3"]').click();
  f.root.querySelector('[data-game-close-panel]').click();f.open();expectRoster(f.root,before,'b3');
  f.root.querySelector('[data-game-close-panel]').click();f.open();expectRoster(f.root,before,'b3');
  assert.deepEqual(await f.read(),before);
});

test('external valid refresh updates counts and names while preserving roster focus, scroll and open explanation',async t=>{
  const f=await setup(t,'mixed');
  f.root.querySelector('.game-roster-card[data-game-select="b2"]').click();f.open();
  f.root.querySelector('[data-game-details="roster-capacity"]').open=true;
  f.root.querySelector('.game-panel-overlay > .game-panel').scrollTop=175;
  f.root.querySelector('.game-roster-card[data-game-select="b2"]').focus();
  const peer=await f.read();renameBird(peer,'b2','新しい家族の名前');
  createBird(peer,{name:'新しいお友達',home:'visitor',color:'white'});bumpRevision(peer);
  const expected=validated(peer);await f.write(expected);await f.poll();
  expectRoster(f.root,expected,'b2');
  assert.equal(f.win.document.activeElement,f.root.querySelector('.game-roster-catalog .game-roster-card[data-game-select="b2"]'),'refresh restores the exact roster card, not the same bird behind the overlay');
  assert.equal(f.root.querySelector('.game-panel-overlay > .game-panel').scrollTop,175);
  assert.equal(f.root.querySelector('[data-game-details="roster-capacity"]').open,true);
  assert.deepEqual(await f.read(),expected,'refresh does not add any UI state or additional mutation to the peer save');
});
