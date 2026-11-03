import { test, expect } from '@playwright/test';
import { fieldPositions } from '../../src/field-visuals.js';
import { GAME_SPRITE_ASSETS, gameSpriteGeometry } from '../../src/game.js';
import { POSE_ATLASES } from '../../src/bird-poses.js';
const ALL_SPRITE_ASSETS={...GAME_SPRITE_ASSETS,...Object.fromEntries(Object.values(POSE_ATLASES).map(a=>[a.asset.replace(/\.webp$/,''),a]))};
import { createWorld, createBird, advanceTicks, advanceTo, validateWorld, TICK_MS, LIMITS } from '../../src/engine.js';

const DB_NAME = 'buncho-ureshi-garden-v1';
const fixedNow = Date.UTC(2026, 10, 2, 12, 0, 0);
async function decodeScene(page) {
  // A resize can change <picture>.currentSrc while a prior decode is pending;
  // a world refresh can also detach the room. Retry only those superseded reads.
  await page.evaluate(async()=>{
    const frame=()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));
    const deadline=performance.now()+10000;
    while(performance.now()<deadline){
      await frame();const room=document.querySelector('.game-room');if(!room?.isConnected)continue;
      const images=[...room.querySelectorAll('img')],sources=images.map(i=>i.currentSrc||i.src);
      const intended=img=>{const picture=img.closest('picture');const source=picture&&[...picture.querySelectorAll('source')].find(s=>!s.media||matchMedia(s.media).matches);return source?new URL(source.srcset.trim().split(/\s+/)[0],document.baseURI).href:img.src;};
      // This scene has one URL per source; wait for the currently selected
      // responsive candidate, not a still-decoded previous-width candidate.
      if(images.some((i,n)=>sources[n]!==intended(i)))continue;
      const results=await Promise.allSettled(images.map(i=>i.decode()));await frame();
      const current=[...room.querySelectorAll('img')];
      const superseded=!room.isConnected||document.querySelector('.game-room')!==room||current.length!==images.length||images.some((i,n)=>!i.isConnected||current[n]!==i||(i.currentSrc||i.src)!==sources[n]||intended(i)!==sources[n]);
      if(superseded)continue;
      const failed=results.findIndex(r=>r.status==='rejected');
      if(failed>=0)throw new Error('Stable scene image failed to decode: '+sources[failed]+' — '+String(results[failed].reason));
      if(images.length&&images.every(i=>i.complete&&i.naturalWidth>0&&i.naturalHeight>0))return;
      throw new Error('Stable scene image has no decoded pixels');
    }
    throw new Error('Scene never reached a stable connected, decoded state');
  });
}

// These helpers inspect only this application's own IndexedDB record.
// Game input, naming, menus, downloads, imports and handoffs remain real UI operations.
async function readWorld(page) {
  return page.evaluate(dbName => new Promise((resolve, reject) => {
    const open = indexedDB.open(dbName, 1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result, tx = db.transaction('world', 'readonly');
      const get = tx.objectStore('world').get('current');
      get.onsuccess = () => resolve(get.result);
      get.onerror = () => reject(get.error);
      tx.oncomplete = () => db.close();
    };
  }), DB_NAME);
}

async function seedWorld(page, world, lastUpdated = fixedNow) {
  await page.goto('');
  await page.evaluate(({ dbName, value, lastUpdated }) => new Promise((resolve, reject) => {
    const open = indexedDB.open(dbName, 1);
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains('world')) open.result.createObjectStore('world');
    };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result, tx = db.transaction('world', 'readwrite');
      value.lastUpdated = lastUpdated;
      tx.objectStore('world').put(value, 'current');
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  }), { dbName: DB_NAME, value: world, lastUpdated });
}

async function openGame(page, query = '') {
  await page.goto(`game/${query}`);
  await expect(page.locator('#game-root .game-app')).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
}

async function closeBird(page) { if(await page.locator('.game-bird-sheet').isVisible())await page.locator('[data-game-close-bird]').click(); }
async function openBird(page) { await page.locator('[data-game-open-bird]').click();await expect(page.locator('.game-bird-sheet')).toBeVisible(); }
async function openTalk(page) { await openBird(page);const d=page.locator('[data-game-details="sheet-talk"]');if(!await d.evaluate(e=>e.open))await d.locator('summary').click(); }
async function chooseBird(page,id){
  const face=page.locator('.game-bird-carousel-face');
  for(let i=0;i<128;i++){
    if(await face.getAttribute('data-bird-id')===id)return;
    await page.locator('.game-bird-carousel [data-bird-step="1"]').click();
  }
  throw new Error(`Bird ${id} was not reachable through the visible carousel`);
}

async function tab(page, name) {
  await closeBird(page);
  const target=page.locator(`[data-game-panel="${name}"]`).first();if(!await target.isVisible())await page.locator('.game-secondary-menu summary').click();await target.click();
}

