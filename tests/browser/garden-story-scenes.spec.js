import {test,expect} from '@playwright/test';
for(const size of [{width:375,height:667},{width:402,height:874},{width:320,height:568}])test(`illustrated events retain controls, art and state at ${size.width}`,async({page},info)=>{
 await page.setViewportSize(size);await page.goto('');
 await page.evaluate(async()=>{
  const {createWorld}=await import('/buncho-ureshi/src/engine.js');
  const {encounterSystem}=await import('/buncho-ureshi/src/encounters.js');
  const {GARDEN_IDS}=await import('/buncho-ureshi/src/data/gardens.js');
  const {leafEventStatus,leafEventToken,startLeafEvent,chooseLeafEvent,completeLeafEvent}=await import('/buncho-ureshi/src/garden-leaf-event.js');
  const {expeditionToken,startExpedition,chooseExpedition,completeExpedition}=await import('/buncho-ureshi/src/garden-expedition.js');
  const {mountEncounterPanel}=await import('/buncho-ureshi/src/encounter-controller.js');
  for(const file of ['encounter-ui.css','game.css'])await new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href='/buncho-ureshi/src/'+file;link.onload=resolve;link.onerror=reject;document.head.append(link);});
  document.body.innerHTML='<main class="game-world"><div id="event-test" class="game-encounter-host" style="position:fixed;inset:0"></div></main>';
  document.body.dataset.world='buncho';document.body.dataset.sceneControls='open';
  const w=createWorld(Date.parse('2026-11-13T12:00:00Z'),31);
  for(const id of GARDEN_IDS){encounterSystem.selectGarden(w,id,leafEventToken(w));if(leafEventStatus(w).available)break;}
  startLeafEvent(w,leafEventToken(w));chooseLeafEvent(w,'deliver',leafEventToken(w));encounterSystem.leaveGarden(w,leafEventToken(w));encounterSystem.enterGarden(w,leafEventToken(w));completeLeafEvent(w,leafEventToken(w));
  for(const r of w.encounters.gardenFriends.regulars)r.lastInteractionTick=0;
  startExpedition(w,'brook',w.encounters.gardenFriends.regulars.slice(0,2).map(r=>r.id),expeditionToken(w));chooseExpedition(w,'look',expeditionToken(w));completeExpedition(w,expeditionToken(w));
  window.storyWorld=w;window.storyBefore=JSON.stringify(w);window.storyPanel=mountEncounterPanel(document.querySelector('#event-test'),{getWorld:()=>w,initialMode:'garden',transact:async fn=>fn(w)});
 });
 for(const name of ['leaf-gift','expedition','showcase']){
  const card=page.locator(`.finch-garden > [data-garden-details="${name}"]`);
  await card.locator(':scope > summary').click();
  const close=card.locator('.garden-story-close');await expect(close).toBeVisible();
  const art=card.locator('.story-scene-backdrop').first();await expect(art).toBeVisible();await expect(art).toHaveJSProperty('complete',true);expect(await art.evaluate(n=>n.naturalWidth)).toBeGreaterThan(0);
  const bounds=await card.boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(size.width);expect(bounds.y+bounds.height).toBeLessThanOrEqual(size.height);
  expect(await card.evaluate(n=>n.scrollWidth-n.clientWidth)).toBeLessThanOrEqual(2);
  await page.screenshot({path:info.outputPath(`${name}-${size.width}.png`)});
  await close.click();await expect(card).not.toHaveAttribute('open','');
 }
 const card=page.locator('.finch-garden > [data-garden-details=showcase]');await card.locator(':scope > summary').click();
 const picker=card.locator('[data-showcase-actor="0"]');await picker.selectOption({index:1});
 const color=await picker.evaluate(n=>n.selectedOptions[0].dataset.storyColor);await expect(card.locator('[data-story-friend-portrait]').first()).toHaveAttribute('src',new RegExp(color+'\\.webp$'));
 const shop=card.locator('[data-garden-details=showcase-shop]');await expect(shop).not.toHaveAttribute('open','');await shop.locator(':scope > summary').click();await expect(shop).toHaveAttribute('open','');
 await page.evaluate(()=>storyPanel.refresh());await expect(card.locator('[data-garden-details=showcase-shop]')).toHaveAttribute('open','');
 await card.locator('.garden-story-close').click();expect(await page.evaluate(()=>JSON.stringify(storyWorld)===storyBefore)).toBe(true);
 await page.evaluate(()=>{storyWorld.paused=true;storyPanel.refresh();});await card.locator(':scope > summary').click();await expect(card.locator('[data-game-action=resume-events]')).toBeVisible();await expect(card.locator('[data-showcase-start]')).toHaveCount(0);
 await page.evaluate(()=>storyPanel.destroy());
});
