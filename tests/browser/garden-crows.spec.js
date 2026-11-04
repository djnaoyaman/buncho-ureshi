import {test,expect} from '@playwright/test';
const NOW=Date.UTC(2026,10,4,9);
async function setup(page,{species='large-billed-crow',friendly=false,seedVisit=false,earlyPredatorVisits=false}={}){
 await page.goto('');
 const base=new URL('./',page.url()).href;
 await page.setContent(`<link rel="stylesheet" href="${base}src/encounter-ui.css"><style>body{margin:0;font-family:system-ui;color:#294d3b}#fixture{width:100vw;height:100dvh;position:relative;overflow:auto}.finch-overlay-content{max-height:100dvh}.finch-garden{height:100dvh}.finch-entry{padding:16px;box-sizing:border-box}</style><main id="fixture"></main>`);
 await page.clock.install({time:NOW});
 await page.evaluate(async({base,species,friendly,seedVisit,earlyPredatorVisits,NOW})=>{
   const {createWorld}=await import(base+'src/engine.js');
   const {openGameStore}=await import(base+'src/game-store.js');
   const {mountEncounterPanel}=await import(base+'src/encounter-controller.js');
   const {arriveGardenCrow,petGardenCrow,CROW_SPECIES}=await import(base+'src/garden-crows.js');
   const store=await openGameStore();let world=createWorld(NOW);world.settings.motion=false;world.encounters.garden.open=true;world.birds[0].needs.energy=80;
   if(seedVisit||friendly){arriveGardenCrow(world,species,NOW-600001,{worldId:world.worldId,revision:world.revision,gardenId:world.encounters.garden.id});if(friendly)for(let i=0;i<13;i++)petGardenCrow(world,species,8,{worldId:world.worldId,revision:world.revision});world.birds[0].needs.energy=80;}
   world=await store.transact(()=>world);
   let pick=false;const random=()=>{pick=!pick;return pick?0:(CROW_SPECIES.findIndex(s=>s.id===species)+.1)/CROW_SPECIES.length;};
   const panel=mountEncounterPanel(document.querySelector('#fixture'),{getWorld:()=>world,initialMode:'garden',base,earlyPredatorVisits,crowRandom:random,transact:async fn=>{world=await store.transact(fn);return world;},onHome:()=>{panel.notebook();document.body.dataset.home='true';}});
   window.crowFixture={panel,store,world:()=>world,refresh:async()=>{world=await store.transact(w=>w);panel.refresh();}};
 },{base,species,friendly,seedVisit,earlyPredatorVisits,NOW});
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
 // Establish the first foreground sample. Every timer runs, unlike fastForward.
 await page.clock.runFor(1000);
}
async function visit(page){await page.clock.runFor(120000);await expect(page.locator('[data-crow-phase=warning]')).toBeVisible();await page.clock.runFor(6000);await expect(page.locator('[data-crow-phase=visiting]')).toBeVisible();await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');}
for(const [species,size] of [['large-billed-crow',[320,568]],['carrion-crow',[390,844]],['rook',[844,390]],['common-raven',[1440,900]],['hooded-crow',[320,240]]])test(`warning, shared scale and safe retreat ${species}`,async({page},info)=>{
 await page.setViewportSize({width:size[0],height:size[1]});await setup(page,{species});
 await page.clock.runFor(119000);await expect(page.locator('[data-crow-phase]')).toHaveCount(0);expect(await page.evaluate(()=>crowFixture.world().birds[0].needs.energy)).toBe(80);
 await page.clock.runFor(1000);await expect(page.locator('[data-crow-phase=warning]')).toBeVisible();expect(await page.evaluate(()=>crowFixture.world().birds[0].needs.energy)).toBe(80);
 await page.clock.runFor(6000);await expect(page.locator('[data-crow-phase=visiting]')).toBeVisible();await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
 expect(await page.evaluate(()=>crowFixture.world().birds[0].needs.energy)).toBe(40);await expect(page.locator('.finch-garden-stage [data-garden-friend]')).toHaveCount(0);
 const geometry=await page.locator('.finch-crow-scale-scene').evaluate(e=>{const j=e.querySelector('.finch-crow-java').getBoundingClientRect(),c=e.querySelector('.finch-crow-actor').getBoundingClientRect(),s=e.getBoundingClientRect(),art=e.querySelector('.finch-crow-actor');return {ratio:Number(e.dataset.lengthRatio),java:j.width,crow:c.width,foot:parseFloat(art.style.getPropertyValue('--crow-foot-y')),jbottom:j.bottom-j.height*.025,ctop:c.top,cheight:c.height,left:s.left,right:s.right};});
 expect(Math.abs(geometry.jbottom-(geometry.ctop+geometry.cheight*geometry.foot))).toBeLessThan(2);expect(geometry.left).toBeGreaterThanOrEqual(0);expect(geometry.right).toBeLessThanOrEqual(size[0]+1);
 await expect(page.locator('.finch-notice')).toBeEmpty();
 const notice=await page.locator('.finch-crow-notice').boundingBox(),home=await page.locator('.finch-crow-notice [data-finch-go-home]').boundingBox();expect(home.height).toBeGreaterThanOrEqual(44);expect(notice.y+notice.height).toBeLessThanOrEqual(size[1]);
 if(size[1]<=340){expect(notice.y+notice.height).toBeLessThanOrEqual(54);const dock=await page.locator('.finch-garden-dock').boundingBox();expect(geometry.jbottom).toBeLessThan(dock.y);expect(geometry.ctop+geometry.cheight).toBeLessThan(dock.y);}
 await info.attach(`crow-${species}`,{body:await page.screenshot({path:info.outputPath(`crow-${species}.png`)}),contentType:'image/png'});
 await page.clock.runFor(45000);await expect(page.locator('.finch-garden-stage [data-garden-friend]')).toHaveCount(4);expect(await page.evaluate(()=>crowFixture.world().birds[0].needs.energy)).toBe(40);
 await page.clock.runFor(180000);expect(await page.evaluate(()=>crowFixture.world().encounters.crow.visits[0].count)).toBe(1);
});
test('warning can be escaped and a new garden needs its own continuous two minutes',async({page})=>{
 await setup(page);await page.clock.runFor(120000);await page.locator('[data-crow-phase=warning] [data-finch-go-home]').click();await expect(page.locator('body')).toHaveAttribute('data-home','true');await page.clock.runFor(10000);expect(await page.evaluate(()=>crowFixture.world().birds[0].needs.energy)).toBe(80);
 await page.evaluate(()=>crowFixture.panel.garden('mizukagami'));await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');await page.clock.runFor(119000);await expect(page.locator('[data-crow-phase]')).toHaveCount(0);
});
test('friendly crow keeps friends, never halves energy, and petting survives saved reload',async({page})=>{
 await setup(page,{friendly:true});await visit(page);expect(await page.evaluate(()=>crowFixture.world().birds[0].needs.energy)).toBe(80);await expect(page.locator('.finch-garden-stage [data-garden-friend]')).toHaveCount(4);await expect(page.locator('[data-crow-phase=visiting]')).toContainText('なかよし');
 await page.locator('[data-crow-entry=large-billed-crow]').click();const target=page.locator('[data-encounter-rub]');await target.focus();await page.keyboard.press('Enter');await expect(page.locator('[data-crow-points]')).toHaveText('105');await expect(target).toBeFocused();
 const before=await page.evaluate(()=>JSON.stringify(crowFixture.world().birds));await page.evaluate(async()=>{const value=await crowFixture.store.transact(w=>w);window.savedCrowPoints=value.encounters.crow.visits[0].petPoints;});expect(await page.evaluate(()=>savedCrowPoints)).toBe(105);expect(await page.evaluate(()=>JSON.stringify(crowFixture.world().birds))).toBe(before);
});
test('friendly tiny garden keeps all Java sparrows on the same scale with accessible touch targets',async({page},info)=>{
 await page.setViewportSize({width:320,height:240});await setup(page,{friendly:true});await visit(page);
 const java=await page.locator('.finch-crow-java').boundingBox();
 for(const friend of await page.locator('.finch-garden-stage [data-garden-friend]').all()){
  const hit=await friend.boundingBox(),art=await friend.locator('.garden-bird-sprite').boundingBox();expect(hit.width).toBeGreaterThanOrEqual(43.99);expect(hit.height).toBeGreaterThanOrEqual(43.99);expect(Math.abs(art.width-java.width)).toBeLessThan(1);
 }
 await info.attach('friendly-crow-tiny',{body:await page.screenshot({path:info.outputPath('friendly-crow-tiny.png')}),contentType:'image/png'});
});
test('reduced motion shadow is still visible and locked enemy records disclose no species',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await setup(page);await page.clock.runFor(120000);await expect(page.locator('.finch-crow-shadow')).toBeVisible();expect(await page.locator('.finch-crow-shadow svg').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');await page.evaluate(()=>crowFixture.panel.notebook());await page.locator('[data-crow-notebook]').click();await expect(page.locator('.finch-crow-notebook')).not.toContainText('ハシブトガラス');await expect(page.locator('.finch-crow-unknown')).toHaveCount(5);
});

// Validate the same scene inside the shipped game shell and its complete CSS,
// not only the isolated controller fixture above.
for(const [species,size,mode='outdoors',successor=false] of [['large-billed-crow',[390,844]],['hooded-crow',[320,240]],['hooded-crow',[320,240],'notebook'],['large-billed-crow',[390,844],'outdoors',true]])test(`real game shell preserves crow art and return-home controls ${species} ${mode}${successor?' successor':''}`,async({page},info)=>{
 const {createWorld,createBird,advanceTo}=await import('../../src/engine.js');
 const {arriveGardenCrow}=await import('../../src/garden-crows.js');
 const world=createWorld(successor?NOW-86400000:NOW);
 if(successor){const {lifeStatus}=await import('../../src/life-care.js');world.paused=true;const father=createBird(world,{sex:'male',home:'resident'});world.tick=10;createBird(world,{sex:'female',color:'sakura',home:'resident',parents:['b1',father.id],generation:1});lifeStatus(world,'b1').condition={kind:'injury',sinceAt:NOW-86400000,deadlineAt:NOW};advanceTo(world,NOW);world.paused=false;}
 const protagonist=world.birds.find(b=>b.id===world.protagonist.birdId);world.encounters.garden.open=true;protagonist.needs.energy=80;
 arriveGardenCrow(world,species,NOW,{worldId:world.worldId,revision:world.revision,gardenId:world.encounters.garden.id});world.paused=true;world.settings.motion=false;world.settings.careSound=false;
 await page.setViewportSize({width:size[0],height:size[1]});
 await page.addInitScript(now=>{Date.now=()=>now;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);
 await page.goto('');
 await page.evaluate(world=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('world','readwrite');tx.objectStore('world').put(world,'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};}),world);
 await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await page.locator('.game-scene-controls-toggle').click();if(mode==='notebook'){await page.locator('[data-game-open-menu]').click();await page.locator('[data-game-panel=notebook]').click();await page.locator('[data-finch-go-garden]').click();}else await page.locator('.game-field-nav [data-game-panel=outdoors]').click();
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');await expect(page.locator('.finch-crow-actor img')).toBeVisible();await page.locator('.finch-crow-actor img').evaluate(i=>i.decode());
 await expect(page.locator('.finch-garden-stage [data-garden-friend]')).toHaveCount(0);await expect(page.locator('.finch-crow-java>span:last-child')).toContainText(protagonist.name);
 const home=page.locator('.finch-crow-notice [data-finch-go-home]');await expect(home).toBeVisible();expect((await home.boundingBox()).height).toBeGreaterThanOrEqual(44);
 if(size[1]<=340){const notice=await page.locator('.finch-crow-notice').boundingBox(),book=await page.locator('.finch-garden>header [data-encounter-back]').boundingBox();expect(notice.x+notice.width).toBeLessThanOrEqual(book.x);const dock=await page.locator('.finch-garden-dock').boundingBox(),crow=await page.locator('.finch-crow-actor').boundingBox();expect(crow.y+crow.height).toBeLessThan(dock.y);if(mode==='notebook'){await expect(page.locator('.finch-garden-selector-wrap')).not.toBeVisible();const java=await page.locator('.finch-crow-java').boundingBox();expect(crow.y).toBeGreaterThan(notice.y+notice.height);expect(java.y).toBeGreaterThan(notice.y+notice.height);}}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
 await info.attach(`real-game-crow-${species}`,{body:await page.screenshot({path:info.outputPath(`real-game-crow-${species}-${mode}${successor?'-successor':''}.png`)}),contentType:'image/png'});
 await home.click();await expect(page.locator('.finch-crow-scale-scene')).toHaveCount(0);await expect(page.locator('.game-room')).toBeVisible();
});

test('live game shell keeps the foreground clock through normal world polling and commits one visit',async({page})=>{
 const {createWorld}=await import('../../src/engine.js');
 const world=createWorld(NOW);world.settings.motion=false;world.settings.careSound=false;world.birds[0].needs.energy=80;
 await page.goto('');await page.clock.install({time:NOW});
 await page.addInitScript(()=>{Math.random=()=>0;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));});
 await page.evaluate(world=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('world','readwrite');tx.objectStore('world').put(world,'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};}),world);
 const saved=()=>page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('world','readonly'),value=tx.objectStore('world').get('current');value.onsuccess=()=>resolve(value.result);tx.oncomplete=()=>db.close();};}));
 await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await page.clock.pauseAt(await page.evaluate(()=>Date.now())+1000);await page.locator('.game-scene-controls-toggle').click();await page.locator('.game-field-nav [data-game-panel=outdoors]').click();await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
 await page.clock.runFor(20000);expect((await saved()).encounters.crow.visits).toHaveLength(0);
 await page.clock.runFor(1000);await expect(page.locator('[data-crow-phase=warning]')).toBeVisible();const before=await saved();expect(before.encounters.crow.visits).toHaveLength(0);
 await page.clock.runFor(6000);await expect(page.locator('[data-crow-phase=visiting]')).toBeVisible();await expect.poll(async()=>(await saved()).encounters.crow.visits.length).toBe(1);
 const after=await saved();expect(after.encounters.crow.arrivalBirdId).toBe(after.protagonist.birdId);expect(after.birds[0].needs.energy).toBeLessThan(before.birds[0].needs.energy*.6); // Normal story ticks keep running; exact halving is covered in the atomic fixture.
 await page.clock.runFor(180000);const progressed=await saved();expect(progressed.tick).toBeGreaterThan(after.tick);expect(progressed.encounters.crow.visits[0].count).toBe(1);
});

