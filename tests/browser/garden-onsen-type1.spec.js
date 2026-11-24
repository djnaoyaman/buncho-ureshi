import {test,expect} from '@playwright/test';
import sharp from 'sharp';
import {actorTerrainFor} from '../../src/data/garden-actor-terrain.js';
import {inside} from '../../src/garden-terrain-plan.js';
import {setup,snapshotGarden,assertGardenIdentities} from '../fixtures/garden-terrain-browser.js';
test.use({hasTouch:true,deviceScaleFactor:1});
const dimensions=[[320,568],[375,667],[402,874]];
const options=height=>({nativeSource:true,quietPredators:true,height,afterOpenMs:400});
const signs=['flap','contact','fold'];
const terrain=actorTerrainFor('onsen');
const checkScene=(s,count,ids=null)=>{
 assertGardenIdentities(s.birds,count,ids);
 expect(s.motion,JSON.stringify(s)).toBe('active');
 for(const b of s.birds){
  expect(b.rect.width).toBeGreaterThanOrEqual(44-.0001);
  expect(b.centerInViewport).toBe(true);
  expect(b.hit,JSON.stringify(b)).toBe(true);
  // An occluded wing tip is appropriate for a foreground branch; the
  // actual bird's central silhouette and native control remain available.
  expect(inside([(b.point.x-s.plane.left)/s.plane.width,(b.point.y-s.plane.top)/s.plane.height],terrain.foreground)).toBe(false);
  const left=Number(b.actorStyle.match(/(?:^|;)\s*left:\s*([\d.]+)%/)?.[1])/100;
  const top=Number(b.actorStyle.match(/(?:^|;)\s*top:\s*([\d.]+)%/)?.[1])/100;
  expect(inside([left,top],terrain.surface),b.actorStyle).toBe(true);
 }
};
for(const [width,height] of dimensions){
 test(`courtyard ${width}: visible native wing, actual stone landing and restored tap`,async({page},info)=>{
  test.setTimeout(70000);
  await setup(page,'onsen',width,true,true,options(height));
  const phases=new Set(),trace=[];let visibleWing=false;
  for(let i=0;i<432;i++){
   await page.clock.runFor(25);
   const s=await snapshotGarden(page);checkScene(s,1,['b1']);
   const phase=s.birds[0].actorPhase;
   if(!phases.has(phase))trace.push(s);
   phases.add(phase);
   if(phase==='flap'&&!visibleWing)visibleWing=await page.locator('[data-garden-household="b1"] .garden-actor-flight').evaluate(n=>getComputedStyle(n).visibility==='visible');
   if(signs.every(o=>phases.has(o)))break;
  }
  await info.attach('flight-phases',{body:JSON.stringify(trace),contentType:'application/json'});
  expect([...phases]).toEqual(expect.arrayContaining(signs));
  expect(visibleWing).toBe(true);
  const {birds:[b]}=await snapshotGarden(page);
  await page.touchscreen.tap(b.point.x,b.point.y);
  await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();
 });
 test(`courtyard ${width}: ten actual touch events go to ten identity-preserving controls`,async({page},info)=>{
  await setup(page,'onsen',width,true,'maximum',options(height));
  const first=await snapshotGarden(page);checkScene(first,10);
  await info.attach('ten-taps',{body:JSON.stringify(first),contentType:'application/json'});
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
  for(const b of first.birds)await page.touchscreen.tap(b.point.x,b.point.y);
  expect(await page.evaluate(()=>window.__onsenTouches)).toEqual(first.birds.map(b=>b.id));
 });
}
// Seven through nine leave reserve seats and can exercise different flight
// corridors. A full ten alone can mask the clipping bug by not flying.
for(const n of [7,8,9,10])test(`courtyard 320: ${n} real birds retain native centers during the confined schedule`,async({page},info)=>{
 test.setTimeout(65000);
 await setup(page,'onsen',320,true,'maximum',{...options(568),prepareWorld(w){
  w.encounters.gardenFriends.attendees.splice(n-6);
 }});
 const first=await snapshotGarden(page);checkScene(first,n);
 const ids=first.birds.map(b=>b.id),air=[];
 for(let at=0;at<7000;at+=50){
  await page.clock.runFor(50);
  const s=await snapshotGarden(page);
  checkScene(s,n,ids);
  if(s.birds.some(b=>b.actorState==='fly'))air.push(s);
 }
 await info.attach('dense-flight-coverage',{body:JSON.stringify({count:n,airSamples:air.length,example:air[0]??null}),contentType:'application/json'});
});
test('courtyard branch paints the exact original pixels over an overlap and never becomes an input layer',async({page})=>{
 await setup(page,'onsen',320,true,true,options(568));
 const mask=page.locator('.garden-actor-foreground');
 await expect(mask).toHaveCount(1);await expect(mask).toHaveCSS('pointer-events','none');
 await expect(page.locator('.finch-garden-background')).toHaveJSProperty('naturalWidth',1024);
 const coords=await mask.evaluate(m=>{
  const b=m.parentElement.querySelector('.finch-garden-background');
  if(!b||!getComputedStyle(m).backgroundImage.includes(b.currentSrc))throw Error('not the original image');
  const r=m.getBoundingClientRect(),q=b.getBoundingClientRect();
  if(r.left!==q.left||r.top!==q.top||r.width!==q.width||r.height!==q.height)throw Error('foreground did not use the original image projection');
  const plane=m.parentElement;
  for(const e of plane.querySelectorAll(':scope > button,.garden-actor-shadow'))e.style.visibility='hidden';
  m.style.visibility='hidden';
  return [1020,1074].map(y=>[Math.round(r.left+r.width*.5),Math.round(r.top+r.height*y/1536)]);
 });
 async function getPixels(){
  const {data,info}=await sharp(await page.screenshot({scale:'css',animations:'disabled'})).removeAlpha().raw().toBuffer({resolveWithObject:true});
  return coords.map(([x,y])=>[...data.subarray((y*info.width+x)*info.channels,(y*info.width+x+1)*info.channels)]);
 }
 const original=await getPixels();
 await mask.evaluate(m=>{
  m.style.visibility='';
  const probe=document.createElement('span');
  probe.style.cssText='position:absolute;left:47%;top:60%;width:6%;height:15%;z-index:1001;background:rgb(239,17,227);pointer-events:auto';
  probe.id='foreground-pixel-probe';
  m.parentElement.append(probe);
 });
 const painted=await getPixels();
 expect(painted[0]).toEqual(original[0]);
 expect(original[1]).not.toEqual([239,17,227]);
 expect(painted[1]).toEqual([239,17,227]);
 expect(await page.evaluate(([x,y])=>document.elementFromPoint(x,y)?.id,coords[0])).toBe('foreground-pixel-probe');
});

