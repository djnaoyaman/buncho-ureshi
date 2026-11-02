import { test, expect } from '@playwright/test';
import { createWorld, createBird, advanceTicks, advanceTo, validateWorld, TICK_MS, LIMITS } from '../../src/engine.js';

const DB_NAME = 'buncho-ureshi-garden-v1';
const fixedNow = Date.UTC(2026, 10, 2, 12, 0, 0);

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
}

async function tab(page, name) {
  await page.locator(`[data-game-panel="${name}"]`).first().click();
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
  await expect(page.locator('.game-profile-heading h3')).toHaveText('おもち');
  await expect(page.locator('.game-profile-heading')).toContainText('メス / 白文鳥 / 成鳥');
  let world = await readWorld(page);
  expect(world.birds).toHaveLength(1);
  expect(world.birds[0]).toMatchObject({ id: 'b1', name: 'おもち', sex: 'female', color: 'white' });
  await seedWorld(page, world, fixedNow - TICK_MS);
  await openGame(page);
  await page.locator('.game-visitor-box [data-game-select="b2"]').click();
  await expect(page.locator('.game-profile-heading')).toContainText('オス');
  await page.locator('#game-name').fill('こめ');
  await page.locator('[data-game-action="adopt"]').click();
  await expect(page.locator('.game-profile-heading h3')).toHaveText('こめ');
  await expect.poll(async () => (await readWorld(page)).birds.find(b => b.id === 'b2').home).toBe('resident');
  world = validateWorld(await readWorld(page));
  expect(world.birds.find(b => b.id === 'b2')).toMatchObject({ name: 'こめ', sex: 'male', parents: [] });
  await page.reload();
  await expect(page.locator('#game-root .game-app')).toBeVisible();
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
  await expect(page.locator('.game-family-card')).toHaveCount(world.birds.length);
  await expect(page.locator('.game-family-tree')).toContainText('親 → 子');
  await tab(page, 'roster');
  await expect(page.locator('.game-roster [data-game-select]')).toHaveCount(world.birds.length);
  await tab(page, 'diary');
  await expect(page.locator('.game-diary li')).toHaveCount(world.events.length);
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
  await expect(page.locator('.game-profile-heading h3')).toHaveText('しらたま');
  await tab(page, 'diary');
  await expect(page.locator('.game-diary')).toContainText('しらたま');
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
  await tab(page, 'profile');
  await page.evaluate(() => {
    const play = document.querySelector('[data-game-talk="あそぼう"]');
    play.click();
    play.click();
    document.querySelector('[data-game-panel="roster"]').click();
    document.querySelector('.game-roster [data-game-select="b2"]').click();
    document.querySelector('[data-game-talk="おやすみ"]').click();
  });
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
  expect(exported.version).toBe(1);
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
  const resumed = validateWorld(await readWorld(page));
  expect(resumed.paused).toBe(false);
  expect(resumed.tick).toBe(paused.tick);
  expect(resumed.lastUpdated).toBe(fixedNow);
});

