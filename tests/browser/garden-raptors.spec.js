import {test,expect} from '@playwright/test';
import {createWorld,createBird} from '../../src/engine.js';
import {arriveGardenRaptor,petGardenRaptor,raptorToken} from '../../src/garden-raptors.js';
import {arriveGardenCrow} from '../../src/garden-crows.js';
const NOW=Date.UTC(2026,10,4,9);
function seed({species='black-kite',friendly=false,active=true,child=false,attending=true,paused=false}={}){
 const w=createWorld(NOW);w.encounters.garden.open=true;w.encounters.gardenFriends.companions=attending?['b1']:[];w.encounters.gardenFriends.accompany=attending;w.encounters.gardenFriends.attendees=attending?['b1']:[];w.field.place='park';w.settings.motion=false;w.settings.careSound=false;if(species==='osprey')w.encounters.garden.id='mizukagami';
 if(child){const father=createBird(w,{sex:'male',home:'resident'});w.tick=10;createBird(w,{sex:'female',color:'sakura',home:'resident',parents:['b1',father.id],generation:1});}
 if(active){arriveGardenRaptor(w,species,NOW,{...raptorToken(w),gardenId:w.encounters.garden.id});if(friendly)for(let i=0;i<13;i++)petGardenRaptor(w,species,8,raptorToken(w));}
 w.paused=paused;return w;
}
async function save(page,world){await page.evaluate(world=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('world','readwrite');tx.objectStore('world').put(world,'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};}),world);}
async function saved(page){return page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('world','readonly'),v=tx.objectStore('world').get('current');v.onsuccess=()=>resolve(v.result);tx.oncomplete=()=>db.close();};}));}
async function finishIntro(page){await expect.poll(()=>page.locator('body').getAttribute('data-game-intro')).toMatch(/shown|done/);if(await page.locator('body').getAttribute('data-game-intro')==='shown')await page.clock.runFor(2000);await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');}
async function setup(page,options={}){
 await page.addInitScript(()=>{localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));});
 await page.goto('');await page.clock.install({time:NOW});await page.clock.pauseAt(NOW+1000);await save(page,options.world??seed(options));await page.goto('game/');await finishIntro(page);await page.locator('.game-scene-controls-toggle').click();await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
}
for(const [species,size] of [['black-kite',[390,844]],['northern-goshawk',[844,390]],['peregrine-falcon',[320,568]],['ural-owl',[390,844]],['common-kestrel',[320,240]],['japanese-sparrowhawk',[390,844]],['golden-eagle',[320,240]],['brown-hawk-owl',[844,390]],['osprey',[390,844]]])test(`full game warning, measured species art and safe home ${species}`,async({page},info)=>{
 await page.setViewportSize({width:size[0],height:size[1]});await setup(page,{species});
 const art=page.locator('.finch-raptor-actor img');await expect(art).toBeVisible();await art.evaluate(i=>i.decode());
 const banner=page.locator('.game-panel-overlay>[data-raptor-notice]');await expect(banner).toBeVisible();await expect(banner).toHaveAttribute('data-raptor-phase',species==='osprey'?'visiting':'warning');
 if(species==='osprey'){await expect(banner).not.toContainText('事故死');await expect(page.locator('.finch-raptor-fish')).toBeVisible();}else{await expect(banner).toContainText('60');await expect(banner).toContainText('事故死');}
 const home=banner.locator('[data-game-raptor-home]'),hb=await home.boundingBox();expect(hb.height).toBeGreaterThanOrEqual(43.99);expect(hb.x).toBeGreaterThanOrEqual(0);expect(hb.x+hb.width).toBeLessThanOrEqual(size[0]);
 const g=await page.locator('.finch-raptor-scale-scene').evaluate(e=>{const j=e.querySelector('.finch-raptor-java').getBoundingClientRect(),a=e.querySelector('.finch-raptor-actor').getBoundingClientRect(),r=e.getBoundingClientRect(),style=e.style;return {jwidth:j.width,jfoot:j.bottom-j.height*.025,atop:a.top,aheight:a.height,awidth:a.width,aright:a.right,abottom:a.bottom,left:r.left,right:r.right,foot:Number(style.getPropertyValue('--raptor-foot-y')),ratio:Number(e.dataset.lengthRatio),axis:Number(e.dataset.lengthAxis)};});
 expect(Math.abs(g.jfoot-(g.atop+g.aheight*g.foot))).toBeLessThan(2);expect(g.left).toBeGreaterThanOrEqual(0);expect(g.right).toBeLessThanOrEqual(size[0]+1);expect(g.awidth*g.axis/g.jwidth).toBeCloseTo(g.ratio*1.0606608,1);
 const dock=await page.locator('.finch-garden-dock').boundingBox();expect(g.abottom).toBeLessThan(dock.y+1);if(size[1]<=340){const b=await banner.boundingBox();expect(g.atop).toBeGreaterThan(b.y+b.height-1);}
 if(size[1]>340){const labels=await page.locator('.finch-raptor-scale-scene').evaluate(e=>{const j=e.querySelector('.finch-raptor-java>span:last-child').getBoundingClientRect(),a=e.querySelector('figcaption').getBoundingClientRect();return {gap:a.left-j.right,left:j.left,right:a.right};});expect(labels.gap).toBeGreaterThanOrEqual(8);expect(labels.left).toBeGreaterThanOrEqual(0);expect(labels.right).toBeLessThanOrEqual(size[0]);const toggle=await page.locator('.game-scene-controls-toggle').boundingBox();const javaLabel=await page.locator('.finch-raptor-java>span:last-child').boundingBox();expect(javaLabel.x+javaLabel.width<=toggle.x||javaLabel.x>=toggle.x+toggle.width||javaLabel.y+javaLabel.height<=toggle.y||javaLabel.y>=toggle.y+toggle.height).toBe(true);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
 await info.attach(`raptor-${species}`,{body:await page.screenshot({path:info.outputPath(`raptor-${species}.png`)}),contentType:'image/png'});
 await home.click();await expect(page.locator('[data-raptor-notice]')).toHaveCount(0);await expect(page.locator('.game-room')).toBeVisible();await page.clock.runFor(65000);const w=await saved(page);expect(w.lifecycle.birds.find(b=>b.birdId==='b1').death).toBeNull();expect(w.encounters.raptor.active).toBeNull();
});
test('the full minute expires once with an accident grave and saved child succession',async({page})=>{
 await setup(page,{child:true});await page.clock.runFor(1000);
 // Let IndexedDB finish each observed second before moving the simulated clock.
 // Fast-forwarding while a WebKit transaction is pending correctly pauses a long gap.
 for(let i=0;i<60;i++){const before=(await saved(page)).encounters.raptor.active.remainingMs;if(before<=1000)break;await page.clock.runFor(1000);await expect.poll(async()=>(await saved(page)).encounters.raptor.active?.remainingMs).toBe(before-1000);expect((await saved(page)).lifecycle.birds.find(b=>b.birdId==='b1').death).toBeNull();}
 expect((await saved(page)).lifecycle.birds.find(b=>b.birdId==='b1').death).toBeNull();await page.clock.runFor(1000);await expect.poll(async()=>(await saved(page)).lifecycle.birds.find(b=>b.birdId==='b1').death?.cause).toBe('accident');await expect(page.locator('.game-panel-overlay')).toContainText('事故死');const w=await saved(page);expect(w.lifecycle.birds.find(b=>b.birdId==='b1').death.cause).toBe('accident');expect(w.protagonist.birdId).toBe('b3');expect(w.encounters.raptor.active).toBeNull();expect(w.events.filter(e=>e.kind==='death')).toHaveLength(1);await page.reload();expect((await saved(page)).protagonist.birdId).toBe('b3');
});
test('reload keeps remaining time, and notebook navigation keeps the warning visible',async({page})=>{
 await setup(page);await page.clock.runFor(11000);const before=(await saved(page)).encounters.raptor.active.remainingMs;expect(before).toBeLessThan(60000);await page.reload();await finishIntro(page);await page.locator('.game-scene-controls-toggle').click();await expect(page.locator('.game-panel-overlay>[data-raptor-notice]')).toBeVisible();expect((await saved(page)).encounters.raptor.active.remainingMs).toBe(before);await page.locator('[data-encounter-back]').click();await expect(page.locator('.finch-notebook')).toBeVisible();await expect(page.locator('.game-panel-overlay>[data-raptor-notice]')).toBeVisible();await page.clock.runFor(5000);expect((await saved(page)).encounters.raptor.active.remainingMs).toBeLessThan(before);
});
test('reset modal retains an operable home exit during warning',async({page})=>{
 await setup(page);await page.evaluate(()=>document.dispatchEvent(new CustomEvent('buncho-world-action',{detail:'settings'})));await page.locator('[data-game-details=management]>summary').click();await page.locator('[data-game-action=reset-state]').click();const modal=page.locator('.game-reset-dialog[open]');await expect(modal.locator('[data-raptor-notice]')).toBeVisible();await modal.locator('[data-game-raptor-home]').click();await expect(modal).toHaveCount(0);await expect(page.locator('[data-raptor-notice]')).toHaveCount(0);expect((await saved(page)).encounters.raptor.active).toBeNull();
});
test('friendly species has no danger text and never creates an accident',async({page})=>{
 await setup(page,{friendly:true});await expect(page.locator('.game-panel-overlay>[data-raptor-notice]')).toContainText('なかよし');await expect(page.locator('.game-panel-overlay>[data-raptor-notice]')).not.toContainText('事故死');await page.clock.runFor(65000);expect((await saved(page)).lifecycle.birds.find(b=>b.birdId==='b1').death).toBeNull();
});
test('live full shell draws a rare early warning with the full escape minute despite host transaction busy',async({page})=>{
 await page.goto('');await page.clock.install({time:NOW});await page.clock.pauseAt(NOW+1000);const w=seed({active:false});arriveGardenCrow(w,'large-billed-crow',NOW-60000,{worldId:w.worldId,revision:w.revision,gardenId:w.encounters.garden.id});await save(page,w);
 const base=new URL('./',page.url()).href;await page.setContent(`<link rel="stylesheet" href="${base}src/style.css"><link rel="stylesheet" href="${base}src/game.css"><link rel="stylesheet" href="${base}src/encounter-ui.css"><link rel="stylesheet" href="${base}src/life-care.css"><main id="game-root"></main>`);await page.evaluate(async base=>{document.body.dataset.world='buncho';const {mountGame}=await import(base+'src/game.js');window.disposeRaptorGame=await mountGame(document.querySelector('#game-root'),{raptorRandom:()=>0,predatorRandom:()=>0});},base);
 await page.locator('.game-field-nav [data-game-panel=outdoors]').click();await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');await page.clock.runFor(2000);expect((await saved(page)).encounters.raptor.visits).toHaveLength(0);// A host save can defer the shared three-second entry draw.
 // Advance one foreground second at a time so IndexedDB can finish, without
 // spending any of the saved escape minute after the arrival has committed.
 for(let i=0;i<5&&(await saved(page)).encounters.raptor.visits.length===0;i++){
  await page.clock.runFor(1000);await saved(page);
 }
 await expect(page.locator('[data-raptor-phase=warning]')).toBeVisible();expect((await saved(page)).encounters.raptor.visits).toHaveLength(1);expect((await saved(page)).encounters.raptor.active.remainingMs).toBe(60000);
});

test('petting in the enemy notebook makes the current warning harmless and saves friendship',async({page})=>{
 await setup(page);await page.locator('[data-encounter-back]').click();await page.locator('[data-crow-notebook]').click();await expect(page.locator('.finch-raptor-card .is-silhouette')).toHaveCount(8);await page.locator('[data-raptor-entry=black-kite]').click();
 const target=page.locator('[data-encounter-rub=black-kite]');await target.focus();for(let i=0;i<100;i++){await target.press('Enter');await expect(page.locator('[data-raptor-points]')).toHaveText(String(i+1));}
 await page.clock.runFor(1000);await expect(page.locator('.game-panel-overlay>[data-raptor-notice]')).toContainText('なかよし');await expect(page.locator('.game-panel-overlay>[data-raptor-notice]')).not.toContainText('事故死');expect((await saved(page)).encounters.raptor.visits[0].petPoints).toBe(100);await page.clock.runFor(60000);expect((await saved(page)).lifecycle.birds.find(b=>b.birdId==='b1').death).toBeNull();
});

async function sharedEntryGame(page,{miss=false}={}){
 await page.goto('');await page.clock.install({time:NOW});await page.clock.pauseAt(NOW+1000);await save(page,seed({active:false}));
 const base=new URL('./',page.url()).href;
 await page.setContent(`<link rel="stylesheet" href="${base}src/style.css"><link rel="stylesheet" href="${base}src/game.css"><link rel="stylesheet" href="${base}src/encounter-ui.css"><link rel="stylesheet" href="${base}src/life-care.css"><main id="game-root"></main>`);
 await page.evaluate(async({base,miss})=>{document.body.dataset.world='buncho';window.entryDrawCalls=0;const {mountGame}=await import(base+'src/game.js');window.disposeEntryGame=await mountGame(document.querySelector('#game-root'),{raptorRandom:()=>1,predatorRandom:()=>{window.entryDrawCalls++;return miss?.25:0;}});},{base,miss});
 await page.locator('.game-field-nav [data-game-panel=outdoors]').click();await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
}
test('shared3s lottery can choose a crow in the full game and retain a safe exit',async({page})=>{
 await sharedEntryGame(page);await page.clock.runFor(2000);await expect(page.locator('[data-crow-phase=warning]')).toHaveCount(0);
 for(let i=0;i<5&&await page.locator('[data-crow-phase=warning]').count()===0;i++){await page.clock.runFor(1000);await saved(page);}
 await expect(page.locator('[data-crow-phase=warning]')).toBeVisible();expect(await page.evaluate(()=>entryDrawCalls)).toBe(3);
 const before=(await saved(page)).birds[0].needs.energy;await page.locator('[data-crow-phase=warning] [data-finch-go-home]').click();await page.clock.runFor(10000);
 const w=await saved(page);expect(w.encounters.crow.visits).toHaveLength(0);expect(w.encounters.raptor.visits).toHaveLength(0);expect(w.birds[0].needs.energy).toBe(before);
});
test('full game home and garden remounts do not repeat a missed shared lottery',async({page})=>{
 await sharedEntryGame(page,{miss:true});
 for(let i=0;i<7&&await page.evaluate(()=>entryDrawCalls)===0;i++){await page.clock.runFor(1000);await saved(page);}
 expect(await page.evaluate(()=>entryDrawCalls)).toBe(1);
 for(let i=0;i<2;i++){
  await page.locator('.game-overlay-head [data-game-close-panel]').click();await expect(page.locator('.game-room')).toBeVisible();
  await page.locator('.game-field-nav [data-game-panel=outdoors]').click();await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
  for(let j=0;j<5;j++){await page.clock.runFor(1000);await saved(page);}
 }
 expect(await page.evaluate(()=>entryDrawCalls)).toBe(1);const w=await saved(page);expect(w.encounters.crow.visits).toHaveLength(0);expect(w.encounters.raptor.visits).toHaveLength(0);
});

for(const [species,size] of [['black-kite',[390,844]],['golden-eagle',[320,240]]])test(`saved targetless raptor keeps real friends, measured art and a safe home exit ${species}`,async({page},info)=>{
 const world=seed({species,attending:false,paused:true}),energy=world.birds.map(b=>b.needs.energy);
 expect(world.encounters.raptor.active).toMatchObject({speciesId:species,targetBirdId:null,hostile:false});
 await page.setViewportSize({width:size[0],height:size[1]});await setup(page,{world});
 const stage=page.locator('.finch-garden-stage'),scene=page.locator('.finch-raptor-scale-scene'),art=page.locator('.finch-raptor-actor img'),banner=page.locator('.game-panel-overlay>[data-raptor-notice]');
 await expect(art).toBeVisible();await art.evaluate(img=>img.decode());
 await expect(scene).toHaveAttribute('data-raptor-species',species);await expect(scene).toHaveAttribute('aria-label',/文鳥約14cmを基準/);
 await expect(page.locator('.finch-raptor-java')).toHaveCount(0);await expect(stage.locator('[data-garden-household]')).toHaveCount(0);await expect(stage.locator('[data-garden-friend]')).toHaveCount(4);
 await expect(banner).toHaveAttribute('data-raptor-phase','visiting');await expect(banner).toContainText('庭を訪れています');await expect(banner).not.toContainText(/なかよし|事故死/);await expect(banner.locator('[data-raptor-seconds]')).toHaveCount(0);
 const g=await scene.evaluate(e=>{
  const a=e.querySelector('.finch-raptor-actor').getBoundingClientRect(),r=e.getBoundingClientRect(),friend=document.querySelector('.finch-garden-stage [data-garden-friend] .garden-bird-sprite').getBoundingClientRect(),dock=document.querySelector('.finch-garden-dock').getBoundingClientRect(),notice=document.querySelector('.game-panel-overlay>[data-raptor-notice]').getBoundingClientRect();
  return {left:r.left,right:r.right,artLeft:a.left,artRight:a.right,top:a.top,bottom:a.bottom,width:a.width,javaWidth:friend.width,axis:Number(e.dataset.lengthAxis),ratio:Number(e.dataset.lengthRatio),dockTop:dock.top,noticeBottom:notice.bottom};
 });
 expect(g.left).toBeGreaterThanOrEqual(0);expect(g.right).toBeLessThanOrEqual(size[0]+1);expect(g.artLeft).toBeGreaterThanOrEqual(0);expect(g.artRight).toBeLessThanOrEqual(size[0]+1);expect(g.top).toBeGreaterThanOrEqual(0);expect(g.bottom).toBeLessThanOrEqual(size[1]);expect(g.bottom).toBeLessThan(g.dockTop+1);
 expect(g.width*g.axis/g.javaWidth).toBeCloseTo(g.ratio*1.0606608,1);
 if(size[1]<=340)expect(g.top).toBeGreaterThan(g.noticeBottom-1);
 for(const friend of await stage.locator('[data-garden-friend]').all()){
  const hit=await friend.boundingBox(),sprite=await friend.locator('.garden-bird-sprite').boundingBox();expect(hit.width).toBeGreaterThanOrEqual(43.99);expect(hit.height).toBeGreaterThanOrEqual(43.99);expect(Math.abs(sprite.width-g.javaWidth)).toBeLessThan(1);
 }
 const home=banner.locator('[data-game-raptor-home]'),hb=await home.boundingBox();await expect(home).toBeVisible();expect(hb.height).toBeGreaterThanOrEqual(43.99);expect(hb.x).toBeGreaterThanOrEqual(0);expect(hb.x+hb.width).toBeLessThanOrEqual(size[0]);expect(hb.y).toBeGreaterThanOrEqual(0);expect(hb.y+hb.height).toBeLessThanOrEqual(size[1]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
 const during=await saved(page);expect(during.encounters.raptor.active.targetBirdId).toBeNull();expect(during.encounters.gardenFriends.attendees).toEqual([]);expect(during.birds.map(b=>b.needs.energy)).toEqual(energy);expect(during.lifecycle.birds.find(b=>b.birdId==='b1').death).toBeNull();
 await info.attach(`targetless-raptor-${species}`,{body:await page.screenshot({path:info.outputPath(`targetless-raptor-${species}.png`)}),contentType:'image/png'});
 await home.click();await expect(page.locator('.game-room')).toBeVisible();await expect(page.locator('.finch-raptor-scale-scene')).toHaveCount(0);await expect(page.locator('[data-raptor-notice]')).toHaveCount(0);
 const after=await saved(page);expect(after.encounters.raptor.active).toBeNull();expect(after.birds.map(b=>b.needs.energy)).toEqual(energy);expect(after.lifecycle.birds.find(b=>b.birdId==='b1').death).toBeNull();
});

test('legacy v12 targeted warning keeps its exact bird and full escape minute after migration',async({page})=>{
 const world=seed({paused:true});world.encounters.version=12;world.encounters.gardenFriends.attendees=[];world.encounters.gardenFriends.companions=[];world.encounters.gardenFriends.accompany=false;
 await page.setViewportSize({width:390,height:844});await setup(page,{world});
 const banner=page.locator('.game-panel-overlay>[data-raptor-notice]');await expect(banner).toHaveAttribute('data-raptor-phase','warning');await expect(banner).toContainText(`${world.birds[0].name}をおうちへ`);await expect(banner).toContainText('事故死');await expect(banner.locator('[data-raptor-seconds]')).toHaveText('60');await expect(page.locator('.finch-raptor-java>span:last-child')).toContainText(world.birds[0].name);
 const migrated=await saved(page);expect(migrated.encounters.version).toBe(13);expect(migrated.encounters.raptor.active).toMatchObject({targetBirdId:'b1',hostile:true,remainingMs:60000});
 await banner.locator('[data-game-raptor-home]').click();await expect(page.locator('.game-room')).toBeVisible();await expect(page.locator('[data-raptor-notice]')).toHaveCount(0);expect((await saved(page)).lifecycle.birds.find(b=>b.birdId==='b1').death).toBeNull();
});
