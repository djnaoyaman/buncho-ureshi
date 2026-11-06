import {expect} from '@playwright/test';

// Use the same visible control as a player. Scene controls intentionally start
// collapsed; waiting for the game alone does not make the bottom dock visible.
export async function openSceneControls(page){
  await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
  const toggle=page.locator('.game-scene-controls-toggle');
  if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('body')).toHaveAttribute('data-scene-controls','open');
}
