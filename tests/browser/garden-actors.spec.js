import {test,expect} from '@playwright/test';
import {setup,snapshotGarden} from '../fixtures/garden-terrain-browser.js';
import {GARDEN_ACTOR_TERRAIN} from '../../src/data/garden-actor-terrain.js';
const gardens=Object.keys(GARDEN_ACTOR_TERRAIN);
test.use({hasTouch:true});
for(const id of gardens)for(const width of [375,402])test(`individual actors ${id} ${width}`,async({page},info)=>{
 await setup(page,id,width,true);
 await page.setViewportSize({width,height:width===375?667:874});
 await page.clock.runFor(1000);
 await page.screenshot({path:`/tmp/actors-${info.project.name}-${id}-${width}.png`});
 const samples=[];for(let i=0;i<15;i++){
  await page.clock.runFor(500);
  const s=await snapshotGarden(page);samples.push(s);
  for(const b of s.birds){expect(b.rect.width).toBeGreaterThanOrEqual(44);expect(b.centerInViewport,JSON.stringify(b)).toBe(true);expect(b.hit,JSON.stringify(b)).toBe(true);}
 }
 await info.attach('atomic-hit-samples',{body:JSON.stringify(samples),contentType:'application/json'});
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-actor-motion','active');
 const actors=await page.locator('[data-actor-state]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.gardenActorId,state:n.dataset.actorState,phase:n.dataset.actorPhase,point:[n.style.left,n.style.top]})));
 expect(actors).toHaveLength(5);
 await info.attach('actors',{body:JSON.stringify(actors),contentType:'application/json'});
});
for(const id of gardens)test(`actor lifecycle and rotation ${id}`,async({page},info)=>{
 await setup(page,id,375,true);
 await page.setViewportSize({width:375,height:667});await page.clock.runFor(2000);
 const identities=(await snapshotGarden(page)).birds.map(b=>b.id);
 const bird=page.locator('.finch-garden-household');await bird.focus();
 const held=await bird.getAttribute('style');await page.clock.runFor(4000);expect(await bird.getAttribute('style')).toBe(held);await expect(bird).toBeFocused();
 await page.keyboard.press('Enter');await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();await page.getByRole('button',{name:'文鳥の操作をとじる',exact:true}).click();
 await page.locator('#finch-garden-title').focus();
 for(const [width,height]of [[667,375],[375,667],[874,402],[402,874],[375,567],[375,667]]){
  await page.setViewportSize({width,height});await page.clock.runFor(500);
  const s=await snapshotGarden(page);await info.attach(`rotation-${width}-${height}`,{body:JSON.stringify(s),contentType:'application/json'});
  expect(s.birds.map(b=>b.id)).toEqual(identities);
  if(height>width)expect(s.motion,JSON.stringify(s)).toBe('active');
  for(const b of s.birds){expect(b.centerInViewport,JSON.stringify(s)).toBe(true);expect(b.hit,JSON.stringify(b)).toBe(true);}
  const b=s.birds.find(b=>b.id==='b1');await page.touchscreen.tap(b.point.x,b.point.y);
  await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();await page.getByRole('button',{name:'文鳥の操作をとじる',exact:true}).click();
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.clock.runFor(1000);
 const reduced=await page.locator('[data-actor-state]').evaluateAll(bs=>bs.map(b=>b.getAttribute('style')));await page.clock.runFor(5000);
 expect(await page.locator('[data-actor-state]').evaluateAll(bs=>bs.map(b=>b.getAttribute('style')))).toEqual(reduced);
 await expect(page.locator('[data-actor-state=fly]')).toHaveCount(0);
 await page.locator('[data-garden-details=about] > summary').click();await expect(page.locator('[data-garden-track-credit]')).toHaveCount(1);
 await page.locator('[data-garden-details=about] > summary').click();
});
for(const id of gardens)for(const density of ['empty',true,'dense','maximum'])test(`actor population ${id} ${density}`,async({page},info)=>{
 await setup(page,id,320,true,density);await page.clock.runFor(2000);
 const s=await snapshotGarden(page);expect(s.birds).toHaveLength(density==='empty'?0:density==='maximum'?10:density==='dense'?8:1);
 await expect(page.locator('[data-actor-state]')).toHaveCount(s.birds.length);
 for(const b of s.birds){expect(b.centerInViewport,JSON.stringify(b)).toBe(true);expect(b.hit,JSON.stringify(b)).toBe(true);}
 await page.clock.runFor(8000);for(const b of (await snapshotGarden(page)).birds){expect(b.centerInViewport,JSON.stringify(b)).toBe(true);expect(b.hit,JSON.stringify(b)).toBe(true);}
 if(density==='maximum')for(const [width,height]of [[375,667],[667,375],[375,667],[402,874],[874,402],[402,874]]){
  await page.setViewportSize({width,height});await page.clock.runFor(1000);
  const r=await snapshotGarden(page);expect(r.birds).toHaveLength(10);
  for(const b of r.birds){expect(b.centerInViewport,JSON.stringify(r)).toBe(true);expect(b.hit,JSON.stringify(r)).toBe(true);}
  await page.screenshot({path:info.outputPath(`maximum-${width}-${height}.png`)});
  const lead=r.birds.find(b=>b.id==='b1');await page.touchscreen.tap(lead.point.x,lead.point.y);
  await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();await page.getByRole('button',{name:'文鳥の操作をとじる',exact:true}).click();
 }
});
test('all four original colour textures fly through weighted choices and land',async({page},info)=>{
 test.setTimeout(180000);
 await setup(page,'java-rice',375,true,'colours');await page.setViewportSize({width:375,height:667});
 const phases={},seen=[];
 for(let i=0;i<1200;i++){
  await page.clock.runFor(100);
  const sample=await page.evaluate(()=>{const stage=document.querySelector('.finch-garden-stage');return {ready:stage?.dataset.sceneState,rows:[...(stage?.querySelectorAll('[data-actor-state]')||[])].map(n=>({id:n.dataset.gardenActorId,state:n.dataset.actorState,phase:n.dataset.actorPhase,color:n.querySelector('.garden-bird-sprite')?.dataset.color,texture:n.querySelector('.garden-bird-pose-window img')?.getAttribute('src'),flight:n.querySelector('.garden-actor-flight')?.style.visibility}))};});
  if(sample.ready!=='ready')continue;
  const rows=sample.rows;for(const r of rows)expect(r.texture,JSON.stringify(r)).toBeTruthy();
  for(const r of rows)if(r.state==='fly'&&['rise','flap','contact'].includes(r.phase)){
   phases[r.color]||=[];
   if(!phases[r.color].includes(r.phase)){phases[r.color].push(r.phase);seen.push({...r,elapsed:i*100});await page.screenshot({path:info.outputPath(`${r.color}-${r.phase}.png`)});}
  }
  if(['white','sakura','cinnamon','silver'].every(c=>phases[c]?.length===3))break;
 }
 await info.attach('weighted-phase-evidence',{body:JSON.stringify({phases,seen}),contentType:'application/json'});
 for(const c of ['white','sakura','cinnamon','silver'])expect(phases[c]?.sort(),c).toEqual(['contact','flap','rise']);
});

const errors=new WeakMap();
test.beforeEach(async({page})=>{const list=[];errors.set(page,list);page.on('pageerror',e=>list.push(e.message));});
test.afterEach(async({page})=>{expect(errors.get(page)||[]).toEqual([]);});
for(const id of ['java-rice','bird-diamond-firetail','hanadokei'])test(`actor old-unit compatibility ${id}`,async({page},info)=>{
 await page.addInitScript(()=>{const supports=CSS.supports.bind(CSS);CSS.supports=(...args)=>args.some(v=>/cq[wh]|dvh/.test(v))?false:supports(...args);});
 await page.route(/\/src\/(game\.css|encounter-ui\.css|encounter-ui\.js)(\?|$)/,async route=>{
  const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace(/(\d*\.?\d+)(cq[wh]|dvh)/g,'$1unsupported')});
 });
 await setup(page,id,375,true);
 for(const [width,height]of [[375,667],[667,375],[375,667],[402,874],[874,402],[402,874]]){
  await page.setViewportSize({width,height});await page.clock.runFor(500);
  const s=await snapshotGarden(page);await info.attach(`legacy-${width}-${height}`,{body:JSON.stringify(s),contentType:'application/json'});
  expect(Math.abs(s.overlay.height-s.viewport.height),JSON.stringify(s)).toBeLessThan(2);
  expect(s.birds).toHaveLength(5);for(const b of s.birds){expect(b.centerInViewport,JSON.stringify(s)).toBe(true);expect(b.hit,JSON.stringify(s)).toBe(true);}
  expect(await page.locator('.finch-garden-background').evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);
  const b=s.birds.find(b=>b.id==='b1');await page.touchscreen.tap(b.point.x,b.point.y);await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();await page.getByRole('button',{name:'文鳥の操作をとじる',exact:true}).click();
 }
});
