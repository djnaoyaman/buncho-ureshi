import {test,expect} from '@playwright/test';
import {createWorld,createBird,validateWorld} from '../../src/engine.js';
import {fieldPositions} from '../../src/field-visuals.js';
const now=Date.UTC(2026,10,2,12),DB='buncho-ureshi-garden-v1';
async function seed(page,count){
 await page.addInitScript(now=>{Date.now=()=>now;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},now);
 const world=createWorld(now);world.paused=true;world.settings.motion=false;
 while(world.birds.length<count)createBird(world,{home:'resident',stage:'adult'});
 validateWorld(world);await page.goto('');
 await page.evaluate(({DB,world})=>new Promise((resolve,reject)=>{const o=indexedDB.open(DB,1);o.onupgradeneeded=()=>o.result.createObjectStore('world');o.onerror=()=>reject(o.error);o.onsuccess=()=>{const db=o.result,tx=db.transaction('world','readwrite');tx.objectStore('world').put(world,'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};}),{DB,world});
 await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await page.locator('.game-scene-controls-toggle').click();return world;
}
for(const count of [1,10])test(`full window and bird anchors survive wide and rotated viewports with ${count} birds`,async({page},info)=>{
 test.setTimeout(120000);await page.setViewportSize({width:1440,height:1800});const world=await seed(page,count);
 for(const [width,height] of [[1440,1800],[1440,900],[1920,1080],[2560,1440],[390,844],[844,390],[1440,900]]){
  await page.setViewportSize({width,height});const compact=height<=500;
  await expect(page.locator('.game-room')).toHaveAttribute('data-compact',String(compact));
  await expect(page.locator('.game-room-bird')).toHaveCount(compact?1:count);
  const selected=await page.locator('.game-bird-carousel-face').getAttribute('data-bird-id');
  const birds=compact?world.birds.filter(b=>b.id===selected):world.birds;
  const positions=Object.fromEntries(fieldPositions(birds,width<=600?'tall':'wide','home'));
  await expect.poll(()=>page.evaluate(({positions,compact})=>{
   const errors=[],frame=document.querySelector('.game-main').getBoundingClientRect(),room=document.querySelector('.game-room').getBoundingClientRect();
   for(const selector of ['#main','#game-root','.game-app','.game-main']){const r=document.querySelector(selector).getBoundingClientRect();if(Math.abs(r.left)>1||Math.abs(r.top)>1||Math.abs(r.width-innerWidth)>1||Math.abs(r.height-innerHeight)>1)errors.push(`${selector} does not fill ${innerWidth}x${innerHeight}: ${JSON.stringify(r.toJSON())}`);}
   const image=document.querySelector('.game-habitat img'),back=image.getBoundingClientRect();
   if(!image.complete||!image.naturalWidth)errors.push('background not decoded');
   if(back.left>1||back.top>1||back.right<innerWidth-1||back.bottom<innerHeight-1)errors.push('background leaves an empty viewport band');
   if(image.naturalWidth&&Math.abs(back.width/back.height-image.naturalWidth/image.naturalHeight)>.01)errors.push('background stretched');
   for(const bird of document.querySelectorAll('.game-room-bird')){
    const plane=bird.querySelector('.game-sprite').getBoundingClientRect(),p=positions[bird.dataset.birdId];
    const foot={x:plane.left+plane.width*.54,y:plane.top+plane.height*.975},anchor={x:frame.left+frame.width*(compact?.5:p.x),y:room.top+room.height*p.y};
    if(Math.abs(foot.x-anchor.x)>2||Math.abs(foot.y-anchor.y)>2)errors.push(`${bird.dataset.birdId}: ${JSON.stringify({foot,anchor})}`);
   }
   if(document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1)errors.push('page overflow');
   return errors;
  },{positions,compact})).toEqual([]);
  if(width===1440)await info.attach(`wide-${count}-${width}x${height}`,{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
 }
 // Real clicks ensure the corrected viewport projection also matches hit targets.
 for(const bird of world.birds){await page.locator(`.game-room-bird[data-bird-id="${bird.id}"]`).click();await expect(page.locator('#game-sheet-title')).toHaveText(bird.name);await page.locator('[data-game-close-bird]').click();await expect(page.locator(`.game-room-bird[data-bird-id="${bird.id}"]`)).toBeFocused();}
 await page.locator('.game-world-exit').click();await expect(page.locator('body')).not.toHaveAttribute('data-world','buncho');await expect(page.locator('h1').first()).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 expect(await page.locator('.game-main').evaluate(el=>Math.abs(el.getBoundingClientRect().width-innerWidth))).toBeLessThanOrEqual(1);
});