async function readDownload(download) {
  const stream = await download.createReadStream();
  if (!stream) throw new Error('The save download did not provide a readable stream.');
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

// Keep time deterministic while allowing timers and IndexedDB transactions to run normally.
// No browser clock, authentication, network, or outside state is inspected.
test.beforeEach(async ({ context, page }) => {
  await context.addInitScript(now => { Date.now = () => now; }, fixedNow);
  await page.route(/youtube|youtu\.be|googlevideo|ytimg/i, route => route.abort());
});

test('game starts with Omochi, then names and welcomes the unrelated male visitor', async ({ page }) => {
  await openGame(page);
  await tab(page,'profile');
  await expect(page.locator('.game-profile-heading h3')).toHaveText('おもち');
  await expect(page.locator('.game-profile-heading')).toContainText('メス · 白文鳥 · 成鳥');
  let world = await readWorld(page);
  expect(world.birds).toHaveLength(1);
  expect(world.birds[0]).toMatchObject({ id: 'b1', name: 'おもち', sex: 'female', color: 'white' });
  await seedWorld(page, world, fixedNow - TICK_MS);
  await openGame(page);
  await page.locator('[data-game-scene-select][data-bird-id="b2"]').click();
  await page.locator('.game-bird-sheet [data-game-panel="profile"]').click();
  await expect(page.locator('.game-profile-heading')).toContainText('オス');
  await page.locator('#game-name').fill('こめ');
  await page.locator('[data-game-action="adopt"]').click();
  await expect(page.locator('.game-profile-heading h3')).toHaveText('こめ');
  await expect.poll(async () => (await readWorld(page)).birds.find(b => b.id === 'b2').home).toBe('resident');
  world = validateWorld(await readWorld(page));
  expect(world.birds.find(b => b.id === 'b2')).toMatchObject({ name: 'こめ', sex: 'male', parents: [] });
  await page.reload();
  await expect(page.locator('#game-root .game-app')).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
  await tab(page, 'roster');
  await expect(page.locator('.game-roster [data-game-select="b2"]')).toContainText('こめ');
});

test('verification control produces autonomous generations, bounded roster, and a family tree', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await openGame(page, '?qa=1');
  await tab(page, 'settings');
  await page.locator('summary').filter({ hasText: '検証用' }).click();
  // Only the explicitly gated QA UI advances time. Each step still runs the actual engine.
  for (let i = 0; i < 10; i++) {
    await page.locator('[data-game-action="qa-step"]').click();
    await expect.poll(async () => (await readWorld(page)).tick).toBe((i + 1) * 1000);
    if (i < 9) {
      const qaSummary = page.locator('summary').filter({ hasText: '検証用' });
      if (!(await qaSummary.evaluate(el => el.parentElement.open))) await qaSummary.click();
    }
  }
  const world = validateWorld(await readWorld(page));
  expect(world.birds.length).toBe(LIMITS.birds);
  expect(Math.max(...world.birds.map(b => b.generation))).toBeGreaterThanOrEqual(3);
  expect(world.birds.filter(b => b.home === 'resident').length).toBeLessThanOrEqual(LIMITS.residents);
  expect(world.birds.filter(b => b.home === 'visitor').length).toBeLessThanOrEqual(LIMITS.visitors);
  expect(world.events.length).toBeLessThanOrEqual(LIMITS.events);
  await tab(page, 'family');
  await expect(page.locator('.game-family-node.is-focus')).toHaveCount(1);
  await expect(page.locator('.game-family-legend')).toContainText('親子');
  await page.locator('[data-game-details="family-text"] > summary').click();
  await expect(page.locator('[data-game-details="family-text"] li')).toHaveCount(world.birds.length);
  for(const b of world.birds)await expect(page.locator(`[data-game-details="family-text"] [data-family-focus="${b.id}"]`)).toHaveText(b.name);
  await tab(page, 'roster');
  await expect(page.locator('.game-roster [data-game-select]')).toHaveCount(world.birds.length);
  await tab(page, 'diary');
  await page.locator('.game-full-diary > summary').click();await expect(page.locator('.game-full-diary .game-diary li')).toHaveCount(world.events.length);
  if (testInfo.project.name === 'chromium') {
    await tab(page, 'garden');
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await testInfo.attach(`game-populated-${width}`, { body: await page.locator('#game-root').screenshot({ animations: 'disabled' }), contentType: 'image/png' });
    }
  }
  await page.goto('game/');
  await tab(page, 'settings');
  await expect(page.locator('[data-game-action="qa-step"]')).toHaveCount(0);
});

test('rename persists and conversations use needs, personality and memory', async ({ page }) => {
  const seeded = createWorld(fixedNow);
  advanceTicks(seeded, 10);
  seeded.birds[0].needs.energy = 20;
  seeded.birds[0].mood = 50;
  await seedWorld(page, seeded);
  await openGame(page);
  await tab(page, 'profile');
  await page.locator('#game-name').fill('しらたま');
  await page.locator('[data-game-form="rename"] button[type="submit"]').click();
  await expect(page.locator('.game-profile-heading h3')).toHaveText('しらたま');
  await openTalk(page);
  await page.locator('[data-game-talk="あそぼう"]').click();
  await expect(page.locator('.game-reply')).toContainText('しらたま');
  await expect(page.locator('.game-reply')).toContainText('休みたい');
  await page.locator('[data-game-talk="おやすみ"]').click();
  await expect.poll(async () => (await readWorld(page)).birds[0].action.kind).toBe('rest');
  const afterRest = await readWorld(page);
  expect(afterRest.birds[0].needs.energy).toBe(28);
  expect(afterRest.birds[0].memories.at(-1).kind).toBe('user-rest');
  await page.locator('#game-words').fill('未対応のむずかしい質問');
  await page.locator('[data-game-form="talk"] button').click();
  await expect(page.locator('.game-reply')).toContainText('まだわからない');
  await page.reload();
  await tab(page,'profile');
  await expect(page.locator('.game-profile-heading h3')).toHaveText('しらたま');
  await tab(page, 'diary');
  await page.locator('.game-full-diary > summary').click();await expect(page.locator('.game-full-diary .game-diary')).toContainText('しらたま');
  const restored = validateWorld(await readWorld(page));
  expect(restored.birds[0].id).toBe('b1');
  expect(restored.birds[0].name).toBe('しらたま');
});

