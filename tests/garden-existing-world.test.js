import test from 'node:test';
import assert from 'node:assert/strict';
import * as v4 from './fixtures/engine-v4.js';
import { Window } from 'happy-dom';
import { IDBFactory } from 'fake-indexeddb';
import { mountGame } from '../src/game.js';
import { openGameStore, DB_NAME } from '../src/game-store.js';
import { SAVE_VERSION, createWorld, renameBird, serializeWorld, bumpRevision, adoptBird, advanceTicks } from '../src/engine.js';

// Real engine/store code in a DOM emulator, not browser or visual acceptance.
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
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
async function fixture(t, { corrupt = false, legacy = false } = {}) {
  const window = new Window({
    url: 'https://djnaoyaman.github.io/buncho-ureshi/game/',
    settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, disableJavaScriptEvaluation: true },
  });
  const indexedDB = new IDBFactory(), globals = new Map(), stores = [], timers = new Map(), confirmations = [];
  let dispose, nextTimer = 0, closeCalls = 0;
  const originalOpen = indexedDB.open.bind(indexedDB);
  indexedDB.open = (...args) => {
    const request = originalOpen(...args);
    request.addEventListener('success', () => {
      const db = request.result, close = db.close.bind(db);
      db.close = () => { closeCalls++; close(); };
    });
    return request;
  };
  const values = {
    window, document: window.document, location: window.location,
    navigator: window.navigator, localStorage: window.localStorage,
    FormData: window.FormData, matchMedia: window.matchMedia.bind(window),
    indexedDB, BroadcastChannel: undefined,
    confirm: message => { confirmations.push(message); return true; },
    setInterval: callback => { const id = ++nextTimer; timers.set(id, callback); return id; },
    clearInterval: id => timers.delete(id),
  };
  for (const [key, value] of Object.entries(values)) {
    globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  t.after(async () => {
    dispose?.();
    for (const store of stores) store.close();
    await window.happyDOM.abort();
    await window.happyDOM.close();
    for (const [key, descriptor] of globals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const initial = legacy?v4.createWorld(Date.now(),842911):savedWorld('最初の庭',101); if(legacy){v4.advanceTicks(initial,399);initial.paused=true;initial.lastUpdated=Date.now();}
  if (corrupt) initial.version = 99;
  await rawWorld(indexedDB, initial);
  const root = window.document.createElement('main');
  window.document.body.append(root);
  return {
    window, root, indexedDB, initial, confirmations, timers,
    get closeCalls() { return closeCalls; },
    async mount() { dispose = await mountGame(root); return dispose; },
    stop() { dispose?.(); dispose = undefined; },
    async otherTab() { const store = await openGameStore({ indexedDB }); stores.push(store); return store; },
    profile() { root.querySelector('[data-game-panel="profile"]').click(); },
    openBird(){root.querySelector('[data-game-open-bird]').click();},
    closeBird(){root.querySelector('[data-game-close-bird]').click();},
    settings() { root.querySelector('[data-game-panel="settings"]').click(); },
    importLater(gate, name = 'garden.json') {
      const input = root.querySelector('#game-import');
      assert.ok(input, 'settings import control exists');
      const file = new window.File(['pending'], name, { type: 'application/json' });
      Object.defineProperty(file, 'text', { value: () => gate.promise });
      Object.defineProperty(input, 'files', { configurable: true, value: [file] });
      input.dispatchEvent(new window.Event('change', { bubbles: true }));
    },
  };
}


for(const legacy of [false,true])test('garden entry real store legacy='+legacy,async t=>{const f=await fixture(t,{legacy});await f.mount();const before=await rawWorld(f.indexedDB);f.root.querySelector('.game-field-nav [data-game-panel="outdoors"]').click();await until(async()=>{const saved=await rawWorld(f.indexedDB);return saved.encounters.garden.open&&f.root.querySelector('.finch-garden-selector')&&f.root.querySelector('[data-encounter-slot] [aria-busy]')?.getAttribute('aria-busy')==='false';}, 'garden navigation ready');assert.equal(f.root.querySelectorAll('[data-garden-select]').length,12);assert.equal(f.root.querySelector('[data-encounter-slot] [aria-busy]')?.getAttribute('aria-busy'),'false');const after=await rawWorld(f.indexedDB);assert.equal(after.worldId,before.worldId);assert.equal(after.birds.length,before.birds.length);});
