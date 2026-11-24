import {test,expect} from '@playwright/test';
import {createWorld,createBird,travelTo,validateWorld,fieldBirds} from '../../src/engine.js';
import {friendCage,FRIEND_CAGES} from '../../src/friend-cages.js';
const NOW=Date.UTC(2026,10,18,9), ROOM='.game-main .game-room[data-field="friend"]';
test.use({hasTouch:true,reducedMotion:'reduce'});
const snapshot=(page,world)=>page.evaluate(world=>new Promise((resolve,reject)=>{
 const req=indexedDB.open('buncho-ureshi-garden-v1',1);
 req.onupgradeneeded=()=>req.result.createObjectStore('world');req.onerror=()=>reject(req.error);
 req.onsuccess=()=>{const db=req.result,tx=db.transaction('world',world?'readwrite':'readonly'),store=tx.objectStore('world'),q=world?store.put(world,'current'):store.get('current');
  tx.oncomplete=()=>{db.close();resolve(q.result)};tx.onerror=()=>reject(tx.error);};
}),world);
const fixture=(id,count)=>{
 const w=createWorld(NOW,2026);w.paused=true;w.settings.motion=false;
 if(count===1)for(const b of w.birds)b.home='departed';
 else while(w.birds.filter(b=>b.home==='resident').length<10)createBird(w,{home:'resident',stage:'adult'});
 let host;
 for(let i=0;i<96&&!host;i++){const b=createBird(w,{home:'departed',stage:'adult'});if(friendCage(w,b.id).id===id)host=b;}
 if(!host)throw Error('fixture: no matching host');
 if(count===12){const mate=createBird(w,{home:'departed',stage:'adult',sex:host.sex==='male'?'female':'male'});host.partner=mate.id;mate.partner=host.id;host.pairTick=mate.pairTick=w.tick;}
 travelTo(w,'friend',host.id);
 const v=validateWorld(w);if(fieldBirds(v).length!==count)throw Error('fixture: wrong visible count');return v;
};
async function open(page,cage,count){
 await snapshot(page,fixture(cage.id,count));await page.goto('game/');
 await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 const welcome=page.locator('#game-welcome-close');if(await welcome.isVisible())await welcome.click();
 await expect(page.locator(ROOM)).toHaveAttribute('data-friend-cage',String(cage.id));
}
const measure=async room=>{
 // A resize can replace the room node during image decode. Decode first,
 // then resolve the current room again and measure it synchronously.
 await room.locator('.game-habitat img').evaluate(img=>img.decode());
 await expect(room).toBeVisible();
 return room.evaluate(r=>{
 const img=r.querySelector('.game-habitat img'),rb=r.getBoundingClientRect();
 const bounds=[...r.querySelectorAll('.game-room-bird')].map(b=>{
  const box=b.querySelector('.game-sprite').getBoundingClientRect(),style=getComputedStyle(b),anchor=b.getAttribute('data-anchor');
  return {width:box.width/rb.width,left:box.left,right:box.right,top:box.top,bottom:box.bottom,contact:parseFloat(style.getPropertyValue('--bird-y')),anchor};
 });
 return {art:{width:img.width,height:img.height,src:img.currentSrc,decoded:img.complete&&img.naturalWidth>0},pixelWidth:rb.width,pixelHeight:rb.height,bounds};
 });
};
test.beforeEach(async ({page})=>{
 await page.addInitScript(n=>{Date.now=()=>n;localStorage.setItem('buncho.music.v1','{"enabled":false}');localStorage.setItem('buncho.care-sound-choice.v1','{"explicit":true,"enabled":false}');},NOW);
 await page.goto('robots.txt');
});
for(const cage of FRIEND_CAGES)test('art and bird are proportionate for '+cage.title,async({page})=>{
 const room=page.locator(ROOM),wide=.102,narrow=.094,bath=cage.survey[0],expected=Math.min(wide,Math.max(narrow,bath*.65/1600));
 await page.setViewportSize({width:390,height:844});await open(page,cage,1);
 const stored=await snapshot(page);
 for(const [width,height] of [[390,844],[320,568],[844,390],[1280,800]]){
  await page.setViewportSize({width,height});
  const actual=await measure(room);
  expect(actual.art.src).toContain(cage.file);
  expect(actual.art.decoded).toBe(true);
  expect(actual.pixelWidth).toBeGreaterThan(0);
  expect(actual.pixelHeight).toBeGreaterThan(0);
  expect(actual.pixelWidth/actual.pixelHeight).toBeCloseTo(1.6,2);
  expect(actual.art.width).toBeCloseTo(actual.pixelWidth,0);
  expect(actual.bounds).toHaveLength(1);
  expect(actual.bounds[0].width).toBeCloseTo(expected,3);
 }
 await page.setViewportSize({width:390,height:844});
 await room.locator('.game-room-bird.is-selected').tap();await expect(page.locator('.game-bird-sheet[open]')).toBeVisible();
 await page.keyboard.press('Escape');expect(await snapshot(page)).toEqual(stored);
});
test('legacy full house has no overlapping sprite boxes, keeps moving as one plane',async({page})=>{
 const cage=FRIEND_CAGES[3],room=page.locator(ROOM);
 await page.setViewportSize({width:390,height:844});await open(page,cage,12);
 const stored=await snapshot(page),v=await measure(room);
 expect(v.bounds).toHaveLength(12);expect(v.bounds.map(b=>b.anchor)).toEqual(Array.from({length:12},(_,i)=>'friend-contact-'+i));
 for(let i=0;i<v.bounds.length;i++){
  const a=v.bounds[i];expect(a.width).toBeCloseTo(.102,3);
  for(const b of v.bounds.slice(i+1))
   expect(Math.min(a.right,b.right)-Math.max(a.left,b.left)<1||Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)<1).toBe(true);
 }
 const old=(await room.boundingBox()).x;
 const startX=38,endX=352;
 const y=await page.evaluate(({x1,x2,selector})=>[140,190,225,260,360,800].find(y=>[x1,x2].every(x=>{
  const e=document.elementFromPoint(x,y);return e?.closest(selector)&&!e.closest('button,a');
 })),{x1:startX,x2:endX,selector:ROOM});
 expect(y).toBeDefined();await page.mouse.move(startX,y);await page.mouse.down();await page.mouse.move(endX,y,{steps:10});await page.mouse.up();
 await expect.poll(async()=>(await room.boundingBox()).x).toBeGreaterThan(old+50);
 await page.locator('[data-home-camera-reset]').tap();await expect.poll(async()=>(await room.boundingBox()).x).toBeCloseTo(old,0);
 expect(await snapshot(page)).toEqual(stored);
});
