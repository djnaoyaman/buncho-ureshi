import {test,expect} from '@playwright/test';
import {createWorld} from '../../src/engine.js';
const NOW=Date.UTC(2026,10,11,16);
async function record(page,w){return page.evaluate(w=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onsuccess=()=>{const db=r.result,tx=db.transaction('world',w?'readwrite':'readonly'),q=w?tx.objectStore('world').put(w,'current'):tx.objectStore('world').get('current');tx.oncomplete=()=>{db.close();resolve(q.result)};tx.onerror=()=>reject(tx.error)};r.onerror=()=>reject(r.error)}),w);}
async function layout(page){
 const selectors=['.game-field-bar .game-wallet','.game-field-nav','.game-scene-toolbar .game-bird-carousel','.game-scene-toolbar .game-garden-care','.game-main>.game-heading [data-game-action=pause]'];
 // Read the whole layout in one browser task so a background redraw cannot
 // detach one element between separate boundingBox protocol calls.
 const measured=await page.evaluate(selectors=>{const box=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,selector:s};};return {boxes:selectors.map(box),clean:box('.game-scene-toolbar [data-game-care=clean]'),meter:box('[data-game-cleanliness]'),out:box('[data-game-cleanliness-value]'),hint:box('.game-clean-guidance')};},selectors);
 const {boxes,meter,out}=measured;for(const box of boxes){expect(box).toBeTruthy();expect(box.height,box.selector).toBeGreaterThan(0);}

 const width=page.viewportSize().width;
 for(const b of boxes){expect(b.x,b.selector).toBeGreaterThanOrEqual(-1);expect(b.x+b.width,b.selector).toBeLessThanOrEqual(width+1);}
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];const overlap=Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));expect(overlap,`${a.selector} / ${b.selector}`).toBeLessThan(1);}
 const b=measured.clean;expect(b).toBeTruthy();expect(b.height).toBeGreaterThanOrEqual(44);expect(b.width).toBeGreaterThanOrEqual(44);
 expect(meter).toBeTruthy();expect(out).toBeTruthy();expect(meter.height).toBeGreaterThan(0);expect(out.height).toBeGreaterThan(0);expect(Math.abs(meter.y+meter.height/2-(out.y+out.height/2))).toBeLessThan(4);return measured.hint;
}
for(const [width,height] of [[320,568],[402,680],[390,844]])test(`home cleaning owns a clear row ${width}x${height}`,async({page},info)=>{
 await page.setViewportSize({width,height});await page.addInitScript(n=>{Date.now=()=>n;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);
 await page.goto('');const w=createWorld(NOW);w.paused=true;w.care.cleanliness=20;await record(page,w);await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await page.evaluate(()=>document.fonts.ready);
 const toggle=page.locator('.game-scene-controls-toggle');if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
 await expect(page.locator('.game-clean-guidance')).toHaveText('ゆかが よごれているよ。');const before=await record(page);const hint=await layout(page);
 expect(hint.width).toBeGreaterThan(200);expect(hint.height).toBeLessThan(60);
 await info.attach('dirty-home',{body:await page.screenshot(),contentType:'image/png'});expect(await record(page)).toEqual(before);
 await page.locator('.game-scene-toolbar [data-game-care=clean]').click();await expect(page.locator('[data-game-cleanliness-value]')).toHaveText('100 / 100');await expect(page.locator('.game-clean-guidance')).toHaveCount(0);await layout(page);
 const after=await record(page);expect(after.birds).toEqual(before.birds);expect(after.economy.gold).toBe(before.economy.gold);expect(after.worldId).toBe(before.worldId);expect(after.care.cleanliness).toBe(100);
 await info.attach('clean-home',{body:await page.screenshot(),contentType:'image/png'});await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();await expect(page.locator('[data-game-cleanliness-value]')).toHaveText('100 / 100');await layout(page);
});
