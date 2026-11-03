import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { IDBFactory } from 'fake-indexeddb';
import { mountGame } from '../src/game.js';
import { openGameStore, DB_NAME } from '../src/game-store.js';
import { createWorld, renameBird, serializeWorld, bumpRevision, adoptBird, advanceTicks } from '../src/engine.js';

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
  const f = await fixture(t); await f.mount();f.profile();
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


test('photo habitat keeps one selected caption, accessible resident picker, and profile flow', async t => {
  const f = await fixture(t);
  const store = await f.otherTab();
  await store.transact(w => { w.paused=false;advanceTicks(w,1);w.paused=true;const guest=w.birds.find(b=>b.home==='visitor'); adoptBird(w,guest.id,'そら'); bumpRevision(w); return w; });
  await f.mount();
  assert.equal(f.root.querySelectorAll('.game-room').length,1);
  assert.equal(f.root.querySelectorAll('.game-habitat picture').length,0);
  assert.match(f.root.querySelector('.game-habitat source').getAttribute('srcset'),/field-home-tall\.webp$/);
  assert.match(f.root.querySelector('.game-habitat img').getAttribute('src'),/field-home-wide\.webp$/);
  assert.equal(f.root.querySelectorAll('.game-scene-caption').length,1);
  assert.equal(f.root.querySelectorAll('.game-room-bird button').length,0);
  assert.equal(f.root.querySelectorAll('.game-room-bird svg').length,0);
  assert.equal(f.root.querySelectorAll('.game-room-bird').length,2);
  assert.equal(f.root.querySelector('.game-bird-carousel .game-bird-switch span').textContent,'1 / 2');assert.equal(f.root.querySelector('#game-scene-resident'),null);
  const bird=f.root.querySelector('[data-game-scene-select][data-bird-id="b2"]');
  bird.focus();bird.click();
  assert.equal(f.root.querySelectorAll('.game-room').length,1,'scene selection must not navigate away');
  assert.equal(f.root.querySelector('.game-scene-caption strong').textContent,'そら');
  assert.equal(f.root.querySelector('[data-game-scene-select][aria-pressed="true"]').dataset.birdId,'b2');
  assert.equal(f.window.document.activeElement.id,'game-sheet-close','focus enters native sheet');
  assert.equal(f.root.querySelector('.game-bird-sheet').open,true);f.closeBird();
  assert.equal(f.window.document.activeElement.dataset.birdId,'b2','closing restores scene bird focus');
  f.root.querySelector('.game-bird-carousel [data-bird-step="-1"]').click();
  assert.equal(f.root.querySelector('.game-scene-caption strong').textContent,'最初の庭');
  f.openBird();f.root.querySelector('.game-bird-sheet [data-game-panel="profile"]').click();
  assert.equal(f.root.querySelector('.game-profile h3').textContent,'最初の庭');
  assert.equal(f.root.querySelectorAll('.game-room').length,1,'background scene stays behind the profile overlay');assert.equal(f.root.querySelector('.game-panel-overlay').open,true);
  f.root.querySelector('[data-game-panel="garden"]').click();
  f.root.querySelector('[data-game-panel="help"]').click();assert.equal(f.root.querySelector('.game-art-disclosure').textContent.includes('実際のおもちの写真'),true);f.root.querySelector('[data-game-panel="garden"]').click();
  assert.equal(f.root.querySelectorAll('.game-room-bird').length,2);
});


test('returning from a visitor profile aligns the scene, picker and resident profile',async t=>{
  const f=await fixture(t),store=await f.otherTab();
  await store.transact(w=>{w.paused=false;advanceTicks(w,1);w.paused=true;bumpRevision(w);return w;});
  await f.mount();
  f.root.querySelector('[data-game-scene-select][data-bird-id="b2"]').click();f.root.querySelector('.game-bird-sheet [data-game-panel="profile"]').click();
  const visitorName=(await rawWorld(f.indexedDB)).birds.find(b=>b.id==='b2').name;assert(f.root.querySelector('.game-profile-heading').textContent.includes(visitorName));assert.doesNotMatch(visitorName,/ななし|[0-9]/);
  f.root.querySelector('[data-game-panel="garden"]').click();
  assert.equal(f.root.querySelector('.game-bird-carousel-face').dataset.birdId,'b2');
  assert.equal(f.root.querySelector('.game-scene-caption strong').textContent,visitorName);
  assert.equal(f.root.querySelector('.game-profile'),null,'scene no longer repeats full profile');f.openBird();assert.equal(f.root.querySelector('#game-sheet-title').textContent,visitorName);
});

