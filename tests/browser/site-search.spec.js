import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const builtHTML = readFileSync(new URL('../../dist/index.html', import.meta.url), 'utf8');
const expectedStyle = builtHTML.match(/href="(src\/style\.css\?v=[^"]+)"/)[1];
const expectedApp = builtHTML.match(/src="(src\/app\.js\?v=[^"]+)"/)[1];
async function openPage(page, route) {
  await page.goto(route);
  await expect(page.locator('link[href*="src/style.css"]')).toHaveAttribute('href', expectedStyle);
  await expect(page.locator('script[type="module"][src*="src/app.js"]')).toHaveAttribute('src', expectedApp);
}


async function activate(locator, hasTouch) {
  if (hasTouch) await locator.tap();
  else await locator.click();
}
async function bounds(page) {
  return page.evaluate(() => {
    const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height }; };
    const v = visualViewport;
    return { menu: rect('#menu'), input: rect('#global-query'), button: rect('#site-search button'), viewport: { top: v?.offsetTop || 0, bottom: (v?.offsetTop || 0) + (v?.height || innerHeight), width: innerWidth }, scrollTop: document.querySelector('#menu').scrollTop, scrollWidth: document.documentElement.scrollWidth };
  });
}
async function assertSearchReachable(page) {
  const b = await bounds(page);
  expect(b.menu.bottom).toBeLessThanOrEqual(b.viewport.bottom + 1);
  for (const r of [b.input, b.button]) {
    expect(r.top).toBeGreaterThanOrEqual(Math.max(b.menu.top, b.viewport.top));
    expect(r.bottom).toBeLessThanOrEqual(Math.min(b.menu.bottom, b.viewport.bottom) + 1);
    expect(r.left).toBeGreaterThanOrEqual(0);
    expect(r.right).toBeLessThanOrEqual(b.viewport.width);
  }
  expect(b.scrollWidth).toBeLessThanOrEqual(b.viewport.width + 1);
}
for (const size of [{ width: 320, height: 568 }, { width: 390, height: 664 }, { width: 844, height: 390 }]) {
  test(`search is visible on opening at ${size.width}x${size.height}`, async ({ page, hasTouch }, testInfo) => {
    await page.setViewportSize(size);
    await openPage(page, 'omochi/');
    await activate(page.locator('#menu-toggle'), hasTouch);
    await expect(page.locator('#menu')).toBeVisible();
    await testInfo.attach('opened-menu', { body: await page.screenshot(), contentType: 'image/png' });
    await testInfo.attach('menu-geometry', { body: JSON.stringify(await bounds(page)), contentType: 'application/json' });
    await assertSearchReachable(page);
    await activate(page.locator('#global-query'), hasTouch);
    await page.locator('#global-query').fill('水浴び');
    await activate(page.locator('#site-search button'), hasTouch);
    await expect(page.locator('#menu')).toBeHidden();
    await expect(page.locator('#search-query')).toHaveValue('水浴び');
    await expect(page.locator('#search-article-results .article-card').first()).toBeVisible();
    expect(new URL(page.url()).searchParams.get('q')).toBe('水浴び');
  });
}

test('short viewport, menu scrolling, reopen, Enter and search history', async ({ page, hasTouch }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await openPage(page, 'encyclopedia/');
  await activate(page.locator('#menu-toggle'), hasTouch);
  await page.locator('#menu').evaluate(el => { el.scrollTop = el.scrollHeight; });
  await expect(page.locator('#menu nav a').last()).toBeInViewport();
  await activate(page.locator('#menu-toggle'), hasTouch);
  await activate(page.locator('#menu-toggle'), hasTouch);
  await assertSearchReachable(page);
  await activate(page.locator('#global-query'), hasTouch);
  await page.locator('#global-query').fill('保存');
  // This is a resized browser viewport, not a claim of a real iOS keyboard.
  await page.setViewportSize({ width: 390, height: 300 });
  // Chromium may acknowledge the viewport before dispatching resize. Await the
  // real event-driven layout, retaining every strict geometry assertion.
  await expect(() => assertSearchReachable(page)).toPass({ intervals: [16, 32, 50], timeout: 1000 });
  await testInfo.attach('short-viewport-geometry', { body: JSON.stringify(await bounds(page)), contentType: 'application/json' });
  await testInfo.attach('short-viewport-search', { body: await page.screenshot(), contentType: 'image/png' });
  await page.locator('#global-query').press('Enter');
  await expect(page.locator('#search-query')).toHaveValue('保存');
  await page.setViewportSize({ width: 390, height: 664 });
  await expect(page.locator('#section-results .section-result').first()).toBeVisible();
  await page.locator('#search-query').fill('ZZZ検索該当なしZZZ');
  await page.locator('#search-query').press('Enter');
  await expect(page.locator('.search-empty')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#search-query')).toHaveValue('保存');
  await page.goForward();
  await expect(page.locator('.search-empty')).toBeVisible();
  await page.locator('#search-query').fill('');
  await page.locator('#search-query').press('Enter');
  await expect(page.locator('#search-result-status')).toContainText('ことばを入れて');
  await activate(page.locator('#menu-toggle'), hasTouch);
  await page.keyboard.press('Escape');
  await expect(page.locator('#menu')).toBeHidden();
  await expect(page.locator('#menu-toggle')).toBeFocused();
});

test('visual viewport-only keyboard resize keeps search controls above obscured area', async ({ page, hasTouch }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await openPage(page, 'omochi/');
  await activate(page.locator('#menu-toggle'), hasTouch);
  await activate(page.locator('#global-query'), hasTouch);
  // Synthetic VisualViewport contract test, separate from actual WebKit touch tests.
  await page.evaluate(() => {
    Object.defineProperty(visualViewport, 'height', { configurable: true, value: 300 });
    visualViewport.dispatchEvent(new Event('resize'));
  });
  await expect.poll(async () => (await bounds(page)).menu.bottom).toBeLessThanOrEqual(301);
  await assertSearchReachable(page);
  await page.locator('#global-query').fill('白文鳥');
  await activate(page.locator('#site-search button'), hasTouch);
  await expect(page.locator('#search-query')).toHaveValue('白文鳥');
  await expect(page.locator('#search-morph-results .section-result').first()).toBeVisible();
  await testInfo.attach('search-results', { body: await page.screenshot(), contentType: 'image/png' });
});
