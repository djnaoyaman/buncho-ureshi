import {test,expect} from '@playwright/test';
import {COLOR_PLAY_NOW as NOW,colorPlayWorld} from '../fixtures/color-play.js';
async function record(page,w){return page.evaluate(w=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,t=db.transaction('world',w?'readwrite':'readonly'),s=t.objectStore('world'),q=w?s.put(w,'current'):s.get('current');t.oncomplete=()=>{db.close();resolve(q.result)};t.onerror=()=>reject(t.error)};}),w)}
for(const width of [320,375,402])test(`committed home, static fallback and preview isolation at ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:width===402?874:667});await page.addInitScript(now=>{Date.now=()=>now;Math.random=()=>.99;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);
 await page.goto('');const w=colorPlayWorld();w.birds[0].needs.food=40;w.birds[0].needs.energy=40;await record(page,w);await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 const room=page.locator('.game-room');await expect(room).toHaveAttribute('data-atmosphere','hungry');await expect(room.locator('.game-feed-hulls')).toHaveCount(1);await expect(room.locator('.game-home-daylight')).toHaveCount(1);
 const before=await record(page);await expect.poll(()=>room.locator('.game-habitat img').evaluate(e=>e.complete&&e.naturalWidth>0)).toBe(true);
 expect(await room.locator('.game-floor-soil').count()).toBe(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath(`home-static-${width}.png`)});await page.emulateMedia({reducedMotion:'reduce'});expect(await record(page)).toEqual(before);
 await page.locator('.game-scene-controls-toggle').click();await page.locator('.game-bottom-dock [data-game-panel="decorate"]').click();
 const preview=page.locator('.game-preview-room');await expect(preview).toBeVisible();await expect(preview.locator('.game-feed-hulls,.game-home-daylight')).toHaveCount(0);
 await page.locator('[data-game-close-panel]').first().click();await expect(page.locator('.game-room')).toBeVisible();expect(await record(page)).toEqual(before);
});
