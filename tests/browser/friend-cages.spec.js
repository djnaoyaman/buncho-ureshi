import {test,expect} from '@playwright/test';
import {createWorld,createBird,travelTo} from '../../src/engine.js';
import {FRIEND_CAGES,friendCage} from '../../src/friend-cages.js';
const now=1794182400000, ROOM='.game-main .game-room';
test.use({hasTouch:true});
async function record(page,world){return page.evaluate(world=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onsuccess=()=>{const d=r.result,t=d.transaction('world',world?'readwrite':'readonly'),q=world?t.objectStore('world').put(world,'current'):t.objectStore('world').get('current');t.oncomplete=()=>{d.close();resolve(q.result)};t.onerror=()=>reject(t.error)};}),world);}
async function readScene(page) {
 return page.locator(ROOM).evaluate(room=>{
  const img=room.querySelector('.game-habitat img'),r=room.getBoundingClientRect(),art=img.getBoundingClientRect(),bird=room.querySelector('.game-room-bird.is-selected')?.getBoundingClientRect(),dock=document.querySelector('.game-scene-controls-toggle').getBoundingClientRect();
  return {r:r.toJSON(),art:art.toJSON(),bird:bird?.toJSON(),dock:dock.toJSON(),source:img.currentSrc,w:img.naturalWidth,h:img.naturalHeight,fit:getComputedStyle(img).objectFit};
 });
}
async function swipe(page,width,direction) {
 const a=27,b=width-27,x=direction>0?a:b,target=direction>0?b:a;
 const y=await page.evaluate(({x,target,sel})=>[.32,.38,.48,.62].map(f=>Math.round(innerHeight*f)).find(y=>[x,target].every(x=>{
  const e=document.elementFromPoint(x,y);return e?.closest(sel)&&!e.closest('button,a,input,select,textarea');
 })),{x,target,sel:ROOM});
 expect(y,'both gesture endpoints hit the actual room').toBeDefined();
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(target,y,{steps:7});await page.mouse.up();
}

