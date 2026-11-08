import {test,expect} from '@playwright/test';
async function friendScroll(page,toBottom=false){
 return page.evaluate(toBottom=>{
  const nodes=document.querySelectorAll('[data-garden-details=friends]');
  if(nodes.length!==1)throw Error('Expected exactly one live garden friends pane: '+nodes.length);
  const el=nodes[0],rect=el.getBoundingClientRect();
  if(!el.parentElement?.matches('.finch-garden-dock')||!el.isConnected||!el.open||rect.width<=0||rect.height<=0)throw Error('Garden friends must be connected, open and laid out');
  if(toBottom)el.scrollTop=el.scrollHeight;
  return el.scrollTop;
 },toBottom);
}
test('garden friends remain open after interaction and named menus remain exclusive',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('game/');
 await page.locator('.game-scene-controls-toggle').click();
 await page.locator('.game-field-nav [data-game-panel=outdoors]').click();
 const friends=page.locator('[data-garden-details=friends]');
 await friends.locator(':scope > summary').click();
 await expect(friends).toHaveAttribute('open','');
 await friends.locator('[data-garden-friend-action]').first().click();
 await expect(friends).toHaveAttribute('open','');
 await expect(page.locator('.finch-notice')).not.toBeEmpty();
 await page.locator('[data-garden-details=companions] > summary').click();
 await expect(friends).not.toHaveAttribute('open','');
 await expect(page.locator('[data-garden-details=companions]')).toHaveAttribute('open','');
});

test('scrolling to the bottom of garden friends survives host polling and actions',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('game/');
 await page.locator('.game-scene-controls-toggle').click();
 await page.locator('.game-field-nav [data-game-panel=outdoors]').click();
 const friends=page.locator('[data-garden-details=friends]');
 await friends.locator(':scope > summary').click();
 const top=await friendScroll(page,true);
 expect(top).toBeGreaterThan(0);
 // Two ordinary host polls used to remove/reinsert the host and clear the
 // inner detail's offset before the encounter controller could capture it.
 await page.waitForTimeout(7000);
 expect(await friendScroll(page)).toBeGreaterThanOrEqual(top-2);
 await friends.locator('[data-garden-friend-action]').last().click();
 await expect(friends).toHaveAttribute('open','');
 expect(await friendScroll(page)).toBeGreaterThan(0);
 await page.locator('[data-garden-details=companions] > summary').click();
 await expect(friends).not.toHaveAttribute('open','');
});
