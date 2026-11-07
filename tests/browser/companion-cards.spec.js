import {test,expect} from '@playwright/test';
async function enter(page){
 await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 await page.locator('.game-scene-controls-toggle').click();await page.locator('[data-game-panel=outdoors]').click();await expect(page.locator('.game-encounter-host')).toHaveAttribute('aria-busy','false');
}
async function world(page){return page.evaluate(async()=>{
 const {DB_NAME}=await import(performance.getEntriesByType('resource').find(e=>e.name.includes('/src/game-store.js')).name);
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 try{return await new Promise((resolve,reject)=>{const r=db.transaction('world').objectStore('world').get('current');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();}
});}
async function prepare(page,size){
 await page.setViewportSize(size);await page.addInitScript(()=>{Date.now=()=>1793923200000;Math.random=()=>.99;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));});await enter(page);
 const versions=await page.evaluate(()=>{const urls=performance.getEntriesByType('resource').map(e=>new URL(e.name));return ['encounter-controller.js','garden-companion-ui.js'].map(name=>urls.find(u=>u.pathname.endsWith('/src/'+name))?.searchParams.get('v'));});expect(versions[0]).toBeTruthy();expect(versions[1]).toBe(versions[0]);
 await page.evaluate(async()=>{
  const urls=performance.getEntriesByType('resource').map(e=>e.name),find=n=>urls.find(u=>u.includes('/src/'+n+'.js'));
  const engine=await import(find('engine')),{openGameStore}=await import(find('game-store'));const store=await openGameStore();try{await store.transact(w=>{
   w.paused=true;for(const [name,color] of [['ゆず','cinnamon'],['ころり','sakura'],['はつゆき','white'],['はちみつ','cinnamon'],['べーぐるというながいなまえ','silver']])engine.createBird(w,{name,color,home:'resident',stage:'adult'});
   w.encounters.garden.open=false;w.encounters.gardenFriends.accompany=false;w.encounters.gardenFriends.companions=[];w.encounters.gardenFriends.attendees=[];engine.bumpRevision(w);return w;
  });}finally{store.close();}
 });await enter(page);
}
const pane=page=>page.locator('[data-garden-details=companions]'),toggle=page=>pane(page).locator(':scope > summary');
async function save(page){await page.locator('[data-garden-companions-save]').click();await expect(page.locator('.finch-companion-feedback')).toContainText('覚えたよ');await expect(page.locator('.game-encounter-host')).toHaveAttribute('aria-busy','false');}
async function hitTarget(locator){await locator.scrollIntoViewIfNeeded();const box=await locator.evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,viewport:[innerWidth,innerHeight],hit:el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});expect(box.w).toBeGreaterThanOrEqual(44);expect(box.h).toBeGreaterThanOrEqual(44);expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0);expect(box.x+box.w).toBeLessThanOrEqual(box.viewport[0]+.5);expect(box.y+box.h).toBeLessThanOrEqual(box.viewport[1]+.5);expect(box.hit).toBe(true);}
for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390}])test(`family cards distinguish current and next outing, save and remain reachable ${size.width}x${size.height}`,async({page},info)=>{
 await prepare(page,size);await toggle(page).click();await expect(pane(page)).toHaveAttribute('open','');const panelStyle=await pane(page).evaluate(el=>({maxHeight:parseFloat(getComputedStyle(el).maxHeight),padding:parseFloat(getComputedStyle(el).paddingTop)}));expect(panelStyle.maxHeight).toBe(size.height<=500?size.height-138:Math.min(650,size.height-240));expect(panelStyle.padding).toBe(size.height<=500?12:16);await expect(page.locator('[data-garden-accompany="false"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-garden-companion=b1]')).toBeDisabled();await expect(page.locator('.finch-companion-current')).toContainText('お留守番');
 await hitTarget(toggle(page));
 const before=await world(page);await page.locator('[data-garden-accompany="true"]').click();await expect(page.locator('[data-garden-companions-save]')).toBeDisabled();
 for(const id of ['b1','b2','b3','b4'])await page.locator(`[data-garden-companion=${id}]`).click();await page.locator('[data-garden-companion=b5]').click();await expect(page.locator('[data-garden-companion=b5]')).toHaveAttribute('aria-pressed','false');await expect(page.locator('.finch-companion-feedback')).toContainText('4羽まで');expect(await world(page)).toEqual(before);
 await expect(page.locator('[data-garden-companion=b2] img')).toHaveAttribute('src',/cinnamon\.webp$/);await expect(page.locator('[data-garden-companion=b3] img')).toHaveAttribute('src',/sakura\.webp$/);
 await page.locator('.finch-companion-card img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));await pane(page).evaluate(el=>{el.scrollTop=0;});await page.screenshot({path:info.outputPath(`companion-cards-selected-${size.width}x${size.height}.png`)});for(const id of ['b1','b6'])await hitTarget(page.locator(`[data-garden-companion=${id}]`));
 await hitTarget(page.locator('[data-garden-companions-save]'));await save(page);let saved=await world(page);expect(saved.encounters.gardenFriends.companions).toEqual(['b1','b2','b3','b4']);expect(saved.encounters.gardenFriends.accompany).toBe(true);expect(saved.encounters.gardenFriends.attendees).toEqual([]);
 const protectedPart=w=>{const c=structuredClone(w);delete c.revision;delete c.encounters.gardenFriends.accompany;delete c.encounters.gardenFriends.companions;return c;};expect(protectedPart(saved)).toEqual(protectedPart(before));
 await hitTarget(toggle(page));
 await toggle(page).click();await toggle(page).click();await page.locator('[data-garden-accompany="false"]').click();await toggle(page).click();await toggle(page).click();await expect(page.locator('[data-garden-accompany="true"]')).toHaveAttribute('aria-pressed','true');expect(await world(page)).toEqual(saved);
 await page.locator('[data-garden-accompany="false"]').click();await save(page);await enter(page);await toggle(page).click();await expect(page.locator('[data-garden-accompany="false"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-garden-companion=b1]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-garden-companion=b1]')).toBeDisabled();
 await page.locator('[data-garden-accompany="true"]').click();await save(page);await toggle(page).click();await page.locator('[data-game-close-panel]').click();await expect(page.locator('.game-panel-overlay')).not.toBeVisible();await page.locator('[data-game-panel=outdoors]').click();await expect(page.locator('[data-garden-household]')).toHaveCount(4);await toggle(page).click();await expect(page.locator('.finch-companion-current')).toContainText('おもち');
 await page.locator('[data-garden-accompany="false"]').click();await save(page);await expect(page.locator('[data-garden-household]')).toHaveCount(4);await toggle(page).click();await page.locator('[data-garden-select=mizukagami]').click();await expect(page.locator('[data-garden-household]')).toHaveCount(4);await toggle(page).click();
 const dimensions=await pane(page).evaluate(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth,top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,view:innerHeight}));expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width+1);expect(dimensions.top).toBeGreaterThanOrEqual(0);expect(dimensions.bottom).toBeLessThanOrEqual(dimensions.view);await hitTarget(toggle(page));
 await page.screenshot({path:info.outputPath(`companion-cards-${size.width}x${size.height}.png`)});
});

