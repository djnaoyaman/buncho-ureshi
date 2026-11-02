import { test, expect } from '@playwright/test';
for (const width of [320, 390]) {
 test(`photo refinements, swipe gallery, menu and learning links at ${width}px`, async ({page},info)=>{
  await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  async function shot(name){await info.attach(`refinement-${name}-${width}`,{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
  await page.goto('colors/');await expect(page.locator('[data-morph-card]')).toHaveCount(5);await shot('atlas-heading');
  const urls=await page.locator('main img').evaluateAll(images=>images.map(i=>i.getAttribute('src')));expect(new Set(urls).size).toBe(urls.length);
  await page.locator('[data-morph-results]').scrollIntoViewIfNeeded();await page.locator('[data-morph-card] img').first().evaluate(i=>i.decode());await shot('gallery-first');
  await page.locator('[data-morph-page="1"]').click();await expect(page.locator('[data-morph-position]')).toHaveText('2 / 5');await shot('gallery-second');
  // Native scroll gesture path and button path both retain the selected card.
  await page.locator('[data-morph-results]').evaluate(el=>el.scrollTo({left:el.scrollWidth,behavior:'instant'}));await expect(page.locator('[data-morph-position]')).toHaveText('5 / 5');await expect(page.locator('[data-morph-page="1"]')).toBeDisabled();await shot('gallery-last');
  await page.locator('[data-morph-card="cinnamon"] [data-morph-compare-id]').click();await expect(page.locator('#morph-compare')).toHaveAttribute('open','');await expect(page.locator('.morph-comparison')).toHaveCount(2);for(const image of await page.locator('[data-morph-comparison] img').all()){await image.scrollIntoViewIfNeeded();await image.evaluate(node=>node.decode());}await page.locator('#morph-compare').scrollIntoViewIfNeeded();await shot('comparison');
  await page.locator('#morph-compare>summary').click();await expect(page.locator('[data-morph-comparison] img')).toHaveCount(0);
  await page.locator('#morph-sources details>summary').click();await expect(page.locator('#morph-sources details')).toHaveAttribute('open','');await shot('sources');
  await page.goto('encyclopedia/');await expect(page.locator('.article-card')).toHaveCount(37);const covers=await page.locator('.article-card img').evaluateAll(images=>images.map(i=>i.src));expect(new Set(covers).size).toBe(covers.length);await shot('encyclopedia');
  await page.locator('#menu-toggle').click();const menu=page.locator('#menu');await expect(menu.locator('nav a')).toHaveCount(10);await expect(menu.locator('nav a strong')).toHaveCount(10);await expect(menu.locator('nav a span')).toHaveCount(10);const rows=await menu.locator('nav a').evaluateAll(links=>links.map(a=>a.getBoundingClientRect()));expect(rows.every((r,i)=>i===0||r.top>=rows[i-1].bottom-1)).toBe(true);await shot('menu');await page.locator('#menu-toggle').click();
  await page.goto('body/');for(const part of ['beak','eye','ear','wing','feathers','tail','feet']){await page.locator(`[data-part="${part}"]`).click();await expect(page.locator(`[data-part="${part}"]`)).toHaveAttribute('aria-pressed','true');}await page.locator('[data-part="eye"]').click();await expect(page.locator('#part-detail .part-photo')).toBeVisible();await expect(page.locator('.body-topic-link img')).toHaveCount(0);await shot('body');
  await page.goto('challenge/');await page.locator('.quiz-learning summary').click();await expect(page.locator('.quiz-learning a')).toContainText('ふるさと');await shot('quiz-before');await page.locator('[data-answer="0"]').click();await expect(page.locator('.quiz-learning-result')).toContainText('ここを読むとわかる');await expect(page.locator('.quiz-learning-result a')).toHaveAttribute('target','_blank');await shot('quiz-wrong');expect(errors).toEqual([]);
 });
}
