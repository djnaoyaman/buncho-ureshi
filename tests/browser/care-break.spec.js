import {test,expect} from '@playwright/test';
import {createWorld,validateWorld} from '../../src/engine.js';
const NOW=Date.UTC(2026,10,12,3);
async function record(page,w){return page.evaluate(w=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onsuccess=()=>{const db=r.result,tx=db.transaction('world',w?'readwrite':'readonly'),q=w?tx.objectStore('world').put(w,'current'):tx.objectStore('world').get('current');tx.oncomplete=()=>{db.close();resolve(q.result)};tx.onerror=()=>reject(tx.error)};r.onerror=()=>reject(r.error)}),w);}
for(const [width,height] of [[320,568],[390,844]])test(`full gauges allow a quiet response and a saved break at ${width}px`,async({page},info)=>{
 await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(n=>{Date.now=()=>n;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);
 await page.goto('');const w=createWorld(NOW);w.paused=true;w.settings.motion=false;w.settings.careSound=false;for(const b of w.birds)b.needs.food=b.needs.energy=100;w.care.cleanliness=100;await record(page,w);
 await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await page.locator('.game-scene-controls-toggle').click();await page.locator('.game-bottom-dock [data-game-open-bird]').click();
 await expect(page.locator('[data-next-care]')).toHaveCount(0);await expect(page.locator('[data-care-receipt]')).toHaveCount(0);await expect(page.locator('#game-care-feed')).toBeDisabled();
 const before=validateWorld(await record(page));await page.locator('#game-care-pet').focus();await page.keyboard.press('Enter');
 await expect(page.locator('.game-care-feedback')).toContainText('うれしそう');await expect(page.locator('[data-care-receipt]')).toContainText('ほぞんしたよ');
 const after=validateWorld(await record(page));expect(after).toEqual(before);
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.locator('[data-care-receipt]').scrollIntoViewIfNeeded();await expect(page.locator('[data-care-receipt]')).toBeInViewport();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await info.attach('saved-care-break',{body:await page.screenshot(),contentType:'image/png'});
 await page.locator('#game-sheet-close').click();await expect(page.locator('.game-bird-sheet')).not.toBeVisible();await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');expect(validateWorld(await record(page))).toEqual(after);await expect(page.locator('[data-care-receipt]')).toHaveCount(0);
});
