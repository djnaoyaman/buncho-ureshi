import{test,expect}from'@playwright/test';
test('free showcase, optional shop, interruption and replay on a small phone',async({page},info)=>{
 await page.setViewportSize({width:375,height:667});await page.goto('');
 await page.evaluate(async()=>{
  const {createWorld,validateWorld}=await import('/buncho-ureshi/src/engine.js');
  const {encounterSystem}=await import('/buncho-ureshi/src/encounters.js');
  const {GARDEN_IDS}=await import('/buncho-ureshi/src/data/gardens.js');
  const l=await import('/buncho-ureshi/src/garden-leaf-event.js'),e=await import('/buncho-ureshi/src/garden-expedition.js');
  const {mountEncounterPanel}=await import('/buncho-ureshi/src/encounter-controller.js');
  for(const file of ['encounter-ui.css','game.css'])await new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href='/buncho-ureshi/src/'+file;link.onload=resolve;link.onerror=reject;document.head.append(link);});
  document.body.innerHTML='<main class="game-world"><div id="event-test" class="game-encounter-host" style="position:fixed;inset:0"></div></main>';document.body.dataset.world='buncho';document.body.dataset.sceneControls='open';
  const w=createWorld(Date.UTC(2026,10,14,8),31);for(const id of GARDEN_IDS){encounterSystem.selectGarden(w,id,l.leafEventToken(w));if(l.leafEventStatus(w).available)break;}
  l.startLeafEvent(w,l.leafEventToken(w));l.chooseLeafEvent(w,'deliver',l.leafEventToken(w));encounterSystem.leaveGarden(w,l.leafEventToken(w));encounterSystem.enterGarden(w,l.leafEventToken(w));l.completeLeafEvent(w,l.leafEventToken(w));
  for(const r of w.encounters.gardenFriends.regulars)r.lastInteractionTick=0;
  e.startExpedition(w,'brook',w.encounters.gardenFriends.regulars.slice(0,2).map(r=>r.id),e.expeditionToken(w));e.chooseExpedition(w,'look',e.expeditionToken(w));e.completeExpedition(w,e.expeditionToken(w));
  w.economy.gold=2;window.showcaseWorld=w;window.beforeGems=w.decor.points;window.diaryOpened=0;
  window.showcasePanel=mountEncounterPanel(document.querySelector('#event-test'),{getWorld:()=>w,initialMode:'garden',onDiary:()=>window.diaryOpened++,transact:async fn=>{fn(w);validateWorld(w);}});
 });
 const card=page.locator('[data-garden-details=showcase]');await card.locator(':scope > summary').click();
 await expect(card.locator('[data-showcase-buy=bell][data-showcase-payment=gold]')).toBeDisabled();
 await card.locator('[data-showcase-buy=bell][data-showcase-payment=discovery]').click();
 await expect(card.locator('[data-showcase-item] option[value=bell]')).toHaveCount(1);
 await card.locator('[data-showcase-item]').selectOption('bell');
 for(const theme of ['song','discovery','style']){
  await card.locator(`[data-showcase-start=${theme}]`).click();await expect(card.locator('[data-showcase-complete]')).toBeVisible();
  await page.screenshot({path:info.outputPath(`showcase-${theme}.png`)});
  if(theme==='song'){await card.locator('.garden-story-header [data-garden-story-close]').click();await expect(card).not.toHaveAttribute('open','');await card.locator(':scope > summary').click();}
  await card.locator('[data-showcase-complete]').click();await expect(card.locator('[data-showcase-diary]')).toBeVisible();await card.locator('[data-showcase-next]').click();
 }
 expect(await page.evaluate(()=>showcaseWorld.decor.points-beforeGems)).toBe(5);
 await card.locator('[data-showcase-start=song]').click();await card.locator('[data-showcase-complete]').click();await card.locator('[data-showcase-diary]').click();expect(await page.evaluate(()=>diaryOpened)).toBe(1);
 expect(await page.evaluate(()=>showcaseWorld.decor.points-beforeGems)).toBe(5);expect(await page.evaluate(()=>showcaseWorld.economy.gold)).toBe(2);expect(await page.evaluate(()=>showcaseWorld.expedition.entries.length)).toBe(1);
 await page.evaluate(()=>showcasePanel.destroy());
});
