import {test,expect} from '@playwright/test';
import {createWorld,validateWorld,drawDecoration,treatBird,hireCaretaker,economyToken} from '../../src/engine.js';
import {lifeStatus} from '../../src/life-care.js';
import {ENCOUNTER_CATALOG} from '../../src/data/encounter-catalog.js';
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
  await expect(page.locator('.game-field-nav [aria-pressed=true]')).toHaveCSS('background-color','rgb(248, 223, 210)');
  for(const b of await page.locator('.game-bottom-dock > button').all())await fit(b);
  await capture(page,info,'home-controls',size);
  await expect(page.locator('.game-bottom-dock [data-game-panel=decorate]')).toHaveCSS('background-color','rgb(247, 227, 177)');
  await expect(page.locator('#game-open-bird')).toHaveCSS('background-color','rgb(245, 201, 184)');
  await expect(page.locator('.game-bottom-dock [data-game-panel=family]')).toHaveCSS('background-color','rgb(226, 236, 223)');
  await openMenu(page);await capture(page,info,'menu',size);
  const menuOrder=['health','profile','relations','family','roster','notebook','diary','memorial','settings','help'];
  expect(await page.locator('.game-secondary-menu .game-tabs button').evaluateAll(es=>es.map(e=>e.dataset.gamePanel))).toEqual(menuOrder);
  const colors=['rgb(248, 223, 210)','rgb(251, 239, 211)','rgb(255, 253, 247)','rgb(255, 253, 247)','rgb(251, 239, 211)','rgb(248, 223, 210)','rgb(226, 236, 223)','rgb(251, 239, 211)','rgb(255, 253, 247)','rgb(226, 236, 223)'];
  for(const [i,id] of menuOrder.entries())await expect(page.locator(`#game-menu-${id}`)).toHaveCSS('background-color',colors[i]);
  for(const id of ['health','memorial','profile','relations','family','diary','roster','notebook','settings','help']){
   const link=page.locator(`#game-menu-${id}`);await fit(link);await link.click();
   await expect(page.locator('.game-app')).toHaveAttribute('data-panel',id);await expect(page.locator('.game-panel-overlay')).toBeVisible();
   await fit(page.locator('[data-game-close-panel]'));expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   if(['profile','family'].includes(id))for(const button of await page.locator('.game-profile-actions > button').all()){await fit(button);await expect(button).toHaveCSS('border-top-left-radius','28px');}
   await capture(page,info,id,size);
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
 // This motion test excludes random predator arrivals, as garden-interaction does.
 // Dedicated crow/raptor suites cover their intentionally hidden selector state.
 await page.addInitScript(()=>{Math.random=()=>.99;});
 await setup(page,[width,height]);
 const world=createWorld(NOW,42);world.settings.motion=true;world.settings.careSound=false;world.paused=false;
 validateWorld(world);
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

for(const size of sizes){
 test(`Color Play health cards keep real hospital and caretaker actions at ${size.join('x')}`,async({page},info)=>{
  await setup(page,size);const world=seed();world.economy.gold=world.economy.lifetimeGold=200;
  lifeStatus(world,'b1').condition={kind:'respiratory',sinceAt:NOW,deadlineAt:NOW+86400000};
  await record(page,validateWorld(world));await page.reload();await page.locator('.game-scene-controls-toggle').click();await openMenu(page);await page.locator('#game-menu-health').click();
  const before=await record(page),expected=structuredClone(before);
  treatBird(expected,'b1',economyToken(expected),NOW);hireCaretaker(expected,3,economyToken(expected),NOW);
  await expect(page.locator('.life-care-panel > .life-panel-heading')).toHaveCSS('border-top-width','0px');
  await expect(page.locator('.life-caretaker')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  await capture(page,info,'health-unified-top',size);
  await expect(page.locator('.life-care-warning')).toContainText('すべてゲームのルール');
  for(const button of await page.locator('.life-hire-options button').all())await fit(button);
  await page.locator('.life-caretaker').scrollIntoViewIfNeeded();await capture(page,info,'health-caretaker',size);
  const treat=page.locator('[data-life-treat=b1]');await fit(treat);await capture(page,info,'health-hospital',size);
  if(info.project.use.hasTouch)await treat.tap();else await treat.click();
  await expect.poll(async()=>(await record(page)).economy.gold).toBe(188);
  expect((await record(page)).lifecycle.birds[0].condition).toBeNull();
  await fit(page.locator('[data-life-hire="3"]'));await page.locator('[data-life-hire="3"]').click();
  await expect.poll(async()=>(await record(page)).economy.gold).toBe(116);await expect(page.locator('.life-contract')).toContainText('3日');await expect(page.locator('[data-life-hire="7"]')).toBeDisabled();
  const saved=await record(page);expect(protectedState(saved)).toEqual(protectedState(expected));expect(saved.decor).toEqual(before.decor);
  await fit(page.locator('.life-risk-help > summary'));await page.locator('.life-risk-help > summary').click();await expect(page.locator('.life-risk-help')).toHaveAttribute('open','');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.keyboard.press('Escape');await expect(page.locator('.game-panel-overlay')).not.toBeVisible();await page.reload();
  const restored=await record(page);expect(restored.lifecycle).toEqual(saved.lifecycle);expect(restored.economy).toEqual(saved.economy);
 });
 test(`Color Play gacha keeps one draw, cost and exact result at ${size.join('x')}`,async({page},info)=>{
  await setup(page,size);await page.locator('.game-scene-controls-toggle').click();
  const entry=page.locator('.game-bottom-dock [data-game-panel=decorate]');await fit(entry);await expect(entry).toContainText('ガチャ');await entry.click();
  await expect(page.locator('.game-decor-intro > p')).toHaveText('お飾りガチャ');
  const draw=page.locator('[data-decor-draw=perch]');await fit(draw);await expect(draw).toContainText('ガチャをまわす');await expect(draw).toContainText('1回 · 20 Gems');
  await capture(page,info,'gacha-machine',size);const before=await record(page),expected=structuredClone(before);drawDecoration(expected,'perch');
  if(info.project.use.hasTouch)await draw.tap();else await draw.click();
  await expect(page.locator('.game-draw-result')).toBeVisible();const saved=await record(page);
  expect(saved.decor).toEqual(expected.decor);expect(saved.economy).toEqual(before.economy);expect(saved.birds).toEqual(before.birds);
  await fit(page.locator('[data-draw-result-close]'));await page.locator('[data-draw-result-close]').click();await expect(page.locator('.game-draw-result')).toHaveCount(0);await expect(draw).toBeDisabled();
  await page.locator('[data-game-details=draw-odds] > summary').click();await expect(page.locator('[data-game-details=draw-odds]')).toContainText('色は8色それぞれ12.5%');await page.locator('[data-game-details=draw-odds] > summary').click();
  await page.reload();expect((await record(page)).decor).toEqual(saved.decor);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 });
 test(`Color Play phone notebook has two readable columns at ${size.join('x')}`,async({page},info)=>{
  await setup(page,size);const world=seed();world.encounters.discoveries=ENCOUNTER_CATALOG.slice(0,6).map((e,i)=>({id:e.id,firstTick:0,lastTick:0,visits:1,instanceId:i+1}));world.encounters.nextId=7;
  await record(page,validateWorld(world));await page.reload();await page.locator('.game-scene-controls-toggle').click();await openMenu(page);await page.locator('#game-menu-notebook').click();
  const before=await record(page),cards=page.locator('.finch-notebook > .finch-catalog > .finch-card');await expect(cards).toHaveCount(32);
  const boxes=await cards.evaluateAll(es=>es.slice(0,3).map(e=>e.getBoundingClientRect().toJSON()));
  if(size[0]<=600){expect(Math.abs(boxes[0].top-boxes[1].top)).toBeLessThan(1);expect(boxes[2].top).toBeGreaterThan(boxes[0].bottom);}
  const first=cards.first();await fit(first);await expect(first.locator('.finch-art')).toHaveCSS('height','85px');
  await expect(first.locator('.finch-media')).toHaveAttribute('data-media-state','ready');await capture(page,info,'notebook-two-columns',size);
  await first.click();await expect(page.locator('.finch-entry h3')).toHaveText(ENCOUNTER_CATALOG[0].name);await fit(page.locator('[data-encounter-back]'));await page.locator('[data-encounter-back]').click();
  expect((await record(page)).encounters.discoveries).toEqual(before.encounters.discoveries);expect((await record(page)).birds).toEqual(before.birds);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 });
}

for(const size of [[320,240],[390,844],[1280,800]])test(`Color Play groups three enemy-page destinations at ${size.join('x')}`,async({page},info)=>{
 await setup(page,size);await page.locator('.game-scene-controls-toggle').click();await openMenu(page);await page.locator('#game-menu-notebook').click();await page.locator('[data-crow-notebook]').click();await page.locator('[data-raptor-entry="black-kite"]').click();
 const before=protectedState(await record(page)),routes=page.locator('.finch-raptor-entry > .finch-route-actions');await expect(routes.locator('button')).toHaveCount(3);
 for(const b of await routes.locator('button').all())await fit(b);await capture(page,info,'enemy-three-destinations',size);
 await routes.locator('[data-crow-notebook]').click();await expect(page.locator('.finch-crow-notebook')).toBeVisible();await page.locator('[data-raptor-entry="black-kite"]').click();
 await page.locator('.finch-route-actions [data-finch-go-garden]').click();await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
 await page.locator('.finch-garden > header [data-encounter-back]').click();await page.locator('[data-crow-notebook]').click();await page.locator('[data-raptor-entry="black-kite"]').click();
 await page.locator('.finch-route-actions [data-finch-go-home]').click();await expect(page.locator('.game-room')).toBeVisible();await expect(page.locator('.game-panel-overlay')).not.toBeVisible();
 expect(protectedState(await record(page))).toEqual(before);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

for(const height of [420,568])test(`Color Play short phone keeps gacha filters initially visible at 320x${height}`,async({page},info)=>{
 await setup(page,[320,height]);await page.locator('.game-scene-controls-toggle').click();await page.locator('.game-bottom-dock [data-game-panel=decorate]').click();
 await expect(page.locator('[data-decor-filter=all]')).toBeInViewport({ratio:1});await expect(page.locator('[data-decor-draw=perch]')).toBeInViewport();
 await info.attach(`gacha-short-320x${height}`,{body:await page.screenshot(),contentType:'image/png'});
 await fit(page.locator('[data-decor-draw=perch]'));await fit(page.locator('[data-game-details=draw-odds] > summary'));
});
