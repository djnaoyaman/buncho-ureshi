import {test, expect} from '@playwright/test';
import {createWorld, validateWorld} from '../../src/engine.js';
import {createEncounterSystem} from '../../src/encounters.js';
import {ENCOUNTER_CATALOG} from '../../src/data/encounter-catalog.js';
import {inviteFixture} from '../fixtures/garden-invitation.js';

const NOW = Date.UTC(2026, 10, 4);
const system = createEncounterSystem(ENCOUNTER_CATALOG);
const entry = system.catalog[0];
const token = world => ({worldId: world.worldId, revision: world.revision});
const thumbnailPattern = /\/game-art\/finches\/[^/]+\.thumb\.webp(?:\?|$)/;
const gardenPattern = /\/game-art\/gardens\/[^/]+\.screen\.webp(?:\?|$)/;
const escaped = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const assetPattern = path => new RegExp(`/${escaped(path)}(?:\\?|$)`);
const screenPath = path => path.replace(/\.(png|webp|jpe?g)$/, '.screen.webp');

function savedWorld() {
  const world = createWorld(NOW);
  world.paused = true;
  world.settings.careSound = false;
  inviteFixture(system, world, entry.id);
  system.open(world, entry.id, token(world));
  for (const step of entry.steps) system.act(world, world.encounters.active.instanceId, step.action, token(world));
  system.leaveGarden(world, token(world));
  return validateWorld(world);
}

// Exercise the real IndexedDB backend, not a mocked localStorage sentinel.
async function record(page, world) {
  return page.evaluate(world => new Promise((resolve, reject) => {
    const open = indexedDB.open('buncho-ureshi-garden-v1', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('world');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const transaction = db.transaction('world', world ? 'readwrite' : 'readonly');
      const store = transaction.objectStore('world');
      const request = world ? store.put(world, 'current') : store.get('current');
      transaction.oncomplete = () => { db.close(); resolve(request.result); };
      transaction.onerror = () => { db.close(); reject(transaction.error); };
    };
  }), world);
}

async function start(page) {
  await page.addInitScript(now => {
    // Keep paused-world heartbeat timestamps stable without freezing browser timers.
    Date.now = () => now;
    localStorage.setItem('buncho.music.v1', JSON.stringify({enabled: false}));
    localStorage.setItem('buncho.care-sound-choice.v1', JSON.stringify({explicit: true, enabled: false}));
  }, NOW);
  await page.goto('');
  const world = savedWorld();
  await record(page, world);
  await page.goto('game/');
  await expect(page.locator('body')).toHaveAttribute('data-game-intro', 'done');
  return world;
}

async function controls(page) {
  const toggle = page.locator('.game-scene-controls-toggle');
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
}

async function notebook(page) {
  await controls(page);
  await page.locator('[data-game-open-menu]').click();
  await page.locator('[data-game-panel="notebook"]').click();
  await expect(page.locator('.finch-catalog')).toBeVisible();
}

async function garden(page) {
  await controls(page);
  await page.locator('.game-field-nav [data-game-panel="outdoors"]').click();
  await expect(page.locator('.finch-garden-stage')).toBeVisible();
}

// A real stalled request is deterministic across Chromium and WebKit. No sleep-based
// speed assumptions, mocked Image implementation, or simulated ready state.
async function holdImages(page, pattern) {
  const requests = [];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route(pattern, async route => {
    requests.push(route.request().url());
    await gate;
    await route.continue();
  });
  return {requests, release};
}

async function screenshot(page, info, name) {
  await info.attach(name, {body: await page.screenshot(), contentType: 'image/png'});
}

