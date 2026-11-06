import {test,expect} from '@playwright/test';
for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:320,height:420},{width:390,height:300}])test(`owner editor fits and saves at ${size.width}x${size.height}`,async({page})=>{
 await page.setViewportSize(size);await page.goto('game/');await page.waitForFunction(()=>document.body.dataset.gameIntro==='done');
 if(await page.locator('.game-scene-controls-toggle').getAttribute('aria-expanded')==='false')await page.locator('.game-scene-controls-toggle').click();
 await page.locator('#game-nav-open').click();await page.locator('[data-game-panel="settings"]').click();await page.locator('.game-owner-setting').click();
 const editor=page.locator('.buncho-owner-editor'), box=await editor.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(size.width+1);expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(size.height+1);
 for(const sel of ['.owner-editor-title','[data-owner-draft-state]','[data-owner-name]','[data-owner-save]','[data-owner-cancel]']) {const b=await page.locator(sel).boundingBox();expect(b.x).toBeGreaterThanOrEqual(box.x-1);expect(b.x+b.width).toBeLessThanOrEqual(box.x+box.width+1);expect(b.y).toBeGreaterThanOrEqual(box.y-1);expect(b.y+b.height).toBeLessThanOrEqual(box.y+box.height+1);await expect(page.locator(sel)).toBeInViewport({ratio:1});}
 await expect(editor.getByRole('heading',{name:'キャラクター設定'})).toBeVisible();
 expect(await editor.locator('[data-owner-category]').evaluateAll(nodes=>nodes.slice(0,3).map(node=>node.dataset.ownerCategory))).toEqual(['hair','eyes','outfit']);
 await expect(editor.locator('[data-owner-category]')).toHaveCount(8);
 await expect(editor.locator('[data-owner-save]')).toHaveText('保存する');
 await expect(editor.locator('[data-owner-cancel]')).toHaveText('保存せずに戻る');
 await page.locator('[data-owner-category="eyes"]').click();await page.locator('[data-owner-choice="bright"]').click();await page.locator('[data-owner-category="face"]').click();await page.locator('[data-owner-choice="oval"]').click();await expect(page.locator('[data-owner-draft-state]')).toHaveAttribute('data-unsaved','true');await page.locator('[data-owner-save]').click();
 await expect(page.locator('.game-owner-setting')).toBeFocused();await page.locator('.game-owner-setting').click();await expect(page.locator('[data-owner-draft-state]')).toHaveText('保存済みの設定');await page.locator('[data-owner-category="face"]').click();await expect(page.locator('[data-owner-choice="oval"]')).toHaveAttribute('aria-pressed','true');await page.locator('[data-owner-category="eyes"]').click();await expect(page.locator('[data-owner-choice="bright"]')).toHaveAttribute('aria-pressed','true');
});
