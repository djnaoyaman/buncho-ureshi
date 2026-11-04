import { test, expect } from '@playwright/test';

const SITE_NAME = '文鳥♬文鳥♬文鳥って嬉しいな♪';
const BASE_PATH = '/buncho-ureshi/';

async function checkInstall(page, request, game) {
  const filename = game ? 'game.webmanifest' : 'manifest.webmanifest';
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', filename);
  const name = game ? '文鳥ぐらし' : SITE_NAME;
  for (const tag of ['application-name', 'apple-mobile-web-app-title']) {
    await expect(page.locator(`meta[name="${tag}"]`)).toHaveAttribute('content', name);
  }
  const manifestURL = await page.locator('link[rel="manifest"]').evaluate(link => link.href);
  const response = await request.get(manifestURL);
  expect(response.status()).toBe(200);
  const manifest = await response.json();
  expect(manifest.name).toBe(name);
  expect(new URL(manifest.start_url, manifestURL).pathname).toBe(BASE_PATH + (game ? 'game/' : ''));
  expect(new URL(manifest.id, new URL(manifest.start_url, manifestURL).origin).pathname).toBe(game ? BASE_PATH + 'game/' : '/');
  expect(new URL(manifest.scope, manifestURL).pathname).toBe(BASE_PATH);
  return { manifest, manifestURL };
}

test('direct game and site documents advertise separate Home Screen targets without JavaScript', async ({ browser, request, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    for (const route of ['game/?private-note=not-installed#private', '', 'help/', 'game/']) {
      await page.goto(new URL(route, baseURL).href);
      const { manifest, manifestURL } = await checkInstall(page, request, route.startsWith('game/'));
      for (const icon of manifest.icons) {
        const response = await request.get(new URL(icon.src, manifestURL).href);
        expect(response.status()).toBe(200);
        expect((await response.body()).subarray(1, 4).toString()).toBe('PNG');
      }
      await page.goto(new URL(manifest.start_url, manifestURL).href);
      expect(new URL(page.url()).pathname).toBe(BASE_PATH + (route.startsWith('game/') ? 'game/' : ''));
      expect(new URL(page.url()).search).toBe('');
      expect(new URL(page.url()).hash).toBe('');
    }
  } finally { await context.close(); }
});

test('install target follows separate-document game entry/exit, Back/Forward and reload', async ({ page, request, browserName }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(''); await checkInstall(page, request, false);
  await page.evaluate(() => { window.installNavigationSentinel = 'site-document'; localStorage.setItem('install-test-preserved', 'saved'); });
  if (browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page);
    const app = await cdp.send('Page.getAppManifest');
    expect(JSON.parse(app.data).start_url).toBe('./');
    await cdp.detach();
  }
  await page.locator('.desktop-nav [data-nav="game/"]').click();
  await checkInstall(page, request, true);
  expect(await page.evaluate(() => window.installNavigationSentinel)).toBeUndefined();
  expect(await page.evaluate(() => localStorage.getItem('install-test-preserved'))).toBe('saved');
  // Chromium reports the manifest seen by its install subsystem, not only a DOM link.
  if (browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page);
    const app = await cdp.send('Page.getAppManifest');
    expect(new URL(app.url).pathname).toBe(BASE_PATH + 'game.webmanifest');
    expect(app.errors).toEqual([]);
    expect(JSON.parse(app.data).start_url).toBe('./game/');
    await cdp.detach();
  }
  await page.goBack(); await checkInstall(page, request, false);
  expect(await page.evaluate(() => localStorage.getItem('install-test-preserved'))).toBe('saved');
  await page.goForward(); await checkInstall(page, request, true);
  await page.reload(); await checkInstall(page, request, true);
  // Use a real same-origin link; the app's delegated click listener handles it.
  for (const [route, game] of [['help/', false], ['game/', true], ['', false], ['game/', true]]) {
    await page.evaluate(route => {
      const a = document.createElement('a'); a.href = '/buncho-ureshi/' + route;
      document.body.append(a); a.click(); a.remove();
    }, route);
    await checkInstall(page, request, game);
  }
  await page.goto('help/');
  await expect(page.locator('#help-access')).toContainText('保存用JSONを書き出して保管');
  await page.locator('#help-access a[href="/buncho-ureshi/game/"]').click();
  await checkInstall(page, request, true);
  expect(await page.evaluate(() => localStorage.getItem('install-test-preserved'))).toBe('saved');
  expect(errors).toEqual([]);
});
