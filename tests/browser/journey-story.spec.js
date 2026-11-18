import {test,expect} from '@playwright/test';
import {createWorld,validateWorld} from '../../src/engine.js';
import {encounterSystem} from '../../src/encounters.js';
import {GARDEN_IDS} from '../../src/data/gardens.js';
import {leafEventStatus,leafEventToken,startLeafEvent,chooseLeafEvent,completeLeafEvent} from '../../src/garden-leaf-event.js';
import {expeditionToken,startExpedition,chooseExpedition,completeExpedition} from '../../src/garden-expedition.js';
import {showcaseToken,startShowcase,completeShowcase} from '../../src/garden-showcase.js';
const NOW=Date.UTC(2026,10,18,9);
async function record(page,w){return page.evaluate(value=>new Promise((resolve,reject)=>{const request=indexedDB.open('buncho-ureshi-garden-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('world');request.onsuccess=()=>{const db=request.result,tx=db.transaction('world',value?'readwrite':'readonly'),q=value?tx.objectStore('world').put(value,'current'):tx.objectStore('world').get('current');tx.oncomplete=()=>{db.close();resolve(q.result);};tx.onerror=()=>reject(tx.error);};request.onerror=()=>reject(request.error);}),w);}
function prepared(kind){
 const w=createWorld(NOW,31);
 for(const id of GARDEN_IDS){encounterSystem.selectGarden(w,id,leafEventToken(w));if(leafEventStatus(w).available)break;}
 if(kind==='leaf'){validateWorld(w);return w;}
 startLeafEvent(w,leafEventToken(w));chooseLeafEvent(w,'display',leafEventToken(w));encounterSystem.leaveGarden(w,leafEventToken(w));encounterSystem.enterGarden(w,leafEventToken(w));completeLeafEvent(w,leafEventToken(w));
 for(const r of w.encounters.gardenFriends.regulars)r.lastInteractionTick=0;
 const actors=w.encounters.gardenFriends.regulars.slice(0,2).map(r=>r.id);
 if(kind==='expedition'){startExpedition(w,'brook',actors,expeditionToken(w));const other=GARDEN_IDS.find(id=>id!==w.encounters.garden.id);encounterSystem.selectGarden(w,other,expeditionToken(w));}
 if(kind==='showcase'||kind==='shop'){
  for(const path of kind==='shop'?['brook','grove','flower']:['brook']){startExpedition(w,path,actors,expeditionToken(w));chooseExpedition(w,'look',expeditionToken(w));completeExpedition(w,expeditionToken(w));}
  if(kind==='shop')for(const theme of ['song','discovery','style']){startShowcase(w,theme,actors,null,showcaseToken(w));completeShowcase(w,showcaseToken(w));}
 }
 validateWorld(w);return w;
}
async function boot(page,w){
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(n=>{Date.now=()=>n;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);
 await page.goto('');await record(page,w);await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
}
async function recommendation(page){
 const controls=page.locator('.game-scene-controls-toggle');if(await controls.getAttribute('aria-expanded')==='false')await controls.click();
 await page.locator('[data-game-open-menu]').click();const details=page.locator('[data-game-details=next-goals]');if(!await details.evaluate(el=>el.open))await details.locator(':scope > summary').click();
 await expect(details.locator('[data-game-details=next-goals-other]')).not.toHaveAttribute('open','');
 return details.locator('[data-next-goal=story] button');
}
function conserved(w){return {birds:w.birds,archive:w.archive,leaf:w.leafEvent,expedition:w.expedition,showcase:w.showcase,economy:w.economy,decor:w.decor,lifecycle:w.lifecycle,seed:w.seed,collectionEndings:w.collectionEndings};}
for(const [kind,story] of [['leaf','leaf-gift'],['expedition','expedition'],['showcase','showcase'],['shop','showcase']])test(`journey invitation opens the real ${kind} destination and safely reopens it`,async({page},info)=>{
 const w=prepared(kind);await boot(page,w);const before=await record(page);
 const destination=kind==='expedition'?w.expedition.entries[0].gardenId:w.encounters.garden.id;
 for(let pass=0;pass<2;pass++){
  const button=await recommendation(page);await expect(button).toHaveAttribute('data-goal-story',kind==='leaf'?'leaf-gift':kind);
  if(kind==='expedition')await expect(button).toHaveAttribute('data-goal-garden',destination);
  await button.click();const card=page.locator(`[data-garden-details="${story}"]`);await expect(card).toHaveAttribute('open','');
  await expect(page.locator('[data-jog-center]')).toHaveAttribute('data-garden-select',destination);
  if(kind==='leaf')await expect(card.locator('[data-leaf-start]')).toBeVisible();
  if(kind==='expedition')await expect(card.locator('[data-expedition-choice=look]')).toBeVisible();
  if(kind==='showcase')await expect(card.locator('[data-showcase-start=song]')).toBeVisible();
  if(kind==='shop'){await expect(card.locator('[data-garden-details=showcase-shop]')).toHaveAttribute('open','');await expect(card.locator('[data-showcase-buy=bell][data-showcase-payment=discovery]')).toBeVisible();}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  if(pass===0)await info.attach(`journey-${kind}`,{body:await page.screenshot(),contentType:'image/png'});
  expect(conserved(await record(page))).toEqual(conserved(before));
  await card.locator('.garden-story-header [data-garden-story-close]').click();await expect(card).not.toHaveAttribute('open','');
  await page.locator('[data-game-close-panel]').click();await expect(page.locator('.game-app')).toHaveAttribute('data-panel','garden');
 }
 await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');expect(conserved(await record(page))).toEqual(conserved(before));
});
