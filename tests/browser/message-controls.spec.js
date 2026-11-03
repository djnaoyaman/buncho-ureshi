import { test, expect } from '@playwright/test';
import { createWorld, advanceTicks, validateWorld } from '../../src/engine.js';

const now=Date.UTC(2026,10,2,12),DB='buncho-ureshi-garden-v1';
async function seed(page,{friend=false}={}){
  const world=createWorld(now,814);if(friend){advanceTicks(world,1);world.birds[1].home='departed';}world.paused=true;world.settings.careSound=false;
  await page.goto('');
  await page.evaluate(async({DB,world})=>{
    localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));
    localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));
    await new Promise((resolve,reject)=>{
      const open=indexedDB.open(DB,1);open.onupgradeneeded=()=>open.result.createObjectStore('world');open.onerror=()=>reject(open.error);
      open.onsuccess=()=>{const db=open.result,tx=db.transaction('world','readwrite');tx.objectStore('world').put(world,'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};};
    });
  },{DB,world:validateWorld(world)});
  await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
  await page.locator('.game-scene-controls-toggle').click();
  await page.locator('.game-bottom-dock [data-game-open-menu]').click();
  await page.locator('.game-secondary-menu [data-game-panel="settings"]').click();
  await page.locator('[data-game-details="management"] > summary').click();
  return world;
}

for(const viewport of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:768,height:1024},{width:1440,height:900}]){
  test(`save feedback keeps navigation usable at ${viewport.width}x${viewport.height}`,async({page},info)=>{
    await page.setViewportSize(viewport);await page.addInitScript(time=>{Date.now=()=>time;},now);
    await page.route(/youtube|youtu\.be|googlevideo|ytimg/i,route=>route.abort());
    for(const valid of [true,false]){
      const world=await seed(page);world.worldId+='-import';
      if(valid)page.once('dialog',dialog=>dialog.accept());
      await page.locator('#game-import').setInputFiles({name:'feedback.json',mimeType:'application/json',buffer:Buffer.from(valid?JSON.stringify(world):'{invalid json')});
      const message=page.locator('.game-main > .game-message');
      await expect(message).toContainText(valid?'復元しました':'今の保存はそのまま');
      await page.locator('[data-game-close-panel]').click();
      await expect(message).toBeVisible();await expect(message).toHaveAttribute('role','status');
      await expect(message.locator('a,button,input,select,textarea,[tabindex]')).toHaveCount(0);
      await expect(message).toHaveCSS('pointer-events','none');
      await info.attach(`${valid?'success':'error'}-${viewport.width}x${viewport.height}`,{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
      // Real pointer clicks, not force/evaluate, prove the status layer cannot steal navigation.
      await page.locator('.game-field-nav [data-field-travel="home"]').click();
      await page.locator('.game-field-nav [data-game-panel="friends"]').click();
      await expect(page.locator('.game-panel-overlay')).toBeVisible();
      await page.locator('[data-game-close-panel]').click();
      await expect(page.locator('.game-panel-overlay')).not.toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    }
  });
  test(`friend invitation feedback keeps Home usable at ${viewport.width}x${viewport.height}`,async({page},info)=>{
    await page.setViewportSize(viewport);await page.addInitScript(time=>{Date.now=()=>time;},now);
    await page.route(/youtube|youtu\.be|googlevideo|ytimg/i,route=>route.abort());
    const world=await seed(page,{friend:true}),friend=world.birds[1];
    await page.locator('[data-game-close-panel]').click();
    await page.locator('.game-field-nav [data-game-panel="friends"]').click();
    await page.locator(`[data-field-invite="${friend.id}"]`).click();
    const message=page.locator('.game-main > .game-message');
    await expect(message).toContainText(`${friend.name}を招いたよ`);
    await page.locator('[data-game-close-panel]').click();
    await expect(message).toBeVisible();await expect(message).toHaveCSS('pointer-events','none');
    await info.attach(`invited-${viewport.width}x${viewport.height}`,{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
    await page.locator('.game-field-nav [data-field-travel="home"]').click();
    await expect(page.locator(`.game-room [data-bird-id="${friend.id}"]`)).toHaveCount(1);
    await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
    await expect(page.locator(`.game-room [data-bird-id="${friend.id}"]`)).toHaveCount(1);
  });

}