// The narrow dense seating audit above ends before the first eligible
// neighbouring departure in this independent seeded eight-bird roster.
test('courtyard 320: a native eight-bird roster shows a real flight and stone landing',async({page},info)=>{
 test.setTimeout(100000);
 await setup(page,'onsen',320,true,'maximum',{...options(568),prepareWorld(w){
  w.encounters.gardenFriends.attendees.splice(2);
 }});
 const first=await snapshotGarden(page);checkScene(first,8);
 const ids=first.birds.map(b=>b.id),starts=new Map(first.birds.map(b=>[b.id,b.actorNode]));
 const airborne=new Set(),trace=[];let landed=null;
 for(let i=0;i<400;i++){
  await page.clock.runFor(80);
  const s=await snapshotGarden(page);checkScene(s,8,ids);
  for(const b of s.birds){
   if(b.actorPhase==='flap'&&!airborne.has(b.id)){
    const wing=page.locator(`[data-garden-actor-id="${b.id}"] .garden-actor-flight`);
    if(await wing.evaluate(n=>getComputedStyle(n).visibility==='visible')){
     airborne.add(b.id);trace.push({id:b.id,stage:'airborne',s});
    }
   }
   if(airborne.has(b.id)&&b.actorState!=='fly'&&b.actorPhase==='ground'&&b.actorNode!==starts.get(b.id)){
    landed=b.id;trace.push({id:b.id,stage:'landed',s});break;
   }
  }
  if(landed)break;
 }
 await info.attach('eight-real-move',{body:JSON.stringify(trace),contentType:'application/json'});
 expect(landed).toBeTruthy();
});
