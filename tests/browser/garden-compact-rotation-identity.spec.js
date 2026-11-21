import {test,expect} from '@playwright/test';
import {setup} from '../fixtures/garden-terrain-browser.js';
import {encounterSystem} from '../../src/encounters.js';
import {createWorld,createBird} from '../../src/engine.js';

test.use({hasTouch:true});
const compactQuery='(max-height: 500px)';
const gardenId='bird-scaly-breasted-munia';
const stageSelector='.finch-garden-stage';
const birdSelector='.finch-garden-image-plane > button';

/** Observe the browser's actual media-query change and two rendered turns.
 * Clock advancement drives callbacks; hit correctness is not polled. */
async function crossCompact(page,size){
 await page.evaluate(query=>{
  const media=matchMedia(query);
  window.__compactRotationBoundary={fired:false,painted:false,matches:media.matches};
  media.addEventListener('change',event=>{
   window.__compactRotationBoundary.matches=event.matches;
   window.__compactRotationBoundary.fired=true;
   requestAnimationFrame(()=>requestAnimationFrame(()=>{window.__compactRotationBoundary.painted=true;}));
  },{once:true});
 },compactQuery);
 await page.setViewportSize(size);
 await expect.poll(async()=>{
  await page.clock.runFor(48);
  return page.evaluate(()=>{
   const {fired,painted,matches}=window.__compactRotationBoundary;
   return {fired,painted,matches,width:innerWidth,height:innerHeight};
  });
 },{message:'compact breakpoint change and its rendering turns'}).toEqual({
  fired:true,painted:true,matches:size.height<=500,width:size.width,height:size.height,
 });
}

async function takeGardenSample(page){
 return page.evaluate(({stageSelector,birdSelector})=>{
  const garden=document.querySelector('.finch-garden'),stage=garden?.querySelector(stageSelector);
  const birds=[...(stage?.querySelectorAll(birdSelector)??[])],start=window.__compactRotationGarden;
  // Snapshot real identity, viewport and hits in one browser task. A ready
  // invalid sample is a failure, even if a subsequent repaint repairs it.
  return {
   gardenId:stage?.dataset.gardenId, ready:stage?.dataset.sceneState,
   world:garden?.dataset.gardenWorld, revision:garden?.dataset.gardenRevision,
   sameGarden:garden===start.garden,sameStage:stage===start.stage,
   sameBirds:birds.length===start.birds.length&&birds.every((node,i)=>node===start.birds[i]&&node.isConnected),
   birds:birds.map(node=>{
    const r=node.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
    const front=document.elementFromPoint(x,y);
    return {id:node.dataset.gardenHousehold||node.dataset.gardenFriend||node.dataset.encounterOpen||node.dataset.encounterPage,
     household:node.dataset.gardenHousehold,visitor:node.dataset.encounterOpen,
     x,y,width:r.width,height:r.height,inside:x>=0&&x<innerWidth&&y>=0&&y<innerHeight,
     hit:node.contains(front),front:front?.closest('button')?.outerHTML.slice(0,160)};
   }),
  };
 },{stageSelector,birdSelector});
}

