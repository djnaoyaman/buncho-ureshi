import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {writeFile} from 'node:fs/promises';
import {test,expect} from '@playwright/test';
import {engine} from '../fixtures/garden-about-world.js';
import {snapshotGarden} from '../fixtures/garden-terrain-browser.js';
test.use({hasTouch:true});
for(const width of [375,402])test(`real-time normal five birds on entry ${width}`,async({page},info)=>{
 let phase='viewport';
 try{
 await page.setViewportSize({width,height:width===375?667:874});
 await page.goto('');
 const world=engine.createWorld(Date.now(),42);world.encounters.garden.open=true;world.encounters.garden.id='java-rice';world.field.place='park';
 Object.assign(world.encounters.gardenFriends,{accompany:true,companions:['b1'],attendees:['b1']});engine.validateWorld(world);
 phase='seed';
 await page.evaluate(w=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onsuccess=()=>{const db=r.result,t=db.transaction('world','readwrite');t.objectStore('world').put(w,'current');t.oncomplete=()=>{db.close();resolve()};t.onerror=()=>reject(t.error)};}),world);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 phase='open';
 await page.goto('game/');await page.locator('.game-scene-controls-toggle').click();await page.locator('[data-game-panel=outdoors]').click();
 phase='ready';
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
 phase='sample';
 const start=Date.now(),samples=[];
 // Real elapsed time: no clock installation/advance, no random interception,
 // no forced actor action. Real predator arrival remains allowed and recorded.
 while(Date.now()-start<6000){samples.push(await snapshotGarden(page));await page.waitForTimeout(100);}
 await writeFile(info.outputPath('normal-real-time.json'),JSON.stringify(samples));
 await info.attach('normal-real-time',{body:JSON.stringify(samples),contentType:'application/json'});
 const ready=samples.filter(s=>s.ready==='ready'&&s.birds.length===5);
 phase='five-ready';
 expect(ready.length).toBeGreaterThan(5);
 for(const s of ready)for(const b of s.birds){phase='center';expect(b.centerInViewport,JSON.stringify(s)).toBe(true);phase='hit';expect(b.hit,JSON.stringify(s)).toBe(true);}
 phase='natural-motion';
 expect(ready.some(s=>s.birds.some(b=>b.actorState==='fly'||b.actorState==='hop')),'visible voluntary movement in six real seconds').toBe(true);
 phase='screenshot';
 await page.screenshot({path:info.outputPath('normal-entry.png')});
 phase='storage-read';
 const saved=await page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('world').objectStore('world').get('current');q.onsuccess=()=>{resolve(q.result);db.close()};q.onerror=()=>reject(q.error)};}));
 phase='storage-identity';
 engine.validateWorld(saved);expect(saved.worldId).toBe(world.worldId);expect(saved.birds.map(b=>b.id)).toEqual(world.birds.map(b=>b.id));
 phase='browser-errors';
 expect(errors).toEqual([]);
 phase='pass';
 }finally{
  const dest=process.env.TYPE2_CHECKPOINT_DIR;
  if(dest&&width===375&&info.project.name==='webkit')writeFileSync(join(dest,'webkit-01-type1'),phase+'\n',{mode:0o600,flag:'wx'});
 }
});
