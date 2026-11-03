import { test, expect } from '@playwright/test';
import legacyV1 from '../fixtures/v1-world.json' with { type: 'json' };
import { createWorld, advanceTicks, adoptBird, validateWorld, MAX_SAVE_BYTES } from '../../src/engine.js';

const DB = 'buncho-ureshi-garden-v1';
const now = Date.UTC(2026, 10, 2, 12);
function fixture() {
  const world = createWorld(now, 5402);
  advanceTicks(world, 1);
  adoptBird(world, 'b2', 'こめ');
  world.paused = true;
  world.lastUpdated = now;
  world.settings.careSound = false;
  world.settings.motion = false;
  world.birds[0].needs.food = 40;
  world.care.cleanliness = 15;
  return validateWorld(world);
}
// Only fixture setup and assertions inspect this app's own save. All imports,
// exports, care, naming, menu navigation and cancellations use the visible UI.
async function record(page, value) {
  return page.evaluate(({ name, value }) => new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('world');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('world', value ? 'readwrite' : 'readonly');
      const op = value ? tx.objectStore('world').put(value, 'current') : tx.objectStore('world').get('current');
      tx.oncomplete = () => { db.close(); resolve(value || op.result); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  }), { name: DB, value });
}
async function ready(page, world = fixture()) {
  await page.goto('');
  await page.evaluate(() => {
    localStorage.setItem('buncho.music.v1', JSON.stringify({ enabled: false }));
    localStorage.setItem('buncho.care-sound-choice.v1', JSON.stringify({ explicit: true, enabled: false }));
  });
  await record(page, world);
  await page.goto('game/');
  await expect(page.locator('body')).toHaveAttribute('data-game-intro', 'done');
  await controls(page);
}
async function controls(page) {
  const toggle = page.locator('.game-scene-controls-toggle');
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
  await expect(page.locator('#game-nav-open')).toBeVisible();
}
async function closePanel(page) {
  if (await page.locator('.game-bird-sheet').isVisible()) await page.locator('[data-game-close-bird]').click();
  if (await page.locator('.game-panel-overlay').isVisible()) await page.locator('[data-game-close-panel]').click();
}
async function settings(page) {
  await closePanel(page);
  await controls(page);
  await page.locator('#game-nav-open').click();
  await page.locator('#game-menu-settings').click();
  await expect(page.locator('.game-settings')).toBeVisible();
  await management(page);
}
async function management(page) {
  const details = page.locator('[data-game-details="management"]');
  if (!await details.evaluate(el => el.open)) await details.locator(':scope > summary').click();
  await expect(page.locator('[data-game-action="export"]')).toBeVisible();
}
async function saveDownload(page) {
  await management(page);
  const pending = page.waitForEvent('download');
  await page.locator('[data-game-action="export"]').click();
  const download = await pending, stream = await download.createReadStream();
  expect(download.suggestedFilename()).toMatch(/^buncho-garden-.*\.json$/);
  expect(stream).not.toBeNull();
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}
function file(value, name = 'garden.json') {
  return { name, mimeType: 'application/json', buffer: Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)) };
}
async function importSave(page, value, accept = true) {
  await management(page);
  const handled = new Promise(resolve => page.once('dialog', async dialog => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toContain('今の庭と入れ替えますか');
    await (accept ? dialog.accept() : dialog.dismiss());
    resolve();
  }));
  await page.locator('#game-import').setInputFiles(file(value));
  await handled;
  if (accept) await expect(page.locator('.game-message')).toContainText('復元しました');
  await expect(page.locator('#game-import')).toHaveValue('');
}
function expectReplacement(saved, source, current) {
  expect(saved.worldId).toMatch(/^garden-import-/);
  expect(saved.worldId).not.toBe(source.worldId);
  expect(saved.worldId).not.toBe(current.worldId);
  // A new identity rejects stale tab edits. The snapshot itself is retained,
  // while sound/motion remain the current device's explicit preferences.
  expect(saved).toEqual({ ...source, worldId: saved.worldId,
    settings: { ...source.settings, motion: current.settings.motion, careSound: current.settings.careSound } });
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(time => {
    Date.now = () => time;
    window.__saveAudioStarts = 0;
    const Native = window.AudioContext || window.webkitAudioContext;
    if (Native) Object.defineProperty(window, 'AudioContext', { configurable: true, value: new Proxy(Native, {
      construct(Target, args) {
        const context = Reflect.construct(Target, args), create = context.createOscillator.bind(context);
        context.createOscillator = () => {
          const oscillator = create(), start = oscillator.start.bind(oscillator);
          oscillator.start = (...args) => { window.__saveAudioStarts++; return start(...args); };
          return oscillator;
        };
        return context;
      },
    }) });
  }, now);
  await page.route(/youtube|youtu\.be|googlevideo|ytimg/i, route => route.abort());
});

