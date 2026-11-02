import { test, expect, devices } from '@playwright/test';
import { photos } from '../../src/data/photos.js';
import { parseSave, TICK_MS } from '../../src/engine.js';

const STUDIO_KEY = 'buncho-ureshi-studio-v1';
const DB_NAME = 'buncho-ureshi-garden-v1';
const fixedNow = Date.UTC(2026, 10, 2, 12, 0, 0);
const photo = photos.find(p => p.artAllowed);
const youtubeRequests = /youtube|youtu\.be|googlevideo|ytimg/i;
const control = (page, name) => page.locator(`[data-studio="${name}"]`);
const action = (page, name) => page.locator(`[data-action="${name}"]`);
const savedArt = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), STUDIO_KEY);

// WebKit's emulation may report maxTouchPoints=0. Prove actual touch delivery,
// rather than changing navigator metadata or substituting synthetic page events.
async function trustedTap(page, target) {
  await target.evaluate(element => {
    window.__trustedTouchEvents = [];
    for (const type of ['touchstart', 'touchend']) {
      element.addEventListener(type, event => {
        window.__trustedTouchEvents.push({ type: event.type, trusted: event.isTrusted, changedTouches: event.changedTouches.length });
      }, { capture: true, passive: true, once: true });
    }
  });
  await target.tap();
  await expect.poll(() => page.evaluate(() => {
    const events = window.__trustedTouchEvents || [];
    return ['touchstart', 'touchend'].every(type => events.some(event => event.type === type && event.trusted && event.changedTouches > 0));
  })).toBe(true);
}