test('all five undiscovered crow shapes are visible as individual silhouettes and unlock one at a time',async({page},info)=>{
 await page.setViewportSize({width:1000,height:800});await setup(page);await page.evaluate(()=>crowFixture.panel.notebook());await page.locator('[data-crow-notebook]').click();
 const shadows=page.locator('.finch-crow-unknown img');await expect(shadows).toHaveCount(5);const sources=[];
 for(const shadow of await shadows.all()){await expect(shadow).toBeVisible();await shadow.evaluate(img=>img.decode());expect(await shadow.evaluate(img=>getComputedStyle(img).filter)).toBe('brightness(0)');sources.push(await shadow.getAttribute('src'));}
 expect(new Set(sources).size).toBe(5);await expect(page.locator('[data-crow-entry]:disabled')).toHaveCount(5);await expect(page.locator('.finch-crow-notebook')).not.toContainText('ハシブトガラス');
 await info.attach('five-crow-silhouettes',{body:await page.screenshot({path:info.outputPath('five-crow-silhouettes.png')}),contentType:'image/png'});
 await page.evaluate(async()=>{const base=new URL('./',location.href).href,{arriveGardenCrow}=await import(base+'src/garden-crows.js');await crowFixture.store.transact(w=>{arriveGardenCrow(w,'large-billed-crow',Date.now(),{worldId:w.worldId,revision:w.revision,gardenId:w.encounters.garden.id});return w;});await crowFixture.refresh();});
 await expect(page.locator('.finch-crow-unknown img')).toHaveCount(4);const seen=page.locator('[data-crow-entry=large-billed-crow]');await expect(seen).toBeEnabled();await expect(seen).toContainText('ハシブトガラス');expect(await seen.locator('img').evaluate(img=>getComputedStyle(img).filter)).toBe('none');
});

test('rare early crow entry retains the warning and home escape',async({page})=>{
 await setup(page,{earlyPredatorVisits:true});await page.clock.runFor(19000);await expect(page.locator('[data-crow-phase=warning]')).toHaveCount(0);await page.clock.runFor(1000);await expect(page.locator('[data-crow-phase=warning]')).toBeVisible();expect(await page.evaluate(()=>crowFixture.world().birds[0].needs.energy)).toBe(80);await page.locator('[data-crow-phase=warning] [data-finch-go-home]').click();await page.clock.runFor(6000);expect(await page.evaluate(()=>crowFixture.world().birds[0].needs.energy)).toBe(80);
});
