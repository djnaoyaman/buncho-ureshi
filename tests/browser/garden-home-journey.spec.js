import {test,expect} from '@playwright/test';
import {createWorld,createBird,validateWorld} from '../../src/engine.js';
const NOW=Date.UTC(2026,10,18,9), nav='.game-main .game-field-nav', room='.game-main .game-room';
test.use({hasTouch:true});
async function setup(page,width,height){
 await page.setViewportSize({width,height});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(n=>{Date.now=()=>n;localStorage.setItem('buncho.music.v1','{"enabled":false}');localStorage.setItem('buncho.care-sound-choice.v1','{"explicit":true,"enabled":false}');},NOW);
 const w=createWorld(NOW,1701);w.paused=true;w.settings.motion=false;
 w.encounters.gardenFriends.accompany=true;w.encounters.gardenFriends.companions=['b1'];
 const guest=createBird(w,{home:'departed',stage:'adult'}),chick=createBird(w,{home:'resident',stage:'chick'});
 await page.goto('');
 await page.evaluate(world=>new Promise((resolve,reject)=>{
 const req=indexedDB.open('buncho-ureshi-garden-v1',1);req.onupgradeneeded=()=>req.result.createObjectStore('world');req.onerror=()=>reject(req.error);
 req.onsuccess=()=>{const db=req.result,tx=db.transaction('world','readwrite');tx.objectStore('world').put(world,'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};
 }),validateWorld(w));
 await page.goto('game/');
 await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 if(await page.locator('#game-welcome-close').isVisible())await page.locator('#game-welcome-close').click();
 await expect(page.locator(room)).toHaveAttribute('data-field','home');
 return {guest,chick,before:validateWorld(w)};
}
async function tapNav(page,value){
 const b=page.locator(nav+' '+value);
 if(!await b.isVisible())await page.locator('.game-scene-controls-toggle').tap();
 await b.tap();
}
async function enterGarden(page){
 await tapNav(page,'[data-game-panel=outdoors]');
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
}
async function closeGarden(page){await page.locator('.game-panel-overlay[open] [data-game-close-panel]').tap();await expect(page.locator('.game-app')).toHaveAttribute('data-panel','garden');}
async function friend(page,id){await tapNav(page,'[data-game-panel=friends]');await page.locator('[data-field-travel=friend][data-field-host="'+id+'"]').tap();await expect(page.locator(room)).toHaveAttribute('data-field','friend');}
const snap=page=>page.locator(room).evaluate(e=>({shift:e.style.getPropertyValue('--home-camera-delta'),field:e.dataset.field,x:e.getBoundingClientRect().left,y:e.getBoundingClientRect().top,chick:[...e.querySelectorAll('.game-nestling')].map(n=>({id:n.dataset.birdId,l:n.getBoundingClientRect().left,r:n.getBoundingClientRect().right})),birds:[...e.querySelectorAll('.game-room-bird')].map(n=>n.dataset.birdId)}));

const nativeBirdPoint=element=>{
 const r=element.getBoundingClientRect();
 for(const fy of [.5,.3,.7,.18,.82])for(const fx of [.5,.3,.7,.18,.82]){
  const x=r.x+r.width*fx,y=r.y+r.height*fy;
  if(element.contains(document.elementFromPoint(x,y)))return {x,y};
 }
 return null;
};
async function dragFromBird(page,width){
 const b=page.locator(room+' .game-room-bird.is-selected');
 await expect.poll(()=>b.evaluate(nativeBirdPoint),'native hit on the selected bird').not.toBeNull();
 const {x,y}=await b.evaluate(nativeBirdPoint);
 const target=x<width/2?width-5:5;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(target,y,{steps:12});await page.mouse.up();
 await expect(page.locator('.game-bird-sheet[open]')).toHaveCount(0);
 await expect(page.locator('[data-home-camera-reset]')).toBeVisible();
}
for(const [width,height] of [[320,568],[390,844]])test('sequential journey and both return paths '+width,async({page})=>{
 const {guest,chick,before}=await setup(page,width,height), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const first=await snap(page);await dragFromBird(page,width);
 // Pan toward left edge until nest drops out (or record extent if already at edge).
 for(let i=0;i<3;i++){
  const y=await page.evaluate(w=>[170,205,230,260,290,320,365].find(y=>[25,w-25].every(x=>document.elementFromPoint(x,y)?.closest('.game-room')===document.querySelector('.game-main .game-room'))),width);
  if(y===undefined)break;
  await page.mouse.move(25,y);await page.mouse.down();await page.mouse.move(width-25,y,{steps:12});await page.mouse.up();
 }
 const panned=await snap(page);expect(panned.shift).not.toBe(first.shift);await enterGarden(page);
 await expect(page.locator('.finch-garden-stage [data-garden-household=b1]')).toBeVisible();
 await closeGarden(page);const direct=await snap(page);
 await friend(page,guest.id);
 // On a short screen the expanded bird-picker covers the perched friend.
 // Use the actual "look closely" control before starting a bird gesture.
 const chrome=page.locator('.game-scene-controls-toggle');
 if(await chrome.getAttribute('aria-expanded')==='true')await chrome.tap();
 await expect(chrome).toHaveAttribute('aria-expanded','false');
 const atFriend=await snap(page);await dragFromBird(page,width);
 const pannedFriend=await snap(page);expect(pannedFriend.shift).not.toBe(atFriend.shift);
 await page.locator('[data-home-camera-reset]').tap();
 await page.locator(room+' .game-room-bird.is-selected').tap();await expect(page.locator('.game-bird-sheet[open]')).toBeVisible();
 await page.locator('#game-sheet-close').tap();
 await tapNav(page,'[data-field-travel=home]');await expect(page.locator(room)).toHaveAttribute('data-field','home');
 const throughFriend=await snap(page);
 await friend(page,guest.id);await enterGarden(page);await page.keyboard.press('Escape');
 await expect(page.locator('.game-app')).toHaveAttribute('data-panel','garden');
 await expect(page.locator(room)).toHaveAttribute('data-field','friend');
 await enterGarden(page);await closeGarden(page);
 const backFromFriendGarden=await snap(page);
 for(const returned of [direct,throughFriend,backFromFriendGarden]){
  expect(returned.field).toBe('home');
  expect(returned.shift).toBe(first.shift);
  expect(returned.x).toBeCloseTo(first.x,0);
  expect(returned.birds).toEqual(first.birds);
  const nest=returned.chick.find(x=>x.id===chick.id);
  expect(nest.l).toBeGreaterThanOrEqual(0);expect(nest.r).toBeLessThanOrEqual(width);
 }
 await expect(page.locator('[data-home-camera-reset]')).toBeHidden();
 expect(errors).toEqual([]);
 const after=await page.evaluate(()=>new Promise((resolve,reject)=>{
  const req=indexedDB.open('buncho-ureshi-garden-v1',1);req.onerror=()=>reject(req.error);
  req.onsuccess=()=>{const db=req.result,tx=db.transaction('world','readonly'),q=tx.objectStore('world').get('current');tx.oncomplete=()=>{db.close();resolve(q.result)};tx.onerror=()=>reject(tx.error);};
 }));
 expect(after.field).toMatchObject({place:'home',hostId:null});
 expect(after.birds).toEqual(before.birds);
 expect(after.economy).toEqual(before.economy);
 expect(after.decor).toEqual(before.decor);
});
