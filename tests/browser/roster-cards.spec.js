import {test,expect} from '@playwright/test';
import {createWorld,createBird,renameBird,bumpRevision,validateWorld,serializeWorld,parseSave} from '../../src/engine.js';

const NOW=Date.UTC(2026,10,8),LONG_NAME='あいうえおかきくけこさしすせそた';
const CAPACITY='家族は6羽、お友達の来訪は文鳥もほかの鳥も合わせて6羽まで。以前から7〜10羽の家族がいるおうちは、そのまま暮らせます。名簿は128羽まで残します。お迎え・誕生は家族6羽を上限に、新規来訪は名簿に空きがある間楽しめます。';
const GROUPS=['resident','visitor','departed'];

function validated(world){
  validateWorld(world);const restored=parseSave(serializeWorld(world));expect(restored).toEqual(world);return restored;
}
function fixture(kind='mixed'){
  const world=createWorld(NOW,418);world.paused=true;world.settings.motion=false;world.settings.careSound=false;
  if(kind==='manual-omochi')renameBird(world,'b1','おもち');
  if(kind==='mixed')for(const options of [
    {name:LONG_NAME,color:'sakura',home:'resident'},
    {name:LONG_NAME,color:'silver',home:'resident'},
    {name:'<友&"子>',color:'cinnamon',home:'resident'},
    {name:'ひな',stage:'chick',color:'white',home:'resident'},
    {name:'たまご',stage:'egg',color:'white',home:'resident'},
    {name:'来訪の子',color:'sakura',home:'visitor'},
    {name:LONG_NAME,color:'white',home:'visitor'},
    {name:'別の庭の子',color:'silver',home:'departed'},
    {name:LONG_NAME,color:'cinnamon',home:'departed'},
  ])createBird(world,options);
  return validated(world);
}
async function record(page,value){
  return page.evaluate(value=>new Promise((resolve,reject)=>{
    const request=indexedDB.open('buncho-ureshi-garden-v1',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('world');request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const db=request.result,tx=db.transaction('world',value?'readwrite':'readonly');
      const result=value?tx.objectStore('world').put(value,'current'):tx.objectStore('world').get('current');
      tx.oncomplete=()=>{db.close();resolve(result.result);};
      tx.onerror=()=>{db.close();reject(tx.error);};tx.onabort=()=>{db.close();reject(tx.error);};
    };
  }),value);
}
async function ready(page){
  await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
  await expect(page.locator('.game-logo-intro')).toHaveCount(0);
  await expect(page.locator('[data-home-role="self"]')).toBeVisible();
}
async function start(page,world,size){
  await page.setViewportSize(size);
  await page.addInitScript(now=>{
    Date.now=()=>now;localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));
    localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));
  },NOW);
  await page.route(/youtube|youtu\.be|googlevideo|ytimg/i,route=>route.abort());
  await page.goto('');await record(page,world);await page.goto('game/');await ready(page);
  expect(await record(page)).toEqual(world);
}
async function openRoster(page){
  const toggle=page.locator('.game-scene-controls-toggle');
  if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
  await page.locator('#game-nav-open').click();await page.locator('#game-menu-roster').click();
  await expect(page.locator('.game-panel-overlay')).toBeVisible();
  await expect(page.locator('.game-roster-catalog > h3')).toHaveText('みんなの名簿');
  await expect(page.locator('.game-roster-catalog > h3')).toBeInViewport();
}
async function selected(page,world,id){
  const catalog=page.locator('.game-roster-catalog'),card=catalog.locator(`.game-roster-card[data-game-select="${id}"]`);
  await expect(catalog.locator('.game-roster-card[aria-pressed="true"]')).toHaveCount(1);
  await expect(card).toHaveAttribute('aria-pressed','true');
  await expect(card).toHaveCSS('background-color','rgb(247, 220, 141)');
  await expect(card.locator('.game-roster-check')).toHaveText('✓');
  await expect(card.locator('.game-roster-check')).toBeVisible();
  await expect(catalog.locator('.game-roster-current')).toContainText(world.birds.find(bird=>bird.id===id).name);
  for(const other of await catalog.locator('.game-roster-card[aria-pressed="false"] .game-roster-check').all())await expect(other).toBeHidden();
}
async function screenshot(page,info,label,target){
  await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
  await expect(page.locator('.game-logo-intro')).toHaveCount(0);
  await expect(page.locator('.game-panel-overlay')).toBeVisible();
  await target.scrollIntoViewIfNeeded();await expect(target).toBeInViewport();
  const path=info.outputPath(`${label}.png`);await page.screenshot({path});
  await info.attach(label,{path,contentType:'image/png'});
}
async function fits(page){
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  expect(await page.locator('.game-panel-overlay > .game-panel').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  for(const card of await page.locator('.game-roster-card').all()){
    await card.scrollIntoViewIfNeeded();await expect(card).toBeInViewport();
    expect(await card.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  }
}

for(const kind of ['fresh','manual-omochi'])test(`${kind}: founder identity, empty groups and capacity explanation survive reopen and reload`,async({page},info)=>{
  const world=fixture(kind),name=kind==='fresh'?'エド':'おもち';
  await start(page,world,{width:390,height:844});await openRoster(page);
  const catalog=page.locator('.game-roster-catalog');await selected(page,world,'b1');
  await expect(catalog.locator('[data-roster-group="resident"] [data-roster-count]')).toHaveText('1羽');
  await expect(catalog.locator('.game-roster-card > strong')).toHaveText(name);
  for(const home of ['visitor','departed']){
    await expect(catalog.locator(`[data-roster-group="${home}"] [data-roster-count]`)).toHaveText('0羽');
    await expect(catalog.locator(`[data-roster-group="${home}"] .game-roster-empty`)).toContainText('まだいないよ。');
  }
  const capacity=catalog.locator('details[data-game-details="roster-capacity"]');
  await expect(capacity).not.toHaveAttribute('open','');await capacity.locator('summary').click();
  await expect(capacity.locator('p')).toHaveText(CAPACITY);await expect(capacity.locator('p')).toBeVisible();
  await screenshot(page,info,`${kind}-roster`,catalog.locator('h3'));
  await page.locator('[data-game-close-panel]').click();await expect(page.locator('.game-panel-overlay')).not.toBeVisible();
  await openRoster(page);await selected(page,world,'b1');expect(await record(page)).toEqual(world);
  await page.reload();await ready(page);await openRoster(page);await selected(page,world,'b1');expect(await record(page)).toEqual(world);
});

for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1440,height:900}])test(`mixed roster: two columns, accessible selection and unchanged save at ${size.width}x${size.height}`,async({page},info)=>{
  const world=fixture();await start(page,world,size);await openRoster(page);await selected(page,world,'b1');
  const catalog=page.locator('.game-roster-catalog');
  for(const home of GROUPS){
    const group=catalog.locator(`[data-roster-group="${home}"]`),birds=world.birds.filter(bird=>bird.home===home);
    await expect(group.locator('h4 [data-roster-count]')).toHaveText(`${birds.length}羽`);
    await expect(group.locator('.game-roster-card')).toHaveCount(birds.length);
    for(const bird of birds){
      const card=group.locator(`[data-game-select="${bird.id}"]`);
      await expect(card).toHaveJSProperty('tagName','BUTTON');await expect(card).toHaveAttribute('type','button');
      await expect(card.locator('strong')).toHaveText(bird.name);await expect(card).toHaveAttribute('aria-pressed',String(bird.id==='b1'));
      if(['adult','juvenile'].includes(bird.stage))await expect(card.locator('.game-sprite')).toHaveAttribute('data-pose','left');
    }
  }
  const geometry=await catalog.locator('[data-roster-group="resident"] .game-roster').evaluate(grid=>({
    columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,
    cards:[...grid.children].map(card=>{const box=card.getBoundingClientRect();return {x:box.x,y:box.y,width:box.width};}),
  }));
  expect(geometry.columns).toBe(2);expect(Math.abs(geometry.cards[0].y-geometry.cards[1].y)).toBeLessThanOrEqual(1);
  expect(geometry.cards[1].x).toBeGreaterThan(geometry.cards[0].x);expect(geometry.cards[2].y).toBeGreaterThan(geometry.cards[0].y);
  expect(Math.abs(geometry.cards[0].width-geometry.cards[1].width)).toBeLessThanOrEqual(1);
  await fits(page);
  await screenshot(page,info,`roster-${size.width}x${size.height}-resident`,catalog.locator('h3'));
  for(const home of ['visitor','departed'])await screenshot(page,info,`roster-${size.width}x${size.height}-${home}`,catalog.locator(`[data-roster-group="${home}"] h4`));
  // Keep the existing overview evidence, then show actual faces, names and home labels.
  // Short landscape panels may need two natural scroll positions for a tall card.
  const panel=page.locator('.game-panel-overlay > .game-panel'),capacity=catalog.locator('[data-game-details="roster-capacity"]');
  const previousScroll=await panel.evaluate(el=>el.scrollTop),capacityWasOpen=await capacity.evaluate(el=>el.open);
  const previousFocus=await page.evaluateHandle(()=>document.activeElement);
  try{
    for(const home of GROUPS){
      const first=catalog.locator(`[data-roster-group="${home}"] .game-roster-card`).first();
      await screenshot(page,info,`roster-${size.width}x${size.height}-${home}-first-card`,first);
      const clipped=await first.evaluate(el=>{
        const box=el.getBoundingClientRect(),panel=el.closest('.game-panel'),frame=panel.getBoundingClientRect();
        return box.top<frame.top+panel.clientTop-1||box.bottom>frame.top+panel.clientTop+panel.clientHeight+1;
      });
      if(clipped){
        await screenshot(page,info,`roster-${size.width}x${size.height}-${home}-first-card-portrait`,first.locator('.game-mini-bird'));
        await first.locator('.game-roster-home').scrollIntoViewIfNeeded();
        await expect(first.locator('strong')).toBeInViewport();await expect(first.locator('.game-roster-home')).toBeInViewport();
        await screenshot(page,info,`roster-${size.width}x${size.height}-${home}-first-card-name-home`,first.locator('.game-roster-home'));
      }
    }
    await screenshot(page,info,`roster-${size.width}x${size.height}-note`,catalog.locator('.game-roster-note'));
    if(!capacityWasOpen)await capacity.locator('summary').click();
    await expect(capacity.locator('p')).toHaveText(CAPACITY);
    await screenshot(page,info,`roster-${size.width}x${size.height}-capacity-body`,capacity.locator('p'));
  }finally{
    if(await capacity.evaluate(el=>el.open)!==capacityWasOpen)await capacity.locator('summary').click();
    await panel.evaluate((el,top)=>{el.scrollTop=top;},previousScroll);
    await previousFocus.evaluate(el=>{if(el?.isConnected)el.focus({preventScroll:true});});
    await previousFocus.dispose();
  }
  for(const [id,key]of [['b2','click'],['b3','Enter'],['b7','Space'],['b9','Enter']]){
    const bird=world.birds.find(bird=>bird.id===id),card=catalog.locator(`[data-game-select="${id}"]`);
    await card.scrollIntoViewIfNeeded();await card.focus();await expect(card).toBeFocused();
    if(key==='click')await card.click();else await page.keyboard.press(key);
    await expect(page.locator('.game-app')).toHaveAttribute('data-panel','profile');
    await expect(page.locator('.game-profile-heading h3')).toHaveText(bird.name);
    await expect(page.locator('.game-profile-heading h3')).toBeFocused();
    await expect(page.locator('#game-name')).toHaveAttribute('data-game-draft-bird',id);
    await page.locator('[data-game-close-panel]').click();await openRoster(page);
    // A departed bird cannot become the home scene's selected resident on return.
    await selected(page,world,bird.home==='departed'?'b1':id);expect(await record(page)).toEqual(world);
  }
  await page.locator('[data-game-close-panel]').click();await openRoster(page);await selected(page,world,'b1');
  expect(await record(page)).toEqual(world);await page.reload();await ready(page);await openRoster(page);
  expect(await record(page)).toEqual(world);
});

