import {test,expect} from '@playwright/test';
import {setup,measure,measureReady,snapshotGarden,readyGardenSnapshot} from '../fixtures/garden-terrain-browser.js';
import {terrainFor,inside} from '../../src/garden-terrain-plan.js';
import {actorTerrainFor} from '../../src/data/garden-actor-terrain.js';
import {trailTerrainFor} from '../../src/data/garden-trail-terrain.js';
const ids=['java-rice','bird-diamond-firetail','bird-zebra-finch','kazaguruma'];
const expectedMotion=(id,legacy,{survey=false}={})=>trailTerrainFor(id)
 ?['data-actor-motion',survey?'trail-active':/^trail-(active|held|standing)$/]
 :actorTerrainFor(id)?['data-actor-motion','active']:['data-terrain-motion',legacy];
async function expectGardenPresentation(page,id,legacy,options){
 const stage=page.locator('.finch-garden-stage');
 if(trailTerrainFor(id))await expect(stage).toHaveAttribute('data-garden-trail','true');
 await expect(stage).toHaveAttribute(...expectedMotion(id,legacy,options));
}
function verifyTrailRoster(sample,before,id,receipt,when){
 expect(sample).toHaveLength(before.length);
 expect(sample.map(b=>b.id)).toEqual(before.map(b=>b.id));
 expect(new Set(sample.map(b=>b.id)).size).toBe(before.length);
 expect(new Set(sample.map(b=>b.point.join(','))).size).toBe(before.length);
 for(const b of sample){
  expect(b.hit,JSON.stringify(b)).toBe(true);
  expect(b.width+0.01).toBeGreaterThanOrEqual(44);
  expect(b.height+0.01).toBeGreaterThanOrEqual(44);
  expect(b.filter).toBe('none');
  if(receipt&&!inside(b.point,trailTerrainFor(id).surface)){
   const polygon=trailTerrainFor(id).surface;
   const isNear=epsilon=>polygon.some((a,i)=>{
    const [x,y]=b.point,[ax,ay]=a,[bx,by]=polygon[(i+1)%polygon.length];
    const dx=bx-ax,dy=by-ay,square=dx*dx+dy*dy;
    if(!square||!Number.isFinite(x+y))return false;
    const t=Math.min(1,Math.max(0,((x-ax)*dx+(y-ay)*dy)/square));
    return Math.hypot(x-ax-dx*t,y-ay-dy*t)<=epsilon;
   });
   const edge=!b.point.every(Number.isFinite)?'unparseable':isNear(1e-12)?'ulp-edge':isNear(1e-7)?'css-edge':'off-edge';
   const actor=!b.groundReceipt?.actor?'native':b.groundReceipt.air?'actor-air':'actor-ground';
   receipt.annotations.push({type:'qa-ground-dry',description:when+':'+actor+':'+edge});
  }
  expect(inside(b.point,trailTerrainFor(id).surface),JSON.stringify(b)).toBe(true);
 }
}

