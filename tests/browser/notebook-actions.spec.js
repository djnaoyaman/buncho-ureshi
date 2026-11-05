import {test,expect} from '@playwright/test';
import {createWorld} from '../../src/engine.js';
import {createEncounterSystem} from '../../src/encounters.js';
import {ENCOUNTER_CATALOG} from '../../src/data/encounter-catalog.js';
import {inviteFixture} from '../fixtures/garden-invitation.js';

const NOW=Date.UTC(2026,10,5,9),sizes=[[320,240],[320,568],[390,844],[844,390],[1280,800]];
const system=createEncounterSystem(ENCOUNTER_CATALOG),known=system.catalog[0],unknown=system.catalog[1];
function seed(event=false){
 const w=createWorld(NOW,42),token=()=>({worldId:w.worldId,revision:w.revision});
 inviteFixture(system,w,known.id);system.open(w,known.id,token());
 if(!event)for(const step of known.steps)system.act(w,w.encounters.active.instanceId,step.action,token());
 w.encounters.crow.visits.push({id:'large-billed-crow',firstTick:0,lastTick:0,count:1,petPoints:0});
 w.encounters.raptor.visits.push({id:'black-kite',firstTick:0,lastTick:0,count:1,petPoints:0});
 w.encounters.garden.open=false;w.paused=true;w.settings.motion=false;w.settings.careSound=false;
 return w;
}
async function record(page,world){return page.evaluate(world=>new Promise((resolve,reject)=>{
 const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onerror=()=>reject(r.error);
 r.onsuccess=()=>{const db=r.result,tx=db.transaction('world',world?'readwrite':'readonly'),s=tx.objectStore('world'),q=world?s.put(world,'current'):s.get('current');tx.oncomplete=()=>{db.close();resolve(q.result)};tx.onerror=()=>reject(tx.error)};
}),world);}
async function setup(page,size,{event=false}={}){
 await page.setViewportSize({width:size[0],height:size[1]});
 await page.addInitScript(now=>{Date.now=()=>now;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);
 await page.route(/youtube|youtu\.be|googlevideo|ytimg/i,r=>r.abort());
 await page.goto('');await record(page,seed(event));await page.goto('game/');
 await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 await page.locator('.game-scene-controls-toggle').click();
}
async function fit(button){
 await button.scrollIntoViewIfNeeded();await expect(button).toBeVisible();
 const g=await button.evaluate(el=>{
  const b=el.getBoundingClientRect(),r=document.createRange();r.selectNodeContents(el);
  return {w:b.width,h:b.height,left:b.left,right:b.right,viewport:innerWidth,
   text:[...r.getClientRects()].every(t=>t.left>=b.left-.5&&t.right<=b.right+.5&&t.top>=b.top-.5&&t.bottom<=b.bottom+.5),
   hit:el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))};
 });
 expect(g.w).toBeGreaterThanOrEqual(43.99);expect(g.h).toBeGreaterThanOrEqual(43.99);
 expect(g.left).toBeGreaterThanOrEqual(0);expect(g.right).toBeLessThanOrEqual(g.viewport+.5);expect(g.text).toBe(true);expect(g.hit).toBe(true);
}
async function actions(page){
 const group=page.locator('.game-encounter-host .finch-page-actions');await expect(group).toHaveCount(1);
 for(const b of await group.locator(':scope > button').all())await fit(b);
 const g=await group.evaluate(el=>{
  const boxes=[...el.querySelectorAll(':scope > button')].map(b=>b.getBoundingClientRect()),r=el.getBoundingClientRect(),prev=el.previousElementSibling?.getBoundingClientRect(),next=el.nextElementSibling?.getBoundingClientRect();
  return {gaps:boxes.flatMap((a,i)=>boxes.slice(i+1).map(b=>Math.max(b.left-a.right,a.left-b.right,b.top-a.bottom,a.top-b.bottom))),before:prev?r.top-prev.bottom:null,after:next?next.top-r.bottom:null};
 });
 for(const gap of g.gaps)expect(gap).toBeGreaterThanOrEqual(11.9);
 if(g.before!==null)expect(g.before).toBeGreaterThanOrEqual(15.9);
 if(g.after!==null)expect(g.after).toBeGreaterThanOrEqual(15.9);
 await expect(page.locator('.game-scene-controls-toggle')).toBeHidden();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
}
const protectedState=w=>({birds:w.birds,economy:w.economy,discoveries:w.encounters.discoveries,crows:w.encounters.crow.visits,raptors:w.encounters.raptor.visits});

for(const size of sizes)for(const route of ['menu','garden'])test(`page actions breathe and remain reachable via ${route} at ${size.join('x')}`,async({page},info)=>{
 await setup(page,size);const before=protectedState(await record(page));
 if(route==='menu'){
  await page.locator('#game-nav-open').click();await page.locator('#game-menu-notebook').click();
 }else{
  await page.locator('.game-field-nav [data-game-panel=outdoors]').click();
  await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
  await page.locator('.finch-garden>header [data-encounter-back]').click();
 }
 await actions(page);
 await page.locator(`[data-encounter-page="${unknown.id}"]`).click();await actions(page);
 await page.locator('[data-encounter-back]').click();
 await page.locator(`[data-encounter-page="${known.id}"]`).click();await actions(page);
 for(const b of await page.locator('.finch-view-toggle>button').all())await fit(b);
 await page.locator('[data-encounter-back]').click();await page.locator('[data-crow-notebook]').click();
 await actions(page);
 await info.attach(`enemy-footer-${route}-${size.join('x')}`,{body:await page.screenshot(),contentType:'image/png'});
 await page.locator('[data-crow-entry=large-billed-crow]').click();await actions(page);
 await page.locator('[data-crow-notebook]').click();await page.locator('[data-raptor-entry=black-kite]').click();await actions(page);
 await page.locator('[data-crow-notebook]').click();await actions(page);
 await page.locator('[data-finch-go-garden]').click();await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
 if(route==='menu')await page.locator('[data-game-close-panel]').click();
 await expect(page.locator('.game-scene-controls-toggle')).toBeVisible();await fit(page.locator('.game-scene-controls-toggle'));
 expect(protectedState(await record(page))).toEqual(before);
});

for(const size of [[320,240],[390,844],[844,390]])test(`encounter story actions have breathing room at ${size.join('x')}`,async({page},info)=>{
 await setup(page,size,{event:true});
 await page.locator('.game-field-nav [data-game-panel=outdoors]').click();
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
 await page.locator('[data-encounter-open]').click();await expect(page.locator('.finch-event')).toBeVisible();await actions(page);
 await info.attach(`story-actions-${size.join('x')}`,{body:await page.screenshot(),contentType:'image/png'});
 await page.locator('[data-encounter-close]').click();await actions(page);
 expect((await record(page)).encounters.active.id).toBe(known.id);
});
