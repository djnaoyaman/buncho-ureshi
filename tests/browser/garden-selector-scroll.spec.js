import {test,expect} from '@playwright/test';
for (const [width,height] of [[320,568],[844,390]]) test(`garden selector remains usable ${width}x${height}`,async({page})=>{
 await page.setViewportSize({width,height});
 await page.addInitScript(()=>{localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));});
 await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 await page.locator('.game-scene-controls-toggle').click();await page.locator('.game-field-nav [data-game-panel=outdoors]').click();
 const nav=page.locator('.finch-garden-selector'), next=page.getByRole('button',{name:'次の庭を表示'});
 await expect(next).toBeVisible();
 // Movement must be synchronous so a render in the next task cannot interrupt it.
 expect(await next.evaluate(el=>{el.click();return el.parentElement.querySelector('.finch-garden-selector').scrollLeft;})).toBeGreaterThan(0);
 await page.getByRole('button',{name:'前の庭を表示'}).click();await expect.poll(()=>nav.evaluate(e=>e.scrollLeft)).toBe(0);
 await next.click();await expect.poll(()=>nav.evaluate(e=>e.scrollLeft)).toBeGreaterThan(0);
 const last=nav.locator('[data-garden-select=onsen]');await last.click();await expect(last).toHaveAttribute('aria-current','page');
 await expect.poll(()=>last.evaluate(el=>{const a=el.getBoundingClientRect(),b=el.parentElement.getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1;})).toBe(true);
 await page.waitForTimeout(1200);await expect.poll(()=>last.evaluate(el=>{const a=el.getBoundingClientRect(),b=el.parentElement.getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1;})).toBe(true);
 await page.getByRole('button',{name:'前の庭を表示'}).click();await expect.poll(()=>nav.evaluate(e=>e.scrollLeft)).toBeLessThan(await nav.evaluate(e=>e.scrollWidth-e.clientWidth));
 await page.locator('.game-scene-controls-toggle').click();await expect(next).not.toBeVisible();
});
