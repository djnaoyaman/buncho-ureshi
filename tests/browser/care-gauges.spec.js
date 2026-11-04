import { test, expect } from '@playwright/test';
import legacyWorld from '../fixtures/v1-world.json' with {type:'json'};
import { createWorld, createBird, feedBird, advanceTicks, adoptBird, validateWorld } from '../../src/engine.js';
const DB='buncho-ureshi-garden-v1',now=Date.UTC(2026,10,2,12);
function fixture({stage='adult',home='resident',sound=false}={}){
  const w=createWorld(now,5402);advanceTicks(w,1);adoptBird(w,'b2','こめ');w.paused=true;w.lastUpdated=now;w.care.cleanliness=15;w.settings.careSound=sound;w.birds[0].needs.food=40;w.birds[0].mood=60;w.birds[0].stage=stage;w.birds[0].home=home;return validateWorld(w);
}
async function record(page,value){return page.evaluate(({dbName,value})=>new Promise((resolve,reject)=>{const open=indexedDB.open(dbName,1);open.onupgradeneeded=()=>open.result.createObjectStore('world');open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,tx=db.transaction('world',value?'readwrite':'readonly'),store=tx.objectStore('world'),request=value?store.put(value,'current'):store.get('current');tx.oncomplete=()=>{db.close();resolve(value||request.result);};tx.onerror=()=>{db.close();reject(tx.error);};};}),{dbName:DB,value});}
async function seed(page,w=fixture()){await page.goto('');await page.evaluate(sound=>{localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));if(typeof sound==='boolean')localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:sound}));},w.settings.careSound);await record(page,w);await page.goto('game/');await expect(page.locator('.game-app')).toBeVisible();if(w.birds[0].home!=='departed')await openCare(page);}
async function openCare(page){const profile=page.locator('.game-panel-overlay[open] [data-game-open-bird]');if(await profile.count())await profile.click();else{if(await page.locator('.game-panel-overlay').isVisible())await page.locator('[data-game-close-panel]').click();if(!await page.locator('.game-bottom-dock [data-game-open-bird]').isVisible())await page.locator('.game-scene-controls-toggle').click();await page.locator('.game-bottom-dock [data-game-open-bird]').click();}await expect(page.locator('.game-bird-sheet')).toBeVisible();}
test.beforeEach(async({page})=>{await page.addInitScript(value=>{Date.now=()=>value;},now);await page.route(/youtube|youtu\.be|googlevideo|ytimg/i,r=>r.abort());});

test('care gauges show accurate values and fit the bird sheet on narrow screens',async({page},testInfo)=>{
  test.setTimeout(120000);
  for(const width of [320,390,844]){
    await page.setViewportSize({width,height:700});await seed(page);
    const sheet=page.locator('.game-bird-sheet');
    const food=sheet.locator('meter[aria-label="おなか"]'),energy=sheet.locator('meter[aria-label="元気"]');
    await expect(food).toHaveAttribute('value','40');await expect(energy).toHaveAttribute('value',String(Math.round(fixture().birds[0].needs.energy)));
    await expect(sheet.locator('[data-game-fullness]')).toHaveText('40 / 100');
    const metrics=await sheet.locator('.game-fullness').evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,meters:[...el.querySelectorAll('meter')].map(m=>{const b=m.getBoundingClientRect();return {left:b.left,right:b.right,width:b.width,height:b.height};})};});
    expect(await sheet.locator('.game-care-meter-heading').evaluateAll(nodes=>nodes.every(node=>node.scrollWidth<=node.clientWidth))).toBe(true);
    expect(metrics.meters).toHaveLength(2);for(const m of metrics.meters){expect(m.left).toBeGreaterThanOrEqual(metrics.left);expect(m.right).toBeLessThanOrEqual(metrics.right);expect(m.width).toBeGreaterThan(60);expect(m.height).toBeGreaterThan(5);}
    await page.screenshot({path:testInfo.outputPath(`care-gauges-${width}.png`)});
    await sheet.locator('[data-game-care="feed"]').click();await expect(food).toHaveAttribute('value','60');await expect(sheet.locator('[data-game-fullness]')).toHaveText('60 / 100');
  }
});


test('clean clears all home drops once, rewards the collected total and survives reload',async({page})=>{
 const w=createWorld(now);createBird(w,{home:'resident'});for(const b of w.birds)feedBird(w,b.id,now);advanceTicks(w,2);w.paused=true;w.settings.careSound=false;w.care.cleanliness=100;const count=w.gems.droppings.length,before=w.decor.points;expect(count).toBeGreaterThan(0);
 await seed(page,validateWorld(w));await page.locator('[data-game-close-bird]').click();await expect(page.locator('[data-gem-collect]')).toHaveCount(count);
 await page.locator('[data-game-care="clean"]').click();await expect(page.locator('[data-gem-collect]')).toHaveCount(0);await expect(page.locator('.game-gem-reward')).toContainText(`+${count*8} Gem`);
 const saved=await record(page);expect(saved.decor.points).toBe(before+count*8);expect(saved.care.cleanliness).toBe(100);await page.locator('[data-game-care="clean"]').click();expect((await record(page)).decor.points).toBe(saved.decor.points);
 await page.reload();await expect(page.locator('.game-app')).toBeVisible();await expect(page.locator('[data-gem-collect]')).toHaveCount(0);expect((await record(page)).decor.points).toBe(saved.decor.points);
});
