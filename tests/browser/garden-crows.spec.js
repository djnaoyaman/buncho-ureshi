import {test,expect} from '@playwright/test';
const NOW=Date.UTC(2026,10,4,9);
async function setup(page,{species='large-billed-crow',friendly=false,seedVisit=false}={}){
 await page.goto('');
 const base=new URL('./',page.url()).href;
 await page.setContent(`<link rel="stylesheet" href="${base}src/encounter-ui.css"><style>body{margin:0;font-family:system-ui;color:#294d3b}#fixture{width:100vw;height:100dvh;position:relative;overflow:auto}.finch-overlay-content{max-height:100dvh}.finch-garden{height:100dvh}.finch-entry{padding:16px;box-sizing:border-box}</style><main id="fixture"></main>`);
 await page.clock.install({time:NOW});
 await page.evaluate(async({base,species,friendly,seedVisit,NOW})=>{
   const {createWorld}=await import(base+'src/engine.js');
   const {openGameStore}=await import(base+'src/game-store.js');
   const {mountEncounterPanel}=await import(base+'src/encounter-controller.js');
   const {arriveGardenCrow,petGardenCrow,CROW_SPECIES}=await import(base+'src/garden-crows.js');
   const store=await openGameStore();let world=createWorld(NOW);world.settings.motion=false;world.encounters.garden.open=true;world.birds[0].needs.energy=80;
   if(seedVisit||friendly){arriveGardenCrow(world,species,NOW-600001,{worldId:world.worldId,revision:world.revision,gardenId:world.encounters.garden.id});if(friendly)for(let i=0;i<13;i++)petGardenCrow(world,species,8,{worldId:world.worldId,revision:world.revision});world.birds[0].needs.energy=80;}
   world=await store.transact(()=>world);
   let pick=false;const random=()=>{pick=!pick;return pick?0:(CROW_SPECIES.findIndex(s=>s.id===species)+.1)/CROW_SPECIES.length;};
   const panel=mountEncounterPanel(document.querySelector('#fixture'),{getWorld:()=>world,initialMode:'garden',base,crowRandom:random,transact:async fn=>{world=await store.transact(fn);return world;},onHome:()=>{panel.notebook();document.body.dataset.home='true';}});
   window.crowFixture={panel,store,world:()=>world,refresh:async()=>{world=await store.transact(w=>w);panel.refresh();}};
 },{base,species,friendly,seedVisit,NOW});
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
 if(size[1]<=340)expect(notice.y+notice.height).toBeLessThanOrEqual(54);
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
test('reduced motion shadow is still visible and locked enemy records disclose no species',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await setup(page);await page.clock.runFor(120000);await expect(page.locator('.finch-crow-shadow')).toBeVisible();expect(await page.locator('.finch-crow-shadow svg').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');await page.evaluate(()=>crowFixture.panel.notebook());await page.locator('[data-crow-notebook]').click();await expect(page.locator('.finch-crow-notebook')).not.toContainText('ハシブトガラス');await expect(page.locator('.finch-crow-unknown')).toHaveCount(5);
});
