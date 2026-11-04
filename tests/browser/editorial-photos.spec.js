import {test,expect} from '@playwright/test';
import { editorialPhotoFocus } from '../../src/editorial-photo-focus.js';
import { photoMotionPlan, photoDrift } from '../../src/editorial-parallax.js';
const sample=frame=>frame.evaluate(f=>{const mask=f.querySelector('.article-cover-window'),img=mask.querySelector('img'),credit=f.querySelector('.article-cover-credit'),r=mask.getBoundingClientRect(),p=img.getBoundingClientRect(),c=credit.getBoundingClientRect(),m=new DOMMatrix(getComputedStyle(img).transform);return{id:img.getAttribute('src').match(/photo-\d+/)[0],scroll:scrollY,viewport:innerHeight,windowWidth:innerWidth,mask:{top:r.top,left:r.left,right:r.right,bottom:r.bottom,width:r.width,height:r.height},photo:{top:p.top,left:p.left,right:p.right,bottom:p.bottom,width:p.width,height:p.height},creditTop:c.top,frameTop:f.getBoundingClientRect().top,frameTransform:getComputedStyle(f).transform,maskTransform:getComputedStyle(mask).transform,overflow:getComputedStyle(mask).overflow,scale:m.a,x:m.e,y:m.f,axis:img.dataset.photoPan,credit:credit.textContent}});
async function settled(frame){await expect.poll(async()=>{
 const s=await sample(frame),plan=photoMotionPlan(s.mask.width,s.mask.height,editorialPhotoFocus[s.id],s.windowWidth<=600?28:32),d=photoDrift(s.mask.top+s.mask.height/2,s.viewport,plan.limit,s.windowWidth<=600?.16:.18);
 return Math.max(Math.abs(s.x-plan.x-(plan.axis==='x'?d:0)),Math.abs(s.y-plan.y-(plan.axis==='y'?d:0)),Math.abs(s.scale-plan.scale));
}).toBeLessThan(.02);return sample(frame);}
function intact(s){const b=editorialPhotoFocus[s.id],m=s.mask,p=s.photo;expect(s.frameTransform).toBe('none');expect(s.maskTransform).toBe('none');expect(s.overflow).toBe('hidden');expect(s.credit).not.toBe('');expect(s.creditTop).toBeGreaterThanOrEqual(m.bottom-1);expect(p.left).toBeLessThanOrEqual(m.left+1);expect(p.right).toBeGreaterThanOrEqual(m.right-1);expect(p.top).toBeLessThanOrEqual(m.top+1);expect(p.bottom).toBeGreaterThanOrEqual(m.bottom-1);expect(p.left+b[0]*p.width).toBeGreaterThanOrEqual(m.left-1);expect(p.left+b[2]*p.width).toBeLessThanOrEqual(m.right+1);expect(p.top+b[1]*p.height).toBeGreaterThanOrEqual(m.top-1);expect(p.top+b[3]*p.height).toBeLessThanOrEqual(m.bottom+1);}
async function center(page,frame,offset=0){await frame.locator('.article-cover-window').evaluate((f,offset)=>{const r=f.getBoundingClientRect();scrollTo(0,scrollY+r.top+r.height/2-innerHeight/2+offset)},offset);}
for(const width of [320,390,1280])test(`fixed masks protect all 33 photographs and credits at ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('encyclopedia/');
 const frames=page.locator('#article-grid .article-cover-frame');await expect(frames).toHaveCount(33);
 for(let i=0;i<await frames.count();i++){
  const frame=frames.nth(i);await frame.scrollIntoViewIfNeeded();await frame.locator('img').evaluate(i=>i.decode());
  await center(page,frame,-200);const before=await settled(frame);intact(before);
  await center(page,frame,200);const after=await settled(frame);intact(after);
  expect(after.frameTop+after.scroll).toBeCloseTo(before.frameTop+before.scroll,1);
  expect(after.creditTop+after.scroll).toBeCloseTo(before.creditTop+before.scroll,1);
  expect(after.mask.height).toBeCloseTo(before.mask.height,2);
  await center(page,frame);await settled(frame);await info.attach(`${width}-${after.id}`,{body:await frame.screenshot(),contentType:'image/png'});
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.getByRole('searchbox',{name:'図鑑をさがす'}).fill('幼鳥');await expect(page.locator('#article-grid img[src$="photo-18.webp"]')).toBeVisible();await page.getByRole('searchbox',{name:'図鑑をさがす'}).fill('');await expect(frames).toHaveCount(33);
 await page.locator('#article-grid a[href$="/species/"]').click();await expect(page.locator('.article-hero img')).toBeVisible();expect(await page.locator('.article-hero img').evaluate(i=>getComputedStyle(i).filter)).toBe('none');await page.goBack();await expect(frames).toHaveCount(33);
});
for(const width of [320,390,1280])test(`only the image pans clearly inside a stationary mask at ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('encyclopedia/');
 const frame=page.locator('#article-grid .article-cover-frame').first();await frame.locator('img').evaluate(i=>i.decode());await center(page,frame,-120);const before=await settled(frame);intact(before);
 await info.attach(`inner-before-${width}`,{body:await page.screenshot(),contentType:'image/png'});
 const samples=[before];for(let i=0;i<6;i++){await page.mouse.wheel(0,40);await page.waitForTimeout(90);samples.push(await sample(frame));}
 const after=await settled(frame),scroll=after.scroll-before.scroll,depth=after.y-before.y;intact(after);
 expect(scroll).toBeGreaterThan(200);expect(depth).toBeGreaterThan(32);expect(depth/scroll).toBeGreaterThan(.14);expect(depth/scroll).toBeLessThan(.20);
 expect(after.frameTop+after.scroll).toBeCloseTo(before.frameTop+before.scroll,1);expect(after.creditTop+after.scroll).toBeCloseTo(before.creditTop+before.scroll,1);
 expect(after.photo.width).toBeCloseTo(before.photo.width,3);expect(after.photo.height).toBeCloseTo(before.photo.height,3);
 await info.attach(`inner-after-${width}`,{body:await page.screenshot(),contentType:'image/png'});await info.attach(`measured-inner-${width}`,{body:Buffer.from(JSON.stringify({width,scroll,depth,samples},null,2)),contentType:'application/json'});
 for(let i=0;i<6;i++){await page.mouse.wheel(0,-40);await page.waitForTimeout(90);}await expect.poll(async()=>Math.abs((await sample(frame)).y-before.y)).toBeLessThan(2);
 await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>frame.locator('img').evaluate(i=>getComputedStyle(i).transform)).toBe('none');
 await page.emulateMedia({reducedMotion:'no-preference'});await settled(frame);
 await page.evaluate(()=>localStorage.setItem('buncho-settings',JSON.stringify({motion:false,ruby:true})));await page.reload();await expect.poll(()=>page.locator('#article-grid .article-cover-window img').first().evaluate(i=>getComputedStyle(i).transform)).toBe('none');
});
