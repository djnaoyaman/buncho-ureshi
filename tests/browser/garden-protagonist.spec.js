import {test, expect} from '@playwright/test';

async function ready(page, width, elect=true) {
  await page.setViewportSize({width, height: width === 320 ? 568 : 844});
  await page.addInitScript(() => {
    // Freeze only wall time: paused-world heartbeat metadata must not invalidate the save identity assertion.
    Date.now = () => 1793683200000;
    localStorage.setItem('buncho.music.v1', JSON.stringify({enabled:false}));
    localStorage.setItem('buncho.care-sound-choice.v1', JSON.stringify({explicit:true,enabled:false}));
  });
  await page.goto('game/');
  await expect(page.locator('body')).toHaveAttribute('data-game-intro', 'done');await page.locator('.game-scene-controls-toggle').click();await expect(page.locator('.game-scene-controls-toggle')).toHaveAttribute('aria-expanded','true');
  await page.locator('.game-field-nav [data-game-panel=outdoors]').click();
  await expect(page.locator('.game-encounter-host')).toHaveAttribute('aria-busy', 'false');
  if(elect)await optIn(page);
}

async function optIn(page){
 await page.locator('[data-garden-details="companions"]>summary').click();
 await page.locator('[data-garden-accompany="true"]').click();
 await page.locator('[data-garden-companion="b1"]').click();
 await expect(page.locator('[data-garden-companion="b1"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-garden-companions-save]').click();
 await expect(page.locator('.finch-companion-feedback')).toContainText('覚えたよ');
 await page.locator('[data-garden-details="companions"]>summary').click();
 await page.locator('[data-game-close-panel]').click();
 await expect(page.locator('.game-panel-overlay')).not.toBeVisible();
 await page.locator('[data-game-panel=outdoors]').click();
 await expect(page.locator('.game-encounter-host')).toHaveAttribute('aria-busy','false');
 await expect(page.locator('[data-garden-household="b1"]')).toBeVisible();
}


async function verifyTargets(page, width) {
  const birds = page.locator('.finch-garden-stage .finch-garden-friend, .finch-garden-stage [data-garden-household], .finch-garden-stage .finch-garden-visitor');
  const bounds = await birds.evaluateAll(elements => elements.map(element => {
    const r = element.getBoundingClientRect();
    return {x:r.x,y:r.y,w:r.width,h:r.height,hit:element.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};
  }));
  for (const b of bounds) {
    expect(b.w).toBeGreaterThanOrEqual(44);
    expect(b.h).toBeGreaterThanOrEqual(44);
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x+b.w).toBeLessThanOrEqual(width);
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.y+b.h).toBeLessThanOrEqual(await page.evaluate(() => innerHeight));
    expect(b.hit).toBe(true);
  }
  for (let i=0;i<bounds.length;i++) for (let j=i+1;j<bounds.length;j++) {
    const a=bounds[i], b=bounds[j];
    const area=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
    expect(area, `bird targets ${i} and ${j} must not overlap`).toBe(0);
  }
}

for (const width of [320,390]) test(`Omochi optionally joins the garden and returns from care without overlapping friends ${width}`, async ({page}, info) => {
  await ready(page,width);
  for (const garden of ['komorebi','mizukagami']) {
    await page.locator(`[data-garden-select="${garden}"]`).click();
    await expect(page.locator('.game-encounter-host')).toHaveAttribute('aria-busy','false');
    const lead=page.locator('.finch-garden-stage [data-garden-household]');
    await expect(lead).toBeVisible();
    await expect(lead).toContainText('おもち');
    await lead.locator('img').evaluate(image=>image.decode());
    await verifyTargets(page,width);
    await page.screenshot({path:info.outputPath(`protagonist-${garden}-${width}.png`)});
    await lead.click();
    await expect(page.locator('.game-bird-sheet')).toBeVisible();
    await expect(page.locator('#game-sheet-title')).toHaveText('おもち');
    await page.locator('[data-game-close-bird]').click();
    await expect(page.locator('.game-bird-sheet')).not.toBeVisible();
    await expect(page.locator(`.finch-garden-stage[data-garden-id="${garden}"]`)).toBeVisible();
    await expect(lead).toBeVisible();
  }
  await page.locator('[data-game-close-panel]').click();
  await expect(page.locator('.game-panel-overlay')).not.toBeVisible();
  await expect(page.locator('.game-room')).toBeVisible();
});