async function decodedImages(locator) {
  await expect.poll(() => locator.evaluateAll(images => images.length > 0 && images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
}

test('notebook requests only nearby lightweight cards, then loads more while scrolling', async ({page}, info) => {
  await start(page);
  const requests = [];
  page.on('request', request => {
    if (/\/game-art\/finches\//.test(request.url())) requests.push(request.url());
  });
  const held = await holdImages(page, thumbnailPattern);
  await notebook(page);
  const catalog = page.locator('.finch-catalog');
  const cards = catalog.locator('.finch-card');
  await expect(cards).toHaveCount(system.catalog.length);
  await expect.poll(() => held.requests.length).toBeGreaterThan(0);
  const initialCount = held.requests.length;
  await info.attach('initial-thumbnail-requests', {body: Buffer.from(JSON.stringify({initialRequests: initialCount, totalCards: await cards.count(), urls: held.requests}, null, 2)), contentType: 'application/json'});
  expect(initialCount).toBeLessThan(await cards.count());
  const lastImage = cards.last().locator('img');
  await expect(lastImage).toHaveAttribute('data-media-src', /(?:\.thumb\.webp|\/sakura\.webp)$/);
  expect(await lastImage.getAttribute('src')).toBeFalsy();
  await expect(cards.first().locator('.finch-media')).toHaveAttribute('data-media-state', 'pending');
  const expectedSources = await cards.locator('img').evaluateAll(images => images.map(image => new URL(image.dataset.mediaSrc, document.baseURI).href));
  expect(expectedSources.every(url => /(?:\.thumb\.webp|\/sakura\.webp)$/.test(url))).toBe(true);
  expect(requests.every(url => expectedSources.includes(url))).toBe(true);
  await screenshot(page, info, 'notebook-pending-nearby-cards');

  await catalog.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await expect.poll(() => held.requests.length).toBeGreaterThan(initialCount);
  await expect.poll(() => lastImage.getAttribute('src')).toMatch(/(?:\.thumb\.webp|\/sakura\.webp)$/);
  held.release();
  await expect(cards.last().locator('.finch-media')).toHaveAttribute('data-media-state', 'ready');
  await decodedImages(lastImage);

  const scrolled = await catalog.evaluate(element => element.scrollTop);
  expect(scrolled).toBeGreaterThan(0);
  const oldCatalog = await catalog.elementHandle();
  const retainedImage = await lastImage.elementHandle();
  // Trigger the real store -> polling -> render path, rather than invoking a
  // presentation helper that bypasses controller refresh/DOM replacement.
  await page.evaluate(async () => {
    const resources = performance.getEntriesByType('resource').map(resource => resource.name);
    const {openGameStore} = await import(resources.find(url => /\/src\/game-store\.js(?:\?|$)/.test(url)));
    const {bumpRevision} = await import(resources.find(url => /\/src\/engine\.js(?:\?|$)/.test(url)));
    const store = await openGameStore();
    try {
      const world = await store.transact(world => { bumpRevision(world); return world; });
      const channel = new BroadcastChannel('buncho-garden-updates');
      channel.postMessage({revision: world.revision});
      channel.close();
    } finally { store.close(); }
  });
  await expect.poll(() => oldCatalog.evaluate(element => element.isConnected)).toBe(false);
  await expect.poll(() => catalog.evaluate(element => element.scrollTop)).toBeCloseTo(scrolled, 0);
  expect(await retainedImage.evaluate(element => element.isConnected)).toBe(true);
  await expect(cards.last().locator('.finch-media')).toHaveAttribute('data-media-state', 'ready');
  await screenshot(page, info, 'notebook-last-card-ready');
});

test('slow garden reveals a status and usable navigation until its background is decoded', async ({page}, info) => {
  await start(page);
  const held = await holdImages(page, gardenPattern);
  await garden(page);
  const stage = page.locator('.finch-garden-stage');
  const status = stage.locator('.finch-garden-loading');
  await expect.poll(() => held.requests.length).toBeGreaterThan(0);
  await expect(stage).toHaveAttribute('data-scene-state', 'loading');
  await expect(status).toBeVisible();
  await expect(status).toHaveAttribute('role', 'status');
  await expect(status).toContainText(/Loading|読み込み|準備/i);
  await expect(page.locator('.finch-garden header [data-encounter-back]')).toBeEnabled();
  await expect(page.locator('[data-garden-select="mizukagami"]')).toBeEnabled();
  const before = await stage.boundingBox();
  await screenshot(page, info, 'garden-pending');
  held.release();
  await expect(stage).toHaveAttribute('data-scene-state', 'ready');
  await expect(status).not.toBeVisible();
  await decodedImages(stage.locator('img'));
  const after = await stage.boundingBox();
  expect(after.width).toBeCloseTo(before.width, 0);
  expect(after.height).toBeCloseTo(before.height, 0);
  await expect(stage.locator('.finch-garden-background')).toHaveAttribute('src', /\.screen\.webp$/);
  await screenshot(page, info, 'garden-decoded');
});

test('garden image failure offers a working retry and keeps the back control usable', async ({page}, info) => {
  await start(page);
  let fail = true;
  let attempts = 0;
  await page.route(gardenPattern, async route => {
    attempts++;
    if (fail) await route.abort('failed');
    else await route.continue();
  });
  await garden(page);
  const stage = page.locator('.finch-garden-stage');
  await expect(stage).toHaveAttribute('data-scene-state', 'error');
  const status = stage.locator('.finch-garden-loading');
  await expect(status).toBeVisible();
  await expect(status).toContainText(/読み込|再試行|もう一度/);
  await expect(page.locator('.finch-garden header [data-encounter-back]')).toBeEnabled();
  const before = attempts;
  fail = false;
  await stage.locator('[data-media-retry]').click();
  await expect.poll(() => attempts).toBeGreaterThan(before);
  await expect(stage).toHaveAttribute('data-scene-state', 'ready');
  await decodedImages(stage.locator('img'));
  await screenshot(page, info, 'garden-retried');
  await page.locator('.finch-garden header [data-encounter-back]').click();
  await expect(page.locator('.finch-catalog')).toBeVisible();
});

test('garden remains loading after the background is ready until the visitor image decodes', async ({page}) => {
  await start(page);
  const held = await holdImages(page, assetPattern(screenPath(entry.art.src)));
  await garden(page);
  const stage = page.locator('.finch-garden-stage');
  await expect.poll(() => held.requests.length).toBeGreaterThan(0);
  await decodedImages(stage.locator('.finch-garden-background'));
  await expect(stage.locator('.finch-garden-visitor')).toHaveCount(1);
  await expect(stage).toHaveAttribute('data-scene-state', 'loading');
  await expect(stage.locator('.finch-garden-loading')).toBeVisible();
  held.release();
  await expect(stage).toHaveAttribute('data-scene-state', 'ready');
  await decodedImages(stage.locator('img'));
});

test('stale garden completion cannot dismiss the newer garden loading state', async ({page}, info) => {
  await start(page);
  const first = await holdImages(page, /\/game-art\/gardens\/komorebi\.screen\.webp(?:\?|$)/);
  const second = await holdImages(page, /\/game-art\/gardens\/mizukagami\.screen\.webp(?:\?|$)/);
  await garden(page);
  await expect.poll(() => first.requests.length).toBeGreaterThan(0);
  const oldStage = await page.locator('.finch-garden-stage').elementHandle();
  await page.locator('[data-garden-select="mizukagami"]').click();
  const stage = page.locator('.finch-garden-stage[data-garden-id="mizukagami"]');
  await expect.poll(() => second.requests.length).toBeGreaterThan(0);
  await expect(stage).toHaveAttribute('data-scene-state', 'loading');
  first.release();
  // Observe the old resource settling before checking that it did not affect the new view.
  await expect.poll(() => page.evaluate(() => performance.getEntriesByType('resource').some(resource => /\/gardens\/komorebi\.screen\.webp(?:\?|$)/.test(resource.name)))).toBe(true);
  expect(await oldStage.evaluate(element => element.isConnected)).toBe(false);
  await expect(stage).toHaveAttribute('data-scene-state', 'loading');
  await expect(stage.locator('.finch-garden-loading')).toBeVisible();
  second.release();
  await expect(stage).toHaveAttribute('data-scene-state', 'ready');
  await expect(page.locator('[data-garden-select="mizukagami"]')).toHaveAttribute('aria-current', 'page');
  await screenshot(page, info, 'new-garden-after-stale-completion');
});

test('back and close stay usable while garden requests are stalled', async ({page}) => {
  await start(page);
  const held = await holdImages(page, gardenPattern);
  await garden(page);
  await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state', 'loading');
  await page.locator('.finch-garden header [data-encounter-back]').click();
  await expect(page.locator('.finch-catalog')).toBeVisible();
  await page.locator('[data-game-close-panel]').click();
  await expect(page.locator('.game-panel-overlay')).not.toBeVisible();
  held.release();
  await expect(page.locator('.game-room')).toBeVisible();
  await expect(page.locator('.finch-garden-loading')).toHaveCount(0);
  await notebook(page);
  await expect(page.locator('.finch-catalog')).toBeVisible();
});

test('portrait and original photo loading, failure, retry and reopening leave the real save unchanged', async ({page}, info) => {
  const original = await start(page);
  const portrait = await holdImages(page, assetPattern(screenPath(entry.art.src)));
  let photoFails = true;
  let photoAttempts = 0;
  await page.route(assetPattern(entry.photo.src), async route => {
    photoAttempts++;
    if (photoFails) await route.abort('failed');
    else await route.continue();
  });
  await notebook(page);
  expect(await record(page)).toEqual(original);
  await page.locator(`[data-encounter-page="${entry.id}"]`).click();
  const media = page.locator('.finch-entry .finch-media').first();
  await expect.poll(() => portrait.requests.length).toBeGreaterThan(0);
  await expect(media).toHaveAttribute('data-media-state', 'pending');
  await expect(page.locator('[data-encounter-back]')).toBeEnabled();
  await screenshot(page, info, 'portrait-pending');
  portrait.release();
  await expect(media).toHaveAttribute('data-media-state', 'ready');
  await decodedImages(media.locator('img'));
  await page.locator('[data-encounter-view="photo"]').click();
  const photoMedia = page.locator('.finch-photo .finch-media');
  const photo = page.locator('.finch-photo img');
  await expect(photoMedia).toHaveAttribute('data-media-state', 'error');
  await expect(photoMedia).toContainText(/読み込|再試行|もう一度/);
  await expect(photo).toHaveAttribute('src', new RegExp(`${escaped(entry.photo.src)}$`));
  photoFails = false;
  const beforeRetry = photoAttempts;
  // Retry sits outside image/rub and card buttons so it never nests controls or pets a bird.
  await page.locator('.finch-media-retry[data-media-retry]').click();
  await expect.poll(() => photoAttempts).toBeGreaterThan(beforeRetry);
  await expect(photoMedia).toHaveAttribute('data-media-state', 'ready');
  await decodedImages(photo);
  expect(await photo.evaluate(image => {
    const style = getComputedStyle(image);
    return {filter: style.filter, clipPath: style.clipPath, transform: style.transform, objectFit: style.objectFit, opacity: style.opacity};
  })).toEqual({filter: 'none', clipPath: 'none', transform: 'none', objectFit: 'contain', opacity: '1'});
  await expect(page.locator('.finch-photo figcaption')).toContainText(entry.photo.creator);
  await expect(page.locator('.finch-photo figcaption')).toContainText(entry.photo.license);
  await screenshot(page, info, 'original-photo-retried');
  await page.locator('[data-encounter-back]').click();
  await expect(page.locator('.finch-catalog')).toBeVisible();
  await page.locator('[data-game-close-panel]').click();
  await expect(page.locator('.game-panel-overlay')).not.toBeVisible();
  expect(await record(page)).toEqual(original);
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-game-intro', 'done');
  await notebook(page);
  await page.locator(`[data-encounter-page="${entry.id}"]`).click();
  await expect(page.locator('.finch-entry .finch-media').first()).toHaveAttribute('data-media-state', 'ready');
  expect(await record(page)).toEqual(original);
});

test('reduced motion retains readable loading feedback without animated shimmer or spinner', async ({page}, info) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await start(page);
  const held = await holdImages(page, gardenPattern);
  await garden(page);
  const status = page.locator('.finch-garden-loading');
  await expect(status).toBeVisible();
  await expect(status).toContainText(/Loading|読み込み|準備/i);
  const animated = await status.evaluate(element => [element, ...element.querySelectorAll('*')].flatMap(node => [null, '::before', '::after'].map(pseudo => {
    const style = getComputedStyle(node, pseudo);
    const active = style.animationName !== 'none' && style.animationDuration.split(',').some(value => parseFloat(value) > 0.01);
    return active ? {name: style.animationName, duration: style.animationDuration, pseudo} : null;
  })).filter(Boolean));
  expect(animated).toEqual([]);
  await screenshot(page, info, 'garden-reduced-motion-pending');
  held.release();
  await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state', 'ready');
});
