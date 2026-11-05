import {test,expect} from '@playwright/test';
import {createWorld,validateWorld} from '../../src/engine.js';
import {COLOR_PLAY_NOW as NOW,colorPlayWorld as seed} from '../fixtures/color-play.js';
const sizes=[[320,240],[320,568],[390,844],[844,390],[1280,800]];
async function record(page,world){return page.evaluate(world=>new Promise((resolve,reject)=>{
 const request=indexedDB.open('buncho-ureshi-garden-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('world');request.onerror=()=>reject(request.error);
 request.onsuccess=()=>{const db=request.result,tx=db.transaction('world',world?'readwrite':'readonly'),store=tx.objectStore('world'),q=world?store.put(world,'current'):store.get('current');tx.oncomplete=()=>{db.close();resolve(q.result)};tx.onerror=()=>reject(tx.error)};
}),world);}
async function setup(page,size){
 await page.setViewportSize({width:size[0],height:size[1]});
 await page.addInitScript(now=>{Date.now=()=>now;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);
 await page.route(/youtube|youtu\.be|googlevideo|ytimg/i,r=>r.abort());
 await page.goto('');await record(page,seed());await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
}
async function fit(button){
 // Garden artwork can finish loading and replace its dock between locator
 // actions. Re-resolve and measure the settled element; keep every threshold.
 await expect(async()=>{
 await button.scrollIntoViewIfNeeded();await expect(button).toBeVisible();
 const m=await button.evaluate(el=>{const b=el.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(el);return{left:b.left,right:b.right,w:b.width,h:b.height,viewport:innerWidth,hit:el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)),text:[...range.getClientRects()].every(r=>r.left>=b.left-.5&&r.right<=b.right+.5&&r.top>=b.top-.5&&r.bottom<=b.bottom+.5)};});
 expect(m.left).toBeGreaterThanOrEqual(-.5);expect(m.right).toBeLessThanOrEqual(m.viewport+.5);expect(m.w).toBeGreaterThanOrEqual(43.9);expect(m.h).toBeGreaterThanOrEqual(43.9);expect(m.hit).toBe(true);expect(m.text).toBe(true);
 }).toPass({timeout:10000,intervals:[100,250,500]});
}
async function capture(page,info,name,size){if([240,844,800].includes(size[1]))await info.attach(`${name}-${size.join('x')}`,{body:await page.screenshot(),contentType:'image/png'});}
const protectedState=w=>{const state=structuredClone(w);delete state.revision;delete state.updatedAt;delete state.encounters.garden;return state;};
async function unchangedArtwork(page){
 const result=await page.evaluate(()=>{
 const measure=()=>[...document.querySelectorAll('.game-room-bird,.game-sprite,.game-care-pet-bird,.game-care-illustration,.game-care-illustration img,.owner-peek-art,.finch-garden-household,.finch-garden-friend,.finch-garden-visitor,.finch-art,.finch-photo img')].map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {tag:el.tagName,classes:el.className?.baseVal??el.className,src:el.getAttribute('src'),w:r.width,h:r.height,transform:s.transform,objectFit:s.objectFit,objectPosition:s.objectPosition,borderRadius:s.borderRadius,filter:s.filter,clipPath:s.clipPath,animationName:s.animationName};});
 const sheet=[...document.styleSheets].find(s=>s.href&&new URL(s.href).pathname.endsWith('/src/game.css'));
  const first=[...sheet.cssRules].findIndex(r=>r.style?.getPropertyValue('--play-ink'));if(first<0)throw Error('Color Play stylesheet not loaded');
  const before=measure(),rules=[...sheet.cssRules].slice(first).map(r=>r.cssText);while(sheet.cssRules.length>first)sheet.deleteRule(first);
  const baseline=measure();for(const rule of rules)sheet.insertRule(rule,sheet.cssRules.length);
  return{before,baseline};
 });
 expect(result.before).toEqual(result.baseline);
}
async function openMenu(page){await page.locator('#game-nav-open').click();await expect(page.locator('.game-secondary-menu')).toHaveAttribute('open','');}
for(const size of sizes){
 test(`Color Play preserves menu routes and saved birds at ${size.join('x')}`,async({page},info)=>{
  await setup(page,size);const before=protectedState(await record(page));
  await unchangedArtwork(page);await fit(page.locator('.game-scene-controls-toggle'));await capture(page,info,'home-rest',size);await page.locator('.game-scene-controls-toggle').click();
  await expect(page.locator('.game-field-nav [aria-pressed=true]')).toHaveCSS('background-color','rgb(244, 119, 105)');
  for(const b of await page.locator('.game-bottom-dock > button').all())await fit(b);
  await capture(page,info,'home-controls',size);
  await openMenu(page);await capture(page,info,'menu',size);
  for(const id of ['health','memorial','profile','relations','family','diary','roster','notebook','settings','help']){
   const link=page.locator(`#game-menu-${id}`);await fit(link);await link.click();
   await expect(page.locator('.game-app')).toHaveAttribute('data-panel',id);await expect(page.locator('.game-panel-overlay')).toBeVisible();
   await fit(page.locator('[data-game-close-panel]'));expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   if(['health','family','notebook','settings'].includes(id))await capture(page,info,id,size);
   await page.locator('[data-game-close-panel]').click();await expect(page.locator('.game-room')).toBeVisible();await openMenu(page);
  }
  await page.locator('[data-game-close-menu]').click();expect(protectedState(await record(page))).toEqual(before);
  await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');expect(protectedState(await record(page))).toEqual(before);
 });
 test(`Color Play keeps care, decoration and garden flows at ${size.join('x')}`,async({page},info)=>{
  await setup(page,size);const before=protectedState(await record(page));await page.locator('.game-scene-controls-toggle').click();
  await page.locator('#game-open-bird').click();await expect(page.locator('.game-care-pet-bird')).toBeVisible();
  await unchangedArtwork(page);await capture(page,info,'care',size);await fit(page.locator('[data-game-care=feed]'));await fit(page.locator('[data-game-close-bird]'));await page.locator('[data-game-close-bird]').click();
  await page.locator('.game-bottom-dock [data-game-panel=decorate]').click();await expect(page.locator('.game-decoration')).toBeVisible();await capture(page,info,'decorate',size);await fit(page.locator('[data-game-close-panel]'));await page.locator('[data-game-close-panel]').click();
  await page.locator('.game-field-nav [data-game-panel=outdoors]').click();await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
  await expect(page.locator('.finch-garden-selector [data-garden-select]')).toHaveCount(12);await unchangedArtwork(page);await capture(page,info,'garden',size);
  for(const button of await page.locator('.finch-garden-dock > details > summary').all())await fit(button);
  await fit(page.locator('[data-game-close-panel]'));await page.locator('[data-game-close-panel]').click();
  await openMenu(page);await page.locator('#game-menu-notebook').click();await page.locator('[data-finch-go-garden]').click();
  await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');await unchangedArtwork(page);
  await page.locator('[data-game-close-panel]').click();
  expect(protectedState(await record(page))).toEqual(before);
 });
}
test('Color Play keeps real export, invalid import and reset cancellation safe',async({page},info)=>{
 await setup(page,[390,844]);await page.locator('.game-scene-controls-toggle').click();await openMenu(page);await page.locator('#game-menu-settings').click();
 await page.locator('[data-game-details=management] > summary').click();const before=await record(page);
 const download=page.waitForEvent('download');await page.locator('[data-game-action=export]').click();
 const stream=await(await download).createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);
 const exported=JSON.parse(Buffer.concat(chunks).toString('utf8'));validateWorld(exported);expect(exported).toEqual(before);
 await page.locator('#game-import').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{not JSON')});
 await expect(page.locator('.game-overlay-message')).toContainText('今の保存はそのまま');expect(await record(page)).toEqual(before);
 await page.locator('#game-reset-open').click();await expect(page.locator('.game-reset-dialog')).toBeVisible();
 await info.attach('reset-cancel-390x844',{body:await page.screenshot(),contentType:'image/png'});
 await page.keyboard.press('Escape');await expect(page.locator('.game-reset-dialog')).not.toBeVisible();expect(await record(page)).toEqual(before);
});