test('other-tab refresh preserves dirty name and talk drafts after focus moves to a button',async t=>{
  const f=await fixture(t),store=await f.otherTab();await f.mount();f.profile();
  const type=(id,value)=>{const input=f.root.querySelector(id);input.value=value;input.dispatchEvent(new f.window.Event('input',{bubbles:true}));};
  type('#game-name','まだ保存していない名前');f.openBird();f.root.querySelector('[data-game-details="sheet-talk"]').open=true;type('#game-words','おはよう、元気？');
  f.root.querySelector('#game-talk-send').focus();
  await store.transact(w=>{renameBird(w,'b1','別タブの変更');bumpRevision(w);return w;});await [...f.timers.values()][0]();
  assert.equal(f.root.querySelector('#game-words').value,'おはよう、元気？');f.closeBird();
  assert.equal(f.root.querySelector('#game-name').value,'まだ保存していない名前');
  f.openBird();assert.equal(f.root.querySelector('#game-words').value,'おはよう、元気？','closed sheet preserves unsent talk');f.closeBird();
  f.root.querySelector('[data-game-form="rename"] button[type="submit"]').focus();
  f.root.querySelector('[data-game-form="rename"]').dispatchEvent(new f.window.Event('submit',{bubbles:true,cancelable:true}));
  await until(async()=>(await rawWorld(f.indexedDB)).birds[0].name==='まだ保存していない名前','save preserved draft');await sleep(20);
  await store.transact(w=>{renameBird(w,'b1','保存後の別タブ名');bumpRevision(w);return w;});
  assert.equal(f.window.document.activeElement,f.root.querySelector('[data-game-form="rename"] button[type="submit"]'),'successful save retains keyboard focus');await [...f.timers.values()][0]();
  assert.equal(f.root.querySelector('#game-name').value,'保存後の別タブ名','saved draft and focused Save button no longer block live remote updates');
});

test('dirty input drafts cannot leak into a replacement world reusing the same bird ID',async t=>{
  const f=await fixture(t),store=await f.otherTab();await f.mount();f.profile();
  const input=f.root.querySelector('#game-name');input.focus();input.value='古い庭だけの下書き';input.dispatchEvent(new f.window.Event('input',{bubbles:true}));
  await store.transact(()=>savedWorld('新しい庭の名前',999));await [...f.timers.values()][0]();
  assert.equal(f.root.querySelector('#game-name').value,'新しい庭の名前');
});

test('a peer refresh cannot detach a held submit button before native activation',async t=>{
  const f=await fixture(t),store=await f.otherTab();await f.mount();f.profile();
  const form=f.root.querySelector('[data-game-form="rename"]'),button=form.querySelector('button[type="submit"]'),input=form.querySelector('input');
  input.value='押している途中の名前';input.dispatchEvent(new f.window.Event('input',{bubbles:true}));
  button.dispatchEvent(new f.window.PointerEvent('pointerdown',{bubbles:true,pointerId:7}));
  await store.transact(w=>{renameBird(w,'b1','他のタブの更新');bumpRevision(w);return w;});
  await [...f.timers.values()][0]();
  assert.equal(button.isConnected,true,'original activation target stays in the live tree');
  assert.equal(f.root.querySelector('[data-game-form="rename"]'),form);
  button.dispatchEvent(new f.window.PointerEvent('pointerup',{bubbles:true,pointerId:7}));
  form.dispatchEvent(new f.window.Event('submit',{bubbles:true,cancelable:true}));
  await until(async()=>(await rawWorld(f.indexedDB)).birds[0].name==='押している途中の名前','held-pointer submit commits once');
});

