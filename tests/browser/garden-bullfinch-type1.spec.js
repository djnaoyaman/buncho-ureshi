import {test,expect} from '@playwright/test';
import {inside,terrainFor} from '../../src/garden-terrain-plan.js';
import {setup,snapshotGarden,assertGardenIdentities} from '../fixtures/garden-terrain-browser.js';
test.use({hasTouch:true});
const id='bird-eurasian-bullfinch';
const stone=terrainFor(id).surfaces.slab;
const dimensions=[[320,568],[375,667],[402,874]];
const options=height=>({nativeSource:true,quietPredators:true,height,afterOpenMs:400});
// One atomic evaluation: a periodic IndexedDB commit replaces the stage. A
// prior active snapshot cannot certify geometry read later on a fresh stage.
// Ignore only its explicit pre-admission transition, never a rejected/invalid
// active geometry (or a permanently unadmitted scene, which has no phases).
async function paintedSnapshot(page){
 return page.evaluate(()=>{
  const stage=document.querySelector('.finch-garden-stage'),plane=stage?.querySelector('.finch-garden-image-plane');
  const ready=stage?.dataset.sceneState,motion=stage?.dataset.actorMotion||stage?.dataset.terrainMotion;
  if(!plane)return {ready,motion,birds:[]};
  const p=plane.getBoundingClientRect();
  const birds=[...plane.querySelectorAll(':scope > button')].map(n=>{
   const envelope=n.querySelector('.garden-actor-flight');
   const visibleFlight=envelope&&getComputedStyle(envelope).visibility==='visible';
   const art=visibleFlight?envelope:n.querySelector('.garden-bird-sprite')||n;
   const r=art.getBoundingClientRect(),b=n.getBoundingClientRect();
   const x=b.left+b.width/2,y=b.top+b.height/2;
   const target=document.elementFromPoint(x,y);
   return {id:n.dataset.gardenHousehold||n.dataset.gardenFriend||n.dataset.encounterOpen||n.dataset.gardenVisitingFriend||n.dataset.encounterPage,
    phase:n.dataset.actorPhase,visibleFlight,hit:!!target&&n.contains(target),
    sourceFoot:[parseFloat(n.style.left)/100,parseFloat(n.style.top)/100],
    top:(r.top-p.top)/p.height,left:(r.left-p.left)/p.width,right:(r.right-p.left)/p.width,foot:(b.top+.975*b.height-p.top)/p.height};
  });
  return {ready,motion,birds};
 });
}
for(const [width,height] of dimensions){
 test(`bullfinch Type I ${width}: wing motion and native landing stay on the slab`,async({page},info)=>{
  test.setTimeout(70000);
  await setup(page,id,width,true,true,options(height));
  const phases=new Set();const airFrames=[];
  for(let i=0;i<432;i++){
   await page.clock.runFor(25);
   const s=await paintedSnapshot(page);
   if(s.ready!=='ready'||!s.motion)continue;
   assertGardenIdentities(s.birds,1,['b1']);expect(s.motion).toBe('active');expect(s.birds[0].hit).toBe(true);
   const [{phase,top,left,right,visibleFlight,foot,sourceFoot}]=s.birds;
   expect(inside(sourceFoot,stone),JSON.stringify(sourceFoot)).toBe(true);
   if(visibleFlight){
    airFrames.push({phase,top,left,right,foot});
    // Flight carries the sprite off the ground, not its route's footprint.
    // There is no landing below the slab front or in the mountain backdrop.
    expect(foot).toBeLessThan(sourceFoot[1]+.0001);
   }
   phases.add(phase);
   if(phases.has('flap')&&phases.has('contact')&&phases.has('fold'))break;
  }
  await info.attach('air-frames',{body:JSON.stringify(airFrames),contentType:'application/json'});
  expect(airFrames.length).toBeGreaterThan(0);
  expect([...phases]).toEqual(expect.arrayContaining(['flap','contact','fold']));
  const {birds:[b]}=await snapshotGarden(page);
  await page.touchscreen.tap(b.point.x,b.point.y);
  await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();
 });
 test(`bullfinch Type I ${width}: all ten true touchscreen inputs target distinct birds`,async({page},info)=>{
  await setup(page,id,width,true,'maximum',options(height));
  const s=await snapshotGarden(page);assertGardenIdentities(s.birds,10);expect(s.motion).toBe('active');
  await info.attach('dense',{body:JSON.stringify(s),contentType:'application/json'});
  const measure=await paintedSnapshot(page);
  expect(measure.motion).toBe('active');assertGardenIdentities(measure.birds,10,s.birds.map(b=>b.id));
  for(const b of measure.birds)expect(inside(b.sourceFoot,stone), JSON.stringify(b)).toBe(true);
  await page.evaluate(()=>{
   window.__onsenTouches=[];
   document.addEventListener('pointerdown',e=>{
    const n=e.target.closest('.finch-garden-image-plane > button');
    if(n&&e.pointerType==='touch'&&e.isTrusted)
     window.__onsenTouches.push(n.dataset.gardenHousehold||n.dataset.gardenFriend||n.dataset.encounterOpen||n.dataset.gardenVisitingFriend||n.dataset.encounterPage);
   },true);
   document.addEventListener('click',e=>{
    if(e.target.closest('.finch-garden-image-plane > button')){e.preventDefault();e.stopImmediatePropagation();}
   },true);
  });
  for(const b of s.birds){
   expect(b.rect.width).toBeGreaterThanOrEqual(44-.0001);expect(b.centerInViewport).toBe(true);expect(b.hit).toBe(true);
   await page.touchscreen.tap(b.point.x,b.point.y);
  }
  expect(await page.evaluate(()=>window.__onsenTouches)).toEqual(s.birds.map(b=>b.id));
 });
}