for(const [width,height] of [[320,568],[390,844],[844,390],[1440,900]])test(`nine original friend rooms keep centered art, bounds and usable birds at ${width}`,async({page})=>{
 test.setTimeout(120000);
 await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(n=>{Date.now=()=>n;localStorage.setItem('buncho.music.v1','{"enabled":false}');localStorage.setItem('buncho.care-sound-choice.v1','{"explicit":true,"enabled":false}');},now);
 await page.goto('');
 const w=createWorld(now,2026);w.paused=true;w.settings.motion=false;
 const byCage=new Map();for(let i=0;i<90&&byCage.size<9;i++){const b=createBird(w,{home:'departed',stage:'adult'});byCage.set(friendCage(w,b.id).id,b);}expect(byCage.size).toBe(9);
 const room=page.locator(ROOM),reset=page.locator('[data-home-camera-reset]'),bird=room.locator('.game-room-bird.is-selected');
 for(const cage of FRIEND_CAGES){
  const id=cage.id;travelTo(w,'friend',byCage.get(id).id);await record(page,w);await page.goto('game/');
  await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
  if(await page.locator('#game-welcome-close').isVisible())await page.locator('#game-welcome-close').click();
  if(await page.locator('body').getAttribute('data-scene-controls')==='open')await page.locator('.game-scene-controls-toggle').tap();
  await expect(room).toHaveAttribute('data-friend-cage',String(id));
  await expect(room).toHaveAttribute('data-friend-camera','');
  await expect.poll(async()=> (await readScene(page)).w).toBeGreaterThan(1000);
  await expect(room.locator('.game-nestling')).toHaveCount(0);
  await expect(reset).toBeHidden();
  const before=await record(page),start=await readScene(page);
  expect(new URL(start.source).pathname).toBe('/buncho-ureshi/game-art/'+cage.file);
  expect([1585,1586]).toContain(start.w);expect(start.h).toBe(992);
  expect(start.fit).toBe('cover');
  expect(start.r.left).toBeCloseTo((width-start.r.width)/2,0);
  expect(start.art.width).toBeCloseTo(start.r.width,0);
  expect(start.art.height).toBeCloseTo(start.r.height,0);
  expect(start.art.left).toBeLessThanOrEqual(.5);
  expect(start.art.right).toBeGreaterThanOrEqual(width-.5);
  expect(start.art.top).toBeLessThanOrEqual(.5);
  expect(start.art.bottom).toBeGreaterThanOrEqual(height-.5);
  if(width<600&&[2,5,9].includes(id)){
   // Drive each extreme through real hit targets, not setting a CSS variable.
   const step=width-54,half=(start.r.width-width)/2;
   for(let i=0;i<Math.ceil(half/step)+1;i++)await swipe(page,width,1);
   const left=await readScene(page);
   expect(left.art.left).toBeCloseTo(0,0);
   expect(left.bird.left-start.bird.left).toBeCloseTo(left.art.left-start.art.left,0);
   expect(left.dock).toEqual(start.dock);
   for(let i=0;i<Math.ceil(2*half/step)+1;i++)await swipe(page,width,-1);
   const right=await readScene(page);
   expect(right.art.right).toBeCloseTo(width,0);
   expect(right.bird.left-start.bird.left).toBeCloseTo(right.art.left-start.art.left,0);
   expect(right.dock).toEqual(start.dock);
   await expect(reset).toHaveText('元の位置へ');await reset.tap();
   expect((await readScene(page)).art.left).toBeCloseTo(start.art.left,0);
   await bird.tap();await expect(page.locator('.game-bird-sheet[open]')).toBeVisible();
   await page.keyboard.press('Escape');await expect(page.locator('.game-bird-sheet[open]')).toHaveCount(0);
   await swipe(page,width,1);await expect(reset).toBeVisible();
  }else{
   if(width<600){
    await swipe(page,width,1);expect((await readScene(page)).art.left).toBeGreaterThan(start.art.left);
    await expect(reset).toBeVisible();await reset.tap();
   }
   await bird.click({trial:true});
  }
  expect(await record(page)).toEqual(before);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
 await page.reload();await expect(room).toHaveAttribute('data-friend-cage',String(friendCage(w,w.field.hostId).id));await expect(reset).toBeHidden();
 if(width===390){
  travelTo(w,'park');await record(page,w);await page.goto('game/');
  await expect(room).toHaveAttribute('data-field','park');
  await expect(room).not.toHaveAttribute('data-friend-camera','');
  await expect(reset).toHaveCount(0);
  // Fixed blank coordinates can miss the park's native hit layout. Start
  // the real drag on a visible bird, a valid camera start in a friend room.
  const art=await readScene(page),hit=await room.locator('[data-game-scene-select]').evaluateAll(birds=>{
   for(const b of birds){
    const r=b.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,target=x<innerWidth/2?innerWidth-10:10;
    if(b.contains(document.elementFromPoint(x,y)))return {x,y,target};
   }
   return null;
  });
  expect(hit,'native park bird with a clear gesture destination').not.toBeNull();
  await page.mouse.move(hit.x,hit.y);await page.mouse.down();await page.mouse.move(hit.target,hit.y,{steps:7});await page.mouse.up();
  expect((await readScene(page)).art.left).toBeCloseTo(art.art.left,0);
  await expect(page.locator('.game-bird-sheet[open]')).toHaveCount(0);
  expect((await record(page)).birds).toEqual(w.birds);
 }
});

test('an archived friend house renders its original cage without changing the saved family',async({page})=>{
 await page.addInitScript(n=>{Date.now=()=>n;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));},now);
 await page.goto('');
 const world=createWorld(now);world.paused=true;
 const friend=createBird(world,{home:'departed'}),cage=friendCage(world,friend.id);
 for(let i=0;i<150;i++)createBird(world,{home:'departed'});
 expect(world.archive.some(b=>b.id===friend.id)).toBe(true);
 travelTo(world,'friend',friend.id);await record(page,world);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 await expect(page.locator('.game-room')).toHaveAttribute('data-friend-cage',String(cage.id));
 await expect(page.locator('.game-habitat img')).toHaveAttribute('src',new RegExp(cage.file.replaceAll('.','\\.')+'$'));
 await expect.poll(()=>page.locator('.game-habitat img').evaluate(el=>el.naturalWidth)).toBeGreaterThan(1000);
 await page.locator('.game-room-bird.is-selected').click({trial:true});
 expect(errors).toEqual([]);expect(await record(page)).toEqual(world);
 await page.reload();await expect(page.locator('.game-room')).toHaveAttribute('data-friend-cage',String(cage.id));
 expect(await record(page)).toEqual(world);
});
