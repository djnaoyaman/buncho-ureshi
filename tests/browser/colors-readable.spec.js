import { test, expect } from '@playwright/test';
for (const width of [320,390]) test(`color atlas readable at ${width}px`, async ({page},info)=>{
 await page.setViewportSize({width,height:844});await page.goto('colors/');
 await expect(page.locator('.morph-entry-nav a')).toHaveCount(3);
 for(const link of await page.locator('.morph-entry-nav a').all()){const box=await link.boundingBox();expect(box.height).toBeGreaterThanOrEqual(44);expect(box.width).toBeGreaterThanOrEqual(44);}
 await info.attach(`entry-${width}`,{body:await page.screenshot(),contentType:'image/png'});
 await page.locator('[data-morph-jump="morph-compare"]').click();await expect(page.locator('#morph-compare')).toHaveAttribute('open','');
 await page.locator('[data-morph-jump="morph-terms"]').click();await expect(page.locator('#morph-terms')).toHaveAttribute('open','');
 await page.locator('#morph-terms>summary').click();
 await page.locator('[data-morph-jump="morph-profiles"]').click();
 await page.locator('[data-morph-show="silver"]').click();await expect(page.locator('[data-morph-card="silver"] h3')).toBeInViewport();
 await page.locator('[data-morph-show="normal"]').click();
 const cards=page.locator('[data-morph-card]');await expect(cards).toHaveCount(5);
 const first=cards.first();await first.locator('img').evaluate(i=>i.decode());await first.scrollIntoViewIfNeeded();
 await expect(first.locator('h3')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await info.attach(`gallery-${width}`,{body:await page.screenshot(),contentType:'image/png'});
 await page.locator('.morph-search-panel>summary').click();
 await page.locator('[data-morph-query]').fill('白');await expect(page.locator('[data-morph-card="white"]')).toHaveCount(1);
 await page.locator('[data-morph-reset]').click();await expect(cards).toHaveCount(5);
 await first.locator('[data-morph-compare-id]').click();await expect(page.locator('#morph-compare')).toHaveAttribute('open','');
 await expect(page.locator('.morph-comparison')).toHaveCount(2);
 await first.locator('.morph-photo details>summary').click();await expect(first.locator('.morph-photo-description')).toBeVisible();
 await first.locator('.morph-photo details>summary').click();await expect(first.locator('.morph-photo-description')).toBeHidden();
 await page.locator('#morph-terms>summary').click();await expect(page.locator('.morph-term').first()).toBeVisible();
 await page.locator('#morph-terms>summary').click();await expect(page.locator('.morph-term').first()).toBeHidden();
});
