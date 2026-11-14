import { test, expect } from '@playwright/test';

async function holdApp(page) {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/src/app.js*', async route => { await gate; await route.continue(); });
  return release;
}
async function checkPending(page) {
  await expect(page.locator('html')).toHaveAttribute('data-game-startup', 'pending');
  await expect(page.locator('.game-startup')).toBeVisible();
  await expect(page.locator('.site-header')).toBeHidden();
  await expect(page.locator('.site-footer')).toBeHidden();
  await expect(page.locator('[data-static-content]')).not.toContainText('文鳥の庭をめぐる');
  await expect(page.locator('.game-startup a')).toBeVisible();
}

test('phone entry and reload show game shell, not site introduction, while modules load', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('');
  await page.evaluate(() => localStorage.setItem('startup-preserved', 'unchanged'));
  let release = await holdApp(page);
  // Small-screen nav may be hidden; follow the actual game link as a user.
  await page.locator('#menu-toggle').click();
  await page.locator('#menu a[href="/buncho-ureshi/game/"]').click({ noWaitAfter: true });
  await checkPending(page);
  release();
  await expect(page.locator('html')).not.toHaveAttribute('data-game-startup');
  await expect(page.locator('body')).toHaveAttribute('data-world', 'buncho');
  await expect(page.locator('#game-root')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('startup-preserved'))).toBe('unchanged');
  await page.unroute('**/src/app.js*');
  release = await holdApp(page);
  const reloading = page.reload({ waitUntil: 'commit' });
  await reloading;
  await checkPending(page);
  release();
  await expect(page.locator('html')).not.toHaveAttribute('data-game-startup');
  await page.goBack();
  await expect(page.locator('.site-header')).toBeVisible();
  await page.goForward();
  await expect(page.locator('body')).toHaveAttribute('data-world', 'buncho');
  expect(await page.evaluate(() => localStorage.getItem('startup-preserved'))).toBe('unchanged');
});

test('failed app download keeps a usable retry link instead of flashing site content', async ({ page }) => {
  await page.route('**/src/app.js*', route => route.abort());
  await page.goto('game/');
  await checkPending(page);
  await page.unroute('**/src/app.js*');
  await page.locator('.game-startup a').click();
  await expect(page.locator('html')).not.toHaveAttribute('data-game-startup');
  await expect(page.locator('body')).toHaveAttribute('data-world', 'buncho');
});

test('no JavaScript still explains how to open the game; site stays readable', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: {width: 320, height: 568} });
  const page = await context.newPage();
  await page.goto(new URL('game/', baseURL).href);
  await checkPending(page);
  // Assert the rendered noscript child directly: Playwright's aggregate text
  // matcher deliberately skips NOSCRIPT elements.
  await expect(page.locator('.game-startup noscript p')).toBeVisible();
  await expect(page.locator('.game-startup noscript p')).toHaveText('JavaScriptを有効にするとあそべます。');
  await page.goto(new URL('encyclopedia/', baseURL).href);
  await expect(page.locator('.site-header')).toBeVisible();
  await context.close();
});
