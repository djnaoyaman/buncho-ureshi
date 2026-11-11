import {test,expect} from '@playwright/test';
import {createWorld} from '../../src/engine.js';
const NOW=Date.UTC(2026,10,11,13);
async function record(page,w){return page.evaluate(w=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onsuccess=()=>{const db=r.result,tx=db.transaction('world',w?'readwrite':'readonly'),q=w?tx.objectStore('world').put(w,'current'):tx.objectStore('world').get('current');tx.oncomplete=()=>{db.close();resolve(q.result)};tx.onerror=()=>reject(tx.error)};r.onerror=()=>reject(r.error)}),w);}
async function openMenu(page){const controls=page.locator('.game-scene-controls-toggle');if(await controls.getAttribute('aria-expanded')==='false')await controls.click();await page.locator('#game-nav-open').click();return page.locator('.game-secondary-menu');}
// WebKit animates wheel input beyond a fixed 200–250ms delay. Wait for the
// requested position before comparing redraws, keeping the <2px assertion.
async function wheel(page,menu,delta){await menu.hover();const target=await menu.evaluate((e,delta)=>Math.min(e.scrollHeight-e.clientHeight,e.scrollTop+delta),delta);await page.mouse.wheel(0,delta);await expect.poll(async()=>Math.abs(await menu.evaluate(e=>e.scrollTop)-target),{timeout:5000}).toBeLessThan(1);}
let sequence=0;
async function refresh(page,locator){const probe=locator.locator(':scope > :first-child');const marker=`refresh-${++sequence}`,peer=await record(page);peer.revision++;await probe.evaluate((e,marker)=>e.dataset.scrollProbe=marker,marker);await record(page,peer);await expect(probe).not.toHaveAttribute('data-scroll-probe',marker,{timeout:12000});expect(await record(page)).toEqual(peer);}
async function stable(page,locator){const before=await locator.evaluate(e=>{e.scrollTop=Math.min(360,e.scrollHeight-e.clientHeight);return {top:e.scrollTop,range:e.scrollHeight-e.clientHeight};});await refresh(page,locator);expect(Math.abs(await locator.evaluate(e=>e.scrollTop)-before.top)).toBeLessThan(2);return before;}
for(const [width,height] of [[320,568],[390,844]])test(`reading positions survive background updates ${width}x${height}`,async({page},info)=>{
 test.setTimeout(90000);await page.setViewportSize({width,height});await page.addInitScript(n=>{Date.now=()=>n;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);
 await page.goto('');const w=createWorld(NOW);w.paused=true;await record(page,w);await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await page.evaluate(()=>document.fonts.ready);
 let menu=await openMenu(page);await menu.locator('[data-game-details=next-goals]>summary').click();await wheel(page,menu,350);expect(await menu.evaluate(e=>e.scrollTop)).toBeGreaterThan(0);
 for(let i=0;i<2;i++){const before=await menu.evaluate(e=>e.scrollTop);await refresh(page,menu);expect(Math.abs(await menu.evaluate(e=>e.scrollTop)-before)).toBeLessThan(2);await wheel(page,menu,120);}
 await info.attach('menu-after-refresh',{body:await page.screenshot(),contentType:'image/png'});await menu.locator('[data-game-close-menu]').click();
 for(const panel of ['help','settings','health']){
  menu=await openMenu(page);await menu.locator(`#game-menu-${panel}`).click();
  if(panel==='help')for(const key of ['help-care','help-life'])await page.locator(`[data-game-details=${key}]>summary`).click();
  if(panel==='settings')for(const key of ['management','save-help'])await page.locator(`[data-game-details=${key}]>summary`).click();
  const pane=page.locator('.game-panel-overlay[open]>.game-panel');const position=await stable(page,pane);if(panel!=='health')expect(position.top).toBeGreaterThan(0);
  await page.locator('[data-game-close-panel]').click();
 }
 const controls=page.locator('.game-scene-controls-toggle');if(await controls.getAttribute('aria-expanded')==='false')await controls.click();await page.locator('.game-bottom-dock [data-game-panel=decorate]').click();
 const odds=page.locator('[data-game-details=draw-odds]');await odds.locator(':scope>summary').click();const position=await stable(page,odds);if(width===320||position.range>0)expect(position.top).toBeGreaterThan(0);else expect(position.top).toBe(0);await info.attach('odds-scroll-metrics',{body:JSON.stringify({width,height,...position}),contentType:'application/json'});await info.attach('odds-after-refresh',{body:await page.screenshot(),contentType:'image/png'});await odds.locator(':scope>summary').click();await page.locator('[data-game-close-panel]').click();
 await page.locator('.game-bottom-dock [data-game-open-bird]').click();await stable(page,page.locator('.game-bird-sheet[open]'));await page.locator('[data-game-close-bird]').click();
});
