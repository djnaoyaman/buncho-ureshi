import {test,expect} from '@playwright/test';
import {createWorld,createBird,validateWorld,economyToken,renameBird} from '../../src/engine.js';
import {encounterSystem} from '../../src/encounters.js';
import {lifeStatus} from '../../src/life-care.js';
const now=Date.parse('2026-11-04T12:00:00+09:00');
function seed(family=6,foreign=6){const w=createWorld(now);w.paused=true;w.settings.motion=false;for(let i=1;i<family;i++)createBird(w,{home:'resident'});for(const e of encounterSystem.catalog.slice(0,foreign)){w.encounters.discoveries.push({id:e.id,firstTick:0,lastTick:0,visits:10,instanceId:w.encounters.nextId++});encounterSystem.inviteCage(w,e.id,economyToken(w));}for(let i=foreign;i<6;i++)createBird(w,{home:'visitor'});return validateWorld(w);}
async function record(page,world){return page.evaluate(world=>new Promise((resolve,reject)=>{const open=indexedDB.open('buncho-ureshi-garden-v1',1);open.onupgradeneeded=()=>open.result.createObjectStore('world');open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,tx=db.transaction('world',world?'readwrite':'readonly'),r=world?tx.objectStore('world').put(world,'current'):tx.objectStore('world').get('current');tx.oncomplete=()=>{db.close();resolve(r.result)};tx.onerror=()=>reject(tx.error)}}),world);}
async function start(page,size,w){await page.setViewportSize(size);await page.addInitScript(n=>{Date.now=()=>n;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},now);await page.goto('');await record(page,w);await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');}
async function geometry(page,size){await page.locator('.game-room-bird img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));const birds=await page.locator('.game-room-bird:not(.game-nestling)').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect(),labels=[...e.querySelectorAll(':scope>span')].map(n=>n.getBoundingClientRect()),left=Math.min(r.left,...labels.map(n=>n.left)),right=Math.max(r.right,...labels.map(n=>n.right));return {x:left,y:r.y,w:right-left,touchWidth:r.width,h:r.height,bottom:Math.max(r.bottom,...labels.map(n=>n.bottom)),role:e.querySelector('.game-home-role').dataset.homeRole};}));for(const b of birds){expect(b.touchWidth).toBeGreaterThanOrEqual(44);expect(b.h).toBeGreaterThanOrEqual(44);expect(b.x).toBeGreaterThanOrEqual(-1);expect(b.x+b.w).toBeLessThanOrEqual(size.width+1);expect(b.y).toBeGreaterThanOrEqual(-1);expect(b.bottom).toBeLessThanOrEqual(size.height+1);expect(['self','family','friend']).toContain(b.role);}for(const selector of ['.life-game-notice','.game-owner-companion','.game-scene-controls-toggle','.game-main>.game-scene-caption','.game-world-title','.game-world-exit']){const node=page.locator(selector);if(!await node.count()||!await node.isVisible())continue;const box=await node.boundingBox();if(box)for(const b of birds){const area=Math.max(0,Math.min(box.x+box.width,b.x+b.w)-Math.max(box.x,b.x))*Math.max(0,Math.min(box.y+box.height,b.bottom)-Math.max(box.y,b.y));expect(area,`${selector} keeps bird and labels visible`).toBeLessThanOrEqual(1);}}for(let i=0;i<birds.length;i++)for(let j=i+1;j<birds.length;j++){const a=birds[i],b=birds[j],area=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y));expect(area,`actors ${i}/${j}`).toBeLessThanOrEqual(1);}}
for(const size of [{width:320,height:568},{width:390,height:844},{width:320,height:240},{width:844,height:390},{width:1440,height:900}])test(`six family and six guests, roles, closing and reload ${size.width}x${size.height}`,async({page},info)=>{const original=seed(),errors=[];page.on('pageerror',e=>errors.push(e.message));await start(page,size,original);await expect(page.locator('[data-cage-guest]')).toHaveCount(6);await expect(page.locator('[data-home-role=self]')).toHaveText('自分＝おもち');await expect(page.locator('[data-home-role=family]')).toHaveCount(size.height<=500?0:5);await expect(page.locator('[data-home-role=friend]')).toHaveCount(6);await geometry(page,size);await info.attach('before',{body:await page.screenshot(),contentType:'image/png'});await page.locator('.game-scene-controls-toggle').click();const close=page.locator('#game-home-close');await expect(close).toHaveText('今日はお開き');await close.click();await expect(page.locator('[data-cage-guest]')).toHaveCount(0);await expect(close).toBeDisabled();const saved=await record(page);expect(saved.birds).toEqual(original.birds);expect(saved.encounters.discoveries).toEqual(original.encounters.discoveries);expect(saved.encounters.friendship).toEqual(original.encounters.friendship);expect(saved.encounters.cageVisitors).toEqual([]);expect(saved.decor).toEqual(original.decor);expect(saved.economy).toEqual(original.economy);expect(saved.encounters.homeClosedUntil).toBe(Date.parse('2026-11-05T00:00:00+09:00'));await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await expect(page.locator('[data-cage-guest]')).toHaveCount(0);expect((await record(page)).birds).toEqual(original.birds);await info.attach('after',{body:await page.screenshot(),contentType:'image/png'});expect(errors).toEqual([]);});
for(const family of [6,10])for(const size of [{width:390,height:844},{width:1440,height:900}])test(`mixed visitors with legacy ${family} family retain identities and clear all friends ${size.width}x${size.height}`,async({page},info)=>{const original=seed(family,3);await start(page,size,original);await expect(page.locator('.game-room-bird')).toHaveCount(family+6);await geometry(page,size);await info.attach('mixed-before',{body:await page.screenshot(),contentType:'image/png'});await page.locator('.game-scene-controls-toggle').click();await page.locator('#game-home-close').click();await expect(page.locator('.game-room-bird')).toHaveCount(family);const saved=await record(page);expect(saved.birds.filter(b=>b.home==='resident')).toEqual(original.birds.filter(b=>b.home==='resident'));expect(saved.birds.filter(b=>b.home==='visitor')).toHaveLength(0);expect(saved.birds).toHaveLength(original.birds.length);expect(saved.encounters.cageVisitors).toHaveLength(0);await info.attach('mixed-closed',{body:await page.screenshot(),contentType:'image/png'});});

for(const size of [{width:320,height:240},{width:390,height:844}])test(`self role survives a rename, duplicate name, selection and reload ${size.width}x${size.height}`,async({page},info)=>{
 const original=seed(6,3);renameBird(original,'b1','しらたまもちのすけ');renameBird(original,'b2','おもち');validateWorld(original);await start(page,size,original);
 const self=page.locator('.game-room-bird[data-bird-id="b1"]'),family=page.locator('.game-room-bird[data-bird-id="b2"]');
 await expect(self.locator('[data-home-role=self]')).toHaveText('自分＝しらたまもちのすけ');await expect(self).toHaveAttribute('aria-label',/^しらたまもちのすけ、自分、/);await geometry(page,size);
 if(size.height<=500){await expect(family).toHaveCount(0);await page.locator('.game-scene-controls-toggle').click();await page.locator('.game-bird-carousel [data-bird-step="1"]').click();await page.locator('.game-scene-controls-toggle').click();await expect(self).toHaveCount(0);}else{await family.click();await page.locator('[data-game-close-bird]').click();await expect(self.locator('[data-home-role=self]')).toHaveCount(1);}
 await expect(family.locator('[data-home-role=family]')).toHaveText('家族');await expect(family).toHaveAttribute('aria-label',/^おもち、家族、/);await expect(family).toHaveAttribute('aria-pressed','true');expect((await record(page)).birds).toEqual(original.birds);await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await expect(self.locator('[data-home-role=self]')).toHaveText('自分＝しらたまもちのすけ');expect((await record(page)).birds).toEqual(original.birds);await info.attach('renamed-self',{body:await page.screenshot(),contentType:'image/png'});
});

for(const size of [{width:320,height:240},{width:320,height:568}])test(`full home health notice stays clear and both health and memorial remain reachable ${size.width}x${size.height}`,async({page},info)=>{
 const original=seed(6,6),departed=createBird(original,{home:'departed'});
 lifeStatus(original,departed).death={cause:'illness',at:now,tick:original.tick};lifeStatus(original,'b1').condition={kind:'injury',sinceAt:now,deadlineAt:now+86400000};validateWorld(original);await start(page,size,original);
 const notice=page.locator('.life-game-notice button');await expect(notice).toHaveCount(1);await expect(notice).toHaveAttribute('data-life-notice','health');await expect(notice).toHaveAttribute('aria-label','1羽に体調の変化。病院へ');await geometry(page,size);
 const rect=await notice.boundingBox();expect(rect.width).toBeGreaterThanOrEqual(44);expect(rect.height).toBeGreaterThanOrEqual(44);expect(rect.x).toBeGreaterThanOrEqual(0);expect(rect.y).toBeGreaterThanOrEqual(0);expect(rect.x+rect.width).toBeLessThanOrEqual(size.width);expect(rect.y+rect.height).toBeLessThanOrEqual(size.height);
 for(const selector of ['.game-world-title','.game-world-exit','.game-scene-controls-toggle']){const r=await page.locator(selector).boundingBox();const area=Math.max(0,Math.min(rect.x+rect.width,r.x+r.width)-Math.max(rect.x,r.x))*Math.max(0,Math.min(rect.y+rect.height,r.y+r.height)-Math.max(rect.y,r.y));expect(area,selector+' does not cover the health notice').toBeLessThanOrEqual(1);}
 expect(await notice.evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===e||e.contains(hit);})).toBe(true);await info.attach('full-home-health-notice',{body:await page.screenshot(),contentType:'image/png'});
 await notice.click();await expect(page.locator('.life-care-panel')).toBeVisible();await expect(page.locator('.life-bird-card.is-unwell')).toHaveCount(1);await page.locator('[data-game-close-panel]').click();await page.locator('.game-scene-controls-toggle').click();await page.locator('.game-bottom-dock [data-game-open-menu]').click();await page.locator('#game-menu-memorial').click();await expect(page.locator('.life-memorial-panel')).toBeVisible();await expect(page.locator('.life-grave')).toHaveCount(1);expect((await record(page)).birds).toEqual(original.birds);
});

// Keep the fixtures rich enough to catch accidental deletion of a friend's
// identity, bond, memories, or wallet while removing only their home presence.
const goodbyeSizes=[{width:320,height:240},{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1440,height:900}];
const nextJapaneseMidnight=Date.parse('2026-11-05T00:00:00+09:00');
function goodbyeSeed(){
 const w=seed(6,3),[friend,other]=w.birds.filter(b=>b.home==='visitor');w.settings.careSound=false;
 // The protagonist and two different visitors deliberately share a name.
 renameBird(w,friend.id,'おもち');renameBird(w,other.id,'おもち');
 friend.sex='female';other.sex='male';friend.partner=other.id;other.partner=friend.id;friend.pairTick=other.pairTick=0;
 for(const [a,b] of [[friend,other],[other,friend]]){
  a.relations[b.id]={affection:72,trust:68,compatibility:83,meetings:4,lastTick:0};
  a.memories=[{kind:'play',otherId:b.id,tick:0}];a.milestones=[{kind:'pair',otherId:b.id,tick:0}];
 }
 friend.action={kind:'visit',target:null,startedTick:0};
 w.economy.gold=w.economy.lifetimeGold=73;w.decor.points=w.decor.lifetimePoints=46;
 w.encounters.friendship=w.encounters.discoveries.map((d,i)=>({id:d.id,petPoints:i+2}));
 const regular=w.encounters.gardenFriends.regulars[0];regular.affinity=7;regular.lastInteractionTick=0;
 regular.memories=[{kind:'chat',tick:0,gardenId:'komorebi',text:'木の椅子でゆっくり話した'}];
 return validateWorld(w);
}
async function sceneControls(page,open){
 const state=open?'open':'closed';if(await page.locator('body').getAttribute('data-scene-controls')!==state)await page.locator('.game-scene-controls-toggle').click();
 await expect(page.locator('body')).toHaveAttribute('data-scene-controls',state);
}
async function openHomeBird(page,birdId){
 const actor=page.locator(`.game-room-bird[data-bird-id="${birdId}"]`);
 // Short screens render only the selected native bird. Reach visitors with the
 // visible carousel rather than clicking a hidden node or invoking an action.
 if(!await actor.count()){
  await sceneControls(page,true);const face=page.locator('.game-bird-carousel-face');
  const count=(await record(page)).birds.filter(b=>b.home!=='departed').length;
  for(let i=0;i<count&&await face.getAttribute('data-bird-id')!==birdId;i++)await page.locator('.game-bird-carousel [data-bird-step="1"]').click();
  await expect(face).toHaveAttribute('data-bird-id',birdId);
 }
 await sceneControls(page,false);await expect(actor).toBeVisible();await actor.click();
 await expect(page.locator('.game-bird-sheet')).toBeVisible();return page.locator('.game-bird-sheet');
}
async function reachableGoodbye(button,size){
 await expect(button).toHaveText('お別れする');await expect(button).toBeEnabled();
 await expect(button).toHaveAttribute('aria-label',/とお別れする。自分のおうちへ帰ってもらう$/);
 await button.scrollIntoViewIfNeeded();const box=await button.boundingBox();expect(box).not.toBeNull();
 expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
 expect(box.x).toBeGreaterThanOrEqual(-1);expect(box.y).toBeGreaterThanOrEqual(-1);
 expect(box.x+box.width).toBeLessThanOrEqual(size.width+1);expect(box.y+box.height).toBeLessThanOrEqual(size.height+1);
 expect(await button.evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===e||e.contains(hit);})).toBe(true);
}
async function activateGoodbye(page,button,size){
 if(size.width===1440){await button.focus();await expect(button).toBeFocused();await page.keyboard.press('Enter');}
 else await button.click();
}
function expectHistoryIntact(saved,before){
 expect(saved.birds.map(({home,action,...identity})=>identity)).toEqual(before.birds.map(({home,action,...identity})=>identity));
 for(const key of ['worldId','seed','tick','nextId','events','nextEvent','economy','decor','gems','field','care','careSchedule','lifecycle','protagonist'])expect(saved[key],key).toEqual(before[key]);
 for(const key of ['discoveries','friendship','garden','gardenFriends','queue','active','homeClosedUntil'])expect(saved.encounters[key],`encounters.${key}`).toEqual(before.encounters[key]);
 expect(()=>validateWorld(saved)).not.toThrow();
}
function expectOnlyNativeGone(saved,before,birdId){
 expectHistoryIntact(saved,before);
 expect(saved.birds).toEqual(before.birds.map(b=>b.id===birdId?{...b,home:'departed',action:{kind:'rest',target:null,startedTick:before.tick}}:b));
 expect(saved.encounters.cageVisitors).toEqual(before.encounters.cageVisitors);
 expect(saved.encounters.homeGoodbyes).toEqual([...before.encounters.homeGoodbyes,{birdId,until:nextJapaneseMidnight}]);
 expect(saved.birds.filter(b=>b.home==='visitor')).toHaveLength(before.birds.filter(b=>b.home==='visitor').length-1);
}
async function expectNativeDismissed(page,birdId,protagonistId='b1'){
 await expect(page.locator('.game-bird-sheet')).not.toBeVisible();await expect(page.locator('.game-panel-overlay')).not.toBeVisible();
 await expect(page.locator(`.game-room-bird[data-bird-id="${birdId}"]`)).toHaveCount(0);
 const self=page.locator(`.game-room-bird[data-bird-id="${protagonistId}"]`);await expect(self).toHaveAttribute('aria-pressed','true');
 await expect(self.locator('[data-home-role=self]')).toHaveCount(1);await expect(self).toBeFocused();
}
async function reloadHome(page,saved){
 await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');expect(await record(page)).toEqual(saved);
}
async function closeRemainingVisitors(page){
 const before=await record(page);await sceneControls(page,true);const close=page.locator('#game-home-close');await expect(close).toBeEnabled();await close.click();
 await expect(close).toBeDisabled();await expect(page.locator('[data-cage-guest]')).toHaveCount(0);
 const saved=await record(page);expect(saved.birds.filter(b=>b.home==='visitor')).toHaveLength(0);expect(saved.encounters.cageVisitors).toEqual([]);
 // Closing everyone is still a separate action after an individual goodbye.
 expectHistoryIntact(saved,{...before,encounters:{...before.encounters,homeClosedUntil:nextJapaneseMidnight}});
 expect(saved.birds.filter(b=>b.home==='resident')).toEqual(before.birds.filter(b=>b.home==='resident'));
 expect(saved.encounters.homeGoodbyes).toEqual(before.encounters.homeGoodbyes);await reloadHome(page,saved);
}
for(const size of goodbyeSizes)test(`individual native goodbye preserves duplicate-name friends, reload and reinvite ${size.width}x${size.height}`,async({page},info)=>{
 const original=goodbyeSeed(),friend=original.birds.find(b=>b.home==='visitor'),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await start(page,size,original);const sheet=await openHomeBird(page,friend.id),goodbye=sheet.locator(`[data-home-goodbye="${friend.id}"]`);
 await expect(sheet.locator('[data-home-goodbye]')).toHaveCount(1);await reachableGoodbye(goodbye,size);
 await info.attach('native-goodbye-before',{body:await page.screenshot(),contentType:'image/png'});await activateGoodbye(page,goodbye,size);
 await expectNativeDismissed(page,friend.id);const saved=await record(page);expectOnlyNativeGone(saved,original,friend.id);
 await geometry(page,size);await expect(page.locator('[data-cage-guest]')).toHaveCount(3);
 await info.attach('native-goodbye-after',{body:await page.screenshot(),contentType:'image/png'});
 await reloadHome(page,saved);await expect(page.locator(`.game-room-bird[data-bird-id="${friend.id}"]`)).toHaveCount(0);
 // A deliberate invitation remains available on the same day, despite the
 // saved automatic-return hold. All game actions below are real button clicks.
 await sceneControls(page,true);await page.locator('.game-field-nav [data-game-panel="friends"]').click();
 const invite=page.locator(`[data-field-invite="${friend.id}"]`);await expect(invite).toBeEnabled();await invite.click();await expect(invite).toBeDisabled();
 const reinvited=await record(page);expect(reinvited.birds.find(b=>b.id===friend.id).home).toBe('visitor');expect(reinvited.birds.map(b=>b.id)).toEqual(original.birds.map(b=>b.id));
 expect(reinvited.birds.find(b=>b.id===friend.id).relations).toEqual(friend.relations);expect(reinvited.encounters.cageVisitors).toEqual(original.encounters.cageVisitors);
 await page.locator('[data-game-close-panel]').click();await openHomeBird(page,friend.id);await expect(page.locator(`[data-home-goodbye="${friend.id}"]`)).toBeVisible();
 await page.locator('[data-game-close-bird]').click();await closeRemainingVisitors(page);expect(errors).toEqual([]);
});
for(const size of goodbyeSizes)test(`individual other-species goodbye preserves everyone else, reload and reinvite ${size.width}x${size.height}`,async({page},info)=>{
 const original=goodbyeSeed(),id=original.encounters.cageVisitors[0].id,errors=[];page.on('pageerror',e=>errors.push(e.message));
 await start(page,size,original);const guest=page.locator(`[data-cage-guest="${id}"]`);await expect(guest).toBeVisible();await guest.click();
 const goodbye=page.locator(`[data-encounter-dismiss-cage="${id}"]`);await reachableGoodbye(goodbye,size);
 await info.attach('other-species-goodbye-before',{body:await page.screenshot(),contentType:'image/png'});await activateGoodbye(page,goodbye,size);
 await expect(goodbye).toHaveCount(0);await expect(page.locator(`[data-encounter-invite-cage="${id}"]`)).toBeEnabled();
 const saved=await record(page);expectHistoryIntact(saved,original);expect(saved.birds).toEqual(original.birds);
 expect(saved.encounters.cageVisitors).toEqual(original.encounters.cageVisitors.filter(v=>v.id!==id));expect(saved.encounters.homeGoodbyes).toEqual(original.encounters.homeGoodbyes);
 await page.locator('[data-game-close-panel]').click();await sceneControls(page,false);await expect(guest).toHaveCount(0);await expect(page.locator('[data-cage-guest]')).toHaveCount(2);
 await geometry(page,size);await info.attach('other-species-goodbye-after',{body:await page.screenshot(),contentType:'image/png'});
 await reloadHome(page,saved);await expect(guest).toHaveCount(0);await expect(page.locator('[data-cage-guest]')).toHaveCount(2);
 await sceneControls(page,true);await page.locator('.game-bottom-dock [data-game-open-menu]').click();await page.locator('#game-menu-notebook').click();
 await page.locator(`[data-encounter-page="${id}"]`).click();const invite=page.locator(`[data-encounter-invite-cage="${id}"]`);await expect(invite).toBeEnabled();await invite.click();
 await expect(page.locator(`[data-encounter-dismiss-cage="${id}"]`)).toHaveText('お別れする');const reinvited=await record(page);
 expect(reinvited.encounters.cageVisitors.filter(v=>v.id===id)).toHaveLength(1);expect(reinvited.encounters.cageVisitors).toHaveLength(original.encounters.cageVisitors.length);
 expectHistoryIntact(reinvited,original);expect(reinvited.birds).toEqual(original.birds);await page.locator('[data-finch-go-home]').click();
 await expect(guest).toBeVisible();await closeRemainingVisitors(page);expect(errors).toEqual([]);
});
test('compact home stays clear as other-species guests leave one by one from three to zero 320x240',async({page})=>{
 const size={width:320,height:240},original=goodbyeSeed(),ids=original.encounters.cageVisitors.map(v=>v.id),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await start(page,size,original);await expect(page.locator('[data-cage-guest]')).toHaveCount(3);await geometry(page,size);
 for(const [index,id] of ids.entries()){
  const before=await record(page),guest=page.locator(`[data-cage-guest="${id}"]`);await expect(guest).toBeVisible();await guest.click();
  const goodbye=page.locator(`[data-encounter-dismiss-cage="${id}"]`);await reachableGoodbye(goodbye,size);await goodbye.click();await expect(goodbye).toHaveCount(0);
  const saved=await record(page);expect(saved.revision).toBe(before.revision+1);
  expect({...saved,revision:before.revision}).toEqual({...before,encounters:{...before.encounters,cageVisitors:before.encounters.cageVisitors.filter(v=>v.id!==id)}});
  await page.locator('[data-game-close-panel]').click();await sceneControls(page,false);await expect(guest).toHaveCount(0);
  await expect(page.locator('[data-cage-guest]')).toHaveCount(ids.length-index-1);await geometry(page,size);
  await reloadHome(page,saved);await expect(page.locator('[data-cage-guest]')).toHaveCount(ids.length-index-1);await geometry(page,size);
 }
 const saved=await record(page);expect(saved.encounters.cageVisitors).toEqual([]);expect(saved.birds).toEqual(original.birds);
 expect(saved.birds.filter(b=>b.home==='visitor')).toHaveLength(3);expect(errors).toEqual([]);
});
for(const size of [{width:320,height:240},{width:390,height:844}])test(`goodbye is absent for self and family but available from the visitor profile ${size.width}x${size.height}`,async({page})=>{
 const original=goodbyeSeed(),friend=original.birds.find(b=>b.home==='visitor'),errors=[];page.on('pageerror',e=>errors.push(e.message));await start(page,size,original);
 for(const id of ['b1','b2']){
  const sheet=await openHomeBird(page,id);await expect(sheet.locator('[data-home-goodbye]')).toHaveCount(0);
  await sheet.locator('[data-game-panel="profile"]').click();await expect(page.locator('.game-profile')).toBeVisible();await expect(page.locator('.game-profile [data-home-goodbye]')).toHaveCount(0);
  await page.locator('[data-game-close-panel]').click();
 }
 const sheet=await openHomeBird(page,friend.id);await sheet.locator('[data-game-panel="profile"]').click();
 const goodbye=page.locator(`.game-profile [data-home-goodbye="${friend.id}"]`);await reachableGoodbye(goodbye,size);await goodbye.click();
 await expectNativeDismissed(page,friend.id);const saved=await record(page);expectOnlyNativeGone(saved,original,friend.id);await reloadHome(page,saved);expect(errors).toEqual([]);
});
test('a visitor-shaped successor is protected by ID and receives focus after another friend leaves',async({page})=>{
 const size={width:320,height:240},w=createWorld(now);w.paused=true;w.settings.motion=false;w.settings.careSound=false;
 const parent=createBird(w,{home:'resident',sex:'male'}),heir=createBird(w,{home:'visitor',parents:['b1',parent.id],generation:1,name:'おもち'}),friend=createBird(w,{home:'visitor',name:'おもち'});
 w.birds[0].home='departed';lifeStatus(w,'b1').death={cause:'illness',at:now,tick:0};w.protagonist={version:1,birdId:heir.id,lineage:['b1',heir.id]};w.encounters.gardenFriends.companions=[];
 const original=validateWorld(w),errors=[];page.on('pageerror',e=>errors.push(e.message));await start(page,size,original);
 let sheet=await openHomeBird(page,heir.id);await expect(sheet.locator('[data-home-goodbye]')).toHaveCount(0);await sheet.locator('[data-game-panel="profile"]').click();
 await expect(page.locator('.game-profile [data-home-goodbye]')).toHaveCount(0);await page.locator('[data-game-close-panel]').click();
 sheet=await openHomeBird(page,friend.id);const goodbye=sheet.locator(`[data-home-goodbye="${friend.id}"]`);await reachableGoodbye(goodbye,size);await goodbye.click();
 await expectNativeDismissed(page,friend.id,heir.id);const saved=await record(page);expectOnlyNativeGone(saved,original,friend.id);
 expect(saved.birds.find(b=>b.id===heir.id)).toEqual(original.birds.find(b=>b.id===heir.id));expect(saved.protagonist).toEqual(original.protagonist);
 await reloadHome(page,saved);await expect(page.locator(`.game-room-bird[data-bird-id="${heir.id}"] [data-home-role=self]`)).toHaveText('自分＝おもち');expect(errors).toEqual([]);
});
