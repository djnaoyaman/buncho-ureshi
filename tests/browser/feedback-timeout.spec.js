import {test,expect} from '@playwright/test';
import {createWorld,DECOR_SLOTS,DECOR_COLORS,DECOR_TIERS} from '../../src/engine.js';
const now=Date.UTC(2026,10,2,12),dbName='buncho-ureshi-garden-v1';
async function record(page,world){return page.evaluate(({dbName,world})=>new Promise((resolve,reject)=>{const open=indexedDB.open(dbName,1);open.onupgradeneeded=()=>open.result.createObjectStore('world');open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,tx=db.transaction('world',world?'readwrite':'readonly'),store=tx.objectStore('world'),req=world?store.put(world,'current'):store.get('current');tx.oncomplete=()=>{db.close();resolve(req.result)};tx.onerror=()=>{db.close();reject(tx.error)}}}),{dbName,world});}
async function openDecor(page){await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await page.locator('.game-scene-controls-toggle').click();await page.locator('.game-bottom-dock [data-game-panel="decorate"]').click();}
async function activate(page,selector){const item=page.locator(selector);await item.scrollIntoViewIfNeeded();if(test.info().project.use.hasTouch)await item.tap();else await item.click();}
async function offsets(page){return page.evaluate(()=>({slots:document.querySelector('.game-decor-slots').scrollLeft,collection:document.querySelector('.game-collection').scrollTop,panel:document.querySelector('.game-panel-overlay > .game-panel').scrollTop}));}
async function settled(page){await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));}
async function visibleSelectedCategory(page){expect(await page.locator('.game-decor-slots').evaluate(el=>{const a=el.getBoundingClientRect(),b=el.querySelector('[aria-pressed=true]').getBoundingClientRect();return b.left>=a.left-2&&b.right<=a.right+2})).toBe(true);}

test.beforeEach(async({context,page})=>{await context.addInitScript(n=>Date.now=()=>n,now);await page.route(/youtube|youtu\.be|googlevideo|ytimg/i,r=>r.abort());});

test('decoration feedback clears without panel redraw and does not return on refresh',async({page})=>{
 await page.goto('');const original=createWorld(now);original.paused=true;
 const item={id:'paper-rose-cozy',slot:'paper',color:'rose',tier:'cozy'};
 original.decor.inventory.push(item);await record(page,original);await page.goto('game/');await openDecor(page);
 await activate(page,'[data-decor-slot="paper"]');await activate(page,'[data-decor-preview="paper-rose-cozy"]');await activate(page,'[data-decor-equip="paper-rose-cozy"]');
 const notice=page.locator('.game-overlay-message');await expect(notice).toContainText('飾ったよ');
 const panel=await page.locator('.game-decoration').elementHandle();
 await expect(notice).toBeHidden({timeout:9000});expect(await panel.evaluate(el=>el.isConnected)).toBe(true);
 const peer=await record(page);peer.revision++;await record(page,peer);
 await expect.poll(()=>panel.evaluate(el=>el.isConnected),{timeout:10000}).toBe(false);
 await expect(page.locator('.game-overlay-message')).toHaveCount(0);
 await expect(page.locator('.game-message')).toHaveText('');
 expect((await record(page)).decor.equipped.paper).toBe('paper-rose-cozy');
});
