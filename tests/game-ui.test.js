import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { IDBFactory } from 'fake-indexeddb';
import { mountGame } from '../src/game.js';
import { openGameStore, DB_NAME } from '../src/game-store.js';
import { createWorld, renameBird, serializeWorld, bumpRevision } from '../src/engine.js';

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

test('mountGame delayed file reads: the latest requested import wins, not the last read to finish', async t => {
  const f = await fixture(t); await f.mount(); f.settings();
  const store = await f.otherTab(), older = deferred(), newer = deferred();
  const oldWorld = savedWorld('先に選んだ庭', 201), newWorld = savedWorld('最後に選んだ庭', 202);
  f.importLater(older, 'older.json');
  f.importLater(newer, 'newer.json');
  newer.resolve(serializeWorld(newWorld));
  await until(async () => (await store.transact(w => w)).worldId === newWorld.worldId, 'newer world committed');
  await until(() => f.root.querySelector('.game-message').textContent.includes('復元'), 'newer import rendered');
  const committed = await store.transact(w => w);
  older.resolve(serializeWorld(oldWorld));
  await sleep(10);
  assert.deepEqual(await store.transact(w => w), committed, 'late older read cannot overwrite the new world');
  assert.equal(f.confirmations.length, 1, 'an obsolete read does not even ask to replace the current garden');
  assert.ok(f.confirmations[0].includes('最後に選んだ庭'));
});

test('mountGame cleanup cancels a pending file import without confirmation, save or DOM mutation', async t => {
  const f = await fixture(t); await f.mount(); f.settings();
  const store = await f.otherTab(), gate = deferred();
  const before = await store.transact(w => w);
  f.importLater(gate);
  f.stop();
  const oldHTML = f.root.innerHTML;
  assert.equal(f.timers.size, 0, 'cleanup clears the game poll interval');
  gate.resolve(serializeWorld(savedWorld('読み込まない庭', 301)));
  await sleep(10);
  assert.equal(f.confirmations.length, 0);
  assert.equal(f.root.innerHTML, oldHTML);
  assert.deepEqual(await store.transact(w => w), before);
});

test('mountGame stale UI cannot rename a reused bird ID after another tab replaces worldId', async t => {
  const f = await fixture(t); await f.mount();
  const store = await f.otherTab();
  const replacement = savedWorld('別の庭の文鳥', 401);
  await store.transact(w => { replacement.revision = w.revision; bumpRevision(replacement); return replacement; });
  assert.equal(f.root.querySelector('#game-name').value, '最初の庭', 'old tab has not polled the replacement yet');
  const before = await store.transact(w => w);
  const form = f.root.querySelector('[data-game-form="rename"]');
  form.querySelector('[name="name"]').value = '間違った名前';
  form.dispatchEvent(new f.window.Event('submit', { bubbles: true, cancelable: true }));
  await until(() => f.root.querySelector('.game-message').textContent.includes('別のタブで別の庭'), 'stale-world rejection shown');
  assert.deepEqual(await store.transact(w => w), before, 'other garden and same-ID bird remain completely unchanged');
  assert.equal((await store.transact(w => w)).birds[0].name, '別の庭の文鳥');
});

test('mountGame keeps settings disclosures open after motion and pause mutations rerender', async t => {
  const f = await fixture(t); await f.mount(); f.settings();
  const store = await f.otherTab();
  const details = f.root.querySelector('[data-game-details="save-help"]');
  details.open = true;
  const motion = f.root.querySelector('[data-game-motion]');
  motion.checked = false;
  motion.dispatchEvent(new f.window.Event('change', { bubbles: true }));
  await until(() => f.root.querySelector('[data-game-details="save-help"]') !== details, 'motion mutation rerender');
  assert.equal((await store.transact(w => w)).settings.motion, false);
  assert.equal(f.root.querySelector('[data-game-details="save-help"]').open, true);
  const nextDetails = f.root.querySelector('[data-game-details="save-help"]');
  f.root.querySelector('.game-settings [data-game-action="pause"]').click();
  await until(() => f.root.querySelector('[data-game-details="save-help"]') !== nextDetails, 'pause mutation rerender');
  assert.equal((await store.transact(w => w)).paused, false);
  assert.equal(f.root.querySelector('[data-game-details="save-help"]').open, true);
});

test('mountGame closes an opened IndexedDB connection when initial save validation fails', async t => {
  const f = await fixture(t, { corrupt: true });
  const closedBefore = f.closeCalls;
  await f.mount();
  assert.equal(f.closeCalls, closedBefore + 1, 'failed mount closes its database exactly once');
  assert.match(f.root.querySelector('[role="alert"]').textContent, /保存を開けませんでした/);
  assert.equal(f.timers.size, 0, 'failed mount never starts polling');
  assert.deepEqual(await rawWorld(f.indexedDB), f.initial, 'unsupported save is retained without replacement');
});
