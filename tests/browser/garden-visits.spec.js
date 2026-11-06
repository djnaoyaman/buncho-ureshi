import {test,expect} from '@playwright/test';
import {createWorld,economyToken} from '../../src/engine.js';
import {encounterSystem as system} from '../../src/encounters.js';
import {GARDEN_IDS} from '../../src/data/gardens.js';
const NOW=Date.UTC(2026,10,6);
function seed(kind='queue'){
 const w=createWorld(NOW,42);w.paused=true;w.settings.motion=false;
 system.selectGarden(w,'komugi',economyToken(w));system.observeGarden(w,'grass',economyToken(w));
 const id=w.encounters.queue[0];
 if(kind!=='queue'){system.open(w,id,economyToken(w));const entry=system.catalog.find(e=>e.id===id);system.act(w,w.encounters.active.instanceId,entry.steps[0].action,economyToken(w));
  if(kind==='completed')while(w.encounters.active)system.act(w,w.encounters.active.instanceId,entry.steps[w.encounters.active.step].action,economyToken(w));}
 return {w,id};
}
async function record(page,w){return page.evaluate(value=>new Promise((resolve,reject)=>{
 const open=indexedDB.open('buncho-ureshi-garden-v1',1);open.onupgradeneeded=()=>open.result.createObjectStore('world');open.onerror=()=>reject(open.error);open.onsuccess=()=>{
  const db=open.result,tx=db.transaction('world',value?'readwrite':'readonly'),request=value?tx.objectStore('world').put(value,'current'):tx.objectStore('world').get('current');tx.oncomplete=()=>{db.close();resolve(request.result);};tx.onerror=()=>reject(tx.error);
 };
}),w);}
async function ready(page){await expect(page.locator('.game-encounter-host')).toHaveAttribute('aria-busy','false');}
async function outdoors(page){await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await page.locator('.game-scene-controls-toggle').click();await page.locator('.game-field-nav [data-game-panel=outdoors]').click();await ready(page);}
async function start(page,size,w){await page.setViewportSize(size);await page.addInitScript(now=>{Date.now=()=>now;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);await page.goto('');await record(page,w);await page.goto('game/');await outdoors(page);}
async function garden(page,id){await page.locator(`[data-garden-select="${id}"]`).click();await ready(page);await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-garden-id',id);}
async function observe(page,scene){await page.locator('[data-garden-details=observe]>summary').click();await expect(page.locator(`[data-garden-observe="${scene}"]`)).toBeEnabled();await page.locator(`[data-garden-observe="${scene}"]`).click();await ready(page);await page.locator('[data-garden-details=observe]>summary').click();}
async function finish(page){
 // A click starts an asynchronous store transaction. A zero immediate count
 // before the event mounts is not evidence that its conversation is complete.
 await expect(page.locator('.finch-event')).toBeVisible();await ready(page);
 const active=(await record(page)).encounters.active;expect(active).not.toBeNull();
 const entry=system.catalog.find(e=>e.id===active.id);expect(entry).toBeTruthy();
 for(let step=active.step;step<entry.steps.length;step++){
  const action=page.locator('[data-encounter-act]');await expect(action).toHaveAttribute('data-encounter-act',entry.steps[step].action);await action.click();
  if(step<entry.steps.length-1)await expect(page.locator('[data-encounter-act]')).toHaveAttribute('data-encounter-act',entry.steps[step+1].action);
 }
 await expect(page.locator('.finch-summary')).toBeVisible();
}
for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390}])test(`independent garden visits, reload and notebook resume ${size.width}x${size.height}`,async({page})=>{
 const {w,id:a}=seed('active'),original=structuredClone(w.encounters.active);await start(page,size,w);
 await garden(page,'mizukagami');await observe(page,'water');const queued=await record(page),b=queued.encounters.queue[0];expect(b).toBeTruthy();expect(b).not.toBe(a);expect(queued.encounters.gardenSessions.find(s=>s.gardenId==='komugi').active).toEqual(original);
 await page.locator('.finch-garden-visitor').click();await expect(page.locator('.finch-event')).toBeVisible();await finish(page);
 await page.locator('[data-encounter-back]').click();const waiting=page.locator(`[data-encounter-open="${a}"]`);await expect(waiting).toContainText('こむぎの庭');await waiting.click();await expect(page.locator('[data-encounter-instance]')).toHaveAttribute('data-encounter-instance',String(original.instanceId));
 expect((await record(page)).encounters.active).toEqual(original);await page.reload();await outdoors(page);await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-garden-id','komugi');await page.locator(`.finch-garden-visitor[data-encounter-open="${a}"]`).click();await finish(page);
 const after=await record(page);expect(after.encounters.discoveries.map(d=>d.id).sort()).toEqual([a,b].sort());expect(after.economy.firstMeetingClaimed.sort()).toEqual([a,b].sort());expect(after.decor.points).toBe(w.decor.points+10);expect(after.birds).toEqual(w.birds);expect(after.seed).toBe(w.seed);
 await page.locator('[data-finch-go-garden]').click();await garden(page,'mizukagami');await expect(page.locator('.finch-garden-visitor')).toHaveAttribute('data-encounter-page',b);
 await page.locator('[data-game-close-panel]').click();await expect(page.locator('.game-panel-overlay')).not.toBeVisible();await page.reload();await outdoors(page);expect((await record(page)).encounters.discoveries).toEqual(after.encounters.discoveries);
});
for(const kind of ['queue','active','completed'])test(`legacy switched-away ${kind} migrates through real IndexedDB and browser reload`,async({page})=>{
 const {w,id}=seed(kind),original=structuredClone(w.encounters.active);w.encounters.version=10;delete w.encounters.gardenSessions;w.encounters.garden.id='mizukagami';w.encounters.garden.scene='water';
 await start(page,{width:390,height:844},w);const saved=await record(page);expect(saved.encounters.version).toBe(11);expect(saved.encounters.queue).toEqual([]);expect(saved.encounters.active).toBeNull();expect(saved.encounters.gardenSessions.find(s=>s.gardenId==='komugi').active).toEqual(original);
 await observe(page,'water');expect((await record(page)).encounters.queue).toHaveLength(1);await garden(page,'komugi');await expect(page.locator('.finch-garden-visitor')).toHaveAttribute(kind==='completed'?'data-encounter-page':'data-encounter-open',id);
 await page.reload();await outdoors(page);await expect(page.locator('.finch-garden-visitor')).toHaveAttribute(kind==='completed'?'data-encounter-page':'data-encounter-open',id);
 const after=await record(page);expect(after.encounters.discoveries).toEqual(w.encounters.discoveries);expect(after.decor).toEqual(w.decor);expect(after.birds).toEqual(w.birds);expect(after.seed).toBe(w.seed);
});
test('all garden selectors preserve pending state across repeated navigation and notebook return',async({page})=>{
 const {w,id}=seed('active'),original=structuredClone(w.encounters.active);await start(page,{width:320,height:568},w);
 for(const gardenId of GARDEN_IDS)await garden(page,gardenId);
 await page.locator('[data-encounter-back]').click();await page.locator(`[data-encounter-open="${id}"]`).click();expect((await record(page)).encounters.active).toEqual(original);
 await page.locator('[data-encounter-close]').click();await page.locator('[data-finch-go-garden]').click();await ready(page);expect((await record(page)).encounters.active).toEqual(original);
});
