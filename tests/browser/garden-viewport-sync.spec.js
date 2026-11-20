import {test,expect} from '@playwright/test';
import {setup,measure} from '../fixtures/garden-terrain-browser.js';
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
async function readySnapshot(page){
 let snapshot;
 await expect.poll(async()=>{snapshot=await page.evaluate(()=>{
  const stage=document.querySelector('.finch-garden-stage'),plane=stage?.querySelector('.finch-garden-image-plane');
  if(stage?.dataset.sceneState!=='ready'||!plane?.getBoundingClientRect().width)return null;
  const birds=[...plane.querySelectorAll(':scope > button')].map(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {id:n.dataset.gardenHousehold||n.dataset.gardenFriend,width:r.width,height:r.height,hit:!!hit&&n.contains(hit),rect:r.toJSON(),target:hit?.className};});
  return {height:document.querySelector('.game-panel-overlay[data-scene=true]').getBoundingClientRect().height,viewport:innerHeight,birds};
 });return snapshot!==null;}).toBe(true);return snapshot;
}
for(const id of ['java-rice','bird-diamond-firetail','bird-zebra-finch','kazaguruma','yuyake','bird-gouldian-finch'])for(const density of [true,false,'dense'])test(`viewport synchronization ${id} ${density}`,async({page})=>{
 await delayViewport(page);await setup(page,id,390,true,density);await page.clock.resume();
 for(const width of [844,390,844,390]){
  await page.evaluate(()=>window.__holdViewport=true);
  await page.setViewportSize({width,height:width===844?390:844});
  const sample=await readySnapshot(page);
  expect(Math.abs(sample.height-sample.viewport)).toBeLessThan(2);
  for(const b of sample.birds)expect(b.hit,JSON.stringify(b)).toBe(true);
  await page.locator('.finch-garden-household').first().click();await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'文鳥の操作をとじる',exact:true}).click();
  await page.evaluate(()=>window.__releaseViewport());
 }
});

test('old pixel-height control exposes the original offscreen hit while notification is pending',async({page})=>{
 await page.route(/\/src\/game-chrome\.js(?:\?.*)?$/,async route=>{const response=await route.fetch();let source=await response.text();
  const current="zoomed||(dynamicViewport&&unobscured)?'100dvh':`${height}px`";
  expect(source).toContain(current);source=source.replace(current,"zoomed?'100dvh':`${height}px`");await route.fulfill({response,body:source});
 });
 await delayViewport(page);await setup(page,'java-rice',390,true,true);await page.clock.resume();
 await page.evaluate(()=>window.__holdViewport=true);await page.setViewportSize({width:844,height:390});
 const old=await readySnapshot(page);expect(old.height).toBe(844);expect(old.viewport).toBe(390);expect(old.birds.some(b=>!b.hit&&b.rect.top>390)).toBe(true);
 await page.evaluate(()=>window.__releaseViewport());
 await expect.poll(async()=>Math.abs((await readySnapshot(page)).height-390)).toBeLessThan(2);
 const recovered=await readySnapshot(page);for(const b of recovered.birds)expect(b.hit).toBe(true);
});
