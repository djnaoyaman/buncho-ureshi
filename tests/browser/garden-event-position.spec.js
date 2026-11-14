import {test,expect} from '@playwright/test';
for(const size of [{width:320,height:568},{width:375,height:667},{width:568,height:320}])test(`event icons below jog in right horizontal row ${size.width}`,async({page},info)=>{
 await page.setViewportSize(size);await page.goto('');
 await page.evaluate(async()=>{
  const {createWorld}=await import('/buncho-ureshi/src/engine.js');
  const {encounterSystem}=await import('/buncho-ureshi/src/encounters.js');
  const {expeditionToken}=await import('/buncho-ureshi/src/garden-expedition.js');
  const {mountEncounterPanel}=await import('/buncho-ureshi/src/encounter-controller.js');
  for(const file of ['encounter-ui.css','game.css'])await new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href='/buncho-ureshi/src/'+file;link.onload=resolve;link.onerror=reject;document.head.append(link);});
  document.body.innerHTML='<main class="game-world"><div id="event-test" class="game-encounter-host" style="position:fixed;inset:0"></div></main>';
  document.body.dataset.world='buncho';document.body.dataset.sceneControls='open';
  const w=createWorld(Date.UTC(2026,10,14,8));encounterSystem.selectGarden(w,'komorebi',expeditionToken(w));
  window.eventBefore=JSON.stringify(w);window.eventWorld=w;
  window.eventPanel=mountEncounterPanel(document.querySelector('#event-test'),{getWorld:()=>w,initialMode:'garden',transact:async fn=>fn(w)});
 });
 const icons=page.locator('.finch-garden > details[name="garden-story"] > summary');
 const boxes=await icons.evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,r:r.right,b:r.bottom,w:r.width,h:r.height}}));
 expect(boxes).toHaveLength(2);
 const jog=await page.locator('.finch-garden-selector-wrap').boundingBox();
 expect(Math.abs(boxes[0].y-boxes[1].y)).toBeLessThan(1);
 expect(boxes[1].x-boxes[0].r).toBeGreaterThanOrEqual(9);
 expect(boxes[1].r).toBeLessThanOrEqual(size.width-10);
 expect(size.width-boxes[1].r).toBeLessThanOrEqual(16);
 expect(boxes[0].y-jog.y-jog.height).toBeGreaterThanOrEqual(7);
 expect(boxes[0].y-jog.y-jog.height).toBeLessThanOrEqual(15);
 expect(boxes[0].b).toBeLessThan(size.height-90);
 await page.screenshot({path:info.outputPath(`right-story-row-${size.width}.png`)});
 await page.evaluate(()=>document.body.dataset.sceneControls='closed');
 await expect(icons.first()).toBeHidden();await expect(icons.last()).toBeHidden();
 await page.evaluate(()=>document.body.dataset.sceneControls='open');
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
