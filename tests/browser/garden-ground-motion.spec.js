import {test,expect} from '@playwright/test';
import {setup,measure,measureReady,snapshotGarden,readyGardenSnapshot} from '../fixtures/garden-terrain-browser.js';
import {terrainFor,inside} from '../../src/garden-terrain-plan.js';
const ids=['java-rice','bird-diamond-firetail','bird-zebra-finch','kazaguruma'];
async function setReducedMotion(page,reduced){
 // Existing MediaQueryList objects update on WebKit's real media-change event,
 // later than a fresh matchMedia query. Do not advance the fake clock before it.
 await page.evaluate(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');let observed=false;media.addEventListener('change',()=>{observed=true;},{once:true});window.__terrainMediaState=()=>({observed,matches:media.matches});});
 await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
 await expect.poll(()=>page.evaluate(()=>window.__terrainMediaState())).toEqual({observed:true,matches:reduced});
 await page.evaluate(()=>delete window.__terrainMediaState);
}
for(const id of ids)for(const width of [320,375,390,402,430])test(`ground-only ${id} ${width}`,async({page},info)=>{
 await setup(page,id,width,true,true);
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-terrain-motion','grounded');
 const bird=page.locator('.finch-garden-household'),before=await measureReady(page);expect(before).toHaveLength(1);
 await page.mouse.move(0,0);await page.locator('#finch-garden-title').focus();
 const positions=new Set();
 for(let n=0;n<38;n++){
  await page.clock.runFor(500);
  // A committed-world redraw briefly closes the existing image readiness gate.
  // Wait for real decode/layout; hidden replacement buttons are not interactive yet.
  await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
  await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-terrain-motion','grounded');
  for(const b of await measureReady(page)){
   expect(b.motion).toBe('grounded');expect(b.hit,JSON.stringify(b)).toBe(true);expect(b.filter).toBe('none');expect(b.src).toBe(before[0].src);
   expect(Math.round(b.width*1000)/1000).toBeGreaterThanOrEqual(44);
   expect(inside(b.point,terrainFor(id).surfaces[terrainFor(id).primary])).toBe(true);
   positions.add(b.point.join(','));
  }
 }
 expect(positions.size).toBeGreaterThan(2);
 await expect(page.locator('.garden-terrain-flight,.garden-terrain-mask')).toHaveCount(0);
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
for(const id of ids)for(const density of [false,'dense'])test(`safe roster ${id} ${density||'normal'}`,async({page})=>{
 await setup(page,id,320,true,density);
 // Narrow surfaces must not be widened to force the whole roster onto them.
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-terrain-motion','static');
 const before=await measure(page);expect(before).toHaveLength(density?8:5);
 await page.clock.runFor(30000);expect((await measure(page)).map(b=>b.style)).toEqual(before.map(b=>b.style));
 for(const b of await measure(page)){expect(b.hit,JSON.stringify(b)).toBe(true);expect(b.filter).toBe('none');}
 await expect(page.locator('.garden-terrain-flight')).toHaveCount(0);
});
for(const id of ids)test(`ground holds and resumes ${id}`,async({page},info)=>{
 await setup(page,id,390,true,true);
 await setReducedMotion(page,true);
 await page.clock.runFor(1000);
 const held=await measure(page);await page.clock.runFor(7000);expect(await measure(page)).toEqual(held);
 await setReducedMotion(page,false);
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
 // Preserve that game rule and the narrow-surface static fallback.
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-terrain-motion','static');
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
