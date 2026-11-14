import{test,expect}from'@playwright/test';
import {createWorld,createBird,renameBird,validateWorld,serializeWorld,parseSave} from '../../src/engine.js';
for(const width of [320,375,390,430,768,1024,1440])test(`renewal home ${width}`,async({page},info)=>{await page.setViewportSize({width,height:844});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('');await expect(page.locator('.renewal-cover')).toBeVisible();await expect(page.locator('.renewal-hero>img')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect(await page.locator('.renewal-hero>img').evaluate(async i=>{await i.decode();return i.naturalWidth>0})).toBe(true);await page.locator('#menu-toggle').click();await expect(page.locator('#menu')).toBeVisible();await page.locator('#menu-toggle').click();await expect(page.locator('#menu')).toBeHidden();await page.screenshot({path:info.outputPath(`home-${width}.png`),fullPage:true});expect(errors).toEqual([]);});
test('renewal site/game boundary and history retain isolated stylesheet and saved settings',async({page})=>{await page.goto('');await page.evaluate(()=>localStorage.setItem('renewal-sentinel','retained'));await page.locator('.art-game-link').click();await expect(page.locator('#game-root .game-app')).toBeVisible();await expect(page.locator('html')).not.toHaveAttribute('data-site-renewal');await expect(page.locator('link[href*="site/renewal"]')).toHaveCount(0);expect(await page.evaluate(()=>localStorage.getItem('renewal-sentinel'))).toBe('retained');await page.goBack();await expect(page.locator('.renewal-cover')).toBeVisible();await page.reload();await expect(page.locator('.renewal-cover')).toBeVisible();});

test('menu respects available viewport during input and landscape',async({page})=>{
 await page.setViewportSize({width:390,height:360});await page.goto('');await page.locator('#menu-toggle').click();await page.locator('#global-query').fill('文鳥');await page.locator('#menu').evaluate(e=>e.style.setProperty('--site-menu-max-height','160px'));expect(await page.locator('#menu').evaluate(e=>getComputedStyle(e).maxHeight)).toBe('160px');await page.keyboard.press('Escape');await expect(page.locator('#menu')).toBeHidden();
});

// Real persisted game data, not an unrelated localStorage sentinel. Pausing and
// fixing the game clock isolate asset preservation from normal time progression.
// Browser timers remain live: this is not a startup-duration/performance test.
const SAVE_NOW=Date.UTC(2026,10,14,6);
function renewalSaveFixture(){
 const world=createWorld(SAVE_NOW,197);
 world.paused=true;world.settings.motion=false;world.settings.careSound=false;
 renameBird(world,world.birds[0].id,'おもち');
 const first=world.birds[0],second=createBird(world,{name:'こはく',color:'cinnamon',home:'resident'});
 first.relations[second.id]={affection:37,trust:61,compatibility:72,meetings:8,lastTick:0};
 second.relations[first.id]={affection:43,trust:58,compatibility:72,meetings:8,lastTick:0};
 world.economy.gold=137;world.economy.lifetimeGold=211;
 world.decor.points=83;world.decor.lifetimePoints=123;
 world.encounters.gardenFriends.regulars[0].affinity=24;
 // The engine-generated welcome journal entry and equipped inventory are
 // deliberately nonempty, so a reset cannot pass by comparing empty arrays.
 expect(world.journal.length).toBeGreaterThan(0);
 expect(world.decor.inventory.length).toBeGreaterThan(0);
 expect(validateWorld(world)).toEqual(world);
 expect(parseSave(serializeWorld(world))).toEqual(world);
 return world;
}
async function renewalWorldRecord(page,world){
 return page.evaluate(world=>new Promise((resolve,reject)=>{
  const open=indexedDB.open('buncho-ureshi-garden-v1',1);
  open.onupgradeneeded=()=>open.result.createObjectStore('world');
  open.onerror=()=>reject(open.error);
  open.onsuccess=()=>{
   const db=open.result,tx=db.transaction('world',world?'readwrite':'readonly');
   const store=tx.objectStore('world'),request=world?store.put(world,'current'):store.get('current');
   tx.oncomplete=()=>{db.close();resolve(request.result);};
   tx.onerror=tx.onabort=()=>{db.close();reject(tx.error||new Error('World transaction aborted'));};
  };
 }),world);
}
function expectRenewalAssets(actual,expected){
 expect(actual,'persisted world must exist').toBeTruthy();
 expect(actual.birds.map(b=>({id:b.id,name:b.name,naming:b.naming}))).toEqual(expected.birds.map(b=>({id:b.id,name:b.name,naming:b.naming})));
 expect(actual.economy).toEqual(expected.economy);
 expect(actual.decor).toEqual(expected.decor); // Gems, inventory and equipped items
 expect(actual.birds.map(b=>b.relations)).toEqual(expected.birds.map(b=>b.relations));
 expect(actual.encounters.gardenFriends).toEqual(expected.encounters.gardenFriends);
 expect(actual.journal).toEqual(expected.journal);
 expect(actual).toEqual(expected); // No silent loss in any other save field either
}
test('real IndexedDB save survives renewed site to game, history and reload',async({page})=>{
 await page.addInitScript(now=>{
  Date.now=()=>now;
  localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));
  localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));
 },SAVE_NOW);
 await page.goto('');
 const expected=renewalSaveFixture();await renewalWorldRecord(page,expected);
 expectRenewalAssets(await renewalWorldRecord(page),expected);
 await page.locator('.art-game-link').click();
 await expect(page.locator('#game-root .game-app')).toBeVisible();
 await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 await expect(page.locator('html')).not.toHaveAttribute('data-site-renewal');
 await expect(page.locator('link[href*="site/renewal"]')).toHaveCount(0);
 expectRenewalAssets(await renewalWorldRecord(page),expected);
 await page.goBack();await expect(page.locator('.renewal-cover')).toBeVisible();
 expectRenewalAssets(await renewalWorldRecord(page),expected);
 await page.reload();await expect(page.locator('.renewal-cover')).toBeVisible();
 expectRenewalAssets(await renewalWorldRecord(page),expected);
 await page.locator('.art-game-link').click();
 await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 expectRenewalAssets(await renewalWorldRecord(page),expected);
 await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 expectRenewalAssets(await renewalWorldRecord(page),expected);
});
