import {test,expect} from '@playwright/test';
import {createWorld,createBird,validateWorld} from '../../src/engine.js';
import {HOME_VISIBLE_STAGE_HEIGHT} from '../../src/field-visuals.js';
const NOW=Date.UTC(2026,10,18,9);
test.use({hasTouch:true});
const save=(page,w)=>page.evaluate(world=>new Promise((resolve,reject)=>{
 const req=indexedDB.open('buncho-ureshi-garden-v1',1);
 req.onupgradeneeded=()=>req.result.createObjectStore('world');req.onerror=()=>reject(req.error);
 req.onsuccess=()=>{const db=req.result,tx=db.transaction('world',world?'readwrite':'readonly'),store=tx.objectStore('world'),q=world?store.put(world,'current'):store.get('current');
  tx.oncomplete=()=>{db.close();resolve(world||q.result)};tx.onerror=()=>reject(tx.error);
 };
}),w);
const identity=w=>({tick:w.tick,seed:w.seed,worldId:w.worldId,birds:w.birds,journal:w.journal,economy:w.economy,decor:w.decor,protagonist:w.protagonist});
async function setup(page,w,width,height){
 await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(now=>{Date.now=()=>now;localStorage.setItem('buncho.music.v1','{"enabled":false}');localStorage.setItem('buncho.care-sound-choice.v1','{"explicit":true,"enabled":false}');},NOW);
 await page.goto('');await save(page,validateWorld(w));await page.goto('game/');
 await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 if(await page.locator('#game-welcome-close').isVisible())await page.locator('#game-welcome-close').click();
 await expect(page.locator('.game-main .game-room[data-field="home"]')).toBeVisible();
}
const snapshot=page=>page.evaluate(()=>{
 const room=document.querySelector('.game-main .game-room[data-field="home"]');
 const box=e=>e?.getBoundingClientRect().toJSON();
 const bg=room.querySelector('.game-habitat img'), r=box(room);
 const birds=[...room.querySelectorAll('.game-room-bird')].map(b=>{
  const art=b.querySelector('.game-sprite'),i=art?.querySelector('img'),rect=box(b), center=document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2);
  return {id:b.dataset.birdId,stage:art?.dataset.stage,image:i?.currentSrc,loaded:!!(i?.complete&&i.naturalWidth),box:rect,
   art:box(art),hit:b.contains(center),interactive:b.tagName==='BUTTON'};
 });
 return {r,birds,ink:!!(bg.complete&&bg.naturalWidth),bg: bg.currentSrc, dock:box(document.querySelector('.game-scene-controls-toggle')),size:[innerWidth,innerHeight]};
});
async function drag(page,x,y,to){await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(to,y,{steps:12});await page.mouse.up();}
for(const [width,height] of [[320,568],[390,844]])test(`home ${width}: authentic first paint, no button hijack, fixed menu, exact left and right limits`,async({page},info)=>{
 const w=createWorld(NOW,1701);w.paused=true;w.settings.motion=false;
 const child=createBird(w,{home:'resident',stage:'chick'}),egg=createBird(w,{home:'resident',stage:'egg'});
 await setup(page,w,width,height);const before=identity(await save(page));
 await expect.poll(async()=>{const s=await snapshot(page);return s.ink&&s.birds.length===3&&s.birds.every(b=>b.loaded);}).toBe(true);
 const start=await snapshot(page),stand=start.birds.find(b=>b.interactive);
 expect(start.bg).toMatch(/field-home-tall\.webp/);expect(start.birds.find(b=>b.id===child.id).image).toContain('home-chick-dehalo-v1.webp');
 const c=start.birds.find(b=>b.id===child.id),e=start.birds.find(b=>b.id===egg.id);
 expect((e.art.height*HOME_VISIBLE_STAGE_HEIGHT.egg)/(c.art.height*HOME_VISIBLE_STAGE_HEIGHT.chick)).toBeCloseTo(.23/.62,1);
 for(const b of start.birds){expect(b.box.x).toBeGreaterThanOrEqual(-1);expect(b.box.right).toBeLessThanOrEqual(width+1);}
 expect(start.r.x).toBeCloseTo(-Math.min(start.r.width-width,Math.max((start.r.width-width)/2,start.r.width*.89-width+12)),0);
 expect(stand.hit).toBe(true);
 // Start on the native select button itself: drag must not open its dialog.
 await drag(page,stand.box.x+stand.box.width/2,stand.box.y+stand.box.height/2,width-5);
 await expect(page.locator('.game-bird-sheet[open]')).toHaveCount(0);
 const moved=await snapshot(page);expect(moved.r.x).toBeGreaterThan(start.r.x+9);
 expect(moved.dock).toEqual(start.dock);
 expect(moved.birds[0].box.x-start.birds[0].box.x).toBeCloseTo(moved.r.x-start.r.x,0);
 for(let i=0;i<3;i++)await drag(page,25,150,width-25);
 const left=await snapshot(page);expect(left.r.x).toBeCloseTo(0,0);
 for(let i=0;i<4;i++)await drag(page,width-25,150,25);
 const right=await snapshot(page);expect(right.r.right).toBeCloseTo(width,0);
 expect(right.dock).toEqual(start.dock);
 const reset=page.locator('[data-home-camera-reset]');await expect(reset).toBeVisible();await reset.click();
 const resetView=await snapshot(page);expect(resetView.r.x).toBeCloseTo(start.r.x,0);
 await page.locator(`[data-game-scene-select][data-bird-id="${stand.id}"]`).tap();await expect(page.locator('.game-bird-sheet[open]')).toBeVisible();
 expect(identity(await save(page))).toEqual(before);
 await info.attach('original-home-after-reset',{body:await page.screenshot(),contentType:'image/png'});
});
test('six mobile home adults retain separate live targets after panning and reset',async({page})=>{
 const w=createWorld(NOW,1702);w.paused=true;w.settings.motion=false;
 for(let i=0;i<4;i++)createBird(w,{home:'resident',stage:i===0?'juvenile':'adult'});
 createBird(w,{home:'resident',stage:'chick'});
 await setup(page,w,390,844);
 await expect.poll(async()=>{const s=await snapshot(page);return s.ink&&s.birds.length===6&&s.birds.every(b=>b.loaded);}).toBe(true);
 const start=await snapshot(page),before=identity(await save(page));
 await drag(page,45,170,350);await page.locator('[data-home-camera-reset]').click();
 const after=await snapshot(page);expect(after.birds.map(b=>b.id)).toEqual(start.birds.map(b=>b.id));expect(after.r.x).toBeCloseTo(start.r.x,0);
 const adults=after.birds.filter(b=>b.interactive);expect(adults).toHaveLength(5);
 for(const b of adults){expect(b.hit,JSON.stringify(b)).toBe(true);expect(b.box.width).toBeGreaterThanOrEqual(44-.001);}
 for(const [i,a]of adults.entries())for(const b of adults.slice(i+1))expect(Math.min(a.box.right,b.box.right)>Math.max(a.box.left,b.box.left)&&Math.min(a.box.bottom,b.box.bottom)>Math.max(a.box.top,b.box.top),JSON.stringify({a,b})).toBe(false);
 expect(identity(await save(page))).toEqual(before);
});
