import {test,expect} from '@playwright/test';
for(const width of [390,1280])test(`editorial photographs retain credits and readable framing at ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});await page.goto('encyclopedia/');
 await expect(page.locator('#article-grid .article-card')).toHaveCount(37);
 const frames=page.locator('#article-grid .article-cover-frame');await expect(frames).toHaveCount(33);
 for(let i=0;i<await frames.count();i++){
  const frame=frames.nth(i),img=frame.locator('img');await frame.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());
  const state=await img.evaluate(i=>{const s=getComputedStyle(i),r=i.getBoundingClientRect();return{w:r.width,h:r.height,fit:s.objectFit,ratio:s.aspectRatio,filter:s.filter,natural:i.naturalWidth,profile:s.getPropertyValue('--photo-ratio'),src:i.getAttribute('src')}});
  expect(state.w).toBeGreaterThan(200);expect(state.h).toBeGreaterThan(130);expect(state.natural).toBeGreaterThan(0);expect(state.fit).toBe('cover');expect(state.profile).not.toBe('');
  expect(await frame.locator('.article-cover-credit').innerText()).not.toBe('');
  await info.attach(`${width}-${state.src.split('/').pop()}`,{body:await frame.screenshot(),contentType:'image/png'});
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.getByRole('searchbox',{name:'図鑑をさがす'}).fill('幼鳥');await expect(page.locator('#article-grid .article-card')).not.toHaveCount(37);await expect(page.locator('#article-grid img[src$="photo-18.webp"]')).toBeVisible();
 await page.getByRole('searchbox',{name:'図鑑をさがす'}).fill('');await expect(frames).toHaveCount(33);
 await page.locator('#article-grid a[href$="/species/"]').click();await expect(page.locator('.article-hero img')).toBeVisible();expect(await page.locator('.article-hero img').evaluate(i=>getComputedStyle(i).filter)).toBe('none');
 await page.goBack();await expect(frames).toHaveCount(33);
 await page.locator('#article-grid .article-card').first().scrollIntoViewIfNeeded();await info.attach(`index-${width}`,{body:await page.screenshot(),contentType:'image/png'});
});
test('scroll parallax moves the plate without clipping, resets for reduced motion and site preference',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('encyclopedia/');const grid=page.locator('#article-grid'),frame=grid.locator('.article-cover-frame').first();await frame.scrollIntoViewIfNeeded();
 await expect(grid).toHaveAttribute('data-photo-parallax','on');
 const before=await frame.evaluate(f=>Number.parseFloat(f.style.getPropertyValue('--photo-drift'))||0);await page.mouse.wheel(0,150);
 await expect.poll(()=>frame.evaluate(f=>Number.parseFloat(f.style.getPropertyValue('--photo-drift'))||0)).not.toBe(before);
 const after=await frame.evaluate(f=>Number.parseFloat(f.style.getPropertyValue('--photo-drift'))||0);expect(Math.abs(after)).toBeLessThanOrEqual(8);
 expect(await frame.evaluate(f=>getComputedStyle(f).overflow)).toBe('visible');
 await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>frame.evaluate(f=>getComputedStyle(f).transform)).toBe('none');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>localStorage.setItem('buncho-settings',JSON.stringify({motion:false,ruby:true})));await page.reload();await expect.poll(()=>page.locator('#article-grid .article-cover-frame').first().evaluate(f=>getComputedStyle(f).transform)).toBe('none');
});
