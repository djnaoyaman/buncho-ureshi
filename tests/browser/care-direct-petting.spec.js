import {test, expect} from '@playwright/test';
import {createWorld, createBird, petBird, validateWorld} from '../../src/engine.js';

const NOW = Date.UTC(2026, 10, 4, 12);
const PET = '#game-care-pet';
async function record(page, world) {
  return page.evaluate(world => new Promise((resolve, reject) => {
    const open = indexedDB.open('buncho-ureshi-garden-v1', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('world');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result, tx = db.transaction('world', world ? 'readwrite' : 'readonly');
      const req = world ? tx.objectStore('world').put(world, 'current') : tx.objectStore('world').get('current');
      tx.oncomplete = () => { db.close(); resolve(req.result); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  }), world);
}
async function ready(page) {
  await page.addInitScript(now => {
    Date.now = () => now;
    localStorage.setItem('buncho.music.v1', JSON.stringify({enabled:false}));
    localStorage.setItem('buncho.care-sound-choice.v1', JSON.stringify({explicit:true, enabled:false}));
  }, NOW);
  await page.route(/youtube|youtu\.be|googlevideo|ytimg/i, route => route.abort());
  await page.goto('');
  const world = createWorld(NOW, 1209);
  world.paused = true; world.settings.motion = false; world.settings.careSound = false;
  world.birds[0].needs.energy = 0;
  createBird(world, {home:'resident', name:'こめ'});
  await record(page, validateWorld(world));
  await page.goto('game/');
  await expect(page.locator('body')).toHaveAttribute('data-game-intro', 'done');
  await page.locator('.game-scene-controls-toggle').click();
  await open(page);
}
async function open(page) {
  await page.getByRole('button', {name:'ふれあう', exact:true}).click();
  await expect(page.locator('.game-bird-sheet')).toBeVisible();
  await expect(page.locator(PET)).toBeVisible();
}
function snapshot(world) {
  return {version:world.version, worldId:world.worldId, birds:world.birds.map(b => ({id:b.id, energy:b.needs.energy, food:b.needs.food, mood:b.mood, care:b.care})), gems:world.decor.points, gold:world.economy.gold, pets:world.events.filter(e => e.kind === 'user-pet')};
}
async function unchanged(page, before) {
  // Let queued mutations and native click synthesis finish before reading IndexedDB.
  await page.waitForTimeout(150);
  expect(snapshot(await record(page))).toEqual(snapshot(before));
}
async function onePet(page, before) {
  const expected = structuredClone(before);
  expect(petBird(expected, before.birds[0].id, NOW).changed).toBe(true);
  await expect.poll(async () => snapshot(await record(page))).toEqual(snapshot(expected));
  return await record(page);
}
async function point(page) {
  await page.locator(PET).evaluate(el => el.scrollIntoView({block:'center'}));
  const box = await page.locator(PET).boundingBox();
  expect(box.width).toBeGreaterThan(100);
  return {x:box.x + box.width / 2, y:box.y + box.height / 2};
}
async function mouseStroke(page, release = true) {
  const p = await point(page);
  await page.mouse.move(p.x - 30, p.y); await page.mouse.down();
  for (const dx of [0, 30, 0, -30, 30]) await page.mouse.move(p.x + dx, p.y, {steps:4});
  if (release) await page.mouse.up();
  return p;
}
async function pointer(page, type, p, extra = {}) {
  await page.locator(PET).dispatchEvent(type, {pointerId:7, pointerType:'touch', isPrimary:true, button:0, buttons:type === 'pointerup' ? 0 : 1, clientX:p.x, clientY:p.y, ...extra});
}

test('one enlarged upper bird at four sizes; native mouse rub saves exactly once', async ({page}, info) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await ready(page);
  const before = await record(page);
  for (const size of [{width:390,height:844}, {width:320,height:240}, {width:844,height:390}, {width:1440,height:900}]) {
    await page.setViewportSize(size);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const pet = page.locator(PET);
    await expect(page.locator('.game-bird-sheet img')).toHaveCount(1);
    await expect(page.locator('.game-sheet-heading #game-care-pet')).toHaveCount(1);
    await expect(page.locator('.game-bird-sheet .game-mini-bird')).toHaveCount(0);
    await expect(page.locator('.game-care-actions button')).toHaveCount(2);
    await expect(page.locator('.game-care-actions [data-game-care=pet]')).toHaveCount(0);
    await expect(pet).toHaveAttribute('data-care-rub', '');
    await expect(pet).toHaveAttribute('data-game-care', 'pet');
    await expect(pet).toHaveClass(/game-care-pet-bird/);
    await expect(pet.locator('.game-sprite img')).toBeVisible();
    await expect(pet.locator('.game-care-illustration')).toHaveAttribute('data-art-style','finch-illustration');
    await expect(pet.locator('img')).toHaveAttribute('src',/care-illustrations\/white-adult\.webp$/);
    await expect.poll(()=>pet.locator('img').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
    await expect(pet).toHaveAccessibleName(/なで/);
    const geometry = await pet.evaluate(el => {
      const r = el.getBoundingClientRect(), a = document.querySelector('.game-care-actions').getBoundingClientRect(), image=el.querySelector('img'), help=document.querySelector('#game-care-pet-help').getBoundingClientRect(), close=document.querySelector('#game-sheet-close').getBoundingClientRect();
      return {width:r.width, actionsWidth:a.width, above:r.bottom <= a.top + 1, height:r.height, fit:getComputedStyle(image).objectFit, clearClose:help.top>=close.bottom+4, overflow:document.documentElement.scrollWidth > innerWidth + 1};
    });
    expect(geometry.clearClose).toBe(true); expect(geometry.fit).toBe('contain'); expect(geometry.above).toBe(true); expect(geometry.height).toBeGreaterThanOrEqual(250); expect(geometry.overflow).toBe(false);
    expect(geometry.width).toBeGreaterThanOrEqual(geometry.actionsWidth * .85);
    await page.locator('.game-bird-sheet').evaluate(el=>el.scrollTop=0);
    await info.attach(`single-care-top-${size.width}x${size.height}`, {body:await page.screenshot(), contentType:'image/png'});
    await pet.evaluate(el => el.scrollIntoView({block:'center'}));
    await info.attach(`petting-${size.width}x${size.height}`, {body:await page.screenshot(), contentType:'image/png'});
  }
  if (info.project.use.hasTouch) await page.locator(PET).tap();
  else await page.locator(PET).click();
  await unchanged(page, before);
  const title = await page.locator('#game-sheet-title').textContent();
  await mouseStroke(page, false);
  await unchanged(page, before);
  await expect(page.locator('#game-sheet-title')).toHaveText(title);
  await page.mouse.up();
  let after = await onePet(page, before);
  await mouseStroke(page, false);
  await page.waitForTimeout(950);
  await expect(page.locator(PET)).toHaveAttribute('data-rubbing', 'ready');
  await page.mouse.up(); after = await onePet(page, after);
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-game-intro', 'done');
  expect(snapshot(await record(page))).toEqual(snapshot(after));
});

test('keyboard Enter and Space work once each, ignore repeat, and do not wait for bird image', async ({page}) => {
  await page.setViewportSize({width:390,height:844}); await ready(page);
  let releaseImage;
  const imageGate = new Promise(resolve => { releaseImage = resolve; });
  await page.route('**/*care-image-delayed*', async route => { await imageGate; await route.abort(); });
  try {
    const requested = page.waitForRequest('**/*care-image-delayed*');
    await page.locator('.game-care-pet-bird').evaluate(el => {
      const img = el.matches('img') ? el : el.querySelector('img');
      if (!img) throw new Error('Pet bird must include an image');
      img.src = new URL('care-image-delayed.png', location.href).href;
    });
    await requested;
    await expect(page.locator('#game-care-feed')).toBeEnabled();
    await expect(page.locator('#game-talk-call')).toBeEnabled();
    let before = await record(page);
    await page.locator(PET).focus();
    await page.locator(PET).dispatchEvent('keydown', {key:'Enter', code:'Enter', repeat:true});
    await unchanged(page, before);
    await page.keyboard.press('Enter'); before = await onePet(page, before);
    await page.locator(PET).focus(); await page.keyboard.press('Space');
    await onePet(page, before);
  } finally { releaseImage(); }
});

test('cancel, leaving target, second pointer, close, switch and navigation never reward abandoned rubs', async ({page}) => {
  await page.setViewportSize({width:390,height:844}); await ready(page);
  const before = await record(page);
  for (const cause of ['cancel', 'second-pointer', 'close', 'switch', 'navigation']) {
    const p = await point(page);
    await pointer(page, 'pointerdown', {...p, x:p.x - 30});
    await pointer(page, 'pointermove', {...p, x:p.x + 30});
    await expect(page.locator(PET)).toHaveAttribute('data-rubbing', 'ready');
    if (cause === 'cancel') await pointer(page, 'pointercancel', p);
    if (cause === 'second-pointer') await pointer(page, 'pointerdown', p, {pointerId:8, isPrimary:false});
    if (cause === 'close') await page.keyboard.press('Escape');
    if (cause === 'switch') await page.locator('.game-bird-sheet [data-bird-step="1"]').evaluate(el => el.click());
    if (cause === 'navigation') await page.goto('');
    await page.evaluate(p => document.dispatchEvent(new PointerEvent('pointerup', {bubbles:true, pointerId:7, pointerType:'touch', isPrimary:true, clientX:p.x, clientY:p.y})), p);
    if (cause === 'second-pointer') await pointer(page, 'pointerup', p, {pointerId:8, isPrimary:false});
    await unchanged(page, before);
    if (cause === 'navigation') break;
    if (cause === 'close') await open(page);
  }
  await page.goto('game/'); await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
  await page.locator('.game-scene-controls-toggle').click(); await open(page);
  await mouseStroke(page, false);
  await page.mouse.move(1, 1); await page.mouse.up();
  await unchanged(page, before);
});

test('native Chromium touch sequence rewards once and real multitouch cancels', async ({page, context, browserName}, info) => {
  test.skip(browserName !== 'chromium' || !info.project.use.hasTouch, 'Native CDP touch requires a Chromium touch project');
  await page.setViewportSize({width:390,height:844}); await ready(page);
  const session = await context.newCDPSession(page);
  const touch = (type, points) => session.send('Input.dispatchTouchEvent', {type, touchPoints:points.map(p => ({...p, radiusX:2, radiusY:2, force:1}))});
  let before = await record(page), p = await point(page);
  await touch('touchStart', [{...p, x:p.x-30, id:1}]);
  for (const dx of [0, 30, -30, 30]) await touch('touchMove', [{...p, x:p.x+dx, id:1}]);
  await unchanged(page, before);
  await touch('touchEnd', []); before = await onePet(page, before);
  p = await point(page);
  await touch('touchStart', [{...p, x:p.x-30, id:1}]);
  await touch('touchMove', [{...p, x:p.x+30, id:1}]);
  await touch('touchStart', [{...p, x:p.x+30, id:1}, {...p, x:p.x-20, id:2}]);
  await touch('touchEnd', []);
  await unchanged(page, before);
  await session.detach();
});