test('rapid repeated conversations stay attached to the originally selected bird', async ({ page }) => {
  const seeded = createWorld(fixedNow);
  advanceTicks(seeded, 10);
  seeded.birds[0].mood = 50;
  await seedWorld(page, seeded);
  await openGame(page);
  await openTalk(page);
  // Exercise repeated activation only on the visible control. Subsequent modal
  // dismissal and navigation use real user actions, never hidden/forced clicks.
  await page.locator('[data-game-talk="あそぼう"]').evaluate(play=>{play.click();play.click();});
  await closeBird(page);await tab(page,'roster');
  await page.locator('.game-roster [data-game-select="b2"]').click();
  await openTalk(page);await page.locator('[data-game-talk="おやすみ"]').click();
  await expect.poll(async () => (await readWorld(page)).birds[0].memories.filter(m => m.kind === 'user-play').length).toBe(2);
  await expect.poll(async () => (await readWorld(page)).birds.find(b => b.id === 'b2').memories.at(-1).kind).toBe('user-rest');
  const world = validateWorld(await readWorld(page));
  expect(world.birds[0].memories.at(-1).kind).toBe('user-play');
  expect(world.birds.find(b => b.id === 'b2').action.kind).toBe('rest');
});

test('save download imports back exactly; malformed files do not replace the current world', async ({ page }) => {
  const seeded = createWorld(fixedNow);
  advanceTicks(seeded, 300);
  await seedWorld(page, seeded);
  await openGame(page);
  await tab(page, 'settings');
  const downloaded = page.waitForEvent('download');
  await page.locator('[data-game-action="export"]').click();
  const exportedText = await readDownload(await downloaded);
  const exported = validateWorld(JSON.parse(exportedText));
  expect(exported.tick).toBe(300);
  expect(exported.version).toBe(4);
  await tab(page, 'profile');
  await page.locator('#game-name').fill('あとから変えた名前');
  await page.locator('[data-game-form="rename"] button[type="submit"]').click();
  await expect.poll(async () => (await readWorld(page)).birds[0].name).toBe('あとから変えた名前');
  await tab(page, 'settings');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#game-import').setInputFiles({ name: 'my-garden.json', mimeType: 'application/json', buffer: Buffer.from(exportedText) });
  await expect(page.locator('.game-message')).toContainText('復元しました');
  let restored = validateWorld(await readWorld(page));
  expect(restored.birds).toEqual(exported.birds);
  expect(restored.events).toEqual(exported.events);
  expect(restored.tick).toBe(exported.tick);
  const beforeBad = JSON.stringify(restored);
  await page.locator('#game-import').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{not JSON') });
  await expect(page.locator('.game-message')).toContainText('今の保存はそのまま');
  expect(JSON.stringify(await readWorld(page))).toBe(beforeBad);
  const invalid = structuredClone(exported);
  invalid.birds[0].parents = ['b1', 'b2'];
  await page.locator('#game-import').setInputFiles({ name: 'invalid-family.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(invalid)) });
  await expect(page.locator('.game-message')).toContainText('今の保存はそのまま');
  expect(JSON.stringify(await readWorld(page))).toBe(beforeBad);
  await page.reload();
  restored = validateWorld(await readWorld(page));
  expect(restored.birds[0].name).toBe(exported.birds[0].name);
});

test('simultaneous tabs serialize catch-up, hatch once, and preserve both users edits', async ({ page, context }) => {
  const seeded = createWorld(fixedNow - 1000 * TICK_MS);
  while (!seeded.birds.some(b => b.stage === 'egg') && seeded.tick < 500) advanceTicks(seeded, 1);
  const egg = seeded.birds.find(b => b.stage === 'egg');
  expect(egg).toBeTruthy();
  const behind = 12;
  seeded.lastUpdated = fixedNow - behind * TICK_MS;
  const expected = structuredClone(seeded);
  advanceTo(expected, fixedNow);
  await seedWorld(page, seeded, seeded.lastUpdated);
  const other = await context.newPage();
  await Promise.all([openGame(page), openGame(other)]);
  await expect.poll(async () => (await readWorld(page)).tick).toBe(expected.tick);
  let actual = validateWorld(await readWorld(page));
  expect(actual.birds).toEqual(expected.birds);
  expect(actual.events.filter(e => e.kind === 'hatch' && e.ids[0] === egg.id)).toHaveLength(1);
  await Promise.all([tab(page, 'profile'), tab(other, 'roster')]);
  await other.locator('.game-roster [data-game-select="b2"]').click();
  await page.locator('#game-name').fill('一つ目のタブ');
  await other.locator('#game-name').fill('二つ目のタブ');
  await Promise.all([
    page.locator('[data-game-form="rename"] button[type="submit"]').click(),
    other.locator('[data-game-form="rename"] button[type="submit"]').click()
  ]);
  await expect.poll(async () => (await readWorld(page)).birds.find(b => b.id === 'b1').name).toBe('一つ目のタブ');
  await expect.poll(async () => (await readWorld(other)).birds.find(b => b.id === 'b2').name).toBe('二つ目のタブ');
  actual = validateWorld(await readWorld(page));
  expect(actual.tick).toBe(expected.tick);
  expect(actual.events.filter(e => e.kind === 'hatch' && e.ids[0] === egg.id)).toHaveLength(1);
  expect(actual.revision).toBeGreaterThanOrEqual(expected.revision + 4);
  await other.close();
});

test('a held native submit survives a peer update and the next background poll', async ({ page, context }) => {
  const seeded=createWorld(fixedNow);advanceTicks(seeded,1);seeded.paused=true;
  await seedWorld(page,seeded);const other=await context.newPage();
  await Promise.all([openGame(page),openGame(other)]);
  await Promise.all([tab(page,'profile'),tab(other,'roster')]);
  await other.locator('.game-roster [data-game-select="b2"]').click();
  await page.locator('#game-name').fill('押したままの保存');
  const submit=page.locator('[data-game-form="rename"] button[type="submit"]');
  await submit.scrollIntoViewIfNeeded();
  await submit.evaluate(button=>{window.__heldGameSubmit=button;});
  const box=await submit.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  await other.locator('#game-name').fill('同時に更新した仲間');
  await other.locator('[data-game-form="rename"] button[type="submit"]').click();
  await expect.poll(async()=>(await readWorld(page)).birds.find(b=>b.id==='b2').name).toBe('同時に更新した仲間');
  // Explicitly span the application's 3-second background polling interval
  // while the pointer remains down, not a timing guess for page readiness.
  await page.waitForTimeout(3200);
  expect(await page.evaluate(()=>window.__heldGameSubmit.isConnected)).toBe(true);
  await page.mouse.up();
  await expect.poll(async()=>(await readWorld(page)).birds.find(b=>b.id==='b1').name).toBe('押したままの保存');
  expect((await readWorld(page)).birds.find(b=>b.id==='b2').name).toBe('同時に更新した仲間');
  await submit.focus();
  await tab(other,'roster');await other.locator('.game-roster [data-game-select="b1"]').click();
  await other.locator('#game-name').fill('保存のあとも更新');
  await other.locator('[data-game-form="rename"] button[type="submit"]').click();
  await expect(page.locator('.game-profile-heading h3')).toHaveText('保存のあとも更新');
  await expect(page.locator('#game-name')).toHaveValue('保存のあとも更新');
  await other.close();
});

test('pause survives reload, ignores elapsed absence, and resumes without catch-up', async ({ page }) => {
  await openGame(page);
  await page.locator('.game-status [data-game-action="pause"]').click();
  await expect(page.locator('.game-status')).toContainText('おやすみ中');
  const paused = await readWorld(page);
  expect(paused.paused).toBe(true);
  await seedWorld(page, paused, fixedNow - 100000 * TICK_MS);
  await openGame(page);
  await expect(page.locator('.game-status')).toContainText('おやすみ中');
  expect((await readWorld(page)).tick).toBe(paused.tick);
  await page.locator('.game-status [data-game-action="pause"]').click();
  await expect(page.locator('.game-status')).toContainText('のんびり進行中');
  await page.reload();
  await expect(page.locator('#game-root .game-app')).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
  const resumed = validateWorld(await readWorld(page));
  expect(resumed.paused).toBe(false);
  expect(resumed.tick).toBe(paused.tick);
  expect(resumed.lastUpdated).toBe(fixedNow);
});

test('family card hands real game names and family composition into the art studio', async ({ page },info) => {
  const seeded = createWorld(fixedNow);
  advanceTicks(seeded, 300);
  const child = seeded.birds.find(b => b.parents.length === 2);
  expect(child).toBeTruthy();
  child.name = 'わかばの記念';
  await seedWorld(page, seeded);
  await openGame(page);
  await tab(page, 'family');
  await page.locator('[data-game-details="family-text"] > summary').click();
  await page.locator(`[data-game-details="family-text"] [data-family-focus="${child.id}"]`).click();
  await page.locator('[data-game-details="family-text"] > summary').click();
  await expect(page.locator(`.game-family-node.is-focus[data-family-focus="${child.id}"]`)).toBeVisible();
  for(const id of child.parents)await expect(page.locator(`.game-family-node[data-family-focus="${id}"]`)).toBeVisible();
  expect(await page.locator('.family-edge-blood').count()).toBeGreaterThan(0);
  await page.setViewportSize({width:390,height:900});
  if(info.project.name==='chromium')await info.attach('gem-family-390',{body:await page.locator('.game-family-tree').screenshot({animations:'disabled'}),contentType:'image/png'});
  await page.locator(`[data-game-art="${child.id}"]`).click();
  await expect(page).toHaveURL(/\/buncho-ureshi\/studio\/$/);
  await expect(page.locator('[data-studio="canvas"]')).toBeVisible();
  await expect(page.locator('[data-studio="title"]')).toHaveValue('わかばの記念の家族');
  const layers = page.locator('[data-studio="layers"]');
  await expect(layers).toContainText('わかばの記念');
  for (const id of child.parents) await expect(layers).toContainText(seeded.birds.find(b => b.id === id).name);
  await page.goBack();
  await expect(page.locator('#game-root .game-app')).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
  expect((await readWorld(page)).birds.find(b => b.id === child.id).name).toBe('わかばの記念');
});

test('rapid navigation and Back clean up a pending async game mount without orphan timers', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.__gameTestIntervals = new Map();
    const set = window.setInterval.bind(window), clear = window.clearInterval.bind(window);
    window.setInterval = (fn, delay, ...args) => { const id = set(fn, delay, ...args); window.__gameTestIntervals.set(id, delay); return id; };
    window.clearInterval = id => { window.__gameTestIntervals.delete(id); return clear(id); };
  });
  await page.goto('encyclopedia/');
  for (let i = 0; i < 4; i++) {
    await page.locator('.desktop-nav [data-nav="game/"]').click();
    // Real browser Back immediately abandons the game route, including a mount
    // that may still be awaiting IndexedDB; no hidden background link is forced.
    await page.goBack();
    await expect(page.locator('#game-root')).toHaveCount(0);
    await expect.poll(async () => page.evaluate(() => [...window.__gameTestIntervals.values()].filter(delay => delay === 3000).length)).toBe(0);
  }
  await page.goForward();
  await expect(page.locator('#game-root .game-app')).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
  await expect.poll(async () => page.evaluate(() => [...window.__gameTestIntervals.values()].filter(delay => delay === 3000).length)).toBe(1);
  await page.locator('.game-world-exit').click();
  await expect.poll(async () => page.evaluate(() => [...window.__gameTestIntervals.values()].filter(delay => delay === 3000).length)).toBe(0);
  expect(errors).toEqual([]);
});


