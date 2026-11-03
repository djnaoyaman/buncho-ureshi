import {test,expect} from '@playwright/test';

async function openSettings(page){
 const controls=page.locator('.game-scene-controls-toggle');
 if(await controls.getAttribute('aria-expanded')==='false')await controls.click();
 await page.locator('#game-nav-open').click();
 await page.locator('#game-menu-settings').click();
 await expect(page.locator('[data-settings-music] .game-music')).toBeVisible();
}
async function insideViewport(locator,page){
 const box=await locator.boundingBox(),size=page.viewportSize();
 expect(box).not.toBeNull();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0);
 expect(box.x+box.width).toBeLessThanOrEqual(size.width);expect(box.y+box.height).toBeLessThanOrEqual(size.height);
}
for(const width of [320,390])test(`compact music controls and all 13 choices at ${width}px`,async({page},info)=>{
 await page.setViewportSize({width,height:width===320?568:844});
 await page.addInitScript(()=>localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false})));
 await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 await openSettings(page);
 const chooser=page.locator('[data-music-choose]'),list=page.locator('.game-music-tracks'),off=page.locator('[data-music-off]'),volume=page.locator('.game-music-volume input');
 await expect(list).toBeHidden();await expect(chooser).toHaveAttribute('aria-expanded','false');
 await insideViewport(off,page);await insideViewport(volume,page);
 await info.attach(`music-collapsed-${width}`,{body:await page.screenshot(),contentType:'image/png'});
 await chooser.click();await expect(list).toBeVisible();await expect(list.locator('[data-music]')).toHaveCount(13);
 expect(await list.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
 await insideViewport(off,page);await insideViewport(volume,page);
 await info.attach(`music-chooser-${width}`,{body:await page.screenshot(),contentType:'image/png'});
 // Real clicks unlock the production audio path; last option must be reachable by scrolling.
 await list.locator('[data-music]').last().click();await expect(list).toBeHidden();await expect(chooser).toBeFocused();
 await expect(page.locator('.game-music')).toHaveAttribute('data-status','playing',{timeout:30000});
 await chooser.click();await list.locator('[data-music=village]').click();await expect(chooser).toBeFocused();
 await expect(page.locator('[data-music=village]')).toHaveAttribute('aria-pressed','true');
 await chooser.press('Enter');await expect(list).toBeVisible();await page.keyboard.press('Tab');
 await expect(list.locator('[data-music]').first()).toBeFocused();await page.keyboard.press('Escape');
 await expect(list).toBeHidden();await expect(chooser).toBeFocused();await expect(page.locator('.game-panel-overlay')).toBeVisible();
 await volume.focus();await volume.press('ArrowRight');const savedVolume=await volume.inputValue();
 await off.click();await expect(off).toHaveAttribute('aria-pressed','true');await expect(page.locator('.game-music')).toHaveAttribute('data-status','off');
 await chooser.click();await page.locator('[data-game-close-panel]').click();await openSettings(page);
 await expect(list).toBeHidden();await expect(off).toHaveAttribute('aria-pressed','true');await expect(volume).toHaveValue(savedVolume);
 await page.locator('[data-game-close-panel]').click();await page.locator('.game-world-exit').click();
 await expect(page.locator('#article-grid')).toBeVisible();await expect(page.locator('.game-music')).toHaveCount(0);
 await page.goBack();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await openSettings(page);
 await expect(page.locator('.game-music')).toHaveCount(1);await expect(list).toBeHidden();await expect(off).toHaveAttribute('aria-pressed','true');
});
