import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {test,expect} from '@playwright/test';
import {setup} from '../fixtures/garden-terrain-browser.js';
import {engine} from '../fixtures/garden-about-world.js';

test.use({hasTouch:true,trace:'off',screenshot:'off',video:'off'});
const games=[['07','bird-zebra-finch'],['10','bird-tricolored-munia'],['12','bird-black-rumped-waxbill'],['14','bird-long-tailed-paradise-whydah'],['28','bird-long-tailed-rosefinch']];
const lane=[
 ['let epoch=null,ticket=0,lock=null,paused=false,roster=new Map();',
  'let epoch=null,ticket=0,lock=null,paused=false,roster=new Map();\n  const receipt=globalThis.__bayFastReceipt??={};'],
 ["if(at('lane').length||!fits(lock.id,lock.from,lock.to,'cross',roster)){drop();return;}\n        lock={...lock,phase:'ready',exit:lock.to};",
  "receipt.owner=lock.id;receipt.partner=lock.partner;receipt.from=lock.from;receipt.to=lock.to;receipt.bayGround=true;receipt.held??={owner:lock.id,partner:lock.partner,from:lock.from,to:lock.to,ticket:lock.ticket};\n        if(at('lane').length){receipt.laneOccupied=true;drop();return;}\n        if(!fits(lock.id,lock.from,lock.to,'cross',roster)){receipt.measuredDenied=true;drop();return;}\n        receipt.ready=true;lock={...lock,phase:'ready',exit:lock.to};"],
 ["if(lock.phase==='ready'){\n        lock={...lock,phase:'cross'};queue.delete(lock.id);",
  "if(lock.phase==='ready'){\n        receipt.dispatched=receipt.owner===lock.id&&receipt.to===lock.to;if(receipt.held?.ticket===lock.ticket)receipt.held.dispatch=true;\n        lock={...lock,phase:'cross'};queue.delete(lock.id);"],
];
const adapter=[
 [`return !!actor&&!actor.leaving&&!!action&&(action!=='fly'||actor.canFly)&&
     validate({id,action,kind,path:copyPath(path),from,to,actors:raw,`,
 `const held=globalThis.__bayFastReceipt?.held;
   const inspect=globalThis.__bayFastReceipt;
   if(kind==='cross'&&!phase&&exitOccupant.length===1&&inspect)inspect.prospectiveCrossTried=true;
   if(kind==='yield'&&!phase&&inspect)inspect.yieldFitTried=true;
   if(kind==='cross'&&phase==='yield'&&held?.owner===id&&held.from===from&&held.to===to){
    held.kind??=action==='fly'?'fly':action==='walk'?'walk':'absent';
    if(!actor||actor.leaving||!action)held.fail??='held-ineligible';
    else if(action==='fly'&&!actor.canFly)held.fail??='held-cannot-fly';
   }
   return !!actor&&!actor.leaving&&!!action&&(action!=='fly'||actor.canFly)&&
     validate({id,action,kind,path:copyPath(path),from,to,actors:raw,`],
 [`pending=null;
   if(accepted)return true;`,`const admitted=pending.command;
   pending=null;
   if(accepted){
    const r=globalThis.__bayFastReceipt,h=r?.held;
    if(r&&phase==='yield'&&admitted.kind==='yield')r.yieldCommitted=true;
    if(r&&phase==='cross'&&r.dispatched&&r.owner===actor&&r.to===target)r.ownerConnected=true;
    if(h&&h.ticket===ticket&&phase==='cross'&&h.owner===actor&&h.to===target&&!h.commit){
     h.commit=admitted.action==='fly'&&nativeActor?.state==='fly'&&nativeActor.route?.flightPath?'fly':
       admitted.action==='walk'&&nativeActor?.state==='hop'?'hop':'mismatch';
     globalThis.__bayFastNativeRoute=nativeActor?.route;
    }
    return true;
   }`],
];
const runtime=[
 [`const tentative=model.previewPath(id,node,path,mode,makeEnvironment(()=>false));
   if(!tentative)return false;`,`const tentative=model.previewPath(id,node,path,mode,makeEnvironment(()=>false));
   const h=globalThis.__bayFastReceipt?.held;
   if(!tentative){if(phase==='cross'&&h?.owner===id&&h.to===to&&!h.dispatch)
    h.fail??=mode==='fly'&&model.time<a.cooldown?'held-preview-cooldown':'held-preview-constructor';
    return false;
   }`],
];
const painting=[
 [`if(!fitsNow()){
   if(trailRuntime||!stand())return reject('geometry-blocked');
  }
  for(const [id,a]of model.actors){`,`const bh=globalThis.__bayFastReceipt?.held;
  if(bh)bh.paintBound=false;
  if(!fitsNow()){
   if(trailRuntime||!stand()){
    if(bh?.commit==='fly'&&model.actors.get(bh.owner)?.route===globalThis.__bayFastNativeRoute)
     bh.paintRejected=true;
    return reject('geometry-blocked');
   }
  }
  for(const [id,a]of model.actors){
   if(bh?.commit==='fly'&&id===bh.owner&&a.route===globalThis.__bayFastNativeRoute)bh.paintBound=true;`],
];
const clearance=[
 [`if(!canStand(candidate,node.p))return false;
  const s=sweptRoute(candidate);
  if(!s||s.some(b=>!within(b,clip)||controls.some(c=>overlaps(b,c))))return false;`,
 `const h=globalThis.__bayFastReceipt?.held;
  const fail=reason=>{if(h?.owner===candidate.id&&h.to===node.id&&!h.dispatch)h.fail??=reason;return false;};
  if(!canStand(candidate,node.p))return fail('held-destination');
  const s=sweptRoute(candidate);
  if(!s)return fail('held-sweep-unavailable');
  if(s.some(b=>!within(b,clip)))return fail('held-sweep-clip');
  if(s.some(b=>controls.some(c=>overlaps(b,c))))return fail('held-sweep-controls');`],
 [`if(!other||conflictSweeps(s,other))return false;`,
  `if(!other||conflictSweeps(s,other))return fail(other?'held-sweep-peer':'held-peer-unmeasured');`],
];
async function probe(page,name,hooks){
 await page.route(new RegExp('/src/'+name.replace('.','\\.')+'(?:\\?.*)?$'),async route=>{
  const response=await route.fetch();let body=await response.text();
  for(const [a,b] of hooks){
   expect(body.split(a).length,'unique reviewed telemetry anchor').toBe(2);
   body=body.replace(a,b);
  }
  await route.fulfill({response,body});
 });
}
for(const [number,garden] of games)test(`#${number} measured bay handover and same native owner landing`,{tag:`@bay-fast-${number}`},async({page},info)=>{
 let code='setup';
 try{
 await probe(page,'garden-trail-lane.js',lane);
 await probe(page,'garden-trail-adapter.js',adapter);
 await probe(page,'garden-trail-runtime.js',runtime);
 await probe(page,'garden-trail-clearance.js',clearance);
 await probe(page,'garden-actor-motion.js',painting);
 await setup(page,garden,402,true,true,{trailPreview:true,height:874,afterOpenMs:0,prepareWorld:w=>{
  const bird=engine.createBird(w,{home:'resident',stage:'adult',color:'cinnamon'});
  w.encounters.gardenFriends.attendees.push(bird.id);
 }});
 let ids=null,landed=false,changed=false,start=null,receipt={},parked=false,firstGates=false,anyNative=true;
 let firstOwner=null,firstPartner=null,firstTo=null;
 let end=72,held=null,domFly=false,domFlyPartnerParked=false,yieldCommitted=false,yieldFitTried=false,prospectiveCrossTried=false;
 const sampleYieldMissing=()=>yieldFitTried&&!yieldCommitted?'bay-yield-fit-no-commit':prospectiveCrossTried&&!yieldFitTried?'bay-prospective-cross-denied':yieldCommitted?'bay-yield-committed-no-ground':'bay-yield-not-committed';
 for(let n=0;n<=end;n++){
  await page.clock.runFor(n===0?1000:180);
  const sample=await page.evaluate(()=>{
   const stage=document.querySelector('.finch-garden-stage');
   const birds=[...(stage?.querySelectorAll('.finch-garden-image-plane > button')||[])].map(b=>{
    const d=b.dataset,r=b.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
    const hit=document.elementFromPoint(x,y);
    return {id:d.gardenActorId,site:d.actorNode,phase:d.actorPhase,state:d.actorState,target:d.actorLanding,
     x,y,hit:!!hit&&b.contains(hit)&&r.width>=43.99&&r.height>=43.99&&x>=0&&x<innerWidth&&y>=0&&y<innerHeight};
   });
   return {ready:stage?.dataset.sceneState==='ready',birds,receipt:globalThis.__bayFastReceipt??{}};
  });
  const {birds}=sample;
  if(!ids){ids=birds.map(b=>b.id);firstGates=birds.map(b=>b.site).sort().join(',')==='A,B';}
  anyNative &&= sample.ready&&birds.length===2&&new Set(ids).size===2&&ids.every((id,i)=>!!id&&id===birds[i]?.id&&birds[i]?.hit);
  for(const k of ['bayGround','laneOccupied','measuredDenied','ready','dispatched','ownerConnected'])receipt[k] ||= sample.receipt[k]===true;
  if(!firstOwner&&sample.receipt.owner){firstOwner=sample.receipt.owner;firstPartner=sample.receipt.partner;firstTo=sample.receipt.to;}
  held=sample.receipt.held??held;yieldCommitted||=sample.receipt.yieldCommitted===true;yieldFitTried||=sample.receipt.yieldFitTried===true;prospectiveCrossTried||=sample.receipt.prospectiveCrossTried===true;
  const owner=birds.find(b=>b.id===firstOwner),partner=birds.find(b=>b.id===firstPartner);
  parked ||= !!partner&&partner.site==='bay'&&partner.phase==='ground'&&!partner.target;
  const sameFly=held?.commit==='fly'&&held.paintBound&&owner?.state==='fly'&&owner.target===held.to;
  if(sameFly){domFly=true;domFlyPartnerParked||=partner?.site==='bay'&&partner.phase==='ground'&&!partner.target;}
  if(parked&&sameFly&&owner?.state==='fly'&&owner.target===firstTo&&partner?.site==='bay'&&!partner.target){
   if(!start){start={x:owner.x,y:owner.y};end=Math.max(end,n+25);}
   else changed ||= Math.hypot(owner.x-start.x,owner.y-start.y)>2;
  }
  if(start&&changed&&owner?.site===firstTo&&owner.phase==='ground'&&!owner.target&&partner?.site==='bay'&&!partner.target){landed=true;break;}
 }
 // Only fixed labels, never raw positions, actor IDs, traces or artifacts.
 code='native-gates';
 expect(firstGates&&anyNative,'01 actual A/B and continuous native hit ownership').toBe(true);
 code=parked?'bay-receipt-missing':receipt.bayGround?'bay-dom-not-grounded':sampleYieldMissing();
 expect(receipt.bayGround&&parked,'02 same partner reached the actual bay').toBe(true);
 code=receipt.laneOccupied?'lane-occupied':receipt.measuredDenied?(held?.fail??'held-unclassified'):'held-ready';
 expect(receipt.ready,receipt.laneOccupied?'03 held bay blocked by occupied lane':receipt.measuredDenied?'03 held bay denied by unchanged measured check':'03 ready was not reached').toBe(true);
 code='dispatch';
 expect(receipt.dispatched,'04 same held owner dispatched').toBe(true);
 code='commit';
 expect(receipt.ownerConnected,'05 native owner route passed the original commit connection').toBe(true);
 code=held?.commit==='hop'?'commit-native-hop':held?.commit!=='fly'?'commit-action-unverified':
  !domFly?(held?.paintRejected?'commit-fly-render-rejected':'commit-fly-unpainted'):!domFlyPartnerParked?'fly-dom-partner-lost':'fly-dom-motionless';
 expect(!!start&&changed,'06 same owner actually flew after bay ground').toBe(true);
 code='same-landing';
 expect(landed,'07 same native owner landed at the freed gate').toBe(true);
 code='pass';
 }finally{
  const out=process.env.TYPE2_CHECKPOINT_DIR;
  if(!out||!['chrome','webkit'].includes(info.project.name))throw Error('Draft targeted run only');
  writeFileSync(join(out,`${info.project.name}-${number}-bay`),code+'\n',{mode:0o600,flag:'wx'});
 }
});
