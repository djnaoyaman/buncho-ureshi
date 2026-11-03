import { test, expect } from './qa-test-fixture.js';
import { createHash } from 'node:crypto';
import { SITE_NAME } from '../../src/visuals.js';

test('approved 04 decodes without stretching and remains visible from 320px to desktop',async({page},info)=>{
  await page.route(/youtube|youtu\.be|googlevideo|ytimg/i,route=>route.abort());
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const [width,height] of [[320,900],[375,900],[390,844],[844,390],[768,900],[1440,900]]){
    await page.setViewportSize({width,height});await page.goto('./');
    for(const selector of ['#brand img']){
      const logo=page.locator(selector);await expect(logo).toBeVisible();await expect(logo).toHaveAttribute('alt',SITE_NAME);
      const result=await logo.evaluate(async img=>{await img.decode();const r=img.getBoundingClientRect();return {w:img.naturalWidth,h:img.naturalHeight,x:r.x,y:r.y,width:r.width,height:r.height};});
      expect([result.w,result.h]).toEqual([1120,645]);expect(result.width/result.height).toBeCloseTo(1120/645,2);
      expect(result.width).toBeGreaterThan(selector==='#brand img'?120:220);expect(result.x).toBeGreaterThanOrEqual(0);expect(result.x+result.width).toBeLessThanOrEqual(width+1);
    }
    const box=await page.locator('#brand').boundingBox(),menu=await page.locator('#menu-toggle').boundingBox();
    expect(box.x+box.width).toBeLessThanOrEqual(menu.x+1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const header=await page.locator('.site-header').boundingBox();
    expect(header.height).toBeLessThanOrEqual(width<=600?96:110);
    await page.evaluate(()=>scrollTo(0,0));
    const captureHeight=await page.locator('.art-cover-copy').evaluate(e=>Math.ceil(Math.max(innerHeight,e.getBoundingClientRect().bottom+20)));
    const screenshot=await page.screenshot({scale:'css',clip:{x:0,y:0,width,height:captureHeight}});
    // Inspect rendered PNG pixels, not only CSS declarations. The 4 inset corners
    // contain source paper, so they must now match their actual ivory backdrop.
    const pixels=await page.evaluate(async encoded=>{
      const image=new Image();image.src='data:image/png;base64,'+encoded;await image.decode();
      const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
      const c=canvas.getContext('2d');c.drawImage(image,0,0);
      return [...document.querySelectorAll('#brand img')].map(e=>{
        const r=e.getBoundingClientRect(),style=getComputedStyle(e),parent=getComputedStyle(e.closest('.site-header'));
        const corners=[[r.x+2,r.y+2],[r.right-3,r.y+2],[r.x+2,r.bottom-3],[r.right-3,r.bottom-3]].filter(([x,y])=>x>=0&&y>=0&&x<image.width&&y<image.height);
        return {blend:style.mixBlendMode,filter:style.filter,isolation:parent.isolation,background:parent.backgroundColor,
          corners:corners.map(([x,y])=>[...c.getImageData(Math.floor(x),Math.floor(y),1,1).data])};
      });
    },screenshot.toString('base64'));
    for(const item of pixels){
      expect(item.blend).toBe('normal');expect(item.filter).toBe('none');expect(item.isolation).toBe('isolate');expect(item.background).toBe('rgb(247, 248, 243)');
      expect(item.corners.length).toBe(4);
      for(const pixel of item.corners)for(const [i,value] of [247,248,243].entries())expect(Math.abs(pixel[i]-value)).toBeLessThanOrEqual(2);
    }
    await info.attach(`integrated-04-home-${width}x${height}`,{body:screenshot,contentType:'image/png'});
  }
  expect(errors).toEqual([]);
});

