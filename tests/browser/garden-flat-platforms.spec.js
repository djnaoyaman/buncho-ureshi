import {test,expect} from '@playwright/test';
import {setup,snapshotGarden,assertGardenIdentities} from '../fixtures/garden-terrain-browser.js';
import {actorTerrainFor} from '../../src/data/garden-actor-terrain.js';
import {actorSupportAt} from '../../src/garden-actor-motion.js';

test.use({hasTouch:true});
const ids=['bird-white-winged-crossbill','bali-terrace'];
const options=height=>({nativeSource:true,quietPredators:true,height,afterOpenMs:400});
const assertLive=(s,n,ids)=>{
 assertGardenIdentities(s.birds,n,ids);
 expect(s.motion,JSON.stringify(s)).toBe('active');
 for(const b of s.birds){
  expect(b.rect.width,b.id).toBeGreaterThanOrEqual(44-.0001);
  expect(b.centerInViewport,JSON.stringify(b)).toBe(true);
  expect(b.hit,JSON.stringify(b)).toBe(true);
 }
};
async function contacts(page){
 return page.locator('.finch-garden-image-plane').evaluate(plane=>[...plane.querySelectorAll(':scope > button')].map(n=>{
  const env=n.querySelector('.garden-actor-flight'),air=env&&getComputedStyle(env).visibility==='visible';
  const image=air&&env.querySelector('[data-white-flight-frame]');
  const frame=image&&getComputedStyle(image).visibility==='visible'&&image.complete&&image.naturalWidth>0?image.getAttribute('src'):null;
  return {x:parseFloat(n.style.left)/100,y:parseFloat(n.style.top)/100,phase:n.dataset.actorPhase,state:n.dataset.actorState,air,frame};
 }));
}
for(const id of ids){
 const terrain=actorTerrainFor(id);
 test(`${id}: visibly flaps, safely lands, and opens native dialog`,async({page},info)=>{
  test.setTimeout(70000);
  await setup(page,id,320,true,true,options(568));
  const phases=new Set(),wingFrames=new Set();
  let origin,destination;
  for(let i=0;i<450;i++){
   await page.clock.runFor(25);
   const s=await snapshotGarden(page);assertLive(s,1,['b1']);
   const [q]=await contacts(page);
   expect(actorSupportAt(terrain,[q.x,q.y])).toBe(terrain);
   if(!origin)origin=[q.x,q.y];
   phases.add(q.phase);
   if(q.air&&q.frame?.includes('/white-connected/wing-'))wingFrames.add(q.frame);
   if(q.phase==='contact')destination=[q.x,q.y];
   if(phases.has('flap')&&phases.has('contact')&&phases.has('fold')&&wingFrames.size>=2)break;
  }
  await info.attach('flight',{body:JSON.stringify({origin,destination,phases:[...phases],wingFrames:[...wingFrames]}),contentType:'application/json'});
  expect([...phases]).toEqual(expect.arrayContaining(['flap','contact','fold']));
  expect(wingFrames.size).toBeGreaterThanOrEqual(2);
  expect(destination).not.toEqual(origin);
  const {birds:[b]}=await snapshotGarden(page);
  await page.touchscreen.tap(b.point.x,b.point.y);
  await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();
 });
 test(`${id}: ten touch targets; visible lower terrace stays in use`,async({page},info)=>{
  await setup(page,id,402,true,'maximum',options(874));
  const start=await snapshotGarden(page), keys=start.birds.map(b=>b.id);assertLive(start,10,keys);
  for(const [width,height] of [[402,874],[375,667],[320,568]]){
   await page.setViewportSize({width,height});await page.clock.runFor(700);
   const s=await snapshotGarden(page);
   await info.attach('max-'+width,{body:JSON.stringify(s),contentType:'application/json'});
   assertLive(s,10,keys);
   const supports=(await contacts(page)).map(q=>actorSupportAt(terrain,[q.x,q.y]));
   expect(supports.every(Boolean),'Every contact uses a real surface').toBe(true);
   if(width===402)expect(supports.includes(terrain.additionalSurfaces[0]),'The lower surface is a real touchable support').toBe(true);
   const b=s.birds.find(b=>b.id==='b1');
   await page.touchscreen.tap(b.point.x,b.point.y);
   await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();
   await page.getByRole('button',{name:'文鳥の操作をとじる',exact:true}).click();
  }
 });
 for(const n of [7,8,9])test(`${id}: ${n} birds can still move in the narrowest fit`,async({page},info)=>{
  test.setTimeout(65000);
  await setup(page,id,320,true,'maximum',{...options(568),prepareWorld(w){w.encounters.gardenFriends.attendees.splice(n-6);}});
  const start=await snapshotGarden(page), keys=start.birds.map(b=>b.id);assertLive(start,n,keys);
  const beginning=await contacts(page);let moved=false,end;
  for(let i=0;i<110;i++){
   await page.clock.runFor(125);
   const s=await snapshotGarden(page);assertLive(s,n,keys);
   end=await contacts(page);
   for(let i=0;i<end.length;i++){
    const q=end[i];
    expect(actorSupportAt(terrain,[q.x,q.y])).toBe(terrain,'No intermediate step onto the cliff');
    moved ||= ['fly','hop'].includes(q.state)&&Math.hypot(q.x-beginning[i].x,q.y-beginning[i].y)>.015;
   }
   if(moved)break;
  }
  await info.attach('movement',{body:JSON.stringify({beginning,end,moved}),contentType:'application/json'});
  expect(moved).toBe(true);
 });
}
