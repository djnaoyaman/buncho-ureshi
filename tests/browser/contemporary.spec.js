import { test, expect } from '@playwright/test';

// Real rendered evidence for the contemporary art redesign, not DOM-only claims.
for (const width of [320,390,768,1280]) {
  test(`contemporary publication shell is usable at ${width}px`, async ({page},info) => {
    await page.setViewportSize({width,height:900});
    const errors=[]; page.on('pageerror', e=>errors.push(e.message));
    await page.emulateMedia({reducedMotion:'reduce'});
    for (const [route,name] of [['./','home'],['encyclopedia/','encyclopedia'],['omochi/','observation'],['studio/','studio'],['colors/','atlas'],['game/','game']]) {
      await page.goto(route);
      await expect(page.locator('main')).toBeVisible();
      if(name==='game') { await expect(page.locator('body')).toHaveAttribute('data-game-intro','done',{timeout:10000}); await expect(page.locator('.game-logo-intro')).toHaveCount(0); }
      else if(name==='home') await expect(page.locator('.art-cover-photo img')).toBeVisible();
      // Full-page evidence must visit lazy media, just as a reader scrolling does.
      if (!['encyclopedia','atlas'].includes(name)) {
        for (const img of await page.locator('main img[loading=lazy][src]').all()) {
          if (await img.isVisible()) { await img.scrollIntoViewIfNeeded(); await img.evaluate(node=>node.decode()); }
        }
        await page.evaluate(()=>window.scrollTo(0,0));
      }
      // Studio's hidden export preview intentionally has no source until export.
      // A visible empty image or any sourced eager image failing decode still fails.
      await page.locator('main img').evaluateAll(async images => Promise.all(images.filter(img=>img.loading!=='lazy').map(async img=>{
        if (!img.getAttribute('src') && !img.getAttribute('srcset') && img.closest('[hidden]')) return;
        await img.decode();
        if (!img.naturalWidth) throw new Error(`Image has no decoded pixels: ${img.currentSrc}`);
      })));
      expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth + 1),`${name} overflows ${width}`).toBe(true);
      const primary=page.locator('#menu-toggle'); await primary.click();
      await expect(page.locator('#menu')).toBeVisible(); await primary.click();
      await expect(page.locator('#menu')).toBeHidden();
      await info.attach(`contemporary-${name}-${width}`,{body:await page.screenshot({fullPage:name!=='encyclopedia'&&name!=='atlas',animations:'disabled'}),contentType:'image/png'});
    }
    expect(errors).toEqual([]);
  });
}

test('photographic cover survives without JavaScript and has source attribution',async({browser,baseURL},info)=>{
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
 const page=await context.newPage(); await page.goto(baseURL);
 await expect(page.locator('.art-cover h1')).toHaveText('ちいさな鳥。ひろがる、世界。');
 await expect(page.locator('.art-cover-photo figcaption')).toContainText('おもち本人ではありません');
 expect(await page.locator('.art-cover-photo figcaption a').getAttribute('href')).toMatch(/^https:\/\//);
 await expect(page.locator('.art-door')).toHaveCount(4);
 await info.attach('contemporary-nojs-390',{body:await page.screenshot(),contentType:'image/png'});
 await context.close();
});
