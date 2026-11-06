import {test,expect} from '@playwright/test';
// PRIVATE future integration gate. Not part of frozen UI-only QA snapshot.
// Asset readiness is enabled ONLY in this browser fixture to inspect candidate art.
for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390}])test(`private world7 viewport and garden assets ${size.width}x${size.height}`,async({page},testInfo)=>{
 await page.setViewportSize(size);await page.goto('game/');await page.waitForFunction(()=>document.body.dataset.gameIntro==='done');await page.locator('.game-scene-controls-toggle').click();await expect(page.locator('.game-scene-controls-toggle')).toHaveAttribute('aria-expanded','true');
 await expect(page.locator('[data-gold-balance]').first()).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+2)).toBe(true);
 await page.locator('[data-game-panel="outdoors"]').click();await expect(page.locator('[data-garden-select]')).toHaveCount(12);
 // Separate candidate assets gate; no source readiness flag is persisted or published.
 await page.evaluate(async()=>{const source=performance.getEntriesByType('resource').map(e=>e.name).find(url=>/\/data\/gardens\.js(?:\?|$)/.test(url));if(!source)throw Error('Mounted garden module URL missing');const {GARDENS}=await import(source);for(const garden of GARDENS)garden.background.releaseReady=true;});
 for(const id of ['komorebi','mizukagami','onsen']){
  await page.locator(`[data-garden-select="${id}"]`).click();await expect(page.locator(`.finch-garden-scenery[data-garden-id="${id}"]`)).toBeVisible();
  await page.locator('.finch-garden-background').evaluateAll(async images=>{await Promise.all(images.map(i=>i.decode()));if(images.some(i=>!i.naturalWidth))throw Error('Broken garden image');});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+2)).toBe(true);
  await page.screenshot({path:testInfo.outputPath(`world7-${id}-${size.width}.png`)});
 }
 await page.locator('[data-game-close-panel]').click();await expect(page.locator('.game-panel-overlay')).not.toBeVisible();
 await page.locator('#game-nav-open').click();await page.locator('[data-game-panel="settings"]').click();await expect(page.locator('[data-settings-music]')).toBeVisible();
 await page.locator('.game-owner-setting').click();await page.screenshot({path:testInfo.outputPath(`world7-owner-${size.width}.png`)});
});
async function extremeWorld(page,size){
 await page.setViewportSize(size);await page.goto('game/');await page.waitForFunction(()=>document.body.dataset.gameIntro==='done');await page.locator('.game-scene-controls-toggle').click();await expect(page.locator('.game-scene-controls-toggle')).toHaveAttribute('aria-expanded','true');
 await page.evaluate(async()=>{const urls=performance.getEntriesByType('resource').map(e=>e.name);const engineURL=urls.find(u=>/\/src\/engine\.js(?:\?|$)/.test(u)),storeURL=urls.find(u=>/\/src\/game-store\.js(?:\?|$)/.test(u));if(!engineURL||!storeURL)throw Error('Mounted source modules missing');const engine=await import(engineURL),{openGameStore}=await import(storeURL),store=await openGameStore();try{await store.transact(w=>{w.paused=true;w.decor.points=w.decor.lifetimePoints=1000000000;w.economy.gold=w.economy.lifetimeGold=1000000000;engine.renameBird(w,w.birds[0].id,'とてもながいおなまえのおもちさん');engine.bumpRevision(w);return w;});}finally{store.close();}});
 await expect(page.locator('[data-gold-balance]').first()).toHaveAttribute('data-full-amount','1000000000');await expect(page.locator('[data-decor-points]').first()).toHaveAccessibleName('1,000,000,000 Gems');await expect(page.locator('[data-gold-balance]').first()).toHaveAccessibleName('1,000,000,000 Gold');
}
async function openExtremeSettings(page){
 await page.locator('#game-nav-open').click();await page.locator('[data-game-panel="settings"]').click();await page.locator('[data-game-details="wallet"]>summary').click();await expect(page.locator('.game-wallet-details')).toContainText('1,000,000,000');await page.locator('.game-owner-setting').click();
}
for(const size of [{width:320,height:568},{width:844,height:390}]){
 test(`private world7 extreme balances names and viewport ${size.width}`,async({page},testInfo)=>{
  await extremeWorld(page,size);
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight+2)).toBe(true);
  // The proportional backdrop deliberately extends beyond the clipped stage.
  // A background's negative x is not an offscreen control. Check both contracts.
  const scene=await page.evaluate(()=>{const room=document.querySelector('.game-room'),stage=document.querySelector('.game-main'),r=room.getBoundingClientRect(),s=stage.getBoundingClientRect(),css=getComputedStyle(stage);return{room:{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height},stage:{left:s.left,right:s.right,top:s.top,bottom:s.bottom},ratio:Number(getComputedStyle(room).getPropertyValue('--room-ratio')),overflowX:css.overflowX,overflowY:css.overflowY};});
  expect(scene.overflowX).toBe('hidden');expect(scene.overflowY).toBe('hidden');
  expect(scene.room.left).toBeLessThanOrEqual(scene.stage.left+1);expect(scene.room.right).toBeGreaterThanOrEqual(scene.stage.right-1);
  expect(scene.room.top).toBeLessThanOrEqual(scene.stage.top+1);expect(scene.room.bottom).toBeGreaterThanOrEqual(scene.stage.bottom-1);
  const expectedRatio=size.width<=600?.75:1.6;expect(scene.ratio).toBe(expectedRatio);expect(scene.room.width/scene.room.height).toBeCloseTo(expectedRatio,2);
  for(const sel of ['#game-open-bird','#game-nav-open'])await expect(async()=>{
   const b=await page.locator(sel).evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,hit:el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});
   expect(b.x).toBeGreaterThanOrEqual(0);expect(b.y).toBeGreaterThanOrEqual(0);expect(b.x+b.w).toBeLessThanOrEqual(size.width+1);expect(b.y+b.h).toBeLessThanOrEqual(size.height+1);expect(b.w).toBeGreaterThanOrEqual(44);expect(b.h).toBeGreaterThanOrEqual(44);expect(b.hit).toBe(true);
  }).toPass({timeout:10000});
  await page.screenshot({path:testInfo.outputPath(`world7-maximum-${size.width}.png`)});
  await openExtremeSettings(page);
 });
 // A geometry failure must not prevent the keyboard-height flow from running.
 test(`private world7 extreme names and keyboard-height controls ${size.width}`,async({page},testInfo)=>{
  await extremeWorld(page,size);await openExtremeSettings(page);
  // Reduced viewport emulates available keyboard space, not a physical iOS keyboard.
  await page.setViewportSize({width:size.width,height:300});await page.locator('[data-owner-name]').fill('ながい名前でも届く飼い主');await page.locator('[data-owner-name]').focus();await expect(page.locator('[data-game-close-panel]')).toBeVisible();await page.locator('[data-owner-save]').scrollIntoViewIfNeeded();
  await expect(async()=>{const r=await page.locator('[data-owner-save]').evaluate(el=>{const b=el.getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height,hit:el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))};});expect(r.x).toBeGreaterThanOrEqual(0);expect(r.x+r.w).toBeLessThanOrEqual(size.width+1);expect(r.y).toBeGreaterThanOrEqual(0);expect(r.y+r.h).toBeLessThanOrEqual(301);expect(r.w).toBeGreaterThanOrEqual(44);expect(r.h).toBeGreaterThanOrEqual(44);expect(r.hit).toBe(true);}).toPass({timeout:10000});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+2)).toBe(true);await page.screenshot({path:testInfo.outputPath(`world7-keyboard-${size.width}.png`)});await page.locator('[data-owner-save]').click();await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('buncho.owner-profile.v1')).name)).toBe('ながい名前でも届く飼い主');
 });
}
