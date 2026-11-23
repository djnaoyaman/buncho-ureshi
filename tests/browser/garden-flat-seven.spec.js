import {test,expect} from '@playwright/test';
import {GARDEN_TRAIL_TERRAIN} from '../../src/data/garden-trail-terrain.js';
import {setup,snapshotGarden,assertGardenIdentities} from '../fixtures/garden-terrain-browser.js';

test.use({hasTouch:true});
const options=height=>({nativeSource:true,quietPredators:true,height,afterOpenMs:400});
const assertExposed=s=>{
 expect(s.motion,JSON.stringify(s)).toBe('active');
 for(const b of s.birds){
  expect(b.rect.width,b.id).toBeGreaterThanOrEqual(44);
  expect(b.centerInViewport,JSON.stringify(b)).toBe(true);
  expect(b.hit,JSON.stringify(b)).toBe(true);
 }
};
for(const id of Object.keys(GARDEN_TRAIL_TERRAIN)){
 test(`flat seven ${id}: lone bird flies and lands on native button`,async({page},info)=>{
  test.setTimeout(70000);
  await setup(page,id,375,true,true,options(667));
  await expect(page.locator('.finch-garden-stage')).not.toHaveAttribute('data-garden-trail','true');
  const phases=new Set(),snapshots=[];
  for(let i=0;i<72;i++){
   await page.clock.runFor(150);
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
 test(`flat seven ${id}: ten birds keep full tap reach`,async({page},info)=>{
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
