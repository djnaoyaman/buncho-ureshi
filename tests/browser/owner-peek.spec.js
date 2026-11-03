import {test,expect} from '@playwright/test';
test('owner is a visible foreground observer, customized and motion-aware',async({page},info)=>{
 for(const [width,height] of [[390,844],[844,390],[1280,800]]){
  await page.setViewportSize({width,height});await page.goto('');
  await page.evaluate(()=>localStorage.setItem('buncho.owner-profile.v1',JSON.stringify({version:1,name:'A',hair:'bun',skin:'honey',hairColor:'rose',outfit:'overalls',palette:'sakura',accessory:'beret',eyes:'bright',face:'oval'})));
  await page.goto('game/');await expect(page.locator('.game-owner-companion')).toBeVisible();await expect(page.locator('.game-logo-intro')).toBeHidden();
  const owner=page.locator('.game-owner-companion'), art=owner.locator('svg');
  await expect(art).toHaveAttribute('data-hair-color','#8f6265');await expect(art).toHaveAttribute('data-skin-color','#c8946e');
  let bounds=await owner.boundingBox();expect(bounds.width).toBeGreaterThanOrEqual(80);expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.y+bounds.height).toBeLessThanOrEqual(height);
  const toggle=await page.locator('.game-scene-controls-toggle').boundingBox();if(toggle)expect(bounds.x).toBeGreaterThanOrEqual(toggle.x+toggle.width);
  await page.screenshot({path:info.outputPath(`peek-${width}.png`)});
  if(width===390){await owner.evaluate(el=>{for(const animation of el.getAnimations({subtree:true})){animation.pause();animation.currentTime=6400;}});expect(Number(await owner.locator('.owner-peek-glance').evaluate(e=>getComputedStyle(e).opacity))).toBeGreaterThan(.9);await page.screenshot({path:info.outputPath('peek-glance.png')});}
  await page.emulateMedia({reducedMotion:'reduce'});expect(await owner.locator('.owner-peek-glance').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');await expect(owner.locator('.owner-peek-glance')).toHaveCSS('opacity','0');
  await page.emulateMedia({reducedMotion:'no-preference'});
 }
});
