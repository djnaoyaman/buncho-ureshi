import {test,expect} from '@playwright/test';
import {createWorld,createBird} from '../../src/engine.js';
import {encounterSystem} from '../../src/encounters.js';
const NOW=Date.UTC(2026,10,11,9);
async function record(page,w){return page.evaluate(w=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onsuccess=()=>{const db=r.result,tx=db.transaction('world',w?'readwrite':'readonly'),q=w?tx.objectStore('world').put(w,'current'):tx.objectStore('world').get('current');tx.oncomplete=()=>{db.close();resolve(q.result)};tx.onerror=()=>reject(tx.error)};r.onerror=()=>reject(r.error)}),w);}
async function menu(page){const controls=page.locator('.game-scene-controls-toggle');if(await controls.getAttribute('aria-expanded')==='false')await controls.click();await page.locator('[data-game-open-menu]').click();const details=page.locator('[data-game-details=next-goals]');if(!await details.evaluate(e=>e.open))await details.locator(':scope>summary').click();return details;}
for(const [width,height,enlarged] of [[320,568,false],[390,844,true]])test(`next enjoyments are readable and lead to the existing records ${width}x${height}`,async({page},info)=>{
 await page.setViewportSize({width,height});await page.addInitScript(n=>{Date.now=()=>n;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);
 await page.goto('');const w=createWorld(NOW);w.paused=true;if(enlarged){const id=encounterSystem.catalog[0].id;w.encounters.discoveries.push({id,firstTick:0,lastTick:0,visits:1,instanceId:w.encounters.nextId++});w.encounters.friendship.push({id,petPoints:80});createBird(w,{stage:'chick',home:'resident',name:'育つ子'});}await record(page,w);await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 if(enlarged)await page.addStyleTag({content:'.game-next-goal-list p{font-size:24px!important} .game-next-goal-list button{font-size:22px!important}'});
 const before=await record(page);let details=await menu(page);await expect(details.locator('[data-next-goal]')).toHaveCount(4);await expect(details).toContainText(`出会い ${enlarged?1:0} /`);
 await details.locator('[data-next-goal=family] button').scrollIntoViewIfNeeded();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await details.locator('[data-next-goal=meeting]').scrollIntoViewIfNeeded();await info.attach('next-enjoyments',{body:await page.screenshot(),contentType:'image/png'});
 for(const goal of ['meeting','friendship','collection','family']){
  const button=page.locator(`[data-next-goal=${goal}] button`);await button.scrollIntoViewIfNeeded();await expect(button).toBeInViewport();expect(await button.evaluate(e=>e.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);await button.click();
  if(goal==='meeting')await expect(page.locator('.finch-mystery-postcard')).toBeVisible();
  if(goal==='friendship'){if(enlarged){await expect(page.locator('[data-finch-friendship]')).toBeVisible();await expect(page.locator('[data-finch-points]')).toHaveText('90');}else await expect(page.locator('.finch-notebook')).toBeVisible();}
  if(goal==='collection')await expect(page.locator('.game-decoration')).toBeVisible();
  if(goal==='family')await expect(page.locator('.game-app')).toHaveAttribute('data-panel','family');
  expect(await record(page)).toEqual(before);await page.locator('[data-game-close-panel]').click();details=await menu(page);
 }
 await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await menu(page);expect(await record(page)).toEqual(before);await expect(page.locator('[data-next-goal=meeting]')).toContainText(`出会い ${enlarged?1:0} /`);
});
