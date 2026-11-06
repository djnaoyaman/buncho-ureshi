import {test,expect} from '@playwright/test';
import {createWorld,createBird,validateWorld} from '../../src/engine.js';
import {lifeStatus} from '../../src/life-care.js';

const NOW=Date.UTC(2026,10,4),DAY=86400000;
const SIZES=[{width:320,height:568},{width:844,height:390},{width:1440,height:900}];

function seed({empty=false}={}){
 const w=createWorld(NOW,84);w.paused=true;w.encounters.gardenFriends.companions=['b1'];w.encounters.gardenFriends.accompany=true;w.settings.motion=false;w.settings.careSound=false;w.economy.gold=w.economy.lifetimeGold=100;
 const resident=empty?null:createBird(w,{home:'resident',name:'つむぎ',sex:'male'});
 const returning=empty?null:createBird(w,{home:'departed',name:'ひなた',sex:'female'});
 if(returning)returning.milestones.push({kind:'adopt',otherId:null,tick:w.tick});
 const visitor=createBird(w,{home:'visitor',name:'おきゃくさん',sex:'male'});
 lifeStatus(w,'b1').condition={kind:'injury',sinceAt:NOW,deadlineAt:NOW+DAY};
 return {w:validateWorld(w),resident,returning,visitor};
}

async function record(page,value){
 return page.evaluate(value=>new Promise((resolve,reject)=>{
  const request=indexedDB.open('buncho-ureshi-garden-v1',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('world');request.onerror=()=>reject(request.error);
  request.onsuccess=()=>{const db=request.result,tx=db.transaction('world',value?'readwrite':'readonly'),query=value?tx.objectStore('world').put(value,'current'):tx.objectStore('world').get('current');tx.oncomplete=()=>{db.close();resolve(query.result);};tx.onerror=()=>reject(tx.error);};
 }),value);
}
async function start(page,w,{size=SIZES[0],at=NOW+DAY}={}){
 await page.setViewportSize(size);
 await page.addInitScript(at=>{window.__successionNow=at;Date.now=()=>window.__successionNow;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},at);
 await page.goto('');await record(page,w);await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
}
async function controls(page){const toggle=page.locator('.game-scene-controls-toggle');if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();}
async function panel(page,id){
 if(await page.locator('.game-panel-overlay').isVisible())await page.locator('[data-game-close-panel]').click();
 await controls(page);await page.locator('[data-game-open-menu]').click();await page.locator(`#game-menu-${id}`).click();await expect(page.locator('.game-panel-overlay')).toBeVisible();
}
async function noOverflow(page,dialog){
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 if(dialog){const box=await dialog.boundingBox();expect(box).not.toBeNull();const size=page.viewportSize();expect(box.x).toBeGreaterThanOrEqual(-1);expect(box.y).toBeGreaterThanOrEqual(-1);expect(box.x+box.width).toBeLessThanOrEqual(size.width+1);expect(box.y+box.height).toBeLessThanOrEqual(size.height+1);expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);}
}
async function reachable(control,size,{scroll=true}={}){
 if(scroll)await control.scrollIntoViewIfNeeded();
 await expect.poll(async()=>{const box=await control.boundingBox();return !!box&&box.x>=-1&&box.y>=-1&&box.x+box.width<=size.width+1&&box.y+box.height<=size.height+1;}).toBe(true);
 const box=await control.boundingBox();expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
 expect(await control.evaluate(el=>{const box=el.getBoundingClientRect(),hit=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2);return hit===el||el.contains(hit);})).toBe(true);
}
async function screenshot(page,info,name){await info.attach(name,{body:await page.screenshot({path:info.outputPath(`${name}.png`),scale:'css'}),contentType:'image/png'});}
async function ordinaryVisitor(page,bird){
 expect((await record(page)).birds.find(b=>b.id===bird.id).home).toBe('visitor');
 const button=page.locator(`.game-room-bird[data-game-scene-select][data-bird-id="${bird.id}"]`),compact=await page.locator('.game-room').getAttribute('data-compact')==='true';
 // Short screens intentionally show only the selected bird; use its normal picker.
 if(compact){await controls(page);await page.locator('.game-scene-toolbar [data-bird-step="1"]').click();}
 await expect(button).toHaveAccessibleName(new RegExp(`^${bird.name}、お友達、`));
 if(compact)await page.locator('.game-scene-toolbar [data-bird-step="-1"]').click();
}
const identities=w=>w.birds.map(({id,name,naming,parents,partner,generation})=>({id,name,naming,parents,partner,generation}));

