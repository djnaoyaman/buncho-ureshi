import {test,expect} from '@playwright/test';
for(const width of [320,390,768,1440])test(`game help ruby and disclosure at width ${width}`,async({page})=>{
 await page.setViewportSize({width,height:844});
 await page.addInitScript(()=>{localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));});
 await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 await page.evaluate(()=>document.dispatchEvent(new CustomEvent('buncho-world-action',{detail:'help'})));
 const help=page.locator('.game-help');await expect(help).toBeVisible();await expect(help.locator('ol > li')).toHaveCount(5);
 const ruby=help.locator('h3 rt').first();await expect(ruby).toBeVisible();await expect(ruby).toHaveCSS('display','ruby-text');
 await expect.poll(()=>help.evaluate(el=>el.isConnected&&el.scrollWidth<=el.clientWidth+1)).toBe(true);
 await page.screenshot({path:`test-results/game-help-${width}-${test.info().project.name}.png`});
 for(const key of ['help-care','help-life','help-story']){
  const detail=help.locator(`[data-game-details="${key}"]`);await detail.locator('summary').click();await expect(detail).toHaveAttribute('open','');
  await expect(detail.locator('p').last()).toBeVisible();await page.waitForTimeout(1600);await expect(detail).toHaveAttribute('open','');
  await detail.locator('summary').click();await expect(detail).not.toHaveAttribute('open','');
 }
 await expect(page.locator('[data-game-close-panel]')).toBeVisible();await page.locator('[data-game-close-panel]').click();await expect(help).toHaveCount(0);
});