async function setReducedMotion(page,reduced,receipt){
 // Existing MediaQueryList objects update on WebKit's real media-change event,
 // later than a fresh matchMedia query. Do not advance the fake clock before it.
 await page.evaluate(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');let observed=false;media.addEventListener('change',()=>{observed=true;},{once:true});window.__terrainMediaState=()=>({observed,matches:media.matches});});
 await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
 try{
 await expect.poll(()=>page.evaluate(()=>window.__terrainMediaState())).toEqual({observed:true,matches:reduced});
 }catch(error){
  if(receipt){
   // Evidence only: do not run a new animation frame or retry the assertion.
   const verdict=await page.evaluate(reduced=>{
    const requested=x=>x===reduced?'match':'mismatch';
    const query='(prefers-reduced-motion: reduce)';
    const retained=window.__terrainMediaState?.();
    const mode=document.querySelector('.finch-garden-stage')?.dataset.actorMotion;
    return [reduced?'reduce':'restore',retained?.observed?'event':'no-event',
     retained?requested(retained.matches):'missing',requested(matchMedia(query).matches),
     mode==='active'?'active':mode==='held'?'held':'other'].join(':');
   },reduced).catch(()=>null);
   if(verdict)receipt.annotations.push({type:'qa-ground-media',description:verdict});
  }
  throw error;
 }
 await page.evaluate(()=>delete window.__terrainMediaState);
}
for(const id of ids)for(const width of [320,375,390,402,430])test(`surveyed motion ${id} ${width}`,async({page},info)=>{
 await setup(page,id,width,true,true);
 await expectGardenPresentation(page,id,'grounded',{survey:true});
 const bird=page.locator('.finch-garden-household'),before=await measureReady(page);expect(before).toHaveLength(1);
 await page.mouse.move(0,0);await page.locator('#finch-garden-title').focus();
 const positions=new Set();
 for(let n=0;n<38;n++){
  await page.clock.runFor(500);
  // A committed-world redraw briefly closes the existing image readiness gate.
  // Wait for real decode/layout; hidden replacement buttons are not interactive yet.
  await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
  await expectGardenPresentation(page,id,'grounded',{survey:true});
  for(const b of await measureReady(page)){
   expect(b.motion).toBe(expectedMotion(id,'grounded',{survey:true})[1]);expect(b.hit,JSON.stringify(b)).toBe(true);expect(b.filter).toBe('none');expect(b.src).toBe(before[0].src);
   expect(Math.round(b.width*1000)/1000).toBeGreaterThanOrEqual(44);
   expect(inside(b.point,trailTerrainFor(id)?.surface||actorTerrainFor(id)?.surface||terrainFor(id).surfaces[terrainFor(id).primary])).toBe(true);
   positions.add(b.point.join(','));
  }
 }
 expect(positions.size).toBeGreaterThan(2);
 await expect(page.locator('.garden-terrain-flight,.garden-terrain-mask')).toHaveCount(0);
 if(actorTerrainFor(id)||trailTerrainFor(id))await expect(page.locator('.garden-actor-flight')).toHaveCount(1);
 await page.screenshot({path:info.outputPath('ground.png')});
 await bird.focus();const held=await bird.getAttribute('style');await page.clock.runFor(6000);
 expect(await bird.getAttribute('style')).toBe(held);await expect(bird).toBeFocused();
 await page.keyboard.press('Enter');await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'文鳥の操作をとじる',exact:true}).click();
 await page.locator('[data-garden-details=about] > summary').click();
 await expect(page.locator('[data-garden-track-credit]')).toHaveCount(1);
 await page.locator('[data-garden-details=about] > summary').click();
 expect((await measureReady(page)).map(b=>b.id)).toEqual(before.map(b=>b.id));
});
for(const id of ids)for(const density of [false,'dense'])test(`safe roster ${id} ${density||'normal'}`,async({page},info)=>{
 await setup(page,id,320,true,density);
 // Legacy gardens retain static fallback; individually surveyed open grounds
 // now support the same whole roster without changing game presence.
 await expectGardenPresentation(page,id,'static');
 const receipt=id==='bird-zebra-finch'&&density==='dense'?info:null;
 const before=await measure(page,!!receipt);expect(before).toHaveLength(density?8:5);
 if(trailTerrainFor(id)){
  verifyTrailRoster(before,before,id,receipt,'initial');
  for(let elapsed=0;elapsed<30000;elapsed+=1500){
   await page.clock.runFor(1500);
   verifyTrailRoster(await measureReady(page,!!receipt),before,id,receipt,'during');
  }
  expect(await page.locator('[data-actor-state]').count()).toBe(before.length);
 }else{
  await page.clock.runFor(30000);
  if(!actorTerrainFor(id))expect((await measure(page)).map(b=>b.style)).toEqual(before.map(b=>b.style));
  else {expect((await measure(page)).map(b=>b.id)).toEqual(before.map(b=>b.id));expect(await page.locator('[data-actor-state]').count()).toBe(before.length);}
 }
 for(const b of await measure(page)){expect(b.hit,JSON.stringify(b)).toBe(true);expect(b.filter).toBe('none');}
 await expect(page.locator('.garden-terrain-flight')).toHaveCount(0);
});
for(const id of ids)test(`ground holds and resumes ${id}`,async({page},info)=>{
 await setup(page,id,390,true,true);
 await setReducedMotion(page,true,id==='java-rice'?info:null);
 await page.clock.runFor(1000);
 const held=await measure(page);await page.clock.runFor(7000);expect(await measure(page)).toEqual(held);
 await setReducedMotion(page,false,id==='java-rice'?info:null);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 const hidden=await measure(page);await page.clock.runFor(6000);expect(await measure(page)).toEqual(hidden);
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 await page.setViewportSize({width:844,height:390});await page.clock.runFor(1500);
 const rotated=await readyGardenSnapshot(page,info,'rotation-samples');expect(rotated.birds).toHaveLength(1);expect(Math.abs(rotated.overlay.height-rotated.viewport.height)).toBeLessThan(2);for(const b of rotated.birds){expect(b.centerInViewport,JSON.stringify(rotated)).toBe(true);expect(b.hit,JSON.stringify(rotated)).toBe(true);}
 await page.locator('.finch-garden-household').click();await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();await page.getByRole('button',{name:'文鳥の操作をとじる',exact:true}).click();
 await page.setViewportSize({width:390,height:844});await page.clock.runFor(1500);
 await page.locator('[data-garden-scroll=next]').click();await page.clock.runFor(1500);
 await expect(page.locator('.finch-garden-stage')).not.toHaveAttribute('data-garden-id',id);
 await page.locator('[data-garden-scroll=previous]').click();await page.clock.runFor(1500);
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-garden-id',id);
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
 // A new visit restores the ordinary four friends alongside the companion.
 // Preserve that game rule and each garden's appropriate presentation.
 await expectGardenPresentation(page,id,'static');
 expect(await measure(page)).toHaveLength(5);
 for(const b of await measure(page))expect(b.hit).toBe(true);
});
for(const id of ids)test(`ground motion setting off ${id}`,async({page})=>{
 await setup(page,id,375,false,true);const held=await measure(page);
 await page.clock.runFor(30000);expect(await measure(page)).toEqual(held);
});


