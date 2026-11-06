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
  const indexedDB = new IDBFactory(), globals = new Map();
  let dispose;
  const values = {
    window, document: window.document, location: window.location,
    navigator: window.navigator, localStorage: window.localStorage,
    FormData: window.FormData, matchMedia: window.matchMedia.bind(window),
    indexedDB, BroadcastChannel: undefined,
    setInterval: () => 1, clearInterval: () => {},
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
  assert.ok(f.root.querySelector('[data-garden-household]'), 'bird protagonist still visits the garden');
});