test('pointer cancellation flushes a pending refresh without saving the local draft',async t=>{
  const f=await fixture(t),store=await f.otherTab();await f.mount();f.profile();
  const button=f.root.querySelector('[data-game-form="rename"] button[type="submit"]');
  button.dispatchEvent(new f.window.PointerEvent('pointerdown',{bubbles:true,pointerId:8}));
  await store.transact(w=>{renameBird(w,'b1','キャンセル後の更新');bumpRevision(w);return w;});
  await [...f.timers.values()][0]();assert.equal(button.isConnected,true);
  f.window.document.dispatchEvent(new f.window.PointerEvent('pointercancel',{bubbles:true,pointerId:8}));
  await until(()=>f.root.querySelector('#game-name').value==='キャンセル後の更新','cancel releases deferred refresh');
  assert.equal((await rawWorld(f.indexedDB)).birds[0].name,'キャンセル後の更新');
});

test('field travel and return preserve story and real visitors in the same scene',async t=>{
 const f=await fixture(t),store=await f.otherTab();await store.transact(w=>{w.paused=false;advanceTicks(w,1);w.paused=true;bumpRevision(w);return w;});await f.mount();
 f.root.querySelector('[data-field-travel="park"]').click();await until(()=>f.root.querySelector('.game-room')?.dataset.field==='park','park arrived');
 assert.equal(f.root.querySelectorAll('.game-room-bird').length,2);
 f.root.querySelector('[data-game-panel="friends"]').click();f.root.querySelector('[data-field-travel="friend"]').click();await until(()=>f.root.querySelector('.game-room')?.dataset.field==='friend','friend arrived');
 assert(f.root.querySelector('.game-field-bar h3').textContent.includes((await rawWorld(f.indexedDB)).birds.find(b=>b.id==='b2').name));
 f.root.querySelector('[data-field-travel="home"]').click();await until(()=>f.root.querySelector('.game-room')?.dataset.field==='home','home returned');
 const w=await rawWorld(f.indexedDB);assert.equal(w.birds[0].name,'最初の庭');assert(w.decor.points>=20);assert.equal(w.version,5);
});
test('draw is one transaction on double click; preview cancellation and equip preserve inventory',async t=>{
 const f=await fixture(t);await f.mount();f.root.querySelector('[data-game-panel="decorate"]').click();
 f.root.querySelector('[data-decor-slot="swing"]').click();const draw=f.root.querySelector('[data-decor-draw]');draw.click();draw.click();
 await until(()=>!!f.root.querySelector('.game-draw-result'),'draw result');let w=await rawWorld(f.indexedDB);assert.equal(w.decor.draws,1);assert(w.decor.points<=8);
 const item=w.decor.inventory.find(i=>i.slot==='swing'&&i.id!==w.decor.equipped.swing);
 if(item){assert.equal(f.root.querySelector('.game-decor-preview').dataset.previewItem,item.id);f.root.querySelector('[data-decor-cancel]').click();assert.equal(f.root.querySelector('.game-decor-preview').dataset.previewItem,w.decor.equipped.swing);f.root.querySelector(`[data-decor-preview="${item.id}"]`).click();f.root.querySelector('[data-decor-equip]').click();await until(async()=> (await rawWorld(f.indexedDB)).decor.equipped.swing===item.id,'equipped');}
 f.root.querySelector('[data-field-travel="home"]').click();await until(()=>!!f.root.querySelector('.game-room'),'return after decorating');w=await rawWorld(f.indexedDB);assert.equal(f.root.querySelector('[data-equipped-slot="swing"]').dataset.equippedItem,w.decor.equipped.swing);
});
test('navigation away during a field transaction cannot reopen its old panel',async t=>{
 const f=await fixture(t);await f.mount();f.root.querySelector('[data-field-travel="park"]').click();f.root.querySelector('[data-game-panel="family"]').click();
 await until(async()=> (await rawWorld(f.indexedDB)).field.place==='park','travel committed');await sleep(20);assert(f.root.querySelector('.game-family-tree'));assert.equal(f.root.querySelectorAll('.game-room').length,1,'background scene stays behind the profile overlay');assert.equal(f.root.querySelector('.game-panel-overlay').open,true);
});

