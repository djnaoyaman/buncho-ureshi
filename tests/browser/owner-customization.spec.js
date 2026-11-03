import {test,expect} from '@playwright/test';
for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390}])test(`owner editor fits and saves at ${size.width}x${size.height}`,async({page})=>{
 await page.setViewportSize(size);await page.goto('game/');await page.waitForFunction(()=>document.body.dataset.gameIntro==='done');
 if(await page.locator('.game-scene-controls-toggle').getAttribute('aria-expanded')==='false')await page.locator('.game-scene-controls-toggle').click();
 await page.locator('#game-nav-open').click();await page.locator('[data-game-panel="settings"]').click();await page.locator('.game-owner-setting').click();
 const editor=page.locator('.buncho-owner-editor'), box=await editor.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(size.width+1);
 for(const sel of ['[data-owner-name]','[data-owner-save]','[data-owner-cancel]']) {const b=await page.locator(sel).boundingBox();expect(b.x).toBeGreaterThanOrEqual(box.x-1);expect(b.x+b.width).toBeLessThanOrEqual(box.x+box.width+1);}
 await page.locator('[data-owner-category="eyes"]').click();await page.locator('[data-owner-choice="bright"]').click();await page.locator('[data-owner-category="face"]').click();await page.locator('[data-owner-choice="oval"]').click();await page.locator('[data-owner-save]').click();
 await page.locator('.game-owner-setting').click();await page.locator('[data-owner-category="face"]').click();await expect(page.locator('[data-owner-choice="oval"]')).toHaveAttribute('aria-pressed','true');await page.locator('[data-owner-category="eyes"]').click();await expect(page.locator('[data-owner-choice="bright"]')).toHaveAttribute('aria-pressed','true');
});
