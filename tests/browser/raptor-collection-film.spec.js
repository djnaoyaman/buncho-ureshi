import {test,expect} from '@playwright/test';
import {createWorld,validateWorld} from '../../src/engine.js';
import {ENDING_CATALOG} from '../../src/collection-endings.js';

const now=1794096000000;
const movie='/buncho-ureshi/game-endings/raptors-v5.mp4';
const species=ENDING_CATALOG.find(x=>x.id==='raptors').ids;
async function save(page,value){
 return page.evaluate(value=>new Promise((resolve,reject)=>{
  const request=indexedDB.open('buncho-ureshi-garden-v1',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('world');
  request.onerror=()=>reject(request.error);
  request.onsuccess=()=>{
   const db=request.result, tx=db.transaction('world',value?'readwrite':'readonly');
   const store=tx.objectStore('world'),op=value?store.put(value,'current'):store.get('current');
   tx.oncomplete=()=>{db.close();resolve(op.result);};
   tx.onabort=tx.onerror=()=>{db.close();reject(tx.error);};
  };
 }),value);
}
async function start(page,count,earned=false){
 await page.setViewportSize({width:402,height:874});
 await page.addInitScript(now=>{
  Date.now=()=>now;
  localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));
  localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));
 },now);
 const w=createWorld(now,418);
 w.paused=true;
 w.settings.motion=false;
 w.settings.careSound=false;
 w.encounters.raptor.lastArrivalAt=now;
 w.encounters.raptor.visits=species.slice(0,count).map(id=>({id,firstTick:0,lastTick:0,count:1,petPoints:0}));
 if(earned)w.collectionEndings.entries.push({id:'raptors',unlockedTick:0,acknowledged:true,lease:null,playback:'completed'});
 validateWorld(w);
 await page.goto('');await save(page,w);await page.goto('game/');
 await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 return w;
}
test('8 of 9 unique actual raptor visits do not unlock on load',async({page})=>{
 expect(species).toHaveLength(9);
 await start(page,8);
 await expect(page.locator('.game-ending-dialog')).toHaveCount(0);
 expect((await save(page)).collectionEndings.entries).toEqual([]);
});
test('9 actual species unlock the existing raptor film mapped to the immutable v5',async({page})=>{
 await start(page,9);
 const dialog=page.locator('.game-ending-dialog');
 await expect(dialog).toBeVisible();
 await expect(dialog.locator('video')).toHaveAttribute('src',new RegExp(movie.replaceAll('.','\\.')+'$'));
 await expect.poll(async()=>(await save(page)).collectionEndings.entries.map(e=>e.id)).toEqual(['raptors']);
});
test('earned raptor history does not autoplay on load; diary replay decodes approved v5 and seeks',async({page})=>{
 const saved=await start(page,9,true);
 await expect(page.locator('.game-ending-dialog')).toHaveCount(0);
 expect((await save(page)).collectionEndings.entries).toEqual(saved.collectionEndings.entries);
 if(await page.locator('.game-scene-controls-toggle').getAttribute('aria-expanded')!=='true')await page.locator('.game-scene-controls-toggle').click();
 await page.locator('#game-nav-open').click();await page.locator('#game-menu-diary').click();
 await page.locator('[data-ending-replay="raptors"]').click();
 const dialog=page.locator('.game-ending-dialog'),video=dialog.locator('video');
 await expect(dialog).toBeVisible();
 await expect(video).toHaveAttribute('src',new RegExp(movie.replaceAll('.','\\.')+'$'));
 await video.evaluate(v=>{v.framesObserved=0;const observed=()=>{v.framesObserved++;if(v.isConnected)v.requestVideoFrameCallback(observed);};v.requestVideoFrameCallback(observed);});
 if(await video.evaluate(v=>v.paused))await dialog.locator('[data-ending-play]').click();
 await expect.poll(()=>video.evaluate(v=>v.framesObserved),{timeout:20000}).toBeGreaterThan(10);
 expect(await video.evaluate(v=>[v.videoWidth,v.videoHeight,v.error?.code??null])).toEqual([720,1280,null]);
 expect(await video.evaluate(v=>v.duration)).toBeCloseTo(66.375,2);
 await video.evaluate(v=>{window.endedNative=false;v.addEventListener('ended',e=>{window.endedNative=e.isTrusted;},{once:true});v.currentTime=v.duration-.8;});
 await expect(dialog).toHaveCount(0,{timeout:30000});
 expect(await page.evaluate(()=>window.endedNative)).toBe(true);
 expect((await save(page)).collectionEndings.entries).toEqual(saved.collectionEndings.entries);
});
