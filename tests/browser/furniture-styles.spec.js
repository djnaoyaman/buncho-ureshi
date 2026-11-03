import {test,expect} from '@playwright/test';
import {createWorld,DECOR_SLOTS,DECOR_COLORS,DECOR_TIERS} from '../../src/engine.js';
const now=Date.UTC(2026,10,3,12),dbName='buncho-ureshi-garden-v1';
async function record(page,world){return page.evaluate(({dbName,world})=>new Promise((resolve,reject)=>{const open=indexedDB.open(dbName,1);open.onupgradeneeded=()=>open.result.createObjectStore('world');open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,tx=db.transaction('world',world?'readwrite':'readonly'),store=tx.objectStore('world'),req=world?store.put(world,'current'):store.get('current');tx.oncomplete=()=>{db.close();resolve(req.result)};tx.onerror=()=>reject(tx.error)}}),{dbName,world});}
for(const [tier,style,width] of [['cozy','warm',320],['lovely','mid-century',390],['special','gold',1280]])test(`${style} furnishings keep identity through preview equip cancel reload at ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:844});await page.addInitScript(n=>Date.now=()=>n,now);await page.goto('');
 const world=createWorld(now);world.paused=true;world.decor.lifetimePoints=9999;world.decor.inventory=DECOR_SLOTS.flatMap(s=>DECOR_COLORS.flatMap(c=>DECOR_TIERS.map(t=>({id:`${s.id}-${c.id}-${t.id}`,slot:s.id,color:c.id,tier:t.id}))));
 // Resolve the gold tier from existing catalog, never introduce a new item ID.
 const chosenTier=tier;
 for(const slot of DECOR_SLOTS)world.decor.equipped[slot.id]=`${slot.id}-mint-${chosenTier}`;
 await record(page,world);await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 await expect(page.locator(`.game-furnishing [data-furniture-style="${style}"]`)).toHaveCount(9);
 await info.attach(`${style}-cage`,{body:await page.screenshot(),contentType:'image/png'});
 await page.locator('.game-scene-controls-toggle').click();await page.locator('.game-bottom-dock [data-game-panel="decorate"]').click();
 for(const slot of ['water','swing','paper']){
  await page.locator(`[data-decor-slot="${slot}"]`).click();await page.locator(`[data-decor-tier="${chosenTier}"]`).click();
  const id=`${slot}-rose-${chosenTier}`;await page.locator(`[data-decor-preview="${id}"]`).click();
  await expect(page.locator('[data-preview-item]')).toHaveAttribute('data-preview-item',id);
  await expect(page.locator(`[data-preview-item] > .game-item-art [data-furniture-style="${style}"]`)).toHaveCount(1);
  expect((await record(page)).decor.equipped[slot]).toBe(world.decor.equipped[slot]);
  await page.locator('[data-decor-cancel]').click();await page.locator(`[data-decor-preview="${id}"]`).click();await page.locator(`[data-decor-equip="${id}"]`).click();world.decor.equipped[slot]=id;
 }
 await info.attach(`${style}-catalog`,{body:await page.screenshot(),contentType:'image/png'});
 await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 const saved=await record(page);expect(saved.decor.inventory).toEqual(world.decor.inventory);expect(saved.decor.equipped).toEqual(world.decor.equipped);expect(saved.birds).toEqual(world.birds);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