function gardenVisualFixture(count) {
  const world = createWorld(fixedNow);
  while (world.birds.length < count) createBird(world, { home: 'resident' });
  if (count > 1) {
    const actionKinds = ['rest', 'eat', 'bath', 'explore', 'talk', 'play', 'nest', 'visit'];
    world.birds.forEach((bird, i) => {
      bird.name = 'あいうえおかきくけこさしすせそ' + i;
      bird.action = { kind: actionKinds[i % actionKinds.length], target: null, startedTick: world.tick };
    });
    for (let i = 0; i < world.birds.length; i += 2) {
      world.events.push({ id: `e${world.nextEvent++}`, kind: 'play', ids: [world.birds[i].id, world.birds[i + 1].id], condition: '表示確認のためのゲーム内交流', result: '双方が一緒に遊んだ', data: {}, tick: world.tick, at: world.epoch + world.tick * TICK_MS });
    }
  }
  return validateWorld(world);
}

// The rejected grid is gone. Pixel review remains separate from these DOM gates:
// decode assets, preserve their native ratio, keep contact planes bounded, and
// ensure every name remains reachable without blanket floating scene labels.
for (const residents of [1, 10]) test(`${residents === 1 ? 'initial one-bird' : 'populated ten-bird'} illustrated cage field is bounded, proportional and accessible`, async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const seeded = gardenVisualFixture(residents);
  await seedWorld(page, seeded);
  await openGame(page);
  await expect(page.locator('.game-room-bird')).toHaveCount(residents);
  await expect(page.locator('.game-scene-caption')).toHaveCount(1);
  await expect(page.locator('#game-scene-resident')).toHaveCount(0);
  for(const b of seeded.birds){await chooseBird(page,b.id);await expect(page.locator('.game-bird-carousel-face')).toContainText(b.name);await expect(page.locator('.game-bird-carousel-face')).toContainText(`${{white:'白文鳥',sakura:'桜文鳥',silver:'シルバー',cinnamon:'シナモン'}[b.color]}・成鳥`);}
  await expect(page.locator('.game-room-bird .game-bubble, .game-room-bird .game-bird-label, .game-room-bird svg')).toHaveCount(0);
  await expect(page.locator('.game-furnishing')).toHaveCount(9);
  for (const width of [320, 375, 390, 768, 1440]) for (const orientation of ['portrait', 'landscape']) {
    const height = orientation === 'portrait' ? Math.max(800, Math.round(width * 1.25)) : Math.max(240, Math.round(width * .65));
    await page.setViewportSize({ width, height });
    await decodeScene(page);
    await expect.poll(() => page.locator('.game-room img').evaluateAll(images=>images.every(img=>img.complete&&img.naturalWidth>0))).toBe(true);
    await expect.poll(() => page.evaluate(({ residents, viewportWidth, expectedPositions, assetGeometry }) => {
      const roomElement=document.querySelector('.game-room'),room=roomElement.getBoundingClientRect(),errors=[];
      const tall=viewportWidth<=600,maxHeight=tall?500:600,ratio=tall?.75:1.6;
      if(room.height<280||room.height>maxHeight+1)errors.push(`room height ${room.height} outside 280–${maxHeight}px`);
      if(Math.abs(room.width/room.height-ratio)>.01)errors.push('habitat aspect ratio changed');
      if(room.width>(tall?375:960)+1)errors.push('scene exceeds width bound');
      const inside=r=>r.left>=room.left-1&&r.right<=room.right+1&&r.top>=room.top-1&&r.bottom<=room.bottom+1;
      const birds=[...roomElement.querySelectorAll('.game-room-bird')],planes=[];
      for(const bird of birds){
        const r=bird.getBoundingClientRect(),sprite=bird.querySelector('.game-sprite'),plane=sprite?.getBoundingClientRect(),img=sprite?.querySelector('img');
        if(bird.tagName!=='BUTTON'||r.width<44||r.height<44)errors.push(`${bird.dataset.birdId} adult target below 44px: ${r.width} × ${r.height}`);
        if(!inside(r)||!plane||!inside(plane))errors.push(`${bird.dataset.birdId} contact plane outside scene`);
        if(plane&&(plane.width<(residents===1?64:44)||Math.abs(plane.width/plane.height-.85)>.01))errors.push(`${bird.dataset.birdId} contact plane too small or stretched: ${plane.width} × ${plane.height}`);
        if(!img?.complete||!img.naturalWidth)errors.push(`${bird.dataset.birdId} image not decoded`);
        else {const drawn=img.getBoundingClientRect();if(Math.abs(drawn.width/drawn.height-img.naturalWidth/img.naturalHeight)>.01)errors.push(`${bird.dataset.birdId} image is stretched`);}
        if(plane){
          const crop=sprite.querySelector('.game-pose-window');if(crop){const v=crop.getBoundingClientRect();if(getComputedStyle(crop).overflow!=='hidden'||v.left<room.left-1||v.right>room.right+1||v.top<room.top-1||v.bottom>room.bottom+1)errors.push(`${bird.dataset.birdId} visible pose window exceeds habitat room`);}
          const expected=expectedPositions[bird.dataset.birdId],foot={x:plane.left+plane.width*.54,y:plane.top+plane.height*.975};
          const anchor={x:room.left+1+(room.width-2)*expected.x,y:room.top+1+(room.height-2)*expected.y};
          if(Math.abs(foot.x-anchor.x)>2||Math.abs(foot.y-anchor.y)>2)errors.push(`${bird.dataset.birdId} feet miss its reviewed habitat anchor`);
          if(img?.naturalWidth){const drawn=img.getBoundingClientRect(),source=assetGeometry[sprite.dataset.asset],sourceFoot=sprite.dataset.pose?source.poses[sprite.dataset.pose].foot:[source.footX,source.footY];
            const imageFoot={x:drawn.left+sourceFoot[0]/source.width*drawn.width,y:drawn.top+sourceFoot[1]/source.height*drawn.height};
            if(Math.abs(imageFoot.x-foot.x)>1||Math.abs(imageFoot.y-foot.y)>1)errors.push(`${bird.dataset.birdId} native image contact is miscalibrated`);
          }
          planes.push({id:bird.dataset.birdId,rect:plane});
        }
      }
      for(let i=0;i<planes.length;i++)for(let j=i+1;j<planes.length;j++){
        const a=planes[i],b=planes[j],x=Math.min(a.rect.right,b.rect.right)-Math.max(a.rect.left,b.rect.left),y=Math.min(a.rect.bottom,b.rect.bottom)-Math.max(a.rect.top,b.rect.top);
        if(x>1&&y>1)errors.push(`${a.id} overlaps ${b.id}`);
      }
      const habitat=roomElement.querySelector('.game-habitat img');
      if(getComputedStyle(habitat).objectFit!=='cover')errors.push('background is not proportional cover');
      if(!habitat.currentSrc.endsWith(tall?'field-home-tall.webp':'field-home-wide.webp'))errors.push('wrong responsive habitat asset');
      if(getComputedStyle(roomElement).display==='grid')errors.push('rejected grid returned');
      if(document.documentElement.scrollWidth>innerWidth+1)errors.push('document overflow');
      return errors;
    },{residents,viewportWidth:width,expectedPositions:Object.fromEntries(fieldPositions(seeded.birds,width<=600?'tall':'wide','home')),assetGeometry:ALL_SPRITE_ASSETS}),{message:`${residents} birds, ${width}px ${orientation}: decoded, bounded, proportional scene`}).toEqual([]);
    if(testInfo.project.name==='chromium'&&[320,375,1440].includes(width)&&orientation==='portrait')await testInfo.attach(`game-field-${residents}-birds-${width}`,{body:await page.locator('.game-room').screenshot({animations:'disabled'}),contentType:'image/png'});
  }
  for(const bird of seeded.birds){
    await page.locator(`.game-room-bird[data-game-select="${bird.id}"]`).click();
    await expect(page.locator('.game-room')).toBeVisible();
    await expect(page.locator('.game-scene-caption strong')).toHaveText(bird.name);
    await expect(page.locator('#game-sheet-title')).toHaveText(bird.name);
    await expect(page.locator('.game-bird-carousel-face')).toHaveAttribute('data-bird-id',bird.id);
    await closeBird(page);
    await expect(page.locator(`.game-room-bird[data-game-select="${bird.id}"]`)).toBeFocused();
  }
});

