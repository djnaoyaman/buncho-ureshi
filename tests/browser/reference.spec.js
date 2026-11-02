import { test, expect } from '@playwright/test';

// Service-worker requests cannot bypass the isolated reference allowlist.
test.use({ serviceWorkers: 'block' });

// Explicit opt-in: read-only current-reference QA is separate from testing our application.
// Run: REFERENCE_QA=1 npx playwright test reference.spec.js --project=chromium
// Only the public OMOCHI TOUCH origin/path is allowed; analytics and YouTube are blocked.
test('current OMOCHI TOUCH live reference: layout, backgrounds, palettes, undo, PNG and reset', async ({ page, context, browserName }, testInfo) => {
  test.skip(browserName !== 'chromium', 'Reference inspection is intentionally Chromium-only.');
  test.skip(process.env.REFERENCE_QA !== '1', 'Set REFERENCE_QA=1 for the separately authorized read-only live-reference check.');
  test.setTimeout(90000);
  await context.addInitScript(() => {
    localStorage.setItem('omochi-touch-sfx', 'off');
    localStorage.setItem('omochi-touch-analytics-consent', 'no');
  });
  const aborted = [];
  await context.routeWebSocket('**/*', socket => socket.close());
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === 'https://djnaoyaman.github.io' && url.pathname.startsWith('/omochi-touch/') && ['GET', 'HEAD'].includes(request.method())) return route.continue();
    aborted.push(url.hostname);
    return route.abort();
  });
  const response = await page.goto('https://djnaoyaman.github.io/omochi-touch/', { waitUntil: 'domcontentloaded' });
  expect(response?.ok()).toBe(true);
  await page.waitForLoadState('networkidle');
  const canvas = page.locator('#art');
  await expect(canvas).toBeVisible();
  await expect(page.locator('#patterns .pattern')).toHaveCount(24);
  await expect(page.locator('#palettes .palette')).toHaveCount(8);
  await expect(page.locator('#photos .photo').first()).toBeVisible();
  await page.locator('#patterns .pattern').nth(0).click();
  await expect(page.locator('#seriesName')).toContainText('OP ART');
  await page.locator('#palettes .palette').nth(1).click();
  await expect(page.locator('#paletteName')).toContainText('Cobalt');
  await page.locator('#undo').click();
  await expect(page.locator('#paletteName')).toContainText('Plum');
  await page.locator('#photos .photo').nth(1).click();
  await expect(page.locator('#selectedName')).toContainText('OMOCHI');
  await expect.poll(() => canvas.evaluate(c => c.toDataURL().length)).toBeGreaterThan(20000);
  const beforeReset = await canvas.evaluate(c => c.toDataURL());
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('#reset').click();
  expect(await canvas.evaluate(c => c.toDataURL())).toBe(beforeReset);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#reset').click();
  await expect(page.locator('#seriesName')).toContainText('BAUHAUS');
  await page.locator('#undo').click();
  await expect(page.locator('#seriesName')).toContainText('OP ART');
  await page.locator('#export').click();
  await expect(page.locator('#downloadDialog')).toBeVisible();
  await expect.poll(() => page.locator('#exportImage').evaluate(img => [img.naturalWidth, img.naturalHeight])).toEqual([2000, 2500]);
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#downloadLink').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('OMOCHI-TOUCH.png');
  expect(await download.failure()).toBeNull();
  await page.locator('#closeDialog').click();
  await expect(page.locator('#downloadDialog')).not.toBeVisible();
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await testInfo.attach(`omochi-touch-live-${width}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  }
  await testInfo.attach('reference-blocked-external-hosts', { body: Buffer.from(JSON.stringify([...new Set(aborted)], null, 2)), contentType: 'application/json' });
});