test('served selected-master hash and derivatives are exact, and platform icon rasters decode',async({page,request},info)=>{
  const root=new URL(info.project.use.baseURL),get=path=>request.get(new URL(path,root).href);
  const manifestResponse=await get('brand/manifest.json');expect(manifestResponse.status()).toBe(200);const manifest=await manifestResponse.json();
  expect(manifest.approvedMasterSHA256).toBe('543193b35d04c436e1370303b5d64a26de63cf282bc6fddc2dc5a52011c5a82a');
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


test('logo integration stays local to light UI surfaces and supports contrast preferences',async({page},info)=>{
  await page.route(/youtube|youtu\.be|googlevideo|ytimg/i,route=>route.abort());
  await page.setViewportSize({width:375,height:900});
  for(const route of ['./','colors/','game/','studio/','404.html']){
    await page.goto(route);if(route==='game/'){await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await expect(page.locator('#brand img')).toBeHidden();await expect(page.locator('.game-world-title img')).toBeVisible();}else await expect(page.locator('#brand img')).toBeVisible();
    expect(await page.locator('#brand img').evaluate(e=>getComputedStyle(e).mixBlendMode)).toBe('normal');
    const unexpected=await page.locator('img,canvas').evaluateAll(els=>els.filter(e=>getComputedStyle(e).mixBlendMode!=='normal'&&!e.matches('.site-header .header-logo,.hero-copy > .hero-logo')).length);
    expect(unexpected).toBe(0);
  }
  await page.goto('./');await page.emulateMedia({colorScheme:'dark'});
  expect(await page.locator('.site-header').evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgb(247, 248, 243)');
  await page.emulateMedia({forcedColors:'active'});
  for(const selector of ['#brand img']){
    expect(await page.locator(selector).evaluate(e=>getComputedStyle(e).mixBlendMode)).toBe('normal');
    expect(await page.locator(selector).evaluate(e=>getComputedStyle(e).filter)).toBe('none');
    await expect(page.locator(selector)).toHaveAttribute('alt',SITE_NAME);
  }
  await info.attach('integrated-04-forced-colors-375',{body:await page.screenshot(),contentType:'image/png'});
});

test('served wordmark has true alpha, opaque white bird, and unchanged original ink RGB',async({page},info)=>{
  await page.goto('./');
  const report=await page.evaluate(async()=>{
    const read=async path=>{const im=new Image();im.src=new URL(path,document.baseURI);await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);return {w:im.width,h:im.height,a:g.getImageData(0,0,im.width,im.height).data};};
    const source=await read('brand/wordmark-04.webp'),cutout=await read('brand/wordmark-04-transparent.webp');
    let transparent=0,opaque=0,mismatches=0,borderOpaque=0;
    for(let y=0;y<cutout.h;y++)for(let x=0;x<cutout.w;x++){const i=(y*cutout.w+x)*4,a=cutout.a[i+3];if(a===0)transparent++;if(a===255){opaque++;if([0,1,2].some(c=>cutout.a[i+c]!==source.a[i+c]))mismatches++;}if((x===0||y===0||x===cutout.w-1||y===cutout.h-1)&&a!==0)borderOpaque++;}
    return {size:[cutout.w,cutout.h],transparent:transparent/(cutout.w*cutout.h),opaque,mismatches,borderOpaque,bird:Array.from(cutout.a.slice((100*cutout.w+790)*4,(100*cutout.w+790)*4+4))};
  });
  expect(report.size).toEqual([1120,645]);expect(report.transparent).toBeGreaterThan(.75);expect(report.opaque).toBeGreaterThan(100000);expect(report.mismatches).toBe(0);expect(report.borderOpaque).toBe(0);expect(report.bird[3]).toBe(255);expect(report.bird[0]).toBeGreaterThan(240);
  await page.setViewportSize({width:390,height:1000});
  for(const background of ['rgb(247, 248, 243)','rgb(222, 232, 224)']){
    await page.locator('.site-header').evaluateAll((els,color)=>els.forEach(e=>e.style.backgroundColor=color),background);
    await info.attach(`alpha-logo-${background}`,{body:await page.screenshot(),contentType:'image/png'});
  }
});