async function downloadBytes(download) {
  const stream = await download.createReadStream();
  if (!stream) throw new Error('The mobile download has no readable stream.');
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function withTablet(browser, browserName, baseURL, testInfo, run) {
  const name = browserName === 'chromium' ? 'Galaxy Tab S9' : 'iPad (gen 7)';
  const { defaultBrowserType, ...device } = devices[name];
  const context = await browser.newContext({ ...device, baseURL, acceptDownloads: true });
  const page = await context.newPage();
  await context.route(youtubeRequests, route => route.abort());
  try {
    await run(page, context);
  } catch (error) {
    await testInfo.attach(`${name}-failure`, { body: await page.screenshot(), contentType: 'image/png' }).catch(() => {});
    throw error;
  } finally {
    await context.close();
  }
}

test.beforeEach(async ({ context }) => {
  await context.route(youtubeRequests, route => route.abort());
});

async function studioTouchFlow(page, testInfo, deviceLabel) {
  const layoutHistory = [];
  const recordLayout = async stage => {
    const layout = await page.evaluate(() => {
      const width = innerWidth;
      return {
        innerWidth: width, clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        visualViewport: window.visualViewport ? { width: visualViewport.width, scale: visualViewport.scale, offsetLeft: visualViewport.offsetLeft } : null,
        offenders: [...document.querySelectorAll('body *')].map(element => {
          const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
          return { tag: element.tagName, id: element.id, class: String(element.className?.baseVal ?? element.className ?? ''), studio: element.getAttribute('data-studio'), left: rect.left, right: rect.right, width: rect.width, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, overflowX: style.overflowX, minWidth: style.minWidth, maxWidth: style.maxWidth, cssWidth: style.width, text: element.textContent?.slice(0, 100) };
        }).filter(element => element.width > 0 && (element.right > width + 1 || element.left < -1 || element.scrollWidth > element.clientWidth + 1)).slice(0, 100),
      };
    });
    layoutHistory.push({ stage, ...layout });
    return layout;
  };
  await page.goto('studio/');
  await expect(control(page, 'canvas')).toBeVisible();
  await recordLayout('initial');
  await trustedTap(page, page.locator('[data-material="bird-white"]'));
  const id = await control(page, 'layers').inputValue();
  const before = (await savedArt(page)).items.find(item => item.id === id);
  await action(page, 'right').tap();
  await action(page, 'larger').tap();
  await action(page, 'rotate-right').tap();
  const after = (await savedArt(page)).items.find(item => item.id === id);
  expect(after.x).toBeGreaterThan(before.x);
  expect(after.w).toBeGreaterThan(before.w);
  expect(after.r).not.toBe(before.r);
  await control(page, 'title').fill('タッチの文鳥アルバム');
  await action(page, 'title').tap();
  await recordLayout('transformed-and-titled');
  await page.locator('.studio-photo-details summary').tap();
  await recordLayout('photo-picker-open');
  await page.locator(`[data-photo="${photo.id}"]`).tap();
  await expect.poll(async () => (await savedArt(page)).items.some(item => item.photoId === photo.id)).toBe(true);
  await recordLayout('photo-added');
  await action(page, 'export').tap();
  const preview = control(page, 'export-preview');
  await expect(preview).toBeVisible();
  await expect.poll(() => preview.evaluate(img => [img.naturalWidth, img.naturalHeight])).toEqual([1400, 1400]);
  await recordLayout('export-ready');
  const pending = page.waitForEvent('download');
  await control(page, 'download').tap();
  const bytes = await downloadBytes(await pending);
  expect(bytes.subarray(1, 4).toString('ascii')).toBe('PNG');
  expect(bytes.readUInt32BE(16)).toBe(1400);
  expect(bytes.readUInt32BE(20)).toBe(1400);
  expect(bytes.length).toBeGreaterThan(20000);
  const finalLayout = await recordLayout('download-complete');
  await testInfo.attach(`studio-touch-layout-${deviceLabel}`, { body: Buffer.from(JSON.stringify(layoutHistory, null, 2)), contentType: 'application/json' });
  expect(finalLayout.scrollWidth, JSON.stringify(finalLayout)).toBeLessThanOrEqual(finalLayout.innerWidth + 1);
  await page.reload();
  await expect(control(page, 'title')).toHaveValue('タッチの文鳥アルバム');
}

async function gameTouchFlow(page, context, name) {
  await context.addInitScript(now => { Date.now = () => now; }, fixedNow);
  await page.goto('game/');
  await expect(page.locator('#game-root .game-app')).toBeVisible();
  await expect(page.locator('.game-profile-heading h3')).toHaveText('おもち');
  // Backdate only this application's saved timestamp by one tick; actual startup performs the visit.
  await page.evaluate(({ dbName, now, tick }) => new Promise((resolve, reject) => {
    const open = indexedDB.open(dbName, 1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result, tx = db.transaction('world', 'readwrite'), store = tx.objectStore('world');
      const get = store.get('current');
      get.onsuccess = () => { const world = get.result; world.lastUpdated = now - tick; store.put(world, 'current'); };
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  }), { dbName: DB_NAME, now: fixedNow, tick: TICK_MS });
  await page.reload();
  await trustedTap(page, page.locator('.game-visitor-box [data-game-select="b2"]'));
  await page.locator('#game-name').fill(name);
  await page.locator('[data-game-action="adopt"]').tap();
  await expect(page.locator('.game-profile-heading h3')).toHaveText(name);
  await page.locator('[data-game-talk="あそぼう"]').tap();
  await expect(page.locator('.game-reply')).toContainText(name);
  await page.locator('.game-tabs [data-game-panel="settings"]').tap();
  const pending = page.waitForEvent('download');
  await page.locator('[data-game-action="export"]').tap();
  const world = parseSave((await downloadBytes(await pending)).toString('utf8'));
  expect(world.birds.find(bird => bird.id === 'b2')).toMatchObject({ name, sex: 'male', home: 'resident' });
  expect(world.tick).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.reload();
  await page.locator('.game-tabs [data-game-panel="roster"]').tap();
  await expect(page.locator('.game-roster [data-game-select="b2"]')).toContainText(name);
}

// These are emulated touch devices, not claims of physical Android/iOS hardware testing.
// Native tap + accessible move/scale/rotate controls are covered. Drag remains the existing
// mouse/pointer test; this suite does not use CDP, inject a synthetic drag, or claim pinch support.
test('phone and tablet touch controls create, download and restore a studio PNG', async ({ page, browser, browserName, baseURL }, testInfo) => {
  await studioTouchFlow(page, testInfo, 'phone');
  await withTablet(browser, browserName, baseURL, testInfo, tabletPage => studioTouchFlow(tabletPage, testInfo, 'tablet'));
});

test('phone and tablet touch controls welcome, name, talk to and save a game visitor', async ({ page, context, browser, browserName, baseURL }, testInfo) => {
  await gameTouchFlow(page, context, 'スマホのこめ');
  await withTablet(browser, browserName, baseURL, testInfo, (tabletPage, tabletContext) => gameTouchFlow(tabletPage, tabletContext, 'タブレットのこめ'));
});
