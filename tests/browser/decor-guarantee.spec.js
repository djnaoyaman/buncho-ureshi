import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createWorld,DECOR_COLORS,DECOR_TIERS} from '../../src/engine.js';
const NOW=Date.UTC(2026,10,6),DB='buncho-ureshi-garden-v1';
async function record(page,value){return page.evaluate(({DB,value})=>new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('world',value?'readwrite':'readonly'),store=tx.objectStore('world'),request=value?store.put(value,'current'):store.get('current');tx.oncomplete=()=>{db.close();resolve(request.result);};tx.onerror=()=>{db.close();reject(tx.error);};};}),{DB,value});}
function fixture({lowLevel=false,complete=false}={}){
 const w=createWorld(NOW,1);w.paused=true;w.settings.motion=false;w.decor.points=w.decor.lifetimePoints=lowLevel?20:1000;
 for(const {id:tier} of lowLevel?DECOR_TIERS.slice(0,1):DECOR_TIERS)for(const {id:color} of DECOR_COLORS){const id=`perch-${color}-${tier}`;if((complete||id!=='perch-aqua-special')&&!w.decor.inventory.some(i=>i.id===id))w.decor.inventory.push({id,slot:'perch',color,tier});}
 return w;
}
async function open(page){await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await page.locator('.game-scene-controls-toggle').click();await page.locator('.game-bottom-dock [data-game-panel=decorate]').click();await expect(page.locator('[data-decor-draw=perch]')).toBeVisible();}
async function start(page,w,size={width:390,height:844}){await page.setViewportSize(size);await page.addInitScript(now=>{Date.now=()=>now;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);await page.goto('');await record(page,w);await page.goto('game/');await open(page);}
const status=page=>page.locator('[data-decor-guarantee]');
const draw=page=>page.locator('[data-decor-draw=perch]');

test('duplicate progress survives category, close and reload; one guaranteed draw completes the category',async({page})=>{
 const w=fixture();w.decor.duplicateStreaks.perch=1;await start(page,w);await expect(status(page)).toHaveAttribute('data-decor-guarantee','1');await draw(page).click();
 await expect(status(page)).toHaveAttribute('data-decor-guarantee','ready');await expect(draw(page)).toBeDisabled();let saved=await record(page);expect(saved.decor.points).toBe(988);expect(saved.decor.draws).toBe(1);expect(saved.decor.duplicateStreaks.perch).toBe(2);
 await page.locator('[data-decor-slot=toy]').click();await expect(status(page)).toHaveAttribute('data-decor-guarantee','0');await page.locator('[data-decor-slot=perch]').click();await expect(status(page)).toHaveAttribute('data-decor-guarantee','ready');
 await page.locator('[data-game-close-panel]').click();await page.locator('.game-bottom-dock [data-game-panel=decorate]').click();await expect(status(page)).toHaveAttribute('data-decor-guarantee','ready');
 // Advance only this synthetic save's cooldown, leaving progression and inventory intact.
 saved=await record(page);saved.tick++;saved.revision++;await record(page,saved);await page.reload();await open(page);await expect(status(page)).toHaveAttribute('data-decor-guarantee','ready');await expect(draw(page)).toBeEnabled();
 await page.locator('[data-game-details=draw-odds]>summary').click();await expect(page.locator('[data-game-details=draw-odds]')).toContainText('きらめき 100%');await page.locator('[data-game-details=draw-odds]>summary').click();
 const before=await record(page);await draw(page).evaluate(el=>{el.click();el.click();});await expect(status(page)).toHaveAttribute('data-decor-guarantee','complete');await expect(draw(page)).toBeDisabled();await expect(draw(page)).toContainText('Gems消費なし');
 const after=await record(page);expect(after.decor.points).toBe(before.decor.points-20);expect(after.decor.draws).toBe(before.decor.draws+1);expect(after.decor.duplicateStreaks.perch).toBe(0);expect(after.decor.inventory.filter(i=>i.id==='perch-aqua-special')).toHaveLength(1);for(const key of ['birds','economy','lifecycle','protagonist','encounters'])expect(after[key],key).toEqual(before[key]);
 await page.reload();await open(page);await expect(status(page)).toHaveAttribute('data-decor-guarantee','complete');expect((await record(page)).decor).toEqual(after.decor);
});

test('all unlocked items stop spending and the next level keeps saved protection',async({page})=>{
 const w=fixture({lowLevel:true,complete:true});w.decor.duplicateStreaks.perch=2;await start(page,w);await expect(status(page)).toHaveAttribute('data-decor-guarantee','complete');await expect(status(page)).toContainText('Lv.3');await expect(draw(page)).toBeDisabled();
 const before=await record(page);await draw(page).dispatchEvent('click');expect((await record(page)).decor).toEqual(before.decor);
 const unlocked=await record(page);unlocked.decor.lifetimePoints=160;unlocked.revision++;await record(page,unlocked);await page.reload();await open(page);await expect(status(page)).toHaveAttribute('data-decor-guarantee','ready');await draw(page).click();await expect(status(page)).toHaveAttribute('data-decor-guarantee','0');const after=await record(page);expect(after.decor.points).toBe(0);expect(after.decor.inventory.filter(i=>i.slot==='perch'&&i.tier==='lovely')).toHaveLength(1);expect(after.decor.inventory.some(i=>i.tier==='special')).toBe(false);
});

test('a deployed root10 save migrates without losing the current garden or collection',async({page})=>{
 const old=JSON.parse(readFileSync(new URL('../fixtures/v10-gacha-world.json',import.meta.url),'utf8'));await start(page,old);await expect(status(page)).toHaveAttribute('data-decor-guarantee','0');const saved=await record(page);expect(saved.version).toBe(11);expect(saved.encounters.version).toBe(12);expect(saved.decor.inventory).toEqual(old.decor.inventory);expect(saved.decor.points).toBe(old.decor.points);expect(saved.encounters).toEqual(old.encounters);expect(saved.birds).toEqual(old.birds);expect(Object.values(saved.decor.duplicateStreaks)).toEqual(Array(9).fill(0));
 await page.reload();await open(page);expect((await record(page)).decor).toEqual(saved.decor);
});

for(const streak of [0,1,2])test(`short-phone guarantee status ${streak} keeps the shelf filter in the first viewport`,async({page})=>{
 const w=fixture();w.decor.duplicateStreaks.perch=streak;await start(page,w,{width:320,height:420});await expect(status(page)).toHaveAttribute('data-decor-guarantee',streak===2?'ready':String(streak));await expect(page.locator('[data-decor-filter=all]')).toBeInViewport();await expect(draw(page)).toBeInViewport();
});
