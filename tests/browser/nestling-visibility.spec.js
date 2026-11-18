import {test,expect} from '@playwright/test';
import {createWorld,createBird,validateWorld,economyToken} from '../../src/engine.js';
import {encounterSystem} from '../../src/encounters.js';
const NOW=Date.UTC(2026,10,18,9),MINUTE=60000;
async function record(page,world){return page.evaluate(world=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('world',world?'readwrite':'readonly'),q=world?tx.objectStore('world').put(world,'current'):tx.objectStore('world').get('current');tx.oncomplete=()=>{db.close();resolve(world||q.result)};tx.onerror=()=>reject(tx.error)};}),world);}
const identity=w=>({worldId:w.worldId,tick:w.tick,nextBird:w.nextBird,seed:w.seed,birds:w.birds,events:w.events,journal:w.journal,economy:w.economy,decor:w.decor,protagonist:w.protagonist});
async function dismissWelcome(page){const close=page.locator('#game-welcome-close');if(await close.isVisible())await close.click();await expect(page.locator('.game-welcome')).toHaveCount(0);}
async function ready(page){await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');}
async function start(page,w){await page.emulateMedia({reducedMotion:'reduce'});await page.addInitScript(now=>{Date.now=()=>Number(sessionStorage.getItem('nestling-test-now')||now);localStorage.setItem('buncho.music.v1','{"enabled":false}');localStorage.setItem('buncho.care-sound-choice.v1','{"explicit":true,"enabled":false}');},NOW);await page.goto('');await record(page,validateWorld(w));await page.goto('game/');await ready(page);}
async function fullyInside(page,id){
 const bird=page.locator(`.game-main .game-room-bird[data-bird-id="${id}"]`);await expect(bird).toHaveCount(1);
 // Nest labels would be larger than the nestlings and obscure their siblings.
 // The picker and care sheet still provide names; no label may cover the brood.
 if(await bird.evaluate(el=>el.classList.contains('game-nestling'))){
  await expect(bird.locator(':scope > .game-home-role')).toBeHidden();
  const blockers=await bird.evaluate(el=>{const r=el.querySelector('.game-sprite').getBoundingClientRect();return [...el.closest('.game-room').querySelectorAll('.game-nestling > .game-home-role')].filter(label=>{if(!label.getClientRects().length)return false;const b=label.getBoundingClientRect();return Math.min(r.right,b.right)>Math.max(r.left,b.left)&&Math.min(r.bottom,b.bottom)>Math.max(r.top,b.top);}).length;});
  expect(blockers,'no sibling nest label covers this egg/chick').toBe(0);
 }

 await expect(async()=>{const b=await bird.boundingBox(),r=await page.locator('.game-main').boundingBox();expect(b).not.toBeNull();expect(b.width).toBeGreaterThan(0);expect(b.x).toBeGreaterThanOrEqual(Math.max(r.x,0)-1);expect(b.y).toBeGreaterThanOrEqual(Math.max(r.y,0)-1);expect(b.x+b.width).toBeLessThanOrEqual(Math.min(r.x+r.width,page.viewportSize().width)+1);expect(b.y+b.height).toBeLessThanOrEqual(Math.min(r.y+r.height,page.viewportSize().height)+1);}).toPass();
}
async function select(page,id){const toggle=page.locator('.game-scene-controls-toggle');if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();const face=page.locator('.game-scene-toolbar .game-bird-carousel-face');for(let i=0;i<12&&await face.getAttribute('data-bird-id')!==id;i++)await page.locator('.game-scene-toolbar [data-bird-step="1"]').click();await expect(face).toHaveAttribute('data-bird-id',id);}
for(const count of [1,9])test(`unselected ${count} nestlings and selected adult remain fully in the camera`,async({page},info)=>{
 const w=createWorld(NOW,541);w.paused=true;w.settings.motion=false;w.settings.careSound=false;const adult=w.birds[0];const young=Array.from({length:count},(_,i)=>createBird(w,{home:'resident',stage:i%2?'egg':'chick',name:`こども${i+1}`}));await page.setViewportSize({width:393,height:852});await start(page,w);const before=identity(await record(page));
 for(const [width,height]of [[393,852],[320,568],[600,1000],[768,1024],[1280,720],[844,390],[320,480]]){
  await page.setViewportSize({width,height});await expect(page.locator('.game-scene-toolbar .game-bird-carousel-face')).toHaveAttribute('data-bird-id',adult.id);
  for(const b of [adult,...young])await fullyInside(page,b.id);
  await select(page,young[0].id);for(const b of young)await fullyInside(page,b.id);
  await select(page,adult.id);for(const b of [adult,...young])await fullyInside(page,b.id);
  await page.locator('.game-scene-controls-toggle').click();for(const b of [adult,...young])await fullyInside(page,b.id);
  await info.attach(`unselected-nestlings-${width}-${height}`,{body:await page.screenshot(),contentType:'image/png'});
  expect(identity(await record(page))).toEqual(before);
 }
 await page.reload();await ready(page);for(const b of [adult,...young])await fullyInside(page,b.id);expect(identity(await record(page))).toEqual(before);
});
test('real hatch on resume stays visible without selecting the newborn',async({page},info)=>{
 await page.setViewportSize({width:393,height:852});const w=createWorld(NOW,542);w.settings.motion=false;w.settings.careSound=false;const father=createBird(w,{home:'resident',sex:'male'}),child=createBird(w,{home:'resident',stage:'egg',parents:[w.birds[0].id,father.id],generation:1});await start(page,w);await fullyInside(page,child.id);
 await page.evaluate(now=>sessionStorage.setItem('nestling-test-now',String(now)),NOW+336*MINUTE);await page.reload();await ready(page);
 await expect(page.locator(`.game-room-bird[data-bird-id="${child.id}"] .game-sprite`)).toHaveAttribute('data-stage','chick');await dismissWelcome(page);await expect(page.locator('.game-scene-toolbar .game-bird-carousel-face')).toHaveAttribute('data-bird-id',w.birds[0].id);await fullyInside(page,child.id);await fullyInside(page,w.birds[0].id);
 const saved=validateWorld(await record(page)),born=saved.birds.find(b=>b.id===child.id);expect(born.parents).toEqual(child.parents);expect(born.name).toBe(child.name);expect(saved.journal.filter(e=>e.kind==='hatch'&&e.ids[0]===child.id)).toHaveLength(1);
 await info.attach('actual-hatch-with-parent-selected',{body:await page.screenshot(),contentType:'image/png'});
 await page.reload();await ready(page);await fullyInside(page,child.id);expect(identity(await record(page))).toEqual(identity(saved));
});

test('live polling hatches and fledges without a camera selection or reload',async({page},info)=>{
 await page.setViewportSize({width:393,height:852});const w=createWorld(NOW,543);w.settings.motion=false;w.settings.careSound=false;const child=createBird(w,{home:'resident',stage:'egg'});await start(page,w);const art=page.locator(`.game-room-bird[data-bird-id="${child.id}"] .game-sprite`),room=page.locator('.game-main .game-room');
 await expect(art).toHaveAttribute('data-stage','egg');await fullyInside(page,child.id);
 await page.evaluate(now=>sessionStorage.setItem('nestling-test-now',String(now)),NOW+336*MINUTE);
 await expect(art).toHaveAttribute('data-stage','chick',{timeout:20000});await dismissWelcome(page);await fullyInside(page,child.id);await fullyInside(page,w.birds[0].id);await expect(room).toHaveAttribute('data-has-nestlings','true');
 await info.attach('live-hatch-parent-selected',{body:await page.screenshot(),contentType:'image/png'});
 await page.evaluate(now=>sessionStorage.setItem('nestling-test-now',String(now)),NOW+1008*MINUTE);
 await expect(art).toHaveAttribute('data-stage','juvenile',{timeout:20000});await dismissWelcome(page);await expect(room).toHaveAttribute('data-has-nestlings','false');await fullyInside(page,child.id);await fullyInside(page,w.birds[0].id);
 const geometry=await room.evaluate(el=>{const r=el.getBoundingClientRect();return{center:r.left+r.width/2,viewport:innerWidth}});expect(geometry.center).toBeCloseTo(geometry.viewport/2,0);
 const saved=validateWorld(await record(page));expect(saved.journal.filter(e=>e.ids[0]===child.id&&e.kind==='hatch')).toHaveLength(1);expect(saved.journal.filter(e=>e.ids[0]===child.id&&e.kind==='grow')).toHaveLength(1);expect(saved.birds.find(b=>b.id===child.id).name).toBe(child.name);
});
for(const count of [2,6])test(`compact nest camera keeps ${count} cage guests and parent on screen`,async({page},info)=>{
 const w=createWorld(NOW,544);w.paused=true;w.settings.motion=false;w.settings.careSound=false;const young=Array.from({length:3},()=>createBird(w,{home:'resident',stage:'chick'}));
 for(const e of encounterSystem.catalog.slice(0,count)){w.encounters.discoveries.push({id:e.id,firstTick:0,lastTick:0,visits:10,instanceId:w.encounters.nextId++});encounterSystem.inviteCage(w,e.id,economyToken(w));}
 await page.setViewportSize({width:844,height:390});await start(page,w);const before=identity(await record(page));
 for(const size of [{width:844,height:390},{width:320,height:480}]){
  await page.setViewportSize(size);for(const b of [w.birds[0],...young])await fullyInside(page,b.id);await expect(page.locator('[data-cage-guest]')).toHaveCount(count);
  await expect(async()=>{const guests=await page.locator('[data-cage-guest]').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom}}));for(const g of guests){expect(g.x).toBeGreaterThanOrEqual(-1);expect(g.y).toBeGreaterThanOrEqual(-1);expect(g.right).toBeLessThanOrEqual(size.width+1);expect(g.bottom).toBeLessThanOrEqual(size.height+1);}}).toPass();
  await info.attach(`nest-and-guests-${size.width}`,{body:await page.screenshot(),contentType:'image/png'});expect(identity(await record(page))).toEqual(before);
 }
});
