import {test,expect} from '@playwright/test';
import {createWorld} from '../../src/engine.js';
const NOW=Date.UTC(2026,10,14,8);
for(const size of [{width:320,height:568},{width:375,height:667}])test(`watch/touch icon toggle ${size.width}`,async({page},info)=>{
 await page.setViewportSize(size);
 await page.addInitScript(now=>{Date.now=()=>now;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);
 await page.goto('');const w=createWorld(NOW);w.paused=true;
 await page.evaluate(w=>new Promise((resolve,reject)=>{const q=indexedDB.open('buncho-ureshi-garden-v1',1);q.onupgradeneeded=()=>q.result.createObjectStore('world');q.onerror=()=>reject(q.error);q.onsuccess=()=>{const db=q.result,tx=db.transaction('world','readwrite');tx.objectStore('world').put(w,'current');tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)};}),w);
 await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 const toggle=page.locator('.game-scene-controls-toggle');
 for(const place of ['home','garden']){
  if(place==='garden'){if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();await page.locator('.game-field-nav [data-game-panel=outdoors]').click();}
  for(let i=0;i<3;i++){
   const open=await toggle.getAttribute('aria-expanded')==='true';await expect(toggle).toHaveText('');await expect(toggle).toHaveAccessibleName(open?'よく見る · 操作をたたんで景色を見る':'ふれ合う · 操作メニューを開く');
   await expect(toggle.locator('svg')).toHaveAttribute('data-scene-mode-icon',open?'watch':'touch');
   const box=await toggle.boundingBox();expect(box.width).toBe(52);expect(box.height).toBe(52);expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(size.width);expect(box.y+box.height).toBeLessThanOrEqual(size.height);
   await page.screenshot({path:info.outputPath(`${place}-${open?'watch':'touch'}-${size.width}.png`)});
   await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded',String(!open));await expect(toggle).toBeFocused();
  }
 }
});
