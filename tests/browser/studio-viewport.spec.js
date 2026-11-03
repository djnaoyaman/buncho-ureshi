import { test, expect } from '@playwright/test';
const canvas = page => page.locator('[data-studio="canvas"]');
const option = (page,name) => page.locator(`[data-studio="${name}"]`);
const action = (page,name) => page.locator(`[data-action="${name}"]`);
const saved = page => page.evaluate(()=>JSON.parse(localStorage.getItem('buncho-ureshi-studio-v1')));
async function visibleArtwork(page){
 const box=await canvas(page).boundingBox(),size=page.viewportSize();
 expect(box.width).toBeGreaterThan(40);expect(box.height).toBeGreaterThan(40);
 expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0);
 expect(box.x+box.width).toBeLessThanOrEqual(size.width+1);
 expect(box.y+box.height).toBeLessThanOrEqual(size.height+1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
}
for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1280,height:800},{width:640,height:400}]){
 test(`preview remains visible while editing every panel at ${size.width}x${size.height}`,async({page},info)=>{
  await page.setViewportSize(size);await page.goto('studio/');
  await page.locator('.studio-steps a').filter({hasText:'③'}).click();
  await visibleArtwork(page);
  const before=await saved(page);
  await action(page,'larger').click();await visibleArtwork(page);
  await action(page,'rotate-right').click();await visibleArtwork(page);
  await option(page,'color').fill('#446677');await visibleArtwork(page);
  await page.locator('.studio-steps a').filter({hasText:'①'}).click();
  // Navigating between panels must not re-mount the editor or erase undo.
  await action(page,'undo').click();await action(page,'undo').click();await action(page,'undo').click();
  expect(await saved(page)).toEqual(before);await action(page,'redo').click();
  await option(page,'background').selectOption('10');await visibleArtwork(page);
  await option(page,'title').fill('見ながらつくる');await action(page,'title').click();await visibleArtwork(page);
  await page.locator('.studio-steps a').filter({hasText:'②'}).click();
  await page.locator('[data-material="bird-white"]').click();await visibleArtwork(page);
  await page.locator('.studio-steps a').filter({hasText:'④'}).click();
  await option(page,'format').selectOption('portrait');await visibleArtwork(page);
  await action(page,'export').click();
  await expect(option(page,'export-preview')).toBeVisible();
  await expect.poll(()=>option(page,'export-preview').evaluate(i=>[i.naturalWidth,i.naturalHeight])).toEqual([1400,1750]);
  await option(page,'download').scrollIntoViewIfNeeded();await visibleArtwork(page);
  await info.attach(`studio-bounded-${size.width}x${size.height}`,{body:await page.screenshot(),contentType:'image/png'});
  const retained=await saved(page);await page.reload();expect(await saved(page)).toEqual(retained);
  await page.locator('.studio-steps a').filter({hasText:'③'}).click();await visibleArtwork(page);
 });
}
test('keyboard controls and reduced viewport retain preview, and site navigation remains available',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('studio/');
 await option(page,'title').fill('保存する作品');await option(page,'title').press('Tab');
 await page.setViewportSize({width:390,height:420});
 await option(page,'title').click();await visibleArtwork(page);
 await action(page,'title').click();await action(page,'rotate-right').focus();await page.keyboard.press('Enter');await visibleArtwork(page);
 await info.attach('studio-keyboard-resized-viewport',{body:await page.screenshot(),contentType:'image/png'});
 const state=await saved(page);await page.goto('omochi/');await page.goBack();
 await expect(canvas(page)).toBeVisible();expect(await saved(page)).toEqual(state);
});
