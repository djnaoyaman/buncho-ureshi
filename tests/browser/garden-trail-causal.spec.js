import {test,expect} from '@playwright/test';
import {setup,snapshotGarden,assertGardenIdentities} from '../fixtures/garden-terrain-browser.js';

const control='java-rice',trail='bird-zebra-finch';
const stage=page=>page.locator('.finch-garden-stage');
const viewport={height:874,afterOpenMs:0};
const config={...viewport,trailPreview:true};
test.use({hasTouch:true});
test.setTimeout(45000);

test('01 served game module contains exactly one opt-in replacement token', {tag:'@causal-module'},async({request})=>{
 const r=await request.get('src/game.js');expect(r.ok()).toBe(true);
 const source=await r.text();
 expect(source.split('previewGardenTrail = false')).toHaveLength(2);
 expect(source.split('predatorRandom = Math.random')).toHaveLength(2);
});

test('02 unmodified Type I #01 control page opens the intended ready garden', {tag:'@causal-control-ready'},async({page})=>{
 await setup(page,control,402,true,true,viewport);
 await expect(stage(page)).toHaveAttribute('data-garden-id',control);
 await expect(stage(page)).toHaveAttribute('data-scene-state','ready');
 await expect(stage(page)).not.toHaveAttribute('data-garden-trail-preview','true');
});

test('03 unmodified Type I #01 control exposes a genuine native tap', {tag:'@causal-control-tap'},async({page})=>{
 await setup(page,control,402,true,true,viewport);
 await page.clock.runFor(1000);
 const snap=await snapshotGarden(page),b=snap.birds[0];
 assertGardenIdentities(snap.birds,1,['b1']);
 expect(snap.motion).toBe('active');expect(b.hit).toBe(true);
 await page.touchscreen.tap(b.point.x,b.point.y);
 await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();
});

test('04 #07 without opt-in opens its ready native stage', {tag:'@causal-trail-ordinary'},async({page})=>{
 await setup(page,trail,402,true,true,viewport);
 await expect(stage(page)).toHaveAttribute('data-garden-id',trail);
 await expect(stage(page)).toHaveAttribute('data-scene-state','ready');
 await expect(stage(page)).not.toHaveAttribute('data-garden-trail-preview','true');
});

test('05 opt-in #07 receives the browser route replacement', {tag:'@causal-gate'},async({page})=>{
 await setup(page,trail,402,true,true,config);
 await expect(stage(page)).toHaveAttribute('data-garden-id',trail);
 await expect(stage(page)).toHaveAttribute('data-garden-trail-preview','true');
});
test('06 #07 test clock drives exact browser-wall time without native mutation', {tag:'@causal-clock'},async({page})=>{
 await setup(page,trail,402,true,true,config);
 const before=await page.evaluate(()=>Date.now());
 await page.clock.runFor(500);
 expect(await page.evaluate(()=>Date.now())).toBe(before+500);
});

function checkHit(b){
 expect(b.rect.width,JSON.stringify(b)).toBeGreaterThanOrEqual(43.99);
 expect(b.rect.height,JSON.stringify(b)).toBeGreaterThanOrEqual(43.99);
 expect(b.centerInViewport,JSON.stringify(b)).toBe(true);
 expect(b.hit,JSON.stringify(b)).toBe(true);
}
test('07 opt-in #07 single native actor retains tap after measured seat allocation', {tag:'@causal-solo-fit'},async({page})=>{
 await setup(page,trail,402,true,true,config);await page.clock.runFor(1000);
 const snap=await snapshotGarden(page),b=snap.birds[0];
 assertGardenIdentities(snap.birds,1,['b1']);
 expect(snap.motion).toMatch(/^trail-(active|held|standing)$/);
 checkHit(b);
 await page.touchscreen.tap(b.point.x,b.point.y);
 await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();
});

test('08 opt-in #07 reaches all ten real native identities', {tag:'@causal-maximum-id'},async({page})=>{
 await setup(page,trail,375,true,'maximum',{...config,height:667});await page.clock.runFor(1000);
 const s=await snapshotGarden(page);
 assertGardenIdentities(s.birds,10);
});
test('09 opt-in #07 maximum measured unobstructed 44px hits', {tag:'@causal-maximum-fit'},async({page})=>{
 await setup(page,trail,375,true,'maximum',{...config,height:667});await page.clock.runFor(1000);
 const s=await snapshotGarden(page);
 assertGardenIdentities(s.birds,10);
 expect(s.motion).toMatch(/^trail-(active|held|standing)$/);
 for(const b of s.birds)checkHit(b);
});

test('10 opt-in #07 single bird performs a genuine rise, flap and contact', {tag:'@causal-flight'},async({page})=>{
 await setup(page,trail,402,true,true,config);await page.clock.runFor(1000);
 const phases=new Set(),bird=page.locator('[data-garden-household=b1]');
 for(let i=0;i<200;i++){
  await page.clock.runFor(100);
  const value=await bird.evaluate(b=>({state:b.dataset.actorState,phase:b.dataset.actorPhase,kind:b.querySelector('.garden-bird-sprite')?.dataset.color}));
  expect(value.kind).toBe('white');
  if(value.state==='fly')phases.add(value.phase);
  if(['rise','flap','contact'].every(p=>phases.has(p)))break;
 }
 expect([...phases]).toEqual(expect.arrayContaining(['rise','flap','contact']));
});
