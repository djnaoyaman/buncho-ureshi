import {test,expect} from '@playwright/test';
import {setup,assertGardenIdentities} from '../fixtures/garden-terrain-browser.js';
import {GARDEN_TRAIL_TERRAIN} from '../../src/data/garden-trail-terrain.js';
import {encounterSystem} from '../../src/encounters.js';
import {engine} from '../fixtures/garden-about-world.js';
async function snapshotGarden(page,measureClip=false){return page.evaluate(measureClip=>{
 const stage=document.querySelector('.finch-garden-stage'),plane=stage?.querySelector('.finch-garden-image-plane'),overlay=document.querySelector('.game-panel-overlay[data-scene=true]');
 const describe=n=>n?{tag:n.tagName,id:n.id,class:n.className,household:n.dataset?.gardenHousehold,friend:n.dataset?.gardenFriend,
  group:n.closest('dialog[open]')?'dialog':n.closest('.finch-garden-image-plane > button')?'bird':
   n.closest('.finch-garden-dock,.game-field-nav,.game-scene-controls-toggle,.game-main-nav,.game-nav')?'control':
   n.closest('.finch-garden-image-plane')?'plane':n.closest('.finch-garden-stage')?'stage':
   'other'}:null;
 const classifyFront=n=>{
  if(!n)return 'none';
  const dialog=n.closest('dialog[open]');
  if(dialog?.matches('.game-bird-sheet'))return 'bird-sheet';
  if(dialog?.matches('.game-raptor-return-dialog'))return 'raptor-dialog';
  if(dialog?.matches(':modal'))return 'other-modal';
  if(n===overlay)return 'garden-overlay';
  if(n.closest('.finch-garden-image-plane > button'))return 'peer-bird';
  if(n.closest('.finch-garden-dock,.game-field-nav,.game-scene-controls-toggle,.game-main-nav,.game-nav'))
   return n.closest('button,summary,input,a[href]')?'own-control':'control-wrapper';
  if(n.closest('.finch-garden > header'))return 'header';
  if(n.closest('.finch-garden-image-plane'))return 'plane';
  if(n===stage)return 'stage';
  if(n.closest('.finch-garden-stage'))return 'scenery';
  if(dialog===overlay&&overlay)return 'garden-child';
  return dialog?'other-dialog':'other';
 };
 const hitPaint=(n,hit,x,y,stack)=>{
  const s=getComputedStyle(n), t=hit&&getComputedStyle(hit), r=hit?.getBoundingClientRect();
  const same=stack.filter(a=>n.contains(a)).length>0;
  return [!r?'none':x>=r.left&&x<r.right&&y>=r.top&&y<r.bottom?'front-in':'front-out',
   s.pointerEvents==='none'?'bird-pass':'bird-pointer',s.visibility==='visible'?'bird-visible':'bird-hidden',
   Number(s.opacity)===0?'bird-zero':'bird-alpha', !t?'no-front-paint':
    t.pointerEvents==='none'||t.visibility!=='visible'||Number(t.opacity)===0?'front-pass':'front-paint',
   !t||s.zIndex==='auto'||t.zIndex==='auto'?'z-auto':Number(s.zIndex)>Number(t.zIndex)?'z-above':
    Number(s.zIndex)<Number(t.zIndex)?'z-below':'z-equal',
   same?'bird-in-stack':'bird-not-in-stack',
   ...[1,2].map(i=>classifyFront(stack[i]))].join(':');
 };
 // Reversible comparison in the rejected frame only. Never changes native verdict or motion.
 const compareLayer=(n,hit,x,y)=>{
  const sel='.finch-garden-selector-wrap,.game-overlay-head';
  const wrap=hit?.closest(sel);
  const tag=wrap?.matches('.finch-garden-selector-wrap')?'selector-wrap':wrap?'overlay-head':
   hit?.closest('.leaf-gift')?'story':hit?.closest('.game-encounter-host')?'encounter-host':
   hit?.closest('.game-panel')?'panel':'other';
  if(hit!==wrap||!wrap)return tag+':untested';
  const old=wrap.getAttribute('style');
  // Scope to the actual noninteractive wrapper, not the nav or its scroll surface.
  const keep=[...wrap.querySelectorAll('button,summary,input,a[href],nav[data-garden-jog]')].map(e=>{
   const box=e.getBoundingClientRect(),cx=(box.left+box.right)/2,cy=(box.top+box.bottom)/2;
   return {e,cx,cy,owned:e.contains(document.elementFromPoint(cx,cy)),old:e.getAttribute('style')};
  });
  try{
   wrap.style.setProperty('pointer-events','none','important');
   for(const {e} of keep)e.style.setProperty('pointer-events','auto','important');
   const restored=n.contains(document.elementFromPoint(x,y));
   const nativeLost=keep.some(({e,cx,cy,owned})=>owned&&!e.contains(document.elementFromPoint(cx,cy)));
   return tag+':'+(restored?'restored':'still-covered')+':'+(nativeLost?'control-lost':'controls-kept');
  }finally{
   const reset=(e,value)=>value===null?e.removeAttribute('style'):e.setAttribute('style',value);
   reset(wrap,old); for(const {e,old} of keep)reset(e,old);
  }
 };
 const viewport={width:innerWidth,height:innerHeight,visualHeight:visualViewport?.height,visualTop:visualViewport?.offsetTop,scale:visualViewport?.scale};
 const clip34=measureClip&&stage?(()=>{
  const s=stage.getBoundingClientRect(), slide=(stage.closest('.finch-garden-slide')??stage.querySelector('.finch-garden-slide'))?.getBoundingClientRect(),v=visualViewport,d=document.documentElement;
  return {stage:s.toJSON(),slide:slide?.toJSON()??null,clientWidth:d.clientWidth,clientHeight:d.clientHeight,
   visual:v?{left:v.offsetLeft,top:v.offsetTop,right:v.offsetLeft+v.width,bottom:v.offsetTop+v.height,scale:v.scale}:null};
 })():null;
 const missAncestry=(n,x,y)=>{
  let edge=false,shape=false,inert=false;
  for(let e=n;e;e=e.parentElement){
   const s=getComputedStyle(e),r=e.getBoundingClientRect(),lr=r.left+e.clientLeft,tr=r.top+e.clientTop;
   const clips=o=>['auto','hidden','scroll','clip'].includes(o);
   edge||=clips(s.overflowX)&&(x<lr||x>=lr+e.clientWidth)||clips(s.overflowY)&&(y<tr||y>=tr+e.clientHeight);
   shape||=s.clipPath!=='none'||s.maskImage!=='none'||(clips(s.overflowX)||clips(s.overflowY))&&s.borderRadius.split(/[ /]+/).some(v=>parseFloat(v)>0);
   inert||=e.inert||s.contentVisibility==='hidden';
  }
  return [edge?'edge':'no-edge',shape?'shape':'no-shape',inert?'inert':'not-inert'].join(':');
 };
 let probe=null;
 const birds=[...(plane?.querySelectorAll(':scope > button')||[])].map(n=>{
  const r=n.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y),style=getComputedStyle(n),stack=document.elementsFromPoint(x,y).slice(0,5);
  if(measureClip&&!probe&&!(hit&&n.contains(hit)))probe=()=>compareLayer(n,hit,x,y);
  return {actorState:n.dataset.actorState,actorPhase:n.dataset.actorPhase,actorNode:n.dataset.actorNode,actorTarget:n.dataset.actorLanding,actorStyle:n.getAttribute('style'),id:n.dataset.gardenHousehold||n.dataset.gardenFriend||n.dataset.encounterOpen||n.dataset.gardenVisitingFriend||n.dataset.encounterPage,connected:n.isConnected,rect:r.toJSON(),point:{x,y},centerInViewport:x>=0&&x<innerWidth&&y>=0&&y<innerHeight,hit:!!hit&&n.contains(hit),front:describe(hit),frontDetail:measureClip&&!(hit&&n.contains(hit))?classifyFront(hit):null,missAncestry:measureClip&&!(hit&&n.contains(hit))?missAncestry(n,x,y):null,hitPaint:measureClip&&!(hit&&n.contains(hit))?hitPaint(n,hit,x,y,stack):null,stack:stack.map(describe),visibility:style.visibility,display:style.display,pointerEvents:style.pointerEvents};
 });
 const markerCrow=document.querySelector('[data-crow-phase]')?.dataset.crowPhase;
 const markerRaptor=document.querySelector('[data-raptor-notice]')?.dataset.raptorPhase;
 const event=markerRaptor==='warning'||document.querySelector('.game-raptor-return-dialog[open]')?'raptor-warning':
  markerRaptor==='visiting'?'raptor-visit':markerCrow==='warning'?'crow-warning':
  markerCrow==='visiting'?'crow-visit':markerCrow==='quiet'?'crow-quiet':'clear';
 const shelter=!!document.querySelector('[data-garden-encounter-notice="sheltering"]');
 const layerTrial=probe?.()??null;
 return {event,shelter,layerTrial,gardenId:stage?.dataset.gardenId,worldId:stage?.closest('.finch-garden')?.dataset.gardenWorld,time:performance.now(),viewport,cssHeight:document.body.style.getPropertyValue('--game-viewport-height'),overlay:overlay?.getBoundingClientRect().toJSON(),plane:plane?.getBoundingClientRect().toJSON(),ready:stage?.dataset.sceneState,clip34,modalOpen:measureClip&&!!document.querySelector('dialog:modal'),motion:stage?.dataset.actorMotion||stage?.dataset.terrainMotion,revision:document.querySelector('.finch-garden')?.dataset.gardenRevision,birds};
},measureClip);}
const colors=['white','sakura','cinnamon','silver'];
const stage=page=>page.locator('.finch-garden-stage');
const pilot={nativeSource:true,height:874,afterOpenMs:0};
const mode=process.env.TRAIL_QA_CONTROL??'observe';
if(!['observe','quiet','visitor-ready','both'].includes(mode))throw Error('Invalid trail control');
const quiet=['quiet','both'].includes(mode);
const quietPilot=quiet?{...pilot,quietPredators:true}:pilot;
const readyControl=['visitor-ready','both'].includes(mode);
test.use({hasTouch:true,trace:'off',screenshot:'off',video:'off'});
test.setTimeout(150000);
const record=(phase,outcome,s={})=>{
 const stage=['loading','ready'].includes(s.ready)?s.ready:'other';
 const event=s.event??'clear';
 const desc=[phase,outcome,stage,event,s.shelter?'shelter':'open'].join(':');
 const ann=test.info().annotations,i=ann.findIndex(a=>a.type==='qa-trail-contract');
 if(i>=0)ann.splice(i,1);
 ann.push({type:'qa-trail-contract',description:desc});
};
function assertNative(s,count,ids=null,phase='native'){
 const a=s.birds.map(b=>b.id),u=new Set(a);
 const verdict=a.length<count?'count-down':a.length>count?'count-up':
  a.some(i=>typeof i!=='string'||!i.trim())?'blank':u.size!==count?'duplicate':
  ids?.some((id,i)=>i>=a.length||id!==a[i])?(ids.every(id=>u.has(id))?'order':'replacement'):
  s.birds.some(b=>b.rect.width<43.99||b.rect.height<43.99)?'size':
  s.birds.some(b=>!b.centerInViewport)?'viewport':s.birds.some(b=>!b.hit)?'occluded':'native-ok';
 record(phase,verdict,s);
 if(phase==='landscape'&&s.gardenId==='bird-masked-finch'&&count===10&&verdict==='occluded'){
  // Receipt only: classify the SAME ready sample. No new evaluation / geometry retry.
  const misses=s.birds.filter(b=>!b.hit);
  const first=misses[0];
  if(!s.layerTrial)throw new Error('scoped layer comparison not captured');
  test.info().annotations.push({type:'qa-landscape34-layer',description:s.layerTrial});
  if(!first.frontDetail)throw new Error('landscape34 front detail was not captured');
  test.info().annotations.push({type:'qa-landscape34-front',description:first.frontDetail+':'+(s.modalOpen?'modal-present':'no-modal')});
  if(!first.hitPaint)throw new Error('landscape34 hit paint was not captured');
  test.info().annotations.push({type:'qa-landscape34-paint',description:first.hitPaint});
  const a=first.missAncestry;
  if(!a)throw new Error('landscape34 hit ancestry was not captured');
  test.info().annotations.push({type:'qa-landscape34-ancestry',description:a});
  const motions={'insufficient-space':'insufficient', 'trail-blocked-placement':'placement',
   'trail-blocked-geometry':'geometry', 'trail-needs-recovery':'recovery',
   'geometry-blocked':'final-geometry','trail-active':'active','trail-held':'held','trail-standing':'standing'};
  const groups=new Set(misses.map(b=>b.front?.group??'none'));
  test.info().annotations.push({type:'qa-landscape34',
   description:[motions[s.motion]??'other',groups.size===1?[...groups][0]:'mixed',
    misses.some(b=>b.actorState==='fly'||b.actorState==='hop')?'moving':'ground',
    misses.some(b=>b.pointerEvents==='none'||b.visibility==='hidden'||b.display==='none')?'noninteractive':'interactive',
    String(misses.length)].join(':')});
  const c=s.clip34,b=misses[0],p=b.point,r=b.rect;
  if(!c?.stage||!c?.slide||!(c.clientWidth>0)||!(c.clientHeight>0))throw new Error("landscape34 clip collector did not capture the scoped ready frame");
  const inside=v=>!v?'unknown':p.x>=v.left&&p.x<v.right&&p.y>=v.top&&p.y<v.bottom?'in':'out';
  const painted=c?.slide&&{
   left:Math.max(0,c.stage.left,c.slide.left),top:Math.max(0,c.stage.top,c.slide.top),
   right:Math.min(s.viewport.width,c.stage.right,c.slide.right),bottom:Math.min(s.viewport.height,c.stage.bottom,c.slide.bottom)};
  const client=c&&{left:0,top:0,right:c.clientWidth,bottom:c.clientHeight};
  const visual=c?.visual?.scale===1?c.visual:null;
  const rectState=!painted?'unknown':r.right<=painted.left||r.left>=painted.right||r.bottom<=painted.top||r.top>=painted.bottom?'hidden':
   r.left>=painted.left&&r.right<=painted.right&&r.top>=painted.top&&r.bottom<=painted.bottom?'whole':'partial';
  const movers=s.birds.filter(a=>a.actorTarget&&(a.actorState==='fly'||a.actorState==='hop'));
  test.info().annotations.push({type:'qa-landscape34-clip',
   description:[inside(painted),inside(visual),inside(client),rectState,
    String(movers.length),b.actorTarget?'reservation':'no-reservation'].join(':')});
 }
 assertGardenIdentities(s.birds,count,ids);
 for(const b of s.birds){
  expect(b.rect.width,JSON.stringify(b)).toBeGreaterThanOrEqual(43.99);
  expect(b.rect.height,JSON.stringify(b)).toBeGreaterThanOrEqual(43.99);
  expect(b.centerInViewport,JSON.stringify(b)).toBe(true);
  expect(b.hit,JSON.stringify({bird:b,motion:s.motion})).toBe(true);
 }
}
async function stable(page,width=402,height=874,measureClip=false){
 await page.setViewportSize({width,height});await page.clock.runFor(1000);
 await expect(stage(page)).toHaveAttribute('data-scene-state','ready');
 return snapshotGarden(page,measureClip);
}
// #08 only: hit geometry and live route identity in one browser task.
async function visitorSnapshot(page){return page.evaluate(()=>{
 const scene=document.querySelector('.finch-garden-stage');
 const plane=scene?.querySelector('.finch-garden-image-plane');
 const birds=[...(plane?.querySelectorAll(':scope > button')||[])].map(n=>{
  const d=n.dataset,rect=n.getBoundingClientRect(),x=rect.left+rect.width/2,y=rect.top+rect.height/2;
  const front=document.elementFromPoint(x,y);
  return {id:d.gardenHousehold||d.gardenFriend||d.encounterOpen||d.gardenVisitingFriend||d.encounterPage,
   actorNode:d.actorNode,actorTarget:d.actorLanding,actorState:d.actorState,rect:rect.toJSON(),point:{x,y},
   centerInViewport:x>=0&&x<innerWidth&&y>=0&&y<innerHeight,hit:!!front&&n.contains(front)};
 });
 const markerCrow=document.querySelector('[data-crow-phase]')?.dataset.crowPhase;
 const markerRaptor=document.querySelector('[data-raptor-notice]')?.dataset.raptorPhase;
 const event=markerRaptor==='warning'||document.querySelector('.game-raptor-return-dialog[open]')?'raptor-warning':
  markerRaptor==='visiting'?'raptor-visit':markerCrow==='warning'?'crow-warning':
  markerCrow==='visiting'?'crow-visit':markerCrow==='quiet'?'crow-quiet':'clear';
 const shelter=!!document.querySelector('[data-garden-encounter-notice="sheltering"]');
 return {event,shelter,ready:scene?.dataset.sceneState,gardenId:scene?.dataset.gardenId,
  worldId:scene?.closest('.finch-garden')?.dataset.gardenWorld,birds};
});}
async function nextFly(page,who='b1',ticks=140){
 for(let i=0;i<ticks;i++){
  await page.clock.runFor(120);
  const flight=await page.evaluate(who=>{
   const d=[...document.querySelectorAll('[data-garden-household]')].find(b=>b.dataset.gardenHousehold===who)?.dataset;
   return d?{phase:d.actorPhase,source:d.actorNode,target:d.actorLanding}:null;
  },who);
  if(!flight){
   record("next-fly","b1-absent",await snapshotGarden(page));
   throw Error('native household actor absent while awaiting real flight');
  }
  if(flight.phase==='rise'||flight.phase==='flap')return flight;
 }
 record("next-fly","no-fly",await snapshotGarden(page));
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
    await store.transact(w=>{
     outcome=encounterSystem.observeGarden(w,entry.gardenEvent.scene,{worldId:w.worldId,revision:w.revision});
     outcome={...outcome,world:w.worldId,garden:w.encounters.garden.id,arrivedId:w.encounters.queue[0]??null,expectedId:entry.id};
     return w;
    });
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
 test(`${key} native ${count}: real taps, two portraits, rotate without losing actors`,{tag:"@trail-roster"},async({page})=>{
  await setup(page,id,375,true,density,{...quietPilot,height:667});
  await expect(stage(page)).toHaveAttribute('data-garden-trail','true');
  const first=await stable(page,375,667);const ids=first.birds.map(b=>b.id);
  assertNative(first,count);
  expect(first.motion).toMatch(/^trail-(active|held|standing)$/);
  if(!count){
   await page.locator('[data-garden-details=about]>summary').tap();
   await expect(page.locator('[data-garden-track-credit]')).toHaveCount(1);
   await page.locator('[data-garden-details=about]>summary').tap();
  }else{
   const b=first.birds.find(b=>b.id==='b1');
   await page.touchscreen.tap(b.point.x,b.point.y);
   await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();
   await page.getByRole('button',{name:'文鳥の操作をとじる',exact:true}).tap();
  }
  assertNative(await stable(page,667,375,id==='bird-masked-finch'&&count===10),count,ids,"landscape");
  assertNative(await stable(page,402,874),count,ids,"portrait");
  if(count){
   let moving=false;
   for(let i=0;i<90;i++){
    await page.clock.runFor(180);const snap=await snapshotGarden(page);
    assertNative(snap,count,ids,"movement");
    if(snap.birds.some(b=>['hop','fly'].includes(b.actorState))){moving=true;break;}
   }
   expect(moving,'real safe movement required, not static fallback').toBe(true);
  }
 });
 test(`${key} ${g.pullouts.length?'yield reaches real bay before crossing':'wait outside with both gates taken'}`,{tag:"@trail-lane"},async({page})=>{
  await setup(page,id,402,true,true,{...quietPilot,prepareWorld:w=>{
   const b=engine.createBird(w,{home:'resident',stage:'adult',color:'cinnamon'});
   w.encounters.gardenFriends.attendees.push(b.id);
  }});
  const before=await stable(page);assertNative(before,2);
  expect(before.birds.map(b=>b.actorNode).sort()).toEqual(['A','B']);
  let bay=false,cross=false,clearedGate=false;
  for(let i=0;i<72;i++){
   await page.clock.runFor(180);const snap=await snapshotGarden(page);
   assertNative(snap,2,before.birds.map(b=>b.id),"lane");
   if(snap.birds.some(b=>b.actorNode==='bay'))bay=true;
   if(snap.birds.some(b=>b.actorNode&&!['A','B','bay'].includes(b.actorNode)&&!['fly','hop'].includes(b.actorState)))clearedGate=true;
   for(const b of snap.birds)if(b.actorState==='fly'){
    const peer=snap.birds.find(q=>q.id!==b.id);
    const peerGate=peer&&['A','B'].includes(peer.actorNode)&&!['fly','hop'].includes(peer.actorState);
    record("lane",g.pullouts.length?(bay?'bay-first':peerGate?'fly-before-bay-peer-gate':'fly-before-bay-peer-elsewhere'):
     (clearedGate?'bayless-gate-clear':peerGate?'bayless-peer-gate':'bayless-peer-elsewhere'),snap);
    expect(g.pullouts.length?bay:clearedGate,'no flight across a still-occupied opposite gate').toBe(true);cross=true;
   }
  }
  if(g.pullouts.length){record('lane-final',bay?(cross?'bay-and-cross':'bay-no-cross'):'no-bay');expect(bay).toBe(true);expect(cross).toBe(true);}
  else {expect(bay).toBe(false);if(cross)expect(clearedGate).toBe(true);}
 });
 for(const [i,color] of colors.entries())test(`${key} ${color} exact native launch, flap and landing`,{tag:g.number===7||i===g.number%colors.length?"@trail-palette":"@trail-expanded-palette"},async({page})=>{
  await setup(page,id,402,true,true,{...quietPilot,leadColor:color});
  await stable(page);
  const bird=page.locator('[data-garden-household=b1]');
  const phases=new Set(),frames=new Set();let contact=null;
  for(let n=0;n<200;n++){
   await page.clock.runFor(100);
   if(await bird.count()===0)record("palette","b1-absent",await snapshotGarden(page));
   const v=await bird.evaluate(b=>({state:b.dataset.actorState,phase:b.dataset.actorPhase,station:b.dataset.actorNode,
     color:b.querySelector('.garden-bird-sprite')?.dataset.color,
     parts:[...b.querySelectorAll('.garden-actor-flight [data-texture]')].map(p=>p.dataset.texture),
     white:b.querySelector('[data-white-flight-frame]')?.dataset.frame}));
   expect(v.color).toBe(color);
   if(v.state!=='fly')continue;
   phases.add(v.phase);if(color==='white'&&v.white)frames.add(v.white);
   if(color!=='white')expect(new Set(v.parts)).toEqual(new Set([color]));
   if(v.phase==='contact')contact=v.station;
   if(['rise','flap','contact'].every(p=>phases.has(p)))break;
  }
  expect([...phases]).toEqual(expect.arrayContaining(['rise','flap','contact']));
  if(i===0)expect(frames.size).toBeGreaterThan(1);
  await page.clock.runFor(700);
  const end=await snapshotGarden(page);
  assertNative(end,1,['b1']);expect(end.birds[0].actorNode).not.toBe(contact);
 });
 for(const kind of ['visitor','predator'])test(`${key} real store ${kind} interrupts active native flight safely`,{tag:"@trail-events"},async({page})=>{
  await setup(page,id,402,true,true,kind==='predator'?pilot:quietPilot);await stable(page);
  const pending=await nextFly(page);
  const beforeArrival=kind==='visitor'&&(g.number===8||readyControl)?await visitorSnapshot(page):null;
  if(beforeArrival){
   expect(beforeArrival.ready).toBe('ready');
   expect(beforeArrival.gardenId).toBe(id);
   expect(beforeArrival.worldId).toBeTruthy();
   expect(beforeArrival.birds.find(b=>b.id==='b1')).toMatchObject({
    actorNode:pending.source,actorTarget:pending.target,actorState:'fly'});
  }
  const result=await mutationInIndependentStore(page,{kind,id});
  expect(result.changed).toBe(true);
  if(kind==='visitor'){
   expect(result.arrived).toBe(true);
   await expect(stage(page).locator('.finch-garden-visitor')).toHaveCount(1);
   let mixed;
   if(readyControl){
    expect([result.world,result.garden,result.arrivedId]).toEqual([beforeArrival.worldId,id,result.expectedId]);
    await expect(stage(page)).toHaveAttribute('data-scene-state','ready');
    mixed=await visitorSnapshot(page);
   }else mixed=beforeArrival?await visitorSnapshot(page):await snapshotGarden(page);
   if(beforeArrival){
    // Arrival rebuilds the real stage. Input is only supported after it is
    // media-ready; do not wait/retry for a good size, position or hit.
    if(!readyControl&&mixed.ready==='loading'){
     await expect(stage(page)).toHaveAttribute('data-scene-state','ready');
     mixed=await visitorSnapshot(page);
    }
    expect(mixed.ready).toBe('ready');
    expect([mixed.worldId,mixed.gardenId]).toEqual([beforeArrival.worldId,beforeArrival.gardenId]);
    expect(mixed.birds.find(b=>b.id==='b1')).toMatchObject({
     actorNode:pending.source,actorTarget:pending.target,actorState:'fly'});
   }
   assertNative(mixed,2,null,"visitor");
   expect(mixed.birds.find(b=>b.id==='b1')?.actorNode).toBe(pending.source);
   const guest=mixed.birds.find(b=>readyControl?b.id===result.expectedId:b.id!=='b1');
   if(readyControl)expect(guest).toBeTruthy();
   await page.touchscreen.tap(guest.point.x,guest.point.y);
   if(readyControl){
    const entry=encounterSystem.catalog.find(e=>e.id===result.expectedId);
    await expect(page.locator('[data-encounter-instance] h3')).toHaveText(entry.eventTitle);
   }else await expect(page.locator('[data-encounter-instance]')).toBeVisible();
  }else{
   // True hostile arrival opens a blocking return-choice modal; the
   // background overlay button is intentionally not a tap target yet.
   const home=page.locator('[data-raptor-choice=home]');
   await expect(home).toBeVisible();
   await home.tap();await expect(page.locator('.game-room')).toBeVisible();
   await expect(page.locator('.game-panel-overlay>[data-raptor-notice]')).toHaveCount(0);
  }
 });
}

