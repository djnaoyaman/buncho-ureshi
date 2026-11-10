import {test,expect} from '@playwright/test';
import {createWorld} from '../../src/engine.js';
const now=Date.parse('2026-11-10T12:00:00+09:00');
async function record(page,world){return page.evaluate(world=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onsuccess=()=>{const d=r.result,t=d.transaction('world',world?'readwrite':'readonly'),q=world?t.objectStore('world').put(world,'current'):t.objectStore('world').get('current');t.oncomplete=()=>{d.close();resolve(q.result);};t.onerror=()=>reject(t.error);};}),world);}
function ready(){const w=createWorld(now);w.paused=true;w.settings.careSound=false;w.birds[0].needs.food=w.birds[0].needs.energy=100;return w;}
async function setup(page,w=ready()){
 await page.context().addInitScript(at=>{Date.now=()=>Number(sessionStorage.getItem('household-test-now')??at);localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));},now);
 await page.goto('');await record(page,w);await page.goto('game/');await expect(page.locator('[data-household-income]')).toBeVisible();
}
for(const width of [320,390,430,768])test(`household receipt persists with no overflow at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1024});const original=ready();await setup(page,original);
 const card=page.locator('.game-household-income'),claim=page.locator('[data-household-income]');await expect(claim).toBeEnabled();await claim.click();await expect(card).toContainText('今日の30 Goldは受け取りました');await expect(claim).toBeDisabled();
 const saved=await record(page);expect(saved.economy.gold).toBe(30);expect(saved.economy.household.lastClaimedDay).toBe('2026-11-10');for(const key of ['birds','archive','journal','events','decor','seed'])expect(saved[key]).toEqual(original[key]);
 await page.reload();await expect(page.locator('[data-household-income]')).toBeDisabled();expect((await record(page)).economy.gold).toBe(30);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const size=await page.locator('[data-household-income]').boundingBox();expect(size.height).toBeGreaterThanOrEqual(48);
});
test('legacy12 starts tomorrow and exports its exact raw migration copy',async({page})=>{
 const old=ready();old.version=12;old.economy.version=1;delete old.economy.household;old.economy.gold=old.economy.lifetimeGold=173;await setup(page,old);
 await expect(page.locator('.game-household-income')).toContainText('2026-11-11から');await expect(page.locator('[data-household-income]')).toBeDisabled();expect((await record(page)).economy.gold).toBe(173);
 await page.locator('.game-scene-controls-toggle').click();await page.locator('[data-game-open-menu]').click();await page.locator('#game-menu-settings').click();await page.locator('[data-game-details="management"] summary').click();
 const download=page.waitForEvent('download');await page.locator('[data-game-action="export-household-migration"]').click();const file=await download;const stream=await file.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);expect(JSON.parse(Buffer.concat(chunks).toString())).toEqual(old);
});
test('two open tabs receive only30 Gold in total',async({page,context})=>{
 await setup(page);const peer=await context.newPage();await peer.goto('game/');await expect(peer.locator('[data-household-income]')).toBeEnabled();
 await Promise.all([page.locator('[data-household-income]').dispatchEvent('click'),peer.locator('[data-household-income]').dispatchEvent('click')]);await expect.poll(async()=>(await record(page)).economy.gold).toBe(30);
 await page.reload();await peer.reload();await expect(page.locator('[data-household-income]')).toBeDisabled();await expect(peer.locator('[data-household-income]')).toBeDisabled();
});
