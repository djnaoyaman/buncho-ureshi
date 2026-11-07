import {test,expect} from '@playwright/test';
for (const [width,height] of [[320,568],[844,390]]) test(`garden selector remains usable ${width}x${height}`,async({page})=>{
 await page.setViewportSize({width,height});
 await page.addInitScript(()=>{localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));});
 await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 await page.locator('.game-scene-controls-toggle').click();await page.locator('.game-field-nav [data-game-panel=outdoors]').click();
 const nav=page.locator('.finch-garden-selector'), next=page.getByRole('button',{name:'次の庭を表示'});
 const scrollLeft=()=>page.evaluate(()=>document.querySelector('.finch-garden-selector').scrollLeft);
 const lastInside=()=>page.evaluate(()=>{const el=document.querySelector('.finch-garden-selector [data-garden-select=onsen]'),a=el.getBoundingClientRect(),b=el.parentElement.getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1;});
 await expect(next).toBeVisible();
 // The host can replace these nodes between locator resolution and evaluation.
 // Wait only for actionability, then resolve, click and measure in one task.
 // Return an object even for 0 so a failed synchronous movement is not retried.
 const movement=await page.waitForFunction(()=>{
  const button=document.querySelector('[data-garden-scroll="next"]');
  const selector=button?.parentElement.querySelector('.finch-garden-selector');
  if(!button||button.disabled||!selector?.clientWidth)return false;
  const before=selector.scrollLeft;button.click();
  return {before,after:selector.scrollLeft,connected:selector.isConnected};
 },null,{timeout:10000});
 const measured=await movement.jsonValue();await movement.dispose();
 expect(measured.connected).toBe(true);expect(measured.before).toBe(0);
 expect(measured.after).toBeGreaterThan(0);
 await page.getByRole('button',{name:'前の庭を表示'}).click();await expect.poll(scrollLeft).toBe(0);
 await next.click();await expect.poll(scrollLeft).toBeGreaterThan(0);
 const last=nav.locator('[data-garden-select=onsen]');await last.click();await expect(last).toHaveAttribute('aria-current','page');
 await expect.poll(lastInside).toBe(true);
 await page.waitForTimeout(1200);await expect.poll(lastInside).toBe(true);
 await page.getByRole('button',{name:'前の庭を表示'}).click();await expect.poll(()=>page.evaluate(()=>{const el=document.querySelector('.finch-garden-selector');return el.scrollLeft<el.scrollWidth-el.clientWidth;})).toBe(true);
 await page.locator('.game-scene-controls-toggle').click();await expect(next).not.toBeVisible();
});
