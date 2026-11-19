import {test,expect} from '@playwright/test';
import {createWorld} from '../../src/engine.js';
test.use({isMobile:true,hasTouch:true});
const NOW=Date.UTC(2026,10,19,4);
async function record(page,world){return page.evaluate(w=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onsuccess=()=>{const db=r.result,t=db.transaction('world',w?'readwrite':'readonly'),q=w?t.objectStore('world').put(w,'current'):t.objectStore('world').get('current');t.oncomplete=()=>{db.close();resolve(q.result)};t.onerror=()=>reject(t.error)};}),world);}
for(const [width,height] of [[320,844],[375,844],[402,844],[320,420],[375,568],[402,600],[375,667]])test(`readable gacha guide and unchanged save ${width}x${height}`,async({page},info)=>{
 await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(n=>{Date.now=()=>n;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));},NOW);
 await page.goto('');const w=createWorld(NOW);w.paused=true;w.decor.points=w.decor.lifetimePoints=100;await record(page,w);await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await page.evaluate(()=>document.fonts.ready);
 const before=await record(page);const toggle=page.locator('.game-scene-controls-toggle');if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();await page.locator('.game-bottom-dock [data-game-panel=decorate]').click();
 const intro=page.locator('.game-decor-intro'),guide=intro.locator('.kids-steps');
 await expect(intro.locator('.game-wallet')).toBeInViewport();
 await page.screenshot({path:info.outputPath('gacha-intro.png')});await info.attach('gacha-intro',{path:info.outputPath('gacha-intro.png'),contentType:'image/png'});
 if(height<=600){
  await expect(page.locator('[data-decor-draw]')).toBeInViewport({ratio:1});await expect(page.locator('[data-decor-filter=all]')).toBeInViewport();
  await guide.scrollIntoViewIfNeeded();await expect(guide).toBeInViewport();
 }else{
  const box=await intro.boundingBox();expect(box.height).toBeLessThan(260);await expect(page.locator('.game-gacha-feature img')).toBeInViewport();
 }
 for(const step of await guide.locator('li').all()){const box=await step.boundingBox();expect(box.width).toBeGreaterThan(180);expect(box.height).toBeLessThan(65);}
 for(const button of await page.locator('.game-gacha-machines button').all()){const box=await button.boundingBox();expect(box.height).toBeGreaterThanOrEqual(44);expect(box.width).toBeGreaterThanOrEqual(44);}
 const wallet=await intro.locator('.game-wallet').boundingBox();expect(wallet.x).toBeGreaterThanOrEqual(0);expect(wallet.x+wallet.width).toBeLessThanOrEqual(width);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await record(page)).toEqual(before);
 for(let i=0;i<2;i++){await page.locator('[data-game-close-panel]').click();await expect(intro).toHaveCount(0);await page.locator('.game-bottom-dock [data-game-panel=decorate]').click();await expect(intro.locator('.game-wallet')).toBeInViewport();expect(await record(page)).toEqual(before);}
});
