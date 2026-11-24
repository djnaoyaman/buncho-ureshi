import {test,expect} from '@playwright/test';
import {createWorld,createBird,travelTo,validateWorld} from '../../src/engine.js';
import {friendCage} from '../../src/friend-cages.js';
const NOW=Date.UTC(2026,10,18,9), ROOM='.game-main .game-room';
test.use({hasTouch:true});
const saved=(page,w)=>page.evaluate(world=>new Promise((res,rej)=>{
 const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onerror=()=>rej(r.error);
 r.onsuccess=()=>{const d=r.result,t=d.transaction('world',world?'readwrite':'readonly'),store=t.objectStore('world'),q=world?store.put(world,'current'):store.get('current');t.oncomplete=()=>{d.close();res(q.result)};t.onerror=()=>rej(t.error)};
}),w);
const view=page=>page.evaluate(sel=>{
 const room=document.querySelector(sel),image=room.querySelector('.game-habitat img'),r=room.getBoundingClientRect(),dock=document.querySelector('.game-scene-controls-toggle').getBoundingClientRect(),bird=room.querySelector('.game-room-bird.is-selected');
 return {x:r.left,right:r.right,width:r.width,screen:innerWidth,source:image.currentSrc,decoded:image.complete&&image.naturalWidth,hit:bird?.getBoundingClientRect().left,dock:dock.toJSON()};
},ROOM);
const drag=async(page,width,dir)=>{
 const a=38,b=width-38,x=dir>0?a:b,target=dir>0?b:a;
 const y=await page.evaluate(({sel,x,target})=>[211,232,273,340,411].find(y=>[x,target].every(x=>{
  const e=document.elementFromPoint(x,y);return e?.closest(sel)&&!e.closest('button,a,input,select,textarea');
 })),{sel:ROOM,x,target});
 expect(y,'both gesture endpoints are real uncovered scene').toBeDefined();
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(target,y,{steps:12});await page.mouse.up();
};
for(const [width,height] of [[320,568],[390,844]])test(`only Bauhaus pans and returns without save or visit changes at ${width}`,async({page})=>{
 await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(n=>{Date.now=()=>n;localStorage.setItem('buncho.music.v1','{"enabled":false}');localStorage.setItem('buncho.care-sound-choice.v1','{"explicit":true,"enabled":false}');},NOW);
 await page.goto('');
 const w=createWorld(NOW,2026);w.paused=true;w.settings.motion=false;let first,second;
 for(let i=0;i<80&&(!first||!second);i++){const b=createBird(w,{home:'departed',stage:'adult'}),id=friendCage(w,b.id).id;if(id===1)first??=b;if(id===2)second??=b;}
 expect(first&&second).toBeTruthy();travelTo(w,'friend',first.id);await saved(page,validateWorld(w));await page.goto('game/');
 await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 if(await page.locator('#game-welcome-close').isVisible())await page.locator('#game-welcome-close').click();
 const room=page.locator(ROOM),reset=page.locator('[data-home-camera-reset]');await expect(room).toHaveAttribute('data-friend-cage','1');
 await expect.poll(async()=>(await view(page)).decoded).toBeGreaterThan(1000);
 const before=await saved(page),start=await view(page);
 expect(start.source).toMatch(/friend-cages\/cage-01-v1\.webp/);expect(start.x).toBeCloseTo((width-start.width)/2,0);
 await expect(room.locator('.game-nestling')).toHaveCount(0);await expect(reset).toBeHidden();
 for(let i=0;i<4;i++)await drag(page,width,1);
 const left=await view(page);expect(left.x).toBeCloseTo(0,0);expect(left.dock).toEqual(start.dock);expect(left.hit-start.hit).toBeCloseTo(left.x-start.x,0);
 for(let i=0;i<5;i++)await drag(page,width,-1);
 const right=await view(page);expect(right.right).toBeCloseTo(width,0);expect(right.dock).toEqual(start.dock);
 await expect(reset).toHaveText('元の位置へ');await reset.tap();expect((await view(page)).x).toBeCloseTo(start.x,0);
 await room.locator('.game-room-bird.is-selected').tap();await expect(page.locator('.game-bird-sheet[open]')).toBeVisible();
 expect(await saved(page)).toEqual(before);
 await page.keyboard.press('Escape');await expect(page.locator('.game-bird-sheet[open]')).toHaveCount(0);
 await drag(page,width,1);await expect(reset).toBeVisible();
 const nav=page.locator('.game-main [data-field-travel=home]');
 if(!await nav.isVisible())await page.locator('.game-scene-controls-toggle').tap();
 await nav.tap();await expect(room).toHaveAttribute('data-field','home');await expect(reset).toBeHidden();
 expect(await saved(page)).toMatchObject({field:{place:'home'},birds:before.birds});
 // Load an existing different cage via the ordinary startup route. Its fixed
 // centered artwork must neither inherit the pilot offset nor receive controls.
 const other=await saved(page);travelTo(other,'friend',second.id);await saved(page,validateWorld(other));await page.reload();
 await expect(room).toHaveAttribute('data-friend-cage','2');await expect(reset).toHaveCount(0);
 const unmodified=await view(page);await drag(page,width,1);expect((await view(page)).x).toBeCloseTo(unmodified.x,0);
 expect((await saved(page)).birds).toEqual(before.birds);
});
