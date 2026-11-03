import {test,expect} from '@playwright/test';
test('owner is a visible foreground observer, customized and motion-aware',async({page},info)=>{
 for(const [width,height] of [[390,844],[844,390],[1280,800]]){
  await page.setViewportSize({width,height});await page.goto('');
  await page.evaluate(()=>localStorage.setItem('buncho.owner-profile.v1',JSON.stringify({version:1,name:'A',hair:'bun',skin:'honey',hairColor:'rose',outfit:'overalls',palette:'sakura',accessory:'beret',eyes:'bright',face:'oval'})));
  await page.goto('game/');await expect(page.locator('.game-owner-companion')).toBeVisible();await expect(page.locator('.game-logo-intro')).toBeHidden();
  const owner=page.locator('.game-owner-companion'), art=owner.locator('.owner-peek-art');
  await expect(art).toHaveAttribute('data-hair-color','#8f6265');await expect(art).toHaveAttribute('data-skin-color','#c8946e');
  let bounds=await owner.boundingBox();expect(bounds.width).toBeGreaterThanOrEqual(80);expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.y+bounds.height).toBeLessThanOrEqual(height);
  const toggle=await page.locator('.game-scene-controls-toggle').boundingBox();if(toggle)expect(bounds.x).toBeGreaterThanOrEqual(toggle.x+toggle.width);
  await page.screenshot({path:info.outputPath(`peek-${width}.png`)});
  if(width===390){await owner.evaluate(el=>{for(const animation of el.getAnimations({subtree:true})){animation.pause();animation.currentTime=10000;}});expect(Number(await owner.locator('.owner-peek-glance').evaluate(e=>getComputedStyle(e).opacity))).toBeGreaterThan(.9);await page.screenshot({path:info.outputPath('peek-glance.png')});}
  await page.emulateMedia({reducedMotion:'reduce'});expect(await owner.locator('.owner-peek-glance').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');await expect(owner.locator('.owner-peek-glance')).toHaveCSS('opacity','0');
  await page.emulateMedia({reducedMotion:'no-preference'});
 }
});

test('painted owner keeps each selected hairstyle and outfit',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('');
 const hairs=['crop','bob','wave','bun','sweep'],outfits=['apron','cardigan','smock','dress','overalls'];
 for(let i=0;i<hairs.length;i++){
  await page.evaluate(({hair,outfit})=>localStorage.setItem('buncho.owner-profile.v1',JSON.stringify({version:1,hair,outfit,skin:'peach',hairColor:'chestnut',palette:'leaf',accessory:'none',eyes:hair==='sweep'?'smile':'gentle',face:hair==='sweep'?'soft':'round'})),{hair:hairs[i],outfit:outfits[i]});
  await page.goto('game/');await expect(page.locator('.game-logo-intro')).toBeHidden();const art=page.locator('.owner-peek-art');await expect(art).toHaveAttribute('data-hair',hairs[i]);await expect(art).toHaveAttribute('data-outfit',outfits[i]);
  await page.screenshot({path:info.outputPath(`variant-${i}.png`)});if(i===4){await art.evaluate(el=>{for(const animation of el.getAnimations({subtree:true})){animation.pause();animation.currentTime=10000;}});await page.screenshot({path:info.outputPath('variant-smile-glance.png')});}
 }
});


test('glance naturally keeps its phase after a scene redraw',async({page},info)=>{
 await page.addInitScript(()=>{window.__ownerTestTime=1599999996000;Date.now=()=>window.__ownerTestTime;});
 await page.setViewportSize({width:390,height:844});await page.goto('game/');await expect(page.locator('.game-logo-intro')).toBeHidden();
 await expect(page.locator('.game-owner-companion')).toHaveCSS('--owner-delay','0ms');await expect(page.locator('[data-owner-birdpin]')).toBeAttached();await page.locator('.game-owner-companion').screenshot({path:info.outputPath('owner-brooch.png')});
 await page.locator('.game-scene-controls-toggle').click();await page.locator('[data-game-open-menu]').click();await page.locator('.game-secondary-menu [data-game-panel=settings]').click();
 await page.evaluate(()=>{window.__ownerTestTime=1600000006000;});await page.locator('[data-game-close-panel]').click();
 const owner=page.locator('.game-owner-companion');await expect(owner).toHaveCSS('--owner-delay','-10000ms');
 await expect.poll(async()=>Number(await owner.locator('.owner-peek-glance').evaluate(e=>getComputedStyle(e).opacity)),{timeout:1200}).toBeGreaterThan(.8);
 await page.emulateMedia({reducedMotion:'reduce'});await expect(owner.locator('.owner-peek-glance')).toHaveCSS('opacity','0');
});

test('wardrobe and scene share watercolor art and save the chosen look',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('game/');await expect(page.locator('.game-logo-intro')).toBeHidden();
 await page.locator('.game-scene-controls-toggle').click();await page.locator('[data-game-open-menu]').click();await page.locator('.game-secondary-menu [data-game-panel=settings]').click();
 await page.locator('.game-owner-setting').click();const editor=page.locator('.buncho-owner-editor');await expect(editor).toBeVisible();
 const preview=editor.locator('[data-owner-preview] .owner-portrait-art');await expect(preview).toHaveAttribute('role','img');await expect(preview).toHaveAttribute('data-hair','bob');
 const ids=await editor.locator('.owner-peek-art filter').evaluateAll(nodes=>nodes.map(n=>n.id));expect(new Set(ids).size).toBe(ids.length);
 await editor.locator('[data-owner-category=hair]').click();await editor.locator('[data-owner-choice=bun]').click();await expect(preview).toHaveAttribute('data-hair','bun');
 await page.screenshot({path:info.outputPath('watercolor-wardrobe.png')});await editor.locator('[data-owner-save]').click();await page.locator('[data-game-close-panel]').click();
 await expect(page.locator('.game-owner-companion .owner-peek-art')).toHaveAttribute('data-hair','bun');await page.screenshot({path:info.outputPath('watercolor-scene-saved.png')});
});