test('pending draw cannot replace a newer category or preview choice',async t=>{
 const f=await fixture(t);await f.mount();f.root.querySelector('[data-game-panel="decorate"]').click();f.root.querySelector('[data-decor-slot="toy"]').click();
 f.root.querySelector('[data-decor-draw="toy"]').click();f.root.querySelector('[data-decor-slot="perch"]').click();
 await until(async()=> (await rawWorld(f.indexedDB)).decor.draws===1,'toy draw committed');await sleep(20);
 assert.equal(f.root.querySelector('[data-decor-slot][aria-pressed="true"]').dataset.decorSlot,'perch');assert.match(f.root.querySelector('.game-decor-preview').dataset.previewItem,/^perch-/);assert.equal(f.root.querySelector('.game-draw-result'),null);
 const w=await rawWorld(f.indexedDB);assert.equal(w.decor.draws,1);assert.equal(w.decor.equipped.toy,'toy-mint-cozy');
});

test('one primary nav and a secondary disclosure preserve keyboard close focus',async t=>{
 const f=await fixture(t);await f.mount();assert.equal(f.root.querySelectorAll('.game-field-nav').length,1);assert.equal(f.root.querySelectorAll('.game-field-nav button').length,3);
 let menu=f.root.querySelector('.game-secondary-menu');assert.equal(menu.open,false);assert(f.root.querySelector('.game-room').compareDocumentPosition(menu)&4);menu.open=true;menu.querySelector('[data-game-panel="family"]').focus();menu.dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(menu.open,false);assert.equal(f.window.document.activeElement.id,'game-nav-open');
 menu.open=true;menu.querySelector('[data-game-close-menu]').click();assert.equal(menu.open,false);assert.equal(f.window.document.activeElement.id,'game-nav-open');
 f.root.querySelector('[data-game-panel="decorate"]').click();assert.equal(f.root.querySelectorAll('.game-field-nav').length,1);assert.equal(f.root.querySelectorAll('[data-field-travel="home"]').length,1);assert(f.root.querySelector('.game-decoration'));
});

test('bird sheet Tab loop excludes closed disclosure descendants and wraps visible controls',async t=>{
 const f=await fixture(t);await f.mount();f.openBird();const sheet=f.root.querySelector('.game-bird-sheet');
 // DOM emulator has no layout. Give every control a rectangle deliberately so
 // closed-details exclusion is tested independently of browser layout behavior.
 for(const node of sheet.querySelectorAll('button,input,summary'))node.getClientRects=()=>[{}];
 const close=sheet.querySelector('#game-sheet-close');close.focus();
 const key=shiftKey=>f.window.document.activeElement.dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'Tab',shiftKey,bubbles:true,cancelable:true}));
 key(false);assert.equal(f.window.document.activeElement.id,'game-care-feed');
 close.focus();key(true);assert.equal(f.window.document.activeElement.dataset.gamePanel,'profile');
 key(false);assert.equal(f.window.document.activeElement.id,'game-sheet-close');
 for(let i=0;i<20;i++){key(false);assert.equal(sheet.contains(f.window.document.activeElement),true);assert.notEqual(f.window.document.activeElement.id,'game-words');assert.notEqual(f.window.document.activeElement.dataset.gameTalk,'あそぼう');}
});

test('deferred sheet close restoration never steals a newer intentional focus',async t=>{
 const f=await fixture(t);await f.mount();f.openBird();f.closeBird();
 const newer=f.root.querySelector('[data-game-action="pause"]');newer.focus();await sleep(25);
 assert.equal(f.window.document.activeElement===newer,true);
});

test('future collection previews all24 variants without granting or equipping unowned items',async t=>{
 const f=await fixture(t);await f.mount();f.root.querySelector('[data-game-panel="decorate"]').click();
 assert.equal(f.root.querySelectorAll('[data-decor-preview]').length,24);assert.equal(f.root.querySelectorAll('[data-decor-preview][data-owned="true"]').length,1);
 f.root.querySelector('[data-decor-preview="perch-rose-special"]').click();assert.equal(f.root.querySelector('.game-decor-preview').dataset.previewItem,'perch-rose-special');assert.equal(f.root.querySelector('[data-decor-equip]'),null);assert.match(f.root.querySelector('.game-decor-preview').textContent,/Lv.6/);
 assert.equal((await rawWorld(f.indexedDB)).decor.equipped.perch,'perch-mint-cozy');assert.equal((await rawWorld(f.indexedDB)).decor.inventory.length,9);
 f.root.querySelector('[data-decor-slot="water"]').click();assert.equal(f.root.querySelectorAll('[data-decor-preview]').length,24);assert.match(f.root.querySelector('.game-decor-preview').dataset.previewItem,/^water-/);
});

