import { test, expect } from '@playwright/test';
for (const width of [390, 1280]) {
 test(`licensed body cutout and all seven detail buttons remain usable at ${width}px`,async({page},testInfo)=>{
  await page.setViewportSize({width,height:900});
  await page.addInitScript(()=>localStorage.setItem('buncho-observations','[{"date":"2026-11-03","note":"保存を確認","createdAt":1}]'));
  await page.goto('body/');
  const photo=page.locator('.body-diagram > svg.bird-photo-cutout');
  await expect(photo).toBeVisible();
  await expect(photo.locator('image')).toHaveAttribute('href','photos/photo-23.webp');
  expect(await photo.locator('image').evaluate(async node=>{const image=new Image();image.src=node.href.baseVal;await image.decode();return image.naturalWidth;})).toBe(1066);
  await expect(page.locator('.bird-photo-credit')).toContainText('DickDaniels');
  await expect(page.locator('.body-diagram button')).toHaveCount(7);
  for(const id of ['beak','eye','ear','wing','feathers','tail','feet']){
   const button=page.locator(`[data-part="${id}"]`);
   // Clicking a previous part can scroll and resize the side-by-side detail panel.
   // Read both current rectangles in one frame rather than keeping stale viewport coordinates.
   const geometry=await button.evaluate(node=>{const box=node.getBoundingClientRect(),photo=node.parentElement.querySelector('svg').getBoundingClientRect();return {top:box.top,height:box.height,photoBottom:photo.bottom};});
   expect(geometry.top).toBeGreaterThanOrEqual(geometry.photoBottom-1);expect(geometry.height).toBeGreaterThanOrEqual(44);
   await button.click();await expect(button).toHaveAttribute('aria-pressed','true');await expect(page.locator('#part-detail .part-photo')).toBeVisible();
  }
  await page.locator('[data-part="ear"]').click();await expect(page.locator('#part-detail')).toContainText('耳の穴は羽毛の下にかくれ');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('buncho-observations'))[0].note)).toBe('保存を確認');
  await testInfo.attach(`body-cutout-${width}`,{body:await page.locator('.body-explorer').screenshot(),contentType:'image/png'});
 });
}
