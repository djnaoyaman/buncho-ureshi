import {test,expect} from '@playwright/test';
for(const size of [{width:320,height:568},{width:375,height:667},{width:844,height:390}])test(`keepsake illustrated cards and terrain placement ${size.width}`,async({page},info)=>{
 await page.setViewportSize(size);await page.goto('');
 await page.evaluate(async()=>{
  await Promise.all(['game.css','encounter-ui.css'].map(file=>new Promise((resolve,reject)=>{const l=document.createElement('link');l.rel='stylesheet';l.href='/buncho-ureshi/src/'+file;l.onload=resolve;l.onerror=reject;document.head.append(l);})));document.body.dataset.world='buncho';document.body.dataset.sceneControls='open';
  const [{createWorld},{encounterSystem},leaf,{mountEncounterPanel},exp,{GARDENS}]=await Promise.all([import('/buncho-ureshi/src/engine.js'),import('/buncho-ureshi/src/encounters.js'),import('/buncho-ureshi/src/garden-leaf-event.js'),import('/buncho-ureshi/src/encounter-controller.js'),import('/buncho-ureshi/src/garden-expedition.js'),import('/buncho-ureshi/src/data/gardens.js')]);
  const w=createWorld(Date.UTC(2026,10,14,8));encounterSystem.selectGarden(w,'komorebi',leaf.leafEventToken(w));leaf.startLeafEvent(w,leaf.leafEventToken(w));leaf.chooseLeafEvent(w,'display',leaf.leafEventToken(w));encounterSystem.leaveGarden(w,leaf.leafEventToken(w));encounterSystem.selectGarden(w,'komorebi',leaf.leafEventToken(w));leaf.completeLeafEvent(w,leaf.leafEventToken(w));
  for(const r of w.encounters.gardenFriends.regulars.slice(0,4))r.lastInteractionTick=w.tick;
  exp.startExpedition(w,'brook',w.encounters.gardenFriends.regulars.slice(2,4).map(b=>b.id),exp.expeditionToken(w));exp.chooseExpedition(w,'look',exp.expeditionToken(w));
  document.body.innerHTML='<main class="game-world"><div id="fixture" class="game-encounter-host" style="position:fixed;inset:0"></div></main>';
  window.ks={w,encounterSystem,leaf,GARDENS};ks.panel=mountEncounterPanel(document.querySelector('#fixture'),{getWorld:()=>w,initialMode:'garden',transact:async fn=>fn(w)});ks.before=JSON.stringify(w);
 });
 // Landscape may crop out every safe terrain contact; portrait must show the earned object.
 if(size.height>size.width)await expect(page.locator('[data-garden-bookmark]')).toBeVisible();
 const event=page.locator('[data-garden-details=expedition]');await event.locator(':scope>summary').click();
 const art=event.locator('[data-expedition-art]');await expect(art).toBeVisible();
 await expect(art.locator('[data-keepsake-color=silver]')).toHaveCount(1);await expect(art.locator('[data-keepsake-color=white]')).toHaveCount(1);
 expect(await event.locator('.expedition-discovery').evaluate(n=>getComputedStyle(n).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
 expect(await art.locator('.keepsake-signature').evaluate(n=>parseFloat(getComputedStyle(n).fontSize))).toBeGreaterThanOrEqual(11);
 await art.scrollIntoViewIfNeeded();await expect.poll(()=>art.locator('img').evaluateAll(ns=>ns.every(n=>n.complete&&n.naturalWidth>0))).toBe(true);
 const b=await art.boundingBox();expect(b.width).toBeGreaterThan(200);expect(b.x).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(size.width+1);
 await page.screenshot({path:info.outputPath(`keepsake-card-${size.width}.png`)});
 await event.locator('[data-garden-story-close]').click();expect(await page.evaluate(()=>JSON.stringify(ks.w)===ks.before)).toBe(true);
 const hidden=[];const ids=await page.evaluate(()=>ks.GARDENS.map(g=>g.id));
 for(let i=0;i<ids.length;i++){
  await page.evaluate(id=>{ks.encounterSystem.selectGarden(ks.w,id,ks.leaf.leafEventToken(ks.w));ks.w.leafEvent.entry.gardenId=id;ks.panel.refresh();},ids[i]);
  await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');await page.waitForTimeout(100);
  const mark=page.locator('[data-garden-bookmark]');if(!await mark.isVisible()){hidden.push(ids[i]);continue;}
  const box=await mark.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(size.width);expect(box.y+box.height).toBeLessThanOrEqual(size.height);
  if([0,2,15,21,30].includes(i))await page.screenshot({path:info.outputPath(`keepsake-garden-${i+1}-${size.width}.png`)});
 }
 await info.attach('garden-visibility',{body:JSON.stringify({size,hidden}),contentType:'application/json'});
 // Screen space may exclude a safe ornament on landscape; portrait must not lose the earned gift.
 if(size.height>size.width)expect(hidden).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.evaluate(()=>ks.panel.destroy());
});
