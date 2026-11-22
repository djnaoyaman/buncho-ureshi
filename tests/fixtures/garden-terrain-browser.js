import assert from 'node:assert/strict';
import {expect} from '@playwright/test';
import {worldFor,NOW,engine,crow,raptor} from './garden-about-world.js';
import {encounterSystem,getGardenVisitingBird} from '../../src/encounters.js';
import {recordGardenVisit} from '../../src/garden-friends.js';
// Seed genuine elapsed, targetless visits before the controlled test roster
// enters. The published clock and its RNG remain unmodified.
export function seedGardenPredatorCooldown(w,id){
  const past=NOW-60000,token=()=>({...raptor.raptorToken(w),gardenId:id});
  assert.equal(raptor.raptorTarget(w),null);
  assert.equal(raptor.arriveGardenRaptor(w,'black-kite',past,token()).changed,true);
  for(let elapsed=2000;elapsed<=raptor.RAPTOR_RULES.visitMs;elapsed+=2000)
    assert.equal(engine.advanceGardenRaptor(w,2000,past+elapsed,raptor.raptorToken(w)).changed,true);
  assert.equal(crow.arriveGardenCrow(w,'large-billed-crow',past,token()).changed,true);
  assert.equal(crow.crowScene(w,NOW),null);assert.equal(raptor.raptorScene(w),null);
  assert.equal(crow.crowCoolingDown(w,NOW+42000),true);assert.equal(raptor.raptorCoolingDown(w,NOW+42000),true);
}
export async function setup(page,id,width=390,motion=true,sparse=false,{nativeSource=false,quietPredators=false,leadColor=null,prepareWorld=null,height=844,afterOpenMs=1100}={}){
  await page.setViewportSize({width,height});
  if(!nativeSource)await page.route(/\/src\/game\.js(?:\?.*)?$/,async route=>{
    const response=await route.fetch(),source=await response.text();expect(source.split('predatorRandom = Math.random')).toHaveLength(2);
    const body=source.replace('predatorRandom = Math.random','predatorRandom = () => 1');
    await route.fulfill({response,body});
  });
  await page.addInitScript(()=>{localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));});
  await page.goto('');await page.clock.install({time:NOW});await page.clock.pauseAt(NOW+1000);
  const world=worldFor(quietPredators?'solo':'attending',id);
  if(quietPredators){
    seedGardenPredatorCooldown(world,id);
    Object.assign(world.encounters.gardenFriends,{accompany:true,companions:['b1'],attendees:['b1']});
  }
  world.settings.motion=motion;if(leadColor)world.birds[0].color=leadColor;
  if(sparse)world.encounters.gardenFriends.visits=[{gardenId:id,visit:world.encounters.garden.visits[id],friendIds:[],returningIds:[]}];
  if(sparse==='chick')world.birds[0].stage='chick';
  if(sparse==='empty')world.encounters.gardenFriends.attendees=[];
  if(['dense','maximum','colours'].includes(sparse)){
    world.encounters.gardenFriends.visits=[];
    for(let i=0;i<3;i++){const b=engine.createBird(world,{home:'resident',stage:'adult',color:['sakura','cinnamon','silver'][i]});world.encounters.gardenFriends.attendees.push(b.id);}
    if(sparse==='colours')world.encounters.gardenFriends.visits=[{gardenId:id,visit:world.encounters.garden.visits[id],friendIds:[],returningIds:[]}];
    if(sparse==='maximum'){
      const guest=encounterSystem.catalog.find(e=>e.gardenEvent.gardenIds.includes(id));
      const returning=encounterSystem.catalog.find(e=>!e.gardenEvent.gardenIds.includes(id));
      world.encounters.discoveries.push({id:returning.id,firstTick:world.tick,lastTick:world.tick,visits:6,instanceId:world.encounters.nextId++});
      world.encounters.garden.guestGardenId=id;world.encounters.queue=[guest.id];
      for(let visit=0;visit<100;visit++){
        world.encounters.garden.visits[id]=visit;recordGardenVisit(world,[returning.id]);
        if(getGardenVisitingBird(world))break;
      }
      if(!getGardenVisitingBird(world))throw Error('Maximum roster fixture has no returning bird');
    }
  }
  if(prepareWorld)prepareWorld(world);
  engine.validateWorld(world);
  await page.evaluate(w=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onsuccess=()=>{const db=r.result,t=db.transaction('world','readwrite');t.objectStore('world').put(w,'current');t.oncomplete=()=>{db.close();resolve()};t.onerror=()=>reject(t.error)};}),world);
  await page.goto('game/');await page.clock.runFor(2500);
  await page.locator('.game-scene-controls-toggle').click();await page.locator('[data-game-panel=outdoors]').click();
  await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
  if(afterOpenMs)await page.clock.runFor(afterOpenMs);
}
export async function measure(page,checkCssRoundtrip=false){return page.locator('.finch-garden-image-plane').evaluate((e,checkCssRoundtrip)=>{
  const p=e.getBoundingClientRect();return [...e.querySelectorAll(':scope > button')].map(n=>{
    const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2),sprite=n.querySelector('.garden-bird-sprite');
    return {id:n.dataset.gardenFriend||n.dataset.gardenHousehold||n.dataset.encounterOpen||n.dataset.gardenVisitingFriend||n.dataset.encounterPage,width:r.width,height:r.height,hit:!!hit&&n.contains(hit),
      ...(checkCssRoundtrip?{actorGroundPercent:n.hasAttribute('data-actor-state')&&
       n.dataset.actorPhase==='ground'&&n.style.left.endsWith('%')&&n.style.top.endsWith('%')}:{}),
      point:[parseFloat(n.style.left)/100,parseFloat(n.style.top)/100],style:n.getAttribute('style'),src:sprite?.querySelector('img')?.getAttribute('src'),filter:sprite?getComputedStyle(sprite).filter:'none',plane:[p.width,p.height]};
  });
},checkCssRoundtrip);}

