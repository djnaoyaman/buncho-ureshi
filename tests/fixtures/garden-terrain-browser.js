import {expect} from '@playwright/test';
import {worldFor,NOW,engine} from './garden-about-world.js';
export async function setup(page,id,width=390,motion=true,sparse=false,height=844){
  await page.setViewportSize({width,height});
  await page.route(/\/src\/game\.js(?:\?.*)?$/,async route=>{
    const response=await route.fetch(),source=await response.text();expect(source.split('predatorRandom = Math.random')).toHaveLength(2);
    await route.fulfill({response,body:source.replace('predatorRandom = Math.random','predatorRandom = () => 1')});
  });
  await page.addInitScript(()=>{localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));});
  await page.goto('');await page.clock.install({time:NOW});await page.clock.pauseAt(NOW+1000);
  const world=worldFor('attending',id);world.settings.motion=motion;
  if(sparse)world.encounters.gardenFriends.visits=[{gardenId:id,visit:world.encounters.garden.visits[id],friendIds:[],returningIds:[]}];
  if(sparse==='chick')world.birds[0].stage='chick';
  if(sparse==='empty')world.encounters.gardenFriends.attendees=[];
  if(sparse==='dense'){
    world.encounters.gardenFriends.visits=[];
    for(let i=0;i<3;i++){const b=engine.createBird(world,{home:'resident',stage:'adult'});world.encounters.gardenFriends.attendees.push(b.id);}
  }
  engine.validateWorld(world);
  await page.evaluate(w=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onsuccess=()=>{const db=r.result,t=db.transaction('world','readwrite');t.objectStore('world').put(w,'current');t.oncomplete=()=>{db.close();resolve()};t.onerror=()=>reject(t.error)};}),world);
  await page.goto('game/');await page.clock.runFor(2500);
  await page.locator('.game-scene-controls-toggle').click();await page.locator('[data-game-panel=outdoors]').click();
  await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
  await page.clock.runFor(1100);
}
export async function measure(page){return page.evaluate(()=>{
  const e=document.querySelector('.finch-garden-image-plane'),revision=document.querySelector('.finch-garden')?.dataset.gardenRevision;
  if(!e)throw new Error('Garden image plane missing during atomic measurement');
  const p=e.getBoundingClientRect();return [...e.querySelectorAll(':scope > button')].map(n=>{
    const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2),sprite=n.querySelector('.garden-bird-sprite');
    return {connected:n.isConnected,revision,front:hit?.className||null,id:n.dataset.gardenFriend||n.dataset.gardenHousehold||n.dataset.encounterOpen,width:r.width,height:r.height,hit:!!hit&&n.contains(hit),
      point:[parseFloat(n.style.left)/100,parseFloat(n.style.top)/100],style:n.getAttribute('style'),src:sprite?.querySelector('img')?.getAttribute('src'),filter:sprite?getComputedStyle(sprite).filter:'none',plane:[p.width,p.height]};
  });
});}

// Query readiness and geometry in one browser task. Locator.evaluate first
// obtains an ElementHandle; a committed-world redraw can detach it before the
// measurement runs. Never poll for a successful hit: an occluded ready bird
// must be returned with hit:false so the caller's assertion fails.
export async function measureReady(page){
 let result;await expect.poll(async()=>{result=await page.evaluate(()=>{
  const stage=document.querySelector('.finch-garden-stage');
  if(stage?.dataset.sceneState!=='ready')return false;
  const e=stage.querySelector('.finch-garden-image-plane');if(!e)return false;
  const p=e.getBoundingClientRect();return [...e.querySelectorAll(':scope > button')].map(n=>{
   const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2),sprite=n.querySelector('.garden-bird-sprite');
   return {id:n.dataset.gardenFriend||n.dataset.gardenHousehold||n.dataset.encounterOpen,width:r.width,height:r.height,hit:!!hit&&n.contains(hit),
    point:[parseFloat(n.style.left)/100,parseFloat(n.style.top)/100],style:n.getAttribute('style'),src:sprite?.querySelector('img')?.getAttribute('src'),filter:sprite?getComputedStyle(sprite).filter:'none',plane:[p.width,p.height],motion:stage.dataset.terrainMotion};
  });
 });return result!==false;},{timeout:10000}).toBe(true);
 return result;
}

// One synchronous browser task: never retry geometry or hit results. A ready
// scene with a zero-size/offscreen/occluded bird must remain a failing sample.
export async function snapshotGarden(page){return page.evaluate(()=>{
 const stage=document.querySelector('.finch-garden-stage'),plane=stage?.querySelector('.finch-garden-image-plane'),overlay=document.querySelector('.game-panel-overlay[data-scene=true]');
 const describe=n=>n?{tag:n.tagName,id:n.id,class:n.className,household:n.dataset?.gardenHousehold,friend:n.dataset?.gardenFriend}:null;
 const viewport={width:innerWidth,height:innerHeight,visualHeight:visualViewport?.height,visualTop:visualViewport?.offsetTop,scale:visualViewport?.scale};
 const birds=[...(plane?.querySelectorAll(':scope > button')||[])].map(n=>{
  const r=n.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y),style=getComputedStyle(n);
  return {id:n.dataset.gardenHousehold||n.dataset.gardenFriend||n.dataset.encounterOpen,connected:n.isConnected,rect:r.toJSON(),point:{x,y},centerInViewport:x>=0&&x<innerWidth&&y>=0&&y<innerHeight,hit:!!hit&&n.contains(hit),front:describe(hit),stack:document.elementsFromPoint(x,y).slice(0,5).map(describe),visibility:style.visibility,display:style.display,pointerEvents:style.pointerEvents};
 });
 return {time:performance.now(),viewport,cssHeight:document.body.style.getPropertyValue('--game-viewport-height'),overlay:overlay?.getBoundingClientRect().toJSON(),plane:plane?.getBoundingClientRect().toJSON(),ready:stage?.dataset.sceneState,motion:stage?.dataset.terrainMotion,revision:document.querySelector('.finch-garden')?.dataset.gardenRevision,birds};
});}
export async function readyGardenSnapshot(page,info,label){
 const samples=[];let sample;
 try{await expect.poll(async()=>{sample=await snapshotGarden(page);samples.push(sample);return sample.ready==='ready';}).toBe(true);return sample;}
 finally{await info.attach(label,{body:JSON.stringify(samples),contentType:'application/json'});}
}
