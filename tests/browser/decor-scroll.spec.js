import {test,expect} from '@playwright/test';
import {createWorld,validateWorld,DECOR_SLOTS,DECOR_COLORS,DECOR_TIERS} from '../../src/engine.js';
const now=Date.UTC(2026,10,2,12),dbName='buncho-ureshi-garden-v1';
// Touch-capable mobile layout, including WebKit's iOS viewport behavior.
test.use({hasTouch:true,isMobile:true,deviceScaleFactor:1});
async function ready(page){
 await page.addInitScript(now=>{Date.now=()=>now;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},now);
 const world=createWorld(now);world.paused=true;world.decor.points=world.decor.lifetimePoints=1000;
 world.decor.inventory=DECOR_SLOTS.flatMap(s=>DECOR_COLORS.flatMap(c=>DECOR_TIERS.map(t=>({id:`${s.id}-${c.id}-${t.id}`,slot:s.id,color:c.id,tier:t.id}))));
 // Keep the final category's guaranteed draw reachable; completed categories now stop spending.
 world.decor.inventory=world.decor.inventory.filter(i=>i.id!=='paper-aqua-special');world.decor.duplicateStreaks.paper=2;
 validateWorld(world);await page.goto('');
 await page.evaluate(({dbName,world})=>new Promise((resolve,reject)=>{const open=indexedDB.open(dbName,1);open.onupgradeneeded=()=>open.result.createObjectStore('world');open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,tx=db.transaction('world','readwrite');tx.objectStore('world').put(world,'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};}),{dbName,world});
 await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await page.locator('.game-scene-controls-toggle').tap();await page.locator('.game-bottom-dock [data-game-panel="decorate"]').tap();
}
async function reachable(locator){
 await locator.scrollIntoViewIfNeeded();await expect(locator).toBeVisible();
 const m=await locator.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return{width:r.width,height:r.height,inside:r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1,hit:hit===el||el.contains(hit)};});
 expect(m.inside).toBe(true);expect(m.hit).toBe(true);expect(m.width).toBeGreaterThanOrEqual(44);expect(m.height).toBeGreaterThanOrEqual(44);
}
async function shelfEnd(page,info,label){
 const panel=page.locator('.game-panel-overlay[open] > .game-panel');
 const metrics=await panel.evaluate(p=>{const d=p.querySelector('.game-decoration'),c=p.querySelector('.game-collection'),r=p.getBoundingClientRect();return{panelHeight:p.clientHeight,panelScrollHeight:p.scrollHeight,panelOverflow:getComputedStyle(p).overflowY,decorationBottom:d.getBoundingClientRect().bottom,panelBottom:r.bottom,collectionHeight:c.clientHeight,collectionScrollHeight:c.scrollHeight,collectionOverflow:getComputedStyle(c).overflowY,messageHeight:p.querySelector('.game-overlay-message')?.getBoundingClientRect().height||0};});
 await info.attach(`${label}-metrics`,{body:JSON.stringify(metrics,null,2),contentType:'application/json'});
 await info.attach(`${label}-viewport`,{body:await page.screenshot(),contentType:'image/png'});
 expect(metrics.panelOverflow).toBe('auto');
 expect(metrics.collectionScrollHeight).toBeLessThanOrEqual(metrics.collectionHeight+1);
 await panel.evaluate(p=>p.scrollTo(0,p.scrollHeight));
 const last=page.locator('.game-collection-tier:not([hidden]) [data-decor-preview]').last();
 // No automatic scroll: the whole last row must actually fit at the panel's end.
 expect(await last.evaluate(el=>{const r=el.getBoundingClientRect(),p=el.closest('.game-panel').getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return r.top>=p.top&&r.bottom<=p.bottom-4&&r.bottom<=innerHeight&&(hit===el||el.contains(hit));})).toBe(true);
 await last.tap();await expect(page.locator('[data-preview-item]')).toHaveAttribute('data-preview-item',await last.getAttribute('data-decor-preview'));
 return metrics;
}
for(const [width,height] of [[320,240],[320,568],[390,664],[390,844],[844,390],[768,1024],[1440,900]])test(`decoration controls and final shelf remain reachable ${width}x${height}`,async({page},info)=>{
 test.setTimeout(120000);await page.setViewportSize({width,height});await ready(page);
 await page.locator('[data-decor-filter="all"]').tap();
 await page.locator('.game-collection-tier:not([hidden]) [data-decor-preview]').last().tap();
 await page.locator('[data-decor-equip]').tap();await expect(page.locator('.game-overlay-message')).toContainText('飾ったよ');
 if(process.env.DECOR_BASELINE){
  const panel=page.locator('.game-panel-overlay[open] > .game-panel');await panel.evaluate(p=>p.scrollTop=0);
  const metrics=await panel.evaluate(p=>({overflow:getComputedStyle(p).overflowY,panelBottom:p.getBoundingClientRect().bottom,decorationBottom:p.querySelector('.game-decoration').getBoundingClientRect().bottom,messageHeight:p.querySelector('.game-overlay-message').getBoundingClientRect().height}));
  console.log('LEGACY_DECOR_METRICS',JSON.stringify(metrics));await page.screenshot({path:info.outputPath('legacy-decor-after-equip.png')});
  expect(metrics.overflow).toBe('hidden');expect(metrics.decorationBottom-metrics.panelBottom).toBeGreaterThan(20);return;
 }
 await shelfEnd(page,info,`decor-${width}x${height}-after-equip`);
 for(const tier of DECOR_TIERS){
  const tab=page.locator(`[data-decor-tier="${tier.id}"]`);await reachable(tab);await tab.tap();
  await shelfEnd(page,info,`decor-${width}x${height}-${tier.id}`);
  const cancel=page.locator('[data-decor-cancel]');if(await cancel.count()){await reachable(cancel);await cancel.tap();}
 }
 const lastSlot=page.locator('[data-decor-slot]').last();await reachable(lastSlot);await lastSlot.tap();await expect(lastSlot).toHaveAttribute('aria-pressed','true');
 await reachable(page.locator('[data-decor-draw]'));await page.locator('[data-decor-draw]').tap();await expect(page.locator('.game-overlay-message')).not.toBeEmpty();
 await reachable(page.locator('[data-draw-result-close]'));await page.locator('[data-draw-result-close]').tap();await expect(page.locator('.game-draw-result')).toHaveCount(0);
 await shelfEnd(page,info,`decor-${width}x${height}-after-draw`);
 for(const filter of ['owned','all']){const button=page.locator(`[data-decor-filter="${filter}"]`);await reachable(button);await button.tap();await expect(button).toHaveAttribute('aria-pressed','true');}
 const odds=page.locator('[data-game-details="draw-odds"]');await reachable(odds.locator('summary'));await odds.locator('summary').tap();await expect(odds).toHaveAttribute('open','');await odds.locator('summary').tap();await expect(odds).not.toHaveAttribute('open','');
 if(height>=320)await page.setViewportSize({width:height,height:width});await shelfEnd(page,info,`decor-${height}x${width}-rotated`);
 await reachable(page.locator('[data-game-close-panel]'));await page.locator('[data-game-close-panel]').tap();await expect(page.locator('.game-panel-overlay')).not.toBeVisible();
 await page.locator('.game-bottom-dock [data-game-panel="decorate"]').tap();await shelfEnd(page,info,`decor-${height}x${width}-reopened`);
 expect(await page.evaluate(()=>({x:scrollX,y:scrollY,w:document.documentElement.scrollWidth<=innerWidth+1,h:document.documentElement.scrollHeight<=innerHeight+1}))).toEqual({x:0,y:0,w:true,h:true});
});
