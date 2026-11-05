import {test,expect} from '@playwright/test';
import {createWorld,validateWorld} from '../../src/engine.js';
const NOW=Date.UTC(2026,10,5,9), sizes=[[320,240],[320,568],[390,844],[844,390],[1280,800]];
function seed(){const w=createWorld(NOW,42);w.paused=true;w.settings.motion=false;w.settings.careSound=false;w.encounters.crow.lastArrivalAt=NOW;w.encounters.raptor.lastArrivalAt=NOW;validateWorld(w);return w;}
async function record(page,world){return page.evaluate(world=>new Promise((resolve,reject)=>{
 const request=indexedDB.open('buncho-ureshi-garden-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('world');request.onerror=()=>reject(request.error);
 request.onsuccess=()=>{const db=request.result,tx=db.transaction('world',world?'readwrite':'readonly'),store=tx.objectStore('world'),q=world?store.put(world,'current'):store.get('current');tx.oncomplete=()=>{db.close();resolve(q.result)};tx.onerror=()=>reject(tx.error)};
}),world);}
async function setup(page,size){
 await page.setViewportSize({width:size[0],height:size[1]});
 await page.addInitScript(now=>{Date.now=()=>now;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);
 await page.route(/youtube|youtu\.be|googlevideo|ytimg/i,r=>r.abort());
 await page.goto('');await record(page,seed());await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
}
async function fit(button){
 await button.scrollIntoViewIfNeeded();await expect(button).toBeVisible();
 const m=await button.evaluate(el=>{const b=el.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(el);return{left:b.left,right:b.right,w:b.width,h:b.height,viewport:innerWidth,hit:el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)),text:[...range.getClientRects()].every(r=>r.left>=b.left-.5&&r.right<=b.right+.5&&r.top>=b.top-.5&&r.bottom<=b.bottom+.5)};});
 expect(m.left).toBeGreaterThanOrEqual(-.5);expect(m.right).toBeLessThanOrEqual(m.viewport+.5);expect(m.w).toBeGreaterThanOrEqual(43.9);expect(m.h).toBeGreaterThanOrEqual(43.9);expect(m.hit).toBe(true);expect(m.text).toBe(true);
}
async function capture(page,info,name,size){if([240,844,800].includes(size[1]))await info.attach(`${name}-${size.join('x')}`,{body:await page.screenshot(),contentType:'image/png'});}
const protectedState=w=>({worldId:w.worldId,birds:w.birds,economy:w.economy,decor:w.decor,lifecycle:w.lifecycle,settings:w.settings,protagonist:w.protagonist});
async function openMenu(page){await page.locator('#game-nav-open').click();await expect(page.locator('.game-secondary-menu')).toHaveAttribute('open','');}
for(const size of sizes){
 test(`Color Play preserves menu routes and saved birds at ${size.join('x')}`,async({page},info)=>{
  await setup(page,size);const before=protectedState(await record(page));
  await fit(page.locator('.game-scene-controls-toggle'));await capture(page,info,'home-rest',size);await page.locator('.game-scene-controls-toggle').click();
  await expect(page.locator('.game-field-nav [aria-pressed=true]')).toHaveCSS('background-color','rgb(244, 119, 105)');
  for(const b of await page.locator('.game-bottom-dock > button').all())await fit(b);
  await capture(page,info,'home-controls',size);
  await openMenu(page);await capture(page,info,'menu',size);
  for(const id of ['health','memorial','profile','relations','family','diary','roster','notebook','settings','help']){
   const link=page.locator(`#game-menu-${id}`);await fit(link);await link.click();
   await expect(page.locator('.game-app')).toHaveAttribute('data-panel',id);await expect(page.locator('.game-panel-overlay')).toBeVisible();
   await fit(page.locator('[data-game-close-panel]'));expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   if(['health','family','notebook','settings'].includes(id))await capture(page,info,id,size);
   await page.locator('[data-game-close-panel]').click();await expect(page.locator('.game-room')).toBeVisible();await openMenu(page);
  }
  await page.locator('[data-game-close-menu]').click();expect(protectedState(await record(page))).toEqual(before);
  await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');expect(protectedState(await record(page))).toEqual(before);
 });
 test(`Color Play keeps care, decoration and garden flows at ${size.join('x')}`,async({page},info)=>{
  await setup(page,size);const before=protectedState(await record(page));await page.locator('.game-scene-controls-toggle').click();
  await page.locator('#game-open-bird').click();await expect(page.locator('.game-care-pet-bird')).toBeVisible();
  await capture(page,info,'care',size);await fit(page.locator('[data-game-care=feed]'));await fit(page.locator('[data-game-close-bird]'));await page.locator('[data-game-close-bird]').click();
  await page.locator('.game-bottom-dock [data-game-panel=decorate]').click();await expect(page.locator('.game-decoration')).toBeVisible();await capture(page,info,'decorate',size);await fit(page.locator('[data-game-close-panel]'));await page.locator('[data-game-close-panel]').click();
  await page.locator('.game-field-nav [data-game-panel=outdoors]').click();await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
  await expect(page.locator('.finch-garden-selector [data-garden-select]')).toHaveCount(12);await capture(page,info,'garden',size);
  for(const button of await page.locator('.finch-garden-dock > details > summary').all())await fit(button);
  await fit(page.locator('[data-game-close-panel]'));await page.locator('[data-game-close-panel]').click();
  expect(protectedState(await record(page))).toEqual(before);
 });
}
