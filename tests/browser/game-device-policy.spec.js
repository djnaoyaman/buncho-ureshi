import {test,expect,devices} from '@playwright/test';
import {createWorld,renameBird} from '../../src/engine.js';
import {GAME_DEVICE_CHOICE_KEY} from '../../src/game-environment.js';
const NOW=Date.UTC(2026,10,8,12),empty={cookies:[],origins:[]};
test.use({storageState:empty});
async function initialize(context){await context.addInitScript(now=>{
 Date.now=()=>now;
 localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));
 localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));
},NOW);}
async function record(page,replacement){return page.evaluate(async world=>{
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('world'))r.result.createObjectStore('world');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction('world',world?'readwrite':'readonly'),store=tx.objectStore('world');let value;if(world)store.put(world,'current');else{const r=store.get('current');r.onsuccess=()=>{value=r.result;};}tx.oncomplete=()=>resolve(world||value);tx.onabort=tx.onerror=()=>reject(tx.error);});}finally{db.close();}
},replacement);}
const notice=page=>page.locator('.game-environment-notice');
async function ready(page){await expect(page.locator('.game-app')).toBeVisible();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');}

test('desktop announcement precedes game startup, preserves the existing save, and allows explicit continue',async({page,context})=>{
 await initialize(context);await page.goto('encyclopedia/');
 const world=createWorld(NOW);world.paused=true;world.settings.careSound=false;renameBird(world,'b1','たいせつな名前');
 await record(page,world);await page.goto('game/');
 await expect(notice(page)).toBeVisible();await expect(notice(page)).toHaveAttribute('data-reason','device');
 await expect(page.getByRole('heading',{name:'スマートフォン・タブレットで遊んでね'})).toBeVisible();
 await expect(page.locator('.game-app')).toHaveCount(0);expect(await record(page)).toEqual(world);
 await expect(notice(page).getByRole('link',{name:'文鳥図鑑へ戻る'})).toHaveAttribute('href','/buncho-ureshi/encyclopedia/');
 await notice(page).getByRole('button',{name:'このまま遊ぶ'}).click();await ready(page);
 await expect(notice(page)).not.toBeVisible();expect((await record(page)).birds[0].name).toBe('たいせつな名前');
 expect(await page.evaluate(key=>localStorage.getItem(key),GAME_DEVICE_CHOICE_KEY)).toBeNull();
 await page.reload();await expect(notice(page)).toBeVisible();await expect(page.locator('.game-app')).toHaveCount(0);
});
test('optional remember choice persists only the notice preference and keeps desktop play available',async({page,context})=>{
 await initialize(context);await page.goto('game/');await expect(notice(page)).toBeVisible();
 await notice(page).locator('input').check();await notice(page).getByRole('button',{name:'このまま遊ぶ'}).click();await ready(page);
 const before=await record(page);expect(await page.evaluate(key=>localStorage.getItem(key),GAME_DEVICE_CHOICE_KEY)).toBe('continue');
 await page.reload();await ready(page);await expect(notice(page)).not.toBeVisible();expect(await record(page)).toEqual(before);
 await page.locator('.game-scene-controls-toggle').click();await page.locator('[data-game-open-menu]').click();await page.locator('#game-menu-settings').click();await page.locator('[data-game-device-review]').click();
 await expect(notice(page)).toBeVisible();expect(await page.evaluate(key=>localStorage.getItem(key),GAME_DEVICE_CHOICE_KEY)).toBeNull();expect(await record(page)).toEqual(before);
});
test('encyclopedia and studio stay available on desktop without device announcements',async({page,context})=>{
 await initialize(context);
 for(const route of ['encyclopedia/','studio/']){await page.goto(route);await expect(page.locator('body')).not.toHaveAttribute('data-world','buncho');await expect(notice(page)).toHaveCount(0);}
});
for(const deviceName of ['phone','tablet'])test(`${deviceName} portrait starts directly; rotation retains sheet, draft, focus and exact saved world`,async({browser,browserName,baseURL})=>{
 const device=deviceName==='tablet'?devices['iPad Mini']:devices[browserName==='webkit'?'iPhone 13':'Pixel 7'];
 // The desktop project's physical screen otherwise leaks into iPad emulation.
 // Model both viewport and physical screen as the same portrait device.
 const context=await browser.newContext({...device,screen:device.screen||device.viewport,baseURL,storageState:empty});
 try{
  await initialize(context);const page=await context.newPage();await page.goto('game/');await ready(page);
  await expect(page.locator('body')).toHaveAttribute('data-game-device','touch');await expect(notice(page)).not.toBeVisible();
  await page.locator('.game-scene-controls-toggle').tap();await page.locator('#game-open-bird').tap();
  await page.locator('.game-sheet-talk summary').tap();await page.locator('#game-words').fill('入力途中のことば');
  const before=await record(page),size=page.viewportSize();
  await page.setViewportSize({width:size.height,height:size.width});
  await expect(notice(page)).toBeVisible();await expect(notice(page)).toHaveAttribute('data-reason','orientation');
  await expect(notice(page).getByRole('button',{name:'このまま遊ぶ'})).toBeHidden();
  await expect(page.locator('.game-bird-sheet')).toHaveAttribute('open','');expect(await page.locator('#game-words').inputValue()).toBe('入力途中のことば');
  await page.waitForTimeout(3200);expect(await record(page)).toEqual(before);
  await page.setViewportSize(size);await expect(notice(page)).not.toBeVisible();
  await expect(page.locator('#game-words')).toHaveValue('入力途中のことば');await expect(page.locator('#game-words')).toBeFocused();
  expect(await record(page)).toEqual(before);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }finally{await context.close();}
});
test('landscape phone waits for portrait before opening the saved world',async({browser,browserName,baseURL})=>{
 const device=devices[browserName==='webkit'?'iPhone 13':'Pixel 7'];
 const context=await browser.newContext({...device,viewport:{width:844,height:390},screen:{width:844,height:390},baseURL,storageState:empty});
 try{await initialize(context);const page=await context.newPage();await page.goto('game/');await expect(notice(page)).toBeVisible();await expect(notice(page)).toHaveAttribute('data-reason','orientation');await expect(page.locator('.game-app')).toHaveCount(0);await page.setViewportSize({width:390,height:844});await ready(page);await expect(notice(page)).not.toBeVisible();}finally{await context.close();}
});


test('small desktop announcement with enlarged text keeps continue and exit reachable',async({page,context})=>{
 await initialize(context);await page.setViewportSize({width:320,height:300});await page.goto('game/');
 await expect(notice(page)).toBeVisible();await page.addStyleTag({content:'html {font-size:32px!important}'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const button=notice(page).getByRole('button',{name:'このまま遊ぶ'});await button.focus();await expect(button).toBeInViewport();
 const exit=notice(page).getByRole('link',{name:'文鳥図鑑へ戻る'});await exit.focus();await expect(exit).toBeInViewport();
 await exit.click();await expect(page.locator('body')).not.toHaveAttribute('data-world','buncho');await expect(notice(page)).toHaveCount(0);
});
