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
for(const size of [{width:390,height:680},{width:390,height:844}])test(`later decoration pages survive native selection and refresh ${size.width}x${size.height}`,async({page},info)=>{
 await page.setViewportSize(size);await page.goto('');const original=createWorld(now);original.paused=true;original.decor.points=original.decor.lifetimePoints=1000;
 for(const slot of DECOR_SLOTS)for(const color of DECOR_COLORS)for(const tier of DECOR_TIERS){const id=`${slot.id}-${color.id}-${tier.id}`;if(!original.decor.inventory.some(i=>i.id===id))original.decor.inventory.push({id,slot:slot.id,color:color.id,tier:tier.id});}
 await record(page,original);await page.goto('game/');await openDecor(page);
 const paper=page.locator('[data-decor-slot="paper"]');await paper.scrollIntoViewIfNeeded();await settled(page);const before=(await offsets(page)).slots;expect(before).toBeGreaterThan(100);
 await activate(page,'[data-decor-slot="paper"]');await settled(page);expect(Math.abs((await offsets(page)).slots-before)).toBeLessThanOrEqual(2);await visibleSelectedCategory(page);
 await expect(page.locator('[data-decor-draw]')).toHaveAttribute('data-decor-draw','paper');await expect(page.locator('[data-preview-item]')).toHaveAttribute('data-preview-item','paper-mint-cozy');
 await activate(page,'[data-decor-slot="paper"]');await settled(page);await visibleSelectedCategory(page);
 await info.attach('later-category-selected',{body:await page.screenshot(),contentType:'image/png'});
 await activate(page,'[data-decor-preview="paper-rose-cozy"]');await expect(page.locator('[data-preview-item]')).toHaveAttribute('data-preview-item','paper-rose-cozy');expect((await record(page)).decor.equipped).toEqual(original.decor.equipped);expect(Math.abs((await offsets(page)).slots-before)).toBeLessThanOrEqual(2);
 await activate(page,'[data-decor-cancel]');await expect(page.locator('[data-preview-item]')).toHaveAttribute('data-preview-item','paper-mint-cozy');await visibleSelectedCategory(page);
 await activate(page,'[data-decor-filter="owned"]');await activate(page,'[data-decor-tier="lovely"]');await visibleSelectedCategory(page);await activate(page,'[data-decor-tier="cozy"]');
 // Exercise the second row and then a real periodic refresh. The peer changes
 // only a revision in this synthetic context, never a user's save.
 await activate(page,'[data-decor-preview="paper-peach-cozy"]');await expect(page.locator('[data-preview-item]')).toHaveAttribute('data-preview-item','paper-peach-cozy');
 await settled(page);const tracks=await offsets(page),oldPanel=await page.locator('.game-decoration').elementHandle();const peer=await record(page);peer.revision++;await record(page,peer);
 await expect.poll(()=>oldPanel.evaluate(el=>el.isConnected),{timeout:10000}).toBe(false);await settled(page);const refreshed=await offsets(page);for(const key of ['slots','collection','panel'])expect(Math.abs(refreshed[key]-tracks[key]),key).toBeLessThanOrEqual(2);
 await expect(page.locator('[data-preview-item]')).toHaveAttribute('data-preview-item','paper-peach-cozy');await visibleSelectedCategory(page);
 await activate(page,'[data-decor-equip="paper-peach-cozy"]');await expect(page.locator('.game-overlay-message')).toContainText('飾ったよ');const equipped=await record(page);expect(equipped.decor.equipped).toEqual({...original.decor.equipped,paper:'paper-peach-cozy'});expect(equipped.decor.inventory).toEqual(original.decor.inventory);expect(equipped.decor.points).toBe(original.decor.points);expect(equipped.birds).toEqual(original.birds);expect(equipped.economy).toEqual(original.economy);
 await activate(page,'[data-decor-slot="water"]');await expect(page.locator('.game-overlay-message')).toHaveCount(0);await expect(page.locator('[data-preview-item]')).toHaveAttribute('data-preview-item',original.decor.equipped.water);
 await activate(page,'[data-decor-slot="paper"]');await visibleSelectedCategory(page);await page.locator('[data-game-close-panel]').click();await page.locator('.game-bottom-dock [data-game-panel="decorate"]').click();await visibleSelectedCategory(page);
 await info.attach('later-item-equipped',{body:await page.screenshot(),contentType:'image/png'});
 await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');expect((await record(page)).decor.equipped.paper).toBe('paper-peach-cozy');await expect(page.locator('.game-message.is-error')).toHaveCount(0);
});