// Query readiness and geometry in one browser task. Locator.evaluate first
// obtains an ElementHandle; a committed-world redraw can detach it before the
// measurement runs. Never poll for a successful hit: an occluded ready bird
// must be returned with hit:false so the caller's assertion fails.
export async function measureReady(page,checkCssRoundtrip=false){
 let result;await expect.poll(async()=>{result=await page.evaluate(checkCssRoundtrip=>{
  const stage=document.querySelector('.finch-garden-stage');
  if(stage?.dataset.sceneState!=='ready')return false;
  const e=stage.querySelector('.finch-garden-image-plane');if(!e)return false;
  const p=e.getBoundingClientRect();return [...e.querySelectorAll(':scope > button')].map(n=>{
   const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2),sprite=n.querySelector('.garden-bird-sprite');
   return {id:n.dataset.gardenFriend||n.dataset.gardenHousehold||n.dataset.encounterOpen||n.dataset.gardenVisitingFriend||n.dataset.encounterPage,width:r.width,height:r.height,hit:!!hit&&n.contains(hit),
    ...(checkCssRoundtrip?{actorGroundPercent:n.hasAttribute('data-actor-state')&&
       n.dataset.actorPhase==='ground'&&n.style.left.endsWith('%')&&n.style.top.endsWith('%')}:{}),
      point:[parseFloat(n.style.left)/100,parseFloat(n.style.top)/100],style:n.getAttribute('style'),src:sprite?.querySelector('img')?.getAttribute('src'),filter:sprite?getComputedStyle(sprite).filter:'none',plane:[p.width,p.height],motion:stage.dataset.actorMotion||stage.dataset.terrainMotion};
  });
 },checkCssRoundtrip);return result!==false;},{timeout:10000}).toBe(true);
 return result;
}

