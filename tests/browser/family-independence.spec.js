import {test,expect} from '@playwright/test';
import {createWorld,createBird,validateWorld} from '../../src/engine.js';
const NOW=Date.UTC(2026,10,5);
function family({couple=false,count=6}={}){
 const w=createWorld(NOW);w.paused=true;w.settings.motion=false;w.settings.careSound=false;
 for(let i=1;i<count;i++)createBird(w,{home:'resident',name:i===2?'ひなた':`家族${i}`,sex:i%2?'male':'female'});
 const pair=(a,b)=>{a.partner=b.id;b.partner=a.id;a.pairTick=b.pairTick=0;};pair(w.birds[0],w.birds[1]);if(couple)pair(w.birds[2],w.birds[3]);
 validateWorld(w);return w;
}
async function record(page,w){return page.evaluate(value=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('world',value?'readwrite':'readonly'),q=value?tx.objectStore('world').put(value,'current'):tx.objectStore('world').get('current');tx.oncomplete=()=>{resolve(q.result);db.close();};tx.onerror=()=>reject(tx.error);};}),w);}
async function start(page,size,w){
 await page.setViewportSize(size);await page.addInitScript(now=>{Date.now=()=>now;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);
 await page.goto('');await record(page,w);await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 await page.locator('.game-scene-controls-toggle').click();await page.locator('.game-bottom-dock [data-game-panel=family]').click();await expect(page.locator('.game-independence')).toBeVisible();await page.locator('.game-independence>summary').click();
}
async function reachable(control,size){await control.scrollIntoViewIfNeeded();const r=await control.boundingBox();expect(r).not.toBeNull();expect(r.width).toBeGreaterThanOrEqual(44);expect(r.height).toBeGreaterThanOrEqual(44);expect(r.x).toBeGreaterThanOrEqual(0);expect(r.x+r.width).toBeLessThanOrEqual(size.width+1);expect(r.y).toBeGreaterThanOrEqual(0);expect(r.y+r.height).toBeLessThanOrEqual(size.height+1);expect(await control.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===el||el.contains(hit);})).toBe(true);}
for(const size of [{width:320,height:240},{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1440,height:900}])test(`explicit family independence keeps safe controls and records ${size.width}x${size.height}`,async({page},info)=>{
 const w=family();await start(page,size,w);await expect(page.locator('[data-independence-open=b1],[data-independence-open=b2]')).toHaveCount(0);
 const ask=page.locator('[data-independence-open=b3]');await ask.click();const dialog=page.locator('.game-independence-dialog');await expect(dialog).toBeVisible();await expect(dialog.locator('[data-independence-cancel]')).toBeFocused();await expect(dialog).toContainText('名前・血縁・つがい・日記・持ち物は消えません');
 await page.waitForTimeout(3200);expect((await record(page)).birds).toEqual(w.birds);await dialog.press('Escape');await expect(dialog).not.toBeVisible();expect((await record(page)).birds).toEqual(w.birds);
 await ask.click();await reachable(dialog.locator('[data-independence-cancel]'),size);await dialog.locator('[data-independence-cancel]').click();await expect(dialog).not.toBeVisible();expect((await record(page)).birds).toEqual(w.birds);
 await ask.click();const accept=dialog.locator('[data-independence-accept]');await reachable(accept,size);await info.attach('independence-consent',{body:await page.screenshot(),contentType:'image/png'});await accept.click();await expect(dialog).not.toBeVisible();
 const saved=await record(page);expect(saved.birds).toHaveLength(6);expect(saved.birds.filter(b=>b.home==='resident')).toHaveLength(5);expect(saved.birds.find(b=>b.id==='b3').home).toBe('departed');expect(saved.events.filter(e=>e.kind==='depart')).toHaveLength(1);expect(saved.adoption.dismissed).toContain('b3');await expect(page.locator('[data-family-focus=b3]').first()).toBeAttached();
 await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');expect((await record(page)).birds).toEqual(saved.birds);
 await page.locator('.game-scene-controls-toggle').click();await page.locator('.game-field-nav [data-game-panel=friends]').click();const invite=page.locator('[data-field-invite=b3]');await expect(invite).toBeEnabled();await invite.click();await expect.poll(async()=>(await record(page)).birds.find(b=>b.id==='b3').home).toBe('visitor');expect((await record(page)).birds).toHaveLength(6);
});

test('couple consultation moves both adults while the protagonist couple remains',async({page})=>{
 const w=family({couple:true});await start(page,{width:390,height:844},w);await expect(page.locator('[data-independence-open=b4]')).toHaveCount(0);await page.locator('[data-independence-open=b3]').click();const dialog=page.locator('.game-independence-dialog');await expect(dialog).toContainText('2羽が家族の枠');await dialog.locator('[data-independence-accept]').click();await expect(dialog).not.toBeVisible();const saved=await record(page);for(const id of ['b3','b4'])expect(saved.birds.find(b=>b.id===id).home).toBe('departed');for(const id of ['b1','b2'])expect(saved.birds.find(b=>b.id===id).home).toBe('resident');expect(saved.birds[2].partner).toBe('b4');expect(saved.birds[3].partner).toBe('b3');expect(saved.events.at(-1).ids).toEqual(['b3','b4']);
});

test('another tab update closes the captured consultation and cannot move a different bird',async({page,context})=>{
 await start(page,{width:390,height:844},family());await page.locator('[data-independence-open=b3]').click();const dialog=page.locator('.game-independence-dialog');await expect(dialog).toBeVisible();
 const other=await context.newPage();await other.goto('');await other.evaluate(async()=>{const {openGameStore}=await import('/buncho-ureshi/src/game-store.js'),{renameBird}=await import('/buncho-ureshi/src/engine.js');const store=await openGameStore();try{await store.transact(w=>{renameBird(w,'b3','変わった名前');return w;});}finally{store.close();}});await other.close();await page.bringToFront();await expect(dialog).not.toBeVisible();expect((await record(page)).birds.find(b=>b.id==='b3').home).toBe('resident');await expect(page.locator('[data-independence-open=b3]')).toContainText('変わった名前');
});

test('tiny-screen keyboard focus scrolls consent buttons into view without manual scrolling',async({page})=>{
 const size={width:320,height:240};await start(page,size,family());await page.locator('[data-independence-open=b3]').click();const dialog=page.locator('.game-independence-dialog'),cancel=dialog.locator('[data-independence-cancel]'),accept=dialog.locator('[data-independence-accept]');
 const visible=async button=>{await expect(button).toBeFocused();await expect.poll(async()=>{const r=await button.boundingBox();return !!r&&r.y>=0&&r.y+r.height<=size.height+1;}).toBe(true);};
 await visible(cancel);await cancel.press('Tab');await visible(accept);await accept.press('Shift+Tab');await visible(cancel);await cancel.press('Shift+Tab');await visible(accept);await dialog.press('Escape');await expect(dialog).not.toBeVisible();expect((await record(page)).birds.filter(b=>b.home==='resident')).toHaveLength(6);
});
