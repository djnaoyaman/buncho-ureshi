import {test, expect, devices} from '@playwright/test';

// Isolated tablet sessions, never an existing user's browser or saved world.
const sizes = [{width:768,height:1024},{width:820,height:1180},{width:1024,height:1366}];
async function savedWorld(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve,reject) => {
      const r = indexedDB.open('buncho-ureshi-garden-v1',1);
      r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
    });
    try { return await new Promise((resolve,reject) => {
      const r = db.transaction('world').objectStore('world').get('current');
      r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
    }); } finally { db.close(); }
  });
}
async function withinScreen(locator, width) {
  const box = await locator.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(24);
  expect(box.x + box.width).toBeLessThanOrEqual(width - 24);
}
for (const size of sizes) test(`portrait tablet workspaces and enlarged text ${size.width}x${size.height}`, async ({browser,baseURL}) => {
  const context = await browser.newContext({...devices['iPad Mini'],viewport:size,screen:size,baseURL,storageState:{cookies:[],origins:[]}});
  try {
    await context.addInitScript(() => {
      Date.now = () => Date.UTC(2026,10,8,12);
      localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));
      localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));
    });
    const page = await context.newPage(); await page.goto('game/');
    await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
    await expect(page.locator('body')).toHaveAttribute('data-game-device','touch');
    await expect(page.locator('.game-environment-notice')).not.toBeVisible();
    const before = await savedWorld(page); expect(before.worldId).toBeTruthy();
    await page.locator('.game-scene-controls-toggle').tap();
    await page.locator('[data-game-open-menu]').tap();
    const menu = page.locator('.game-secondary-menu'); await withinScreen(menu,size.width);
    const buttons = menu.locator('.game-tabs button');
    const boxes = [];
    for (const button of await buttons.all()) {
      await button.scrollIntoViewIfNeeded(); const box = await button.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(44); expect(box.width).toBeGreaterThanOrEqual(44);
      expect(await button.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
      boxes.push(box);
    }
    // Three distinct reachable columns make use of the portrait tablet width.
    expect(new Set(boxes.map(box=>Math.round(box.x))).size).toBe(3);
    await page.locator('[data-game-close-menu]').tap();
    await page.locator('#game-open-bird').tap();
    const sheet = page.locator('.game-bird-sheet'); await withinScreen(sheet,size.width);
    expect((await sheet.boundingBox()).width).toBeGreaterThanOrEqual(500);
    expect((await sheet.boundingBox()).width).toBeLessThanOrEqual(640);
    await page.locator('.game-sheet-talk summary').tap();
    await page.locator('#game-words').fill('タブレットの入力途中');
    await page.locator('#game-sheet-close').focus();
    await page.addStyleTag({content:'html {font-size:32px!important}'});
    await page.locator('#game-words').focus();
    await expect(page.locator('#game-words')).toBeInViewport();
    await page.keyboard.press('Tab'); await expect(page.locator('#game-talk-send')).toBeFocused();
    await expect(page.locator('#game-talk-send')).toBeInViewport();
    await page.locator('#game-sheet-close').focus(); await expect(page.locator('#game-sheet-close')).toBeInViewport();
    await page.locator('#game-sheet-close').tap();
    await page.locator('[data-game-open-menu]').tap(); await withinScreen(menu,size.width);
    for (const button of await buttons.all()) {
      await button.focus(); await expect(button).toBeInViewport();
      expect(await button.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    }
    await page.locator('#game-menu-settings').tap();
    const panel = page.locator('.game-panel-overlay'); await withinScreen(panel,size.width);
    expect((await panel.boundingBox()).width).toBeLessThanOrEqual(900);
    await expect(page.locator('#game-motion-switch')).toBeAttached();
    await page.locator('.game-settings-management summary').tap();
    const backup = page.locator('[data-game-action="export"]');
    await backup.focus(); await expect(backup).toBeInViewport();
    await page.locator('[data-game-close-panel]').focus();
    await expect(page.locator('[data-game-close-panel]')).toBeInViewport();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    expect(await savedWorld(page)).toEqual(before);
  } finally { await context.close(); }
});
