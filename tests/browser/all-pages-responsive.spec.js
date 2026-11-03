import { test, expect } from '@playwright/test';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

async function htmlRoutes(dir = 'dist', prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const routes = [];
  for (const entry of entries) {
    if (entry.isDirectory()) routes.push(...await htmlRoutes(path.join(dir, entry.name), prefix + entry.name + '/'));
    else if (entry.name === 'index.html') routes.push(prefix);
    else if (entry.name === '404.html') routes.push(prefix + '404.html');
  }
  return routes;
}
for (const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:768,height:1024},{width:1440,height:900}]) {
  test(`all built pages fit ${size.width}x${size.height}`, async ({ page }, info) => {
    test.setTimeout(360000);
    await page.setViewportSize(size);
    await page.route(/youtube|youtu\\.be|googlevideo|ytimg/i, route => route.abort());
    const routes = await htmlRoutes();
    expect(routes.length).toBeGreaterThan(40);
    const failures = [];
    for (const route of routes) {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(100);
      const dimensions = await page.evaluate(() => {
        const width = document.documentElement.clientWidth;
        return { width, scrollWidth: document.documentElement.scrollWidth,
          offenders: [...document.querySelectorAll('body *')].filter(el => {
            const r = el.getBoundingClientRect(), s = getComputedStyle(el);
            return s.display !== 'none' && s.visibility !== 'hidden' && r.width && (r.left < -2 || r.right > innerWidth + 2);
          }).slice(0, 8).map(el => ({ tag: el.tagName, id: el.id, class: String(el.className), rect: [Math.round(el.getBoundingClientRect().left), Math.round(el.getBoundingClientRect().right)] })) };
      });
      if (!response || response.status() !== 200 || dimensions.scrollWidth > dimensions.width + 1) failures.push({ route, status: response?.status(), ...dimensions });
      if (['', 'studio/', 'game/', 'encyclopedia/'].includes(route)) await info.attach(`${route.replaceAll('/', '-') || 'home'}-${size.width}x${size.height}`, { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
    }
    expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
  });
}
