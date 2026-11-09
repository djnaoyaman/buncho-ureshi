import {test,expect} from '@playwright/test';
import {createWorld,createBird,travelTo,DECOR_SLOTS,DECOR_COLORS,DECOR_TIERS} from '../../src/engine.js';
const now=Date.UTC(2026,10,4,5),dbName='buncho-ureshi-garden-v1';
async function record(page,world){return page.evaluate(({world,dbName})=>new Promise((resolve,reject)=>{const open=indexedDB.open(dbName,1);open.onupgradeneeded=()=>open.result.createObjectStore('world');open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,tx=db.transaction('world',world?'readwrite':'readonly'),store=tx.objectStore('world'),req=world?store.put(world,'current'):store.get('current');tx.oncomplete=()=>{db.close();resolve(req.result)};tx.onerror=()=>reject(tx.error)}}),{world,dbName});}
function furnished(tier='cozy',form=0){const w=createWorld(now);w.paused=true;w.decor.lifetimePoints=9999;w.decor.inventory=DECOR_SLOTS.flatMap(s=>DECOR_COLORS.flatMap(c=>DECOR_TIERS.map(t=>({id:`${s.id}-${c.id}-${t.id}`,slot:s.id,color:c.id,tier:t.id}))));for(const [i,s] of DECOR_SLOTS.entries())w.decor.equipped[s.id]=`${s.id}-${DECOR_COLORS[(form+i)%8].id}-${tier}`;return w;}
async function inspect(page){
 await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 if(await page.locator('.game-room').getAttribute('data-field')==='friend'){
  await expect(page.locator('.game-room')).toHaveAttribute('data-friend-cage',/^[1-9]$/);
  await expect(page.locator('.game-room .game-furnishings')).toHaveCount(0);
  await expect(page.locator('.game-habitat img')).toHaveJSProperty('complete',true);
  await page.locator('.game-room-bird.is-selected').click({trial:true});return {};
 }
 await expect(page.locator('.game-room [data-scene-mount="wall"]')).toHaveCount(4);
 const geometry=await page.evaluate(()=>{const room=document.querySelector('.game-room'),r=room.getBoundingClientRect(),items={};for(const el of room.querySelectorAll('.game-furnishing')){const box=el.getBoundingClientRect();items[el.dataset.equippedSlot]={x:box.x,y:box.y,right:box.right,bottom:box.bottom,width:box.width,height:box.height,mount:el.querySelector('svg').dataset.sceneMount,pointer:getComputedStyle(el).pointerEvents,anchor:parseFloat(getComputedStyle(el).top)};}return{items,viewport:{width:innerWidth,height:innerHeight},room:{y:r.y,height:r.height}};});
 const {items,viewport}=geometry;
 for(const [slot,item] of Object.entries(items)){
  expect(item.pointer,slot).toBe('none');
  if(slot==='paper')continue;
  expect(item.x,slot).toBeGreaterThanOrEqual(-1);expect(item.right,slot).toBeLessThanOrEqual(viewport.width+1);
  expect(item.y,slot).toBeGreaterThanOrEqual(-1);expect(item.bottom,slot).toBeLessThan(viewport.height);
 }
 for(const slot of ['feed','water','greens','shellgrit']){expect(items[slot].mount).toBe('wall');expect(items[slot].bottom).toBeLessThan(items.bath.bottom-Math.min(geometry.room.height,viewport.height)*.1);}
 if(viewport.width>600&&viewport.width/viewport.height>=2)expect(Math.abs(items.perch.anchor/geometry.room.height-.592)).toBeLessThan(.003);
 expect(items.shellgrit.bottom).toBeLessThan(items.bath.y);
 expect(items.perch.y).toBeLessThan(items.feed.bottom);expect(items.swing.y).toBeLessThan(items.perch.y);expect(items.toy.y).toBeLessThan(items.feed.y);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 return geometry;
}
for(const [width,height] of [[320,568],[390,844],[320,844],[768,1024],[1280,800],[1280,600],[1280,500],[1440,500],[1920,600],[844,390]])test(`physical cage mounts remain visible ${width}x${height}`,async({page},info)=>{
 test.setTimeout(90000);await page.setViewportSize({width,height});await page.addInitScript(n=>{Date.now=()=>n;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},now);await page.goto('');
 for(const [i,tier] of DECOR_TIERS.entries()){
  const world=furnished(tier.id,i*3);await record(page,world);await page.goto('game/');const geometry=await inspect(page);
  await info.attach(`${tier.id}-${width}-geometry`,{body:JSON.stringify(geometry,null,2),contentType:'application/json'});
  await page.screenshot({path:info.outputPath(`${tier.id}-${width}-cage.png`)});
  const bird=page.locator('.game-room-bird.is-selected');await bird.click({trial:true});
  const saved=await record(page);expect(saved.decor.inventory).toEqual(world.decor.inventory);expect(saved.decor.equipped).toEqual(world.decor.equipped);expect(saved.birds).toEqual(world.birds);
 }
});
test('friend rooms and atelier keep mounts through preview cancel equip and reload',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.addInitScript(n=>Date.now=()=>n,now);await page.goto('');
 const world=furnished();const friend=createBird(world,{home:'departed',sex:'male'});travelTo(world,'friend',friend.id);await record(page,world);await page.goto('game/');await inspect(page);await page.screenshot({path:info.outputPath('friend-cage.png')});
 if(await page.locator('.game-scene-controls-toggle').getAttribute('aria-expanded')==='false')await page.locator('.game-scene-controls-toggle').click();await page.locator('.game-bottom-dock [data-game-panel="decorate"]').click();
 const initial=world.decor.equipped.water,target='water-lavender-cozy';await page.locator('[data-decor-slot="water"]').click();await page.locator(`[data-decor-preview="${target}"]`).click();
 await expect(page.locator(`.game-room-preview [data-equipped-item="${target}"] [data-scene-mount="wall"]`)).toHaveCount(1);
 expect((await record(page)).decor.equipped.water).toBe(initial);await page.locator('[data-decor-cancel]').click();expect((await record(page)).decor.equipped.water).toBe(initial);
 await page.locator(`[data-decor-preview="${target}"]`).click();await page.locator(`[data-decor-equip="${target}"]`).click();await expect(page.locator('.game-overlay-message')).toContainText('飾ったよ');await expect.poll(async()=>(await record(page)).decor.equipped.water).toBe(target);await page.reload();expect((await record(page)).decor.equipped.water).toBe(target);await inspect(page);
 if(await page.locator('.game-scene-controls-toggle').getAttribute('aria-expanded')==='false')await page.locator('.game-scene-controls-toggle').click();await page.locator('.game-field-nav [data-field-travel=home]').click();await expect(page.locator('.game-room')).toHaveAttribute('data-field','home');await expect(page.locator(`.game-room [data-equipped-item="${target}"] [data-scene-mount="wall"]`)).toHaveCount(1);await inspect(page);
});