for(const width of [320,390])test(`Color Play preserves live garden controls, taps and motion at ${width}`,async({page},info)=>{
 const height=width===320?568:844;
 await setup(page,[width,height]);
 const world=createWorld(NOW,42);world.settings.motion=true;world.settings.careSound=false;world.paused=false;
 world.encounters.crow.lastArrivalAt=NOW;world.encounters.raptor.lastArrivalAt=NOW;
 await record(page,world);await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 await page.locator('.game-scene-controls-toggle').click();await page.locator('.game-field-nav [data-game-panel=outdoors]').click();
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
 await fit(page.locator('.finch-garden-selector [aria-current=page]'));
 const actors=page.locator('.finch-garden-image-plane > .finch-garden-friend,.finch-garden-image-plane > .finch-garden-household');
 await page.mouse.move(1,200);
 await info.attach(`live-garden-diagnostics-${width}`,{body:JSON.stringify(await page.evaluate(()=>({
  focus:document.activeElement?.outerHTML,openDetails:[...document.querySelectorAll('.game-encounter-host details[open]')].map(x=>x.outerHTML),
  hovered:[...document.querySelectorAll(':hover')].map(x=>x.className),motion:document.documentElement.dataset.motion,reduced:matchMedia('(prefers-reduced-motion:reduce)').matches,
  font:getComputedStyle(document.querySelector('.finch-garden h3')).fontFamily,
  boxes:[...document.querySelectorAll('.finch-garden-dock,.finch-garden-selector,.finch-garden-image-plane > button')].map(x=>({class:x.className,rect:x.getBoundingClientRect().toJSON()}))
 }))),contentType:'application/json'});
 await expect.poll(()=>actors.evaluateAll(es=>Math.max(...es.map(e=>Math.abs(parseFloat(e.style.translate)||0)))),{timeout:14000}).toBeGreaterThan(1);
 for(const actor of await actors.all()){
  const box=await actor.boundingBox();expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  expect(await actor.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
 }
 await info.attach(`garden-live-${width}x${height}`,{body:await page.screenshot(),contentType:'image/png'});
});
