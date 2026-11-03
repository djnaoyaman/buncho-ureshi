import { test, expect } from '@playwright/test';
async function ready(page) {
  await page.addInitScript(() => {
    localStorage.setItem('buncho.music.v1', JSON.stringify({enabled:false}));
    localStorage.setItem('buncho.care-sound-choice.v1', JSON.stringify({explicit:true,enabled:false}));
  });
  await page.goto('game/');
  await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
}
async function noScroll(page) {
  expect(await page.evaluate(() => ({x:scrollX,y:scrollY,
    dx:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth,
    dy:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight)-innerHeight
  }))).toEqual({x:0,y:0,dx:0,dy:0});
}
async function cover(page,image) {
  await expect(image).toBeVisible(); await image.evaluate(i=>i.decode());
  const r=await image.boundingBox(),v=page.viewportSize();
  expect(r.x).toBeLessThanOrEqual(1); expect(r.y).toBeLessThanOrEqual(1);
  expect(r.x+r.width).toBeGreaterThanOrEqual(v.width-1);
  expect(r.y+r.height).toBeGreaterThanOrEqual(v.height-1);
}
async function reachable(page,bird,top,bottom) {
  await expect(bird).toBeVisible();
  const r=await bird.boundingBox(),t=await top.boundingBox(),b=await bottom.boundingBox();
  expect(r.width).toBeGreaterThanOrEqual(44); expect(r.height).toBeGreaterThanOrEqual(44);
  expect(r.x).toBeGreaterThanOrEqual(0); expect(r.x+r.width).toBeLessThanOrEqual(page.viewportSize().width);
  expect(r.y).toBeGreaterThanOrEqual(t.y+t.height); expect(r.y+r.height).toBeLessThanOrEqual(b.y);
  expect(await bird.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
  await bird.click({trial:true});
}
for(const [width,height] of [[320,568],[390,844],[844,390]]) {
  test(`full-stage house and nine gardens ${width}x${height}`,async({page},testInfo)=>{
    test.setTimeout(90000); await page.setViewportSize({width,height}); await ready(page);
    await page.locator('.game-status [data-game-action=pause]').click();
    const bird=page.locator('.game-room-bird.is-selected'),habitat=page.locator('.game-main .game-habitat img');
    await cover(page,habitat);
    expect((await page.locator('.game-scene-toolbar .game-bird-carousel').boundingBox()).height).toBeLessThanOrEqual(60);
    expect(await page.locator('#game-open-bird').evaluate(el=>getComputedStyle(el).borderTopLeftRadius)).not.toBe('6px');
    await reachable(page,bird,page.locator('.game-field-nav'),page.locator('.game-bottom-dock'));
    await noScroll(page); await page.screenshot({path:testInfo.outputPath(`house-${width}x${height}.png`)});
    await bird.click(); await expect(page.locator('.game-bird-sheet')).toBeVisible();
    await page.locator('[data-game-close-bird]').click(); await noScroll(page);
    await page.locator('.game-field-nav [data-game-panel=outdoors]').click();
    await expect(page.locator('.game-panel-overlay')).toHaveAttribute('data-scene','true');
    const selector=page.locator('.finch-garden-selector');
    await expect(selector.locator('[data-garden-select]')).toHaveCount(9);
    const ids=await selector.locator('[data-garden-select]').evaluateAll(es=>es.map(e=>e.dataset.gardenSelect));
    for(const id of ids){
      await selector.locator(`[data-garden-select="${id}"]`).click();
      await expect(selector.locator(`[data-garden-select="${id}"]`)).toHaveAttribute('aria-current','page');
      await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-garden-id',id);
      await cover(page,page.locator('.finch-garden-slide').first().locator('.finch-garden-background'));
      await noScroll(page);
    }
    await reachable(page,page.locator('.finch-garden-slide').first().locator('.finch-garden-friend'),selector,page.locator('.finch-garden-dock'));
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
