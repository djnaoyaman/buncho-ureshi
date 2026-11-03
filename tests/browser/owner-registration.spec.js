import {test,expect} from '@playwright/test';

test('all 25 hair and outfit pairs keep a registered neck in every pose',async({page},info)=>{
 await page.setViewportSize({width:920,height:1250});await page.goto('game/');
 for(const pose of ['back','portrait','side']){
  await page.evaluate(async pose=>{
   const {renderOwnerPeek,renderOwnerPortrait}=await import(new URL('../src/owner-peek.js',location.href));
   const hairs=['crop','bob','wave','bun','sweep'],outfits=['apron','cardigan','smock','dress','overalls'];
   document.body.innerHTML='<main id="registration-grid"></main>';
   const grid=document.querySelector('#registration-grid');Object.assign(grid.style,{display:'grid',gridTemplateColumns:'repeat(5, 170px)',gap:'4px',background:'#fbf7ec'});
   for(const hair of hairs)for(const outfit of outfits){const cell=document.createElement('div');Object.assign(cell.style,{height:'220px',textAlign:'center',font:'12px sans-serif',border:'1px solid #ddd'});cell.innerHTML=(pose==='portrait'?renderOwnerPortrait({hair,outfit,accessory:'none'}):renderOwnerPeek({hair,outfit,accessory:'none'}))+`<span>${hair} / ${outfit}</span>`;grid.append(cell);const svg=cell.querySelector('svg');Object.assign(svg.style,{width:'138px',height:'196px',transform:'none'});for(const el of svg.querySelectorAll('.owner-peek-body,.owner-peek-back,.owner-peek-glance'))el.style.animation='none';if(pose==='side'){svg.querySelector('.owner-peek-back').style.opacity='0';svg.querySelector('.owner-peek-glance').style.opacity='1';}}
   await Promise.all([...new Set([...grid.querySelectorAll('svg image')].map(x=>x.getAttribute('href')))].map(src=>new Promise(resolve=>{const img=new Image();img.onload=img.onerror=resolve;img.src=src;})));
  },pose);
  await expect(page.locator('#registration-grid > div')).toHaveCount(25);
  await page.screenshot({path:info.outputPath(`registration-${pose}.png`),fullPage:true});
  if(pose!=='side')await page.goto('game/');
 }
});

test('every turn frame keeps a complete registered side pose',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('game/');await expect(page.locator('.game-logo-intro')).toBeHidden();
 const owner=page.locator('.game-owner-companion');
 for(const t of [9000,9360,9600,9840,10000,10600,10920,11280,11520]){
  await owner.evaluate((el,t)=>{for(const a of el.getAnimations({subtree:true})){a.pause();a.effect.updateTiming({delay:0});a.currentTime=t;}},t);
  await owner.screenshot({path:info.outputPath(`frame-${t}.png`)});
 }
 const views=await owner.evaluate(el=>[...el.querySelectorAll('.owner-peek-glance svg')].map(e=>e.getAttribute('viewBox')));
 expect(views.every(v=>v?.split(' ')[1]==='648')).toBe(true);
});
