import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {fixture,NOW,exact} from '../fixtures/preservation.js';
import {serializeWorld,prepareWorldReplacement} from '../../src/engine.js';
async function evidence(info,label,before,after){const path=info.outputPath(label+'.json');await writeFile(path,JSON.stringify({browser:info.project.name,case:info.title,before,after},null,2));await info.attach(label,{path,contentType:'application/json'});}
async function captureManagementScroll(page,info){
 const panel=page.locator('.game-panel-overlay > .game-panel');
 const initial=await panel.evaluate(p=>{const r=p.getBoundingClientRect(),b=p.querySelector('.game-preservation').getBoundingClientRect();return {start:p.scrollTop+b.top-r.top,height:b.height,step:Math.max(80,p.clientHeight-48)};});
 const frames=[];
 for(let i=0;i<20;i++){
  await panel.evaluate((p,y)=>{p.scrollTop=y;},initial.start+i*initial.step);
  const state=await panel.evaluate(p=>{const rect=e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};},box=p.querySelector('.game-preservation'),pr=rect(p),br=rect(box),head=rect(p.parentElement.querySelector('.game-overlay-head')),top=Math.max(0,pr.top,head.bottom),bottom=Math.min(innerHeight,pr.bottom);return {scrollTop:p.scrollTop,panel:pr,box:br,visible:{from:Math.max(0,top-br.top),to:Math.min(br.height,bottom-br.top)},art:rect(box.querySelector('img')),warning:rect(box.querySelector('#game-preservation-warning')),reset:rect(box.querySelector('#game-reset-open'))};});
  expect(state.visible.to).toBeGreaterThan(state.visible.from);if(frames.length)expect(state.visible.from).toBeLessThanOrEqual(frames.at(-1).visible.to+2);else expect(state.visible.from).toBeLessThanOrEqual(2);
  const path=info.outputPath(`management-scroll-${i}.png`);await page.screenshot({path});frames.push(state);
  if(state.visible.to>=initial.height-2)break;
 }
 expect(frames.at(-1).visible.to).toBeGreaterThanOrEqual(initial.height-2);
 await writeFile(info.outputPath('management-scroll-measurements.json'),JSON.stringify({browser:info.project.name,case:info.title,viewport:page.viewportSize(),initial,frames},null,2));
}
async function record(page,value){return page.evaluate(value=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('world',value?'readwrite':'readonly'),s=tx.objectStore('world'),q=value?s.put(value,'current'):s.get('current');tx.oncomplete=()=>{db.close();resolve(q.result);};tx.onerror=()=>reject(tx.error);};}),value);}
async function start(page,size){const w=fixture();await page.setViewportSize(size);await page.addInitScript(now=>{Date.now=()=>now;localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));},NOW);await page.route(/youtube|youtu\.be|googlevideo|ytimg/i,r=>r.abort());await page.goto('');await record(page,w);await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');const toggle=page.locator('.game-scene-controls-toggle');if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();await page.locator('#game-nav-open').click();await page.locator('#game-menu-settings').click();await page.locator('[data-game-details=management] > summary').click();await expect(page.locator('.game-preservation')).toBeVisible();exact(await record(page),w);return w;}
for(const size of [{width:320,height:740},{width:390,height:844},{width:844,height:390},{width:1440,height:1000}]){
 test(`Save B native layout, focus, warning and reset cancel ${size.width}x${size.height}`,async({page},info)=>{
  const w=await start(page,size),box=page.locator('.game-preservation'),img=box.locator('img');await expect.poll(()=>img.evaluate(i=>i.complete&&i.naturalWidth===1312)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect(await box.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
  for(const selector of ['.game-preservation figure','[data-game-action=export]','#game-preservation-warning','#game-import','#game-reset-open']){const e=page.locator(selector);await e.scrollIntoViewIfNeeded();await expect(e).toBeInViewport();const path=info.outputPath(selector.replace(/\W/g,'')+'.png');await page.screenshot({path});}
  await captureManagementScroll(page,info);
  await page.locator('#game-import').focus();await expect(page.locator('#game-import')).toBeFocused();await page.keyboard.press('Tab');await expect(page.locator('#game-reset-open')).toBeFocused();
  await page.locator('#game-reset-open').click();await page.locator('[data-reset-kind=all]').click();await page.locator('[data-game-action=reset-confirm]').click();await expect(page.locator('.game-reset-dialog')).toContainText('最後の確認');await page.locator('[data-game-action=reset-cancel]').click();exact(await record(page),w);await evidence(info,'layout-reset-cancel-exact-save',w,await record(page));
 });
 test(`Save B native export and cancelled/invalid/valid import ${size.width}x${size.height}`,async({page},info)=>{
  const w=await start(page,size);const downloadPromise=page.waitForEvent('download');await page.locator('[data-game-action=export]').click();const download=await downloadPromise;expect(download.suggestedFilename()).toMatch(/^buncho-garden-\d{4}-\d\d-\d\d\.json$/);const stream=await download.createReadStream(),parts=[];for await(const part of stream)parts.push(part);expect(Buffer.concat(parts).toString()).toBe(serializeWorld(w));exact(await record(page),w);
  let prompts=0,accept=false;page.on('dialog',async d=>{prompts++;expect(d.type()).toBe('confirm');accept?await d.accept():await d.dismiss();});
  const incoming=fixture(500),payload={name:'save.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(incoming))};
  await page.locator('#game-import').setInputFiles([]);exact(await record(page),w);
  await page.locator('#game-import').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{bad')});await expect(page.locator('.game-overlay-message')).toContainText('読み込めませんでした');exact(await record(page),w);expect(prompts).toBe(0);
  await page.locator('#game-import').setInputFiles(payload);await expect.poll(()=>prompts).toBe(1);exact(await record(page),w);
  accept=true;await page.locator('#game-import').setInputFiles(payload);await expect.poll(async()=>(await record(page)).worldId).not.toBe(w.worldId);const after=await record(page);exact(after,prepareWorldReplacement(w,incoming,NOW,after.worldId));expect(prompts).toBe(2);await evidence(info,'import-exact-engine-transition',w,after);
 });
}