test('unfinished cards survive polling and keyboard focus, then cancel on leaving the garden',async({page})=>{
 await prepare(page,{width:390,height:844});await toggle(page).click();const before=await world(page);await page.locator('[data-garden-accompany="true"]').click();await page.locator('[data-garden-companion=b1]').focus();await page.keyboard.press('Space');await expect(page.locator('[data-garden-companion=b1]')).toHaveAttribute('aria-pressed','true');await page.waitForTimeout(3400);await expect(page.locator('[data-garden-companion=b1]')).toBeFocused();expect(await world(page)).toEqual(before);
 await page.locator('[data-encounter-back]').click();await page.locator('[data-finch-go-garden]').click();await toggle(page).click();await expect(page.locator('[data-garden-accompany="false"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-garden-companion=b1]')).toHaveAttribute('aria-pressed','false');
});

test('landscape companion sheet stays above garden navigation and below crow safety notice',async({page},info)=>{
 await prepare(page,{width:844,height:390});await toggle(page).click();await hitTarget(toggle(page));
 const before=await world(page);
 await page.evaluate(async w=>{
  const url=performance.getEntriesByType('resource').find(e=>e.name.includes('/src/garden-crow-ui.js')).name;
  const {renderCrowNotice}=await import(url);
  document.querySelector('.finch-garden').insertAdjacentHTML('beforeend',renderCrowNotice(w,{warning:{id:'large-billed-crow'}}));
 },before);
 const warning=page.locator('[data-crow-phase=warning]');await expect(warning).toBeVisible();await hitTarget(warning.locator('[data-finch-go-home]'));await warning.locator('[data-finch-go-home]').click({trial:true});
 const layers=await page.evaluate(()=>['.finch-garden-selector-wrap','.finch-garden-dock','.finch-crow-notice'].map(s=>Number(getComputedStyle(document.querySelector(s)).zIndex)));expect(layers[1]).toBeGreaterThan(layers[0]);expect(layers[2]).toBeGreaterThan(layers[1]);expect(await world(page)).toEqual(before);
 await page.screenshot({path:info.outputPath('companion-crow-warning-stays-in-front.png')});
 await warning.evaluate(el=>el.remove());await toggle(page).click();await expect(pane(page)).not.toHaveAttribute('open','');
});