for(const [index,size] of SIZES.entries())test(`family choice preserves the story, safe consent and garden identity ${size.width}x${size.height}`,async({page},info)=>{
 const {w,resident,returning,visitor}=seed(),candidate=index===2?returning:resident,entry=['health','family','memorial'][index],errors=[];
 page.on('pageerror',e=>errors.push(e.message));await start(page,w,{size});await expect(page.locator('[data-home-role=self]')).toHaveCount(0);
 await ordinaryVisitor(page,visitor);
 await panel(page,entry);const before=await record(page),ask=page.locator(`[data-successor-open="${candidate.id}"]`);
 await expect(page.locator(`[data-successor-open="${resident.id}"]`)).toBeEnabled();await expect(page.locator(`[data-successor-open="${returning.id}"]`)).toBeEnabled();await expect(page.locator(`[data-successor-open="${visitor.id}"]`)).toHaveCount(0);
 await reachable(ask,size);await noOverflow(page);await screenshot(page,info,'family-successor-choices');
 await ask.click();const dialog=page.locator('.game-successor-dialog'),cancel=dialog.locator('[data-successor-cancel]'),accept=dialog.locator('[data-successor-accept]');
 await expect(dialog).toBeVisible();await expect(cancel).toBeFocused();await expect(dialog).toContainText(candidate.name);await expect(dialog).toContainText('GoldやGemsは使いません');
 if(candidate===returning)await expect(dialog).toContainText('同じ文鳥が、おうちに帰ってきます');
 await noOverflow(page,dialog);await reachable(cancel,size,{scroll:false});
 await cancel.press('Tab');await expect(accept).toBeFocused();await reachable(accept,size,{scroll:false});
 await accept.press('Tab');await expect(cancel).toBeFocused();await reachable(cancel,size,{scroll:false});
 await cancel.press('Shift+Tab');await expect(accept).toBeFocused();await reachable(accept,size,{scroll:false});
 expect(await record(page)).toEqual(before);await screenshot(page,info,'family-successor-confirmation');
 await dialog.press('Escape');await expect(dialog).not.toBeVisible();await expect(ask).toBeFocused();expect(await record(page)).toEqual(before);
 await ask.click();await expect(cancel).toBeFocused();await cancel.click();await expect(dialog).not.toBeVisible();await expect(ask).toBeFocused();expect(await record(page)).toEqual(before);
 await ask.click();await reachable(accept,size);await accept.evaluate(button=>{button.click();button.click();});await expect(dialog).not.toBeVisible();
 await expect.poll(async()=>(await record(page)).protagonist.birdId).toBe(candidate.id);
 const saved=await record(page);expect(saved.protagonist.lineage).toEqual(['b1',candidate.id]);expect(saved.protagonist.familySelections).toEqual([{fromId:'b1',toId:candidate.id,tick:saved.tick,at:saved.lifecycle.seenAt}]);expect(saved.events.filter(e=>e.kind==='succession')).toHaveLength(1);
 expect(saved.worldId).toBe(before.worldId);expect(identities(saved)).toEqual(identities(before));expect(saved.economy).toEqual(before.economy);expect(saved.decor).toEqual(before.decor);expect(saved.seed).toBe(before.seed);expect(saved.birds.find(b=>b.id===candidate.id).home).toBe('resident');
 await panel(page,'memorial');await expect(page.locator('.life-protagonist')).toContainText(`第2代の主人公 · ${candidate.name}`);await expect(page.locator('.life-grave h4')).toHaveText('おもち');await expect(page.locator('[data-successor-open]')).toHaveCount(0);await screenshot(page,info,'family-successor-committed');
 await page.locator('[data-life-pray=b1]').click();await expect(page.locator('[data-life-pray=b1]')).toBeDisabled();
 await panel(page,'diary');await page.locator('[data-game-details=full-diary]>summary').click();await expect(page.locator('.game-full-diary')).toContainText(candidate.name);await expect(page.locator('.game-full-diary')).toContainText('第2代の主人公');
 await panel(page,'settings');await page.locator('[data-game-details=wallet]>summary').click();await expect(page.locator('.game-wallet-details')).toContainText('Gold：100');await expect(page.locator('.game-wallet-details')).toContainText(`Gems：${saved.decor.points.toLocaleString('ja-JP')}`);
 await page.locator('[data-game-close-panel]').click();await expect(page.locator(`[data-bird-id="${candidate.id}"] [data-home-role=self]`)).toHaveText(`自分＝${candidate.name}`);
 await controls(page);await page.locator('.game-field-nav [data-game-panel=outdoors]').click();await expect(page.locator(`[data-garden-household="${candidate.id}"]`)).toBeVisible();await expect(page.locator('[data-garden-household=b1]')).toHaveCount(0);
 await page.locator(`[data-garden-household="${candidate.id}"]`).click();await expect(page.locator('#game-sheet-title')).toHaveText(candidate.name);await page.locator('[data-game-close-bird]').click();await page.reload();
 await expect(page.locator('[data-home-role=self]')).toHaveText(`自分＝${candidate.name}`);const reloaded=await record(page);expect(reloaded.protagonist).toEqual(saved.protagonist);expect(identities(reloaded)).toEqual(identities(before));expect(reloaded.events.filter(e=>e.kind==='succession')).toHaveLength(1);expect(reloaded.economy.gold).toBe(100);expect(reloaded.decor).toEqual(before.decor);expect(reloaded.lifecycle.birds.find(b=>b.birdId==='b1').prayerCount).toBe(1);expect(errors).toEqual([]);
});

