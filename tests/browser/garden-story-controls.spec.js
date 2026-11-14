import {test,expect} from '@playwright/test';
for(const size of [{width:320,height:568},{width:375,height:667}])test(`event icons and close on small screens ${size.width}`,async({page},info)=>{
 await page.setViewportSize(size);await page.goto('');
 await page.evaluate(async()=>{
  const {createWorld}=await import('/buncho-ureshi/src/engine.js');
  const {encounterSystem}=await import('/buncho-ureshi/src/encounters.js');
  const {expeditionToken}=await import('/buncho-ureshi/src/garden-expedition.js');
  const {mountEncounterPanel}=await import('/buncho-ureshi/src/encounter-controller.js');
  await Promise.all(['encounter-ui.css','game.css'].map(file=>new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href='/buncho-ureshi/src/'+file;link.onload=resolve;link.onerror=reject;document.head.append(link);})));
  document.body.innerHTML='<main class="game-world"><div id="event-test" class="game-encounter-host" style="position:fixed;inset:0"></div></main>';
  document.body.dataset.world='buncho';document.body.dataset.sceneControls='open';
  const w=createWorld(Date.UTC(2026,10,14,8));encounterSystem.selectGarden(w,'komorebi',expeditionToken(w));
  window.eventBefore=JSON.stringify(w);window.eventWorld=w;
  window.eventPanel=mountEncounterPanel(document.querySelector('#event-test'),{getWorld:()=>w,initialMode:'garden',transact:async fn=>fn(w)});
 });
 const boxes=await page.locator('.finch-garden > details[name="garden-story"] > summary').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return {y:r.y,b:r.bottom}}));expect(boxes).toHaveLength(2);expect(boxes[0].b).toBeLessThanOrEqual(boxes[1].y);
 for(const name of ['leaf-gift','expedition']){
  const card=page.locator(`[data-garden-details="${name}"]`),summary=card.locator(':scope > summary');
  await expect(summary).toBeVisible();await expect(summary).toHaveText('');
  const box=await summary.boundingBox();expect(box.width).toBeGreaterThanOrEqual(44);expect(box.width).toBeLessThanOrEqual(56);expect(box.height).toBeGreaterThanOrEqual(44);
  await summary.click();const close=card.locator('[data-garden-story-close]');await expect(close).toBeVisible();
  await expect(card.locator('.garden-story-title')).toBeVisible();
  const cb=await close.boundingBox();expect(cb.x).toBeGreaterThanOrEqual(0);expect(cb.y).toBeGreaterThanOrEqual(0);expect(cb.x+cb.width).toBeLessThanOrEqual(size.width);expect(cb.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({path:info.outputPath(`${name}-${size.width}.png`)});
  await close.click();await expect(card).not.toHaveAttribute('open','');await expect(summary).toBeFocused();
  await summary.press('Enter');await expect(close).toBeVisible();await close.focus();await page.keyboard.press('Escape');await expect(summary).toBeFocused();
 }
 expect(await page.evaluate(()=>JSON.stringify(eventWorld)===eventBefore)).toBe(true);
 await page.evaluate(()=>eventPanel.destroy());
});
