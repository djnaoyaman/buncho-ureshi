import { test, expect } from '@playwright/test';

// Independent contexts only: never connect this check to a user's browser data.
const sizes = [
  { width: 320, height: 568 }, { width: 360, height: 640 },
  { width: 390, height: 844 }, { width: 430, height: 932 },
  { width: 667, height: 375 }, { width: 844, height: 390 },
];
async function fits(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}
async function readableInputs(page, minimum) {
  const inputs = page.locator('input:is([type=text],[type=search],[type=date],:not([type])):visible, textarea:visible, select:visible');
  expect(await inputs.count()).toBeGreaterThan(0);
  for (const input of await inputs.all()) {
    expect(await input.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(minimum);
    await input.scrollIntoViewIfNeeded();
    const box = await input.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
  }
}
async function savedWorld(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('buncho-ureshi-garden-v1', 1);
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    try { return await new Promise((resolve, reject) => {
      const request = db.transaction('world').objectStore('world').get('current');
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    }); } finally { db.close(); }
  });
}
for (const size of sizes) test(`phone inputs, enlarged text and reduced height ${size.width}x${size.height}`, async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize(size);
  await page.addInitScript(() => {
    Date.now = () => Date.UTC(2026, 10, 8, 12);
    localStorage.setItem('buncho.music.v1', JSON.stringify({ enabled: false }));
    localStorage.setItem('buncho.care-sound-choice.v1', JSON.stringify({ explicit: true, enabled: false }));
  });
  for (const route of ['encyclopedia/', 'omochi/', 'studio/']) {
    await page.goto(route);
    await readableInputs(page, 16); await fits(page);
    await page.addStyleTag({ content: 'html { font-size:32px!important; }' });
    await readableInputs(page, 32); await fits(page);
  }
  await page.goto('game/');
  await expect(page.locator('body')).toHaveAttribute('data-game-intro', 'done');
  await expect(page.locator('#game-open-bird')).toHaveCount(1);
  const before = await savedWorld(page); expect(before.worldId).toBeTruthy();
  await page.locator('.game-scene-controls-toggle').click();
  await page.locator('#game-open-bird').click();
  await page.locator('.game-sheet-talk summary').click();
  await readableInputs(page, 16); await fits(page);
  await page.addStyleTag({ content: 'html { font-size:32px!important; }' });
  await readableInputs(page, 32); await fits(page);
  await page.setViewportSize({ width: size.width, height: 300 });
  await page.locator('#game-words').focus();
  await page.locator('#game-words').scrollIntoViewIfNeeded();
  await expect(page.locator('#game-words')).toBeInViewport();
  // Narrow screens intentionally stack the existing send button. Native Tab
  // must reveal it inside the dialog, including with the keyboard-height view.
  await page.keyboard.press('Tab');
  await expect(page.locator('#game-talk-send')).toBeFocused();
  await expect(page.locator('#game-talk-send')).toBeInViewport();
  await page.locator('#game-sheet-close').scrollIntoViewIfNeeded();
  await expect(page.locator('#game-sheet-close')).toBeInViewport();
  await page.locator('#game-sheet-close').click();
  await fits(page);
  expect(await savedWorld(page)).toEqual(before);
});
