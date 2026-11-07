import {test,expect} from '@playwright/test';
import {createWorld} from '../../src/engine.js';
import {LIFE_MENU_ITEMS} from '../../src/life-menu-icons.js';

const NOW=Date.UTC(2026,10,7,1);
async function record(page,value){return page.evaluate(value=>new Promise((resolve,reject)=>{const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('world',value?'readwrite':'readonly'),q=value?tx.objectStore('world').put(value,'current'):tx.objectStore('world').get('current');tx.oncomplete=()=>{db.close();resolve(q.result);};tx.onerror=()=>reject(tx.error);};}),value);}
async function start(page){
  await page.addInitScript(at=>{Date.now=()=>at;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));},NOW);
  await page.goto('');const world=createWorld(NOW,104);world.paused=true;world.settings.motion=false;world.settings.careSound=false;
  await record(page,world);await page.goto('game/');
  await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
  await page.locator('.game-scene-controls-toggle').click();
}

for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390}])test(`approved menu icons, all destinations and saved world ${size.width}x${size.height}`,async({page},info)=>{
  test.setTimeout(90000);await page.setViewportSize(size);await start(page);
  const before=await record(page),opener=page.locator('.game-bottom-dock [data-game-open-menu]');
  await opener.click();const menu=page.locator('.game-secondary-menu');
  await expect(menu.locator('.game-tabs > button')).toHaveText(LIFE_MENU_ITEMS.map(([,label])=>label));
  await expect(menu.locator('svg.life-menu-icon')).toHaveCount(10);
  await page.screenshot({path:info.outputPath(`approved-menu-${size.width}x${size.height}.png`)});
  await page.locator('[data-game-close-menu]').click();await expect(opener).toBeFocused();
  for(let repeat=0;repeat<2;repeat++)for(const [id,label] of LIFE_MENU_ITEMS){
    await opener.click();const button=page.locator(`#game-menu-${id}`);
    await button.scrollIntoViewIfNeeded();await expect(button).toHaveAccessibleName(label);
    const svg=button.locator('svg');await expect(svg).toHaveAttribute('data-life-menu-icon',id);
    await expect(svg).toHaveAttribute('aria-hidden','true');await expect(svg).toHaveAttribute('focusable','false');
    // Read the attached icon and text in one task, avoiding heartbeat detachment races.
    await expect.poll(()=>page.evaluate(id=>{
      const b=document.querySelector(`#game-menu-${id}`);if(!b)return false;
      const s=b.querySelector('svg'),r=b.getBoundingClientRect(),i=s.getBoundingClientRect();
      const range=document.createRange();range.selectNodeContents(b.querySelector('span'));const t=range.getBoundingClientRect();
      const direction=getComputedStyle(b).flexDirection;
      const separated=direction==='column'?t.top>=i.bottom:direction==='row'&&t.left>=i.right;
      return r.width>=44&&r.height>=44&&i.width>=24&&i.height>=24&&i.left>=r.left&&i.right<=r.right&&i.top>=r.top&&i.bottom<=r.bottom&&separated&&t.left>=r.left&&t.right<=r.right&&t.top>=r.top&&t.bottom<=r.bottom&&b.scrollWidth<=b.clientWidth&&s.querySelectorAll('script,image,use,[tabindex]').length===0;
    },id)).toBe(true);
    if(repeat===1){await button.focus();await button.press('Enter');}else await button.click();
    await expect(page.locator('.game-app')).toHaveAttribute('data-panel',id);
    await expect(button).toHaveAttribute('aria-pressed','true');
    await page.locator('[data-game-close-panel]').click();
    await expect(page.locator('.game-panel-overlay')).not.toBeVisible();
    await expect(page.locator('.game-app')).toHaveAttribute('data-panel','garden');await expect(opener).toBeFocused();
  }
  expect(await record(page)).toEqual(before);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
