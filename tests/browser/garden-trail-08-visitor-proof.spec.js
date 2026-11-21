import {test,expect} from '@playwright/test';
import {setup,snapshotGarden,assertGardenIdentities} from '../fixtures/garden-terrain-browser.js';
import {GARDEN_TRAIL_TERRAIN} from '../../src/data/garden-trail-terrain.js';
import {encounterSystem} from '../../src/encounters.js';
import {engine} from '../fixtures/garden-about-world.js';
const colors=['white','sakura','cinnamon','silver'];
const stage=page=>page.locator('.finch-garden-stage');
const pilot={trailPreview:true,height:874,afterOpenMs:0};
test.use({hasTouch:true});
test.setTimeout(150000);
function assertNative(s,count,ids=null){
 assertGardenIdentities(s.birds,count,ids);
 for(const b of s.birds){
  expect(b.rect.width,JSON.stringify(b)).toBeGreaterThanOrEqual(43.99);
  expect(b.rect.height,JSON.stringify(b)).toBeGreaterThanOrEqual(43.99);
  expect(b.centerInViewport,JSON.stringify(b)).toBe(true);
  expect(b.hit,JSON.stringify({bird:b,motion:s.motion})).toBe(true);
 }
}
async function stable(page,width=402,height=874){
 await page.setViewportSize({width,height});await page.clock.runFor(1000);
 await expect(stage(page)).toHaveAttribute('data-scene-state','ready');
 return snapshotGarden(page);
}
async function nextFly(page,who='b1',ticks=140){
 const bird=page.locator('[data-garden-household='+who+']');
 for(let i=0;i<ticks;i++){
  await page.clock.runFor(120);
  const flight=await bird.evaluate(b=>({phase:b.dataset.actorPhase, source:b.dataset.actorNode, target:b.dataset.actorLanding}));
  if(flight.phase==='rise'||flight.phase==='flap')return flight;
 }
 throw Error('no natural flight observed: '+await stage(page).getAttribute('data-actor-motion'));
}
async function mutationInIndependentStore(page,{kind,id}){
 // This is a second real IndexedDB store client in the controlled fixture,
 // using the shipping guarded encounter/raptor APIs, not direct mock DOM.
 return page.evaluate(async({kind,id})=>{
  const base=document.baseURI;
  const {openGameStore}=await import(new URL('src/game-store.js',base));
  const store=await openGameStore();
  let outcome;
  try{
   if(kind==='visitor'){
    const {encounterSystem}=await import(new URL('src/encounters.js',base));
    const entry=encounterSystem.catalog.find(e=>e.gardenEvent.gardenIds.includes(id));
    await store.transact(w=>{outcome=encounterSystem.observeGarden(w,entry.gardenEvent.scene,{worldId:w.worldId,revision:w.revision});return w;});
   }else{
    const {arriveGardenRaptor,raptorToken}=await import(new URL('src/garden-raptors.js',base));
    await store.transact(w=>{outcome=arriveGardenRaptor(w,'black-kite',Date.now(),{...raptorToken(w),gardenId:id});return w;});
   }
   const channel=new BroadcastChannel('buncho-garden-updates');
   channel.postMessage({revision:true});channel.close();
   return outcome;
  }finally{store.close();}
 },{kind,id});
}
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
test.use({trace:'off',screenshot:'off',video:'off'});
function fixed(name,body){return async({page},info)=>{
 let state='setup'; const mark=next=>{state=next;};
 try{await body(page,mark);mark('pass');}
 finally{if(!process.env.TYPE2_CHECKPOINT_DIR||!['chrome','webkit'].includes(info.project.name))throw Error('Draft named runs only');
 writeFileSync(join(process.env.TYPE2_CHECKPOINT_DIR,info.project.name+'-'+name),state+'\n',{mode:0o600,flag:'wx'});}
};}

