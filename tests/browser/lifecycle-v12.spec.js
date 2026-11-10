import {stripGrowthPace,withLegacyGrowth} from '../fixtures/growth-legacy.js';
import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createWorld,createBird,careWindow,advanceTo} from '../../src/engine.js';
const now=1794182400000;
async function panel(page,id){await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');const controls=page.locator('.game-scene-controls-toggle');if(await controls.getAttribute('aria-expanded')==='false')await controls.click();if(id==='family')await page.locator('.game-bottom-dock [data-game-panel=family]').click();else{await page.locator('.game-bottom-dock [data-game-open-menu]').click();await page.locator('#game-menu-'+id).click();}}

async function record(page,world){return page.evaluate(world=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onsuccess=()=>{const d=r.result,t=d.transaction('world',world?'readwrite':'readonly'),q=world?t.objectStore('world').put(world,'current'):t.objectStore('world').get('current');t.oncomplete=()=>{d.close();resolve(q.result)};t.onerror=()=>reject(t.error)};}),world);}
for(const width of [320,390,1024])test(`legacy clock migration and archived family stay readable ${width}`,async({page})=>{await page.setViewportSize({width,height:844});await page.addInitScript(n=>{Date.now=()=>n;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));},now);await page.goto('');const old=createWorld(now-86400000);old.paused=true;old.careSchedule={seenAt:now,windowAt:careWindow(now).at};old.version=11;stripGrowthPace(old);if(old.economy){old.economy.version=1;delete old.economy.household;}delete old.clock;delete old.archive;delete old.journal;await record(page,old);await page.goto('game/');await expect(page.locator('.game-room')).toBeVisible();const next=await record(page);expect(next.version).toBe(14);expect(next.birds).toEqual(withLegacyGrowth(old.birds));expect(next.tick).toBe(old.tick);expect(next.events).toEqual(old.events);await panel(page,'settings');await page.locator('[data-game-details="management"] summary').click();await expect(page.locator('[data-game-action="export-migration"]')).toBeVisible();
 const extended=createWorld(now);extended.paused=true;for(let i=0;i<150;i++)createBird(extended,{home:'departed'});await record(page,extended);await page.reload();await panel(page,'family');await expect(page.locator('.game-family-tree')).toBeVisible();const after=await record(page);expect(after.archive).toEqual(extended.archive);expect(after.birds).toEqual(extended.birds);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);});

for(const split of [false,true])test(`startup resumes ordered growth and deaths once; split absence ${split}`,async({page})=>{
 const day=86400000,minute=60000,resumeAt=now+4*day;
 await page.addInitScript(at=>{Date.now=()=>at;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));},resumeAt);
 await page.goto('');const world=createWorld(now),father=createBird(world,{home:'resident',sex:'male'});
 const child=createBird(world,{home:'resident',stage:'egg',parents:['b1',father.id],generation:1});child.growthPace='legacy';
 if(split)advanceTo(world,now+100*minute);
 await record(page,world);const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 const saved=await record(page),bird=saved.birds.find(b=>b.id===child.id);
 expect(bird.stage).toBe('adult');expect(saved.decor.points).toBe(95);expect(saved.economy.gold).toBe(0);
 expect(saved.lifecycle.birds.find(b=>b.birdId===child.id).death).toEqual({cause:'neglect',at:now+3*day,tick:4320});
 expect(saved.journal.filter(e=>e.ids[0]===child.id&&['hatch','grow'].includes(e.kind)).map(e=>[e.kind,e.tick,e.at])).toEqual([
  ['hatch',12,now+12*minute],['grow',36,now+36*minute],['grow',84,now+84*minute],
 ]);
 await panel(page,'diary');await expect(page.locator('.diary-paper')).toBeVisible();
 expect(errors).toEqual([]);expect(await record(page)).toEqual(saved);
 await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');expect(await record(page)).toEqual(saved);
});

test('loading an existing pre-fix v12 grave preserves its historical stage, dates and balance',async({page})=>{
 const original=JSON.parse(readFileSync(new URL('../fixtures/absence-v12-before-chronology.json',import.meta.url),'utf8'));
 await page.addInitScript(at=>{Date.now=()=>at;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));},now+8*86400000);
 await page.goto('');await record(page,original);await page.goto('game/');
 await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 const saved=await record(page);
 expect(saved.birds).toEqual(withLegacyGrowth(original.birds));
 for(const key of ['events','journal','decor','protagonist','seed'])expect(saved[key]).toEqual(original[key]);
 expect(saved.lifecycle.birds).toEqual(original.lifecycle.birds);
 await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');expect(await record(page)).toEqual(saved);
});

test('actual short startup dates adult growth before resuming later health deadlines',async({page})=>{
 const minute=60000,day=86400000;
 await page.addInitScript(at=>{Date.now=()=>Number(sessionStorage.getItem('short-resume-now')??at);localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));},now+85*minute);
 await page.goto('');const world=createWorld(now),father=createBird(world,{home:'resident',sex:'male'});
 const child=createBird(world,{home:'resident',stage:'egg',parents:['b1',father.id],generation:1});child.growthPace='legacy';advanceTo(world,now+83*minute);
 await record(page,world);await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 const short=await record(page);expect(short.birds.find(b=>b.id===child.id).stage).toBe('adult');expect(short.decor.points).toBe(95);
 expect(short.journal.find(e=>e.kind==='grow'&&e.ids[0]===child.id&&e.tick===84).at).toBe(now+84*minute);
 await page.evaluate(at=>sessionStorage.setItem('short-resume-now',String(at)),now+4*day);await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 const final=await record(page);expect(final.decor.points).toBe(95);expect(final.lifecycle.birds.find(b=>b.birdId===child.id).death).toEqual({cause:'neglect',at:now+3*day,tick:4320});
 expect(final.journal.filter(e=>e.ids[0]===child.id&&['hatch','grow'].includes(e.kind)).map(e=>e.at)).toEqual([now+12*minute,now+36*minute,now+84*minute]);
 await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');expect(await record(page)).toEqual(final);
});
