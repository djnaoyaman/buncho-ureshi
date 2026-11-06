import { test, expect } from '@playwright/test';
// Live game nodes are replaced on normal heartbeat renders. Measure the next attached node.
async function measuredBox(locator){let box;await expect.poll(async()=>{box=await locator.boundingBox();return !!box;}).toBe(true);return box;}
async function ready(page, openControls = true) {
  await page.addInitScript(() => {
    localStorage.setItem('buncho.music.v1', JSON.stringify({enabled:false}));
    localStorage.setItem('buncho.care-sound-choice.v1', JSON.stringify({explicit:true,enabled:false}));
  });
  await page.goto('game/');
  await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
  if (openControls) {
    await page.locator('.game-scene-controls-toggle').click();
    await expect(page.locator('.game-scene-controls-toggle')).toHaveAttribute('aria-expanded', 'true');
  }
}
async function noScroll(page) {
  expect(await page.evaluate(() => ({x:scrollX,y:scrollY,
    dx:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth,
    dy:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight)-innerHeight
  }))).toEqual({x:0,y:0,dx:0,dy:0});
}
async function cover(page,image) {
  await expect(image).toBeVisible(); await image.evaluate(i=>i.decode());
  let r;const v=page.viewportSize();await expect.poll(async()=>{r=await image.boundingBox();return !!r;}).toBe(true);
  expect(r.x).toBeLessThanOrEqual(1); expect(r.y).toBeLessThanOrEqual(1);
  expect(r.x+r.width).toBeGreaterThanOrEqual(v.width-1);
  expect(r.y+r.height).toBeGreaterThanOrEqual(v.height-1);
}
async function reachable(page,bird,top,bottom,birdSelector) {
  await expect(bird).toBeVisible();
  let r,t,b;
  // Each locator can resolve during a routine render; retry the measurement, never a failed assertion.
  await expect.poll(async()=>{[r,t,b]=await Promise.all([bird.boundingBox(),top.boundingBox(),bottom.boundingBox()]);return !!(r&&t&&b);}).toBe(true);
  expect(r.width).toBeGreaterThanOrEqual(44); expect(r.height).toBeGreaterThanOrEqual(44);
  expect(r.x).toBeGreaterThanOrEqual(0); expect(r.x+r.width).toBeLessThanOrEqual(page.viewportSize().width);
  expect(r.y).toBeGreaterThanOrEqual(t.y+t.height); expect(r.y+r.height).toBeLessThanOrEqual(b.y);
  // Resolve and measure in one browser task so a heartbeat cannot detach the target between them.
  expect(await page.evaluate(selector=>{const el=document.querySelector(selector);if(!el)return false;const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));},birdSelector)).toBe(true);
  await bird.click({trial:true});
}
for(const [width,height] of [[320,568],[390,844],[844,390]]) {
  test(`full-stage house and twelve gardens ${width}x${height}`,async({page},testInfo)=>{
    test.setTimeout(90000); await page.setViewportSize({width,height}); await ready(page);
    for (let i = 0; i < 2; i++) {
      const opener = page.locator('.game-bottom-dock [data-game-open-menu]');
      await opener.click();
      const close = page.locator('[data-game-close-menu]');
      await expect(close).toHaveText('とじる');
      await expect(close).toHaveAccessibleName('メニューをとじる');
      await close.click({ trial: true });
      expect(await close.evaluate(el => {
        const box = el.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(el);
        const text = range.getBoundingClientRect();
        return box.width >= 44 && box.height >= 44 && box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight && el.scrollWidth <= el.clientWidth && text.left >= box.left && text.right <= box.right && text.top >= box.top && text.bottom <= box.bottom;
      })).toBe(true);
      if (i === 0) await page.screenshot({ path: testInfo.outputPath(`menu-close-${width}x${height}.png`) });
      await close.click();
      await expect(page.locator('.game-secondary-menu')).not.toHaveAttribute('open', '');
      await expect(opener).toBeFocused();
    }
    const links = page.locator('.game-field-nav');
    await expect(links.locator('button')).toHaveText(['おうち', 'おにわ', '友だち']);
    for (const name of ['おうちへ', 'おにわへ遊びに行く', '友だちのおうちへ']) {
      const link = links.getByRole('button', { name, exact: true });
      await expect(link).toBeVisible();
      await link.click({ trial: true });
      // Resolve and measure in one browser turn: normal game renders replace these nodes.
      await expect.poll(() => page.evaluate(label => {
        const el = [...document.querySelectorAll('.game-field-nav button')].find(button => button.getAttribute('aria-label') === label);
        if (!el) return { connected: false };
        const r = el.getBoundingClientRect();
        return { connected: el.isConnected, widthAtLeast44: r.width >= 44, heightAtLeast44: r.height >= 44, leftInside: r.left >= 0, rightInside: r.right <= innerWidth, textFits: el.scrollWidth <= el.clientWidth };
      }, name), { message: `Attached top link keeps its touch target and text bounds: ${name}` }).toEqual({ connected: true, widthAtLeast44: true, heightAtLeast44: true, leftInside: true, rightInside: true, textFits: true });
    }
    await links.getByRole('button', { name: '友だちのおうちへ', exact: true }).click();
    await expect(page.locator('.game-friends')).toBeVisible();
    await expect(page.locator('[data-game-close-panel]')).toHaveText('とじる');
    await page.locator('[data-game-close-panel]').click();
    await expect(page.locator('.game-panel-overlay')).not.toBeVisible();
    await expect(links.locator('button')).toHaveText(['おうち', 'おにわ', '友だち']);
    await page.locator('.game-status [data-game-action=pause]').click();
    const bird=page.locator('.game-room-bird.is-selected'),habitat=page.locator('.game-main .game-habitat img');
    await cover(page,habitat);
    expect((await measuredBox(page.locator('.game-scene-toolbar .game-bird-carousel'))).height).toBeLessThanOrEqual(60);
    expect(await page.locator('#game-open-bird').evaluate(el=>getComputedStyle(el).borderTopLeftRadius)).not.toBe('6px');
    await reachable(page,bird,page.locator('.game-field-nav'),page.locator('.game-bottom-dock'),'.game-room-bird.is-selected');
    await noScroll(page); await page.screenshot({path:testInfo.outputPath(`house-${width}x${height}.png`)});
    await bird.click(); await expect(page.locator('.game-bird-sheet')).toBeVisible();
    await expect(page.locator('[data-game-close-bird]')).toHaveText('とじる');
    await expect(page.locator('[data-game-close-bird]')).toHaveAccessibleName('文鳥の操作をとじる');
    await page.locator('[data-game-close-bird]').click(); await noScroll(page);
    await page.locator('.game-field-nav [data-game-panel=outdoors]').click();
    await expect(page.locator('.game-panel-overlay')).toHaveAttribute('data-scene','true');
    await expect(page.locator('[data-game-close-panel]')).toHaveText('おうちへ');
    const selector=page.locator('.finch-garden-selector');
    await expect(selector.locator('[data-garden-select]')).toHaveCount(12);
    const ids=await selector.locator('[data-garden-select]').evaluateAll(es=>es.map(e=>e.dataset.gardenSelect));
    for(const id of ids){
      await selector.locator(`[data-garden-select="${id}"]`).click();
      await expect(selector.locator(`[data-garden-select="${id}"]`)).toHaveAttribute('aria-current','page');
      const selectedBackground = await selector.locator(`[data-garden-select="${id}"]`).evaluate(el => getComputedStyle(el).background);
      const neighborBackground = await selector.locator('[data-garden-select]:not([aria-current=page])').first().evaluate(el => getComputedStyle(el).background);
      expect(selectedBackground).not.toBe(neighborBackground);
      await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-garden-id',id);
      await cover(page,page.locator('.finch-garden-slide').first().locator('.finch-garden-background'));
      await noScroll(page);
    }
    await reachable(page,page.locator('.finch-garden-slide').first().locator('.finch-garden-friend').first(),selector,page.locator('.finch-garden-dock'),'.finch-garden-slide .finch-garden-friend');
    await page.screenshot({path:testInfo.outputPath(`garden-${width}x${height}.png`)});
    await page.locator('[data-game-close-panel]').click();
    await expect(page.locator('.game-panel-overlay')).not.toBeVisible();
    await expect(page.locator('.game-app')).toHaveAttribute('data-panel','garden');
    await cover(page,habitat); await noScroll(page);
    // Re-entry catches stale nonmodal controllers or focus traps.
    await page.locator('.game-field-nav [data-game-panel=outdoors]').click();
    await expect(page.locator('.finch-garden-stage')).toBeVisible();
    await page.locator('[data-game-close-panel]').click();
    await expect(bird).toBeVisible(); await noScroll(page);
  });
}

