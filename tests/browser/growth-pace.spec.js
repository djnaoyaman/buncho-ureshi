import {test,expect} from '@playwright/test';
import * as engine from '../../src/engine.js';
import * as old from '../fixtures/engine-v13.js';
const now=Date.parse('2026-11-10T12:00:00+09:00'),minute=60000;
async function record(page,world){return page.evaluate(world=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onsuccess=()=>{const db=r.result,t=db.transaction('world',world?'readwrite':'readonly'),q=world?t.objectStore('world').put(world,'current'):t.objectStore('world').get('current');t.oncomplete=()=>{db.close();resolve(q.result);};t.onerror=()=>reject(t.error);};}),world);}
async function ready(page){await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');}
async function start(page,w,at){await page.addInitScript(at=>{Date.now=()=>Number(sessionStorage.getItem('growth-test-now')??at);localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},at);await page.goto('');await record(page,w);await page.goto('game/');await ready(page);}
async function resume(page,at){await page.evaluate(at=>sessionStorage.setItem('growth-test-now',String(at)),at);await page.reload();await ready(page);}
function family(e){const w=e.createWorld(now),father=e.createBird(w,{home:'resident',sex:'male'}),child=e.createBird(w,{home:'resident',stage:'egg',parents:['b1',father.id],generation:1});w.settings.careSound=false;return {w,child};}
for(const width of [320,390,768])test(`new growth visible and durable at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1024});const {w,child}=family(engine);w.economy.gold=w.economy.lifetimeGold=1000;engine.hireCaretaker(w,7,engine.economyToken(w),now);await start(page,w,now+335*minute);
 const art=()=>page.locator(`.game-room-bird[data-bird-id="${child.id}"] .game-sprite`).first();await expect(art()).toHaveAttribute('data-stage','egg');
 for(const [ticks,stage] of [[336,'chick'],[1008,'juvenile'],[5376,'adult']]){await resume(page,now+ticks*minute);await expect(art()).toHaveAttribute('data-stage',stage);const saved=engine.validateWorld(await record(page));expect(saved.birds.find(b=>b.id===child.id).stageTick).toBe(ticks);expect(saved.economy.gold).toBe(832);expect(saved.birds.find(b=>b.id===child.id).name).toBe(child.name);}
 const saved=await record(page);expect(saved.journal.filter(e=>e.ids[0]===child.id&&['hatch','grow'].includes(e.kind)).map(e=>e.at)).toEqual([336,1008,5376].map(t=>now+t*minute));expect(saved.decor.points).toBe(95);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('old13 children keep fast pace; exact original exports beside previous migration backups',async({page})=>{
 const {w,child}=family(old);old.advanceTo(w,now+5*minute);const original=structuredClone(w);await start(page,w,now+5*minute);let saved=engine.validateWorld(await record(page));expect(saved.version).toBe(15);expect(saved.birds.every(b=>b.growthPace==='legacy')).toBe(true);expect(saved.economy).toEqual(original.economy);
 await resume(page,now+84*minute);saved=await record(page);expect(saved.birds.find(b=>b.id===child.id).stage).toBe('adult');expect(saved.journal.filter(e=>e.ids[0]===child.id&&['hatch','grow'].includes(e.kind)).map(e=>e.tick)).toEqual([12,36,84]);
 await page.locator('.game-scene-controls-toggle').click();await page.locator('[data-game-open-menu]').click();await page.locator('#game-menu-settings').click();await page.locator('[data-game-details="management"] summary').click();const pending=page.waitForEvent('download');await page.locator('[data-game-action="export-growth-migration"]').click();const file=await pending,stream=await file.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);expect(JSON.parse(Buffer.concat(chunks).toString())).toEqual(original);
});