test('all color stages decode and nest-bound young remain reachable through the full-name carousel',async({page},testInfo)=>{
  const world=createWorld(fixedNow),colors=['white','sakura','cinnamon','silver'];
  while(world.birds.length<10)createBird(world,{home:'resident'});
  world.birds.forEach((b,i)=>{b.color=colors[i%4];b.stage=i<4?'adult':i<8?'juvenile':i===8?'chick':'egg';b.name=`表示確認${i+1}`;});
  world.paused=true;validateWorld(world);
  await seedWorld(page,world);await openGame(page);
  await expect(page.locator('.game-room-bird')).toHaveCount(10);
  await expect(page.locator('.game-room-bird.game-nestling')).toHaveCount(2);
  await expect(page.locator('.game-room-bird.game-nestling button')).toHaveCount(0);
  await expect(page.locator('#game-scene-resident')).toHaveCount(0);await expect(page.locator('.game-bird-carousel .game-bird-switch')).toContainText('/ 10');
  await expect.poll(()=>page.locator('.game-room img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0))).toBe(true);
  const expected=world.birds.map(b=>gameSpriteGeometry(b.color,b.stage).asset);
  expect(await page.locator('.game-room-bird .game-sprite').evaluateAll(nodes=>nodes.map(n=>n.dataset.asset))).toEqual(expected);
  const sources=await page.locator('.game-room-bird img').evaluateAll(nodes=>nodes.map(n=>new URL(n.currentSrc).pathname.split('/').at(-1)));
  expect(sources).toEqual(expected.map(asset=>`${asset}.${asset==='egg'?'svg':'webp'}`));
  const dimensions=await page.locator('.game-room-bird img').evaluateAll(nodes=>nodes.map(n=>[n.naturalWidth,n.naturalHeight]));
  expect(dimensions).toEqual(expected.map(asset=>[ALL_SPRITE_ASSETS[asset].width,ALL_SPRITE_ASSETS[asset].height]));
  for(const b of world.birds){
    await chooseBird(page,b.id);
    await expect(page.locator('.game-scene-caption strong')).toHaveText(b.name);
    await openBird(page);await expect(page.locator('#game-sheet-title')).toHaveText(b.name);
    if(['egg','chick'].includes(b.stage)){await expect(page.locator('[data-game-care="feed"]')).toBeDisabled();await expect(page.locator('[data-game-care="pet"]')).toBeDisabled();}
    await closeBird(page);
  }
  for(const width of [375,1440]){
    await page.setViewportSize({width,height:1000});
    await decodeScene(page);
    await expect.poll(()=>page.locator('.game-habitat img').evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);
    const errors=await page.locator('.game-room').evaluate((roomElement,assets)=>{
      const room=roomElement.getBoundingClientRect(),errors=[],planes=[];
      for(const bird of roomElement.querySelectorAll('.game-room-bird')){
        const sprite=bird.querySelector('.game-sprite'),r=sprite.getBoundingClientRect(),img=sprite.querySelector('img'),drawn=img.getBoundingClientRect(),source=assets[sprite.dataset.asset],sourceFoot=sprite.dataset.pose?source.poses[sprite.dataset.pose].foot:[source.footX,source.footY];
        const crop=sprite.querySelector('.game-pose-window');if(crop){const v=crop.getBoundingClientRect();if(getComputedStyle(crop).overflow!=='hidden'||v.left<room.left-1||v.right>room.right+1||v.top<room.top-1||v.bottom>room.bottom+1)errors.push(`${bird.dataset.birdId} visible stage crop exceeds habitat room`);}
        if(r.left<room.left-1||r.right>room.right+1||r.top<room.top-1||r.bottom>room.bottom+1)errors.push(`${bird.dataset.birdId} out of bounds`);
        if(Math.abs(drawn.width/drawn.height-img.naturalWidth/img.naturalHeight)>.01)errors.push(`${bird.dataset.birdId} stage art stretched`);
        if(Math.abs(drawn.left+sourceFoot[0]/source.width*drawn.width-(r.left+r.width*.54))>1||Math.abs(drawn.top+sourceFoot[1]/source.height*drawn.height-(r.top+r.height*.975))>1)errors.push(`${bird.dataset.birdId} stage contact misaligned`);
        if(bird.classList.contains('game-nestling')&&(!bird.dataset.anchor.startsWith('nest-')||bird.tagName!=='SPAN'))errors.push('nestling leaves nest or becomes inaccessible tiny button');
        planes.push({id:bird.dataset.birdId,r});
      }
      for(let i=0;i<planes.length;i++)for(let j=i+1;j<planes.length;j++){const a=planes[i],b=planes[j];if(Math.min(a.r.right,b.r.right)-Math.max(a.r.left,b.r.left)>1&&Math.min(a.r.bottom,b.r.bottom)-Math.max(a.r.top,b.r.top)>1)errors.push(`${a.id} overlaps ${b.id}`);}
      return errors;
    },ALL_SPRITE_ASSETS);
    expect(errors).toEqual([]);
    if(testInfo.project.name==='chromium')await testInfo.attach(`game-field-mixed-stages-${width}`,{body:await page.locator('.game-room').screenshot({animations:'disabled'}),contentType:'image/png'});
  }
});

test('active social partners meet on nearby real anchors and mobile keeps one readable exchange',async({page},info)=>{
  const world=createWorld(fixedNow,842911);advanceTicks(world,261);world.paused=true;validateWorld(world);
  await seedWorld(page,world);await openGame(page);await chooseBird(page,'b7');
  for(const width of [320,375,1440]){
    await page.setViewportSize({width,height:1000});await decodeScene(page);
    await expect(page.locator('.game-scene-caption .game-bubble')).toBeVisible();
    await expect(page.locator('.game-scene-caption .game-bubble')).toHaveText('いっしょに♪');
    const geometry=await page.locator('.game-room').evaluate(room=>{
      const box=room.getBoundingClientRect(),point=id=>{const r=room.querySelector(`[data-bird-id="${id}"] .game-sprite`).getBoundingClientRect();return{x:r.left+r.width*.54,y:r.top+r.height*.975};},a=point('b7'),b=point('b11'),caption=room.querySelector('.game-scene-caption').getBoundingClientRect();
      return{distance:Math.hypot(a.x-b.x,a.y-b.y)/box.width,captionInside:caption.left>=box.left&&caption.right<=box.right&&caption.bottom<=box.bottom,captionHeight:caption.height};
    });
    expect(geometry.distance).toBeLessThan(.35);expect(geometry.captionInside).toBe(true);expect(geometry.captionHeight).toBeLessThan(60);
    if(info.project.name==='chromium'&&width!==320)await info.attach(`game-field-social-${width}`,{body:await page.locator('.game-room').screenshot({animations:'disabled'}),contentType:'image/png'});
  }
});


test('natural poses vary asynchronously while stable controls, drafts and save state remain untouched',async({page},info)=>{
  const world=gardenVisualFixture(10);world.birds.forEach(b=>{b.color='white';b.action={kind:'rest',target:null,startedTick:world.tick};});world.paused=false;world.settings.motion=true;
  await seedWorld(page,world);await page.setViewportSize({width:375,height:900});await openGame(page);await decodeScene(page);
  const poses=()=>page.locator('.game-room-bird .game-sprite').evaluateAll(nodes=>nodes.map(n=>n.dataset.pose));
  const before=await poses();expect(new Set(before).size).toBeGreaterThanOrEqual(3);await expect(page.locator('.game-room-bird .game-sprite[data-color="white"]')).toHaveCount(10);
  const saveBefore=await readWorld(page);
  await openTalk(page);
  await page.locator('#game-words').fill('まだ書いているところ');
  await page.evaluate(()=>{window.__poseButtons=[...document.querySelectorAll('.game-room-bird')];window.__poseInput=document.querySelector('#game-words');window.__poseImages=[...document.querySelectorAll('.game-room-bird img')];});
  await expect.poll(poses,{timeout:14000,message:'independent quiet holds eventually change genuine anatomical frames'}).not.toEqual(before);
  expect(await page.evaluate(()=>window.__poseButtons.every((node,i)=>node===document.querySelectorAll('.game-room-bird')[i])&&window.__poseImages.every((node,i)=>node===document.querySelectorAll('.game-room-bird img')[i])&&window.__poseInput===document.querySelector('#game-words'))).toBe(true);
  await expect(page.locator('#game-words')).toHaveValue('まだ書いているところ');expect(await readWorld(page)).toEqual(saveBefore);
  const after=await poses();expect(after.some((pose,i)=>pose===before[i])).toBe(true);
  await closeBird(page);
  await info.attach('natural-unsynchronized-poses-375',{body:await page.locator('.game-room').screenshot(),contentType:'image/png'});
  await page.locator('[data-game-action="pause"]').first().click();const paused=await poses();await page.waitForTimeout(1800);expect(await poses()).toEqual(paused);
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-game-action="pause"]').first().click();const reduced=await poses();await page.waitForTimeout(1800);expect(await poses()).toEqual(reduced);
  await page.locator('.game-world-exit').click();await expect(page.locator('#game-root')).toHaveCount(0);await page.waitForTimeout(700);
});

test('real left and right social frames face their partner, and feeding uses the peck frame',async({page},info)=>{
  const world=createWorld(fixedNow);createBird(world,{home:'resident',color:'sakura'});world.birds[0].action={kind:'play',target:world.birds[1].id,startedTick:world.tick};world.birds[1].action={kind:'play',target:world.birds[0].id,startedTick:world.tick};world.paused=true;
  await seedWorld(page,world);await openGame(page);
  for(const width of [320,375,1440]){
    await page.setViewportSize({width,height:1000});await decodeScene(page);
    await expect.poll(()=>page.locator('.game-room-bird').evaluateAll(nodes=>{const pairs=nodes.map(n=>({x:n.getBoundingClientRect().x,pose:n.querySelector('.game-sprite').dataset.pose})).sort((a,b)=>a.x-b.x);return pairs.map(p=>p.pose);})).toEqual(['right','left']);
    if(info.project.name==='chromium')await info.attach(`natural-pair-facing-${width}`,{body:await page.locator('.game-room').screenshot(),contentType:'image/png'});
  }
  world.birds[0].action={kind:'eat',target:null,startedTick:world.tick};world.birds[1].action={kind:'rest',target:null,startedTick:world.tick};world.paused=false;await seedWorld(page,world);await openGame(page);
  await expect.poll(()=>page.locator(`.game-room [data-bird-id="${world.birds[0].id}"] .game-sprite`).getAttribute('data-pose'),{timeout:14000}).toBe('peck');
});

test('a lone juvenile silver feeding sideways remains fully inside the natural habitat',async({page},info)=>{
 const world=createWorld(fixedNow);world.paused=true;Object.assign(world.birds[0],{color:'silver',stage:'juvenile',action:{kind:'eat',target:null,startedTick:world.tick}});
 await seedWorld(page,world);await openGame(page);
 for(const width of [320,375,1440]){await page.setViewportSize({width,height:1000});await decodeScene(page);
  await expect(page.locator('.game-room-bird .game-sprite')).toHaveAttribute('data-pose','right');
  const contained=await page.locator('.game-room').evaluate(room=>{const r=room.getBoundingClientRect(),v=room.querySelector('.game-pose-window').getBoundingClientRect();return v.left>=r.left-1&&v.right<=r.right+1&&v.top>=r.top-1&&v.bottom<=r.bottom+1;});expect(contained).toBe(true);
  if(info.project.name==='chromium')await info.attach(`natural-single-sideways-food-${width}`,{body:await page.locator('.game-room').screenshot(),contentType:'image/png'});
 }
});
