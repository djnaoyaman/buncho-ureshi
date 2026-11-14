import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { IDBFactory } from 'fake-indexeddb';
import { mountGame } from '../src/game.js';
import { mountGameMusic } from '../src/game-music-ui.js';
import { openGameStore, DB_NAME } from '../src/game-store.js';
import { arriveGardenRaptor, raptorToken } from '../src/garden-raptors.js';
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
async function fixture(t, { corrupt = false } = {}) {
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
  const initial = savedWorld('最初の庭', 101);
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

const lifeMenuItems = [['health','健康・お留守番'],['profile','文鳥の紹介'],['relations','関係図'],['family','家系図'],['roster','名簿'],['notebook','庭の鳥図鑑'],['diary','日記'],['memorial','思い出の庭'],['settings','保存・設定'],['help','あそびかた']];
for (const [id,label] of lifeMenuItems) test(`approved life menu ${id} preserves its target, label, dismissal and saved world`, async t => {
  const f = await fixture(t); await f.mount();
  const before = await rawWorld(f.indexedDB);
  for (let repeat=0;repeat<2;repeat++) {
    const menu=f.root.querySelector('.game-secondary-menu');menu.open=true;
    const buttons=[...menu.querySelectorAll('.game-tabs > button')];
    assert.deepEqual(buttons.map(b=>[b.dataset.gamePanel,b.textContent.trim()]),lifeMenuItems);
    const button=f.root.querySelector(`#game-menu-${id}`),svg=button.querySelector('svg');
    assert.equal(svg.dataset.lifeMenuIcon,id);
    assert.equal(svg.getAttribute('aria-hidden'),'true');
    assert.equal(svg.getAttribute('focusable'),'false');
    assert.equal(button.textContent.trim(),label);
    button.click();
    assert.equal(f.root.querySelector('.game-app').dataset.panel,id);
    assert.equal(f.root.querySelector(`#game-menu-${id}`).getAttribute('aria-pressed'),'true');
    const close=f.root.querySelector('[data-game-close-panel]');assert.ok(close);
    close.click();
    assert.equal(f.root.querySelector('.game-app').dataset.panel,'garden');
    assert.equal(f.root.querySelector('.game-panel-overlay').open,false);
    assert.equal(f.window.document.activeElement.id,'game-nav-open');
  }
  assert.deepEqual(await rawWorld(f.indexedDB),before,'decorative icons and navigation never mutate the saved world');
});



test('home closing remains reachable separately from the ten navigation destinations', async t => {
  const f=await fixture(t);await f.mount();
  const before=await rawWorld(f.indexedDB);
  f.root.querySelector('[data-game-open-menu]').click();
  const menu=f.root.querySelector('.game-secondary-menu');
  assert.equal(menu.open,true);
  const closeHome=menu.querySelector('.game-menu-home-actions > [data-home-close]');
  assert.ok(closeHome);assert.equal(closeHome.type,'button');
  assert.equal(closeHome.textContent.trim(),'今日はお開き');
  assert.equal(closeHome.disabled,false);
  assert.match(closeHome.title,/家族や思い出は残ります/);
  assert.equal(closeHome.closest('.game-tabs'),null);
  assert.equal(f.root.querySelectorAll('[data-home-close]').length,1);
  assert.equal(f.root.querySelector('.game-bottom-dock [data-home-close]'),null);
  assert.deepEqual([...menu.querySelectorAll('.game-tabs > button')].map(b=>[b.dataset.gamePanel,b.textContent.trim()]),lifeMenuItems);
  f.root.querySelector('[data-game-close-menu]').click();
  assert.equal(menu.open,false);
  assert.equal(f.window.document.activeElement,f.root.querySelector('[data-game-open-menu]'));
  assert.deepEqual(await rawWorld(f.indexedDB),before);
});