test('family card hands real game names and family composition into the art studio', async ({ page }) => {
  const seeded = createWorld(fixedNow);
  advanceTicks(seeded, 300);
  const child = seeded.birds.find(b => b.parents.length === 2);
  expect(child).toBeTruthy();
  child.name = 'わかばの記念';
  await seedWorld(page, seeded);
  await openGame(page);
  await tab(page, 'family');
  await page.locator(`[data-game-art="${child.id}"]`).click();
  await expect(page).toHaveURL(/\/buncho-ureshi\/studio\/$/);
  await expect(page.locator('[data-studio="canvas"]')).toBeVisible();
  await expect(page.locator('[data-studio="title"]')).toHaveValue('わかばの記念の家族');
  const layers = page.locator('[data-studio="layers"]');
  await expect(layers).toContainText('わかばの記念');
  for (const id of child.parents) await expect(layers).toContainText(seeded.birds.find(b => b.id === id).name);
  await page.goBack();
  await expect(page.locator('#game-root .game-app')).toBeVisible();
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
  await page.goto('');
  for (let i = 0; i < 4; i++) {
    // Both native navigation links are activated in the same task, before the IDB open resolves.
    await page.evaluate(() => {
      document.querySelector('.desktop-nav [data-nav="game/"]').click();
      document.querySelector('.desktop-nav [data-nav="encyclopedia/"]').click();
    });
    await expect(page.locator('#game-root')).toHaveCount(0);
    await expect.poll(async () => page.evaluate(() => [...window.__gameTestIntervals.values()].filter(delay => delay === 3000).length)).toBe(0);
  }
  await page.goBack();
  await expect(page.locator('#game-root .game-app')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => [...window.__gameTestIntervals.values()].filter(delay => delay === 3000).length)).toBe(1);
  await page.locator('.desktop-nav [data-nav="encyclopedia/"]').click();
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

// Collision absence alone is not a visual-quality pass. The rejected layout had a
// 920px one-bird room and preserveAspectRatio=none, yet its text did not collide.
// Gate initial composition, scenery proportions, anatomy size and crowded access.
for (const residents of [1, 10]) test(`${residents === 1 ? 'initial one-bird' : 'populated ten-bird'} garden has bounded composition, proportional scenery and readable residents`, async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const seeded = gardenVisualFixture(residents);
  await seedWorld(page, seeded);
  await openGame(page);
  await expect(page.locator('.game-room-bird')).toHaveCount(residents);
  await expect(page.locator('.game-room-bird .game-bubble')).toHaveCount(residents === 1 ? 0 : residents);
  for (const width of [320, 375, 390, 768, 1440]) for (const orientation of ['portrait', 'landscape']) {
    const height = orientation === 'portrait' ? Math.max(800, Math.round(width * 1.25)) : Math.max(240, Math.round(width * .65));
    await page.setViewportSize({ width, height });
    await expect.poll(() => page.evaluate(({ residents, viewportWidth }) => {
      const roomElement = document.querySelector('.game-room');
      const room = roomElement.getBoundingClientRect();
      const errors = [];
      const maxHeight = residents === 1 ? (viewportWidth <= 480 ? 420 : 520) : (viewportWidth <= 768 ? 720 : 650);
      if (room.height < 280 || room.height > maxHeight + 1) errors.push(`room height ${room.height} outside 280–${maxHeight}px`);
      const visible = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
      const inside = r => r.left >= room.left - 1 && r.right <= room.right + 1 && r.top >= room.top - 1 && r.bottom <= room.bottom + 1;
      const birds = [...roomElement.querySelectorAll('.game-room-bird')];
      const parts = birds.flatMap(bird => [...bird.querySelectorAll('.game-bird-label, .game-bubble, :scope > small')].map(el => ({
        bird: bird.dataset.gameSelect, kind: el.className || 'action', rect: el.getBoundingClientRect(),
        clipped: el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1,
        font: parseFloat(getComputedStyle(el).fontSize), visible: visible(el)
      })));
      for (const bird of birds) {
        const r = bird.getBoundingClientRect(), svg = bird.querySelector('svg'), drawn = svg?.getBoundingClientRect();
        if (!visible(bird) || r.width < 44 || r.height < 44) errors.push(`${bird.dataset.gameSelect} touch target below 44px or hidden`);
        if (!inside(r)) errors.push(`${bird.dataset.gameSelect} button outside room`);
        if (!drawn || drawn.width < (residents === 1 ? 64 : 48) || drawn.height < 40 || !inside(drawn)) errors.push(`${bird.dataset.gameSelect} illustration is too small or clipped`);
      }
      for (const part of parts) {
        if (!part.visible || part.clipped || !inside(part.rect)) errors.push(`${part.bird} ${part.kind} hidden or clipped`);
        if (part.font < (part.kind === 'game-bird-label' ? 11 : 10)) errors.push(`${part.bird} ${part.kind} text is too small`);
      }
      const visibleParts = [...parts, ...birds.map(bird => ({ bird: bird.dataset.gameSelect, kind: 'illustration', rect: bird.querySelector('svg').getBoundingClientRect() }))];
      for (let i = 0; i < visibleParts.length; i++) for (let j = i + 1; j < visibleParts.length; j++) {
        const a = visibleParts[i], b = visibleParts[j];
        if (a.bird === b.bird) continue;
        const x = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left);
        const y = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top);
        if (x > 1 && y > 1) errors.push(`${a.bird} ${a.kind} overlaps ${b.bird} ${b.kind}`);
      }
      for (const svg of roomElement.querySelectorAll('svg')) {
        if (svg.getAttribute('preserveAspectRatio')?.trim() === 'none') errors.push('SVG explicitly disables proportional scaling');
        if (!visible(svg)) continue;
        const m = svg.getScreenCTM();
        if (!m) { errors.push('visible SVG has no screen transform'); continue; }
        const x = Math.hypot(m.a, m.b), y = Math.hypot(m.c, m.d);
        if (!x || !y || Math.max(x, y) / Math.min(x, y) > 1.01) errors.push('SVG is stretched non-uniformly');
      }
      const props = [...roomElement.querySelectorAll('[data-game-prop]')];
      if (props.map(p => p.dataset.gameProp).sort().join() !== 'bath,food,nest') errors.push('three separately sized habitat props must be present');
      for (const prop of props) {
        if (!visible(prop) || !inside(prop.getBoundingClientRect())) errors.push(`${prop.dataset.gameProp} prop is hidden or clipped`);
      }
      if (document.documentElement.scrollWidth > innerWidth + 1) errors.push('document overflow');
      return errors;
    }, { residents, viewportWidth: width }), { message: `${residents} birds, ${width}px ${orientation}: bounded composition, proportions and text must remain readable` }).toEqual([]);
    await expect(page.locator('.game-bird-label')).toHaveText(seeded.birds.map(bird => bird.name));
    if (testInfo.project.name === 'chromium') await testInfo.attach(`game-${residents === 1 ? 'initial' : 'ten-full-names'}-${width}-${orientation}`, { body: await page.locator('.game-room').screenshot({ animations: 'disabled' }), contentType: 'image/png' });
  }
  // Each resident remains a real reachable selection target, not just decoration.
  for (const bird of seeded.birds) {
    await tab(page, 'garden');
    await page.locator(`.game-room-bird[data-game-select="${bird.id}"]`).click();
    await expect(page.locator('.game-profile-heading h3')).toHaveText(bird.name);
  }
});
