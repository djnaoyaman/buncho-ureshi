import {test,expect} from '@playwright/test';
import {NOW,worldFor,load} from '../fixtures/garden-about-world.js';
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
  const kind=el.matches('[data-encounter-back]')?'book':el.matches('[data-garden-scroll]')?'scroll':el.matches('[data-jog-center]')?'jog':'dock';
  return {kind,height:r.height,width:r.width,own:own(el,r),disjoint:r.bottom<=pageView.top||r.top>=pageView.bottom||r.right<=pageView.left||r.left>=pageView.right};
 });
 const receipt=window.__sharedLaunchReceipt?.snapshot();
 return {receipt,mode:m.dataset.gardenSharedPlay,status:m.dataset.gardenSharedStatus, ready:stage.dataset.sceneState,motion:stage.dataset.actorMotion,
  count:Number(stage.dataset.gardenCount),nativeCount:p.querySelectorAll('.finch-garden-image-plane > button').length, width:pageView.width,height:pageView.height,
  projection:[image.width,image.height,image.left-pageView.left,image.top-pageView.top],
  controls, birds:[...stage.querySelectorAll(bird)].map(el=>{const r=rect(el);
   const wing=el.querySelector('.garden-actor-flight'),pose=el.querySelector('[data-terrain-flight-active]');
   const wingRect=wing?.getBoundingClientRect();
   const air=!!pose&&!!wingRect&&wingRect.width>0&&wingRect.height>0&&getComputedStyle(wing).visibility==='visible';
   return {kind:'bird',air,node:el.dataset.actorNode,id:el.dataset.gardenActorId||el.dataset.gardenVisitingFriend||el.dataset.encounterOpen,width:r.width,height:r.height,own:own(el,r),
   x:el.style.left,y:el.style.top,state:el.dataset.actorState,phase:el.dataset.actorPhase,landing:el.dataset.actorLanding};})};
},{bird,control});
async function seedMissedAmbientDraw(page){
 const {createGardenPredatorClock,PREDATOR_ENTRY_RULES}=await load('garden-predator-clock.js');
 const wallNow=NOW+1000,rule=PREDATOR_ENTRY_RULES;
 let journal;
 // The fixture's own past draw misses. The app's original lottery, clock,
 // RNG and guarded arrival APIs still run, including the normal retry.
 const clock=createGardenPredatorClock({random:()=>1,persist:value=>{journal=value;return true;}});
 const steps=Math.ceil(rule.dwellMs/rule.maxSampleGapMs);
 for(let i=0;i<=steps;i++){
  const now=rule.dwellMs*i/steps;
  expect(clock.sample({key:'missed-draw-fixture',eligible:true,now,wallNow:wallNow-rule.dwellMs+now})).toBeNull();
 }
 expect(journal).toEqual({version:1,lastDraw:wallNow,pending:null});
 const {worldId}=worldFor('attending','bird-zebra-finch');
 await page.addInitScript(({worldId,journal})=>{
  const key='buncho-predator-attempt-v1:'+worldId;
  if(!sessionStorage.getItem(key))sessionStorage.setItem(key,JSON.stringify(journal));
 },{worldId,journal});
 return w=>expect(w.worldId).toBe(worldId);
}
if(['shared-ab-original','shared-ab-missed'].includes(process.env.BOOKLET_OPEN_STYLE))
for(const [density,count] of [['dense',8],['maximum',10]])test(`zebra shared pane retains the native ${count}-bird flight across rotation`,async({page},info)=>{
 const profile=process.env.BOOKLET_OPEN_STYLE;
 expect(['shared-ab-original','shared-ab-missed']).toContain(profile);
 const prepareWorld=profile==='shared-ab-missed'?await seedMissedAmbientDraw(page):undefined;
 await setup(page,'bird-zebra-finch',390,true,density,{nativeSource:true,afterOpenMs:0,prepareWorld});
 await readyGardenSnapshot(page,info,'shared-pane-ready');
 const enumStatus=new Set(['admitted','projection','chrome','seat','hit','route','measuring','roster']);
 const stage=x=>enumStatus.has(x.status)?x.status:'unknown';
 const room=x=>x.nativeCount===count?'expected':x.nativeCount<count?'short':'extra';
 const actor=x=>!x.motion?'no-motion':x.motion.startsWith('trail-')?'trail':'other-motion';
 const first=await read(page);
 // This boundary is fixed before looking at clips/hits, and does not wait
 // for admission. Scope to the first real actionable geometry opportunity.
 await page.clock.runFor(34);
 const before=await read(page);
 const mark=page.locator(`${pane} ${bird}`);await mark.evaluateAll(nodes=>{
  window.__sharedNodes=nodes;
  const owner=()=>document.querySelector('.finch-garden[data-garden-shared-play]');
  const lead=n=>n?.querySelector('[data-garden-actor-lead="true"]');
  const predator='[data-crow-phase],.finch-crow-scale-scene,.finch-raptor-scale-scene,.game-raptor-return-dialog[open]';
  let predatorSeen=false,loadingSeen=false,systemSeen=false,usableRebind=false;
  const inspectConditions=(room,records)=>{
   const scenery=room?.querySelector('.finch-garden-stage');
   const foreignBlock=document.body.hasAttribute('data-game-view-blocked');
   systemSeen||=foreignBlock||records.some(r=>r.attributeName==='data-game-view-blocked'&&r.oldValue!==null);
   loadingSeen||=!!scenery&&scenery.dataset.sceneState!=='ready'||records.some(r=>r.attributeName==='data-scene-state'&&r.oldValue==='loading');
   const event=!!room?.querySelector(predator)||!!document.querySelector('.game-raptor-return-dialog[open]');
   predatorSeen||=event||records.some(r=>r.attributeName==='data-crow-phase'||
    r.type==='childList'&&[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&(n.matches(predator)||n.querySelector(predator))));
   if(room!==initial&&scenery?.dataset.sceneState==='ready'&&!foreignBlock&&!event&&room.dataset.gardenSharedStatus==='admitted'){
    usableRebind||=[...room.querySelectorAll('[data-actor-landing]')].some(routeSame);
   }
  };
  const initial=owner(),initialLead=lead(initial);
  let redraw=false,route=false,rise=false,air=false,other=false;
  const gate=value=>/^shared-gate-[01]$/.test(value??'');
  const routeSame=n=>gate(n.dataset.actorLanding);
  const painted=n=>n.querySelector('[data-terrain-flight-active]')&&n.querySelector('.garden-actor-flight')?.style.visibility==='visible';
  const flight=n=>{
   if(!n?.matches?.('[data-actor-state]'))return;
   if(!routeSame(n)){if(n.dataset.actorState==='fly')other=true;return;}
   route=true;rise||=n.dataset.actorPhase==='rise';air||=!!painted(n);
  };
  const consume=records=>{
   const current=owner(),currentLead=lead(current);
   if(current!==initial||currentLead!==initialLead)redraw=true;
   inspectConditions(current,records);
   for(const r of records){
    if(r.type==='childList'){
     for(const n of r.removedNodes)if(n===initial||n===initialLead||n.contains?.(initial))redraw=true;
     continue;
    }
    const n=r.target.matches('[data-actor-state]')?r.target:r.target.closest('[data-actor-state]');
    flight(n);
    if(!n)continue;
    if(r.attributeName==='data-actor-landing'&&gate(r.oldValue))route=true;
    if(r.attributeName==='data-actor-phase'&&r.oldValue==='rise'&&routeSame(n))rise=true;
    if(r.attributeName==='data-terrain-flight-active'&&r.oldValue!==null&&routeSame(n))air=true;
   }
  };
  nodes.forEach(flight);
  const obs=new MutationObserver(consume);
  obs.observe(initial?.closest('.game-encounter-host')??initial?.parentElement??document.body,{
   subtree:true,childList:true,attributes:true,attributeOldValue:true,
   attributeFilter:['data-actor-state','data-actor-phase','data-actor-landing','data-terrain-flight-active','data-scene-state','data-crow-phase','open']
  });
  obs.observe(document.body,{attributes:true,attributeOldValue:true,attributeFilter:['data-game-view-blocked']});
  window.__sharedLaunchReceipt={snapshot(){
   consume(obs.takeRecords());
   const n=lead(owner()),image=n?.querySelector('.garden-bird-sprite img');
   const loaded=image?.complete&&image.naturalWidth>0;
   return {redraw,route,rise,air,other,predatorSeen,loadingSeen,systemSeen,usableRebind,
    media:!n?'lead-missing':!image?'atlas-missing':!loaded?'atlas-not-loaded':n.querySelector('.garden-actor-flight')?'atlas-and-wing-shell':'atlas-only'};
  },stop(){obs.disconnect();}};
 });
 const firstFault=x=>{
  const hit=[...x.birds,...x.controls].find(v=>v.width<43.99||v.height<43.99||!v.own);
  return !hit?'clean':hit.kind+'-'+(hit.width<43.99?'width':hit.height<43.99?'height':'hit');
 };
 info.annotations.push({type:'qa-07-shared-room',description:`${count}:${stage(before)}`});
 info.annotations.push({type:'qa-07-shared-ready',description:`${count}:${stage(first)}:${stage(before)}:${room(before)}:${actor(before)}:${firstFault(before)}`});
 // The lifecycle may cross before reaching any actor step, but a first
 // fully admitted native frame remains a hard oracle even if later fits.
 if(first.status==='admitted'){
  expect(first.birds).toHaveLength(count);
  expect(firstFault(first)).toBe('clean');
 }
 expect(before.count).toBe(count);expect(before.nativeCount).toBe(count);
 expect(before.mode).toBe('proof');expect(before.status).toBe('admitted');
 expect(before.width).toBeCloseTo(390,1);expect(before.height).toBeCloseTo(235,1);expect(before.birds).toHaveLength(count);
 expect(before.controls.length).toBeGreaterThanOrEqual(5);
 const native=s=>{
  for(const v of [...s.birds,...s.controls]){expect(v.width).toBeGreaterThanOrEqual(43.99);expect(v.height).toBeGreaterThanOrEqual(43.99);expect(v.own).toBe(true);}
  for(const c of s.controls)expect(c.disjoint).toBe(true);
 };
 native(before);
 let flying,launchReceipt;
 for(let i=0;i<100&&!flying;i++){
  await page.clock.runFor(80);
  const {birds,receipt}=await read(page);
  launchReceipt=receipt;
  flying=birds.find(a=>a.state==='fly'&&a.phase==='rise'&&/^shared-gate-/.test(a.landing));
 }
 const seen=flying?(flying.air?'sampled-rise-painted':'sampled-rise-unpainted'):
  launchReceipt?.rise?'between-samples-rise':launchReceipt?.route?'shared-route-only':launchReceipt?.other?'other-flight':'no-observed-flight';
 info.annotations.push({type:'qa-07-shared-launch',description:`${count}:${seen}:${launchReceipt?.air?'air-seen':'air-unseen'}:${launchReceipt?.redraw?'replaced':'same'}:${launchReceipt?.media??'lead-missing'}`});
 const bit=(value,yes,no)=>value?yes:no;
 info.annotations.push({type:'qa-07-shared-warning',description:[
  count,bit(launchReceipt?.predatorSeen,'predator','no-predator'),bit(launchReceipt?.loadingSeen,'loading','no-loading'),
  bit(launchReceipt?.systemSeen,'system','no-system'),bit(launchReceipt?.usableRebind,'resumed-route','no-ready-rebind'),
 ].join(':')});
 expect(flying,'one real shared flight reaches rise').toBeTruthy();
 const source=before.birds.find(a=>a.node==='shared-gate-0');
 expect(source?.id).toBe(flying.id);
 expect(flying.air).toBe(true);
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
