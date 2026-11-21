import {test,expect} from '@playwright/test';
import {setup} from '../fixtures/garden-terrain-browser.js';
test.use({hasTouch:true});
test('white next-flight IMG returns to grounded original button and opens own dialog',async({page},info)=>{
 const width=info.project.name==='chrome'?375:402;
 const nativePage=new Proxy(page,{get(target,key){if(key==='clock')return {install:({time})=>page.clock.setFixedTime(time),pauseAt:async()=>{},runFor:ms=>page.waitForTimeout(ms)};const v=Reflect.get(target,key);return typeof v==='function'?v.bind(target):v;}});
 await setup(nativePage,'java-rice',width,true,true);await page.setViewportSize({width,height:width===375?667:874});
 await page.waitForFunction(()=>{const i=document.querySelector('[data-white-flight-frame]');return i&&getComputedStyle(i).visibility==='visible'&&i.complete&&i.naturalWidth===280},{},{timeout:15000});
 await page.waitForFunction(()=>{const n=document.querySelector('[data-garden-household="b1"]'),p=n?.querySelector('.garden-bird-pose-window');return p&&getComputedStyle(p).visibility==='visible'&&n.dataset.actorState!=='fly'},{},{timeout:10000});
 const point=await page.locator('[data-garden-household="b1"]').evaluate(n=>{const r=n.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return {x,y,hit:n.contains(document.elementFromPoint(x,y)),id:n.dataset.gardenActorId}});expect(point.hit,JSON.stringify(point)).toBe(true);expect(point.id).toBe('b1');await page.touchscreen.tap(point.x,point.y);await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();await page.getByRole('button',{name:'文鳥の操作をとじる',exact:true}).click();await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
});
