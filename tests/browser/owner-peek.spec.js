import {test,expect} from '@playwright/test';
const ownerKey='buncho.owner-profile.v1',legacyKey='buncho.owner-name.v1';
const absent=page=>page.locator('[data-game-panel="owner"],.game-owner-setting,.buncho-owner-editor,.game-owner-companion,.owner-peek,.owner-portrait-art,.buncho-owner-avatar');
async function ready(page){await page.goto('game/');await expect(page.locator('.game-logo-intro')).toBeHidden();}
async function openMenu(page){const toggle=page.locator('.game-scene-controls-toggle');if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();await page.locator('[data-game-open-menu]').click();}
for(const [width,height] of [[390,844],[844,390],[1280,800]])test(`character settings removed from menu and settings, birds retained ${width}`,async({page})=>{
 await page.setViewportSize({width,height});await ready(page);await expect(absent(page)).toHaveCount(0);await expect(page.locator('.game-room-bird').first()).toBeVisible();
 for(let i=0;i<2;i++){
  await openMenu(page);await expect(page.locator('.game-secondary-menu .game-tabs button')).toHaveCount(10);await expect(absent(page)).toHaveCount(0);
  await page.locator('#game-menu-settings').click();await expect(page.locator('#game-settings-title')).toBeVisible();await expect(absent(page)).toHaveCount(0);await expect(page.locator('[data-settings-music]')).toHaveCount(1);
  await page.keyboard.press('Escape');await expect(page.locator('.game-panel-overlay')).toBeHidden();await expect(page.locator('[data-game-open-menu]')).toBeFocused();
 }
 await page.reload();await expect(page.locator('.game-logo-intro')).toBeHidden();await expect(absent(page)).toHaveCount(0);
 expect(await page.evaluate(()=>performance.getEntriesByType('resource').some(e=>/\/owner-profile\.(js|css)(\?|$)/.test(e.name)))).toBe(false);
});
for(const raw of ['{"version":1,"name":"保管する名前","hair":"wave","eyes":"bright","outfit":"dress"}','{','{"version":99,"future":true}'])test(`withdrawn settings preserve exact saved bytes ${raw}`,async({page})=>{
 await page.goto('');await page.evaluate(({ownerKey,legacyKey,raw})=>{localStorage.setItem(ownerKey,raw);localStorage.setItem(legacyKey,'旧名');},{ownerKey,legacyKey,raw});
 await ready(page);await openMenu(page);await page.locator('#game-menu-settings').click();await expect(absent(page)).toHaveCount(0);await page.locator('[data-game-close-panel]').click();await page.reload();await expect(page.locator('.game-logo-intro')).toBeHidden();
 expect(await page.evaluate(key=>localStorage.getItem(key),ownerKey)).toBe(raw);expect(await page.evaluate(key=>localStorage.getItem(key),legacyKey)).toBe('旧名');
});
