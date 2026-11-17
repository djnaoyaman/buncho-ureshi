import {test,expect} from '@playwright/test';
import {createWorld,createBird,validateWorld} from '../../src/engine.js';
const NOW=Date.UTC(2026,10,17,15);
async function record(page,world){return page.evaluate(world=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('world',world?'readwrite':'readonly'),q=world?tx.objectStore('world').put(world,'current'):tx.objectStore('world').get('current');tx.oncomplete=()=>{db.close();resolve(world||q.result)};tx.onerror=()=>reject(tx.error)};}),world);}
const identity=w=>({version:w.version,worldId:w.worldId,tick:w.tick,nextBird:w.nextBird,birds:w.birds,events:w.events,journal:w.journal,economy:w.economy,decor:w.decor,protagonist:w.protagonist});
for(const [width,height]of [[320,568],[393,852],[844,390]])test(`rounded egg in care remains undistorted and preserves its record ${width}px`,async({page},info)=>{
 await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(n=>{Date.now=()=>n;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);
 await page.goto('');const w=createWorld(NOW,541);w.paused=true;w.settings.motion=false;w.settings.careSound=false;const egg=createBird(w,{home:'resident',stage:'egg',name:'たまご'});await record(page,validateWorld(w));
 await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 const toggle=page.locator('.game-scene-controls-toggle');if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
 await page.locator('.game-bottom-dock [data-game-open-bird]').click();
 for(let i=0;i<4&&await page.locator('.game-bird-sheet .game-bird-carousel-face').getAttribute('data-bird-id')!==egg.id;i++)await page.locator('.game-bird-sheet [data-bird-step="1"]').click();
 await expect(page.locator('.game-bird-sheet .game-bird-carousel-face')).toHaveAttribute('data-bird-id',egg.id);
 const img=page.locator('.game-bird-sheet .game-sprite[data-stage="egg"] img');await expect(img).toHaveAttribute('src',/game-art\/egg\.svg$/);await expect.poll(()=>img.evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);
 const geometry=await img.evaluate(i=>{const r=i.getBoundingClientRect();return{ratio:r.width/r.height,natural:i.naturalWidth/i.naturalHeight}});expect(geometry.ratio).toBeCloseTo(.85,2);expect(geometry.natural).toBe(.85);
 const silhouette=await img.evaluate(async i=>{const c=document.createElement('canvas');c.width=850;c.height=1000;const ctx=c.getContext('2d');ctx.drawImage(i,0,0);const a=ctx.getImageData(0,0,850,1000).data,rows=[];for(let y=0;y<1000;y++){let n=0;for(let x=0;x<850;x++)if(a[(y*850+x)*4+3]>127)n++;if(n)rows.push(n)}return{ratio:Math.max(...rows)/rows.length,base:rows.at(-11)/Math.max(...rows)}});
 expect(silhouette.ratio).toBeGreaterThan(.72);expect(silhouette.ratio).toBeLessThan(.80);expect(silhouette.base).toBeGreaterThan(.25);
 await page.locator('.game-bird-sheet').evaluate(el=>el.scrollTop=0);await info.attach('rounded-egg-care',{body:await page.screenshot(),contentType:'image/png'});
 const before=identity(await record(page));await page.locator('.game-bird-sheet [data-bird-step="-1"]').click();await page.locator('.game-bird-sheet [data-bird-step="1"]').click();await expect(img).toBeVisible();
 await page.locator('[data-game-close-bird]').click();await page.locator('.game-bottom-dock [data-game-open-bird]').click();await expect(img).toBeVisible();expect(identity(await record(page))).toEqual(before);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

for(const stage of ['egg','chick'])for(const count of [1,2,6,9])test(`${count} ${stage} nestlings remain in the nest through portrait, landscape and selection`,async({page},info)=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.addInitScript(n=>{Date.now=()=>n;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);
 await page.goto('');const w=createWorld(NOW,541);w.paused=true;w.settings.motion=false;w.settings.careSound=false;
 const young=Array.from({length:count},()=>createBird(w,{home:'resident',stage,name:'こども'}));await record(page,validateWorld(w));
 await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');const before=identity(await record(page));
 for(const [width,height]of [[320,568],[393,852],[844,390]]){
  await page.setViewportSize({width,height});const toggle=page.locator('.game-scene-controls-toggle');if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
  const face=page.locator('.game-scene-toolbar .game-bird-carousel-face');
  for(let i=0;i<=count+1&&await face.getAttribute('data-bird-id')!==young[0].id;i++)await page.locator('.game-scene-toolbar [data-bird-step="1"]').click();
  await expect(face).toHaveAttribute('data-bird-id',young[0].id);
  const room=page.locator('.game-main .game-room');await expect(room).toHaveAttribute('data-selected-atmosphere','nest');
  await expect(page.locator(`.game-room-bird[data-bird-id="${young[0].id}"]`)).toBeInViewport();
  const geometry=await room.evaluate(el=>{const r=el.getBoundingClientRect();return [...el.querySelectorAll('.game-nestling')].map(n=>{const b=n.getBoundingClientRect();return{left:(b.left-r.left)/r.width,right:(b.right-r.left)/r.width,top:(b.top-r.top)/r.height,bottom:(b.bottom-r.top)/r.height,x:b.x,y:b.y,width:b.width,height:b.height,visible:b.right>0&&b.left<innerWidth&&b.bottom>0&&b.top<innerHeight}})});
  expect(geometry).toHaveLength(height<500?1:count);
  for(const b of geometry){expect(b.left).toBeGreaterThan(.78);expect(b.right).toBeLessThan(.89);expect(b.top).toBeGreaterThan(.52);expect(b.bottom).toBeLessThan(.60);expect(b.visible).toBe(true);}
  await info.attach(`nest-${stage}-${count}-${width}`,{body:await page.screenshot(),contentType:'image/png'});
  expect(identity(await record(page))).toEqual(before);
 }
 // A mature bird restores the normal camera; no selected-object offset leaks.
 const face=page.locator('.game-scene-toolbar .game-bird-carousel-face');for(let i=0;i<=count+1&&await face.getAttribute('data-bird-id')!==w.birds[0].id;i++)await page.locator('.game-scene-toolbar [data-bird-step="1"]').click();
 await expect(page.locator('.game-main .game-room')).not.toHaveAttribute('data-selected-atmosphere','nest');expect(identity(await record(page))).toEqual(before);
});