test('published Type① #01 remains independent with native touchdown control', {tag:'@trail-roster'},async({page})=>{
 await setup(page,'java-rice',375,true,true,{...quietPilot,height:667});
 const snap=await stable(page,375,667);
 assertNative(snap,1,['b1']);expect(snap.motion).toBe('active');
 await expect(stage(page)).not.toHaveAttribute('data-garden-trail','true');
 await page.touchscreen.tap(snap.birds[0].point.x,snap.birds[0].point.y);
 await expect(page.getByRole('dialog',{name:'エド',exact:true})).toBeVisible();
});
test('#07 active reduced-motion toggle retains the same verified contact', {tag:'@trail-events'},async({page})=>{
 await setup(page,'bird-zebra-finch',402,true,true,quietPilot);await stable(page);
 const {source,target}=await nextFly(page);
 expect(target).toBeTruthy();expect(target).not.toBe(source);
 const b=page.locator('[data-garden-household=b1]');
 await page.emulateMedia({reducedMotion:'reduce'});await page.clock.runFor(800);
 await expect(b).toHaveAttribute('data-actor-node',target);
 await expect(b).not.toHaveAttribute('data-actor-landing',/./);
 await expect(b).not.toHaveAttribute('data-actor-state','fly');
 assertNative(await snapshotGarden(page),1,['b1']);
});

