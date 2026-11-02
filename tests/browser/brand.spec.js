import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { SITE_NAME } from '../../src/visuals.js';

test('approved 04 decodes without stretching and remains visible from 320px to desktop',async({page},info)=>{
  await page.route(/youtube|youtu\.be|googlevideo|ytimg/i,route=>route.abort());
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const width of [320,375,768,1440]){
    await page.setViewportSize({width,height:900});await page.goto('./');
    for(const selector of ['#brand img','.hero-logo']){
      const logo=page.locator(selector);await expect(logo).toBeVisible();await expect(logo).toHaveAttribute('alt',SITE_NAME);
      const result=await logo.evaluate(async img=>{await img.decode();const r=img.getBoundingClientRect();return {w:img.naturalWidth,h:img.naturalHeight,x:r.x,y:r.y,width:r.width,height:r.height};});
      expect([result.w,result.h]).toEqual([1120,645]);expect(result.width/result.height).toBeCloseTo(1120/645,2);
      expect(result.width).toBeGreaterThan(140);expect(result.x).toBeGreaterThanOrEqual(0);expect(result.x+result.width).toBeLessThanOrEqual(width+1);
    }
    const box=await page.locator('#brand').boundingBox(),menu=await page.locator('#menu-toggle').boundingBox();
    expect(box.x+box.width).toBeLessThanOrEqual(menu.x+1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(width===375||width===1440)await info.attach(`approved-04-home-${width}`,{body:await page.screenshot(),contentType:'image/png'});
  }
  expect(errors).toEqual([]);
});

test('served selected-master hash and derivatives are exact, and platform icon rasters decode',async({page,request},info)=>{
  const root=new URL(info.project.use.baseURL),get=path=>request.get(new URL(path,root).href);
  const manifestResponse=await get('brand/manifest.json');expect(manifestResponse.status()).toBe(200);const manifest=await manifestResponse.json();
  expect(manifest.approvedMasterSHA256).toBe('849bb9f3d28e437e17d5588c60855d891f7006a48f05708cb98cdacdc7ca22ad');
  for(const [path,file] of Object.entries(manifest.files)){
    const r=await get(path.replace(/^public\//,''));expect(r.status(),path).toBe(200);const bytes=await r.body();
    expect(bytes.length,path).toBe(file.bytes);expect(createHash('sha256').update(bytes).digest('hex'),path).toBe(file.sha256);
  }
  await page.goto('./');
  for(const [path,size] of [['apple-touch-icon.png',180],['icon-192.png',192],['icon-512.png',512],['icon-maskable-512.png',512]]){
    expect(await page.evaluate(async path=>{const img=new Image();img.src=new URL(path,document.baseURI);await img.decode();return[img.naturalWidth,img.naturalHeight];},path)).toEqual([size,size]);
  }
  expect(await page.evaluate(async()=>{const img=new Image();img.src=new URL('ogp.png',document.baseURI);await img.decode();return[img.naturalWidth,img.naturalHeight];})).toEqual([1200,630]);
});
