import {test,expect} from '@playwright/test';
import {createWorld} from '../../src/engine.js';

const now=Date.UTC(2026,10,3,12),dbName='buncho-ureshi-garden-v1';
async function record(page,world){
 return page.evaluate(({dbName,world})=>new Promise((resolve,reject)=>{
  const open=indexedDB.open(dbName,1);open.onupgradeneeded=()=>open.result.createObjectStore('world');open.onerror=()=>reject(open.error);
  open.onsuccess=()=>{const db=open.result,tx=db.transaction('world',world?'readwrite':'readonly'),store=tx.objectStore('world'),req=world?store.put(world,'current'):store.get('current');tx.oncomplete=()=>{db.close();resolve(req.result)};tx.onerror=()=>{db.close();reject(tx.error)}};
 }),{dbName,world});
}
async function ready(page){
 await page.addInitScript(n=>{Date.now=()=>n;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},now);
 await page.route(/youtube|youtu\.be|googlevideo|ytimg/i,r=>r.abort());
 await page.goto('');const world=createWorld(now);world.paused=true;await record(page,world);
 await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await page.locator('.game-scene-controls-toggle').click();
}
async function activate(locator,info){if(info.project.use.hasTouch)await locator.tap();else await locator.click();}
function contrast(a,b){const l=c=>c.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0),x=l(a),y=l(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}

for(const size of [{width:390,height:844},{width:320,height:240},{width:1440,height:900}])test(`care bird icon stays clear and tappable at ${size.width}x${size.height}`,async({page},info)=>{
 await page.setViewportSize(size);await ready(page);
 const button=page.getByRole('button',{name:'ふれあう',exact:true}),svg=button.locator('svg'),before=await record(page);
 await expect(button).toBeVisible();await expect(svg).toHaveAttribute('aria-hidden','true');await expect(svg).toHaveAttribute('viewBox','0 0 32 32');
 await expect(svg.locator('path')).toHaveCount(2);await expect(svg.locator('circle')).toHaveAttribute('fill','currentColor');
 const geometry=await svg.evaluate(el=>{const r=el.getBoundingClientRect(),b=el.getBBox(),button=el.closest('button').getBoundingClientRect(),stroke=Number.parseFloat(getComputedStyle(el).strokeWidth);return{icon:{width:r.width,height:r.height},shape:{left:b.x-stroke/2,top:b.y-stroke/2,right:b.x+b.width+stroke/2,bottom:b.y+b.height+stroke/2},button:{width:button.width,height:button.height},inside:r.left>=button.left&&r.right<=button.right&&r.top>=button.top&&r.bottom<=button.bottom};});
 expect(geometry.inside).toBe(true);expect(geometry.icon.width).toBeGreaterThanOrEqual(23);expect(geometry.icon.width).toBe(geometry.icon.height);
 expect(geometry.button.width).toBeGreaterThanOrEqual(44);expect(geometry.button.height).toBeGreaterThanOrEqual(44);
 expect(geometry.shape.left).toBeGreaterThan(0);expect(geometry.shape.top).toBeGreaterThan(0);expect(geometry.shape.right).toBeLessThan(32);expect(geometry.shape.bottom).toBeLessThan(32);
 const colors=await button.evaluate(el=>{const style=getComputedStyle(el),svgStyle=getComputedStyle(el.querySelector('svg'));return{foreground:style.color,stroke:svgStyle.stroke,background:style.backgroundImage,backgroundColor:style.backgroundColor};});
 expect(colors.stroke).toBe(colors.foreground);
 const foreground=colors.foreground.match(/[\d.]+/g).slice(0,3).map(Number),stops=[...colors.background.matchAll(/rgb\(([^)]+)\)/g)].map(match=>match[1].split(',').map(Number));
 // A flat Color Play surface and a legacy gradient have the same contrast contract.
 if(colors.background==='none'){const rgba=colors.backgroundColor.match(/[\d.]+/g).map(Number);expect(rgba[3]??1).toBe(1);stops.push(rgba.slice(0,3));}else expect(stops.length).toBeGreaterThanOrEqual(2);
 expect(stops.length).toBeGreaterThan(0);for(const stop of stops)expect(contrast(foreground,stop)).toBeGreaterThanOrEqual(3);
 await info.attach(`care-button-${size.width}x${size.height}`,{body:await button.screenshot(),contentType:'image/png'});await info.attach(`care-dock-${size.width}x${size.height}`,{body:await page.screenshot(),contentType:'image/png'});
 for(let n=0;n<2;n++){
  await activate(svg,info);await expect(page.locator('.game-bird-sheet')).toBeVisible();await expect(page.locator('#game-sheet-title')).toHaveText(before.birds[0].name);
  await activate(page.locator('[data-game-close-bird]'),info);await expect(page.locator('.game-bird-sheet')).toBeHidden();
 }
 await page.locator('.game-scene-controls-toggle').click();await expect(button).toBeHidden();await page.locator('.game-scene-controls-toggle').click();await expect(button).toBeVisible();
 expect(await record(page)).toEqual(before);
 if(!info.project.use.hasTouch){await button.focus();await page.keyboard.press('Enter');await expect(page.locator('.game-bird-sheet')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('.game-bird-sheet')).toBeHidden();}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('care icon follows system colours in high contrast mode',async({page},info)=>{
 test.skip(info.project.use.browserName==='webkit','WebKit does not emulate forced colours');
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({forcedColors:'active'});await ready(page);
 const button=page.getByRole('button',{name:'ふれあう',exact:true});
 const colors=await button.evaluate(el=>({button:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor,stroke:getComputedStyle(el.querySelector('svg')).stroke,eye:getComputedStyle(el.querySelector('circle')).fill}));
 expect(colors.stroke).toBe(colors.button);expect(colors.eye).toBe(colors.button);expect(colors.button).not.toBe(colors.background);
 await info.attach('care-button-high-contrast',{body:await button.screenshot(),contentType:'image/png'});
 await activate(button,info);await expect(page.locator('.game-bird-sheet')).toBeVisible();await activate(page.locator('[data-game-close-bird]'),info);await expect(page.locator('.game-bird-sheet')).toBeHidden();
});

