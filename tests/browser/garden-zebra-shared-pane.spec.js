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
async function wireSharedFlightReceipt(page){
 function edit(body,edits){
  for(const [from,to]of edits){expect(body.split(from)).toHaveLength(2);body=body.replace(from,to);}
  return body;
 }
 const observe=(name,edits)=>page.route(new RegExp('/src/'+name+'\\.js(?:\\?.*)?$'),async r=>{
  const res=await r.fetch();await r.fulfill({response:res,body:edit(await res.text(),edits)});
 });
 const host="    const elapsed = geometryOnly ? clock.elapsed : clock.advance(active);";
 await observe('garden-bird-motion',[[host,host+String.raw`
    if(currentStage?.dataset.gardenId==='bird-zebra-finch'){
     const q=globalThis.__qa07Shared??={};
     q.host=active?'active':!allowed()?'hidden-or-reduced':!enabled()?'disabled':warning?'blocked':interacting()?'interacting':sheetOpen()?'sheet':'detached';
     q.elapsed=Math.round(elapsed);
    }
`]]);
 const step="     if(authoredShared){";
 const launch="       const started=!lane&&trailRuntime.sharedPaneFlight(sharedGates,{paintable:routeFits});";
 await observe('garden-actor-motion',[
  [step,String.raw`     if(sharedRoom){
      const q=globalThis.__qa07Shared??={};
      const lead=[...model.actors.values()].find(a=>sharedGates.some(g=>g.id===a.node));
      const b=lead&&bindings.get(lead.id),img=b?.sprite?.querySelector('img');
      q.room=authoredShared?'authored':!lead?'no-gate':'other';
      q.asset=!b?.flight?'no-renderer':lead.canFly?'ready':img?.complete&&img.naturalWidth>0?'atlas-ready':img?.complete?'atlas-bad':'atlas-pending';
      q.actor=lead?.route?'routed':lead?.canFly?'ready':lead?'not-ready':'missing';
      q.lane=lane?'held':elapsed<nextTrail?'wait':'free';
     }
`+step],
  [launch,String.raw`       const started=(()=>{
        if(lane)return false;
        globalThis.__qa07LiveDispatch=true;
        try{return trailRuntime.sharedPaneFlight(sharedGates,{paintable:routeFits});}
        finally{globalThis.__qa07LiveDispatch=false;}
       })();`]
 ]);
 const method="  sharedPaneFlight(gates,{paintable}){";
 const safe="     return !!sweep&&proven.safe(candidate,node,kind,peers)&&paintable(candidate)&&adapter.canPlace({spans:sweep});";
 const admit="    if(model.beginFlightPath(a.id,to,[from.p,to.p],env))return {id:a.id,target:to.id,action:'fly'};";
 await observe('garden-trail-runtime',[
  [method,method+String.raw`
   const say=(rank,why)=>{
    if(!globalThis.__qa07LiveDispatch)return;
    const q=globalThis.__qa07Shared??={};
    if(q.rank==null||rank>q.rank){q.rank=rank;q.stop=why;}
   };
   say(0,'precondition');
`],
  ["   const [west,east]=gates;","   say(1,'no-source');\n   const [west,east]=gates;"],
  ["    const env=makeEnvironment((candidate,node,kind,peers)=>{\n     const sweep=proven.sweptRoute(candidate);","    say(2,'begin-denied');\n    const env=makeEnvironment((candidate,node,kind,peers)=>{\n     const sweep=proven.sweptRoute(candidate);"],
  [safe,String.raw`     if(!sweep){say(3,'sweep-denied');return false;}
     if(!proven.safe(candidate,node,kind,peers)){say(4,'clearance-denied');return false;}
     if(!paintable(candidate)){say(5,'paint-denied');return false;}
     if(!adapter.canPlace({spans:sweep})){say(6,'adapter-denied');return false;}
     return true;`],
  [admit,"    if(model.beginFlightPath(a.id,to,[from.p,to.p],env)){say(7,'launched');return {id:a.id,target:to.id,action:'fly'};}"]
 ]);
}
for(const [density,count] of [['dense',8],['maximum',10]])test(`zebra shared pane retains the native ${count}-bird flight across rotation`,async({page},info)=>{
 await wireSharedFlightReceipt(page);
 await setup(page,'bird-zebra-finch',390,true,density,{nativeSource:true,afterOpenMs:0});
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
   attributeFilter:['data-actor-state','data-actor-phase','data-actor-landing','data-terrain-flight-active']
  });
  window.__sharedLaunchReceipt={snapshot(){
   consume(obs.takeRecords());
   const n=lead(owner()),image=n?.querySelector('.garden-bird-sprite img');
   const loaded=image?.complete&&image.naturalWidth>0;
   return {redraw,route,rise,air,other,
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
 const issue=await page.evaluate(()=>{
  const q=globalThis.__qa07Shared??{};
  return [q.host??'none',q.elapsed>=3000?'elapsed':q.elapsed>0?'short':'stalled',q.room??'none',q.asset??'none',q.actor??'none',q.lane??'none',q.stop??'none'].join(':');
 });
 info.annotations.push({type:'qa-07-shared-flight',description:`${count}:${issue}`});
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
