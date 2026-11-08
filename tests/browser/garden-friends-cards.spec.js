// Requires the actual application build with Garden Friends A wired. Never use this as a static HTML harness.
import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {createWorld,validateWorld,serializeWorld,parseSave,meetGardenFriendReward} from '../../src/engine.js';
import {encounterSystem} from '../../src/encounters.js';
import {GARDENS} from '../../src/data/gardens.js';
import {friendsScenario} from '../fixtures/garden-friends-scenarios.js';
const NOW=Date.UTC(2026,10,8),token=w=>({worldId:w.worldId,revision:w.revision});
async function record(page,value){return page.evaluate(value=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('world',value?'readwrite':'readonly'),q=value?tx.objectStore('world').put(value,'current'):tx.objectStore('world').get('current');tx.oncomplete=()=>{db.close();resolve(q.result);};tx.onerror=()=>reject(tx.error);};}),value);}
async function open(page,garden,scenario='standard'){
 const w=friendsScenario(scenario,garden);await page.goto('');await record(page,w);await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 const gardenRoot=page.locator('.game-encounter-host .finch-garden'),stage=gardenRoot.locator('.finch-garden-stage'),dock=gardenRoot.locator('.finch-garden-dock');
 // A predator warning may already open this same garden. Navigate only when its dock is absent.
 if(!await dock.isVisible()){
  const outdoors=page.locator('.game-field-nav [data-game-panel=outdoors]');
  if(!await outdoors.isVisible()){const toggle=page.locator('.game-scene-controls-toggle');await expect(toggle).toBeVisible();if(!await dock.isVisible())await toggle.click();}
  if(!await dock.isVisible()){await expect(outdoors).toBeVisible();await outdoors.click();}
 }
 await expect(stage).toBeVisible();await expect(dock).toBeVisible();const friends=dock.locator(':scope > [data-garden-details=friends]');
 if(!['empty','crow-hostile'].includes(scenario)){await expect(friends).toHaveClass(/garden-friend-cards/);await friends.locator(':scope > summary').click();}return friends;
}
async function savePng(page,info,label){const path=info.outputPath(`${label}.png`);await page.screenshot({path});await info.attach(label,{path,contentType:'image/png'});}
// Overlapping unmodified viewport screenshots cover the complete native scroller, not a clipped locator PNG.
async function captureScroll(page,friends,info,label){
 await page.evaluate(()=>document.fonts.ready);await friends.locator('img').evaluateAll(nodes=>Promise.all(nodes.map(img=>img.decode())));
 const geometry=await friends.evaluate(el=>({height:el.clientHeight,total:el.scrollHeight,before:el.scrollTop}));expect(geometry.height).toBeGreaterThan(0);const max=Math.max(0,geometry.total-geometry.height),step=Math.max(1,Math.floor(geometry.height*.7)),offsets=[];
 for(let top=0;top<max;top+=step)offsets.push(top);offsets.push(max);const frames=[];
 for(const [index,top] of offsets.entries()){await friends.evaluate((el,top)=>{el.scrollTop=top;},top);const frame=await friends.evaluate(el=>{const rect=el.getBoundingClientRect();return {top:el.scrollTop,height:el.clientHeight,total:el.scrollHeight,viewportTop:rect.top,viewportBottom:rect.bottom,viewportHeight:innerHeight};});expect(frame.viewportTop).toBeGreaterThanOrEqual(-1);expect(frame.viewportBottom).toBeLessThanOrEqual(frame.viewportHeight+1);frames.push(frame);const path=info.outputPath(`${label}-scroll-${index}.png`);await page.screenshot({path});await info.attach(`${label}-scroll-${index}`,{path,contentType:'image/png'});}
 expect(frames[0].top).toBe(0);expect(frames.at(-1).top+frames.at(-1).height).toBeGreaterThanOrEqual(geometry.total-1);for(let i=1;i<frames.length;i++)expect(frames[i].top).toBeLessThanOrEqual(frames[i-1].top+frames[i-1].height);
 const indexPath=info.outputPath(`${label}-scroll-index.json`);await writeFile(indexPath,JSON.stringify({geometry,frames},null,2));await info.attach(`${label}-scroll-index`,{path:indexPath,contentType:'application/json'});await friends.evaluate((el,top)=>{el.scrollTop=top;},geometry.before);
}
test.beforeEach(async({page})=>{await page.addInitScript(now=>{Date.now=()=>now;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);});
for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1440,height:900}])test(`friends A visual and repeated flow ${size.width}x${size.height}`,async({page},info)=>{
 await page.setViewportSize(size);const friends=await open(page,'kazaguruma'),before=await record(page);await page.evaluate(()=>document.fonts.ready);const cards=friends.locator('[data-friend-card]');expect(await cards.count()).toBeGreaterThan(0);
 for(const card of await cards.all()){await card.scrollIntoViewIfNeeded();await expect(card.locator('img')).toHaveJSProperty('complete',true);expect(await card.locator('img').evaluate(el=>el.naturalWidth)).toBeGreaterThan(0);for(const button of await card.locator('[data-garden-friend-action]').all()){await button.scrollIntoViewIfNeeded();const box=await button.boundingBox();expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);expect(await button.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);await expect(button.locator('svg')).toHaveAttribute('aria-hidden','true');}}
 expect(await record(page)).toEqual(before);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await savePng(page,info,`friends-${size.width}-last-card`);
 const last=cards.last(),id=await last.getAttribute('data-friend-card');await last.locator('[data-garden-friend-action]').first().click();const memory=friends.locator(`[data-friend-card="${id}"] details`);await expect(memory).toBeVisible();const after=await record(page);await memory.locator('summary').focus();await page.keyboard.press('Enter');await expect(memory).toHaveAttribute('open','');await friends.locator(`[data-friend-card="${id}"] [data-garden-friend-action]`).first().click();await expect(page.locator('.finch-notice')).toContainText('また');expect(await record(page)).toEqual(after);await savePng(page,info,`friends-${size.width}-last-memory`);await captureScroll(page,friends,info,`friends-${size.width}`);expect(await record(page)).toEqual(after);
 await friends.locator(':scope > summary').click();await expect(friends).not.toHaveAttribute('open','');expect(await record(page)).toEqual(after);await page.locator('[data-game-close-panel]').click();await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');expect(await record(page)).toEqual(after);
});
test('all 36 real labels/order and mapped art at 390px',async({page},info)=>{await page.setViewportSize({width:390,height:844});for(const g of GARDENS){const friends=await open(page,g.id),card=friends.locator('[data-friend-card]').first();expect(await card.locator('[data-garden-friend-action]').evaluateAll(nodes=>nodes.map(n=>[n.dataset.gardenFriendAction,n.querySelector('span').textContent]))).toEqual(g.actions);for(const button of await card.locator('[data-garden-friend-action]').all()){await button.scrollIntoViewIfNeeded();await expect(button.locator('svg')).toHaveCount(1);expect(await button.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);}await card.scrollIntoViewIfNeeded();await savePng(page,info,`mapping-${g.id}`);}});
for(const size of [{width:320,height:568},{width:844,height:390}])test(`long memories and actual juvenile identity at ${size.width}`,async({page},info)=>{
 await page.setViewportSize(size);await page.emulateMedia({reducedMotion:'reduce'});const friends=await open(page,'onsen','long-juvenile'),before=await record(page),known=friends.locator('[data-friend-card^="known-"]');await expect(known).toHaveCount(1);await expect(known.locator('h5')).toHaveText('こもれびのこはく');await expect(known.locator('img')).toHaveAttribute('src',/juvenile-cinnamon\.webp$/);await expect(known.locator('meter')).toHaveAttribute('value','100');await expect(known.locator('li')).toHaveCount(3);
 for(const details of await friends.locator('.garden-friend-card-memory').all()){await details.locator('summary').focus();await page.keyboard.press('Space');await expect(details).toHaveAttribute('open','');}
 await captureScroll(page,friends,info,`long-juvenile-${size.width}`);// Component-only measured text enlargement, not native browser zoom. Snapshot all fonts before any write.
 const fonts=await friends.evaluate(root=>{
  const nodes=[root,...root.querySelectorAll('*')],before=nodes.map(node=>parseFloat(getComputedStyle(node).fontSize));
  nodes.forEach((node,index)=>node.style.setProperty('font-size',`${before[index]*2}px`,'important'));
  return nodes.map((node,index)=>({index,tag:node.tagName,className:node.getAttribute('class')||'',beforePx:before[index],expectedPx:before[index]*2,afterPx:parseFloat(getComputedStyle(node).fontSize)}));
 });
 const fontPath=info.outputPath(`friends-text200-${size.width}-measurements.json`);await writeFile(fontPath,JSON.stringify({method:'component computed-font doubling in px; not native browser zoom',viewport:size,fonts},null,2));await info.attach(`friends-text200-${size.width}-measurements`,{path:fontPath,contentType:'application/json'});
 const fontPng=info.outputPath(`friends-text200-${size.width}-viewport.png`);await page.screenshot({path:fontPng});await info.attach(`friends-text200-${size.width}-viewport`,{path:fontPng,contentType:'image/png'});
 expect(fonts.length).toBeGreaterThan(0);for(const font of fonts){expect(Number.isFinite(font.beforePx),`font ${font.index} baseline`).toBe(true);expect(font.beforePx).toBeGreaterThan(0);expect(font.afterPx,`font ${font.index} ${font.tag} must double`).toBeCloseTo(font.expectedPx,2);}
 for(const button of await friends.locator('[data-garden-friend-action]').all()){await button.scrollIntoViewIfNeeded();expect(await button.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);}
 await captureScroll(page,friends,info,`text200-${size.width}`);expect(await record(page)).toEqual(before);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('empty and predator representatives retain existing roster restrictions and notices',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});for(const kind of ['empty','crow-hostile','crow-targetless','raptor-hostile','raptor-harmless']){
 const friends=await open(page,'kazaguruma',kind),before=await record(page);if(kind==='empty'||kind==='crow-hostile')await expect(friends).toHaveCount(0);else await expect(friends.locator('[data-friend-card]')).toHaveCount(4);
 if(kind.startsWith('crow'))await expect(page.locator('.finch-crow-notice')).toBeVisible();if(kind.startsWith('raptor'))await expect(page.locator('[data-raptor-notice]:visible').first()).toBeVisible();
 await savePng(page,info,`friends-${kind}`);expect(await record(page)).toEqual(before);
 }
});
test('host polling retains lower expanded memory and complete save',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});const friends=await open(page,'kazaguruma','long-juvenile'),last=friends.locator('.garden-friend-card-memory').last();await last.locator('summary').click();const key=await last.getAttribute('data-garden-details');const before=await record(page),top=await friends.evaluate(el=>{el.scrollTop=el.scrollHeight;return el.scrollTop;});expect(top).toBeGreaterThan(0);await page.waitForTimeout(7000);await expect(friends.locator(`[data-garden-details="${key}"]`)).toHaveAttribute('open','');expect(await friends.evaluate(el=>el.scrollTop)).toBeGreaterThanOrEqual(top-2);expect(await record(page)).toEqual(before);await captureScroll(page,friends,info,'host-poll');
});
test('host storage failure surfaces status, preserves exact save, and permits one successful retry',async({page})=>{
 await page.setViewportSize({width:390,height:844});const friends=await open(page,'kazaguruma'),button=friends.locator('[data-garden-friend-action]').first(),id=await button.getAttribute('data-garden-friend'),kind=await button.getAttribute('data-garden-friend-action'),before=await record(page);
 await page.evaluate(()=>{const original=IDBObjectStore.prototype.put;window.__friendsRestorePut=()=>{IDBObjectStore.prototype.put=original;};IDBObjectStore.prototype.put=function(value,key){if(this.name==='world'&&key==='current')throw new DOMException('検査用：保存できませんでした。','QuotaExceededError');return original.apply(this,arguments);};});
 try{await button.click();await expect(page.locator('.game-overlay-message')).toContainText('検査用：保存できませんでした。');expect(await record(page)).toEqual(before);await expect(button).toBeEnabled();}finally{await page.evaluate(()=>window.__friendsRestorePut());}
 const expected=structuredClone(before),result=meetGardenFriendReward(expected,id,kind,token(expected),NOW);expect(result.changed).toBe(true);await button.click();await expect.poll(()=>record(page)).toEqual(expected);await button.click();await expect(page.locator('.finch-notice')).toContainText('また');expect(await record(page)).toEqual(expected);
});
