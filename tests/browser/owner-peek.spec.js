import {test,expect} from '@playwright/test';

async function settings(page){
 const toggle=page.locator('.game-scene-controls-toggle');
 if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
 await page.locator('[data-game-open-menu]').click();
 await page.locator('.game-secondary-menu [data-game-panel=settings]').click();
}
const human=page=>page.locator('.game-owner-companion,.owner-peek,.owner-portrait-art,.buncho-owner-avatar');

test('human is absent from scenes and retained in settings at every viewport',async({page},info)=>{
 for(const [width,height] of [[390,844],[844,390],[1280,800]]){
  await page.setViewportSize({width,height});await page.goto('');
  await page.evaluate(()=>localStorage.setItem('buncho.owner-profile.v1',JSON.stringify({version:1,name:'A',hair:'bun',skin:'honey',hairColor:'rose',outfit:'overalls',palette:'sakura',accessory:'beret',eyes:'bright',face:'oval'})));
  await page.goto('game/');await expect(page.locator('.game-logo-intro')).toBeHidden();
  await expect(human(page)).toHaveCount(0);await expect(page.locator('.game-room-bird').first()).toBeVisible();
  await page.screenshot({path:info.outputPath(`scene-without-human-${width}.png`)});
  await settings(page);
  const art=page.locator('.game-owner-setting .owner-portrait-art');
  await expect(art).toBeVisible();await expect(art).toHaveAttribute('data-hair-color','#8f6265');await expect(art).toHaveAttribute('data-skin-color','#c8946e');
  await expect(page.locator('.game-owner-companion')).toHaveCount(0);
  await page.screenshot({path:info.outputPath(`settings-portrait-${width}.png`)});
  await page.locator('[data-game-close-panel]').click();await expect(human(page)).toHaveCount(0);
  await page.emulateMedia({reducedMotion:'reduce'});await expect(human(page)).toHaveCount(0);
  await page.emulateMedia({reducedMotion:'no-preference'});
 }
});

test('settings portrait keeps each saved hairstyle and outfit',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('');
 const hairs=['crop','bob','wave','bun','sweep'],outfits=['apron','cardigan','smock','dress','overalls'];
 for(let i=0;i<hairs.length;i++){
  await page.evaluate(({hair,outfit})=>localStorage.setItem('buncho.owner-profile.v1',JSON.stringify({version:1,hair,outfit,skin:'peach',hairColor:'chestnut',palette:'leaf',accessory:'none',eyes:hair==='sweep'?'smile':'gentle',face:hair==='sweep'?'soft':'round'})),{hair:hairs[i],outfit:outfits[i]});
  await page.goto('game/');await expect(page.locator('.game-logo-intro')).toBeHidden();await expect(human(page)).toHaveCount(0);
  await settings(page);const art=page.locator('.game-owner-setting .owner-portrait-art');
  await expect(art).toHaveAttribute('data-hair',hairs[i]);await expect(art).toHaveAttribute('data-outfit',outfits[i]);
  await page.screenshot({path:info.outputPath(`settings-variant-${i}.png`)});
 }
});

test('wardrobe saves the chosen look only to settings and survives reload',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('game/');await expect(page.locator('.game-logo-intro')).toBeHidden();
 await settings(page);await page.locator('.game-owner-setting').click();const editor=page.locator('.buncho-owner-editor');await expect(editor).toBeVisible();
 const preview=editor.locator('[data-owner-preview] .owner-portrait-art');await expect(preview).toHaveAttribute('role','img');await expect(preview).toHaveAttribute('data-hair','bob');
 const ids=await editor.locator('.owner-peek-art filter').evaluateAll(nodes=>nodes.map(n=>n.id));expect(new Set(ids).size).toBe(ids.length);
 await editor.locator('[data-owner-category=hair]').click();await editor.locator('[data-owner-choice=bun]').click();await expect(preview).toHaveAttribute('data-hair','bun');
 await page.screenshot({path:info.outputPath('watercolor-wardrobe.png')});await editor.locator('[data-owner-save]').click();
 await expect(page.locator('.game-owner-setting .owner-portrait-art')).toHaveAttribute('data-hair','bun');
 await page.locator('[data-game-close-panel]').click();await expect(human(page)).toHaveCount(0);
 await page.reload();await expect(page.locator('.game-logo-intro')).toBeHidden();await expect(human(page)).toHaveCount(0);
 await settings(page);await expect(page.locator('.game-owner-setting .owner-portrait-art')).toHaveAttribute('data-hair','bun');
 await page.locator('[data-game-close-panel]').click();
 await page.locator('.game-field-nav [data-game-panel=outdoors]').click();
 await expect(page.locator('.finch-garden-stage')).toBeVisible();await expect(human(page)).toHaveCount(0);
 await expect(page.locator('[data-garden-household]')).toHaveCount(0);await expect(page.locator('.finch-garden-friend').first()).toBeVisible();
});

test('deep complexion and selected hair remain visible in settings',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('');
 await page.evaluate(()=>localStorage.setItem('buncho.owner-profile.v1',JSON.stringify({version:1,hair:'wave',skin:'deep',hairColor:'ink',outfit:'cardigan',palette:'silver',accessory:'none',eyes:'bright',face:'oval'})));
 await page.goto('game/');await expect(page.locator('.game-logo-intro')).toBeHidden();await expect(human(page)).toHaveCount(0);
 await settings(page);const art=page.locator('.game-owner-setting .owner-portrait-art');await expect(art).toHaveAttribute('data-skin-color','#704a39');await expect(art).toHaveAttribute('data-hair','wave');
 await page.screenshot({path:info.outputPath('settings-deep-skin.png')});
});
