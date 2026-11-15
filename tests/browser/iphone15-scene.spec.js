import {test,expect} from '@playwright/test';
import {createWorld} from '../../src/engine.js';
const NOW=Date.UTC(2026,10,15,12);
async function record(page,w){return page.evaluate(w=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,t=db.transaction('world',w?'readwrite':'readonly'),q=w?t.objectStore('world').put(w,'current'):t.objectStore('world').get('current');t.oncomplete=()=>{db.close();resolve(q.result)};t.onerror=()=>reject(t.error)};}),w);}
for(const legacy of [false,true])test(`home and garden geometry with ${legacy?'Safari15 unit fallback':'native container units'}`,async({page},info)=>{
 await page.setViewportSize({width:375,height:667});await page.emulateMedia({reducedMotion:'reduce'});
 if(legacy){
  await page.addInitScript(()=>{const supports=CSS.supports.bind(CSS);CSS.supports=(...args)=>args.some(v=>/cq[wh]/.test(v))?false:supports(...args);});
  // Treat CQ tokens as unknown lengths, as Safari 15 does. A UA string alone
  // would leave the modern engine supporting them and hide the regression.
  await page.route(/\/src\/(game\.css|encounter-ui\.css|encounter-ui\.js)(\?|$)/,async route=>{
   const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace(/(\d*\.?\d+)cq([wh])/g,'$1unsupported$2')});
  });
 }
 await page.addInitScript(now=>{Date.now=()=>now;Math.random=()=>.99;localStorage.setItem('buncho.music.v1','{"enabled":false}');localStorage.setItem('buncho.care-sound-choice.v1','{"explicit":true,"enabled":false}');},NOW);
 await page.goto('');const world=createWorld(NOW);world.paused=true;await record(page,world);await page.goto('game/');
 await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 const room=page.locator('.game-main .game-room');
 await expect(async()=>{const box=await room.boundingBox();expect(box.width).toBeGreaterThanOrEqual(375);expect(box.height).toBeGreaterThan(400);}).toPass();
 await expect(room.locator('.game-room-bird').first()).toBeVisible();
 expect(await room.locator('.game-habitat img').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
 if(legacy)expect(await page.locator('.game-main').evaluate(n=>n.style.getPropertyValue('--game-cqw'))).toBe('3.75px');
 const before=await record(page);await page.screenshot({path:info.outputPath(`home-${legacy}.png`)});
 const toggle=page.locator('.game-scene-controls-toggle');if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
 await page.locator('.game-field-nav [data-game-panel=outdoors]').click();
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
 for(const size of [{width:375,height:667},{width:320,height:568}]){
  await page.setViewportSize(size);
  await expect(async()=>{
   const plane=await page.locator('.finch-garden-image-plane').first().boundingBox();expect(plane.width).toBeGreaterThanOrEqual(size.width-1);expect(plane.height).toBeGreaterThan(400);
  }).toPass();
  const visibleBird=page.locator('.finch-garden-household,.finch-garden-friend').first();await expect(visibleBird).toBeVisible();
  const bird=await visibleBird.boundingBox();expect(bird.width).toBeGreaterThanOrEqual(44);expect(bird.y).toBeGreaterThanOrEqual(0);expect(bird.y).toBeLessThan(size.height);
 }
 await page.screenshot({path:info.outputPath(`garden-${legacy}.png`)});
 await page.locator('[data-game-close-panel]').click();await expect(room).toBeVisible();
 const after=await record(page);for(const key of ['worldId','birds','decor','economy'])expect(after[key]).toEqual(before[key]);
 await page.reload();await expect(page.locator('.game-main .game-room-bird').first()).toBeVisible();
});