for (const [width, height] of [[320, 568], [390, 844], [844, 390]]) {
  test(`compact encyclopedia exit stays clear of wallet ${width}x${height}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await ready(page);
    const exit = page.locator('.game-world-exit');
    const wallet = page.locator('.game-field-bar .game-wallet');
    await expect(exit).toBeVisible();
    await expect(exit).toHaveText('文鳥図鑑');
    await expect(exit).toHaveAttribute('aria-label', '文鳥図鑑へ戻る');
    await expect(exit).toHaveAccessibleName('文鳥図鑑へ戻る');
    await expect(exit).toHaveAttribute('href', /\/encyclopedia\/$/);
    await expect(wallet).toBeVisible();

    async function checkGeometry() {
      const geometry = await exit.evaluate(el => {
        const rect = el.getBoundingClientRect();
        const walletRect = document.querySelector('.game-field-bar .game-wallet').getBoundingClientRect();
        const style = getComputedStyle(el);
        const range = document.createRange();
        range.selectNodeContents(el);
        const textRects = [...range.getClientRects()];
        return {
          x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom,
          width: rect.width, height: rect.height,
          lineCount: new Set(textRects.map(r => Math.round(r.top))).size,
          textFits: textRects.every(r => r.left >= rect.left + parseFloat(style.borderLeftWidth)
            && r.right <= rect.right - parseFloat(style.borderRightWidth)
            && r.top >= rect.top && r.bottom <= rect.bottom),
          overlapsWallet: rect.left < walletRect.right && rect.right > walletRect.left
            && rect.top < walletRect.bottom && rect.bottom > walletRect.top,
          receivesPointer: el.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)),
        };
      });
      expect(geometry.width).toBeGreaterThanOrEqual(44);
      expect(geometry.height).toBeGreaterThanOrEqual(44);
      expect(geometry.x).toBeGreaterThanOrEqual(0);
      expect(geometry.y).toBeGreaterThanOrEqual(0);
      expect(geometry.right).toBeLessThanOrEqual(width);
      expect(geometry.bottom).toBeLessThanOrEqual(height);
      expect(geometry.lineCount).toBe(1);
      expect(geometry.textFits).toBe(true);
      expect(geometry.overlapsWallet).toBe(false);
      expect(geometry.receivesPointer).toBe(true);
      await exit.click({ trial: true });
    }

    await checkGeometry();
    // Root text sizing exercises rem-based neighbors. The exit uses px, so also
    // double its actual font size explicitly to test 200% text-only enlargement.
    const normalFontSize = await exit.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await exit.evaluate((el, size) => el.style.setProperty('font-size', `${size * 2}px`, 'important'), normalFontSize);
    await checkGeometry();
    await page.evaluate(() => { document.documentElement.style.removeProperty('font-size'); });
    await exit.evaluate(el => el.style.removeProperty('font-size'));
    await checkGeometry();
    if (width <= 390) {
      await page.screenshot({ path: testInfo.outputPath(`compact-exit-${width}x${height}.png`) });
    }
  });
}

for (const [width, height] of [[320, 568], [390, 844]]) {
  test(`scenery stays clear with reachable controls and birds ${width}x${height}`, async ({page}, info) => {
    await page.setViewportSize({width, height});
    await page.emulateMedia({reducedMotion: 'reduce'});
    await ready(page, false);
    const toggle = page.locator('.game-scene-controls-toggle');
    const chrome = ['.game-field-nav', '.game-field-bar', '.game-heading', '.game-scene-toolbar', '.game-bottom-dock', '.game-secondary-menu'];
    async function closed() {
      await expect(page.locator('body')).toHaveAttribute('data-scene-controls', 'closed');
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(toggle).toHaveText('Touch the Birds');
      for (const selector of chrome) await expect(page.locator(selector)).toBeHidden();
    }
    async function target(element, selector, index=0) {
      await expect(element).toBeVisible();
      const r = await measuredBox(element);
      expect(r.width).toBeGreaterThanOrEqual(44);
      expect(r.height).toBeGreaterThanOrEqual(44);
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width).toBeLessThanOrEqual(width);
      expect(r.y + r.height).toBeLessThanOrEqual(height);
      // Resolve the connected node and hit-test in one synchronous browser task.
      // A heartbeat can replace a locator's ElementHandle before evaluate runs.
      expect(await page.evaluate(({selector,index}) => {
        const el = document.querySelectorAll(selector)[index];
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      }, {selector,index})).toBe(true);
      await element.click({trial: true});
    }
    await expect(toggle).toHaveCount(1);
    await closed();
    await target(toggle, '.game-scene-controls-toggle');
    await target(page.locator('.game-world-exit'), '.game-world-exit');
    await cover(page, page.locator('.game-main .game-habitat img'));
    await noScroll(page);
    await page.screenshot({path: info.outputPath(`scenery-home-closed-${width}.png`)});
    // Native keyboard activation must retain focus on the stable toggle.
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(toggle).toHaveText('Watch the Birds');
    await expect(page.locator('body')).toHaveAttribute('data-scene-controls', 'open');
    await expect(page.locator('.game-field-nav')).toBeVisible();
    await expect(page.locator('.game-bottom-dock')).toBeVisible();
    await page.keyboard.press('Space');
    await closed();
    await expect(toggle).toBeFocused();
    const bird = page.locator('.game-room-bird.is-selected');
    await target(bird, '.game-room-bird.is-selected');
    await bird.click();
    await expect(page.locator('.game-bird-sheet')).toBeVisible();
    await page.locator('[data-game-care=feed]').click();
    await expect(page.locator('[data-game-fullness]')).toHaveText('100 / 100');
    await page.locator('[data-game-close-bird]').click();
    await expect(page.locator('.game-bird-sheet')).toBeHidden();
    await closed();
    await expect(bird).toBeFocused();
    await toggle.click();
    await page.locator('.game-field-nav [data-game-panel=outdoors]').click();
    await expect(page.locator('.game-encounter-host')).toHaveAttribute('aria-busy', 'false');
    // This case tests care-sheet focus for an explicitly chosen companion.
    await page.locator('[data-garden-details=companions]>summary').click();
    await page.locator('[data-garden-companion=b1]').click();await expect(page.locator('[data-garden-companion=b1]')).toHaveAttribute('aria-pressed','true');
    await page.locator('[data-garden-accompany]').click();await expect(page.locator('[data-garden-accompany]')).toHaveAttribute('aria-pressed','true');
    await page.locator('[data-garden-details=companions]>summary').click();
    await page.locator('[data-game-close-panel]').click();await expect(page.locator('.game-panel-overlay')).not.toBeVisible();
    await page.locator('.game-field-nav [data-game-panel=outdoors]').click();await expect(page.locator('.finch-garden-household')).toBeVisible();
    await toggle.click();
    await closed();
    for (const selector of ['.finch-garden > header', '.finch-garden-selector', '.finch-garden-dock']) {
      await expect(page.locator(selector)).toBeHidden();
    }
    const gardenBirds = page.locator('.finch-garden-image-plane > button');
    await expect(gardenBirds).toHaveCount(5);
    await page.locator('.finch-garden-stage img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    for (let i = 0; i < await gardenBirds.count(); i++) await target(gardenBirds.nth(i), '.finch-garden-image-plane > button', i);
    await target(toggle, '.game-scene-controls-toggle');
    await target(page.locator('[data-game-close-panel]'), '[data-game-close-panel]');
    await noScroll(page);
    await page.screenshot({path: info.outputPath(`scenery-garden-closed-${width}.png`)});
    await page.locator('.finch-garden-household').click();
    await expect(page.locator('.game-bird-sheet')).toBeVisible();
    await page.locator('[data-game-close-bird]').click();
    await closed();
    await expect(page.locator('.finch-garden-household')).toBeFocused();
    await toggle.click();
    await expect(page.locator('.finch-garden-selector')).toBeVisible();
    await page.locator('[data-garden-select=mizukagami]').click();
    await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-garden-id', 'mizukagami');
    await toggle.click();
    await page.locator('[data-game-close-panel]').click();
    await expect(page.locator('.game-panel-overlay')).toBeHidden();
    await closed();
    await target(bird, '.game-room-bird.is-selected');
    await toggle.click();
    await page.locator('.game-field-nav [data-game-panel=outdoors]').click();
    await expect(page.locator('.finch-garden-stage')).toBeVisible();
    await page.locator('[data-game-close-panel]').click();
    await page.locator('.game-world-exit').click();
    await expect(page).toHaveURL(/\/encyclopedia\/$/);
    await expect(toggle).toBeHidden();
    await expect(page.locator('.game-scene-controls-toggle:visible')).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveAttribute('data-scene-controls', /.+/);
    await expect(page.locator('body')).not.toHaveAttribute('data-world', 'buncho');
    await expect(page.locator('.site-header')).toBeVisible();
    expect(await page.locator('body').evaluate(el => getComputedStyle(el).overflowY)).not.toBe('hidden');
    await page.goBack();
    await expect(page).toHaveURL(/\/game\/$/);
    await expect(page.locator('body')).toHaveAttribute('data-game-intro', 'done');
    await expect(toggle).toHaveCount(1);
    await closed();
    await target(toggle, '.game-scene-controls-toggle');
  });
}

for (const [width, height] of [[320, 568], [390, 844]]) {
  test(`designed menu fits ten cards and restores keyboard focus ${width}`, async ({page}, info) => {
    await page.setViewportSize({width, height});
    await ready(page);
    const opener = page.locator('#game-nav-open');
    const menu = page.locator('.game-secondary-menu');
    await opener.click();
    await expect(menu).toBeVisible();
    const cards = menu.locator('.game-tabs button');
    await expect(cards).toHaveCount(10);
    expect(await menu.evaluate(el => el.contains(document.activeElement))).toBe(true);
    const ids = ['health', 'memorial', 'profile', 'relations', 'family', 'diary', 'roster', 'notebook', 'settings', 'help'];
    await expect(menu.locator('#game-menu-owner')).toHaveCount(0);
    await expect(menu.locator('#game-menu-settings')).toHaveText('保存・設定');
    for (const id of ids) {
      const card = menu.locator(`#game-menu-${id}`);
      await expect(card).toBeVisible();
      await expect(card.locator('svg')).toHaveCount(1);
      await card.click({trial: true});
    }
    // World polling can replace this disclosure between the query and the
    // geometry task. Re-resolve the live cards; retain every layout threshold.
    await expect(async () => {
      await expect(cards).toHaveCount(10);
      const bounds = await cards.evaluateAll(elements => elements.map(el => {
        const r = el.getBoundingClientRect();
        return {x:r.x,y:r.y,w:r.width,h:r.height};
      }));
      expect(new Set(bounds.map(r => Math.round(r.x))).size).toBe(2);
      for (const r of bounds) {
        expect(r.w).toBeGreaterThanOrEqual(44);
        expect(r.h).toBeGreaterThanOrEqual(44);
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w).toBeLessThanOrEqual(width);
        expect(r.y + r.h).toBeLessThanOrEqual(height);
      }
    }).toPass({timeout:10000,intervals:[100,250,500]});
    expect(await menu.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    const close = menu.locator('[data-game-close-menu]');
    const closeBounds = await measuredBox(close);
    expect(closeBounds.width).toBeGreaterThanOrEqual(44);
    expect(closeBounds.height).toBeGreaterThanOrEqual(44);
    await noScroll(page);
    await page.screenshot({path: info.outputPath(`designed-menu-${width}.png`)});
    await close.focus();
    await page.keyboard.press('Enter');
    await expect(menu).toBeHidden();
    await expect(opener).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test(`centered welcome dismisses without resetting the saved world ${width}`, async ({page}, info) => {
    await page.setViewportSize({width, height});
    // Each Playwright page has an isolated fresh context. Freeze wall time only,
    // so the paused save can be compared without heartbeat time changes.
    await page.addInitScript(() => { Date.now = () => 1793683200000; });
    await ready(page, false);
    const seeded = await page.evaluate(async () => {
      const urls = performance.getEntriesByType('resource').map(entry => entry.name);
      const find = name => urls.find(url => url.includes('/src/' + name + '.js'));
      const engine = await import(find('engine'));
      const {openGameStore} = await import(find('game-store'));
      const store = await openGameStore();
      try {
        const world = await store.transact(world => {
          world.paused = true;
          engine.renameBird(world, world.birds[0].id, 'しろまる');
          // The save schema requires integer skipped and both tick endpoints.
          world.offlineSummary = {ticks:0, newBirds:0, skipped:0, fromTick:world.tick, toTick:world.tick};
          engine.bumpRevision(world);
          return world;
        });
        return {worldId:world.worldId, birds:world.birds, decor:world.decor, economy:world.economy, tick:world.tick};
      } finally { store.close(); }
    });
    await page.reload();
    await expect(page.locator('body')).toHaveAttribute('data-game-intro', 'done');
    const welcome = page.locator('.game-welcome');
    const close = page.locator('#game-welcome-close');
    await expect(close).toHaveText('とじる');
    await expect(close).toHaveAccessibleName('おかえりメッセージをとじる');
    await expect(welcome).toBeVisible();
    await expect(welcome).toHaveAttribute('role', 'dialog');
    await expect(welcome).toHaveAttribute('aria-modal', 'false');
    await expect(welcome).not.toContainText('0日');
    await expect(close).toBeFocused();
    await expect(page.locator('body')).toHaveAttribute('data-scene-controls', 'closed');
    const rect = await measuredBox(welcome);
    expect(Math.abs(rect.x + rect.width / 2 - width / 2)).toBeLessThanOrEqual(2);
    expect(Math.abs(rect.y + rect.height / 2 - height / 2)).toBeLessThanOrEqual(2);
    expect(rect.width).toBeGreaterThan(rect.height);
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(width);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.y + rect.height).toBeLessThanOrEqual(height);
    const closeRect = await measuredBox(close);
    expect(closeRect.width).toBeGreaterThanOrEqual(44);
    expect(closeRect.height).toBeGreaterThanOrEqual(44);
    await close.click({trial:true});
    await noScroll(page);
    await page.screenshot({path: info.outputPath(`welcome-centered-${width}.png`)});
    // A pending greeting belongs to home, not above the outdoor scene.
    await page.locator('.game-scene-controls-toggle').click();
    await page.locator('.game-field-nav [data-game-panel=outdoors]').click();
    await expect(page.locator('.game-encounter-host')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('.finch-garden-stage')).toBeVisible();
    await expect(welcome).toBeHidden();
    await page.locator('[data-game-close-panel]').click();
    await expect(page.locator('.game-panel-overlay')).toBeHidden();
    await expect(welcome).toBeVisible();
    await close.focus();
    await expect(close).toBeFocused();
    if (width === 320) await page.keyboard.press('Escape');
    else await close.click();
    await expect(welcome).toBeHidden();
    await expect(page.locator('.game-room-bird.is-selected')).toBeFocused();
    const saved = await page.evaluate(async () => {
      const url = performance.getEntriesByType('resource').find(entry => entry.name.includes('/src/game-store.js')).name;
      const {DB_NAME} = await import(url);
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        return await new Promise((resolve, reject) => {
          const request = db.transaction('world').objectStore('world').get('current');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      } finally { db.close(); }
    });
    expect(saved.offlineSummary).toBeNull();
    expect(saved.paused).toBe(true);
    expect({worldId:saved.worldId, birds:saved.birds, decor:saved.decor, economy:saved.economy, tick:saved.tick}).toEqual(seeded);
    await page.reload();
    await expect(page.locator('body')).toHaveAttribute('data-game-intro', 'done');
    await expect(welcome).toBeHidden();
    await expect(page.locator('.game-room-bird')).toHaveCount(seeded.birds.length);
  });
}

