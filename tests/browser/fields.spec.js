import {stripGrowthPace} from '../fixtures/growth-legacy.js';
import {test,expect} from '@playwright/test';
import {createWorld,createBird,advanceTicks,validateWorld,readCompatibleWorld,feedBird,DECOR_SLOTS,DECOR_COLORS,DECOR_TIERS,drawDecoration} from '../../src/engine.js';
const DB_NAME = 'buncho-ureshi-garden-v1';
const fixedNow = Date.UTC(2026, 10, 2, 12, 0, 0);
async function decodeScene(page) {
  // A resize can change <picture>.currentSrc while a prior decode is pending;
  // a world refresh can also detach the room. Retry only those superseded reads.
  await page.evaluate(async()=>{
    const frame=()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));
    const deadline=performance.now()+10000;
    while(performance.now()<deadline){
      await frame();const room=document.querySelector('.game-room');if(!room?.isConnected)continue;
      const images=[...room.querySelectorAll('img')],sources=images.map(i=>i.currentSrc||i.src);
      const intended=img=>{const picture=img.closest('picture');const source=picture&&[...picture.querySelectorAll('source')].find(s=>!s.media||matchMedia(s.media).matches);return source?new URL(source.srcset.trim().split(/\s+/)[0],document.baseURI).href:img.src;};
      // This scene has one URL per source; wait for the currently selected
      // responsive candidate, not a still-decoded previous-width candidate.
      if(images.some((i,n)=>sources[n]!==intended(i)))continue;
      const results=await Promise.allSettled(images.map(i=>i.decode()));await frame();
      const current=[...room.querySelectorAll('img')];
      const superseded=!room.isConnected||document.querySelector('.game-room')!==room||current.length!==images.length||images.some((i,n)=>!i.isConnected||current[n]!==i||(i.currentSrc||i.src)!==sources[n]||intended(i)!==sources[n]);
      if(superseded)continue;
      const failed=results.findIndex(r=>r.status==='rejected');
      if(failed>=0)throw new Error('Stable scene image failed to decode: '+sources[failed]+' — '+String(results[failed].reason));
      if(images.length&&images.every(i=>i.complete&&i.naturalWidth>0&&i.naturalHeight>0))return;
      throw new Error('Stable scene image has no decoded pixels');
    }
    throw new Error('Scene never reached a stable connected, decoded state');
  });
}

// These helpers inspect only this application's own IndexedDB record.
// Game input, naming, menus, downloads, imports and handoffs remain real UI operations.
async function readWorld(page) {
  return page.evaluate(dbName => new Promise((resolve, reject) => {
    const open = indexedDB.open(dbName, 1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result, tx = db.transaction('world', 'readonly');
      const get = tx.objectStore('world').get('current');
      get.onsuccess = () => resolve(get.result);
      get.onerror = () => reject(get.error);
      tx.oncomplete = () => db.close();
    };
  }), DB_NAME);
}

async function seedWorld(page, world, lastUpdated = fixedNow) {
  await page.goto('');
  await page.evaluate(({ dbName, value, lastUpdated }) => new Promise((resolve, reject) => {
    const open = indexedDB.open(dbName, 1);
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains('world')) open.result.createObjectStore('world');
    };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result, tx = db.transaction('world', 'readwrite');
      value.lastUpdated = lastUpdated;
      tx.objectStore('world').put(value, 'current');
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  }), { dbName: DB_NAME, value: world, lastUpdated });
}

async function openGame(page, query = '') {
  await page.goto(`game/${query}`);
  await expect(page.locator('#game-root .game-app')).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
}

async function tab(page, name) {
  if(await page.locator('.game-bird-sheet').isVisible())await page.locator('[data-game-close-bird]').click();
  if(await page.locator('.game-panel-overlay').isVisible())await page.locator('[data-game-close-panel]').click();
  const direct = name==='garden' ? '.game-field-nav [data-field-travel="home"]'
    : ['decorate','family'].includes(name) ? `.game-bottom-dock [data-game-panel="${name}"]`
    : ['friends','outdoors'].includes(name) ? `.game-field-nav [data-game-panel="${name}"]` : null;
  if(direct)await page.locator(direct).click();
  else {
    const menu=page.locator('.game-secondary-menu');
    if(!await menu.evaluate(el=>el.open))await page.locator('.game-bottom-dock [data-game-open-menu]').click();
    await menu.locator(`[data-game-panel="${name}"]`).click();
    await expect(menu).not.toHaveAttribute('open','');
  }
}
async function openManagement(page) {
  const details=page.locator('[data-game-details="management"]');
  if(!await details.evaluate(el=>el.open))await details.locator(':scope > summary').click();
}

async function previewDecoration(page,id) {
  const tier=id.split('-').at(-1);
  await page.locator('[data-decor-filter="all"]').click();
  await page.locator(`[data-decor-tier="${tier}"]`).click();
  await expect(page.locator(`[data-decor-tier="${tier}"]`)).toHaveAttribute('aria-pressed','true');
  await page.locator(`[data-decor-preview="${id}"]`).click();
}

