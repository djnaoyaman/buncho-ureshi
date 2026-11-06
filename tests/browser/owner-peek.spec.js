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


test('direct character settings returns to its menu, discards with Back and Escape, and saves explicitly',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('game/');await expect(page.locator('.game-logo-intro')).toBeHidden();
 const toggle=page.locator('.game-scene-controls-toggle');if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
 await page.locator('[data-game-open-menu]').click();
 const entry=page.locator('#game-menu-owner');await expect(entry).toHaveText('キャラクター設定');await expect(page.locator('#game-menu-settings')).toHaveText('保存・設定');
 const editor=page.locator('.buncho-owner-editor');
 for(const exit of ['back','escape','cancel']){
  await entry.click();await expect(editor.getByRole('heading',{name:'キャラクター設定'})).toBeFocused();
  await editor.locator('[data-owner-name]').fill('まだ保存しない');await editor.locator('[data-owner-category=hair]').click();await editor.locator('[data-owner-choice=bun]').click();
  await expect(editor.locator('[data-owner-draft-state]')).toHaveText('未保存の変更があります');
  expect(await page.evaluate(()=>localStorage.getItem('buncho.owner-profile.v1'))).toBeNull();
  if(exit==='back')await page.getByRole('button',{name:'保存せずにメニューへ',exact:true}).click();
  if(exit==='escape')await page.keyboard.press('Escape');
  if(exit==='cancel')await editor.locator('[data-owner-cancel]').click();
  await expect(editor).toHaveCount(0);await expect(entry).toBeFocused();await expect(human(page)).toHaveCount(0);
 }
 await entry.click();await expect(editor.locator('[data-owner-name]')).toHaveValue('飼い主さん');
 await editor.locator('[data-owner-category=hair]').click();await editor.locator('[data-owner-choice=wave]').click();await editor.locator('[data-owner-name]').fill('保存する名前');
 // A passive game redraw must keep the live editor, not silently remount its saved state.
 await page.evaluate(()=>{
  window.ownerDraftForTest=document.querySelector('.buncho-owner-editor');
  dispatchEvent(new StorageEvent('storage',{key:'buncho.care-sound-choice.v1',newValue:JSON.stringify({explicit:true,enabled:false})}));
 });
 expect(await page.evaluate(()=>window.ownerDraftForTest===document.querySelector('.buncho-owner-editor'))).toBe(true);
 await expect(editor.locator('[data-owner-name]')).toHaveValue('保存する名前');await expect(editor.locator('[data-owner-category=hair]')).toHaveAttribute('aria-selected','true');
 await expect(editor.locator('[data-owner-choice=wave]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.game-main .owner-portrait-art,.game-owner-companion')).toHaveCount(0);
 await page.screenshot({path:info.outputPath('direct-character-settings.png')});await editor.locator('[data-owner-save]').click();
 await expect(entry).toBeFocused();await expect(human(page)).toHaveCount(0);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('buncho.owner-profile.v1')).hair)).toBe('wave');
 await entry.click();await expect(editor.locator('[data-owner-name]')).toHaveValue('保存する名前');await expect(editor.locator('[data-owner-draft-state]')).toHaveText('保存済みの設定');
 await editor.locator('[data-owner-cancel]').click();await page.reload();await expect(page.locator('.game-logo-intro')).toBeHidden();await expect(human(page)).toHaveCount(0);
 await settings(page);await expect(page.locator('.game-owner-setting')).toContainText('保存する名前');await expect(page.locator('.game-owner-setting .owner-portrait-art')).toHaveAttribute('data-hair','wave');
});

test('character conflict preserves the latest saved choice and the unsaved editor until dismissal',async({page})=>{
 await page.goto('game/');await expect(page.locator('.game-logo-intro')).toBeHidden();await settings(page);await page.locator('.game-owner-setting').click();
 const editor=page.locator('.buncho-owner-editor');await editor.locator('[data-owner-name]').fill('未保存');
 await page.evaluate(()=>localStorage.setItem('buncho.owner-profile.v1',JSON.stringify({version:1,name:'別の画面の保存',hair:'crop'})));
 await editor.locator('[data-owner-save]').click();await expect(editor.locator('[data-owner-save]')).toBeDisabled();await expect(editor.locator('[data-owner-status]')).toContainText('ほかの画面');
 await expect(editor.locator('[data-owner-name]')).toHaveValue('未保存');
 await page.keyboard.press('Escape');await expect(page.locator('.game-owner-setting')).toBeFocused();
 await page.locator('.game-owner-setting').click();await expect(editor.locator('[data-owner-name]')).toHaveValue('別の画面の保存');await expect(editor.locator('[data-owner-preview] .owner-portrait-art')).toHaveAttribute('data-hair','crop');
 await expect(editor.locator('[data-owner-save]')).toBeEnabled();
});