test('compact crossing keeps same-world same-revision outdoors nodes and real observation/tap',async({page},info)=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await setup(page,gardenId,375,true,'maximum');
 await page.setViewportSize({width:375,height:667});
 await page.clock.runFor(96);
 await expect(page.locator(stageSelector)).toHaveAttribute('data-scene-state','ready');
 await page.evaluate(({stageSelector,birdSelector})=>{
  const garden=document.querySelector('.finch-garden'),stage=garden.querySelector(stageSelector);
  window.__compactRotationGarden={garden,stage,birds:[...stage.querySelectorAll(birdSelector)]};
 },{stageSelector,birdSelector});
 const before=await takeGardenSample(page);
 expect(before.gardenId).toBe(gardenId);expect(before.world).toBeTruthy();expect(before.revision).toMatch(/^\d+$/);
 expect(before.birds).toHaveLength(10);
 let sample=before;
 for(const size of [{width:667,height:375},{width:375,height:667}]){
  await crossCompact(page,size);
  sample=await takeGardenSample(page);
  await info.attach(`compact-crossing-${size.width}x${size.height}`,{body:JSON.stringify(sample),contentType:'application/json'});
  expect(sample.ready).toBe('ready');expect(sample.gardenId).toBe(gardenId);
  expect(sample.world).toBe(before.world);expect(sample.revision).toBe(before.revision);
  expect(sample.sameGarden).toBe(true);expect(sample.sameStage).toBe(true);expect(sample.sameBirds).toBe(true);
  expect(sample.birds.map(b=>b.id)).toEqual(before.birds.map(b=>b.id));
  for(const bird of sample.birds){
   // Browser transforms may report 43.99999 for a CSS width of 44px.
   expect(bird.width,JSON.stringify(bird)).toBeGreaterThanOrEqual(44-0.001);
   expect(bird.height,JSON.stringify(bird)).toBeGreaterThanOrEqual(44);
   expect(bird.inside,JSON.stringify(bird)).toBe(true);
   expect(bird.hit,JSON.stringify(bird)).toBe(true);
  }
 }
 const observe=page.locator('details[data-garden-details="observe"]');
 const observeSummary=observe.locator(':scope > summary');
 await expect(observeSummary).toHaveText('観察する');
 await observeSummary.tap();
 await expect(observe).toHaveJSProperty('open',true);
 await expect(observe.getByRole('button',{name:'草を観察する',exact:true})).toBeVisible();
 await observeSummary.tap();
 await expect(observe).toHaveJSProperty('open',false);
 sample=await takeGardenSample(page);
 const lead=sample.birds.find(b=>b.household==='b1');
 expect(lead?.hit).toBe(true);
 await page.touchscreen.tap(lead.x,lead.y);
 await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'文鳥の操作をとじる',exact:true}).tap();
 const encounter=encounterSystem.catalog.find(entry=>entry.gardenEvent.gardenIds.includes(gardenId));
 expect(encounter?.eventTitle).toBeTruthy();
 const visitorButton=page.getByRole('button',{name:'庭に来たお客さまに会う',exact:true});
 await expect(visitorButton).toBeVisible();
 sample=await takeGardenSample(page);
 const visitor=sample.birds.find(b=>b.visitor===encounter.id);
 expect(visitor?.hit).toBe(true);
 await page.touchscreen.tap(visitor.x,visitor.y);
 const event=page.locator('.finch-event[data-encounter-instance]');
 await expect(event).toHaveAttribute('data-encounter-world',before.world);
 await expect(event.getByRole('heading',{name:encounter.eventTitle,exact:true})).toBeVisible();
});

test('the compact breakpoint still re-renders the home room in both directions',async({page})=>{
 const now=Date.UTC(2026,10,14,8);
 await page.setViewportSize({width:375,height:667});
 await page.addInitScript(()=>{
  localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));
  localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));
 });
 await page.goto('');await page.clock.install({time:now});await page.clock.pauseAt(now+1000);
 const world=createWorld(now);world.paused=true;createBird(world,{home:'resident',stage:'adult',name:'こはな'});
 await page.evaluate(w=>new Promise((resolve,reject)=>{
  const q=indexedDB.open('buncho-ureshi-garden-v1',1);
  q.onupgradeneeded=()=>q.result.createObjectStore('world');q.onerror=()=>reject(q.error);
  q.onsuccess=()=>{const db=q.result,tx=db.transaction('world','readwrite');tx.objectStore('world').put(w,'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};
 }),world);
 await page.goto('game/');await page.clock.runFor(2500);
 const room=page.locator('.game-room[data-field="home"]');
 const birds=room.locator('button[data-game-scene-select]');
 await expect(room).toHaveAttribute('data-compact','false');await expect(birds).toHaveCount(2);
 await crossCompact(page,{width:667,height:375});
 await expect(room).toHaveAttribute('data-compact','true');await expect(birds).toHaveCount(1);
 await crossCompact(page,{width:375,height:667});
 await expect(room).toHaveAttribute('data-compact','false');await expect(birds).toHaveCount(2);
});
