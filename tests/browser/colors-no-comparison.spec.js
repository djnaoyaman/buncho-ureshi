import { test, expect } from '@playwright/test';
for (const width of [390,1280]) {
 test(`color atlas has no comparison UI and preserves browsing at ${width}px`,async({page},testInfo)=>{
  await page.setViewportSize({width,height:900});
  await page.addInitScript(()=>localStorage.setItem('buncho-favorites','["eyes"]'));
  await page.goto('colors/#morph-compare');
  await expect(page.locator('.morph-entry-nav a')).toHaveCount(2);
  await expect(page.locator('#morph-compare,[data-morph-compare],[data-morph-compare-id]')).toHaveCount(0);
  await expect(page.locator('[data-morph-card]')).toHaveCount(5);
  await page.locator('[data-morph-show="silver"]').click();
  await expect(page.locator('[data-morph-card="silver"] h3 a')).toBeFocused();
  await page.locator('[data-morph-card="silver"] h3 a').click();
  await expect(page.locator('[data-morph-profile="silver"]')).toBeVisible();
  await page.goBack();await expect(page.locator('[data-morph-card]')).toHaveCount(5);
  await page.locator('[data-morph-jump="morph-terms"]').click();
  await expect(page.locator('#morph-terms')).toHaveAttribute('open','');
  await expect(page.locator('.morph-term')).toHaveCount(14);
  expect(await page.evaluate(()=>localStorage.getItem('buncho-favorites'))).toBe('["eyes"]');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('[data-morph-jump="morph-profiles"]').click();
  await testInfo.attach(`colors-no-comparison-${width}`,{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
 });
}
