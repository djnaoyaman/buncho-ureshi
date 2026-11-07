import {test,expect} from '@playwright/test';
for(const size of [[320,568],[390,844],[844,390]])test(`C garden bookmark keeps five readable rows and the scene ${size.join('x')}`,async({page},info)=>{
 await page.setViewportSize({width:size[0],height:size[1]});await page.goto('game/');const base=new URL('../',page.url()).href;
 await page.setContent(`<link rel="stylesheet" href="${base}src/style.css"><link rel="stylesheet" href="${base}src/game.css"><link rel="stylesheet" href="${base}src/encounter-ui.css"><style>body{margin:0}#fixture{height:100dvh;width:100%;position:relative}</style><body data-world="buncho"><div id="fixture"></div></body>`);
 await page.evaluate(async base=>{const [{createWorld},{createEncounterSystem},{mountEncounterPanel}]=await Promise.all([import(base+'src/engine.js'),import(base+'src/encounters.js'),import(base+'src/encounter-controller.js')]);const w=createWorld(Date.now());w.paused=true;w.encounters.garden.open=true;window.__bookmarkFixture={w,before:JSON.stringify(w.birds)};window.__bookmarkFixture.panel=mountEncounterPanel(document.querySelector('#fixture'),{base,system:createEncounterSystem([]),getWorld:()=>w,transact:async fn=>fn(w),initialMode:'garden'});},base);
 const menu=page.locator('.finch-observe-menu');await menu.locator(':scope>summary').click();await expect(menu.locator('.finch-bookmark-title')).toHaveText('庭のしおり');
 for(const id of ['grass','water','branch','song','quiet']){
  const button=menu.locator(`[data-garden-observe=${id}]`);await button.scrollIntoViewIfNeeded();await button.click();await expect(button).toHaveAttribute('aria-pressed','true');await expect(button.locator('.finch-bookmark-check')).toHaveText('✓');await expect(button).toHaveCSS('background-color','rgb(247, 220, 141)');
  expect(await button.evaluate(el=>{const b=el.getBoundingClientRect(),r=document.createRange();r.selectNodeContents(el);return b.height>=44&&b.width>=44&&[...r.getClientRects()].every(t=>t.left>=b.left-1&&t.right<=b.right+1);})).toBe(true);
 }
 const boxes=await menu.locator('[data-garden-observe]').evaluateAll(es=>es.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,bottom:r.bottom,top:r.top};}));for(let i=1;i<boxes.length;i++){expect(boxes[i].x).toBe(boxes[0].x);expect(boxes[i].top-boxes[i-1].bottom).toBeGreaterThanOrEqual(7.9);}
 await info.attach(`garden-bookmark-${size[0]}`,{body:await page.screenshot({path:info.outputPath(`garden-bookmark-${size[0]}.png`)}),contentType:'image/png'});
 const scroll=await menu.evaluate(el=>el.scrollTop);await page.evaluate(()=>window.__bookmarkFixture.panel.refresh());await expect(menu).toHaveAttribute('open','');expect(await menu.evaluate(el=>el.scrollTop)).toBeCloseTo(scroll,0);
 const keyButton=menu.locator('[data-garden-observe=water]');await keyButton.focus();await page.keyboard.press('Enter');await expect(keyButton).toHaveAttribute('aria-pressed','true');
 await menu.locator(':scope>summary').focus();await page.keyboard.press('Space');await expect(menu).not.toHaveAttribute('open','');await expect(page.locator('.finch-garden-stage')).toBeVisible();
 expect(await page.evaluate(()=>JSON.stringify(window.__bookmarkFixture.w.birds)===window.__bookmarkFixture.before)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

import {createWorld,validateWorld} from '../../src/engine.js';
const NOW=Date.UTC(2026,10,7);
async function record(page,value){return page.evaluate(value=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('world',value?'readwrite':'readonly'),q=value?tx.objectStore('world').put(value,'current'):tx.objectStore('world').get('current');tx.oncomplete=()=>{db.close();resolve(q.result);};tx.onerror=()=>reject(tx.error);};}),value);}
for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390}])test(`C bookmark real garden opens and closes without changing the complete save ${size.width}x${size.height}`,async({page},info)=>{
 await page.setViewportSize(size);await page.addInitScript(now=>{Date.now=()=>now;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);
 const w=createWorld(NOW,42);w.paused=true;w.settings.motion=false;validateWorld(w);await page.goto('');await record(page,w);await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 await page.locator('.game-scene-controls-toggle').click();await page.locator('[data-game-panel=outdoors]').click();await expect(page.locator('.game-encounter-host')).toHaveAttribute('aria-busy','false');const before=await record(page);
 const menu=page.locator('.finch-observe-menu'),summary=menu.locator(':scope>summary');await summary.focus();await page.keyboard.press('Enter');await expect(menu).toHaveAttribute('open','');
 for(const button of await menu.locator('[data-garden-observe]').all()){
  await button.scrollIntoViewIfNeeded();const b=await button.evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,hit:el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});expect(b.w).toBeGreaterThanOrEqual(44);expect(b.h).toBeGreaterThanOrEqual(44);expect(b.x).toBeGreaterThanOrEqual(0);expect(b.y).toBeGreaterThanOrEqual(0);expect(b.y+b.h).toBeLessThanOrEqual(size.height);expect(b.hit).toBe(true);
 }
 const scroll=await menu.evaluate(el=>el.scrollTop);await page.waitForTimeout(3400);await expect(menu).toHaveAttribute('open','');expect(await menu.evaluate(el=>el.scrollTop)).toBeCloseTo(scroll,0);expect(await record(page)).toEqual(before);
 await menu.evaluate(el=>el.scrollTop=0);await page.screenshot({path:info.outputPath(`garden-bookmark-real-${size.width}.png`)});
 expect(await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.length===new Set(ids).size;})).toBe(true);
 await summary.focus();await page.keyboard.press('Space');await expect(menu).not.toHaveAttribute('open','');await expect(page.locator('.finch-garden-stage')).toBeVisible();await summary.click();await summary.click();expect(await record(page)).toEqual(before);
 await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');expect(await record(page)).toEqual(before);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
