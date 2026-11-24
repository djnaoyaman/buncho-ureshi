import {test,expect} from '@playwright/test';
import {setup,snapshotGarden,assertGardenIdentities} from '../fixtures/garden-terrain-browser.js';

test.use({hasTouch:true});
const options=height=>({nativeSource:true,quietPredators:true,height,afterOpenMs:400});
const assertExposed=s=>{
 expect(s.motion,JSON.stringify(s)).toBe('active');
 for(const b of s.birds){
  expect(b.rect.width,b.id).toBeGreaterThanOrEqual(44-0.0001);
  expect(b.centerInViewport,JSON.stringify(b)).toBe(true);
  expect(b.hit,JSON.stringify(b)).toBe(true);
 }
};
for(const id of ["bird-gouldian-finch", "mizukagami", "komugi", "bird-pin-tailed-whydah", "bird-eurasian-siskin", "bird-hawfinch", "bird-chinese-grosbeak", "bird-oriental-greenfinch", "kazaguruma", "bird-pine-grosbeak", "paris-unrest", "bird-hooded-siskin"]){
 test(`additional flat garden ${id}: lone bird flies and lands on native button`,async({page},info)=>{
  test.setTimeout(70000);
  await setup(page,id,375,true,true,options(667));
  await expect(page.locator('.finch-garden-stage')).not.toHaveAttribute('data-garden-trail','true');
  const phases=new Set(),snapshots=[];
  for(let i=0;i<440;i++){
   await page.clock.runFor(25);
   const s=await snapshotGarden(page);
   assertGardenIdentities(s.birds,1,['b1']);assertExposed(s);
   const b=s.birds[0];
   if(!phases.has(b.actorPhase))snapshots.push(s);
   phases.add(b.actorPhase);
   if(phases.has('flap')&&phases.has('contact')&&phases.has('fold'))break;
  }
  await info.attach('flight-phases',{body:JSON.stringify(snapshots),contentType:'application/json'});
  expect([...phases]).toEqual(expect.arrayContaining(['flap','contact','fold']));
  const {birds:[b]}=await snapshotGarden(page);
  await page.touchscreen.tap(b.point.x,b.point.y);
  await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();
 });
 test(`additional flat garden ${id}: ten birds keep full tap reach`,async({page},info)=>{
  await setup(page,id,375,true,'maximum',options(667));
  const first=await snapshotGarden(page);
  const ids=first.birds.map(b=>b.id);
  assertGardenIdentities(first.birds,10);assertExposed(first);
  for(const [width,height] of [[402,874],[375,667],[320,568]]){
   await page.setViewportSize({width,height});await page.clock.runFor(700);
   const s=await snapshotGarden(page);
   await info.attach(`ten-${width}`,{body:JSON.stringify(s),contentType:'application/json'});
   assertGardenIdentities(s.birds,10,ids);assertExposed(s);
   const b=s.birds.find(b=>b.id==='b1');await page.touchscreen.tap(b.point.x,b.point.y);
   await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();
   await page.getByRole('button',{name:'文鳥の操作をとじる',exact:true}).click();
  }
 });
}

// The dry-land profile must not take over the water-only encounter or block the player's exit.
test('additional flat garden mizukagami: harmless osprey keeps fishing and allows return home',async({page})=>{
 const {createWorld}=await import('../../src/engine.js');
 const {arriveGardenRaptor,raptorToken}=await import('../../src/garden-raptors.js');
 const now=Date.UTC(2026,10,4,9), world=createWorld(now);
 world.encounters.garden.open=true;
 world.encounters.garden.id='mizukagami';
 Object.assign(world.encounters.gardenFriends,{companions:['b1'],accompany:true,attendees:['b1']});
 world.field.place='park';world.settings.motion=true;world.settings.careSound=false;
 expect(arriveGardenRaptor(world,'osprey',now,{...raptorToken(world),gardenId:'mizukagami'}).changed).toBe(true);
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>{
  localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));
  localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));
 });
 await page.goto('');await page.clock.install({time:now});await page.clock.pauseAt(now+1000);
 await page.evaluate(w=>new Promise((resolve,reject)=>{
  const req=indexedDB.open('buncho-ureshi-garden-v1',1);
  req.onerror=()=>reject(req.error);req.onupgradeneeded=()=>req.result.createObjectStore('world');
  req.onsuccess=()=>{
   const db=req.result,tx=db.transaction('world','readwrite');
   tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);
   tx.objectStore('world').put(w,'current');
  };
 }),world);
 await page.goto('game/');await page.clock.runFor(2500);
 const controls=page.locator('.game-scene-controls-toggle');
 if(await controls.getAttribute('aria-expanded')==='false')await controls.click();
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-garden-id','mizukagami');
 const banner=page.locator('.game-panel-overlay>[data-raptor-notice]');
 await expect(banner).toHaveAttribute('data-raptor-phase','visiting');
 await expect(banner).not.toContainText('事故死');
 await expect(page.locator('.finch-raptor-fish')).toBeVisible();
 await banner.locator('[data-game-raptor-home]').click();
 await expect(page.locator('[data-raptor-notice]')).toHaveCount(0);
 await expect(page.locator('.game-room')).toBeVisible();
});
