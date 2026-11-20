import {test,expect} from '@playwright/test';
import {setup,readyGardenSnapshot} from '../fixtures/garden-terrain-browser.js';
test.use({hasTouch:true});
const ids=['yuyake','bird-eurasian-bullfinch','bird-white-winged-crossbill','bali-terrace'];
for(const id of ids)for(const viewport of [{width:375,height:667},{width:402,height:874}])test(`v2 touch rotate and audio ${id} ${viewport.width}x${viewport.height}`,async({page},info)=>{
 await page.addInitScript(()=>{
  const C=window.AudioContext||window.webkitAudioContext;window.__terrainAudio={starts:0,live:0};
  class Context extends C{createBufferSource(){const s=super.createBufferSource(),start=s.start.bind(s),stop=s.stop.bind(s);let live=false;s.start=(...a)=>{live=true;window.__terrainAudio.starts++;window.__terrainAudio.live++;return start(...a);};s.stop=(...a)=>{if(live){live=false;window.__terrainAudio.live--;}return stop(...a);};return s;}}
  window.AudioContext=Context;window.webkitAudioContext=Context;
 });
 await setup(page,id,viewport.width,true,false,viewport.height);await page.clock.resume();await page.setViewportSize(viewport);
 expect((await readyGardenSnapshot(page,info,'initial-five-grounded')).motion).toBe('grounded');
 await page.locator('[data-game-close-panel]').click();
 const toggle=page.locator('.game-scene-controls-toggle');if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
 await page.locator('#game-nav-open').click();await page.locator('#game-menu-settings').click();await page.locator('[data-music-auto]').tap();
 await expect(page.locator('.game-music')).toHaveAttribute('data-status','playing',{timeout:30000});
 await page.locator('[data-game-close-panel]').click();if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();await page.locator('[data-game-panel=outdoors]').tap();
 await expect(page.locator('.game-music')).toHaveAttribute('data-status','playing',{timeout:30000});await expect.poll(()=>page.evaluate(()=>__terrainAudio.live)).toBe(1);
 const audio=await page.evaluate(()=>({...__terrainAudio}));
 for(const size of [viewport,{width:viewport.height,height:viewport.width},viewport,{width:viewport.width,height:viewport.height-80},viewport]){
  await page.setViewportSize(size);const snap=await readyGardenSnapshot(page,info,'touch-rotation');expect(snap.birds).toHaveLength(5);expect(Math.abs(snap.overlay.height-size.height)).toBeLessThan(2);
  for(const b of snap.birds){expect(b.hit,JSON.stringify(snap)).toBe(true);expect(b.centerInViewport).toBe(true);}
  const images=await page.locator('.finch-garden-image-plane img').evaluateAll(nodes=>nodes.map(n=>({src:n.currentSrc,complete:n.complete,width:n.naturalWidth,filter:getComputedStyle(n).filter})));
  expect(images.length).toBeGreaterThan(5);for(const image of images){expect(image.complete).toBe(true);expect(image.width).toBeGreaterThan(0);expect(image.filter).toBe('none');}
  await page.locator('.finch-garden-household').first().tap();await expect(page.locator('.game-bird-sheet[open]')).toBeVisible();await page.locator('[data-game-close-bird]').tap();
  expect(await page.evaluate(()=>({...__terrainAudio}))).toEqual(audio);
 }
 await page.screenshot({path:info.outputPath('portrait-after-rotation.png')});
});
// Feature-branch simulation only; not the Safari 15.8.8 engine or an iPhone.
for(const width of [375,402])test(`v2 no dynamic viewport unit feature branch ${width}`,async({page},info)=>{
 await page.addInitScript(()=>{const supports=CSS.supports.bind(CSS);CSS.supports=(...args)=>args.join(' ').includes('100dvh')?false:supports(...args);});
 await setup(page,'yuyake',width);await page.clock.resume();const height=width===375?667:874;
 for(const size of [{width,height},{width:height,height:width},{width,height}]){
  await page.setViewportSize(size);const s=await readyGardenSnapshot(page,info,'no-dvh-branch');
  // Pixel metadata may lag; the actual fixed-edge scene must already fit.
  expect(Math.abs(s.overlay.height-size.height)).toBeLessThan(2);expect(s.birds).toHaveLength(5);for(const b of s.birds)expect(b.hit,JSON.stringify(s)).toBe(true);
  await page.locator('.finch-garden-household').first().tap();await expect(page.locator('.game-bird-sheet[open]')).toBeVisible();await page.locator('[data-game-close-bird]').tap();
 }
});
for(const id of ids)for(const width of [375,402])test(`v2 five birds without container query units ${id} ${width}`,async({page},info)=>{
 await page.addInitScript(()=>{const supports=CSS.supports.bind(CSS);CSS.supports=(...args)=>args.some(v=>/cq[wh]/.test(v))?false:supports(...args);});
 await page.route(/\/src\/(game\.css|encounter-ui\.css|encounter-ui\.js)(\?|$)/,async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace(/(\d*\.?\d+)cq([wh])/g,'$1unsupported$2')});});
 const height=width===375?667:874;await setup(page,id,width,true,false,height);await page.clock.resume();
 expect((await readyGardenSnapshot(page,info,'initial-fallback-grounded')).motion).toBe('grounded');
 for(const size of [{width,height},{width:height,height:width},{width,height}]){
  await page.setViewportSize(size);const s=await readyGardenSnapshot(page,info,'container-unit-fallback');expect(s.birds).toHaveLength(5);
  for(const b of s.birds){expect(b.hit,JSON.stringify(s)).toBe(true);expect(b.centerInViewport).toBe(true);}
  const imgs=await page.locator('.finch-garden-image-plane img').evaluateAll(nodes=>nodes.map(n=>({loaded:n.complete&&n.naturalWidth>0,filter:getComputedStyle(n).filter})));expect(imgs.length).toBeGreaterThan(5);for(const i of imgs){expect(i.loaded).toBe(true);expect(i.filter).toBe('none');}
  await page.locator('.finch-garden-household').first().tap();await expect(page.locator('.game-bird-sheet[open]')).toBeVisible();await page.locator('[data-game-close-bird]').tap();
 }
 expect((await readyGardenSnapshot(page,info,'restored-fallback-grounded')).motion).toBe('grounded');
 await page.screenshot({path:info.outputPath('five-birds-container-fallback.png')});
});
