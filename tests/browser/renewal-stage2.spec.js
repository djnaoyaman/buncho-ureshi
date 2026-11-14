import {test,expect} from '@playwright/test';
// Candidate for tests/browser/renewal-stage2.spec.js. Real built app, not mock DOM.
const routes=[['encyclopedia/','#article-grid .article-card'],['encyclopedia/beak/','.article-body'],['encyclopedia/health/','.article-body'],['encyclopedia/voice/','.bird-video'],['colors/','.morph-intro'],['colors/white/','.morph-profile-title'],['body/','.body-diagram'],['omochi/','#observation-form']];
for(const width of [320,390,768,1440])for(const [route,ready] of routes){
 test(`reading room ${route} ${width}`,async({page},info)=>{
  await page.setViewportSize({width,height:844});const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(route);await expect(page.locator(ready).first()).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-site-renewal','1');
  await page.evaluate(()=>document.fonts.ready);
  const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,elements:[...document.querySelectorAll('#main *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1&&getComputedStyle(e).position!=='absolute').slice(0,12).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right}))}));
  expect(overflow.scroll,JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.width+1);
  for(const image of await page.locator('#main img:visible').all()){await image.scrollIntoViewIfNeeded();expect(await image.evaluate(async i=>{await i.decode();return i.naturalWidth>0;})).toBe(true);}
  if(route==='colors/'){await page.locator('.morph-search-panel>summary').click();await expect(page.locator('.morph-filterbar')).toBeVisible();await page.locator('.morph-search-panel>summary').click();await expect(page.locator('.morph-image-wrap').first()).toHaveCSS('border-top-left-radius','3px');}
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:info.outputPath(`reading-${route.replaceAll('/','-')}-${width}.png`),fullPage:true});
  expect(errors).toEqual([]);
 });
}
test('encyclopedia search, filters and article sources still work',async({page})=>{
 await page.goto('encyclopedia/');const cards=page.locator('#article-grid .article-card');await expect(cards.first()).toBeVisible();const total=await cards.count();expect(total).toBeGreaterThan(5);
 await page.locator('#article-search').fill('くちばし');await expect.poll(()=>cards.count()).toBeGreaterThan(0);await expect.poll(()=>cards.count()).toBeLessThan(total);
 await page.locator('#article-search').fill('zzzz-no-matching-bird');await expect(cards).toHaveCount(0);await expect(page.locator('#result-count')).toContainText('0');
 await page.locator('#article-search').fill('');await page.locator('[data-category="からだ探検"]').click();await expect(page.locator('[data-category="からだ探検"]')).toHaveClass(/active/);expect(await cards.count()).toBeLessThan(total);
 await cards.first().click();await expect(page.locator('.article-body')).toBeVisible();await page.locator('#sources>summary').click();await expect(page.locator('#sources')).toHaveAttribute('open','');await expect(page.locator('#sources a[href^="http"]').first()).toBeVisible();
 const favorite=page.locator('#favorite');await favorite.click();await expect(favorite).toHaveAttribute('aria-pressed','true');await page.reload();await expect(page.locator('#favorite')).toHaveAttribute('aria-pressed','true');
});
test('anatomy hotspots keep real photo crop and source context',async({page})=>{
 await page.setViewportSize({width:320,height:568});await page.goto('body/');
 for(const id of ['beak','ear','wing','feet']){
  await page.locator(`[data-part="${id}"]`).click();await expect(page.locator(`[data-part="${id}"]`)).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#part-detail .part-zoom image')).toHaveCount(1);await expect(page.locator('.part-credit a[href^="http"]').first()).toBeVisible();
  await page.locator('.part-context>summary').click();await expect(page.locator('.part-context-image')).toBeVisible();
  if(id==='ear')await expect(page.locator('.part-photo figcaption')).toContainText('耳の穴は羽毛の下');
  const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,elements:[...document.querySelectorAll('#main *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1&&getComputedStyle(e).position!=='absolute').slice(0,12).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right}))}));
  expect(overflow.scroll,JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.width+1);
 }
});
test('observation notebook saves, reloads and deletes only its test note',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('omochi/');
 await expect(page.locator('.omochi-real-portrait figcaption')).toContainText('おもち本人');
 await page.locator('#observation-form input[name="date"]').fill('2026-11-14');
 const note='検査用：朝、片足をしまって静かに休んでいた。';
 await page.locator('#observation-form textarea').fill(note);await page.locator('#observation-form button').click();
 await expect(page.locator('.observation').filter({hasText:note})).toHaveCount(1);
 await page.reload();const saved=page.locator('.observation').filter({hasText:note});await expect(saved).toHaveCount(1);await saved.locator('[data-delete-note]').click();await expect(saved).toHaveCount(0);
 await page.reload();await expect(page.locator('.observation').filter({hasText:note})).toHaveCount(0);
});
