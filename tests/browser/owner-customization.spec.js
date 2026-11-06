import {test,expect} from '@playwright/test';
// The withdrawn editor stays absent at the viewports it previously occupied.
for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:320,height:420},{width:390,height:300}])test(`settings remain usable without character editor at ${size.width}x${size.height}`,async({page})=>{
 await page.setViewportSize(size);await page.goto('game/');await page.waitForFunction(()=>document.body.dataset.gameIntro==='done');
 if(await page.locator('.game-scene-controls-toggle').getAttribute('aria-expanded')==='false')await page.locator('.game-scene-controls-toggle').click();
 await page.locator('#game-nav-open').click();await expect(page.locator('#game-menu-owner')).toHaveCount(0);await page.locator('#game-menu-settings').click();
 await expect(page.locator('.game-owner-setting,.buncho-owner-editor,[data-owner-save],[data-owner-name]')).toHaveCount(0);await expect(page.locator('#game-settings-title')).toBeVisible();
 const close=page.locator('[data-game-close-panel]');await expect(close).toBeInViewport({ratio:1});
 const overlay=await page.locator('.game-panel-overlay').boundingBox();expect(overlay.x).toBeGreaterThanOrEqual(0);expect(overlay.x+overlay.width).toBeLessThanOrEqual(size.width+1);expect(overlay.y).toBeGreaterThanOrEqual(0);expect(overlay.y+overlay.height).toBeLessThanOrEqual(size.height+1);
 const motion=page.locator('[data-game-motion]'),previous=await motion.isChecked();await motion.setChecked(!previous);await expect(motion).toBeChecked({checked:!previous});await motion.setChecked(previous);
 await close.click();await expect(page.locator('#game-nav-open')).toBeFocused();
});
