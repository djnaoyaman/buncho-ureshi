import {test,expect} from '@playwright/test';
import {setup,readyGardenSnapshot} from '../fixtures/garden-terrain-browser.js';
const pane='.finch-garden-stage .finch-garden-carousel', bird='[data-actor-state]';
const control='.finch-garden > header > button,.finch-garden-scroll,[data-jog-center],.finch-garden-dock > details > summary';
const read=page=>page.locator(pane).evaluate((p,selectors)=>{
 const {bird,control}=selectors,rect=n=>n.getBoundingClientRect();
 const pageView=rect(p),image=rect(p.querySelector('.finch-garden-image-plane')),stage=p.closest('.finch-garden-stage');
 const m=stage.closest('.finch-garden');
 const own=(el,r)=>el.contains(document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2));
 const controls=[...m.querySelectorAll(control)].filter(n=>n.getClientRects().length).map(el=>{
  const r=rect(el);
  return {height:r.height,width:r.width,own:own(el,r),disjoint:r.bottom<=pageView.top||r.top>=pageView.bottom||r.right<=pageView.left||r.left>=pageView.right};
 });
 return {mode:m.dataset.gardenSharedPlay,status:m.dataset.gardenSharedStatus, width:pageView.width,height:pageView.height,
  projection:[image.width,image.height,image.left-pageView.left,image.top-pageView.top],
  controls, birds:[...stage.querySelectorAll(bird)].map(el=>{const r=rect(el);return {id:el.dataset.gardenActorId||el.dataset.gardenVisitingFriend||el.dataset.encounterOpen,width:r.width,height:r.height,own:own(el,r),
   x:el.style.left,y:el.style.top,state:el.dataset.actorState,phase:el.dataset.actorPhase,landing:el.dataset.actorLanding};})};
},{bird,control});
for(const [density,count] of [['dense',8],['maximum',10]])test(`zebra shared pane retains the native ${count}-bird flight across rotation`,async({page},info)=>{
 await setup(page,'bird-zebra-finch',390,true,density,{nativeSource:true});
 await readyGardenSnapshot(page,info,'shared-pane-ready');
 const mark=page.locator(`${pane} ${bird}`);await mark.evaluateAll(nodes=>{window.__sharedNodes=nodes;});
 const before=await read(page);
 const enumStatus=new Set(['admitted','projection','chrome','seat','hit','route']);
 info.annotations.push({type:'qa-07-shared-room',description:`${count}:${enumStatus.has(before.status)?before.status:'unknown'}`});
 expect(before.mode).toBe('proof');expect(before.status).toBe('admitted');
 expect(before.width).toBeCloseTo(390,1);expect(before.height).toBeCloseTo(235,1);expect(before.birds).toHaveLength(count);
 expect(before.controls.length).toBeGreaterThanOrEqual(5);
 const native=s=>{
  for(const v of [...s.birds,...s.controls]){expect(v.width).toBeGreaterThanOrEqual(43.99);expect(v.height).toBeGreaterThanOrEqual(43.99);expect(v.own).toBe(true);}
  for(const c of s.controls)expect(c.disjoint).toBe(true);
 };
 native(before);
 let flying;
 for(let i=0;i<100&&!flying;i++){
  await page.clock.runFor(80);
  const birds=(await read(page)).birds;
  flying=birds.find(a=>a.state==='fly'&&a.phase==='rise'&&/^shared-gate-/.test(a.landing));
 }
 expect(flying,'one real shared flight reaches rise').toBeTruthy();
 await page.setViewportSize({width:844,height:390});
 const after=await read(page);expect(after.projection).toEqual(before.projection);
 const retained=after.birds.find(a=>a.id===flying.id);
 expect(retained?.state).toBe('fly');expect(retained?.phase).toBe(flying.phase);expect(retained?.landing).toBe(flying.landing);
 expect(await mark.evaluateAll(nodes=>nodes.length===window.__sharedNodes.length&&nodes.every((n,i)=>n===window.__sharedNodes[i]))).toBe(true);
 expect(after.birds.map(x=>x.id)).toEqual(before.birds.map(x=>x.id));native(after);
 let contact=false,fold=false;
 for(let i=0;i<55&&!fold;i++){
  await page.clock.runFor(40);
  const a=(await read(page)).birds.find(a=>a.id===flying.id);
  if(a?.landing!==flying.landing)continue;
  if(a.phase==='contact'&&a.own)contact=true;
  if(a.phase==='fold'&&a.own)fold=true;
 }
 expect(contact).toBe(true);expect(fold).toBe(true);
 await page.locator('.finch-garden-household').first().click();
 await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();
});
