import {test,expect} from '@playwright/test';
test('twelve gardens load new backgrounds and selector wraps without rerolling a visit',async({page},info)=>{
 await page.addInitScript(()=>{localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));});
 await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 const toggle=page.locator('.game-scene-controls-toggle');if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
 await page.locator('.game-field-nav [data-game-panel="outdoors"]').click();
 await expect(page.locator('.finch-garden-stage')).toBeVisible();await expect(page.locator('[data-garden-select]')).toHaveCount(12);
 for(const id of ['java-rice','bali-terrace','paris-unrest']){
  await page.locator(`[data-garden-select="${id}"]`).click();
  const image=page.locator('.finch-garden-background');await expect(image).toHaveAttribute('src',new RegExp(`${id}.screen.webp`));
  await expect.poll(()=>image.evaluate(x=>x.complete&&x.naturalWidth>0)).toBe(true);
  await expect(page.locator('.finch-garden-stage .garden-bird-sprite').first()).toBeVisible();
  await info.attach(id,{body:await page.screenshot(),contentType:'image/png'});
 }
 const selector=page.locator('.finch-garden-selector');await selector.evaluate(x=>x.scrollLeft=x.scrollWidth);
 await page.locator('[data-garden-scroll="next"]').click();await expect.poll(()=>selector.evaluate(x=>x.scrollLeft)).toBe(0);
 await expect(page.locator('[data-garden-select="paris-unrest"]')).toHaveAttribute('aria-current','page');
});
