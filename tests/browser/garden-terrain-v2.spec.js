import {test,expect} from '@playwright/test';
import {setup,snapshotGarden} from '../fixtures/garden-terrain-browser.js';
const ids=['yuyake','bird-eurasian-bullfinch','bird-white-winged-crossbill','bali-terrace'];
for(const id of ids)for(const width of [320,390,430])test(`v2 actual five birds ${id} ${width}`,async({page},info)=>{
 await setup(page,id,width);
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-terrain-motion','grounded');
 const start=await snapshotGarden(page);expect(start.birds).toHaveLength(5);
 const samples=[];
 for(let i=0;i<12;i++){
  const s=await snapshotGarden(page);samples.push(s);
  for(const b of s.birds){expect(b.hit).toBe(true);expect(b.centerInViewport).toBe(true);expect(Math.round(b.rect.width*1000)/1000).toBeGreaterThanOrEqual(44);expect(Math.round(b.rect.height*1000)/1000).toBeGreaterThanOrEqual(44);}
  for(let a=0;a<s.birds.length;a++)for(let b=a+1;b<s.birds.length;b++){
   const x=s.birds[a].rect,y=s.birds[b].rect;
   expect(x.left<y.right&&x.right>y.left&&x.top<y.bottom&&x.bottom>y.top).toBe(false);
  }
  await page.clock.runFor(250);
 }
 await info.attach('five-bird-hits',{body:JSON.stringify(samples),contentType:'application/json'});
 await page.screenshot({path:info.outputPath('five-birds.png')});
 const button=page.locator('.finch-garden-household').first();
 await button.focus();const held=await button.getAttribute('style');await page.clock.runFor(2000);expect(await button.getAttribute('style')).toBe(held);await expect(button).toBeFocused();
 const name=(await button.getAttribute('aria-label')).replace('とふれあう','');
 await button.click();await expect(page.locator('.game-bird-sheet[open]')).toBeVisible();await expect(page.locator('#game-sheet-title')).toContainText(name);
 await page.keyboard.press('Escape');await expect(page.locator('.game-bird-sheet[open]')).toHaveCount(0);await expect(page.locator('.finch-garden-household').first()).toBeFocused();
});