for (const [width, height] of [[320, 568], [390, 844], [844, 390]]) {
  test(`scene caption remains readable outside the terrain ${width}x${height}`, async ({page}, info) => {
    await page.setViewportSize({width, height});
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.addInitScript(() => { Date.now = () => 1793683200000; });
    await ready(page, false);
    const caption = page.locator('.game-scene-caption');
    const toggle = page.locator('.game-scene-controls-toggle');
    const initialBird = {
      id: await page.locator('.game-room-bird.is-selected').getAttribute('data-bird-id'),
      name: await caption.locator('strong').innerText(),
      action: await caption.locator(':scope > span').first().innerText(),
    };
    await expect(page.locator('.game-room-bird')).toHaveCount(1);
    await readable(initialBird, 'closed');
    await toggle.click();
    await readable(initialBird, 'open');
    if (width <= 390) await page.screenshot({path:info.outputPath(`caption-one-bird-open-${width}.png`)});
    await toggle.click();
    const fixture = await page.evaluate(async () => {
      const urls = performance.getEntriesByType('resource').map(entry => entry.name);
      const find = name => urls.find(url => url.includes('/src/' + name + '.js'));
      const engine = await import(find('engine'));
      const {openGameStore} = await import(find('game-store'));
      const store = await openGameStore();
      try {
        const world = await store.transact(world => {
          world.paused = true;
          world.offlineSummary = null;
          engine.renameBird(world, world.birds[0].id, 'あいうえおかきくけこさしすせそた');
          engine.createBird(world, {name:'しろまる', home:'resident', color:'white'});
          engine.bumpRevision(world);
          return world;
        });
        return world.birds.map(bird => ({id:bird.id, name:bird.name, action:engine.ACTIONS[bird.action.kind]}));
      } finally { store.close(); }
    });
    expect([...fixture[0].name]).toHaveLength(16);
    await page.reload();
    await expect(page.locator('body')).toHaveAttribute('data-game-intro', 'done');
    async function readable(expectedBird, state) {
      await expect(page.locator('body')).toHaveAttribute('data-scene-controls', state);
      await expect(caption).toHaveCount(1);
      await expect(page.locator('.game-main > .game-scene-caption')).toBeVisible();
      await expect(page.locator('.game-room .game-scene-caption')).toHaveCount(0);
      await expect(caption.locator('strong')).toHaveText(expectedBird.name);
      await expect(caption.locator(':scope > span').first()).toHaveText(expectedBird.action);
      await expect(page.locator('.game-room-bird.is-selected')).toHaveAttribute('data-bird-id', expectedBird.id);
      const geometry = await caption.evaluate(el => {
        const r = el.getBoundingClientRect();
        const neighbors = ['.game-bottom-dock', '.game-field-nav', '.game-field-bar .game-wallet', '.game-room-bird', '.game-scene-toolbar', '.game-scene-controls-toggle'];
        const overlaps = neighbors.filter(selector => {
          return [...document.querySelectorAll(selector)].some(other => {
            if (!other.getClientRects().length || getComputedStyle(other).visibility === 'hidden') return false;
            const b = other.getBoundingClientRect();
            return Math.min(r.right,b.right) > Math.max(r.left,b.left) && Math.min(r.bottom,b.bottom) > Math.max(r.top,b.top);
          });
        });
        const text = [...el.querySelectorAll('strong,span')].map(node => {
          const box = node.getBoundingClientRect(), range = document.createRange();
          range.selectNodeContents(node);
          return {
            overflow: getComputedStyle(node).textOverflow,
            fits: [...range.getClientRects()].every(t => t.left >= box.left - 1 && t.right <= box.right + 1
              && t.top >= box.top - 1 && t.bottom <= box.bottom + 1
              && t.left >= r.left && t.right <= r.right && t.top >= r.top && t.bottom <= r.bottom),
          };
        });
        return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,overlaps,text};
      });
      expect(geometry.x).toBeGreaterThanOrEqual(0);
      expect(geometry.y).toBeGreaterThanOrEqual(0);
      expect(geometry.right).toBeLessThanOrEqual(width);
      expect(geometry.bottom).toBeLessThanOrEqual(height);
      expect(geometry.overlaps).toEqual([]);
      for (const text of geometry.text) {
        expect(text.overflow).not.toBe('ellipsis');
        expect(text.fits).toBe(true);
      }
      await noScroll(page);
    }
    await readable(fixture[0], 'closed');
    if (width <= 390) await page.screenshot({path:info.outputPath(`caption-long-name-closed-${width}.png`)});
    await toggle.click();
    await readable(fixture[0], 'open');
    if (width <= 390) await page.screenshot({path:info.outputPath(`caption-long-name-open-${width}.png`)});
    await page.locator('.game-scene-toolbar [data-bird-step="1"]').click();
    await readable(fixture[1], 'open');
    await toggle.click();
    await readable(fixture[1], 'closed');
    await toggle.click();
    await page.locator('.game-scene-toolbar [data-bird-step="-1"]').click();
    await readable(fixture[0], 'open');
    // Fill both adult perch rows so placement cannot pass by avoiding only the selected bird.
    await page.evaluate(async () => {
      const urls = performance.getEntriesByType('resource').map(entry => entry.name);
      const find = name => urls.find(url => url.includes('/src/' + name + '.js'));
      const engine = await import(find('engine'));
      const {openGameStore} = await import(find('game-store'));
      const store = await openGameStore();
      try {
        await store.transact(world => {
          while (world.birds.length < 8) engine.createBird(world, {name:`なかま${world.birds.length}`, home:'resident', color:'white', stage:'adult'});
          engine.bumpRevision(world);
          return world;
        });
      } finally { store.close(); }
    });
    await page.reload();
    await expect(page.locator('body')).toHaveAttribute('data-game-intro', 'done');
    // Short landscape deliberately shows one selected bird, with all eight still switchable.
    await expect(page.locator('.game-room-bird')).toHaveCount(height <= 500 ? 1 : 8);
    await readable(fixture[0], 'closed');
    if (width <= 390) await page.screenshot({path:info.outputPath(`caption-eight-birds-closed-${width}.png`)});
    await toggle.click();
    await readable(fixture[0], 'open');
    if (width <= 390) await page.screenshot({path:info.outputPath(`caption-eight-birds-open-${width}.png`)});

  });
}

