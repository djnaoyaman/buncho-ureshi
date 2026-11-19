import {test,expect} from '@playwright/test';
import {setup,measure} from '../fixtures/garden-terrain-browser.js';
import {terrainFor,inside} from '../../src/garden-terrain-plan.js';
const ids=['java-rice','bird-diamond-firetail','bird-zebra-finch','kazaguruma'];
for(const id of ids)for(const width of [320,375,390,402,430])test(`ground-only ${id} ${width}`,async({page},info)=>{
 await setup(page,id,width,true,true);
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-terrain-motion','grounded');
 const bird=page.locator('.finch-garden-household'),before=await measure(page);expect(before).toHaveLength(1);
 await page.mouse.move(0,0);await page.locator('#finch-garden-title').focus();
 const positions=new Set();
 for(let n=0;n<38;n++){
  await page.clock.runFor(500);
  // A committed-world redraw briefly closes the existing image readiness gate.
  // Wait for real decode/layout; hidden replacement buttons are not interactive yet.
  await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
  await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-terrain-motion','grounded');
  for(const b of await measure(page)){
   expect(b.hit,JSON.stringify(b)).toBe(true);expect(b.filter).toBe('none');expect(b.src).toBe(before[0].src);
   expect(Math.round(b.width*1000)/1000).toBeGreaterThanOrEqual(44);
   expect(inside(b.point,terrainFor(id).surfaces[terrainFor(id).primary])).toBe(true);
   positions.add(b.point.join(','));
  }
 }
 expect(positions.size).toBeGreaterThan(2);
 await expect(page.locator('.garden-terrain-flight,.garden-terrain-mask')).toHaveCount(0);
 await page.screenshot({path:info.outputPath('ground.png')});
 await bird.focus();const held=await bird.getAttribute('style');await page.clock.runFor(6000);
 expect(await bird.getAttribute('style')).toBe(held);await expect(bird).toBeFocused();
 await page.keyboard.press('Enter');await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'文鳥の操作をとじる',exact:true}).click();
 await page.locator('[data-garden-details=about] > summary').click();
 await expect(page.locator('[data-garden-track-credit]')).toHaveCount(1);
 await page.locator('[data-garden-details=about] > summary').click();
 expect((await measure(page)).map(b=>b.id)).toEqual(before.map(b=>b.id));
});
for(const id of ids)for(const density of [false,'dense'])test(`safe roster ${id} ${density||'normal'}`,async({page})=>{
 await setup(page,id,320,true,density);
 // Narrow surfaces must not be widened to force the whole roster onto them.
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-terrain-motion','static');
 const before=await measure(page);expect(before).toHaveLength(density?8:5);
 await page.clock.runFor(30000);expect((await measure(page)).map(b=>b.style)).toEqual(before.map(b=>b.style));
 for(const b of await measure(page)){expect(b.hit,JSON.stringify(b)).toBe(true);expect(b.filter).toBe('none');}
 await expect(page.locator('.garden-terrain-flight')).toHaveCount(0);
});
for(const id of ids)test(`ground holds and resumes ${id}`,async({page})=>{
 await setup(page,id,390,true,true);
 await page.emulateMedia({reducedMotion:'reduce'});await page.clock.runFor(1000);
 const held=await measure(page);await page.clock.runFor(7000);expect(await measure(page)).toEqual(held);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 const hidden=await measure(page);await page.clock.runFor(6000);expect(await measure(page)).toEqual(hidden);
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 await page.setViewportSize({width:844,height:390});await page.clock.runFor(1500);
 for(const b of await measure(page))expect(b.hit).toBe(true);
 await page.setViewportSize({width:390,height:844});await page.clock.runFor(1500);
 await page.locator('[data-garden-scroll=next]').click();await page.clock.runFor(1500);
 await expect(page.locator('.finch-garden-stage')).not.toHaveAttribute('data-garden-id',id);
 await page.locator('[data-garden-scroll=previous]').click();await page.clock.runFor(1500);
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-garden-id',id);
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-terrain-motion','grounded');
 for(const b of await measure(page))expect(b.hit).toBe(true);
});
for(const id of ids)test(`ground motion setting off ${id}`,async({page})=>{
 await setup(page,id,375,false,true);const held=await measure(page);
 await page.clock.runFor(30000);expect(await measure(page)).toEqual(held);
});
