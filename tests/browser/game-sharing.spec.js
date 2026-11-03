import { test, expect } from '@playwright/test';
import { routeMetadata } from '../../src/metadata.js';

async function check(page, route) {
  const meta = routeMetadata(route);
  await expect(page).toHaveTitle(meta.title);
  for (const [selector, value] of [
    ['meta[property="og:image"]',meta.imageURL], ['meta[property="og:image:alt"]',meta.imageAlt],
    ['meta[name="twitter:image"]',meta.imageURL], ['meta[name="twitter:image:alt"]',meta.imageAlt],
    ['meta[property="og:title"]',meta.title], ['meta[name="twitter:title"]',meta.title],
    ['meta[property="og:description"]',meta.description], ['meta[name="twitter:description"]',meta.description],
    ['meta[property="og:url"]',meta.canonical], ['meta[name="twitter:card"]','summary_large_image']
  ]) await expect(page.locator(selector)).toHaveAttribute('content',value);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',meta.canonical);
  expect(await page.locator('#site-jsonld').evaluate(node=>JSON.parse(node.textContent))).toEqual(meta.structuredData);
}

test('game crawler card and public image are present with JavaScript disabled', async ({ browser, request, baseURL }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled:false });
  try {
    const page = await context.newPage();
    await page.goto(new URL('game/?private-note=never-share#private',baseURL).href);
    await check(page,'game/');
    const response = await request.get(new URL('game-ogp-v1.png',baseURL).href);
    expect(response.status()).toBe(200); expect(response.headers()['content-type']).toContain('image/png');
    const bytes = await response.body();
    expect(bytes.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
    expect([bytes.readUInt32BE(16),bytes.readUInt32BE(20)]).toEqual([1200,630]);
    expect(bytes.length).toBeLessThan(1000000);
    await testInfo.attach('game-share-card',{body:bytes,contentType:'image/png'});
    await page.goto(new URL('game-ogp-v1.png',baseURL).href);
    await expect(page.locator('img')).toBeVisible();
    expect(await page.locator('img').evaluate(image=>({width:image.naturalWidth,height:image.naturalHeight,complete:image.complete}))).toEqual({width:1200,height:630,complete:true});
  } finally { await context.close(); }
});

test('game card follows direct load, in-page navigation, Back, Forward and reload', async ({ page }) => {
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.goto('game/'); await check(page,'game/');
  await page.goto(''); await check(page,'');
  await page.locator('.desktop-nav [data-nav="game/"]').click(); await check(page,'game/');
  await page.goBack(); await check(page,'');
  await page.goForward(); await check(page,'game/');
  await page.reload(); await check(page,'game/');
  expect(errors).toEqual([]);
});
