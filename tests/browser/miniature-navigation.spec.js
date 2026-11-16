import {test,expect} from '@playwright/test';
import {COLOR_PLAY_NOW as NOW,colorPlayWorld} from '../fixtures/color-play.js';
async function record(page,w){return page.evaluate(w=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,t=db.transaction('world',w?'readwrite':'readonly'),s=t.objectStore('world'),q=w?s.put(w,'current'):s.get('current');t.oncomplete=()=>{db.close();resolve(q.result)};t.onerror=()=>reject(t.error)};}),w)}
const protectedState=w=>({birds:w.birds,decor:w.decor,economy:w.economy,lifecycle:w.lifecycle,friendship:w.encounters.friendship,discoveries:w.encounters.discoveries});
async function fits(l){await expect(l).toBeVisible();const b=await l.boundingBox();expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);expect(b.x).toBeGreaterThanOrEqual(-1);expect(b.y).toBeGreaterThanOrEqual(-1);const vp=await l.evaluate(()=>({w:innerWidth,h:innerHeight}));expect(b.x+b.width).toBeLessThanOrEqual(vp.w+1);expect(b.y+b.height).toBeLessThanOrEqual(vp.h+1);}
for(const size of [{width:320,height:568},{width:375,height:667},{width:402,height:874},{width:667,height:375}])test(`miniature navigation preserves routes and save ${size.width}x${size.height}`,async({page},info)=>{
 await page.setViewportSize(size);await page.addInitScript(now=>{Date.now=()=>now;Math.random=()=>.99;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);
 await page.goto('');await record(page,colorPlayWorld());await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 const before=protectedState(await record(page));await page.locator('.game-scene-controls-toggle').click();
 const home=page.locator('.game-bottom-dock[data-home-dock="true"] > button');await expect(home).toHaveCount(4);
 for(const b of await home.all()){await fits(b);const textFits=await b.evaluate(e=>{const s=e.querySelector('span'),r=e.getBoundingClientRect(),q=document.createRange();q.selectNodeContents(s);return [...q.getClientRects()].filter(x=>x.width>0).every(x=>x.left>=r.left-1&&x.right<=r.right+1&&x.top>=r.top-1&&x.bottom<=r.bottom+1)});expect(textFits).toBe(true);const asset=await b.evaluate(e=>getComputedStyle(e,'::before').backgroundImage);expect(asset).toContain('/game-art/miniature-nav/');await page.evaluate(async url=>{const i=new Image();i.src=url.match(/url\(["']?([^"')]+)/)[1];await i.decode();if(i.naturalWidth!==160)throw Error('wrong art')},asset);}
 for(const b of await page.locator('.game-field-nav button').all())await fits(b);
 await page.screenshot({path:info.outputPath(`miniature-home-${size.width}.png`)});
 await page.locator('#game-nav-open').click();await expect(page.locator('#game-menu-notebook')).toBeVisible();await page.keyboard.press('Escape');
 await page.locator('.game-field-nav [data-game-panel="outdoors"]').click();await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
 const summaries=page.locator('.finch-garden-dock > details > summary');await expect(summaries).toHaveCount(4);
 for(const s of await summaries.all()){await fits(s);expect(await s.evaluate(e=>getComputedStyle(e,'::before').backgroundImage)).toContain('/game-art/miniature-nav/');}
 await fits(page.locator('.finch-garden > header [data-encounter-back]'));await fits(page.locator('[data-game-close-panel][data-home-icon]'));
 expect(await page.locator('details[name="garden-story"] > summary img').evaluateAll(ns=>ns.map(n=>n.dataset.eventIcon))).toEqual(['06-leaf','06-compass','06-showcase']);
 const about=page.locator('[data-garden-details="about"]');await about.locator(':scope > summary').click();await expect(about).toHaveAttribute('open','');expect(await about.locator(':scope > summary').evaluate(e=>getComputedStyle(e,'::before').backgroundImage)).not.toContain('miniature-nav');await page.keyboard.press('Escape');
 await page.screenshot({path:info.outputPath(`miniature-garden-${size.width}.png`)});
 await page.locator('[data-game-close-panel][data-home-icon]').click();await expect(page.locator('.game-room')).toBeVisible();expect(protectedState(await record(page))).toEqual(before);
 await page.reload();expect(protectedState(await record(page))).toEqual(before);
});
