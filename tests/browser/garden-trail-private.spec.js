import {appendFileSync} from 'node:fs';
import {test,expect} from '@playwright/test';
import {setup,snapshotGarden} from '../fixtures/garden-terrain-browser.js';

const id='bird-zebra-finch',pilot={trailPreview:true};
function report(info,records){
 const {GITHUB_STEP_SUMMARY:out,GITHUB_EVENT_NAME:event,GITHUB_REF:ref,GITHUB_SHA:sha}=process.env;
 if(!out||event!=='pull_request'||!/^refs\/pull\/\d+\/merge$/.test(ref||''))return;
 const details=JSON.stringify({sha,project:info.project.name,case:info.title,records}).replaceAll('`','\\u0060');
 if(Buffer.byteLength(details,'utf8')<64000)
   appendFileSync(out,'\n### '+info.title+' ['+info.project.name+']\n\n```json\n'+details+'\n```\n');
}
test.use({hasTouch:true});
for(const [density,count] of [['empty',0],['maximum',10]])
test(`private #07 preserves all ${count} native IDs and touch targets`,async({page},info)=>{
 await setup(page,id,375,true,density,pilot);await page.setViewportSize({width:375,height:667});
 const stage=page.locator('.finch-garden-stage');await expect(stage).toHaveAttribute('data-garden-trail-preview','true');
 await page.clock.runFor(1500);
 const before=await snapshotGarden(page);
 report(info,{portrait:375,motion:before.motion,native:before.birds.map(({id,hit,actorState})=>({id,hit,actorState}))});
 expect(before.birds).toHaveLength(count);
 expect(new Set(before.birds.map(b=>b.id)).size).toBe(count);
 expect(before.motion).toMatch(/^trail-(active|held|standing)$/); // explicit fallback does not count
 for(const b of before.birds)expect(b.hit,JSON.stringify(b)).toBe(true);
 if(count){
  const lead=before.birds.find(b=>b.id==='b1');
  await page.touchscreen.tap(lead.point.x,lead.point.y);
  await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'文鳥の操作をとじる',exact:true}).tap();
 }else{
  await page.locator('[data-garden-details=about] > summary').tap();
  await expect(page.locator('[data-garden-track-credit]')).toHaveCount(1);
 }
 await page.setViewportSize({width:402,height:874});await page.clock.runFor(2000);
 const after=await snapshotGarden(page);
 expect(after.birds.map(b=>b.id)).toEqual(before.birds.map(b=>b.id));
 for(const b of after.birds)expect(b.hit,JSON.stringify(b)).toBe(true);
 if(count){
  expect(after.motion).toBe('trail-active');
  let movement=false;
  for(let i=0;i<105;i++){
   await page.clock.runFor(180);
   const sampled=await snapshotGarden(page);
   expect(sampled.birds.map(b=>b.id)).toEqual(before.birds.map(b=>b.id));
   for(const b of sampled.birds)expect(b.hit,JSON.stringify({motion:sampled.motion,bird:b})).toBe(true);
   movement||=sampled.birds.some(b=>b.actorState==='hop'||b.actorState==='fly');
   if(movement)break;
  }
  expect(movement,'a 10-bird scene must support safe real movement; a static fallback is not acceptance').toBe(true);
 }
});

for(const color of ['white','sakura','cinnamon','silver'])test(`private #07 preserves native ${color} flap and contact`,async({page},info)=>{
 await setup(page,id,402,true,true,{...pilot,leadColor:color});await page.setViewportSize({width:402,height:874});
 const phases=new Set();
 for(let i=0;i<220;i++){
  await page.clock.runFor(100);
  const snapshot=await page.locator('[data-garden-household=b1]').evaluate(n=>({
   state:n.dataset.actorState,phase:n.dataset.actorPhase,color:n.querySelector('.garden-bird-sprite')?.dataset.color,
   frame:n.querySelector('[data-white-flight-frame]')?.getAttribute('data-frame'),
   visibility:n.querySelector('.garden-actor-flight')?.style.visibility
  }));
  expect(snapshot.color).toBe(color);
  if(snapshot.state==='fly'){
   phases.add(snapshot.phase);
   if(color==='white'&&snapshot.phase==='flap')expect(snapshot.frame).toMatch(/^wing[0-6]$/);
  }
  if(['rise','flap','contact'].every(phase=>phases.has(phase)))break;
 }
 report(info,{color,phases:[...phases],motion:await page.locator('.finch-garden-stage').getAttribute('data-actor-motion')});
 expect([...phases]).toEqual(expect.arrayContaining(['rise','flap','contact']));
});

// Match the published Type① actor and actual native touchscreen call while
// the injected #07 preview option is present for the same game mount.
test('Type① #01 still uses published actor path and real tap',async({page})=>{
 await setup(page,'java-rice',375,true,true,pilot);
 await page.setViewportSize({width:375,height:667});await page.clock.runFor(1000);
 const stage=page.locator('.finch-garden-stage');await expect(stage).not.toHaveAttribute('data-garden-trail-preview','true');
 await expect(stage).toHaveAttribute('data-actor-motion','active');
 const s=await snapshotGarden(page),lead=s.birds.find(b=>b.id==='b1');
 expect(lead.hit).toBe(true);
 await page.touchscreen.tap(lead.point.x,lead.point.y);
 await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();
});

test('private #07 reduced motion keeps the landing and retains the native identity',async({page},info)=>{
 await setup(page,id,402,true,true,{...pilot,leadColor:'white'});
 await page.setViewportSize({width:402,height:874});
 const b=page.locator('[data-garden-household=b1]');
 let source=null;
 for(let n=0;n<170;n++){
  await page.clock.runFor(100);
  const state=await b.getAttribute('data-actor-phase');
  if(state==='rise'||state==='flap'){source=await b.getAttribute('data-actor-node');break;}
 }
 expect(['A','B']).toContain(source);
 const target=source==='A'?'B':'A';
 await page.emulateMedia({reducedMotion:'reduce'});await page.clock.runFor(1000);
 const snapshot=await snapshotGarden(page);
 report(info,{source,target,motion:snapshot.motion,actors:snapshot.birds.map(({id,actorNode,actorState,hit})=>({id,actorNode,actorState,hit}))});
 await expect(b).toHaveAttribute('data-actor-node',target);
 await expect(b).not.toHaveAttribute('data-actor-state','fly');
 expect(snapshot.birds.find(a=>a.id==='b1')?.hit).toBe(true);
});
