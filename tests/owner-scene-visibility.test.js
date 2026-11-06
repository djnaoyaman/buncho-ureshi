import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { IDBFactory } from 'fake-indexeddb';
import { mountGame } from '../src/game.js';
import { DB_NAME } from '../src/game-store.js';
import { createWorld, renameBird } from '../src/engine.js';

// Real engine/store code in a DOM emulator, not browser or visual acceptance.
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, description) {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await sleep(2);
  }
  assert.fail(`Timed out: ${description}`);
}
function savedWorld(name, seed) {
  const world = createWorld(Date.now(), seed);
  world.paused = true;
  renameBird(world, world.birds[0].id, name);
  return world;
}
async function rawWorld(indexedDB, value) {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('world');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('world', value ? 'readwrite' : 'readonly');
      const store = tx.objectStore('world');
      const request = value ? store.put(value, 'current') : store.get('current');
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
async function fixture(t) {
  const window = new Window({
    url: 'https://djnaoyaman.github.io/buncho-ureshi/game/',
    settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, disableJavaScriptEvaluation: true },
  });
  const indexedDB = new IDBFactory(), globals = new Map(), timers = new Map();
  let nextTimer=0;
  let dispose;
  const values = {
    window, document: window.document, location: window.location,
    navigator: window.navigator, localStorage: window.localStorage,
    FormData: window.FormData, matchMedia: window.matchMedia.bind(window),
    indexedDB, BroadcastChannel: undefined,
    setInterval: (callback,delay) => {const id=++nextTimer;timers.set(id,{callback,delay});return id;}, clearInterval: id => timers.delete(id),
  };
  for (const [key, value] of Object.entries(values)) {
    globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  t.after(async () => {
    dispose?.();
    await window.happyDOM.abort();
    await window.happyDOM.close();
    for (const [key, descriptor] of globals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  await rawWorld(indexedDB, savedWorld('最初の庭', 101));
  const root = window.document.createElement('main');
  window.document.body.append(root);
  return {
    window, root, indexedDB,
    async poll() {await [...timers.values()].find(timer=>timer.delay===3000).callback();},
    async mount() { dispose = await mountGame(root); },
    stop() { dispose?.(); dispose = undefined; },
    settings() { root.querySelector('[data-game-panel="settings"]').click(); },
  };
}

test('human remains settings-only across edits, redraws and remounts without altering the world', async t => {
  const f = await fixture(t);
  const key = 'buncho.owner-profile.v1';
  const profile = {version:1,name:'設定の人',hair:'wave',skin:'deep',hairColor:'ink',outfit:'cardigan',palette:'silver',accessory:'none',eyes:'bright',face:'oval'};
  f.window.localStorage.setItem(key, JSON.stringify(profile));
  await f.mount();
  const absent = () => assert.equal(f.root.querySelectorAll('.game-owner-companion,.owner-peek,.owner-portrait-art,.buncho-owner-avatar').length, 0);
  absent();
  const birds = [...f.root.querySelectorAll('.game-room-bird')].map(el => el.dataset.birdId);
  assert.ok(birds.length > 0);
  const before = await rawWorld(f.indexedDB);
  f.settings();
  assert.ok(f.root.querySelector('[data-settings-music]'));
  let portrait = f.root.querySelector('.game-owner-setting .owner-portrait-art');
  assert.ok(portrait);
  assert.equal(portrait.dataset.hair, profile.hair);
  assert.equal(portrait.dataset.outfit, profile.outfit);
  assert.match(f.root.querySelector('.game-owner-setting').textContent, /設定の人/);
  f.root.querySelector('.game-owner-setting').click();
  const preview = () => f.root.querySelector('[data-owner-preview] .owner-portrait-art');
  assert.equal(preview().dataset.hair, profile.hair);
  assert.equal(f.root.querySelector('[data-owner-name]').value, profile.name);
  f.root.querySelector('[data-owner-category="hair"]').click();
  f.root.querySelector('[data-owner-choice="bun"]').click();
  assert.equal(preview().dataset.hair, 'bun');
  f.root.querySelector('[data-owner-save]').click();
  await until(() => f.root.querySelector('.game-owner-setting'), 'settings after save');
  assert.equal(f.root.querySelector('.game-owner-setting .owner-portrait-art').dataset.hair, 'bun');
  assert.deepEqual(JSON.parse(f.window.localStorage.getItem(key)), {...profile,hair:'bun'});
  f.root.querySelector('[data-game-close-panel]').click();
  absent();
  assert.deepEqual([...f.root.querySelectorAll('.game-room-bird')].map(el => el.dataset.birdId), birds);
  const after = await rawWorld(f.indexedDB);
  for (const field of ['worldId','birds','protagonist','economy','decor','settings','events','field']) assert.deepEqual(after[field], before[field], field);
  f.stop(); await f.mount(); absent();
  f.settings();
  assert.equal(f.root.querySelector('.game-owner-setting .owner-portrait-art').dataset.hair, 'bun');
  f.root.querySelector('[data-game-close-panel]').click();
  f.root.querySelector('[data-game-panel="outdoors"]').click();
  await until(() => f.root.querySelector('.finch-garden-stage'), 'outdoor garden');
  absent();
  assert.equal(f.root.querySelector('[data-garden-household]'),null,'family remains at home by default');assert.ok(f.root.querySelector('.finch-garden-friend'),'garden still contains bird friends');
});


const ownerKey='buncho.owner-profile.v1';
const savedOwner={version:1,name:'保存した名前',hair:'wave',skin:'deep',hairColor:'ink',outfit:'cardigan',palette:'silver',accessory:'none',eyes:'bright',face:'oval'};
function openOwner(f,route){
 if(route==='settings'){f.settings();f.root.querySelector('.game-owner-setting').click();}
 else{if(!f.root.querySelector('.game-secondary-menu').open)f.root.querySelector('[data-game-open-menu]').click();f.root.querySelector('#game-menu-owner').click();}
 assert.equal(f.root.querySelector('.game-panel-overlay').getAttribute('aria-label'),'キャラクター設定');
 assert.equal(f.window.document.activeElement.textContent,'キャラクター設定');
}
function editOwner(f){
 f.root.querySelector('[data-owner-category="hair"]').click();f.root.querySelector('[data-owner-choice="bun"]').click();
 const name=f.root.querySelector('[data-owner-name]');name.value='未保存の名前';name.dispatchEvent(new f.window.Event('input',{bubbles:true}));
}
function assertOwnerReturn(f,route){
 assert.equal(f.root.querySelector('.buncho-owner-editor'),null);
 if(route==='settings'){
  assert.ok(f.root.querySelector('.game-owner-setting'));assert.equal(f.window.document.activeElement,f.root.querySelector('.game-owner-setting'));
 }else{
  assert.equal(f.root.querySelector('.game-panel-overlay').open,false);
  assert.equal(f.root.querySelector('.game-secondary-menu').open,true);assert.equal(f.window.document.activeElement.id,'game-menu-owner');
  assert.equal(f.root.querySelectorAll('.game-owner-companion,.owner-peek,.owner-portrait-art,.buncho-owner-avatar').length,0);
 }
}
for(const route of ['menu','settings'])test(`${route} character entry: Cancel, Back and Escape discard; Save and reopen retain settings`,async t=>{
 const f=await fixture(t);f.window.localStorage.setItem(ownerKey,JSON.stringify(savedOwner));await f.mount();
 assert.equal(f.root.querySelector('#game-menu-owner').textContent,'キャラクター設定');assert.equal(f.root.querySelector('#game-menu-settings').textContent,'保存・設定');
 const before=await rawWorld(f.indexedDB),raw=f.window.localStorage.getItem(ownerKey);
 for(const dismiss of ['cancel','back','escape']){
  openOwner(f,route);assert.equal(f.root.querySelector('[data-owner-name]').value,savedOwner.name);editOwner(f);
  assert.equal(f.root.querySelector('[data-owner-draft-state]').dataset.unsaved,'true');
  if(dismiss==='cancel')f.root.querySelector('[data-owner-cancel]').click();
  if(dismiss==='back'){assert.match(f.root.querySelector('[data-game-close-panel]').textContent,/保存せずに/);f.root.querySelector('[data-game-close-panel]').click();}
  // Escape on a modal dialog dispatches the native, cancelable cancel event.
  if(dismiss==='escape')f.root.querySelector('.game-panel-overlay').dispatchEvent(new f.window.Event('cancel',{cancelable:true}));
  assertOwnerReturn(f,route);assert.equal(f.window.localStorage.getItem(ownerKey),raw);
 }
 openOwner(f,route);editOwner(f);f.root.querySelector('[data-owner-save]').click();assertOwnerReturn(f,route);
 assert.deepEqual(JSON.parse(f.window.localStorage.getItem(ownerKey)),{...savedOwner,hair:'bun',name:'未保存の名前'});
 openOwner(f,route);assert.equal(f.root.querySelector('[data-owner-preview] .owner-portrait-art').dataset.hair,'bun');
 assert.equal(f.root.querySelector('[data-owner-draft-state]').textContent,'保存済みの設定');f.root.querySelector('[data-owner-cancel]').click();
 const after=await rawWorld(f.indexedDB);for(const field of ['worldId','birds','protagonist','economy','decor','settings','events','field'])assert.deepEqual(after[field],before[field],field);
 f.stop();await f.mount();openOwner(f,route);assert.equal(f.root.querySelector('[data-owner-name]').value,'未保存の名前');
 assert.equal(f.root.querySelector('[data-owner-preview] .owner-portrait-art').dataset.hair,'bun');
});

test('passive redraw and peer world replacement retain the same character draft, category, focus and shelf',async t=>{
 const f=await fixture(t);f.window.localStorage.setItem(ownerKey,JSON.stringify(savedOwner));await f.mount();openOwner(f,'menu');editOwner(f);
 const editor=f.root.querySelector('.buncho-owner-editor'),name=f.root.querySelector('[data-owner-name]'),shelf=f.root.querySelector('[data-owner-shelf]'),tabs=f.root.querySelector('.owner-tabs');
 name.focus();name.setSelectionRange(1,3);shelf.scrollLeft=142;tabs.scrollLeft=68;
 const kept=()=>{
  assert.equal(f.root.querySelector('.buncho-owner-editor'),editor);assert.equal(f.root.querySelector('[data-owner-name]'),name);
  assert.equal(name.value,'未保存の名前');assert.equal(f.window.document.activeElement,name);assert.equal(name.selectionStart,1);assert.equal(name.selectionEnd,3);
  assert.equal(f.root.querySelector('[data-owner-category="hair"]').getAttribute('aria-selected'),'true');assert.equal(f.root.querySelector('[data-owner-choice="bun"]').getAttribute('aria-pressed'),'true');
  assert.equal(shelf.scrollLeft,142);assert.equal(tabs.scrollLeft,68);assert.equal(f.root.querySelector('[data-owner-draft-state]').dataset.unsaved,'true');
  assert.equal(f.window.localStorage.getItem(ownerKey),JSON.stringify(savedOwner));
 };
 f.window.dispatchEvent(new f.window.StorageEvent('storage',{key:'buncho.care-sound-choice.v1',newValue:JSON.stringify({explicit:true,enabled:false})}));kept();
 await rawWorld(f.indexedDB,savedWorld('別の庭',202));await f.poll();kept();
 f.root.querySelector('[data-owner-save]').click();assertOwnerReturn(f,'menu');
 assert.equal(JSON.parse(f.window.localStorage.getItem(ownerKey)).hair,'bun');
});

test('conflicting character save keeps the editor open and reopens the latest settings after cancel',async t=>{
 const f=await fixture(t);f.window.localStorage.setItem(ownerKey,JSON.stringify(savedOwner));await f.mount();openOwner(f,'menu');editOwner(f);
 const latest={...savedOwner,name:'別の画面で保存',hair:'crop'};f.window.localStorage.setItem(ownerKey,JSON.stringify(latest));
 f.root.querySelector('[data-owner-save]').click();
 assert.ok(f.root.querySelector('.buncho-owner-editor'));assert.equal(f.root.querySelector('[data-owner-save]').disabled,true);
 assert.match(f.root.querySelector('[data-owner-status]').textContent,/ほかの画面/);assert.equal(f.root.querySelector('[data-owner-name]').value,'未保存の名前');
 assert.equal(f.window.localStorage.getItem(ownerKey),JSON.stringify(latest));f.root.querySelector('[data-owner-cancel]').click();assertOwnerReturn(f,'menu');
 openOwner(f,'menu');assert.equal(f.root.querySelector('[data-owner-name]').value,latest.name);assert.equal(f.root.querySelector('[data-owner-preview] .owner-portrait-art').dataset.hair,'crop');
 assert.equal(f.root.querySelector('[data-owner-save]').disabled,false);
});