test('valid external update refreshes counts and current name without losing scroll, focus or disclosure state',async({page},info)=>{
  const world=fixture();await start(page,world,{width:390,height:844});await openRoster(page);
  await page.locator('.game-roster-card[data-game-select="b2"]').click();await page.locator('[data-game-close-panel]').click();await openRoster(page);
  const capacity=page.locator('[data-game-details="roster-capacity"]');await capacity.locator('summary').click();await expect(capacity.locator('p')).toHaveText(CAPACITY);
  const card=page.locator('.game-roster-card[data-game-select="b8"]');await card.scrollIntoViewIfNeeded();await card.focus();await expect(card).toBeFocused();
  const panel=page.locator('.game-panel-overlay > .game-panel'),scrollTop=await panel.evaluate(el=>el.scrollTop);expect(scrollTop).toBeGreaterThan(0);
  const expected=await record(page);renameBird(expected,'b2','新しい家族の名前');
  createBird(expected,{name:'新しいお友達',color:'white',home:'visitor'});bumpRevision(expected);validated(expected);await record(page,expected);
  await expect(page.locator('[data-roster-group="visitor"] [data-roster-count]')).toHaveText('3羽');
  await expect(page.locator('.game-roster-current')).toContainText('新しい家族の名前');await selected(page,expected,'b2');
  await expect(card).toBeFocused();await expect(capacity).toHaveAttribute('open','');
  expect(await panel.evaluate(el=>el.scrollTop)).toBeCloseTo(scrollTop,0);expect(await record(page)).toEqual(expected);
  await screenshot(page,info,'roster-live-count-refresh',page.locator('[data-roster-group="visitor"] h4'));
});
