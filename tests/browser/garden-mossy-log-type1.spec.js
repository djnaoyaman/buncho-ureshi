import {test,expect} from '@playwright/test';
import {setup,snapshotGarden,assertGardenIdentities} from '../fixtures/garden-terrain-browser.js';
import {actorTerrainFor} from '../../src/data/garden-actor-terrain.js';
import {inside} from '../../src/garden-terrain-plan.js';

test.use({hasTouch:true});
const ids=['yuyake'];
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
   expect(inside([q.x,q.y],terrain.surface), 'The real mossy log remains the only contact surface').toBe(true);
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
 test(`${id}: ten touch targets on the original mossy log`,async({page},info)=>{
  await setup(page,id,402,true,'maximum',options(874));
  const start=await snapshotGarden(page), keys=start.birds.map(b=>b.id);assertLive(start,10,keys);
  for(const [width,height] of [[402,874],[375,667],[320,568]]){
   await page.setViewportSize({width,height});await page.clock.runFor(700);
   const s=await snapshotGarden(page);
   await info.attach('max-'+width,{body:JSON.stringify(s),contentType:'application/json'});
   assertLive(s,10,keys);
   const supports=(await contacts(page)).map(q=>inside([q.x,q.y],terrain.surface));
   expect(supports.every(Boolean),'Every contact uses a real surface').toBe(true);
   await page.evaluate(()=>{
    const hitTarget=n=>n.closest('.finch-garden-image-plane > button');
    const trace=[];
    const touch=e=>{
     const n=hitTarget(e.target);
     if(n&&e.pointerType==='touch'&&e.isTrusted)trace.push(n.dataset.gardenHousehold||n.dataset.gardenFriend||n.dataset.encounterOpen||n.dataset.gardenVisitingFriend||n.dataset.encounterPage);
    };
    const suppress=e=>{if(hitTarget(e.target)){e.preventDefault();e.stopImmediatePropagation();}};
    document.addEventListener('pointerdown',touch,true);
    document.addEventListener('click',suppress,true);
    window.finishGardenTapProbe=()=>{
     document.removeEventListener('pointerdown',touch,true);
     document.removeEventListener('click',suppress,true);
     return trace;
    };
   });
   for(const b of s.birds)await page.touchscreen.tap(b.point.x,b.point.y);
   expect(await page.evaluate(()=>window.finishGardenTapProbe())).toEqual(keys);

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
    expect(inside([q.x,q.y],terrain.surface),'No intermediate step onto the log front').toBe(true);
    moved ||= ['fly','hop'].includes(q.state)&&Math.hypot(q.x-beginning[i].x,q.y-beginning[i].y)>.015;
   }
   if(moved)break;
  }
  await info.attach('movement',{body:JSON.stringify({beginning,end,moved}),contentType:'application/json'});
  expect(moved).toBe(true);
 });
}