for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
  test(`save round trip, exact cancellation and silent restored care ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await ready(page);
    await page.locator('#game-open-bird').click();
    await page.locator('[data-game-care="feed"]').click();
    await expect(page.locator('[data-game-fullness]')).toHaveText('60 / 100');
    await settings(page);
    const exported = validateWorld(JSON.parse(await saveDownload(page)));
    expect(exported).toEqual(await record(page));
    expect(exported.birds[0].needs.food).toBe(60);
    expect(exported.care.cleanliness).toBe(15);
    await closePanel(page);
    await page.locator('#game-open-bird').click();
    await page.locator('.game-sheet-footer [data-game-panel="profile"]').click();
    await page.locator('#game-name').fill('あとから変えた名前');
    await page.locator('[data-game-form="rename"] button[type="submit"]').click();
    await expect.poll(async () => (await record(page)).birds[0].name).toBe('あとから変えた名前');
    await settings(page);
    const before = await record(page);
    const imported = structuredClone(exported);
    imported.settings.careSound = true;
    imported.settings.motion = true;
    imported.birds[0].needs.food = 73;
    imported.care.cleanliness = 44;
    await importSave(page, imported, false);
    expect(await record(page)).toEqual(before);
    await importSave(page, imported);
    const saved = await record(page);
    expectReplacement(saved, imported, before);
    expect(await page.evaluate(() => window.__saveAudioStarts)).toBe(0);
    await closePanel(page);
    await page.locator('#game-open-bird').click();
    await expect(page.locator('[data-game-fullness]')).toHaveText('73 / 100');
    await expect(page.locator('[data-game-cleanliness-value]')).toHaveText('44 / 100');
    await page.reload();
    await expect(page.locator('body')).toHaveAttribute('data-game-intro', 'done');
    expect(await record(page)).toEqual(saved);
    await settings(page);
    await expect(page.locator('[data-game-care-sound]')).not.toBeChecked();
    expect(JSON.parse(await saveDownload(page))).toEqual(saved);
    expect(await page.evaluate(() => window.__saveAudioStarts)).toBe(0);
  });
}

test('malformed, invalid-family, future-version and oversized files preserve the complete save', async ({ page }) => {
  await ready(page);
  await settings(page);
  const before = await record(page), invalid = structuredClone(before), future = structuredClone(before);
  invalid.birds[0].parents = ['b1', 'b2'];
  future.version = 999;
  let dialogs = 0;
  page.on('dialog', async dialog => { dialogs++; await dialog.dismiss(); });
  for (const value of ['{not JSON', JSON.stringify(invalid), JSON.stringify(future), ' '.repeat(MAX_SAVE_BYTES + 1)]) {
    await management(page);
    await page.locator('#game-import').setInputFiles(file(value));
    await expect(page.locator('.game-message')).toContainText('今の保存はそのまま');
    await expect(page.locator('#game-import')).toHaveValue('');
    expect(await record(page)).toEqual(before);
  }
  expect(dialogs).toBe(0);
  expect(JSON.parse(await saveDownload(page))).toEqual(before);
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-game-intro', 'done');
  expect(await record(page)).toEqual(before);
});

test('the same save can be reselected after cancellation and restored twice without replaying rewards', async ({ page }) => {
  await ready(page);
  await settings(page);
  const original = await record(page);
  await importSave(page, original, false);
  expect(await record(page)).toEqual(original);
  await importSave(page, original);
  const first = await record(page);
  expectReplacement(first, original, original);
  await importSave(page, original);
  const second = await record(page);
  expectReplacement(second, original, first);
  await importSave(page, original, false);
  expect(await record(page)).toEqual(second);
  expect(JSON.parse(await saveDownload(page))).toEqual(second);
});

test('v2 migration retains family, diary and care, then exports a usable v7 snapshot', async ({ page }) => {
  const old = fixture();
  old.birds[0].name = '大切なおもち';
  old.version = 2;
  for (const key of ['encounters', 'economy', 'adoption', 'field', 'decor', 'gems', 'careSchedule']) delete old[key];
  delete old.settings.adoptionMode;
  for (const bird of old.birds) { delete bird.gemCare; delete bird.naming; }
  await ready(page);
  await settings(page);
  const before = await record(page);
  await importSave(page, old, false);
  expect(await record(page)).toEqual(before);
  await importSave(page, old);
  const saved = validateWorld(await record(page));
  expect(saved.version).toBe(7);
  expect(saved.worldId).not.toBe(old.worldId);
  expect(saved.birds.map(({ gemCare, naming, ...bird }) => bird)).toEqual(old.birds);
  expect(saved.events).toEqual(old.events);
  expect(saved.care).toEqual(old.care);
  expect(saved.decor.points).toBe(20);
  expect(JSON.parse(await saveDownload(page))).toEqual(saved);
});

test('v1 import preserves the original birds and diary without sound autoplay', async ({ page }) => {
  await ready(page);
  await settings(page);
  await importSave(page, legacyV1);
  const saved = validateWorld(await record(page));
  expect(saved.version).toBe(7);
  expect(saved.birds.map(({ care, gemCare, naming, ...bird }) => bird)).toEqual(legacyV1.birds);
  expect(saved.events).toEqual(legacyV1.events);
  expect(saved.settings.careSound).toBe(false);
  expect(saved.care.cleanliness).toBe(100);
  expect(await page.evaluate(() => window.__saveAudioStarts)).toBe(0);
  expect(JSON.parse(await saveDownload(page))).toEqual(saved);
});

test('leaving the game while a file is being read cannot confirm or replace the saved world', async ({ page }) => {
  await ready(page);
  await settings(page);
  const before = await record(page);
  await page.evaluate(() => {
    const read = File.prototype.text;
    File.prototype.text = function () {
      const file = this;
      return new Promise(resolve => { window.__releaseSaveRead = async () => resolve(await read.call(file)); });
    };
  });
  let dialogs = 0;
  page.on('dialog', async dialog => { dialogs++; await dialog.dismiss(); });
  await page.locator('#game-import').setInputFiles(file(fixture()));
  await expect.poll(() => page.evaluate(() => typeof window.__releaseSaveRead)).toBe('function');
  await page.locator('[data-game-close-panel]').click();
  await page.locator('.game-world-exit').click();
  await expect(page.locator('#article-grid')).toBeVisible();
  await page.evaluate(() => window.__releaseSaveRead());
  expect(dialogs).toBe(0);
  expect(await record(page)).toEqual(before);
  await page.goto('game/');
  await expect(page.locator('body')).toHaveAttribute('data-game-intro', 'done');
  expect(await record(page)).toEqual(before);
});
