import {test,expect} from '@playwright/test';
import {createWorld} from '../../src/engine.js';
import {createEncounterSystem} from '../../src/encounters.js';
import {ENCOUNTER_CATALOG} from '../../src/data/encounter-catalog.js';
import {inviteFixture} from '../fixtures/garden-invitation.js';
const NOW=Date.UTC(2026,10,7),system=createEncounterSystem(ENCOUNTER_CATALOG),bird=system.catalog[0];
async function record(page,value){return page.evaluate(value=>new Promise((resolve,reject)=>{
 const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onerror=()=>reject(r.error);
 r.onsuccess=()=>{const db=r.result,tx=db.transaction('world',value?'readwrite':'readonly'),q=value?tx.objectStore('world').put(value,'current'):tx.objectStore('world').get('current');tx.oncomplete=()=>{db.close();resolve(q.result);};tx.onerror=()=>reject(tx.error);};
}),value);}
async function openNotebook(page){
 const toggle=page.locator('.game-scene-controls-toggle');if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
 await page.locator('#game-nav-open').click();await page.locator('#game-menu-notebook').click();await page.locator(`[data-encounter-page="${bird.id}"]`).click();
}
for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390}])test(`notebook card A keeps actions, photos and saves at ${size.width}x${size.height}`,async({page},info)=>{
 await page.setViewportSize(size);await page.addInitScript(now=>{Date.now=()=>now;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);
 await page.route(/youtube|youtu\.be|googlevideo|ytimg/i,r=>r.abort());
 const w=createWorld(NOW,42),token=()=>({worldId:w.worldId,revision:w.revision});inviteFixture(system,w,bird.id);system.open(w,bird.id,token());for(const step of bird.steps)system.act(w,w.encounters.active.instanceId,step.action,token());w.paused=true;w.settings.motion=false;
 await page.goto('');await record(page,w);await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 const before=await record(page);await openNotebook(page);const card=page.locator('.finch-record-card');await expect(card).toBeVisible();
 expect(await card.evaluate(el=>{const c=getComputedStyle(el),bond=getComputedStyle(el.querySelector('.finch-friendship')),selected=getComputedStyle(el.querySelector('[data-encounter-view=art]'));return {card:c.backgroundColor,radius:c.borderTopLeftRadius,bond:bond.backgroundColor,selected:selected.backgroundColor};})).toEqual({card:'rgb(255, 252, 245)',radius:'24px',bond:'rgb(244, 201, 183)',selected:'rgb(247, 220, 141)'});
 const order=await card.evaluate(el=>{const a=s=>el.querySelector(s).getBoundingClientRect();return a('figure').bottom<=a('.finch-view-toggle').top&&a('.finch-view-toggle').bottom<=a('[data-finch-friendship]').top;});expect(order).toBe(true);
 for(const selector of ['[data-encounter-view=art]','[data-encounter-view=photo]','[data-encounter-invite-garden]','[data-encounter-invite-cage]']){
  const button=card.locator(selector);await button.scrollIntoViewIfNeeded();const box=await button.boundingBox();expect(box.height).toBeGreaterThanOrEqual(44);expect(box.width).toBeGreaterThanOrEqual(44);
  expect(await button.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 }
 await expect(card.locator('[data-encounter-invite-cage]')).toBeDisabled();
 await card.locator('[data-encounter-view=photo]').click();await expect(card.locator('.finch-photo')).toBeVisible();await expect(card.locator(`.finch-photo a[href="${bird.photo.source}"]`)).toBeVisible();
 expect(await card.locator('.finch-photo img').evaluate(el=>{const s=getComputedStyle(el);return s.objectFit==='contain'&&s.filter==='none'&&s.clipPath==='none';})).toBe(true);
 await card.locator('[data-encounter-view=art]').click();await card.locator('.finch-record-description>summary').click();await expect(card.locator('.finch-summary')).toHaveText(bird.summary);
 await card.locator('.finch-friendship-rules>summary').click();await expect(card.locator('.finch-friendship-rules')).toContainText('6羽');expect(await record(page)).toEqual(before);
 await card.locator('h3').scrollIntoViewIfNeeded();await info.attach(`notebook-card-${size.width}`,{body:await page.screenshot(),contentType:'image/png'});
 await card.locator('[data-encounter-rub]').focus();await page.keyboard.press('Enter');await expect(card.locator('[data-finch-points]')).toHaveText('11');
 await card.locator('[data-encounter-back]').click();await expect(page.locator('.finch-catalog')).toBeVisible();await page.locator('[data-game-close-panel]').click();
 await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await openNotebook(page);await expect(card.locator('[data-finch-points]')).toHaveText('11');
 const after=await record(page);expect(after.birds).toEqual(before.birds);expect(after.economy).toEqual(before.economy);expect(after.encounters.discoveries).toEqual(before.encounters.discoveries);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
