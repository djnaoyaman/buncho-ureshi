import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {helpWorld,validated,engine} from '../fixtures/help-guide-world.js';

test.use({timezoneId:'UTC'});
const CARD='.game-help-guide-card';
async function record(page,value){return page.evaluate(value=>new Promise((resolve,reject)=>{
 const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onerror=()=>reject(r.error);
 r.onsuccess=()=>{const db=r.result,tx=db.transaction('world',value?'readwrite':'readonly');const q=value?tx.objectStore('world').put(value,'current'):tx.objectStore('world').get('current');
 tx.oncomplete=()=>{db.close();resolve(q.result);};tx.onerror=()=>{db.close();reject(tx.error);};};
}),value);}
async function ready(page){await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await expect(page.locator('.game-logo-intro')).toHaveCount(0);await expect(page.locator('[data-home-role="self"]')).toBeVisible();}
async function start(page,world,size){
 await page.setViewportSize(size);
 await page.addInitScript(now=>{Date.now=()=>now;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},world.lastUpdated);
 await page.route(/youtube|youtu\.be|googlevideo|ytimg/i,r=>r.abort());
 await page.goto('');await record(page,world);await page.goto('game/');await ready(page);expect(await record(page)).toEqual(world);
}
async function openHelp(page){
 const scene=page.locator('.game-scene-controls-toggle');if(await scene.getAttribute('aria-expanded')!=='true')await scene.click();
 await page.locator('#game-nav-open').click();await page.locator('#game-menu-help').click();
 await expect(page.locator('.game-help-guide h3')).toBeFocused();
 await expect(page.locator(CARD)).toHaveCount(5);
 // Real production CSS/assets must be wired; no injected component styles or HTML.
 await expect(page.locator(CARD).first()).toHaveCSS('background-color','rgb(245, 220, 144)');
 await page.locator('.game-help-guide-bird').scrollIntoViewIfNeeded();
 await expect.poll(()=>page.locator('.game-help-guide-bird').evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);
 await page.locator('.game-help-guide h3').scrollIntoViewIfNeeded();
}
async function fits(page){
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 for(const s of ['.game-panel-overlay > .game-panel','.game-help-guide','.game-help-guide-map'])expect(await page.locator(s).evaluate(e=>e.scrollWidth<=e.clientWidth+1),s).toBe(true);
}
async function shot(page,info,name,target){
 await target.scrollIntoViewIfNeeded();await expect(target).toBeInViewport();
 const path=info.outputPath(`${name}.png`);await page.screenshot({path});await info.attach(name,{path,contentType:'image/png'});
}
async function historySnapshot(page){return page.evaluate(()=>({url:location.href,length:history.length,state:history.state}));}
for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1440,height:900}]){
 test(`help B actual app: layout, native details, rerender, history and exact save ${size.width}x${size.height}`,async({page},info)=>{
  const world=helpWorld();await start(page,world,size);const history=await historySnapshot(page);await openHelp(page);await fits(page);
  const cards=page.locator(CARD),positions=await cards.evaluateAll(es=>es.map(e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y})));
  expect(positions[1].x).toBeGreaterThan(positions[0].x);expect(positions[2].x).toBe(positions[0].x);
  for(let i=1;i<positions.length;i++)expect(positions[i].y).toBeGreaterThan(positions[i-1].y);
  await expect(page.locator('.game-help h3 rt')).toBeVisible();await expect(page.locator('.game-help h3 rt')).toHaveCSS('display','ruby-text');
  await shot(page,info,'guide-upper',page.locator('.game-help h3'));
  await shot(page,info,'guide-lower',cards.last().locator('summary'));
  const summary=cards.first().locator('summary');await summary.focus();await page.keyboard.press('Enter');await expect(cards.first()).toHaveAttribute('open','');
  await expect(summary).toBeFocused();await shot(page,info,'first-explanation',cards.first().locator('p'));
  await summary.focus();await page.keyboard.press('Space');await expect(cards.first()).not.toHaveAttribute('open','');
  await page.keyboard.press('Tab');await expect(cards.nth(1).locator('summary')).toBeFocused();
  for(let i=0;i<5;i++){
   await cards.nth(i).locator('summary').click();await expect(cards.nth(i).locator('h4')).toBeVisible();
   await cards.nth(i).locator('summary').click();await expect(cards.nth(i).locator('h4')).not.toBeVisible();
  }
  for(const key of ['help-care','help-life','help-story']){
   const detail=page.locator(`[data-game-details="${key}"]`);await detail.locator('summary').click();await expect(detail).toHaveAttribute('open','');
   await shot(page,info,key,detail.locator('p').last());await detail.locator('summary').click();await expect(detail).not.toHaveAttribute('open','');
  }
  await summary.focus();await page.keyboard.press('Enter');
  const peer=structuredClone(world);engine.bumpRevision(peer);validated(peer);
  await page.locator('.game-help h3').evaluate(e=>e.dataset.beforePoll='true');await record(page,peer);
  await expect(page.locator('.game-help h3')).not.toHaveAttribute('data-before-poll','true',{timeout:10000});
  await expect(cards.first()).toHaveAttribute('open','');await expect(summary).toBeFocused();await fits(page);expect(await record(page)).toEqual(peer);
  expect(await historySnapshot(page)).toEqual(history);
  for(let i=0;i<2;i++){
   if(i===0)await page.locator('[data-game-close-panel]').click();else await page.keyboard.press('Escape');await expect(page.locator('.game-help')).toHaveCount(0);await expect(page.locator('#game-nav-open')).toBeFocused();
   expect(await historySnapshot(page)).toEqual(history);expect(await record(page)).toEqual(peer);await openHelp(page);
  }
  await page.locator('[data-game-close-panel]').click();
  await page.goBack();await expect(page.locator('#game-root')).toHaveCount(0);
  await page.goForward();await ready(page);expect(page.url()).toBe(history.url);await openHelp(page);expect(await record(page)).toEqual(peer);
 });
}
test('help B unknown holidays and enlarged text preserve every disclosure',async({page},info)=>{
 const world=helpWorld(false);await start(page,world,{width:390,height:844});await openHelp(page);
 // Test-only 200% text enlargement, not native browser zoom. Capture every
 // computed size first so nested ruby/em sizes are doubled once, not compounded.
 const fontSizes=await page.locator('.game-help').evaluate(help=>{
  const nodes=[help,...help.querySelectorAll('*')],before=nodes.map(e=>parseFloat(getComputedStyle(e).fontSize));
  nodes.forEach((e,i)=>e.style.setProperty('font-size',`${before[i]*2}px`,'important'));
  return nodes.map((e,i)=>({tag:e.tagName,class:e.getAttribute('class'),before:before[i],after:parseFloat(getComputedStyle(e).fontSize)}));
 });
 for(const size of fontSizes){expect(size.before).toBeGreaterThan(0);expect(size.after/size.before).toBeCloseTo(2,3);}
 const measurements=info.outputPath('help-text-enlargement-measurements.json');
 writeFileSync(measurements,JSON.stringify({mode:'test-only computed text sizes; not native browser zoom',ratio:2,fontSizes},null,2));
 await info.attach('help-text-enlargement-measurements',{path:measurements,contentType:'application/json'});
 for(const s of await page.locator('.game-help details > summary').all())await s.click();
 await expect(page.locator('.game-help details[open]')).toHaveCount(8);
 const care=page.locator('[data-game-details="help-care"]');
 expect(await care.evaluate(e=>{const c=e.cloneNode(true);c.querySelectorAll('rt').forEach(r=>r.remove());return c.textContent;})).toContain('この年の祝日は、まだゲームに入っていない');
 await fits(page);await shot(page,info,'enlarged-route',page.locator(CARD).first().locator('summary'));
 await shot(page,info,'unknown-holiday-warning',care.locator('p').filter({hasText:'この年'}));
 await shot(page,info,'enlarged-safety',page.locator('[data-game-details="help-life"] p').last());
 expect(await record(page)).toEqual(world);await page.reload();await ready(page);await openHelp(page);expect(await record(page)).toEqual(world);
});
