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
