import {test,expect} from '@playwright/test';
import {createWorld,createBird,advanceTicks,validateWorld,DECOR_SLOTS,DECOR_COLORS,DECOR_TIERS,drawDecoration} from '../../src/engine.js';
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
}

async function tab(page, name) {
  if(await page.locator('.game-bird-sheet').isVisible())await page.locator('[data-game-close-bird]').click();
  const target=page.locator(`[data-game-panel="${name}"]`).first();if(!await target.isVisible())await page.locator('.game-secondary-menu summary').click();await target.click();
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

test('home park and known friend visits change actual occupants; return and reload preserve travel',async({page})=>{
 const w=createWorld(fixedNow);advanceTicks(w,1);const host=w.birds[1];host.home='departed';const chick=createBird(w,{home:'resident',stage:'chick'});w.paused=true;
 await seedWorld(page,w);await openGame(page);await expect(page.locator(`[data-bird-id="${chick.id}"]`)).toHaveCount(1);
 await page.locator('[data-field-travel="park"]').click();await expect(page.locator('.game-room')).toHaveAttribute('data-field','park');
 await expect(page.locator(`[data-bird-id="${chick.id}"]`)).toHaveCount(0);await expect(page.locator(`[data-bird-id="${host.id}"]`)).toHaveCount(1);
 await tab(page,'friends');await page.locator(`[data-field-host="${host.id}"]`).click();await expect(page.locator('.game-room')).toHaveAttribute('data-field','friend');
 await expect(page.locator(`[data-bird-id="${host.id}"]`)).toHaveCount(1);await expect(page.locator('[data-bird-id="b1"]')).toHaveCount(1);await page.reload();await expect(page.locator('.game-room')).toHaveAttribute('data-field','friend');
 await page.locator('[data-field-travel="home"]').click();await expect(page.locator('.game-room')).toHaveAttribute('data-field','home');await expect(page.locator(`[data-bird-id="${chick.id}"]`)).toHaveCount(1);await expect(page.locator(`[data-bird-id="${host.id}"]`)).toHaveCount(0);
 await tab(page,'friends');await page.locator(`[data-field-invite="${host.id}"]`).click();await expect.poll(async()=> (await readWorld(page)).birds.find(b=>b.id===host.id).home).toBe('visitor');await page.locator('[data-field-travel="home"]').click();await expect(page.locator(`[data-bird-id="${host.id}"]`)).toHaveCount(1);
});

function richWorld(){const w=createWorld(fixedNow);w.paused=true;w.decor.points=w.decor.lifetimePoints=1000;for(const slot of DECOR_SLOTS)for(const color of DECOR_COLORS)for(const tier of DECOR_TIERS){const id=`${slot.id}-${color.id}-${tier.id}`;if(!w.decor.inventory.some(i=>i.id===id))w.decor.inventory.push({id,slot:slot.id,color:color.id,tier:tier.id});}return validateWorld(w);}

test('preview cancel and equip are separate; rich colors and unlocked finishes survive reload',async({page})=>{
 const w=richWorld();await seedWorld(page,w);await openGame(page);await tab(page,'decorate');await page.locator('[data-decor-slot="swing"]').click();
 await expect(page.locator('[data-decor-preview]')).toHaveCount(24);await page.locator('[data-decor-preview="swing-rose-special"]').click();await expect(page.locator('[data-preview-item]')).toHaveAttribute('data-preview-item','swing-rose-special');expect((await readWorld(page)).decor.equipped.swing).toBe('swing-mint-cozy');
 await page.locator('[data-decor-cancel]').click();await expect(page.locator('[data-preview-item]')).toHaveAttribute('data-preview-item','swing-mint-cozy');expect((await readWorld(page)).decor.points).toBe(1000);
 await page.locator('[data-decor-preview="swing-rose-special"]').click();await page.locator('[data-decor-equip="swing-rose-special"]').click();await expect.poll(async()=> (await readWorld(page)).decor.equipped.swing).toBe('swing-rose-special');await page.reload();await tab(page,'decorate');await page.locator('[data-decor-slot="swing"]').click();await expect(page.locator('[data-preview-item]')).toHaveAttribute('data-preview-item','swing-rose-special');
 await page.locator('[data-game-details="draw-odds"] summary').click();await expect(page.locator('[data-game-details="draw-odds"]')).toContainText('65% / とっておき 25% / きらめき 10%');
});

test('draw repeated clicks and concurrent tabs charge exactly once; preview does not auto equip',async({page,context})=>{
 const w=createWorld(fixedNow);w.paused=true;w.decor.points=w.decor.lifetimePoints=400;const expected=structuredClone(w),result=drawDecoration(expected,'toy');
 await seedWorld(page,w);await openGame(page);const second=await context.newPage();await openGame(second);await tab(page,'decorate');await tab(second,'decorate');await page.locator('[data-decor-slot="toy"]').click();await second.locator('[data-decor-slot="toy"]').click();
 await Promise.all([page,second].map(p=>p.locator('[data-decor-draw="toy"]').evaluate(button=>{button.click();button.click();button.click();})));
 await expect.poll(async()=> (await readWorld(page)).decor.draws).toBe(1);const saved=validateWorld(await readWorld(page));expect(saved.decor).toEqual(expected.decor);expect(saved.decor.equipped.toy).toBe('toy-mint-cozy');await expect(page.locator('[data-decor-draw="toy"]')).toBeDisabled();expect(result.item.slot).toBe('toy');await second.close();
});

test('v2 import cancellation preserves state; accepted migration keeps birds diary care and exports v3',async({page})=>{
 const old=createWorld(fixedNow);advanceTicks(old,80);old.paused=true;old.birds[0].name='大切なおもち';old.version=2;delete old.field;delete old.decor;
 await openGame(page);await tab(page,'settings');const before=await readWorld(page);const file={name:'old-world-v2.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(old))};
 page.once('dialog',dialog=>dialog.dismiss());await page.locator('#game-import').setInputFiles(file);await expect.poll(async()=> (await readWorld(page)).worldId).toBe(before.worldId);expect((await readWorld(page)).birds).toEqual(before.birds);
 page.once('dialog',dialog=>dialog.accept());await page.locator('#game-import').setInputFiles(file);await expect(page.locator('.game-message')).toContainText('復元しました');const saved=validateWorld(await readWorld(page));expect(saved.version).toBe(3);expect(saved.birds).toEqual(old.birds);expect(saved.events).toEqual(old.events);expect(saved.care).toEqual(old.care);expect(saved.decor.points).toBe(20);
 const download=page.waitForEvent('download');await page.locator('[data-game-action="export"]').click();expect(JSON.parse(await readDownload(await download)).decor).toEqual(saved.decor);
});

for(const width of [390,1440])test(`illustrated home park friend and rich decor actual pixels at ${width}px`,async({page},info)=>{
 const w=richWorld();const friend=createBird(w,{home:'departed',sex:'male',name:'こはく'});w.decor.equipped.swing='swing-rose-special';await seedWorld(page,w);await page.setViewportSize({width,height:1000});await openGame(page);
 for(const place of ['home','park','friend','decorate']){
  if(place==='park')await page.locator('[data-field-travel="park"]').click();
  if(place==='friend'){await tab(page,'friends');await page.locator(`[data-field-host="${friend.id}"]`).click();}
  if(place==='decorate'){await tab(page,'decorate');await page.locator('[data-decor-slot="swing"]').click();}
  else{await expect(page.locator('.game-room')).toHaveAttribute('data-field',place);await decodeScene(page);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await expect(page.locator('.game-message.is-error')).toHaveCount(0);
  if(info.project.name==='chromium'){
   await info.attach(`field-${place}-${width}`,{body:await page.locator(place==='decorate'?'.game-decoration':'.game-panel').screenshot({animations:'disabled'}),contentType:'image/png'});
   await page.evaluate(()=>scrollTo(0,0));await info.attach(`field-viewport-${place}-${width}`,{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
   if(place!=='decorate')await info.attach(`field-scene-${place}-${width}`,{body:await page.locator('.game-room').screenshot({animations:'disabled'}),contentType:'image/png'});
  }
 }
});

test('newer panel navigation is not overwritten by an interrupted pending trip',async({page})=>{
 const w=createWorld(fixedNow);w.paused=true;await seedWorld(page,w);await openGame(page);
 await page.evaluate(()=>{document.querySelector('[data-field-travel="park"]').click();document.querySelector('.game-field-nav [data-game-panel="decorate"]').click();});
 await expect(page.locator('.game-decoration')).toBeVisible();await expect.poll(async()=> (await readWorld(page)).field.place).toBe('park');
 await expect(page.locator('.game-decoration')).toBeVisible();await expect(page.locator('.game-field-nav [data-game-panel="decorate"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-field-travel="home"]').click();await expect(page.locator('.game-room')).toHaveAttribute('data-field','home');
});


test('first session and twelve long-name birds retain readable mobile viewport and touch targets',async({page},info)=>{
 await page.setViewportSize({width:390,height:1000});await openGame(page);await decodeScene(page);
 if(info.project.name==='chromium')await info.attach('field-first-session-viewport-390',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
 const w=createWorld(fixedNow);for(let i=1;i<12;i++)createBird(w,{home:i<10?'resident':'visitor',name:'あいうえおかきくけこさしすせそた'});w.paused=true;
 await seedWorld(page,w);await openGame(page);await decodeScene(page);await expect(page.locator('.game-room-bird')).toHaveCount(12);
 const issues=await page.locator('.game-room').evaluate(room=>{const r=room.getBoundingClientRect();return [...room.querySelectorAll('.game-room-bird')].flatMap(b=>{const q=b.getBoundingClientRect();return q.width<44||q.height<44||q.left<r.left-1||q.right>r.right+1||q.top<r.top-1||q.bottom>r.bottom+1?[b.dataset.birdId]:[];});});expect(issues).toEqual([]);
 if(info.project.name==='chromium'){await page.evaluate(()=>scrollTo(0,0));await info.attach('field-twelve-longnames-viewport-390',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});await info.attach('field-twelve-longnames-scene-390',{body:await page.locator('.game-room').screenshot({animations:'disabled'}),contentType:'image/png'});}
});

test('secondary drawer opens and closes by real keyboard controls without losing focus or scrolling the scene',async({page})=>{
 await page.setViewportSize({width:390,height:1000});await openGame(page);await decodeScene(page);
 await expect(page.locator('.game-field-nav')).toHaveCount(1);await expect(page.locator('.game-field-nav button')).toHaveCount(4);
 const menu=page.locator('.game-secondary-menu'),summary=menu.locator('summary');await expect(menu).not.toHaveAttribute('open','');await expect(menu.locator('[data-game-panel="family"]')).not.toBeVisible();
 await summary.click();await expect(menu.locator('[data-game-panel="family"]')).toBeVisible();await menu.locator('[data-game-panel="family"]').focus();const before=await page.evaluate(()=>scrollY);await page.keyboard.press('Escape');await expect(summary).toBeFocused();await expect(menu).not.toHaveAttribute('open','');expect(Math.abs((await page.evaluate(()=>scrollY))-before)).toBeLessThan(4);
 await summary.press('Enter');await expect(menu.locator('[data-game-panel="family"]')).toBeVisible();await menu.locator('[data-game-close-menu]').click();await expect(summary).toBeFocused();await expect(menu).not.toHaveAttribute('open','');
 await summary.click();await menu.locator('[data-game-panel="family"]').click();await expect(page.locator('.game-family-tree')).toBeVisible();await expect(page.locator('.game-field-nav button')).toHaveCount(4);await page.locator('[data-field-travel="home"]').click();await expect(page.locator('.game-room')).toHaveAttribute('data-field','home');
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
 if(info.project.name==='chromium')await info.attach(`game-first-sheet-${size.width}`,{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
 await page.locator('[data-game-close-bird]').click();await page.locator('[data-field-travel="park"]').click();await expect(page.locator('.game-room')).toHaveAttribute('data-field','park');await expect(sheet).not.toBeVisible();
 await tab(page,'decorate');await expect(page.locator('.game-decoration')).toBeVisible();await expect(sheet).not.toBeVisible();
});

test('action sheet dismisses on backdrop and deliberate panel navigation focuses new context',async({page})=>{
 const w=createWorld(fixedNow);w.paused=true;await seedWorld(page,w);await page.setViewportSize({width:1440,height:1000});await openGame(page);
 await page.locator('[data-game-scene-select]').first().click();const sheet=page.locator('.game-bird-sheet');await expect(sheet).toBeVisible();const r=await sheet.boundingBox();expect(r.x).toBeGreaterThan(10);await page.mouse.click(r.x-8,r.y+r.height/2);await expect(sheet).not.toBeVisible();await expect(page.locator('[data-game-scene-select]')).toBeFocused();
 await tab(page,'profile');await page.locator('[data-game-open-bird]').click();await expect(sheet).toBeVisible();await page.locator('[data-game-close-bird]').click();await expect(page.locator('[data-game-open-bird]')).toBeFocused();
 await tab(page,'diary');await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));await tab(page,'family');await expect(page.locator('.game-family-tree')).toBeVisible();
 expect(await page.locator('.game-panel').evaluate(p=>{const h=p.querySelector('h3');const r=h.getBoundingClientRect();return document.activeElement===h&&r.top>=0&&r.bottom<=innerHeight;})).toBe(true);
});

test('friends empty state does not restart onboarding after visitors become residents',async({page})=>{
 const w=createWorld(fixedNow);advanceTicks(w,1);w.birds[1].home='resident';w.paused=true;
 await seedWorld(page,w);await openGame(page);await tab(page,'friends');
 await expect(page.locator('.game-empty-home')).toContainText('いま訪ねられる友達はいません');
 await expect(page.locator('.game-empty-home')).not.toContainText('最初');
 await page.locator('.game-empty-home [data-field-travel="home"]').click();await expect(page.locator('.game-room-bird')).toHaveCount(2);
});
