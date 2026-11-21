import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {test,expect} from '@playwright/test';
import {setup,snapshotGarden,assertGardenIdentities} from '../fixtures/garden-terrain-browser.js';
import {GARDEN_TRAIL_TERRAIN} from '../../src/data/garden-trail-terrain.js';
import {encounterSystem} from '../../src/encounters.js';
import {engine} from '../fixtures/garden-about-world.js';
const colors=['white','sakura','cinnamon','silver'];
const stage=page=>page.locator('.finch-garden-stage');
const pilot={nativeSource:true,height:874,afterOpenMs:0};
test.use({hasTouch:true});
test.setTimeout(150000);
function book(info,key){
 let phase='setup';
 return {set(v){phase=v;},save(){
  const dir=process.env.TYPE2_HARD_DIR;
  if(!dir||!['chrome','webkit'].includes(info.project.name))return;
  writeFileSync(join(dir,info.project.name+'-'+key),phase+'\n',{mode:0o600,flag:'wx'});
 }};
}
function assertNative(s,count,ids=null,mark=()=>{}){
 mark('identity');
 assertGardenIdentities(s.birds,count,ids);
 for(const b of s.birds){
  mark('width');expect(b.rect.width,JSON.stringify(b)).toBeGreaterThanOrEqual(43.99);
  mark('height');expect(b.rect.height,JSON.stringify(b)).toBeGreaterThanOrEqual(43.99);
  mark('center');expect(b.centerInViewport,JSON.stringify(b)).toBe(true);
  mark('hit');expect(b.hit,JSON.stringify({bird:b,motion:s.motion})).toBe(true);
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

for(const [id,g] of Object.entries(GARDEN_TRAIL_TERRAIN)){
 const key='#'+String(g.number).padStart(2,'0');
 for(const [density,count] of [['empty',0],[true,1],['maximum',10]])
 test(`${key} native ${count}: real taps, two portraits, rotate without losing actors`,{tag:"@trail-roster"},async({page},info)=>{
  const d=book(info,`${g.number}-roster-${count}`);try{
  const c=(prefix,s,expected,ids=null)=>assertNative(s,expected,ids,k=>d.set(prefix+'-'+k));
  await setup(page,id,375,true,density,{...pilot,height:667});
  d.set('native-enabled');await expect(stage(page)).toHaveAttribute('data-garden-trail','true');
  d.set('first-ready');const first=await stable(page,375,667);const ids=first.birds.map(b=>b.id);
  c('first',first,count);d.set('first-mode');
  expect(first.motion).toMatch(/^trail-(active|held|standing)$/);
  if(!count){
   await page.locator('[data-garden-details=about]>summary').tap();
   await expect(page.locator('[data-garden-track-credit]')).toHaveCount(1);
   await page.locator('[data-garden-details=about]>summary').tap();
  }else{
   const b=first.birds.find(b=>b.id==='b1');
   d.set('entry-tap');await page.touchscreen.tap(b.point.x,b.point.y);
   d.set('entry-dialog');
   await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();
   d.set('entry-close');await page.getByRole('button',{name:'文鳥の操作をとじる',exact:true}).tap();
  }
  d.set('landscape-ready');c('landscape',await stable(page,667,375),count,ids);
  d.set('portrait-ready');c('portrait',await stable(page,402,874),count,ids);
  if(count){
   let moving=false;
   for(let i=0;i<90;i++){
    d.set('movement-sample');await page.clock.runFor(180);const snap=await snapshotGarden(page);
    c('movement',snap,count,ids);
    if(snap.birds.some(b=>['hop','fly'].includes(b.actorState))){moving=true;break;}
   }
   d.set('movement-visible');expect(moving,'real safe movement required, not static fallback').toBe(true);
  }
  d.set('pass');}finally{d.save();}
 });
 test(`${key} ${g.pullouts.length?'yield reaches real bay before crossing':'wait outside with both gates taken'}`,{tag:"@trail-lane"},async({page},info)=>{
  const d=book(info,`${g.number}-lane`);try{
  await setup(page,id,402,true,true,{...pilot,prepareWorld:w=>{
   const b=engine.createBird(w,{home:'resident',stage:'adult',color:'cinnamon'});
   w.encounters.gardenFriends.attendees.push(b.id);
  }});
  d.set('gates-ready');const before=await stable(page);assertNative(before,2,null,k=>d.set('gates-'+k));
  d.set('gates-ab');expect(before.birds.map(b=>b.actorNode).sort()).toEqual(['A','B']);
  let bay=false,cross=false,clearedGate=false;
  for(let i=0;i<72;i++){
   d.set('lane-sample');await page.clock.runFor(180);const snap=await snapshotGarden(page);
   assertNative(snap,2,before.birds.map(b=>b.id),k=>d.set('lane-'+k));
   if(snap.birds.some(b=>b.actorNode==='bay'))bay=true;
   if(snap.birds.some(b=>b.actorNode&&!['A','B','bay'].includes(b.actorNode)&&!['fly','hop'].includes(b.actorState)))clearedGate=true;
   for(const b of snap.birds)if(b.actorState==='fly'){
    d.set('occupied-cross');expect(g.pullouts.length?bay:clearedGate,'no flight across a still-occupied opposite gate').toBe(true);cross=true;
   }
  }
  if(g.pullouts.length){d.set('bay-unseen');expect(bay).toBe(true);d.set('cross-unseen');expect(cross).toBe(true);}
  else {d.set('no-bay');expect(bay).toBe(false);if(cross)expect(clearedGate).toBe(true);}
  d.set('pass');}finally{d.save();}
 });
 for(const [i,color] of colors.entries())test(`${key} ${color} exact native launch, flap and landing`,{tag:g.number===7||i===g.number%colors.length?"@trail-palette":"@trail-expanded-palette"},async({page},info)=>{
  const d=book(info,`${g.number}-${color}`);try{
  await setup(page,id,402,true,true,{...pilot,leadColor:color});
  d.set('palette-ready');await stable(page);
  const bird=page.locator('[data-garden-household=b1]');
  const phases=new Set(),frames=new Set();let contact=null;
  for(let n=0;n<200;n++){
   d.set('palette-sample');await page.clock.runFor(100);
   const v=await bird.evaluate(b=>({state:b.dataset.actorState,phase:b.dataset.actorPhase,station:b.dataset.actorNode,
     color:b.querySelector('.garden-bird-sprite')?.dataset.color,
     parts:[...b.querySelectorAll('.garden-actor-flight [data-texture]')].map(p=>p.dataset.texture),
     white:b.querySelector('[data-white-flight-frame]')?.dataset.frame}));
   d.set('palette-color');expect(v.color).toBe(color);
   if(v.state!=='fly')continue;
   phases.add(v.phase);if(color==='white'&&v.white)frames.add(v.white);
   d.set('palette-texture');if(color!=='white')expect(new Set(v.parts)).toEqual(new Set([color]));
   if(v.phase==='contact')contact=v.station;
   if(['rise','flap','contact'].every(p=>phases.has(p)))break;
  }
  d.set(!phases.has('rise')?'palette-rise':!phases.has('flap')?'palette-flap':'palette-contact');expect([...phases]).toEqual(expect.arrayContaining(['rise','flap','contact']));
  d.set('palette-frames');if(i===0)expect(frames.size).toBeGreaterThan(1);
  await page.clock.runFor(700);
  const end=await snapshotGarden(page);
  assertNative(end,1,['b1'],k=>d.set('landing-'+k));d.set('landing-contact');expect(end.birds[0].actorNode).not.toBe(contact);
  d.set('pass');}finally{d.save();}
 });
 for(const kind of ['visitor','predator'])test(`${key} real store ${kind} interrupts active native flight safely`,{tag:"@trail-events"},async({page},info)=>{
  const d=book(info,`${g.number}-${kind}`);try{
  await setup(page,id,402,true,true,pilot);d.set('visitor-ready');await stable(page);
  d.set('visitor-preflight');const pending=await nextFly(page);d.set('visitor-store-mutation');
  const result=await mutationInIndependentStore(page,{kind,id});
  expect(result.changed).toBe(true);
  if(kind==='visitor'){
   d.set('visitor-arrival');expect(result.arrived).toBe(true);
   d.set('visitor-dom');await expect(stage(page).locator('.finch-garden-visitor')).toHaveCount(1);
   d.set('visitor-sample');const mixed=await snapshotGarden(page);assertNative(mixed,2,null,k=>d.set('visitor-'+k));
   d.set('visitor-source');expect(mixed.birds.find(b=>b.id==='b1')?.actorNode).toBe(pending.source);
   const guest=mixed.birds.find(b=>b.id!=='b1');
   d.set('visitor-tap');await page.touchscreen.tap(guest.point.x,guest.point.y);
   d.set('visitor-dialog');await expect(page.locator('[data-encounter-instance]')).toBeVisible();
  }else{
   // True hostile arrival opens a blocking return-choice modal; the
   // background overlay button is intentionally not a tap target yet.
   const home=page.locator('[data-raptor-choice=home]');
   await expect(home).toBeVisible();
   await home.tap();await expect(page.locator('.game-room')).toBeVisible();
   await expect(page.locator('.game-panel-overlay>[data-raptor-notice]')).toHaveCount(0);
  }
  d.set('pass');}finally{d.save();}
 });
}

test('published Type① #01 remains independent with native touchdown control', {tag:'@trail-roster'},async({page})=>{
 await setup(page,'java-rice',375,true,true,{...pilot,height:667});
 const snap=await stable(page,375,667);
 assertNative(snap,1,['b1']);expect(snap.motion).toBe('active');
 await expect(stage(page)).not.toHaveAttribute('data-garden-trail','true');
 await page.touchscreen.tap(snap.birds[0].point.x,snap.birds[0].point.y);
 await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();
});
test('#07 active reduced-motion toggle retains the same verified contact', {tag:'@trail-events'},async({page})=>{
 await setup(page,'bird-zebra-finch',402,true,true,pilot);await stable(page);
 const {source,target}=await nextFly(page);
 expect(target).toBeTruthy();expect(target).not.toBe(source);
 const b=page.locator('[data-garden-household=b1]');
 await page.emulateMedia({reducedMotion:'reduce'});await page.clock.runFor(800);
 await expect(b).toHaveAttribute('data-actor-node',target);
 await expect(b).not.toHaveAttribute('data-actor-landing',/./);
 await expect(b).not.toHaveAttribute('data-actor-state','fly');
 assertNative(await snapshotGarden(page),1,['b1']);
});
