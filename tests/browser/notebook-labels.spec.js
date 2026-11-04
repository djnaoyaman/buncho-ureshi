import {test,expect} from '@playwright/test';
import {createWorld} from '../../src/engine.js';
import {createEncounterSystem} from '../../src/encounters.js';
import {ENCOUNTER_CATALOG} from '../../src/data/encounter-catalog.js';
import {inviteFixture} from '../fixtures/garden-invitation.js';
const NOW=Date.UTC(2026,10,4);
async function record(page,world){return page.evaluate(world=>new Promise((resolve,reject)=>{const open=indexedDB.open('buncho-ureshi-garden-v1',1);open.onupgradeneeded=()=>open.result.createObjectStore('world');open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,tx=db.transaction('world',world?'readwrite':'readonly'),s=tx.objectStore('world'),req=world?s.put(world,'current'):s.get('current');tx.oncomplete=()=>{db.close();resolve(req.result)};tx.onerror=()=>{db.close();reject(tx.error)}}}),world);}
async function fit(button){
 await expect(button).toBeVisible();await button.scrollIntoViewIfNeeded();
 const g=await button.evaluate(el=>{const b=el.getBoundingClientRect(),r=document.createRange();r.selectNodeContents(el);return{width:b.width,height:b.height,left:b.left,right:b.right,viewport:innerWidth,lines:[...r.getClientRects()].every(t=>t.left>=b.left&&t.right<=b.right&&t.top>=b.top&&t.bottom<=b.bottom),hit:el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))}});
 expect(g.width).toBeGreaterThanOrEqual(44);expect(g.height).toBeGreaterThanOrEqual(44);expect(g.left).toBeGreaterThanOrEqual(0);expect(g.right).toBeLessThanOrEqual(g.viewport);expect(g.lines).toBe(true);expect(g.hit).toBe(true);
}
async function controls(page){const toggle=page.locator('.game-scene-controls-toggle');if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();}
for(const size of [{width:320,height:240},{width:320,height:568},{width:390,height:844},{width:844,height:390}])test(`learning and garden books have distinct labels and preserve saves ${size.width}x${size.height}`,async({page},info)=>{
 await page.setViewportSize(size);
 await page.addInitScript(now=>{Date.now=()=>now;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);
 await page.route(/youtube|youtu\.be|googlevideo|ytimg/i,r=>r.abort());
 await page.goto('');const world=createWorld(NOW);world.paused=true;await record(page,world);
 await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await controls(page);
 const exit=page.getByRole('link',{name:'文鳥図鑑へ戻る',exact:true});await expect(exit).toHaveText('文鳥図鑑');await expect(exit).toHaveAttribute('href',/\/encyclopedia\/$/);await fit(exit);
 const before=await record(page);
 for(let i=0;i<2;i++){
  await page.locator('#game-nav-open').click();const menu=page.getByRole('button',{name:'庭の鳥図鑑',exact:true});await fit(menu);await menu.click();
  await expect(page.getByRole('heading',{name:'庭の鳥図鑑',exact:true})).toBeVisible();await expect(page.locator('.finch-notebook-intro')).toHaveText('庭で出会った鳥と、仲よくなった記録。');
  await page.locator('.finch-card').first().click();const back=page.getByRole('button',{name:'庭の鳥図鑑へ戻る',exact:true});await back.scrollIntoViewIfNeeded();await fit(back);await back.click();
  await expect(page.getByRole('heading',{name:'庭の鳥図鑑',exact:true})).toBeVisible();await page.locator('[data-game-close-panel]').click();
 }
 expect(await record(page)).toEqual(before);
 await page.locator('.game-field-nav [data-game-panel=outdoors]').click();
 const gardenButton=page.locator('.finch-garden>header').getByRole('button',{name:'庭の鳥図鑑',exact:true});await fit(gardenButton);
 await info.attach(`garden-label-${size.width}x${size.height}`,{body:await page.screenshot(),contentType:'image/png'});await gardenButton.click();
 await expect(page.getByRole('heading',{name:'庭の鳥図鑑',exact:true})).toBeVisible();await page.locator('[data-game-close-panel]').click();
 const after=await record(page);expect(after.birds).toEqual(before.birds);expect(after.economy).toEqual(before.economy);expect(after.encounters.discoveries).toEqual(before.encounters.discoveries);
 await fit(exit);await info.attach(`home-label-${size.width}x${size.height}`,{body:await page.screenshot(),contentType:'image/png'});await exit.click();
 await expect(page).toHaveURL(/\/encyclopedia\/$/);await expect(page.locator('body')).not.toHaveAttribute('data-world','buncho');
 await page.goBack();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await controls(page);await fit(page.getByRole('link',{name:'文鳥図鑑へ戻る',exact:true}));
 const restored=await record(page);expect(restored.birds).toEqual(before.birds);expect(restored.economy).toEqual(before.economy);expect(restored.encounters.discoveries).toEqual(before.encounters.discoveries);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});


test('embedded garden puts its notebook return in the dialog toolbar, clear of the guest at 320x240',async({page},info)=>{
 await page.setViewportSize({width:320,height:240});
 await page.addInitScript(now=>{Date.now=()=>now;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);
 const world=createWorld(NOW),system=createEncounterSystem(ENCOUNTER_CATALOG),entry=system.catalog[0],token=()=>({worldId:world.worldId,revision:world.revision});world.paused=true;world.settings.motion=false;
 inviteFixture(system,world,entry.id);system.open(world,entry.id,token());for(const step of entry.steps)system.act(world,world.encounters.active.instanceId,step.action,token());
 for(let p=10;p<80;p+=Math.min(8,80-p))system.pet(world,entry.id,Math.min(8,80-p),token());world.encounters.garden.open=false;
 await page.goto('');await record(page,world);await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await controls(page);
 await page.locator('#game-nav-open').click();await page.locator('#game-menu-notebook').click();await page.locator(`[data-encounter-page="${entry.id}"]`).click();
 await expect(page.locator('[data-finch-points]')).toHaveText('80');await page.locator('[data-encounter-invite-garden]').click();
 const back=page.locator('.finch-garden>header [data-encounter-back]'),guest=page.locator(`.finch-garden-visitor[data-encounter-page="${entry.id}"]`);await fit(back);await expect(guest).toBeVisible();
 const toolbar=await page.locator('.game-overlay-head').boundingBox(),backBox=await back.boundingBox();expect(backBox.y).toBeGreaterThanOrEqual(toolbar.y);expect(backBox.y+backBox.height).toBeLessThanOrEqual(toolbar.y+toolbar.height);
 await info.attach('embedded-garden-toolbar-320x240',{body:await page.screenshot(),contentType:'image/png'});
 await guest.click();await expect(page.locator('[data-finch-visits]')).toHaveText('2');await expect(page.locator('[data-finch-points]')).toHaveText('90');
 const saved=await record(page);expect(saved.birds).toEqual(world.birds);expect(saved.economy).toEqual(world.economy);
});
