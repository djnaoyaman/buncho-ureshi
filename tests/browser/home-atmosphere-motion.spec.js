import {test,expect} from '@playwright/test';
import {COLOR_PLAY_NOW as NOW,colorPlayWorld} from '../fixtures/color-play.js';
async function record(page,w){return page.evaluate(w=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,t=db.transaction('world',w?'readwrite':'readonly'),s=t.objectStore('world'),q=w?s.put(w,'current'):s.get('current');t.oncomplete=()=>{db.close();resolve(q.result)};t.onerror=()=>reject(t.error)};}),w)}

for(const width of [320,375,402])test(`home motion uses existing geometry and freezes safely at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:width===402?874:667});await page.addInitScript(now=>{Date.now=()=>now;Math.random=()=>.99;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);
 await page.goto('');const w=colorPlayWorld();w.paused=false;w.settings.motion=true;w.birds[0].needs.energy=40;w.birds[0].action.kind='rest';w.birds[0].action.target=null;await record(page,w);await page.goto('game/');
 const room=page.locator('.game-room'),water=room.locator('.game-home-water').first();await expect(room).toHaveAttribute('data-atmosphere-motion','true');await expect(water).toHaveCSS('animation-name','home-water-glint');await expect(room.locator('[data-bird-id=b1] .game-sprite')).toHaveAttribute('data-pose','rest');
 const before=await record(page),count=await room.locator('*').count();await expect.poll(()=>room.locator('.game-habitat img').evaluate(e=>e.complete&&e.naturalWidth>0)).toBe(true);
 await page.emulateMedia({reducedMotion:'reduce'});await expect(room).toHaveAttribute('data-atmosphere-motion','false');await expect(water).toHaveCSS('animation-name','none');
 await page.emulateMedia({reducedMotion:'no-preference'});await expect(room).toHaveAttribute('data-atmosphere-motion','true');
 for(let i=0;i<12;i++){
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});await expect(room).toHaveAttribute('data-atmosphere-motion','false');await expect(water).toHaveCSS('animation-name','none');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});await expect(room).toHaveAttribute('data-atmosphere-motion','true');
 }
 expect(await room.locator('*').count()).toBe(count);expect(await record(page)).toEqual(before);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.evaluate(()=>document.documentElement.dataset.motion='off');await expect(water).toHaveCSS('animation-name','none');await expect(room).toHaveAttribute('data-atmosphere-motion','false');await page.evaluate(()=>delete document.documentElement.dataset.motion);await expect(room).toHaveAttribute('data-atmosphere-motion','true');
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await expect(room).toHaveAttribute('data-atmosphere-motion','false');await page.waitForTimeout(700);await expect(room).toHaveAttribute('data-atmosphere-motion','false');
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await expect(room).toHaveAttribute('data-atmosphere-motion','true');
 for(const stopped of ['pause','setting']){const next=structuredClone(before);if(stopped==='pause')next.paused=true;else next.settings.motion=false;await record(page,next);await page.reload();await expect(room).toHaveAttribute('data-atmosphere-motion','false');await expect(water).toHaveCSS('animation-name','none');expect(await record(page)).toEqual(next);}
});