test('draw result is centered and care opens full screen on a compact viewport',async({page},testInfo)=>{
 await page.setViewportSize({width:390,height:600});await ready(page);
 await page.locator('.game-status [data-game-action=pause]').click();
 await page.locator('.game-bottom-dock [data-game-panel=decorate]').click();
 await page.locator('[data-decor-draw]').click();
 const result=page.locator('.game-draw-result');await expect(result).toBeVisible();
 const box=await measuredBox(result);expect(Math.abs(box.x+box.width/2-195)).toBeLessThan(2);expect(Math.abs(box.y+box.height/2-300)).toBeLessThan(2);expect(box.height).toBeLessThan(600);
 await expect(result.locator('button')).toBeFocused();await page.screenshot({path:testInfo.outputPath('draw-result-centered.png')});
 await page.keyboard.press('Escape');await expect(result).toHaveCount(0);await expect(page.locator('[data-decor-slot][aria-pressed=true]')).toBeFocused();
 await page.locator('[data-game-close-panel]').click();await page.locator('#game-open-bird').click();
 const sheet=page.locator('.game-bird-sheet');await expect(sheet).toBeVisible();const birdBox=await measuredBox(sheet);expect(birdBox.x).toBeCloseTo(0,0);expect(birdBox.y).toBeCloseTo(0,0);expect(birdBox.width).toBeCloseTo(390,0);expect(birdBox.height).toBeCloseTo(600,0);
 await expect(page.locator('#game-sheet-close')).toBeInViewport();await page.screenshot({path:testInfo.outputPath('care-full-screen.png')});
 await page.locator('.game-sheet-talk summary').click();const before=await sheet.evaluate(el=>{el.scrollTop=el.scrollHeight;return el.scrollTop});expect(before).toBeGreaterThan(0);await page.waitForTimeout(16000);expect(Math.abs((await sheet.evaluate(el=>el.scrollTop))-before)).toBeLessThanOrEqual(2);await page.locator('[data-game-close-bird]').click();await noScroll(page);
});


