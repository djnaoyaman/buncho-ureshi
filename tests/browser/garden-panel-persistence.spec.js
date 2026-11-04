import {test,expect} from '@playwright/test';
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
 const top=await friends.evaluate(el=>{el.scrollTop=el.scrollHeight;return el.scrollTop;});
 expect(top).toBeGreaterThan(0);
 // Two ordinary host polls used to remove/reinsert the host and clear the
 // inner detail's offset before the encounter controller could capture it.
 await page.waitForTimeout(7000);
 expect(await friends.evaluate(el=>el.scrollTop)).toBeGreaterThanOrEqual(top-2);
 await friends.locator('[data-garden-friend-action]').last().click();
 await expect(friends).toHaveAttribute('open','');
 expect(await friends.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
 await page.locator('[data-garden-details=companions] > summary').click();
 await expect(friends).not.toHaveAttribute('open','');
});