async function readDownload(download) {
  const stream = await download.createReadStream();
  if (!stream) throw new Error('The save download did not provide a readable stream.');
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

// Keep time deterministic while allowing timers and IndexedDB transactions to run normally.
// No browser clock, authentication, network, or outside state is inspected.
test.beforeEach(async ({ context, page }) => {
  await context.addInitScript(now => { Date.now = () => now; }, fixedNow);
  await page.route(/youtube|youtu\.be|googlevideo|ytimg/i, route => route.abort());
});


test('first session shows a home, welcome points and all nine decoration slots',async({page})=>{
 await openGame(page);await expect(page.locator('.game-room')).toHaveAttribute('data-field','home');
 expect((await readWorld(page)).decor.points).toBe(20);await expect(page.locator('.game-furnishing')).toHaveCount(9);
 await tab(page,'decorate');await expect(page.locator('[data-decor-slot]')).toHaveCount(9);
 for(const slot of DECOR_SLOTS){await page.locator(`[data-decor-slot="${slot.id}"]`).click();await expect(page.locator(`[data-decor-draw="${slot.id}"]`)).toBeEnabled();}
 await page.locator('[data-game-details="draw-odds"] summary').click();await expect(page.locator('[data-game-details="draw-odds"]')).toContainText('お金・広告・購入はありません');
});

test('home twelve gardens and known friend visits retain family and persist travel',async({page})=>{
 const w=createWorld(fixedNow);advanceTicks(w,1);const host=w.birds[1];host.home='departed';const chick=createBird(w,{home:'resident',stage:'chick'});w.paused=true;
 await seedWorld(page,w);await openGame(page);await expect(page.locator(`.game-room [data-bird-id="${chick.id}"]`)).toHaveCount(1);
 await tab(page,'outdoors');await expect(page.locator('.finch-garden-selector [data-garden-select]')).toHaveCount(12);
 await page.locator('.finch-garden-selector [data-garden-select="mizukagami"]').click();await expect(page.locator('.finch-garden-scenery')).toHaveAttribute('data-garden-id','mizukagami');
 await expect(page.locator('.finch-companion-walk')).toContainText(w.birds[0].name);await expect(page.locator('.finch-companion-walk')).not.toContainText(chick.name);
 const gardenSave=await readWorld(page);expect(gardenSave.encounters.garden.id).toBe('mizukagami');expect(gardenSave.worldId).toBe(w.worldId);expect(gardenSave.birds).toEqual(w.birds);
 await page.reload();await expect(page.locator('.game-app')).toBeVisible();expect((await readWorld(page)).encounters.garden.id).toBe('mizukagami');await tab(page,'outdoors');await expect(page.locator('.finch-garden-scenery')).toHaveAttribute('data-garden-id','mizukagami');
 await tab(page,'garden');await expect(page.locator('.game-room')).toHaveAttribute('data-field','home');expect((await readWorld(page)).encounters.garden.open).toBe(false);
 await tab(page,'friends');await page.locator(`[data-field-host="${host.id}"]`).click();await expect(page.locator('.game-room')).toHaveAttribute('data-field','friend');
 await expect(page.locator(`.game-room [data-bird-id="${host.id}"]`)).toHaveCount(1);await expect(page.locator('.game-room [data-bird-id="b1"]')).toHaveCount(1);await page.reload();await expect(page.locator('.game-room')).toHaveAttribute('data-field','friend');
 await tab(page,'garden');await expect(page.locator('.game-room')).toHaveAttribute('data-field','home');await expect(page.locator(`.game-room [data-bird-id="${chick.id}"]`)).toHaveCount(1);await expect(page.locator(`.game-room [data-bird-id="${host.id}"]`)).toHaveCount(0);
 await tab(page,'friends');await page.locator(`[data-field-invite="${host.id}"]`).click();await expect.poll(async()=> (await readWorld(page)).birds.find(b=>b.id===host.id).home).toBe('visitor');await tab(page,'garden');await expect(page.locator(`.game-room [data-bird-id="${host.id}"]`)).toHaveCount(1);
});

function richWorld(){const w=createWorld(fixedNow);w.paused=true;w.decor.points=w.decor.lifetimePoints=1000;for(const slot of DECOR_SLOTS)for(const color of DECOR_COLORS)for(const tier of DECOR_TIERS){const id=`${slot.id}-${color.id}-${tier.id}`;if(!w.decor.inventory.some(i=>i.id===id))w.decor.inventory.push({id,slot:slot.id,color:color.id,tier:tier.id});}return validateWorld(w);}

test('preview cancel and equip are separate; rich colors and unlocked finishes survive reload',async({page})=>{
 const w=richWorld();await seedWorld(page,w);await openGame(page);await tab(page,'decorate');await page.locator('[data-decor-slot="swing"]').click();
 await expect(page.locator('[data-decor-preview]')).toHaveCount(24);await previewDecoration(page,'swing-rose-special');await expect(page.locator('[data-preview-item]')).toHaveAttribute('data-preview-item','swing-rose-special');expect((await readWorld(page)).decor.equipped.swing).toBe('swing-mint-cozy');
 await page.locator('[data-decor-cancel]').click();await expect(page.locator('[data-preview-item]')).toHaveAttribute('data-preview-item','swing-mint-cozy');expect((await readWorld(page)).decor.points).toBe(1000);
 await previewDecoration(page,'swing-rose-special');await page.locator('[data-decor-equip="swing-rose-special"]').click();await expect.poll(async()=> (await readWorld(page)).decor.equipped.swing).toBe('swing-rose-special');await page.reload();await tab(page,'decorate');await page.locator('[data-decor-slot="swing"]').click();await expect(page.locator('[data-preview-item]')).toHaveAttribute('data-preview-item','swing-rose-special');
 await page.locator('[data-game-details="draw-odds"] summary').click();await expect(page.locator('[data-game-details="draw-odds"]')).toContainText('65% / とっておき 25% / きらめき 10%');
});

test('draw repeated clicks and concurrent tabs charge exactly once; preview does not auto equip',async({page,context})=>{
 const w=createWorld(fixedNow);w.paused=true;w.decor.points=w.decor.lifetimePoints=400;const expected=structuredClone(w),result=drawDecoration(expected,'toy');
 await seedWorld(page,w);await openGame(page);const second=await context.newPage();await openGame(second);await tab(page,'decorate');await tab(second,'decorate');await page.locator('[data-decor-slot="toy"]').click();await second.locator('[data-decor-slot="toy"]').click();
 await Promise.all([page,second].map(p=>p.locator('[data-decor-draw="toy"]').evaluate(button=>{button.click();button.click();button.click();})));
 await expect.poll(async()=> (await readWorld(page)).decor.draws).toBe(1);const saved=validateWorld(await readWorld(page));expect(saved.decor).toEqual(expected.decor);expect(saved.decor.equipped.toy).toBe('toy-mint-cozy');await expect(page.locator('[data-decor-draw="toy"]')).toBeDisabled();expect(result.item.slot).toBe('toy');await second.close();
});

test('v2 import cancellation preserves state; accepted migration keeps birds diary care and exports v14',async({page})=>{
 const old=createWorld(fixedNow);advanceTicks(old,80);old.paused=true;old.birds[0].name='大切なおもち';old.version=2;stripGrowthPace(old);for(const key of ['clock','archive','journal'])delete old[key];for(const event of old.events)event.at=old.epoch+event.tick*15000;delete old.decor?.duplicateStreaks;delete old.encounters;delete old.economy;delete old.lifecycle;delete old.protagonist;delete old.adoption;delete old.settings.adoptionMode;delete old.field;delete old.decor;delete old.gems;delete old.careSchedule;for(const b of old.birds){delete b.gemCare;delete b.naming;}
 validateWorld(readCompatibleWorld(old,fixedNow));
 await openGame(page);await page.locator('.game-scene-controls-toggle').click();await tab(page,'settings');const before=await readWorld(page);const file={name:'old-world-v2.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(old))};
 await openManagement(page);page.once('dialog',dialog=>dialog.dismiss());await page.locator('#game-import').setInputFiles(file);await expect.poll(async()=> (await readWorld(page)).worldId).toBe(before.worldId);expect((await readWorld(page)).birds).toEqual(before.birds);
 await openManagement(page);page.once('dialog',dialog=>dialog.accept());await page.locator('#game-import').setInputFiles(file);await expect(page.locator('.game-message')).toContainText('復元しました');const saved=validateWorld(await readWorld(page));expect(saved.version).toBe(15);expect(saved.birds.map(({gemCare,naming,growthPace,...bird})=>bird)).toEqual(old.birds);expect(saved.events).toEqual(old.events);expect(saved.care).toEqual(old.care);expect(saved.decor.points).toBe(20);
 await openManagement(page);const download=page.waitForEvent('download');await page.locator('[data-game-action="export"]').click();expect(JSON.parse(await readDownload(await download)).decor).toEqual(saved.decor);
});

for(const width of [390,1440])test(`illustrated home garden friend and rich decor actual pixels at ${width}px`,async({page},info)=>{
 const w=richWorld();const friend=createBird(w,{home:'departed',sex:'male',name:'こはく'});w.decor.equipped.swing='swing-rose-special';await seedWorld(page,w);await page.setViewportSize({width,height:1000});await openGame(page);
 for(const place of ['home','outdoors','friend','decorate']){
  if(place==='outdoors'){await tab(page,'outdoors');await expect(page.locator('.finch-garden-scenery')).toBeVisible();}
  if(place==='friend'){await tab(page,'friends');await page.locator(`[data-field-host="${friend.id}"]`).click();}
  if(place==='decorate'){await tab(page,'decorate');await page.locator('[data-decor-slot="swing"]').click();}
  else if(place!=='outdoors'){await expect(page.locator('.game-room')).toHaveAttribute('data-field',place);await decodeScene(page);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await expect(page.locator('.game-message.is-error')).toHaveCount(0);
  if(info.project.name==='chrome'){
   await info.attach(`field-${place}-${width}`,{body:await page.locator(place==='decorate'?'.game-decoration':place==='outdoors'?'.finch-garden':'.game-panel').screenshot({animations:'disabled'}),contentType:'image/png'});
   await page.evaluate(()=>scrollTo(0,0));await info.attach(`field-viewport-${place}-${width}`,{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
   if(!['decorate','outdoors'].includes(place))await info.attach(`field-scene-${place}-${width}`,{body:await page.locator('.game-room').screenshot({animations:'disabled'}),contentType:'image/png'});
  }
 }
});

test('newer panel navigation is not overwritten by an interrupted pending trip',async({page})=>{
 const w=createWorld(fixedNow);const host=createBird(w,{home:'departed'});w.field={place:'friend',hostId:host.id,enteredTick:w.tick};w.paused=true;await seedWorld(page,w);await openGame(page);
 await page.evaluate(()=>{document.querySelector('[data-field-travel="home"]').click();document.querySelector('.game-bottom-dock [data-game-panel="decorate"]').click();});
 await expect(page.locator('.game-decoration')).toBeVisible();await expect.poll(async()=> (await readWorld(page)).field.place).toBe('home');
 await expect(page.locator('.game-decoration')).toBeVisible();await expect(page.locator('.game-bottom-dock [data-game-panel="decorate"]')).toHaveAttribute('aria-pressed','true');
 await tab(page,'garden');await expect(page.locator('.game-room')).toHaveAttribute('data-field','home');
});


test('first session and twelve long-name birds retain readable mobile viewport and touch targets',async({page},info)=>{
 await page.setViewportSize({width:390,height:1000});await openGame(page);await decodeScene(page);
 if(info.project.name==='chrome')await info.attach('field-first-session-viewport-390',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
 const w=createWorld(fixedNow);for(let i=1;i<12;i++)createBird(w,{home:i<10?'resident':'visitor',name:'あいうえおかきくけこさしすせそた'});w.paused=true;
 await seedWorld(page,w);await openGame(page);await decodeScene(page);await expect(page.locator('.game-room-bird')).toHaveCount(12);
 const issues=await page.locator('.game-room').evaluate(room=>{const r=room.getBoundingClientRect();return [...room.querySelectorAll('.game-room-bird')].flatMap(b=>{const q=b.getBoundingClientRect();return q.width<44||q.height<44||q.left<r.left-1||q.right>r.right+1||q.top<r.top-1||q.bottom>r.bottom+1?[b.dataset.birdId]:[];});});expect(issues).toEqual([]);
 if(info.project.name==='chrome'){await page.evaluate(()=>scrollTo(0,0));await info.attach('field-twelve-longnames-viewport-390',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});await info.attach('field-twelve-longnames-scene-390',{body:await page.locator('.game-room').screenshot({animations:'disabled'}),contentType:'image/png'});}
});

test('secondary drawer opens and closes by real keyboard controls without losing focus or scrolling the scene',async({page})=>{
 await page.setViewportSize({width:390,height:1000});await openGame(page);await decodeScene(page);
 await expect(page.locator('.game-field-nav')).toHaveCount(1);await expect(page.locator('.game-field-nav button')).toHaveCount(3);
 const menu=page.locator('.game-secondary-menu'),summary=page.locator('.game-bottom-dock [data-game-open-menu]');await expect(menu).not.toHaveAttribute('open','');await expect(menu.locator('[data-game-panel="family"]')).not.toBeVisible();
 await summary.click();await expect(menu.locator('[data-game-panel="family"]')).toBeVisible();await menu.locator('[data-game-panel="family"]').focus();const before=await page.evaluate(()=>scrollY);await page.keyboard.press('Escape');await expect(summary).toBeFocused();await expect(menu).not.toHaveAttribute('open','');expect(Math.abs((await page.evaluate(()=>scrollY))-before)).toBeLessThan(4);
 await summary.press('Enter');await expect(menu.locator('[data-game-panel="family"]')).toBeVisible();await menu.locator('[data-game-close-menu]').click();await expect(summary).toBeFocused();await expect(menu).not.toHaveAttribute('open','');
 await summary.click();await menu.locator('[data-game-panel="family"]').click();await expect(page.locator('.game-family-tree')).toBeVisible();await expect(page.locator('.game-field-nav button')).toHaveCount(3);await tab(page,'garden');await expect(page.locator('.game-room')).toHaveAttribute('data-field','home');
});

// These are actual browser interactions and viewport checks, not the separate
// twenty manually played sessions requested by the user.
for(const size of [{width:320,height:568},{width:390,height:844},{width:1440,height:1000}])test(`bird action sheet keeps care in context and restores focus at ${size.width}px`,async({page},info)=>{
 const w=createWorld(fixedNow);w.paused=true;w.birds[0].needs.food=40;
 await seedWorld(page,w);await page.setViewportSize(size);await openGame(page);await decodeScene(page);
 await expect(page.locator('.game-panel .game-profile')).toHaveCount(0);
 const bird=page.locator('[data-game-scene-select][data-bird-id="b1"]');await bird.scrollIntoViewIfNeeded();const before=await page.evaluate(()=>scrollY);
 await bird.click();const sheet=page.locator('.game-bird-sheet');await expect(sheet).toBeVisible();await expect(sheet).toHaveAttribute('open','');await expect(page.locator('#game-sheet-close')).toBeFocused();
 const primary=sheet.locator('.game-care-actions button');await expect(primary).toHaveCount(3);
 expect(await primary.evaluateAll(buttons=>buttons.every(b=>{const r=b.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.top>=0&&r.bottom<=innerHeight;}))).toBe(true);
 await page.locator('[data-game-care="feed"]').click();await expect(page.locator('[data-game-fullness]')).toHaveText('60 / 100');await expect(page.locator('.game-care-feedback')).toBeVisible();
 expect(Math.abs(await page.evaluate(()=>scrollY)-before)).toBeLessThan(4);
 // Tab and Shift+Tab may cycle through the dialog; no background control may
 // receive focus while its native modal is open.
 for(let n=0;n<28;n++){await page.keyboard.press(n<14?'Tab':'Shift+Tab');expect(await sheet.evaluate(d=>d.contains(document.activeElement))).toBe(true);}
 await page.keyboard.press('Escape');await expect(sheet).not.toBeVisible();await expect(bird).toBeFocused();expect(Math.abs(await page.evaluate(()=>scrollY)-before)).toBeLessThan(4);
 await bird.click();await page.locator('[data-game-details="sheet-talk"] summary').click();await page.locator('#game-words').fill('まだ送らないことば');await page.locator('[data-game-close-bird]').click();await expect(bird).toBeFocused();
 await bird.click();await page.locator('[data-game-details="sheet-talk"] summary').click();await expect(page.locator('#game-words')).toHaveValue('まだ送らないことば');
 if(info.project.name==='chrome')await info.attach(`game-first-sheet-${size.width}`,{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
 await page.locator('[data-game-close-bird]').click();await tab(page,'outdoors');await expect(page.locator('.finch-garden-scenery')).toBeVisible();await expect(sheet).not.toBeVisible();
 await tab(page,'decorate');await expect(page.locator('.game-decoration')).toBeVisible();await expect(sheet).not.toBeVisible();
});

test('action sheet dismisses on backdrop and deliberate panel navigation focuses new context',async({page})=>{
 const w=createWorld(fixedNow);w.paused=true;await seedWorld(page,w);await page.setViewportSize({width:1440,height:1000});await openGame(page);
 await page.locator('[data-game-scene-select]').first().click();const sheet=page.locator('.game-bird-sheet');await expect(sheet).toBeVisible();const r=await sheet.boundingBox();expect(r.x).toBeGreaterThan(10);await page.mouse.click(r.x-8,r.y+r.height/2);await expect(sheet).not.toBeVisible();await expect(page.locator('[data-game-scene-select]')).toBeFocused();
 await tab(page,'profile');await page.locator('.game-profile [data-game-open-bird]').click();await expect(sheet).toBeVisible();await page.locator('[data-game-close-bird]').click();await expect(page.locator('.game-profile [data-game-open-bird]')).toBeFocused();
 await tab(page,'diary');await page.locator('.game-panel-overlay[open] .game-panel').evaluate(el=>el.scrollTo(0,el.scrollHeight));await tab(page,'family');await expect(page.locator('.game-family-tree')).toBeVisible();
 expect(await page.locator('.game-panel-overlay[open] .game-panel').evaluate(p=>{const h=p.querySelector('h3');const r=h.getBoundingClientRect();return document.activeElement===h&&r.top>=0&&r.bottom<=innerHeight;})).toBe(true);
});

test('friends empty state does not restart onboarding after visitors become residents',async({page})=>{
 const w=createWorld(fixedNow);advanceTicks(w,1);w.birds[1].home='resident';w.paused=true;
 await seedWorld(page,w);await openGame(page);await tab(page,'friends');
 await expect(page.locator('.game-empty-home')).toContainText('いま訪ねられる友達はいません');
 await expect(page.locator('.game-empty-home')).not.toContainText('最初');
 await page.locator('.game-empty-home [data-field-travel="home"]').click();await expect(page.locator('.game-room-bird')).toHaveCount(2);
});

async function holdWorldWrites(page){await page.evaluate(dbName=>new Promise((resolve,reject)=>{const q=indexedDB.open(dbName,1);q.onerror=()=>reject(q.error);q.onsuccess=()=>{const db=q.result,tx=db.transaction('world','readwrite'),store=tx.objectStore('world'),deadline=performance.now()+5000;let hold=true;window.__releaseGemWrite=()=>{hold=false;};tx.oncomplete=()=>db.close();const keep=()=>{const r=store.get('current');r.onsuccess=()=>{if(hold&&performance.now()<deadline)keep();};};keep();resolve();};}),DB_NAME);}
function collectibleWorld(){const w=createWorld(fixedNow);w.birds[0].needs.food=80;feedBird(w,'b1',fixedNow);advanceTicks(w,2);w.paused=true;expect(w.gems.droppings.length).toBeGreaterThan(0);return validateWorld(w);}

test('Gem collection waits for committed save and repeated clicks cannot pay twice',async({page})=>{
 const w=collectibleWorld(),drop=w.gems.droppings[0],before=w.decor.points;await seedWorld(page,w);await openGame(page);
 const pickup=page.locator(`[data-gem-collect="${drop.id}"]`);await expect(pickup).toBeVisible();await expect(pickup).toHaveAttribute('data-gem-revision',String(w.revision));
 // Hold this test world's IndexedDB write lock without changing its record.
 // A committed-only reward must not appear while the real transaction waits.
 await holdWorldWrites(page);
 try{
  await pickup.dblclick();await expect(page.locator('.game-gem-reward')).toHaveCount(0);await expect(page.locator('[data-decor-points]')).toContainText(String(before));
 }finally{await page.evaluate(()=>window.__releaseGemWrite());}
 await expect.poll(async()=>(await readWorld(page)).decor.points).toBe(before+8);await expect(page.locator('.game-gem-reward')).toContainText('+8 Gem');await expect(pickup).toHaveCount(0);
 const saved=validateWorld(await readWorld(page));expect(saved.gems.droppings.some(d=>d.id===drop.id)).toBe(false);await page.reload();await expect(pickup).toHaveCount(0);expect((await readWorld(page)).decor.points).toBe(before+8);
});

test('two tabs collecting the same dropping get exactly one Gem reward',async({page,context})=>{
 const w=collectibleWorld(),drop=w.gems.droppings[0],before=w.decor.points;await seedWorld(page,w);const second=await context.newPage();await Promise.all([openGame(page),openGame(second)]);
 await holdWorldWrites(page);try{await Promise.all([page,second].map(p=>p.locator(`[data-gem-collect="${drop.id}"]`).click()));}finally{await page.evaluate(()=>window.__releaseGemWrite());}
 await expect.poll(async()=>(await readWorld(page)).decor.points).toBe(before+8);const saved=validateWorld(await readWorld(page));expect(saved.gems.droppings.some(d=>d.id===drop.id)).toBe(false);await second.close();
});

test('all nine slots show 24 future items without granting locked or unowned equipment',async({page})=>{
 test.setTimeout(120000); // 9 categories × every tier and two previews use real browser actions.
 const w=createWorld(fixedNow);w.paused=true;await seedWorld(page,w);await openGame(page);await tab(page,'decorate');
 for(const slot of DECOR_SLOTS){
  await page.locator(`[data-decor-slot="${slot.id}"]`).click();await expect(page.locator('[data-decor-preview]')).toHaveCount(24);
  for(const tier of DECOR_TIERS){await page.locator(`[data-decor-tier="${tier.id}"]`).click();await expect(page.locator('.game-collection-tier:not([hidden]) [data-decor-preview]')).toHaveCount(8);await expect(page.locator('.game-collection-tier:not([hidden])')).toBeVisible();}
  await expect(page.locator('[data-decor-preview][data-owned="true"]')).toHaveCount(1);await expect(page.locator('[data-decor-preview][data-owned="false"]')).toHaveCount(23);await expect(page.locator('[data-decor-preview][data-locked="true"]')).toHaveCount(16);
  const locked=`${slot.id}-rose-special`;await previewDecoration(page,locked);await expect(page.locator('[data-preview-item]')).toHaveAttribute('data-preview-item',locked);await expect(page.locator('[data-decor-equip]')).toHaveCount(0);await expect(page.locator('.game-decor-preview')).toContainText('Lv.6');
  const future=`${slot.id}-rose-cozy`;await previewDecoration(page,future);await expect(page.locator('[data-preview-item]')).toHaveAttribute('data-preview-item',future);await expect(page.locator('[data-decor-equip]')).toHaveCount(0);
  expect((await readWorld(page)).decor).toEqual(w.decor);
 }
});

for(const width of [320,390,1440])test(`immersive Gem world, complete collection and profile A portrait card at ${width}px`,async({page},info)=>{
 const w=collectibleWorld();await seedWorld(page,w);await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await openGame(page);await decodeScene(page);
 await expect(page.locator('.game-field-nav button')).toHaveCount(3);await expect(page.locator('.game-bottom-dock [data-game-panel="decorate"]')).toBeVisible();await expect(page.locator('#game-scene-resident')).toHaveCount(0);
 if(info.project.name==='chrome')await info.attach(`gem-main-${width}`,{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
 const pickup=page.locator('[data-gem-collect]').first(),before=(await readWorld(page)).decor.points;await pickup.click();await expect(page.locator('.game-gem-reward')).toContainText('+8 Gem');expect((await readWorld(page)).decor.points).toBe(before+8);
 if(info.project.name==='chrome')await info.attach(`gem-collect-${width}`,{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
 await tab(page,'profile');await expect(page.locator('.game-profile-heading .game-mini-bird')).toBeVisible();
 await expect.poll(()=>page.locator('.game-profile-portrait img').evaluateAll(images=>images.length>0&&images.every(image=>image.complete&&image.naturalWidth>0))).toBe(true);
 // Approved A uses two balanced columns, with the complete face-visible crop beside identity.
 const placement=await page.locator('.game-profile-heading').evaluate(h=>{
  const portrait=h.querySelector('.game-profile-portrait'),b=portrait.getBoundingClientRect(),r=h.getBoundingClientRect(),identity=h.querySelector('.game-profile-identity').getBoundingClientRect(),card=h.closest('.game-profile-card').getBoundingClientRect(),frame=(portrait.querySelector('.game-pose-window')||portrait.querySelector('.game-sprite')).getBoundingClientRect();
  return {portraitShare:b.width/r.width,identityShare:identity.width/r.width,sideBySide:b.right<=identity.left+1,aligned:Math.abs((b.top+b.bottom-identity.top-identity.bottom)/2),frameShare:frame.width/b.width,frameContained:frame.left>=b.left-1&&frame.right<=b.right+1&&frame.top>=b.top-1&&frame.bottom<=b.bottom+1,cardContained:b.left>=card.left&&identity.right<=card.right,decoded:[...portrait.querySelectorAll('img')].every(image=>image.complete&&image.naturalWidth>0)};
 });
 expect(placement.portraitShare).toBeGreaterThanOrEqual(.32);expect(placement.portraitShare).toBeLessThanOrEqual(.5);expect(placement.identityShare).toBeGreaterThanOrEqual(.4);expect(placement.identityShare).toBeLessThanOrEqual(.5);expect(placement.sideBySide).toBe(true);expect(placement.aligned).toBeLessThan(2);expect(placement.frameShare).toBeGreaterThanOrEqual(.75);expect(placement.frameContained).toBe(true);expect(placement.cardContained).toBe(true);expect(placement.decoded).toBe(true);
 await expect(page.locator('.game-profile-portrait .game-sprite')).toHaveAttribute('data-pose','left');
 await expect(page.locator('.game-profile-heading h3')).toHaveText(w.birds[0].name);
 await expect(page.locator('.game-profile-subtitle')).toBeVisible();
 await expect(page.locator('.game-profile-subtitle')).toHaveText(`${{white:'白文鳥',sakura:'桜文鳥',silver:'シルバー',cinnamon:'シナモン'}[w.birds[0].color]} · ${w.birds[0].sex==='female'?'メス':'オス'} · 成鳥`);
 if(info.project.name==='chrome')await info.attach(`gem-profile-${width}`,{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
 await tab(page,'decorate');await page.locator('[data-decor-slot="swing"]').click();await expect(page.locator('[data-decor-preview]')).toHaveCount(24);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 if(info.project.name==='chrome')await info.attach(`gem-all-24-${width}`,{body:await page.locator('.game-decoration').screenshot({animations:'disabled'}),contentType:'image/png'});
});

test('horizontal bird gestures and keyboard arrows preserve drafts while vertical movement does not switch birds',async({page})=>{
 const w=createWorld(fixedNow);createBird(w,{home:'resident',name:'こめ'});w.paused=true;await seedWorld(page,w);await page.setViewportSize({width:390,height:844});await openGame(page);await page.emulateMedia({reducedMotion:'reduce'});
 // Gesture click suppression uses real elapsed time. Restore a monotonic,
 // integer test clock here; the world stays paused throughout the interaction.
 await page.evaluate(()=>{const base=Date.now(),start=performance.now();Date.now=()=>base+Math.floor(performance.now()-start);});
 const gesture=async(locator,dx,dy)=>{await locator.scrollIntoViewIfNeeded();const r=await locator.boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:8});await page.mouse.up();await page.waitForTimeout(450);};
 const face=page.locator('.game-bird-carousel-face');await expect(face).toHaveAttribute('data-bird-id','b1');await gesture(face,-80,4);await expect(face).toHaveAttribute('data-bird-id','b2');
 await gesture(face,4,-80);await expect(face).toHaveAttribute('data-bird-id','b2');
 const prev=page.locator('.game-bird-carousel [data-bird-step="-1"]');await prev.focus();await page.keyboard.press('Enter');await expect(face).toHaveAttribute('data-bird-id','b1');
 await tab(page,'profile');await page.locator('#game-name').fill('まだ保存しない名前');await gesture(page.locator('.game-profile-heading .game-mini-bird'),-80,2);await expect(page.locator('.game-profile-heading h3')).toHaveText('こめ');await page.locator('.game-profile [data-bird-step="-1"]').click();await expect(page.locator('#game-name')).toHaveValue('まだ保存しない名前');
 await page.locator('.game-profile [data-game-open-bird]').click();await page.locator('[data-game-details="sheet-talk"] > summary').click();await page.locator('#game-words').fill('まだ送らないことば');await gesture(page.locator('.game-sheet-heading .game-mini-bird'),-80,2);await expect(page.locator('#game-sheet-title')).toHaveText('こめ');await page.locator('.game-bird-sheet [data-bird-step="-1"]').click();await expect(page.locator('#game-words')).toHaveValue('まだ送らないことば');
 expect((await readWorld(page)).birds.map(b=>b.name)).toEqual(w.birds.map(b=>b.name));await page.keyboard.press('Escape');await expect(page.locator('.game-bird-sheet')).not.toBeVisible();
});

test('friend carousel centers with accessible arrows, allows vertical scrolling and keeps visit and invite controls usable',async({page},info)=>{
 const w=createWorld(fixedNow);const friends=['こはく','すず','そら'].map(name=>createBird(w,{home:'departed',name,sex:'male'}));w.paused=true;await seedWorld(page,w);await page.setViewportSize({width:390,height:600});await page.emulateMedia({reducedMotion:'reduce'});await openGame(page);await tab(page,'friends');
 const track=page.locator('.game-friend-houses');await expect(track.locator('[data-friend-card]')).toHaveCount(3);await expect(track).toHaveCSS('touch-action','pan-x pan-y');
 await page.locator('[data-friend-step="1"]').click();const target=page.locator(`[data-friend-card="${friends[1].id}"]`);
 await expect.poll(()=>target.evaluate(el=>{const a=el.getBoundingClientRect(),b=el.parentElement.getBoundingClientRect();return Math.abs((a.left+a.right-b.left-b.right)/2);})).toBeLessThan(5);
 // Vertical wheel input over the native horizontal scroller must still move
 // the overlay, while the immersive document remains fixed. This is not a physical-phone swipe claim.
 const panel=page.locator('.game-panel-overlay[open] .game-panel');await panel.evaluate(el=>el.scrollTo(0,0));const box=await track.boundingBox();await page.mouse.move(box.x+box.width/2,Math.min(560,box.y+20));await page.mouse.wheel(0,160);await expect.poll(()=>panel.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);expect(await page.evaluate(()=>scrollY)).toBe(0);
 await page.setViewportSize({width:390,height:844});
 if(info.project.name==='chrome')await info.attach('gem-friend-carousel-390',{body:await page.locator('.game-friends').screenshot({animations:'disabled'}),contentType:'image/png'});
 await target.locator('[data-field-travel="friend"]').click();await expect(page.locator('.game-room')).toHaveAttribute('data-field','friend');expect((await readWorld(page)).field.hostId).toBe(friends[1].id);
 await tab(page,'friends');await page.locator('[data-friend-step="1"]').click();await page.locator(`[data-friend-card="${friends[1].id}"] [data-field-invite]`).click();await expect.poll(async()=>(await readWorld(page)).birds.find(b=>b.id===friends[1].id).home).toBe('visitor');
 await expect(page.locator(`[data-friend-card="${friends[1].id}"] [data-field-invite]`)).toBeDisabled();
});

test('approved title logo starts centered for two seconds once per game entry and respects reduced motion',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('game/');
 const intro=page.locator('.game-logo-intro');await expect(intro).toBeVisible();const started=Date.now();await expect(intro.locator('img')).toHaveAttribute('alt','おもちの文鳥ぐらし');expect(await intro.evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
 const box=await intro.locator('img').boundingBox();expect(Math.abs(box.x+box.width/2-195)).toBeLessThan(2);expect(Math.abs(box.y+box.height/2-422)).toBeLessThan(2);
 if(info.project.name==='chrome')await info.attach('gem-startup-logo-390',{body:await page.screenshot(),contentType:'image/png'});
 await expect(intro).toHaveCount(0);expect(Date.now()-started).toBeGreaterThan(1200);await tab(page,'outdoors');await expect(page.locator('.game-logo-intro')).toHaveCount(0);await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
});
// Append to tests/browser/fields.spec.js to reuse its supported seed/decode helpers.
for(const width of [320,390])test(`furniture: eight actual forms keep mounted contacts with twelve birds at ${width}px`,async({page},info)=>{
 test.setTimeout(120000);await page.setViewportSize({width,height:1000});
 for(let variant=0;variant<8;variant++){
  const w=createWorld(fixedNow);for(let i=1;i<12;i++)createBird(w,{home:i<10?'resident':'visitor'});w.paused=true;
  w.decor.inventory=DECOR_SLOTS.flatMap(s=>DECOR_COLORS.flatMap(c=>DECOR_TIERS.map(t=>({id:`${s.id}-${c.id}-${t.id}`,slot:s.id,color:c.id,tier:t.id}))));w.decor.lifetimePoints=9999;
  for(const slot of DECOR_SLOTS)w.decor.equipped[slot.id]=`${slot.id}-${DECOR_COLORS[variant].id}-lovely`;
  validateWorld(w);await seedWorld(page,w);await openGame(page);await decodeScene(page);
  await expect(page.locator('.game-room-bird')).toHaveCount(12);await expect(page.locator('[data-equipped-slot]')).toHaveCount(9);
  for(const slot of DECOR_SLOTS)await expect(page.locator(`[data-equipped-slot="${slot.id}"] svg`)).toHaveAttribute('data-form',String(variant));
  const outliers=await page.locator('.game-room').evaluate(room=>{const r=room.getBoundingClientRect();return [...room.querySelectorAll('.game-furnishing')].filter(e=>e.dataset.equippedSlot!=='paper').flatMap(e=>{const b=e.getBoundingClientRect();return b.left<r.left-1||b.right>r.right+1||b.top<r.top-1||b.bottom>r.bottom+1?[e.dataset.equippedSlot]:[];});});expect(outliers).toEqual([]);
  const restored=await readWorld(page);expect(restored.decor.inventory).toEqual(w.decor.inventory);expect(restored.decor.equipped).toEqual(w.decor.equipped);
  if(info.project.name==='chrome')await info.attach(`furniture-mounted-${width}-form-${variant+1}`,{body:await page.locator('.game-room').screenshot({animations:'disabled'}),contentType:'image/png'});
 }
});

for(const width of [320,390,1024])for(const contacts of [0,1,2,3,12,127])test(`relationship map has bounded directed contacts at ${width}px with ${contacts} links`,async({page},info)=>{
 await page.setViewportSize({width,height:1000});const w=createWorld(fixedNow);w.paused=true;
 for(let i=0;i<contacts;i++){
  const b=createBird(w,{home:i<9?'resident':i<11?'visitor':'departed',name:i<2?'そら':'長い名前のおともだち'});
  w.birds[0].relations[b.id]={affection:80,trust:70,compatibility:60,meetings:4,lastTick:0};b.relations.b1={affection:20,trust:30,compatibility:60,meetings:4,lastTick:0};
 }
 validateWorld(w);await seedWorld(page,w);await openGame(page);await tab(page,'relations');const map=page.locator('[data-rel-map]');await expect(map).toHaveAttribute('data-rel-selected','b1');await expect(map).toHaveAttribute('data-rel-total',String(contacts));await expect(map.locator('select')).toHaveCount(0);await expect(map.locator('[data-rel-peer-id]')).toHaveCount(Math.min(contacts,2));
 for(const img of await map.locator('img').all())await img.evaluate(image=>image.decode());
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const before=await readWorld(page);
 if(contacts){await map.locator('summary').first().click();await expect(map.locator('details').first()).toHaveAttribute('open','');await expect(map.locator('details').first()).toContainText('親しさ 80');await expect(map.locator('details').first()).toContainText('親しさ 20');await map.locator('summary').first().click();}
 if(info.project.name==='chrome')await info.attach(`relationship-map-${width}-${contacts}`,{body:await map.screenshot({animations:'disabled'}),contentType:'image/png'});
 if(contacts>2){await page.locator('#game-rel-page-next').click();await expect(map).toHaveAttribute('data-rel-page','1');await page.locator('#game-rel-page-prev').click();await expect(map).toHaveAttribute('data-rel-page','0');}
 if(contacts){await map.locator('[data-rel-focus-id="b2"]').click();await expect(map).toHaveAttribute('data-rel-selected','b2');await expect(map).toBeFocused();}
 expect(await readWorld(page)).toEqual(before);
});
