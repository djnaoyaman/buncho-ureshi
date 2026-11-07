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

const ownerKey='buncho.owner-profile.v1',legacyKey='buncho.owner-name.v1';
const profile={version:1,name:'保管する名前',hair:'wave',eyes:'bright',outfit:'cardigan'};
const absent=f=>assert.equal(f.root.querySelectorAll('[data-game-panel="owner"],.game-owner-setting,.buncho-owner-editor,.game-owner-companion,.owner-peek,.owner-portrait-art,.buncho-owner-avatar').length,0);
for(const raw of [JSON.stringify(profile),'{','{"version":99,"future":true}',null])test(`removed character settings never alter saved profile or world: ${raw}`,async t=>{
 const f=await fixture(t);if(raw!==null)f.window.localStorage.setItem(ownerKey,raw);f.window.localStorage.setItem(legacyKey,'旧名');
 await f.mount();absent(f);assert.ok(f.root.querySelector('.game-room-bird'));
 const before=await rawWorld(f.indexedDB);
 for(let i=0;i<3;i++){
  f.root.querySelector('[data-game-open-menu]').click();absent(f);assert.equal(f.root.querySelectorAll('.game-secondary-menu .game-tabs button').length,10);
  f.settings();absent(f);assert.ok(f.root.querySelector('[data-settings-music]'));assert.ok(f.root.querySelector('[data-game-motion]'));assert.ok(f.root.querySelector('[data-game-action="export"]'));assert.ok(f.root.querySelector('#game-import'));
  await f.poll();absent(f);
  f.root.querySelector('.game-panel-overlay').dispatchEvent(new f.window.Event('cancel',{cancelable:true}));absent(f);
 }
 f.window.document.dispatchEvent(new f.window.CustomEvent('buncho-world-action',{detail:'owner'}));absent(f);
 const stale=f.window.document.createElement('button');stale.dataset.gamePanel='owner';f.root.append(stale);stale.click();stale.remove();absent(f);
 assert.equal(f.root.querySelector('.game-app').dataset.panel,'garden');
 const after=await rawWorld(f.indexedDB);for(const field of ['worldId','birds','protagonist','decor','settings','events','field'])assert.deepEqual(after[field],before[field],field);
 // Polling legitimately advances the real-time economy clock, never its balances.
 const {seenAt:oldSeen,...oldEconomy}=before.economy,{seenAt:newSeen,...newEconomy}=after.economy;assert.deepEqual(newEconomy,oldEconomy);assert.ok(newSeen>=oldSeen);
 assert.equal(f.window.localStorage.getItem(ownerKey),raw);assert.equal(f.window.localStorage.getItem(legacyKey),'旧名');
 f.stop();await f.mount();absent(f);assert.equal(f.window.localStorage.getItem(ownerKey),raw);assert.equal(f.window.localStorage.getItem(legacyKey),'旧名');
});