// Gate native render identities independently from tap/geometry; an unknown
// control remains a failing sample, not an invented placeholder ID.
export function assertGardenIdentities(birds,count,previousIds=null){
 assert.equal(birds.length,count,'native rendered count changed');
 const ids=birds.map(b=>b.id);
 assert.ok(ids.every(id=>typeof id==='string'&&id.trim()!==''),'anonymous native bird control');
 assert.equal(new Set(ids).size,count,'duplicate native bird identity');
 if(previousIds)assert.deepEqual(ids,previousIds,'native bird identities or order changed');
}
// One synchronous browser task: never retry geometry or hit results. A ready
// scene with a zero-size/offscreen/occluded bird must remain a failing sample.
export async function snapshotGarden(page){return page.evaluate(()=>{
 const stage=document.querySelector('.finch-garden-stage'),plane=stage?.querySelector('.finch-garden-image-plane'),overlay=document.querySelector('.game-panel-overlay[data-scene=true]');
 const describe=n=>n?{tag:n.tagName,id:n.id,class:n.className,household:n.dataset?.gardenHousehold,friend:n.dataset?.gardenFriend,
  group:n.closest('dialog[open]')?'dialog':n.closest('.finch-garden-image-plane > button')?'bird':
   n.closest('.finch-garden-dock,.game-field-nav,.game-scene-controls-toggle,.game-main-nav,.game-nav')?'control':
   n.closest('.finch-garden-image-plane')?'plane':n.closest('.finch-garden-stage')?'stage':'other'}:null;
 const viewport={width:innerWidth,height:innerHeight,visualHeight:visualViewport?.height,visualTop:visualViewport?.offsetTop,scale:visualViewport?.scale};
 // Scope extra reads to the same #34 wide frame already used for hit checks.
 const clip34=stage?.dataset.gardenId==='bird-masked-finch'&&innerWidth>innerHeight?(()=>{
  const s=stage.getBoundingClientRect(), slide=stage.querySelector('.finch-garden-slide')?.getBoundingClientRect(),v=visualViewport,d=document.documentElement;
  return {stage:s.toJSON(),slide:slide?.toJSON()??null,clientWidth:d.clientWidth,clientHeight:d.clientHeight,
   visual:v?{left:v.offsetLeft,top:v.offsetTop,right:v.offsetLeft+v.width,bottom:v.offsetTop+v.height,scale:v.scale}:null};
 })():null;
 const birds=[...(plane?.querySelectorAll(':scope > button')||[])].map(n=>{
  const r=n.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y),style=getComputedStyle(n);
  return {actorState:n.dataset.actorState,actorPhase:n.dataset.actorPhase,actorNode:n.dataset.actorNode,actorTarget:n.dataset.actorLanding,actorStyle:n.getAttribute('style'),id:n.dataset.gardenHousehold||n.dataset.gardenFriend||n.dataset.encounterOpen||n.dataset.gardenVisitingFriend||n.dataset.encounterPage,connected:n.isConnected,rect:r.toJSON(),point:{x,y},centerInViewport:x>=0&&x<innerWidth&&y>=0&&y<innerHeight,hit:!!hit&&n.contains(hit),front:describe(hit),stack:document.elementsFromPoint(x,y).slice(0,5).map(describe),visibility:style.visibility,display:style.display,pointerEvents:style.pointerEvents};
 });
 return {gardenId:stage?.dataset.gardenId,worldId:stage?.closest('.finch-garden')?.dataset.gardenWorld,time:performance.now(),viewport,cssHeight:document.body.style.getPropertyValue('--game-viewport-height'),overlay:overlay?.getBoundingClientRect().toJSON(),plane:plane?.getBoundingClientRect().toJSON(),ready:stage?.dataset.sceneState,motion:stage?.dataset.actorMotion||stage?.dataset.terrainMotion,clip34,revision:document.querySelector('.finch-garden')?.dataset.gardenRevision,birds};
});}
export async function readyGardenSnapshot(page,info,label){
 const samples=[];let sample;
 try{await expect.poll(async()=>{sample=await snapshotGarden(page);samples.push(sample);return sample.ready==='ready';}).toBe(true);return sample;}
 finally{await info.attach(label,{body:JSON.stringify(samples),contentType:'application/json'});}
}
