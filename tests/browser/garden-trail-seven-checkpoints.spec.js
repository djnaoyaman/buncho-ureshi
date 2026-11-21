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
 let state='setup',hitProbe=null; const mark=(next,detail=null)=>{state=next;if(detail)hitProbe=detail;};
 try{await body(page,mark);mark('pass');}
 finally{if(!process.env.TYPE2_CHECKPOINT_DIR||!['chrome','webkit'].includes(info.project.name))throw Error('Draft named runs only');
 const path=join(process.env.TYPE2_CHECKPOINT_DIR,info.project.name+'-'+name);
 if(hitProbe)writeFileSync(path+'.hit.json',JSON.stringify(hitProbe),{mode:0o600,flag:'wx'});
 writeFileSync(path,state+'\n',{mode:0o600,flag:'wx'});}
};}
async function observeLandscapeOccluder(page,{ordinal,x,y,previousMode}){
 // The strict assertion below still uses the original one-shot snapshot.
 // A second read only labels the failed occluder; if it changed, say stale.
 return page.evaluate(({ordinal,x,y,previousMode})=>{
  const stage=document.querySelector('.finch-garden-stage'),plane=stage?.querySelector('.finch-garden-image-plane');
  const button=plane?.querySelectorAll(':scope > button')[ordinal],r=button?.getBoundingClientRect();
  const motion=stage?.dataset.actorMotion||stage?.dataset.terrainMotion;
  const modes=['trail-active','trail-held','trail-standing','trail-blocked-placement','trail-blocked-geometry','trail-needs-recovery','geometry-blocked','insufficient-space'];
  const mode=modes.includes(motion)?motion:'other';
  const rendered=button?.hasAttribute('data-actor-node')?'bound':'unbound';
  // The ordinary outdoors scene itself is an open NONmodal dialog.
  // Only a real browser modal, inert target, or owned device notice blocks.
  const device=document.body.dataset.gameViewBlocked;
  const persistent=device==='orientation'?'orientation':device==='device'?'device':'none';
  const modal=document.querySelector('dialog:modal');
  const report=kind=>({kind,mode,rendered,blocked:persistent!=='none'||!!modal||!!button?.closest('[inert]'),persistent});
  if(!r||motion!==previousMode||Math.abs(r.x+r.width/2-x)>.5||Math.abs(r.y+r.height/2-y)>.5)return report('stale');
  const top=document.elementFromPoint(x,y);
  if(top&&button.contains(top))return report('stale');
  const style=getComputedStyle(button);
  if(style.visibility!=='visible'||style.display==='none'||style.pointerEvents==='none')return report('noninteractive');
  if(!top)return report('none');
  if(top.closest('.game-environment-notice:modal'))return report('device-notice');
  if(top.closest('.game-bird-sheet:modal'))return report('bird-sheet');
  if(top.closest('dialog:modal'))return report('real-modal');
  if(top.closest('.finch-garden-image-plane > button'))return report('peer');
  if(top.closest('.finch-garden-dock,.finch-garden-selector,.finch-garden > header,.finch-garden-family,.game-scene-controls-toggle,.finch-garden [data-garden-encounter-notice]'))return report('garden-ui');
  if(top.closest('.finch-garden-loading,.game-panel-overlay'))return report('scene-other');
  return report('other');
 },{ordinal,x,y,previousMode});
}
for(const [id,g] of Object.entries(GARDEN_TRAIL_TERRAIN)){
 const key=String(g.number).padStart(2,'0');
 if(['08','10','34'].includes(key))test(key+' dense exact bounds',fixed(key+'-dense',async(page,mark)=>{
  const density='maximum',count=10;
  await setup(page,id,375,true,density,{...pilot,height:667});
  mark('preview');
  await expect(stage(page)).toHaveAttribute('data-garden-trail-preview','true');
  mark('portrait-one-ready');
  const first=await stable(page,375,667);const ids=first.birds.map(b=>b.id);
  mark('portrait-one-native');
  assertNative(first,count);
  mark('portrait-one-qualified');
  expect(first.motion).toMatch(/^trail-(active|held|standing)$/);
  mark('tap-open');
   const b=first.birds.find(b=>b.id==='b1');
   await page.touchscreen.tap(b.point.x,b.point.y);
   await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();
  mark('tap-close');
   await page.getByRole('button',{name:'文鳥の操作をとじる',exact:true}).tap();
  mark('landscape-ready');
  const landscape=await stable(page,667,375);
  mark('landscape-identities');
  assertGardenIdentities(landscape.birds,count,ids);
  for(const [ordinal,bird] of landscape.birds.entries()){
   mark('landscape-width'); expect(bird.rect.width).toBeGreaterThanOrEqual(43.99);
   mark('landscape-height'); expect(bird.rect.height).toBeGreaterThanOrEqual(43.99);
   mark('landscape-viewport'); expect(bird.centerInViewport).toBe(true);
   mark('landscape-hit');
   if(!bird.hit){
    const detail=await observeLandscapeOccluder(page,{ordinal,x:bird.point.x,y:bird.point.y,previousMode:landscape.motion})
     .catch(()=>({kind:'unavailable',mode:'other',rendered:'unbound',blocked:false,persistent:'none'}));
    mark('landscape-hit',detail);
   }
   expect(bird.hit).toBe(true);
  }
  mark('portrait-two-native');
  assertNative(await stable(page,402,874),count,ids);
  mark('motion-native');
   let moving=false;
   for(let i=0;i<90;i++){
    await page.clock.runFor(180);const snap=await snapshotGarden(page);
    assertNative(snap,count,ids);
    if(snap.birds.some(b=>['hop','fly'].includes(b.actorState))){moving=true;break;}
   }
  mark('motion-unseen');
   expect(moving,'real safe movement required, not static fallback').toBe(true);
 }));
 if(g.pullouts.length)test(key+' measured bay sequence',fixed(key+'-lane',async(page,mark)=>{
  await setup(page,id,402,true,true,{...pilot,prepareWorld:w=>{
   const b=engine.createBird(w,{home:'resident',stage:'adult',color:'cinnamon'});
   w.encounters.gardenFriends.attendees.push(b.id);
  }});
  mark('initial-native');
  const before=await stable(page);assertNative(before,2);
  mark('native-gates');
  expect(before.birds.map(b=>b.actorNode).sort()).toEqual(['A','B']);
  mark('enroute-native');
  let bay=false,cross=false,clearedGate=false;
  for(let i=0;i<72;i++){
   await page.clock.runFor(180);const snap=await snapshotGarden(page);
   assertNative(snap,2,before.birds.map(b=>b.id));
   if(snap.birds.some(b=>b.actorNode==='bay'))bay=true;
   if(snap.birds.some(b=>b.actorNode&&!['A','B','bay'].includes(b.actorNode)&&!['fly','hop'].includes(b.actorState)))clearedGate=true;
   for(const b of snap.birds)if(b.actorState==='fly'){
    mark('premature-cross');
    expect(g.pullouts.length?bay:clearedGate,'no flight across a still-occupied opposite gate').toBe(true);cross=true;
    mark('enroute-native');
   }
  }
  mark('bay-not-grounded'); expect(bay).toBe(true);
  mark('cross-unseen'); expect(cross).toBe(true);
 }));
 if(key==='08')for(const [i,color] of colors.entries())test(key+' exact '+color,fixed(key+'-'+color,async(page,mark)=>{
  await setup(page,id,402,true,true,{...pilot,leadColor:color});
  await stable(page);
  const bird=page.locator('[data-garden-household=b1]');
  const phases=new Set(),frames=new Set();let contact=null;
  mark('sample');
  for(let n=0;n<200;n++){
   await page.clock.runFor(100);
   const v=await bird.evaluate(b=>({state:b.dataset.actorState,phase:b.dataset.actorPhase,station:b.dataset.actorNode,
     color:b.querySelector('.garden-bird-sprite')?.dataset.color,
     parts:[...b.querySelectorAll('.garden-actor-flight [data-texture]')].map(p=>p.dataset.texture),
     white:b.querySelector('[data-white-flight-frame]')?.dataset.frame}));
   mark('color');
   expect(v.color).toBe(color);
   mark('sample');
   if(v.state!=='fly')continue;
   phases.add(v.phase);if(color==='white'&&v.white)frames.add(v.white);
   mark('texture');
   if(color!=='white')expect(new Set(v.parts)).toEqual(new Set([color]));
   mark('sample');
   if(v.phase==='contact')contact=v.station;
   if(['rise','flap','contact'].every(p=>phases.has(p)))break;
  }
  for(const phase of ['rise','flap','contact']){
   mark('phase-'+phase); expect(phases.has(phase)).toBe(true);
  }
  mark('white-frames');
  if(i===0)expect(frames.size).toBeGreaterThan(1);
  mark('landing-native');
  await page.clock.runFor(700);
  const end=await snapshotGarden(page);
  assertNative(end,1,['b1']);mark('landing-node');expect(end.birds[0].actorNode).not.toBe(contact);
 }));
 test(key+' exact visitor mutation and native tap',fixed(key+'-visitor',async(page,mark)=>{
  const kind='visitor';
  await setup(page,id,402,true,true,pilot);await stable(page);
  mark('flight-before');
  const pending=await nextFly(page);
  mark('store-change');
  const result=await mutationInIndependentStore(page,{kind,id});
  expect(result.changed).toBe(true);
  mark('store-queue');
   expect(result.arrived).toBe(true);
  mark('visitor-dom');
   await expect(stage(page).locator('.finch-garden-visitor')).toHaveCount(1);
  mark('mixed-native');
   const mixed=await snapshotGarden(page);
   mark(mixed.ready!=='ready'?'mixed-loading':/^trail-(active|held|standing)$/.test(mixed.motion??'')?'mixed-qualified':'mixed-unqualified');
   assertNative(mixed,2);
  mark('incumbent-contact');
   expect(mixed.birds.find(b=>b.id==='b1')?.actorNode).toBe(pending.source);
  mark('visitor-tap');
   const guest=mixed.birds.find(b=>b.id!=='b1');
   await page.touchscreen.tap(guest.point.x,guest.point.y);
   await expect(page.locator('[data-encounter-instance]')).toBeVisible();
 }));
}
