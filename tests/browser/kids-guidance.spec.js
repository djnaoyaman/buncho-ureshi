import {test,expect} from '@playwright/test';
const NOW=Date.UTC(2026,10,20,2);
// This isolated presentation fixture never opens the player's save database.
for(const width of [320,390,1280])test(`plain guidance has readable ruby and diagrams at ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:844});await page.goto('');
 await page.evaluate(async({now})=>{
  const base=new URL('./',location.href);const [engine,food,life,help]=await Promise.all(['engine','food-choice-ui','life-care-ui','game-help'].map(n=>import(new URL(`src/${n}.js`,base))));
  const w=engine.createWorld(now);w.birds[0].stage='juvenile';const before=JSON.stringify(w);
  const html=food.renderFoodChoice(w.birds[0],now)+life.renderLifeCarePanel(w)+help.renderGameHelp();
  if(JSON.stringify(w)!==before)throw Error('Guidance mutated the world');
  document.body.dataset.world='buncho';document.body.innerHTML=`<main id="kids-fixture" class="game-app">${html}</main>`;
  await Promise.all(['game.css','life-care.css','caretaker-recruitment.css','game-help-guide.css'].map(n=>new Promise((resolve,reject)=>{const l=document.createElement('link');l.rel='stylesheet';l.href=new URL(`src/${n}`,base);l.onload=resolve;l.onerror=()=>reject(new Error('Missing guidance CSS '+n));document.head.append(l);})));await document.fonts.ready;
  const style=document.createElement('style');style.textContent='html,body[data-world="buncho"]{margin:0;min-width:0;width:100%;height:auto;overflow:auto}body[data-world="buncho"] #kids-fixture{box-sizing:border-box;padding:12px;width:100%;max-width:760px;margin:auto}';document.head.append(style);
  document.querySelectorAll('details').forEach(d=>d.open=true);
 },{now:NOW});
 await expect(page.locator('[data-help-food]')).toBeVisible();await expect(page.locator('[data-help-clocks]')).toBeVisible();
 await expect(page.locator('.kids-steps').first()).toBeVisible();expect(await page.locator('.kids-steps li').count()).toBeGreaterThanOrEqual(9);
 expect(await page.locator('ruby rt').count()).toBeGreaterThan(20);await expect(page.locator('ruby rt:not([aria-hidden="true"])')).toHaveCount(0);
 const snapshot=await page.locator('[data-help-clocks]').ariaSnapshot();expect(snapshot).toContain('ほんとうの');expect(snapshot).not.toContain('じかん');
 await page.locator('[data-help-food]').scrollIntoViewIfNeeded();await info.attach(`food-guide-${width}`,{body:await page.screenshot(),contentType:'image/png'});
 await page.locator('[data-help-clocks]').scrollIntoViewIfNeeded();await info.attach(`clock-guide-${width}`,{body:await page.screenshot(),contentType:'image/png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const overflow=await page.locator('.kids-guide,.kids-steps,.game-food-choice,.life-time-guide').evaluateAll(els=>els.filter(el=>el.scrollWidth>el.clientWidth+2).map(el=>el.className));expect(overflow).toEqual([]);
 const summary=page.locator('[data-game-details=food-choice]>summary');await summary.focus();await page.keyboard.press('Enter');await expect(summary.locator('..')).not.toHaveAttribute('open','');await page.keyboard.press('Space');await expect(summary.locator('..')).toHaveAttribute('open','');
});
