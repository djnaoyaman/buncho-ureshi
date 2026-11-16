import {test,expect} from '@playwright/test';
import {feedBird,petBird,talkToBird,economyToken,createBird,collectDropping,cleanGarden,validateWorld} from '../../src/engine.js';
import {COLOR_PLAY_NOW as NOW,colorPlayWorld} from '../fixtures/color-play.js';
import {advanceObservedWorld} from '../../src/away-session.js';
async function record(page,w){return page.evaluate(w=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,t=db.transaction('world',w?'readwrite':'readonly'),s=t.objectStore('world'),q=w?s.put(w,'current'):s.get('current');t.oncomplete=()=>{db.close();resolve(q.result)};t.onerror=()=>reject(t.error)};}),w)}
async function start(page,w,width=375){
 validateWorld(w);await page.setViewportSize({width,height:width===402?874:667});await page.addInitScript(now=>{Date.now=()=>now;Math.random=()=>.99;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);
 await page.goto('');await record(page,w);await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');if(await page.locator('.game-scene-controls-toggle').getAttribute('aria-expanded')==='false')await page.locator('.game-scene-controls-toggle').click();
}
for(const width of [320,375,402])test(`care responds after commit and settles with exact ordinary rewards at ${width}`,async({page})=>{
 const w=colorPlayWorld();w.birds[0].needs.food=w.birds[0].needs.energy=40;w.paused=false;w.settings.motion=true;
 const second=createBird(w,{home:'resident'});second.needs.food=second.needs.energy=100;
 if(width===375)await page.emulateMedia({reducedMotion:'reduce'});
 await start(page,w,width);await page.locator('#game-open-bird').click();
 for(const kind of ['feed','pet','name','talk','full-pet']){
  const expected=structuredClone(await record(page));let r;
  if(kind==='feed'){r=feedBird(expected,'b1',NOW,economyToken(expected));await page.locator('#game-care-feed').click();}
  else if(kind==='pet'||kind==='full-pet'){r=petBird(expected,'b1',NOW,economyToken(expected));await page.locator('#game-care-pet').press('Enter');}
  else if(kind==='name'){r=talkToBird(expected,'b1',expected.birds[0].name,NOW,economyToken(expected));await page.locator('#game-talk-call').click();}
  else{r=talkToBird(expected,'b1','こんにちは',NOW,economyToken(expected));await page.locator('.game-sheet-talk>summary').click();await page.locator('#game-words').fill('こんにちは');await page.locator('#game-talk-send').click();}
  await expect.poll(()=>record(page)).toEqual(expected);
  if(kind==='full-pet'){expect(r.changed).toBe(false);expect(r.gemAward).toBe(0);}
  await expect(page.locator('#game-care-pet')).toHaveAttribute('data-home-response',/peck|preen|tilt|rest/);
  await expect(page.locator('#game-care-pet')).toHaveAttribute('data-home-response','rest');
  expect(await record(page)).toEqual(expected);
 }
 await page.locator('.game-bird-sheet [data-bird-step="1"]').click();await expect(page.locator('#game-care-pet')).toHaveAttribute('data-care-bird-id',second.id);await expect(page.locator('#game-care-pet')).toHaveAttribute('data-home-response','');
 await page.locator('#game-sheet-close').click();await expect(page.locator('.game-room')).toHaveAttribute('data-home-response','');
});
test('failed save and hidden cancellation never leave a successful response',async({page})=>{
 const w=colorPlayWorld();w.birds[0].needs.food=40;await start(page,w);await page.locator('#game-open-bird').click();
 const before=await record(page);await page.evaluate(()=>{window.__originalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){throw new DOMException('test write rejected','QuotaExceededError');};});
 await page.locator('#game-care-feed').click();await expect(page.locator('.game-bird-sheet .game-warning')).toBeVisible();expect(await record(page)).toEqual(before);await expect(page.locator('#game-care-pet')).toHaveAttribute('data-home-response','');
 await page.evaluate(()=>{IDBObjectStore.prototype.put=window.__originalPut;});await page.locator('#game-care-feed').click();await expect(page.locator('#game-care-pet')).toHaveAttribute('data-home-response','rest');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(page.locator('#game-care-pet')).not.toHaveAttribute('data-home-response','rest');await expect(page.locator('#game-care-pet .game-care-illustration')).toHaveCount(1);
 const after=await record(page);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});expect(await record(page)).toEqual(after);
});
test('family targets and cleaning/drop responses use committed outcomes without extra rewards',async({page})=>{
 // Freeze browser timers as well as Date.now while comparing individual commits.
 // The normal health poll is exercised explicitly after the clean receipt.
 await page.clock.install({time:NOW});
 const w=colorPlayWorld();w.birds[0].needs.food=40;w.care.cleanliness=20;
 const full=createBird(w,{home:'resident'});full.needs.food=100;
 w.tick=2;w.birds[0].gemCare.lastDropTick=2;
 w.gems.droppings=[{id:'drop-1',birdId:'b1',createdTick:2,location:'home'}];w.gems.nextDropId=2;
 await start(page,w);await page.clock.pauseAt(NOW+60000);await page.locator('[data-game-open-menu]').click();
 await page.locator('[data-family-care=feed]').click();
 await expect(page.locator('.game-room [data-bird-id=b1] .game-sprite')).toHaveAttribute('data-pose','rest');
 const saved=await record(page);expect(saved.birds.find(b=>b.id==='b1').needs.food).toBe(60);expect(saved.birds.find(b=>b.id===full.id).needs.food).toBe(100);
 await page.locator('.game-menu-close').click();
 const beforeDrop=await record(page);const expectedDrop=structuredClone(beforeDrop);collectDropping(expectedDrop,'drop-1',expectedDrop.revision,NOW);
 await page.locator('[data-gem-collect="drop-1"]').click();await expect(page.locator('.game-room')).toHaveAttribute('data-home-response','drop');expect(await record(page)).toEqual(expectedDrop);
 const expectedClean=structuredClone(expectedDrop);cleanGarden(expectedClean,NOW);
 await page.locator('[data-game-care=clean]').click();await expect(page.locator('.game-room')).toHaveAttribute('data-home-response','clean');expect(await record(page)).toEqual(expectedClean);expect(await page.locator('.game-floor-soil').count()).toBe(1);
 const expectedPoll=structuredClone(expectedClean);advanceObservedWorld(expectedPoll,NOW);
 expect(expectedPoll.revision).toBe(expectedClean.revision+1);expect(expectedPoll.lifecycle.birds.every(b=>b.dirtySinceAt===null)).toBe(true);
 await page.clock.runFor(3000);await expect.poll(()=>record(page)).toEqual(expectedPoll);await expect(page.locator('.game-room')).not.toHaveAttribute('data-home-response','clean');
});
