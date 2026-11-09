import {test,expect} from '@playwright/test';
import {createWorld,createBird,travelTo} from '../../src/engine.js';
import {friendCage} from '../../src/friend-cages.js';
const now=1794182400000;
async function record(page,world){return page.evaluate(world=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onsuccess=()=>{const d=r.result,t=d.transaction('world',world?'readwrite':'readonly'),q=world?t.objectStore('world').put(world,'current'):t.objectStore('world').get('current');t.oncomplete=()=>{d.close();resolve(q.result)};t.onerror=()=>reject(t.error)};}),world);}
for(const [width,height] of [[320,568],[390,844],[844,390],[1440,900]])test(`nine friend cages keep identity and usable birds ${width}`,async({page})=>{
 test.setTimeout(90000);await page.setViewportSize({width,height});await page.addInitScript(n=>{Date.now=()=>n;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));},now);await page.goto('');
 const w=createWorld(now);w.paused=true;const byCage=new Map();for(let i=0;i<90;i++){const b=createBird(w,{home:'departed'});byCage.set(friendCage(w,b.id).id,b);}expect(byCage.size).toBe(9);
 for(const [id,b] of byCage){travelTo(w,'friend',b.id);await record(page,w);await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await expect(page.locator('.game-room')).toHaveAttribute('data-friend-cage',String(id));await expect(page.locator('.game-habitat img')).toHaveJSProperty('complete',true);expect(await page.locator('.game-habitat img').evaluate(el=>el.naturalWidth)).toBeGreaterThan(1000);await page.locator('.game-room-bird.is-selected').click({trial:true});expect((await record(page)).birds).toEqual(w.birds);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
 await page.reload();await expect(page.locator('.game-room')).toHaveAttribute('data-friend-cage',String(friendCage(w,w.field.hostId).id));
});