for (const width of [320,390]) for (const garden of ['komorebi','mizukagami']) test(`renamed protagonist and arriving guest coexist with unchanged save on inspection ${garden} ${width}`, async ({page},info) => {
  await ready(page,width);
  const seeded=await page.evaluate(async garden=>{
    const urls=performance.getEntriesByType('resource').map(e=>e.name), find=name=>urls.find(url=>url.includes('/src/'+name+'.js'));
    const engine=await import(find('engine')), {openGameStore}=await import(find('game-store')), {encounterSystem}=await import(find('encounters'));
    const guest=encounterSystem.catalog.find(e=>e.gardenEvent.gardenIds.includes(garden));
    if(!guest) throw new Error('No trial guest for '+garden);
    const store=await openGameStore();
    let birdId;
    try {
      await store.transact(world=>{
        world.paused=true;
        birdId=world.birds[0].id;
        engine.renameBird(world,birdId,'しろまる');
        world.encounters.garden.id=world.encounters.garden.guestGardenId=garden;
        world.encounters.queue=[guest.id]; world.encounters.active=null;
        engine.bumpRevision(world); return world;
      });
      return {birdId,guestId:guest.id};
    } finally { store.close(); }
  },garden);
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await page.locator('.game-scene-controls-toggle').click();await expect(page.locator('.game-scene-controls-toggle')).toHaveAttribute('aria-expanded','true');
  await page.locator('.game-field-nav [data-game-panel=outdoors]').click();
  await expect(page.locator('.game-encounter-host')).toHaveAttribute('aria-busy','false');
  const lead=page.locator('.finch-garden-stage [data-garden-household]');
  await expect(lead).toHaveAttribute('data-garden-household',seeded.birdId);
  await expect(lead).toContainText('しろまる');
  await expect(page.locator('.finch-garden-visitor')).toHaveAttribute('data-encounter-open',seeded.guestId);
  await page.locator('.finch-garden-stage img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  await verifyTargets(page,width);
  await page.screenshot({path:info.outputPath(`protagonist-guest-${garden}-${width}.png`)});
  const snapshot=()=>page.evaluate(async()=>{
    const {DB_NAME}=await import(performance.getEntriesByType('resource').find(e=>e.name.includes('/src/game-store.js')).name);
    const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    try { return await new Promise((resolve,reject)=>{const r=db.transaction('world').objectStore('world').get('current');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}); } finally { db.close(); }
  });
  const before=await snapshot();
  await lead.click();
  await expect(page.locator('#game-sheet-title')).toHaveText('しろまる');
  await page.locator('[data-game-close-bird]').click();
  await expect(lead).toBeVisible();
  expect(await snapshot()).toEqual(before);
  await page.locator('.finch-garden-visitor').click();
  await expect(page.locator('.finch-event')).toBeVisible();
});

for(const width of [320,390])test(`family attendance is optional and changes only on the next outing ${width}`,async({page})=>{
 await ready(page,width,false);await expect(page.locator('[data-garden-household]')).toHaveCount(0);
 await page.locator('[data-garden-details="companions"]>summary').click();
 await page.locator('[data-garden-accompany="true"]').click();await page.locator('[data-garden-companion="b1"]').click();await expect(page.locator('[data-garden-companion="b1"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-garden-companions-save]').click();await expect(page.locator('.finch-companion-feedback')).toContainText('覚えたよ');
 await expect(page.locator('[data-garden-household]')).toHaveCount(0);
 await page.locator('[data-garden-details="companions"]>summary').click();await page.locator('[data-game-close-panel]').click();await expect(page.locator('.game-panel-overlay')).not.toBeVisible();await page.locator('[data-game-panel=outdoors]').click();await expect(page.locator('[data-garden-household="b1"]')).toBeVisible();
 await page.locator('[data-garden-details="companions"]>summary').click();await page.locator('[data-garden-accompany="false"]').click();await page.locator('[data-garden-companions-save]').click();await expect(page.locator('.finch-companion-feedback')).toContainText('覚えたよ');
 await expect(page.locator('[data-garden-household="b1"]')).toBeVisible();
 await page.locator('[data-garden-details="companions"]>summary').click();await page.locator('[data-garden-select="mizukagami"]').click();await expect(page.locator('[data-garden-household="b1"]')).toBeVisible();
 await page.locator('[data-game-close-panel]').click();await expect(page.locator('.game-panel-overlay')).not.toBeVisible();await page.locator('[data-game-panel=outdoors]').click();await expect(page.locator('[data-garden-household]')).toHaveCount(0);
 await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await page.locator('.game-scene-controls-toggle').click();await page.locator('[data-game-panel=outdoors]').click();await expect(page.locator('[data-garden-household]')).toHaveCount(0);
});
