import {test,expect} from '@playwright/test';
import {createWorld,validateWorld,hireCaretaker,economyToken} from '../../src/engine.js';
const now=Date.parse('2026-11-10T12:00:00+09:00'),minute=60000;
async function record(page,world){return page.evaluate(world=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onsuccess=()=>{const db=r.result,t=db.transaction('world',world?'readwrite':'readonly'),q=world?t.objectStore('world').put(world,'current'):t.objectStore('world').get('current');t.oncomplete=()=>{db.close();resolve(q.result);};t.onerror=()=>reject(t.error);};}),world);}
async function openControls(page){await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await page.locator('.game-scene-controls-toggle').click();}
for(const width of [320,390,768])test(`36h floor, cleaning and reload keep integer progress at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1024});await page.addInitScript(at=>{Date.now=()=>Number(sessionStorage.getItem('cleanliness-test-now')??at);localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},now+2159*minute);
 await page.goto('');const original=createWorld(now);original.settings.careSound=false;await record(page,original);await page.goto('game/');await openControls(page);
 await expect(page.locator('[data-game-cleanliness-value]')).toHaveText('21 / 100');
 await page.evaluate(at=>sessionStorage.setItem('cleanliness-test-now',String(at)),now+2160*minute);await page.reload();await openControls(page);await expect(page.locator('[data-game-cleanliness-value]')).toHaveText('20 / 100');
 await page.locator('[data-game-care="clean"]').click();await expect(page.locator('[data-game-cleanliness-value]')).toHaveText('100 / 100');
 const cleaned=validateWorld(await record(page));expect(cleaned.care.lastCleanTick).toBe(2160);expect(cleaned.version).toBe(original.version);expect(cleaned.economy.gold).toBe(original.economy.gold);expect(cleaned.decor.points).toBe(original.decor.points);expect(cleaned.birds.find(b=>b.id==='b1').name).toBe(original.birds[0].name);
 await page.evaluate(at=>sessionStorage.setItem('cleanliness-test-now',String(at)),now+2186*minute);await page.reload();await openControls(page);await expect(page.locator('[data-game-cleanliness-value]')).toHaveText('100 / 100');
 await page.evaluate(at=>sessionStorage.setItem('cleanliness-test-now',String(at)),now+2187*minute);await page.reload();await openControls(page);await expect(page.locator('[data-game-cleanliness-value]')).toHaveText('99 / 100');
 const saved=validateWorld(await record(page));expect(saved.care.lastCleanTick).toBe(2160);expect(Object.keys(saved.care)).toEqual(['cleanliness','lastCleanTick']);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('paid cleaning is retained after expiry with or without a midway visit',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.addInitScript(at=>{Date.now=()=>Number(sessionStorage.getItem('cleanliness-test-now')??at);localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));},now+2160*minute);
 const original=createWorld(now);original.settings.careSound=false;original.economy.gold=original.economy.lifetimeGold=200;hireCaretaker(original,1,economyToken(original),now);
 await page.goto('');await record(page,original);await page.goto('game/');await openControls(page);await expect(page.locator('[data-game-cleanliness-value]')).toHaveText('73 / 100');const single=validateWorld(await record(page));
 await page.goto('');await page.evaluate(at=>sessionStorage.setItem('cleanliness-test-now',String(at)),now+1440*minute);await record(page,original);await page.goto('game/');await openControls(page);await expect(page.locator('[data-game-cleanliness-value]')).toHaveText('100 / 100');
 await page.evaluate(at=>sessionStorage.setItem('cleanliness-test-now',String(at)),now+2160*minute);await page.reload();await openControls(page);await expect(page.locator('[data-game-cleanliness-value]')).toHaveText('73 / 100');const split=validateWorld(await record(page));
 expect(split.care).toEqual(single.care);expect(split.care.lastCleanTick).toBe(null);expect(split.economy.gold).toBe(176);expect(single.economy.gold).toBe(176);expect(split.lifecycle.birds).toEqual(single.lifecycle.birds);
});
