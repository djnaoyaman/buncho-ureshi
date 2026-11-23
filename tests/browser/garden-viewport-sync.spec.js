import {test,expect} from '@playwright/test';
import {setup,snapshotGarden,readyGardenSnapshot} from '../fixtures/garden-terrain-browser.js';
// Delay only the shell's real resize notification, reproducing the observed
// WebKit ordering. No fake resize events, modified hit tests, or test-only UI.
async function delayViewport(page){await page.addInitScript(()=>{
 const add=EventTarget.prototype.addEventListener;
 EventTarget.prototype.addEventListener=function(type,listener,options){
  if((this===window||this===window.visualViewport)&&type==='resize'&&listener?.name==='updateViewport'){
   const wrapped=function(event){if(window.__holdViewport){(window.__pendingViewport??=[]).push(()=>listener.call(this,event));}else listener.call(this,event);};
   return add.call(this,type,wrapped,options);
  }return add.call(this,type,listener,options);
 };
 window.__releaseViewport=()=>{window.__holdViewport=false;for(const call of window.__pendingViewport||[])call();window.__pendingViewport=[];};
});}
// Two observers can post a geometry frame; cross the documented paint
// boundary once while the delayed shell resize remains locked.
const renderedViewport=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
for(const id of ['java-rice','bird-diamond-firetail','bird-zebra-finch','kazaguruma','yuyake','bird-gouldian-finch'])for(const density of [true,false,'dense'])test(`viewport synchronization ${id} ${density}`,async({page},info)=>{
 await delayViewport(page);await setup(page,id,390,true,density);await page.clock.resume();
 for(const width of [844,390,844,390]){
  await page.evaluate(()=>window.__holdViewport=true);
  await page.setViewportSize({width,height:width===844?390:844});
  await renderedViewport(page);
  const sample=await readyGardenSnapshot(page,info,'viewport-samples');
  expect(Math.abs(sample.overlay.height-sample.viewport.height)).toBeLessThan(2);
  for(const b of sample.birds){expect(b.centerInViewport,JSON.stringify(sample)).toBe(true);expect(b.hit,JSON.stringify(sample)).toBe(true);}
  await page.locator('.finch-garden-household').first().click();await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'文鳥の操作をとじる',exact:true}).click();
  await page.evaluate(()=>window.__releaseViewport());
 }
});

test('old pixel-height control exposes the original offscreen hit while notification is pending',async({page},info)=>{
 await page.route(/\/src\/game-chrome\.js(?:\?.*)?$/,async route=>{const response=await route.fetch();let source=await response.text();
  const current="zoomed||(dynamicViewport&&unobscured)?'100dvh':`${height}px`";
  expect(source).toContain(current);source=source.replace(current,"zoomed?'100dvh':`${height}px`");await route.fulfill({response,body:source});
 });
 await delayViewport(page);await setup(page,'java-rice',390,true,true);await page.clock.resume();
 await page.evaluate(()=>window.__holdViewport=true);await page.setViewportSize({width:844,height:390});
 const old=await readyGardenSnapshot(page,info,'viewport-samples');expect(old.overlay.height).toBe(844);expect(old.viewport.height).toBe(390);expect(old.birds.some(b=>!b.hit&&!b.centerInViewport&&b.rect.top>390)).toBe(true);
 await page.evaluate(()=>window.__releaseViewport());
 await expect.poll(async()=>Math.abs((await readyGardenSnapshot(page,info,'viewport-samples')).overlay.height-390)).toBeLessThan(2);
 const recovered=await readyGardenSnapshot(page,info,'viewport-samples');for(const b of recovered.birds)expect(b.hit).toBe(true);
});

test.afterEach(async({page},info)=>{if(info.status!==info.expectedStatus)await info.attach('failure-current-garden',{body:JSON.stringify(await snapshotGarden(page)),contentType:'application/json'});});

test('atomic snapshot exposes a ready occluded target without waiting for success',async({page},info)=>{
 await page.setContent('<section class="finch-garden-stage" data-scene-state="ready"><div class="finch-garden-image-plane"><button data-garden-household="b1" style="position:fixed;left:20px;top:20px;width:44px;height:44px">bird</button></div></section><div id="occluder" style="position:fixed;inset:0;z-index:10;background:white"></div>');
 const sample=await readyGardenSnapshot(page,info,'occlusion-control');expect(sample.birds[0].hit).toBe(false);expect(sample.birds[0].front.id).toBe('occluder');expect(sample.birds[0].centerInViewport).toBe(true);
});
test('atomic snapshot exposes ready zero geometry and offscreen targets',async({page},info)=>{
 await page.setContent('<section class="finch-garden-stage" data-scene-state="ready"><div class="finch-garden-image-plane"><button data-garden-household="zero" style="display:none">zero</button><button data-garden-household="outside" style="position:fixed;top:20000px;width:44px;height:44px">outside</button></div></section>');
 const sample=await readyGardenSnapshot(page,info,'geometry-control');expect(sample.birds[0].rect.width).toBe(0);expect(sample.birds[0].hit).toBe(false);expect(sample.birds[1].centerInViewport).toBe(false);expect(sample.birds[1].hit).toBe(false);expect(sample.birds[1].front).toBeNull();
});