test('ready geometry samples the current plane after a detached-handle redraw',async({page})=>{
 await page.setContent('<section class="finch-garden-stage" data-scene-state="ready"><div class="finch-garden-image-plane" style="position:relative;width:200px;height:200px"><button data-garden-household="b1" style="position:absolute;left:20%;top:20%;width:44px;height:44px">bird</button></div></section>');
 const old=await page.locator('.finch-garden-image-plane').elementHandle();
 await page.evaluate(()=>{const stage=document.querySelector('.finch-garden-stage');stage.replaceChildren(stage.firstElementChild.cloneNode(true));});
 expect(await old.evaluate(e=>({connected:e.isConnected,width:e.getBoundingClientRect().width}))).toEqual({connected:false,width:0});
 const rows=await measureReady(page);expect(rows).toHaveLength(1);expect(rows[0].width).toBe(44);expect(rows[0].hit).toBe(true);await old.dispose();
});
test('ready geometry does not hide a real occluded hit failure',async({page})=>{
 await page.setContent('<section class="finch-garden-stage" data-scene-state="ready"><div class="finch-garden-image-plane" style="position:relative;width:200px;height:200px"><button data-garden-household="b1" style="position:absolute;left:20%;top:20%;width:44px;height:44px">bird</button></div></section><div style="position:fixed;inset:0;background:white;z-index:100"></div>');
 const rows=await measureReady(page);expect(rows).toHaveLength(1);expect(rows[0].width).toBe(44);expect(rows[0].hit).toBe(false);
});

test.afterEach(async({page},info)=>{if(info.status!==info.expectedStatus)await info.attach('failure-current-garden',{body:JSON.stringify(await snapshotGarden(page)),contentType:'application/json'});});
