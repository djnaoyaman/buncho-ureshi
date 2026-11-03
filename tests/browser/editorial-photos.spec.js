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
for(const width of [390,1280])test(`scroll depth is plainly visible and preserves the whole photograph at ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('encyclopedia/');
 const grid=page.locator('#article-grid'),frame=grid.locator('.article-cover-frame').first(),photo=frame.locator('img');
 await expect(grid).toHaveAttribute('data-photo-parallax','on');await photo.evaluate(i=>i.decode());
 // Place the untransformed plate center 120px below viewport center. The 240px
 // gesture crosses the middle of its travel, so clamping cannot hide weak motion.
 await frame.evaluate(f=>{const r=f.getBoundingClientRect(),offset=parseFloat(f.style.getPropertyValue('--photo-drift'))||0;window.scrollTo(0,scrollY+r.top-offset+r.height/2-innerHeight/2-120)});
 const sample=()=>frame.evaluate(f=>{const r=f.getBoundingClientRect(),i=f.querySelector('img').getBoundingClientRect(),s=getComputedStyle(f);return{offset:parseFloat(f.style.getPropertyValue('--photo-drift'))||0,top:r.top,bottom:r.bottom,scroll:scrollY,width:i.width,height:i.height,marginTop:parseFloat(s.marginTop),marginBottom:parseFloat(s.marginBottom),overflow:s.overflow}});
 await expect.poll(async()=> (await sample()).offset).toBeCloseTo(-120*(width<=600?.16:.18),0);
 const before=await sample();await info.attach(`depth-before-${width}`,{body:await page.screenshot(),contentType:'image/png'});
 // Real wheel input, sampled across several frames for retained scroll video.
 const samples=[before];for(let i=0;i<6;i++){await page.mouse.wheel(0,40);await page.waitForTimeout(90);samples.push(await sample())}
 await expect.poll(async()=> (await sample()).offset-before.offset).toBeGreaterThan(32);
 const after=await sample(),scroll=after.scroll-before.scroll,depth=after.offset-before.offset;
 expect(scroll).toBeGreaterThan(200);expect(depth/scroll).toBeGreaterThan(.14);expect(depth/scroll).toBeLessThan(.20);
 expect(Math.abs(after.offset)).toBeLessThanOrEqual(width<=600?40:56);expect(after.width).toBeCloseTo(before.width,3);expect(after.height).toBeCloseTo(before.height,3);
 expect(after.overflow).toBe('visible');expect(after.marginTop).toBeGreaterThan(width<=600?40:56);expect(after.marginBottom).toBeGreaterThan(width<=600?40:56);
 await info.attach(`depth-after-${width}`,{body:await page.screenshot(),contentType:'image/png'});
 await info.attach(`measured-scroll-${width}`,{body:Buffer.from(JSON.stringify({width,scroll,depth,ratio:depth/scroll,samples},null,2)),contentType:'application/json'});
 // Reverse scroll must move back smoothly rather than restart an animation.
 for(let i=0;i<6;i++){await page.mouse.wheel(0,-40);await page.waitForTimeout(90)}
 await expect.poll(async()=>Math.abs((await sample()).offset-before.offset)).toBeLessThan(2);
 await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>frame.evaluate(f=>getComputedStyle(f).transform)).toBe('none');expect(await frame.evaluate(f=>parseFloat(getComputedStyle(f).marginTop))).toBe(10);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>localStorage.setItem('buncho-settings',JSON.stringify({motion:false,ruby:true})));await page.reload();await expect.poll(()=>page.locator('#article-grid .article-cover-frame').first().evaluate(f=>getComputedStyle(f).transform)).toBe('none');
});