test('confirmation rechecks a live care deadline without silently choosing another family member',async({page})=>{
 const {w,resident,returning}=seed();lifeStatus(w,'b1').condition={kind:'injury',sinceAt:NOW-1000,deadlineAt:NOW+DAY-1000};lifeStatus(w,resident.id).condition={kind:'respiratory',sinceAt:NOW,deadlineAt:NOW+DAY};validateWorld(w);
 await start(page,w,{size:SIZES[1],at:NOW+DAY-1000});await panel(page,'health');await page.locator(`[data-successor-open="${resident.id}"]`).click();const dialog=page.locator('.game-successor-dialog'),before=await record(page);
 await page.evaluate(at=>{window.__successionNow=at;},NOW+DAY+1000);await page.waitForTimeout(3200);await expect(dialog).toBeVisible();expect(await record(page)).toEqual(before);
 await dialog.locator('[data-successor-accept]').click();await expect(dialog).not.toBeVisible();await expect(page.locator('.game-panel-overlay')).toContainText('今はこの家族を選べません');
 const saved=await record(page);expect(saved.lifecycle.birds.find(b=>b.birdId===resident.id).death.cause).toBe('illness');expect(saved.protagonist).toEqual(before.protagonist);expect(saved.events.filter(e=>e.kind==='succession')).toHaveLength(0);expect(saved.economy.gold).toBe(before.economy.gold);expect(saved.decor).toEqual(before.decor);expect(saved.seed).toBe(before.seed);await expect(page.locator(`[data-successor-open="${resident.id}"]`)).toHaveCount(0);await expect(page.locator(`[data-successor-open="${returning.id}"]`)).toBeEnabled();
});

test('a peer save invalidates captured consent and restores the updated candidate',async({page,context})=>{
 const {w,resident}=seed();await start(page,w);await panel(page,'family');await page.locator(`[data-successor-open="${resident.id}"]`).click();const dialog=page.locator('.game-successor-dialog'),oldAccept=await dialog.locator('[data-successor-accept]').elementHandle(),before=await record(page);
 const other=await context.newPage();await other.goto('');await other.evaluate(async id=>{const {openGameStore}=await import('/buncho-ureshi/src/game-store.js'),{renameBird}=await import('/buncho-ureshi/src/engine.js');const store=await openGameStore();try{await store.transact(w=>{renameBird(w,id,'つむぎの新しい名前');return w;});}finally{store.close();}const updates=new BroadcastChannel('buncho-garden-updates');updates.postMessage({updated:true});updates.close();},resident.id);await other.close();await page.bringToFront();
 await expect(dialog).not.toBeVisible();await expect(page.locator(`[data-successor-open="${resident.id}"]`)).toContainText('つむぎの新しい名前');const peerSaved=await record(page);await oldAccept.evaluate(button=>button.click());expect(await record(page)).toEqual(peerSaved);expect(peerSaved.protagonist).toEqual(before.protagonist);expect(peerSaved.events.filter(e=>e.kind==='succession')).toHaveLength(0);expect(peerSaved.economy).toEqual(before.economy);
 await page.locator(`[data-successor-open="${resident.id}"]`).click();await expect(dialog).toContainText('つむぎの新しい名前');await dialog.locator('[data-successor-cancel]').click();await expect(dialog).not.toBeVisible();expect(await record(page)).toEqual(peerSaved);
});