async function wire(page){
 await page.route(/\/src\/garden-actor-motion\.js(?:\?.*)?$/,async mapped=>{
  const response=await mapped.fetch();let body=await response.text();
  const marks=[
   ['return trailRuntime.canPlace(d,n,placed);','const __p=trailRuntime.canPlace(d,n,placed); if(terrain.number===8&&peers.size===1&&roster.length===2){const __s=globalThis.__qaSeat??={};__s.clearance||=__p;} return __p;'],
   ['retained,preferred:nativePreferred,accept:nativeTrailHits,maxTries:3500','retained,preferred:nativePreferred,accept:plan=>{const __h=nativeTrailHits(plan);if(terrain.number===8&&peers.size===1&&roster.length===2){const __s=globalThis.__qaSeat??={};__s.probe=true;__s.hits||=__h;}return __h;},maxTries:3500'],
   ["if(!planned)return reject('trail-blocked-placement');","if(!planned){if(terrain.number===8&&peers.size===1&&roster.length===2){const __s=globalThis.__qaSeat??={};__s.unplanned=true;}return reject('trail-blocked-placement');}"],
   ["if(trailRuntime&&model.actors.size!==roster.length)return reject('trail-blocked-placement');","if(trailRuntime&&model.actors.size!==roster.length){if(terrain.number===8&&fixedFlight.size===1&&roster.length===2){const __s=globalThis.__qaSeat??={};__s.reconcile=true;}return reject('trail-blocked-placement');}"],
  ];
  for(const [old,next] of marks){expect(body.split(old)).toHaveLength(2);body=body.replace(old,next);}
  body+="\n;globalThis.__qaSeatHook=true;\n";
  await mapped.fulfill({response,body});
 });
}
test('#08 exact visitor while original route is reserved',fixed('08-arrival',async(page,mark)=>{
 const id='bird-red-avadavat';
 await wire(page);
 await setup(page,id,402,true,true,pilot);await stable(page);
 expect(await page.evaluate(()=>globalThis.__qaSeatHook)).toBe(true);
 mark('initial-flight');
 const pending=await nextFly(page);
 const kind=['A','B'].includes(pending.source)&&['A','B'].includes(pending.target)?'lane':'local';
 const identity=()=>page.evaluate(()=>{
  const s=document.querySelector('.finch-garden-stage'),b=s?.querySelector('[data-garden-household=b1]');
  return {world:s?.closest('.finch-garden')?.dataset.gardenWorld??null,garden:s?.dataset.gardenId??null,id:b?.dataset.gardenActorId??null,
   node:b?.dataset.actorNode??null,target:b?.dataset.actorLanding??null,state:b?.dataset.actorState??null};
 });
 const before=await identity();
 expect(before.id).toBe('b1');
 expect(before.target).toBe(pending.target);
 mark('store-result');
 const result=await mutationInIndependentStore(page,{kind:'visitor',id});
 expect(result).toMatchObject({changed:true,arrived:true});
 mark('visitor-ready');
 await expect(stage(page).locator('.finch-garden-visitor')).toHaveCount(1);
 await expect(stage(page)).toHaveAttribute('data-scene-state','ready');
 const rec=await page.evaluate(()=>globalThis.__qaSeat??{});
 let reason=rec.reconcile?'reconcile-denied':rec.unplanned?(rec.probe?'native-probe-denied':rec.clearance?'planner-denied':'measured-denied'):'no-placement-reject';
 mark(kind+'-'+reason);
 const mixed=await snapshotGarden(page);expect(mixed.ready).toBe('ready');assertNative(mixed,2);
 if(reason==='no-placement-reject')mark(kind+'-continuity');
 expect(await identity()).toEqual(before);
 mark('real-visitor-tap');
 const guest=mixed.birds.find(b=>b.id!=='b1');
 await page.touchscreen.tap(guest.point.x,guest.point.y);
 await expect(page.locator('[data-encounter-instance]')).toBeVisible();
 }));
