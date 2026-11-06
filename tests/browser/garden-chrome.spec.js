import {test,expect} from '@playwright/test';
import {validateWorld} from '../../src/engine.js';
import {GARDENS} from '../../src/data/gardens.js';
import {createEncounterSystem} from '../../src/encounters.js';
import {ENCOUNTER_CATALOG} from '../../src/data/encounter-catalog.js';
import {COLOR_PLAY_NOW as NOW,colorPlayWorld} from '../fixtures/color-play.js';
import {inviteFixture} from '../fixtures/garden-invitation.js';
const sizes=[[320,568],[360,640],[390,844],[768,1024],[1024,768],[1280,800]];
async function record(page,world){return page.evaluate(world=>new Promise((resolve,reject)=>{
 const request=indexedDB.open('buncho-ureshi-garden-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('world');request.onerror=()=>reject(request.error);
 request.onsuccess=()=>{const db=request.result,tx=db.transaction('world',world?'readwrite':'readonly'),store=tx.objectStore('world'),q=world?store.put(world,'current'):store.get('current');tx.oncomplete=()=>{db.close();resolve(q.result)};tx.onerror=()=>reject(tx.error)};
}),world);}
async function setup(page,[width,height],world=colorPlayWorld()){
 await page.setViewportSize({width,height});
 await page.addInitScript(now=>{Date.now=()=>now;Math.random=()=>.99;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);
 await page.route(/youtube|youtu\.be|googlevideo|ytimg/i,r=>r.abort());
 await page.goto('');await record(page,world);await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
}
async function fits(locator,{hit=true}={}){
 await locator.scrollIntoViewIfNeeded();await expect(locator).toBeVisible();
 const result=await locator.evaluate(el=>{const r=el.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(el);return{width:r.width,height:r.height,left:r.left,right:r.right,viewport:innerWidth,text:[...range.getClientRects()].filter(b=>b.width>0).every(b=>b.left>=r.left-1&&b.right<=r.right+1&&b.top>=r.top-1&&b.bottom<=r.bottom+1),hit:el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});
 expect(result.width).toBeGreaterThanOrEqual(44);expect(result.height).toBeGreaterThanOrEqual(44);
 expect(result.left).toBeGreaterThanOrEqual(-1);expect(result.right).toBeLessThanOrEqual(result.viewport+1);expect(result.text).toBe(true);if(hit)expect(result.hit).toBe(true);
}
const protectedState=w=>({birds:w.birds,decor:w.decor,economy:w.economy,lifecycle:w.lifecycle,friendship:w.encounters.friendship,discoveries:w.encounters.discoveries});
for(const size of sizes)test(`compact garden and stable controls ${size.join('x')}`,async({page},info)=>{
 await setup(page,size);const before=protectedState(await record(page)),toggle=page.locator('.game-scene-controls-toggle');
 const logo=page.locator('.game-world-title img');await expect(logo).toHaveAttribute('src','brand/wordmark-04-transparent.webp');await logo.evaluate(img=>img.decode());
 expect(await logo.evaluate(img=>Math.abs(img.width/img.height-1120/645))).toBeLessThan(.03);
 await fits(page.locator('.game-world-exit'));await expect(page.locator('.game-world-exit')).toHaveAccessibleName('文鳥図鑑へ戻る');
 const homeClosed=await toggle.boundingBox();await expect(toggle).toHaveText('Touch the Birds');await fits(toggle);await toggle.click();await expect(toggle).toHaveText('Watch the Birds');
 const homeOpen=await toggle.boundingBox();expect(homeOpen).toEqual(homeClosed);await fits(toggle);
 await page.locator('.game-field-nav [data-game-panel=outdoors]').click();await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
 const header=page.locator('.finch-garden > header');expect(await header.evaluate(el=>getComputedStyle(el,'::before').content)).toBe('none');
 for(const id of ['java-rice','bali-terrace','mizukagami']){
  const button=page.locator(`[data-garden-select="${id}"]`);await fits(button);await button.click();await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-garden-id',id);
  await expect(page.locator('#finch-garden-title')).toHaveText(GARDENS.find(g=>g.id===id).name);await fits(page.locator(`[data-garden-select="${id}"]`));
 }
 for(const button of await page.locator('[data-garden-select]').all())await fits(button);
 await page.locator('[data-garden-select="bali-terrace"]').click();await fits(page.locator('.finch-garden > header button'));await fits(page.locator('[data-game-close-panel]'));
 const title=await page.locator('#finch-garden-title').boundingBox(),tabs=await page.locator('.finch-garden-selector-wrap').boundingBox();expect(title.y+title.height).toBeLessThanOrEqual(tabs.y);
 const expanded=await toggle.boundingBox();await fits(toggle);await toggle.click();await expect(page.locator('.finch-garden-selector-wrap')).toBeHidden();await expect(toggle).toHaveText('Touch the Birds');expect(await toggle.boundingBox()).toEqual(expanded);
 await fits(toggle);await toggle.click();await expect(page.locator('.finch-garden-selector-wrap')).toBeVisible();expect(await toggle.boundingBox()).toEqual(expanded);await fits(toggle);
 await info.attach(`garden-${size.join('x')}`,{body:await page.screenshot(),contentType:'image/png'});
 await page.locator('[data-game-close-panel]').click();await expect(page.locator('.game-room')).toBeVisible();expect(protectedState(await record(page))).toEqual(before);
 await page.reload();expect(protectedState(await record(page))).toEqual(before);
});
for(const size of [[320,568],[390,844],[768,1024]])test(`notebook copy and invitations ${size.join('x')}`,async({page},info)=>{
 const world=colorPlayWorld(),system=createEncounterSystem(ENCOUNTER_CATALOG),id='eurasian-tree-sparrow',token=()=>({worldId:world.worldId,revision:world.revision});
 inviteFixture(system,world,id);system.open(world,id,token());for(const step of system.catalog.find(e=>e.id===id).steps)system.act(world,world.encounters.active.instanceId,step.action,token());for(let p=10;p<110;p+=Math.min(8,110-p))system.pet(world,id,Math.min(8,110-p),token());world.encounters.garden.open=false;
 await setup(page,size,validateWorld(world));await page.locator('.game-scene-controls-toggle').click();await page.locator('#game-nav-open').click();await page.locator('#game-menu-notebook').click();await page.locator(`[data-encounter-page="${id}"]`).click();
 const summary=page.locator('.finch-summary');await expect(summary).toHaveCSS('background-color','rgba(0, 0, 0, 0)');await expect(summary).toHaveCSS('text-align','left');await summary.scrollIntoViewIfNeeded();
 const spacing=await summary.evaluate(el=>el.getBoundingClientRect().top-el.previousElementSibling.getBoundingClientRect().bottom);expect(spacing).toBeGreaterThanOrEqual(19);
 for(const button of await page.locator('.finch-friendship-actions button,.finch-view-toggle button').all())await fits(button);
 await expect(page.locator('[data-encounter-invite-garden]')).toHaveCSS('background-color','rgb(255, 253, 247)');
 await page.locator('.finch-friendship').scrollIntoViewIfNeeded();await info.attach(`notebook-${size.join('x')}`,{body:await page.screenshot(),contentType:'image/png'});
 const before=protectedState(await record(page));await page.locator('[data-encounter-view=photo]').click();await expect(page.locator('.finch-photo')).toBeVisible();await page.locator('[data-encounter-view=art]').click();
 expect(protectedState(await record(page))).toEqual(before);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