test('horizontal bird swipes and arrows replace select while vertical and interactive drags do not switch',async t=>{
 const f=await fixture(t),store=await f.otherTab();await store.transact(w=>{w.paused=false;advanceTicks(w,1);w.paused=true;return w;});await f.mount();
 const swipe=(node,dx,dy,type='pointerup')=>{node.dispatchEvent(new f.window.PointerEvent('pointerdown',{bubbles:true,pointerId:11,clientX:180,clientY:200,button:0}));f.window.document.dispatchEvent(new f.window.PointerEvent(type,{bubbles:true,pointerId:11,clientX:180+dx,clientY:200+dy}));};
 assert.equal(f.root.querySelector('[data-game-scene-choose]'),null);swipe(f.root.querySelector('.game-bird-carousel-face'),-100,5);assert.equal(f.root.querySelector('.game-bird-carousel-face').dataset.birdId,'b2');await sleep(410);
 swipe(f.root.querySelector('.game-bird-carousel-face'),70,120);assert.equal(f.root.querySelector('.game-bird-carousel-face').dataset.birdId,'b2');
 swipe(f.root.querySelector('#game-open-bird'),100,0);assert.equal(f.root.querySelector('.game-bird-carousel-face').dataset.birdId,'b2');
 f.openBird();const input=f.root.querySelector('#game-words');input.value='訪問者への下書き';input.dispatchEvent(new f.window.Event('input',{bubbles:true}));
 swipe(f.root.querySelector('#game-sheet-title'),90,0);assert.equal(f.root.querySelector('#game-sheet-title').textContent,'最初の庭');await sleep(410);f.root.querySelector('.game-bird-sheet [data-bird-step="1"]').click();assert.equal(f.root.querySelector('#game-words').value,'訪問者への下書き');
});

test('stale rendered dropping cannot redeem after peer update even while poll defers DOM; next fresh tap redeems once',async t=>{
 const f=await fixture(t),store=await f.otherTab();await store.transact(w=>{w.paused=false;w.birds[0].gemCare.fullSinceTick=0;advanceTicks(w,2);w.paused=true;return w;});await f.mount();
 const button=f.root.querySelector('[data-gem-collect]');assert(button);const before=await rawWorld(f.indexedDB);button.dispatchEvent(new f.window.PointerEvent('pointerdown',{bubbles:true,pointerId:14}));
 await store.transact(w=>{renameBird(w,'b1','更新された鳥');return w;});await [...f.timers.values()][0]();assert.equal(button.isConnected,true);button.click();await sleep(30);
 assert.equal((await rawWorld(f.indexedDB)).decor.points,before.decor.points);assert.equal(f.root.querySelector('.game-gem-reward'),null);f.window.document.dispatchEvent(new f.window.PointerEvent('pointerup',{bubbles:true,pointerId:14}));
 const fresh=f.root.querySelector('[data-gem-collect]');fresh.click();fresh.click();await until(async()=>!(await rawWorld(f.indexedDB)).gems.droppings.length,'drop removed');await sleep(20);assert.equal((await rawWorld(f.indexedDB)).decor.points,before.decor.points+8);assert.match(f.root.querySelector('.game-gem-reward').textContent,/\+8 Gem/);assert.equal(f.window.document.activeElement.dataset.gameCare,'clean');f.root.querySelector('[data-game-panel="decorate"]').click();assert.equal(f.root.querySelector('.game-gem-reward'),null,'newer navigation dismisses reward from prior scene');
});

test('family graph selection recenters and restores keyboard focus to the selected bird',async t=>{const f=await fixture(t),store=await f.otherTab();await store.transact(w=>{w.paused=false;advanceTicks(w,1);w.paused=true;return w;});await f.mount();f.root.querySelector('[data-game-panel="family"]').click();f.root.querySelector('[data-game-details="family-text"]').open=true;const other=f.root.querySelector('[data-game-details="family-text"] [data-family-focus="b2"]');other.focus();other.click();assert.equal(f.window.document.activeElement.dataset.familyFocus,'b2');assert(f.window.document.activeElement.classList.contains('is-focus'));});
