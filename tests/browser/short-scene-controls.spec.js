import {test,expect} from '@playwright/test';
import {createWorld,createBird,validateWorld} from '../../src/engine.js';
const now=Date.UTC(2026,10,2,12),dbName='buncho-ureshi-garden-v1';
async function ready(page){
 await page.addInitScript(now=>{Date.now=()=>now;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},now);
 const world=createWorld(now);world.paused=true;world.care.cleanliness=40;
 for(let i=1;i<10;i++)createBird(world,{home:'resident',name:`ながいなまえの文鳥${i}`});
 validateWorld(world);await page.goto('');
 await page.evaluate(({dbName,world})=>new Promise((resolve,reject)=>{const open=indexedDB.open(dbName,1);open.onupgradeneeded=()=>open.result.createObjectStore('world');open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,tx=db.transaction('world','readwrite');tx.objectStore('world').put(world,'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};}),{dbName,world});
 await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await page.locator('.game-scene-controls-toggle').click();
 return world;
}
async function reachable(locator){
 await expect(locator).toBeVisible();
 expect(await locator.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return{width:r.width,height:r.height,inside:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,hit:hit===el||el.contains(hit)};})).toEqual(expect.objectContaining({inside:true,hit:true,width:expect.any(Number),height:expect.any(Number)}));
 const r=await locator.boundingBox();expect(r.width).toBeGreaterThanOrEqual(44);expect(r.height).toBeGreaterThanOrEqual(44);await locator.click({trial:true});
}
for(const [width,height] of [[320,240],[375,244],[390,254],[320,320],[600,300]])test(`narrow short scene controls stay separate and switch all birds ${width}x${height}`,async({page},info)=>{
 await page.setViewportSize({width,height});const world=await ready(page);
 const controls=page.locator('.game-field-nav button,.game-bottom-dock button,.game-status button,.game-scene-toolbar [data-bird-step],.game-scene-toolbar [data-game-care="clean"]');
 for(const control of await controls.all())await reachable(control);
 await reachable(page.locator('.game-scene-controls-toggle'));
 const bounds=await controls.evaluateAll(nodes=>nodes.map(el=>({label:el.getAttribute('aria-label')||el.textContent,rect:el.getBoundingClientRect().toJSON()})));
 for(let i=0;i<bounds.length;i++)for(let j=i+1;j<bounds.length;j++){const a=bounds[i],b=bounds[j];expect(Math.min(a.rect.right,b.rect.right)>Math.max(a.rect.left,b.rect.left)+1&&Math.min(a.rect.bottom,b.rect.bottom)>Math.max(a.rect.top,b.rect.top)+1,`${a.label} must not cover ${b.label}`).toBe(false);}
 const face=page.locator('.game-bird-carousel-face');
 for(const bird of world.birds){await expect(face).toHaveAttribute('data-bird-id',bird.id);await expect(face.locator('strong')).toHaveText(bird.name);await page.locator('.game-bird-carousel [data-bird-step="1"]').click();}
 await expect(face).toHaveAttribute('data-bird-id','b1');await page.locator('.game-bird-carousel [data-bird-step="-1"]').click();await expect(face).toHaveAttribute('data-bird-id',world.birds.at(-1).id);
 await page.locator('#game-open-bird').click();await expect(page.locator('#game-sheet-title')).toHaveText(world.birds.at(-1).name);await page.locator('[data-game-close-bird]').click();
 await page.locator('.game-scene-controls-toggle').click();await expect(page.locator('.game-bottom-dock')).toBeHidden();await expect(page.locator('.game-scene-caption')).toBeVisible();await page.locator('.game-scene-controls-toggle').click();await reachable(page.locator('.game-bird-carousel [data-bird-step="1"]'));
 expect(await page.evaluate(()=>({x:scrollX,y:scrollY,w:document.documentElement.scrollWidth<=innerWidth+1,h:document.documentElement.scrollHeight<=innerHeight+1}))).toEqual({x:0,y:0,w:true,h:true});
 await info.attach(`short-controls-${width}x${height}`,{body:await page.screenshot(),contentType:'image/png'});
});
