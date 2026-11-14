import {test,expect} from '@playwright/test';
import {createWorld,createBird} from '../../src/engine.js';
const NOW=Date.UTC(2026,10,14,8);
for(const size of [{width:320,height:568},{width:375,height:667},{width:390,height:844},{width:900,height:700}])test(`home compact aligned controls ${size.width}`,async({page},info)=>{
 await page.setViewportSize(size);
 await page.addInitScript(now=>{Date.now=()=>now;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);
 await page.goto('');const world=createWorld(NOW);world.paused=true;world.care.cleanliness=40;createBird(world,{home:'resident',name:'こはな'});
 await page.evaluate(w=>new Promise((resolve,reject)=>{const q=indexedDB.open('buncho-ureshi-garden-v1',1);q.onupgradeneeded=()=>q.result.createObjectStore('world');q.onerror=()=>reject(q.error);q.onsuccess=()=>{const db=q.result,tx=db.transaction('world','readwrite');tx.objectStore('world').put(w,'current');tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)};}),world);
 await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await page.locator('.game-scene-controls-toggle').click();
 const nav=await page.locator('.game-field-nav').boundingBox(),toolbar=await page.locator('.game-scene-toolbar').boundingBox(),picker=await page.locator('.game-bird-carousel').boundingBox(),clean=await page.locator('.game-garden-care').boundingBox();
 expect(Math.abs(nav.x-toolbar.x)).toBeLessThan(1);expect(Math.abs(nav.width-toolbar.width)).toBeLessThan(1);expect(Math.abs(picker.y-clean.y)).toBeLessThan(1);expect(picker.x+picker.width).toBeLessThan(clean.x);expect(clean.x+clean.width).toBeLessThanOrEqual(size.width-11);
 await expect(page.locator('[data-game-care="clean"]')).toHaveText('おそうじ');await expect(page.locator('[data-game-cleanliness-value]')).toBeVisible();
 for(const sel of ['meter','output']){const b=await page.locator('.game-garden-care '+sel).boundingBox();expect(b.x).toBeGreaterThanOrEqual(clean.x);expect(b.x+b.width).toBeLessThanOrEqual(clean.x+clean.width+1);}
 await page.locator('[data-game-care="clean"]').click();await expect(page.locator('[data-game-cleanliness-value]')).toHaveText('100 / 100');
 const notes=await page.locator('.game-garden-care .game-care-feedback,.game-garden-care [data-care-receipt]').all();
 if(notes.length>1){const a=await notes[0].boundingBox(),b=await notes[1].boundingBox();if(a&&b)expect(a.y+a.height).toBeLessThanOrEqual(b.y+1);}
 const dock=page.locator('.game-bottom-dock');await expect(dock.locator(':scope > button')).toHaveCount(4);await expect(dock.locator('[data-home-close]')).toHaveCount(0);
 for(const button of await page.locator('.game-field-nav button,.game-bottom-dock button,.game-bird-carousel [data-bird-step],.game-garden-care button,.game-status button').all()){
  const b=await button.boundingBox();expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);expect(b.x).toBeGreaterThanOrEqual(0);expect(b.y+b.height).toBeLessThanOrEqual(size.height);await button.click({trial:true});
 }
 await page.screenshot({path:info.outputPath(`home-compact-${size.width}.png`)});
 await page.locator('[data-bird-step="1"]').click();await expect(page.locator('.game-bird-carousel-face strong')).toHaveText('こはな');
 await page.locator('#game-open-bird').click();await expect(page.locator('#game-sheet-title')).toHaveText('こはな');await page.locator('[data-game-close-bird]').click();
 await page.locator('#game-nav-open').click();await expect(page.locator('.game-secondary-menu [data-home-close]')).toBeVisible();await page.locator('[data-game-close-menu]').click();
 await page.locator('.game-field-nav [data-game-panel="outdoors"]').click();
 await expect(page.locator('.finch-garden-dock')).toBeVisible();await expect(page.locator('.game-scene-controls-toggle')).toHaveText('');await expect(page.locator('.game-scene-mode-icon')).toHaveAttribute('data-scene-mode-icon','watch');
 await page.screenshot({path:info.outputPath(`garden-preserved-${size.width}.png`)});
});
