import {test,expect} from '@playwright/test';
import {gardenRaptorCapacity,RAPTOR_CAPACITY_NOW as NOW} from '../fixtures/garden-raptor-capacity.js';
const indexed=(page,w)=>page.evaluate(world=>new Promise((resolve,reject)=>{
 const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onerror=()=>reject(r.error);
 r.onsuccess=()=>{const d=r.result,t=d.transaction('world',world?'readwrite':'readonly'),s=t.objectStore('world'),q=world?s.put(world,'current'):s.get('current');t.oncomplete=()=>{d.close();resolve(q.result)};t.onerror=()=>reject(t.error)};
}),w);
for(const c of [
 {width:320,height:568,knownVisitor:true},
 {width:390,height:844},
 {width:390,height:844,species:'osprey'},
 {width:320,height:568,warning:true},
])test(`water garden renders ${c.species||'kestrel'} ${c.warning?'warning':c.knownVisitor?'with returning guest':'with companion'} ${c.width}`,async({page})=>{
 await page.setViewportSize({width:c.width,height:c.height});
 await page.addInitScript(()=>{localStorage.setItem('buncho.music.v1','{"enabled":false}');localStorage.setItem('buncho.care-sound-choice.v1','{"explicit":true,"enabled":false}');});
 await page.goto('');await page.clock.install({time:NOW});await page.clock.pauseAt(NOW+1000);
 const {w,companionId,nativeId,visitorId}=gardenRaptorCapacity(c);await indexed(page,w);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('game/');
 await expect.poll(()=>page.locator('body').getAttribute('data-game-intro')).toMatch(/shown|done/);
 if(await page.locator('body').getAttribute('data-game-intro')==='shown')await page.clock.runFor(2000);
 await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 if(c.warning)await page.locator('[data-raptor-choice=stay]').click();
 if(await page.locator('.game-scene-controls-toggle').getAttribute('aria-expanded')==='false')await page.locator('.game-scene-controls-toggle').click();
 const stage=page.locator('.finch-garden-stage'),scene=stage.locator('.finch-raptor-scale-scene'),species=c.species||'common-kestrel';
 await expect(stage).toHaveAttribute('data-scene-state','ready');
 await expect(scene).toBeVisible();await expect(scene).toHaveAttribute('data-raptor-species',species);
 const art=scene.locator('.finch-raptor-actor img');await expect(art).toBeVisible();
 expect(await art.evaluate(async el=>{await el.decode();return el.naturalWidth})).toBeGreaterThan(100);
 expect(await art.getAttribute('src')).toContain('/game-art/raptors/'+species+'.webp');
 await expect(scene.locator('.finch-raptor-java')).toHaveCount(1);
 await expect(stage.locator('[data-garden-household=b1]')).toHaveCount(0);
 const notice=page.locator('.game-panel-overlay>[data-raptor-notice]');
 await expect(notice).toBeVisible();await expect(notice).toHaveAttribute('data-raptor-phase',c.warning?'warning':'visiting');
 if(c.warning){await expect(notice).toContainText('事故死');await expect(stage.locator('[data-encounter-open="'+nativeId+'"]')).toHaveCount(0);}
 else {
  await expect(notice).toContainText(c.species==='osprey'?'ミサゴが水辺に来たよ':'チョウゲンボウが庭に来たよ');
  await expect(stage.locator('.finch-garden-friend')).toHaveCount(4);
  await expect(stage.locator('[data-encounter-open="'+nativeId+'"]')).toHaveCount(1);
  if(companionId)await expect(stage.locator('[data-garden-household="'+companionId+'"]')).toHaveCount(1);
  if(c.knownVisitor){expect(visitorId).toBe('gouldian-finch');await expect(stage.locator('[data-garden-visiting-friend="'+visitorId+'"]')).toHaveCount(1);}
 }
 const after=await indexed(page);
 expect(after.birds).toEqual(w.birds);
 expect(after.encounters.queue).toEqual(w.encounters.queue);
 expect(after.encounters.raptor.visits).toEqual(w.encounters.raptor.visits);
 expect(after.encounters.raptor.lastThreatAt).toBe(w.encounters.raptor.lastThreatAt);
 expect(after.encounters.raptor.active).toMatchObject({eventId:w.encounters.raptor.active.eventId,speciesId:species,targetBirdId:'b1',hostile:!!c.warning});
 expect(errors).toEqual([]);
});
