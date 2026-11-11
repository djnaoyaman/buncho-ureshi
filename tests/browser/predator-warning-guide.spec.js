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
async function setupCrow(page,{species='large-billed-crow',friendly=false,seedVisit=false,earlyPredatorVisits=false}={}){
 await page.goto('');
 const base=new URL('./',page.url()).href;
 await page.setContent(`<link rel="stylesheet" href="${base}src/encounter-ui.css"><style>body{margin:0;font-family:system-ui;color:#294d3b}#fixture{width:100vw;height:100dvh;position:relative;overflow:auto}.finch-overlay-content{max-height:100dvh}.finch-garden{height:100dvh}.finch-entry{padding:16px;box-sizing:border-box}</style><main id="fixture"></main>`);
 await page.clock.install({time:NOW});
 await page.evaluate(async({base,species,friendly,seedVisit,earlyPredatorVisits,NOW})=>{
   const {createWorld}=await import(base+'src/engine.js');
   const {openGameStore}=await import(base+'src/game-store.js');
   const {mountEncounterPanel}=await import(base+'src/encounter-controller.js');
   const {mountGardenRaptors}=await import(base+'src/garden-raptor-controller.js');
   const {arriveGardenCrow,petGardenCrow,CROW_SPECIES}=await import(base+'src/garden-crows.js');
   const store=await openGameStore();let world=createWorld(NOW);world.settings.motion=false;world.encounters.garden.open=true;world.encounters.gardenFriends.companions=[world.protagonist.birdId];world.encounters.gardenFriends.accompany=true;world.encounters.gardenFriends.attendees=[world.protagonist.birdId];world.birds[0].needs.energy=80;
   if(seedVisit||friendly){arriveGardenCrow(world,species,NOW-600001,{worldId:world.worldId,revision:world.revision,gardenId:world.encounters.garden.id});if(friendly)for(let i=0;i<13;i++)petGardenCrow(world,species,8,{worldId:world.worldId,revision:world.revision});world.birds[0].needs.energy=80;}
   world=await store.transact(()=>world);
   let pick=false;const random=()=>{pick=!pick;return pick?0:(CROW_SPECIES.findIndex(s=>s.id===species)+.1)/CROW_SPECIES.length;};
   const panel=mountEncounterPanel(document.querySelector('#fixture'),{getWorld:()=>world,initialMode:'garden',base,earlyPredatorVisits,crowRandom:random,transact:async fn=>{world=await store.transact(fn);return world;},onHome:()=>{panel.notebook();document.body.dataset.home='true';}});
   const shared=earlyPredatorVisits?mountGardenRaptors(document.querySelector('#fixture'),{getWorld:()=>world,predatorRandom:()=>0,random:()=>1,canStartCrowWarning:()=>panel.canStartCrowWarning(),startCrowWarning:id=>panel.startCrowWarning(id),hasCrowPending:()=>panel.hasCrowPending(),transact:async fn=>{world=await store.transact(fn);return world;}}):null;
   window.crowFixture={panel,shared,store,world:()=>world,refresh:async()=>{world=await store.transact(w=>w);panel.refresh();}};
 },{base,species,friendly,seedVisit,earlyPredatorVisits,NOW});
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
 // Establish the first foreground sample. Every timer runs, unlike fastForward.
 await page.clock.runFor(1000);
}

for(const [width,height] of [[320,568],[844,390],[320,240]])test(`urgent raptor keeps focus and returns safely ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height});const w=seed();w.encounters.raptor.active.remainingMs=11000;
 await setup(page,{world:w});const banner=page.locator('.game-panel-overlay>[data-raptor-notice]'),home=banner.locator('[data-game-raptor-home]');
 await expect(banner).toHaveAttribute('data-raptor-urgent','false');await home.focus();
 for(let i=0;i<3;i++){await page.clock.runFor(1000);if((await saved(page)).encounters.raptor.active.remainingMs<=10000)break;}
 await expect(banner).toHaveAttribute('data-raptor-urgent','true');await expect(banner).toContainText('すぐおうちへ');await expect(home).toHaveText('今すぐ帰る');await expect(home).toBeFocused();await expect(home).toBeInViewport();
 expect(await home.evaluate(e=>e.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await info.attach('urgent-warning',{body:await page.screenshot(),contentType:'image/png'});
 await home.click();await expect(page.locator('[data-raptor-notice]')).toHaveCount(0);await expect(page.locator('.game-room')).toBeVisible();await page.clock.runFor(15000);
 const after=await saved(page);expect(after.encounters.raptor.active).toBeNull();expect(after.lifecycle.birds.find(b=>b.birdId==='b1').death).toBeNull();expect(after.economy.gold).toBe(w.economy.gold);expect(after.decor.points).toBe(w.decor.points);
});
test('crow shadow explains the six second escape and preserves energy on return',async({page},info)=>{
 await page.setViewportSize({width:320,height:568});await setupCrow(page);await page.clock.runFor(120000);
 const notice=page.locator('[data-crow-phase=warning]');await expect(notice).toBeVisible();await expect(notice).toContainText('6秒');await expect(notice).toContainText('来る前に');const before=await page.evaluate(()=>structuredClone(crowFixture.world()));
 const home=notice.locator('[data-finch-go-home]');await expect(home).toBeInViewport();await info.attach('crow-shadow',{body:await page.screenshot(),contentType:'image/png'});await home.click();await page.clock.runFor(10000);
 const after=await page.evaluate(()=>crowFixture.world());expect(after.birds[0].needs.energy).toBe(before.birds[0].needs.energy);expect(after.encounters.crow.visits).toEqual(before.encounters.crow.visits);
});
