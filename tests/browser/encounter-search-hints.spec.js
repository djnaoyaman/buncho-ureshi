import {test,expect} from '@playwright/test';
import {createWorld,validateWorld,serializeWorld,parseSave} from '../../src/engine.js';
import {ENCOUNTER_CATALOG} from '../../src/data/encounter-catalog.js';
import {encounterSearchHint} from '../../src/encounter-ui.js';
const NOW=Date.UTC(2026,10,7);
async function record(page,value){return page.evaluate(value=>new Promise((resolve,reject)=>{
 const open=indexedDB.open('buncho-ureshi-garden-v1',1);open.onupgradeneeded=()=>open.result.createObjectStore('world');open.onerror=()=>reject(open.error);open.onsuccess=()=>{
  const db=open.result,tx=db.transaction('world',value?'readwrite':'readonly'),request=value?tx.objectStore('world').put(value,'current'):tx.objectStore('world').get('current');tx.oncomplete=()=>{db.close();resolve(request.result);};tx.onerror=()=>reject(tx.error);
 };
}),value);}
async function notebook(page){
 const toggle=page.locator('.game-scene-controls-toggle');if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
 await page.locator('#game-nav-open').click();await page.locator('#game-menu-notebook').click();
 await expect(page.locator('.finch-card')).toHaveCount(32);
}
for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390}])test(`hidden bird hints remain readable and save-neutral ${size.width}x${size.height}`,async({page},info)=>{
 await page.setViewportSize(size);
 await page.addInitScript(now=>{Date.now=()=>now;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);
 const w=createWorld(NOW,42);w.paused=true;w.settings.motion=false;expect(validateWorld(w)).toEqual(w);expect(parseSave(serializeWorld(w))).toEqual(w);
 await page.goto('');await record(page,w);await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 const before=await record(page);await notebook(page);
 const cards=await page.locator('.finch-card').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.encounterPage,hint:n.querySelector('small').textContent,name:n.querySelector('strong').textContent,alt:n.querySelector('img').alt})));
 expect(cards).toEqual(ENCOUNTER_CATALOG.map(entry=>({id:entry.id,hint:encounterSearchHint(entry,{compact:true}),name:'？？？',alt:''})));
 for(const id of ['gouldian-finch','society-finch','eurasian-tree-sparrow']){
  const card=page.locator(`[data-encounter-page="${id}"]`);await card.focus();await page.keyboard.press("Enter");
  await expect(page.locator(".finch-mystery-postcard h3")).toBeFocused();
  await expect(page.locator('.finch-mystery-postcard')).toHaveCSS('background-color','rgb(255, 252, 245)');const landscape=page.locator('.finch-mystery-landscape');await landscape.evaluate(img=>img.decode());await expect(landscape).toHaveAttribute('alt','');await expect(page.locator('.finch-mystery-stamp .finch-art')).toHaveAttribute('alt','');await expect(page.locator('.finch-mystery-stamp .finch-art')).toHaveCSS('filter','brightness(0)');
  expect(await page.locator('.finch-mystery-picture').evaluate(el=>{const p=el.parentElement.getBoundingClientRect(),b=el.getBoundingClientRect();return b.left>=p.left&&b.right<=p.right;})).toBe(true);
  await page.keyboard.press('Tab');await expect(page.locator('[data-finch-go-garden]')).toBeFocused();await page.keyboard.press('Tab');await expect(page.locator('[data-encounter-back]')).toBeFocused();
  await page.locator('.finch-mystery-postcard h3').scrollIntoViewIfNeeded();
  await page.screenshot({path:info.outputPath(`postcard-${id}-${size.width}.png`),fullPage:true});
  const hint=page.locator('[data-encounter-search-hint]');await expect(hint).toHaveText(encounterSearchHint(ENCOUNTER_CATALOG.find(e=>e.id===id)));await hint.scrollIntoViewIfNeeded();
  const fits=await hint.evaluate(el=>{const b=el.getBoundingClientRect(),r=document.createRange();r.selectNodeContents(el);return b.left>=0&&b.right<=innerWidth+1&&[...r.getClientRects()].every(t=>t.left>=b.left-1&&t.right<=b.right+1);});expect(fits).toBe(true);
  if(id==='eurasian-tree-sparrow')await page.screenshot({path:info.outputPath(`all-gardens-hint-${size.width}.png`)});
  const back=page.locator('[data-encounter-back]');await back.focus();await expect(back).toBeFocused();await page.keyboard.press('Enter');await expect(page.locator('.finch-card')).toHaveCount(32);
  await page.locator(`[data-encounter-page="${id}"]`).click();
  await page.locator('[data-encounter-back]').click();await expect(page.locator('.finch-card')).toHaveCount(32);
 }
 await page.locator('[data-game-close-panel]').click();expect(await record(page)).toEqual(before);
 await notebook(page);await page.locator('[data-encounter-page="gouldian-finch"]').click();await page.locator('[data-game-close-panel]').click();expect(await record(page)).toEqual(before);
 await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await notebook(page);
 await expect(page.locator('[data-encounter-page="gouldian-finch"] small')).toHaveText(encounterSearchHint(ENCOUNTER_CATALOG[0],{compact:true}));
 expect(await record(page)).toEqual(before);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
