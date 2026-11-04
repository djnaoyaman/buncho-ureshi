import { test, expect } from '@playwright/test';
const sizes = [{width:320,height:420},{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1440,height:900}];
const gardens = ['komorebi','mizukagami','komugi','hanadokei','kazaguruma','yuyake','tsukiakari','shrine-grove','onsen'];
for (const size of sizes) test(`garden targets remain reachable ${size.width}x${size.height}`, async ({page}, info) => {
  test.setTimeout(180000);
  await page.setViewportSize(size);
  await page.addInitScript(() => {localStorage.setItem('buncho.music.v1', JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1', JSON.stringify({explicit:true,enabled:false}));});
  await page.goto('game/');
  await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
  await page.locator('.game-scene-controls-toggle').click();
  await page.locator('.game-field-nav [data-game-panel=outdoors]').click();
  for (const garden of gardens) {
    await page.locator(`[data-garden-select="${garden}"]`).click();
    const stage=page.locator('.finch-garden-stage:visible');
    await expect(stage).toHaveAttribute('data-garden-id', garden);
    await expect(page.locator('.finch-garden-dock > button[data-garden-select]')).toHaveCount(0);
    await expect(page.locator('[data-garden-details=observe] > summary')).toHaveText('観察する');
    await expect(stage.locator('.finch-garden-friend:visible').first()).toBeVisible();
    // Query and measure in one browser task: the live game's periodic refresh
    // can detach an ElementHandle between locator resolution and evaluate.
    const measured=await page.evaluate(garden => {
      const root=document.querySelector(`.finch-garden-stage[data-garden-id="${garden}"]`);
      if(!root?.isConnected)return {connected:false,size:[0,0],count:0,bad:[]};
      const s=root.getBoundingClientRect(),birds=[...root.querySelectorAll('.finch-garden-friend,.finch-garden-household,.finch-garden-visitor')];
      const bad=birds.map(b => {
        const r=b.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2, hit=document.elementFromPoint(x,y);
        return {name:b.getAttribute('aria-label'),rect:[r.left,r.top,r.right,r.bottom].map(Math.round),
          stage:[s.left,s.top,s.right,s.bottom].map(Math.round),
          fits:r.left>=s.left-1&&r.right<=s.right+1&&r.top>=s.top-1&&r.bottom<=s.bottom+1,
          hit:!!hit&&(hit===b||b.contains(hit))};
      }).filter(b=>!b.fits||!b.hit);
      return {connected:root.isConnected,size:[s.width,s.height],count:birds.length,bad};
    },garden);
    expect(measured.connected,`live stage for ${garden}`).toBe(true);
    expect(measured.size[0],`stage width for ${garden}`).toBeGreaterThan(0);
    expect(measured.size[1],`stage height for ${garden}`).toBeGreaterThan(0);
    expect(measured.count,`birds in ${garden}`).toBeGreaterThan(0);
    const {bad}=measured;
    if (bad.length) await info.attach(`${garden}-${size.width}x${size.height}`,{body:await page.screenshot(),contentType:'image/png'});
    expect(bad, JSON.stringify({garden,size,bad},null,2)).toEqual([]);
  }
});