test('an empty family keeps memorial, settings, navigation and ordinary visitors usable',async({page},info)=>{
 const {w,visitor}=seed({empty:true});await start(page,w,{size:SIZES[0]});const before=await record(page);await expect(page.locator('[data-home-role=self]')).toHaveCount(0);await expect(page.locator(`[data-bird-id="${visitor.id}"] [data-home-role=friend]`)).toHaveCount(1);
 await panel(page,'memorial');await expect(page.locator('.life-protagonist')).toContainText('選べる家族もいません');await expect(page.locator('.life-protagonist')).toContainText('家系・思い出・お墓・持ち物は残ります');await expect(page.locator('[data-successor-open]')).toHaveCount(0);await expect(page.locator('.life-grave h4')).toHaveText('おもち');await noOverflow(page);await screenshot(page,info,'family-successor-empty-family');
 await reachable(page.locator('[data-game-close-panel]'),SIZES[0]);await page.locator('[data-game-close-panel]').click();await expect(page.locator('.game-panel-overlay')).not.toBeVisible();
 await panel(page,'settings');await expect(page.locator('#game-settings-title')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('.game-panel-overlay')).not.toBeVisible();
 await panel(page,'family');await expect(page.locator('[data-successor-open]')).toHaveCount(0);await page.locator('[data-game-close-panel]').click();await controls(page);await page.locator('.game-field-nav [data-game-panel=friends]').click();await expect(page.locator('.game-panel-overlay')).toBeVisible();await page.locator('[data-game-close-panel]').click();
 await page.locator(`.game-room-bird[data-game-scene-select][data-bird-id="${visitor.id}"]`).click();await expect(page.locator('#game-sheet-title')).toHaveText(visitor.name);await page.locator('[data-game-close-bird]').click();await page.reload();await expect(page.locator('[data-home-role=self]')).toHaveCount(0);
 const saved=await record(page);expect(saved.worldId).toBe(before.worldId);expect(saved.protagonist).toEqual(before.protagonist);expect(saved.birds).toEqual(before.birds);expect(saved.events).toEqual(before.events);expect(saved.economy).toEqual(before.economy);expect(saved.decor).toEqual(before.decor);expect(saved.seed).toBe(before.seed);expect(saved.events.filter(e=>e.kind==='succession')).toHaveLength(0);
});

test('a living direct-child egg retains priority and does not offer family fallback',async({page})=>{
 const {w,resident}=seed();const egg=createBird(w,{home:'resident',stage:'egg',name:'こどもの卵',parents:['b1',resident.id],generation:1});validateWorld(w);await start(page,w,{size:SIZES[1]});const before=await record(page);
 for(const id of ['health','memorial','family']){await panel(page,id);if(id!=='family')await expect(page.locator('.life-protagonist')).toContainText('子の卵がかえるのを待っています');await expect(page.locator('[data-successor-open]')).toHaveCount(0);await noOverflow(page);}
 expect((await record(page)).protagonist).toEqual(before.protagonist);expect((await record(page)).birds.find(b=>b.id===egg.id).stage).toBe('egg');await page.reload();expect((await record(page)).protagonist.lineage).toEqual(['b1']);
});

test('a full home explains a returning family member and a family egg cannot yet be selected',async({page})=>{
 const {w,returning}=seed();const egg=createBird(w,{home:'resident',stage:'egg',name:'家族の卵'});
 for(let i=0;i<4;i++)createBird(w,{home:'resident',name:`同居の家族${i+1}`,sex:i%2?'female':'male'});
 validateWorld(w);await start(page,w,{size:SIZES[1]});await panel(page,'memorial');const before=await record(page);expect(before.birds.filter(b=>b.home==='resident')).toHaveLength(6);
 const absent=page.locator(`[data-successor-open="${returning.id}"]`),unhatched=page.locator(`[data-successor-open="${egg.id}"]`);await expect(absent).toBeDisabled();await expect(absent.locator('..')).toContainText('帰宅には家族の空きが必要です');await expect(absent.locator('..')).toContainText('誰かを追い出すことはありません');await expect(unhatched).toBeDisabled();await expect(unhatched.locator('..')).toContainText('卵がかえってから選べます');await expect(unhatched.locator('..')).toContainText('自動では交代しません');
 await absent.evaluate(button=>button.click());await unhatched.evaluate(button=>button.click());await expect(page.locator('.game-successor-dialog')).not.toBeVisible();expect(await record(page)).toEqual(before);
 await page.locator('.life-protagonist [data-game-panel=family]').click();await expect(page.locator('.game-family-tree')).toBeVisible();await expect(page.locator('.game-independence')).toBeVisible();await noOverflow(page);expect(await record(page)).toEqual(before);
});
