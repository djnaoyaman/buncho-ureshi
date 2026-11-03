import {test,expect} from '@playwright/test';
// PRIVATE future integration gate. Not part of frozen UI-only QA snapshot.
// Asset readiness is enabled ONLY in this browser fixture to inspect candidate art.
for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390}])test(`private world7 viewport and garden assets ${size.width}x${size.height}`,async({page},testInfo)=>{
 await page.setViewportSize(size);await page.goto('game/');await page.waitForFunction(()=>document.body.dataset.gameIntro==='done');
 await expect(page.locator('[data-gold-balance]').first()).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+2)).toBe(true);
 await page.locator('[data-game-panel="outdoors"]').click();await expect(page.locator('[data-garden-select]')).toHaveCount(9);
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
for(const size of [{width:320,height:568},{width:844,height:390}])test(`private world7 extreme balances names and keyboard ${size.width}`,async({page},testInfo)=>{
 await page.setViewportSize(size);await page.goto('game/');await page.waitForFunction(()=>document.body.dataset.gameIntro==='done');
 await page.evaluate(async()=>{const urls=performance.getEntriesByType('resource').map(e=>e.name);const engineURL=urls.find(u=>/\/src\/engine\.js(?:\?|$)/.test(u)),storeURL=urls.find(u=>/\/src\/game-store\.js(?:\?|$)/.test(u));if(!engineURL||!storeURL)throw Error('Mounted source modules missing');const engine=await import(engineURL),{openGameStore}=await import(storeURL),store=await openGameStore();try{await store.transact(w=>{w.paused=true;w.decor.points=w.decor.lifetimePoints=1000000000;w.economy.gold=w.economy.lifetimeGold=1000000000;engine.renameBird(w,w.birds[0].id,'とてもながいおなまえのおもちさん');engine.bumpRevision(w);return w;});}finally{store.close();}});
 await expect(page.locator('[data-gold-balance]').first()).toHaveAttribute('data-full-amount','1000000000');await expect(page.locator('[data-decor-points]').first()).toHaveAccessibleName('1,000,000,000 Gems');await expect(page.locator('[data-gold-balance]').first()).toHaveAccessibleName('1,000,000,000 Gold');
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight+2)).toBe(true);
 for(const sel of ['.game-room','#game-open-bird','#game-nav-open']){const box=await page.locator(sel).first().boundingBox();expect(box).not.toBeNull();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(size.height+1);}
 await page.screenshot({path:testInfo.outputPath(`world7-maximum-${size.width}.png`)});await page.locator('#game-nav-open').click();await page.locator('[data-game-panel="settings"]').click();await page.locator('[data-game-details="wallet"]>summary').click();await expect(page.locator('.game-wallet-details')).toContainText('1,000,000,000');await page.locator('.game-owner-setting').click();
 // Reduced available viewport is keyboard-height emulation, not a physical iOS keyboard claim.
 await page.setViewportSize({width:size.width,height:300});await page.locator('.game-owner-editor input').first().focus();await expect(page.locator('[data-game-close-panel]')).toBeVisible();await page.locator('[data-owner-save]').scrollIntoViewIfNeeded();const saveBox=await page.locator('[data-owner-save]').boundingBox();expect(saveBox.y+saveBox.height).toBeLessThanOrEqual(301);await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+2)).toBe(true);await page.screenshot({path:testInfo.outputPath(`world7-keyboard-${size.width}.png`)});
});
