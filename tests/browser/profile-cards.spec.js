import {test,expect} from '@playwright/test';
import {createWorld,createBird,renameBird,bumpRevision,validateWorld,serializeWorld,parseSave,ACTIONS,adoptBird,talkToBird} from '../../src/engine.js';

import {accidentLifeBird,isAlive} from '../../src/life-care.js';

const NOW=Date.UTC(2026,10,8),LONG_NAME='あいうえおかきくけこさしすせそた';

function validated(world){
  validateWorld(world);const restored=parseSave(serializeWorld(world));expect(restored).toEqual(world);return restored;
}
function fixture(kind='mixed'){
  const world=createWorld(NOW,418);world.paused=true;world.settings.motion=false;world.settings.careSound=false;
  if(kind==='manual-omochi')renameBird(world,'b1','おもち');
  if(kind==='mixed')for(const options of [
    {name:LONG_NAME,color:'sakura',home:'visitor'},
    {name:LONG_NAME,color:'silver',home:'resident'},
    {name:'<友&"子>',color:'cinnamon',home:'resident'},
    {name:'ひな',stage:'chick',color:'white',home:'resident'},
    {name:'たまご',stage:'egg',color:'white',home:'resident'},
    {name:'来訪の子',color:'sakura',home:'visitor'},
    {name:LONG_NAME,color:'white',home:'visitor'},
    {name:'別の庭の子',color:'silver',home:'departed'},
    {name:'幼鳥',stage:'juvenile',color:'cinnamon',home:'visitor'},
    {name:LONG_NAME,color:'cinnamon',home:'departed'},
  ])createBird(world,options);
  if(kind==='mixed')adoptBird(world,'b2',LONG_NAME);
  if(kind==='deceased'){const bird=createBird(world,{name:'大切な仲間',home:'resident'});accidentLifeBird(world,bird.id,NOW);}
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
async function openProfile(page,id='b1'){
  await openRoster(page);const card=page.locator(`.game-roster-card[data-game-select="${id}"]`);await card.click();
  await expect(page.locator('.game-app')).toHaveAttribute('data-panel','profile');
  await expect(page.locator('.game-profile-heading h3')).toBeFocused();
  await expect(page.locator('#game-name')).toHaveAttribute('data-game-draft-bird',id);
}
async function returnHome(page){
  if(await page.locator('.game-bird-sheet').isVisible())await page.locator('#game-sheet-close').click();
  if(await page.locator('.game-panel-overlay').isVisible())await page.locator('[data-game-close-panel]').click();
  await expect(page.locator('.game-panel-overlay')).not.toBeVisible();
}
function personality(b){return `${b.personality.curiosity>60?'好奇心いっぱい':b.personality.caution>60?'慎重にゆっくり':'おだやか'}・${b.personality.sociability>65?'お話好き':'自分の時間も好き'}`;}
async function identity(page,world,b){
  const profile=page.locator('.game-profile-card-screen');
  await expect(profile.locator('.game-profile-heading h3')).toHaveText(b.name);
  await expect(profile.locator('.game-profile-personality')).toHaveText(personality(b));
  await expect(profile.locator('.game-profile-likes strong')).toHaveText(b.preference);
  await expect(profile.locator('.game-profile-now strong')).toHaveText(isAlive(world,b)?ACTIONS[b.action.kind]:'思い出の庭');
  await expect(profile.locator('#game-name')).toHaveValue(b.name);
  await expect(profile.locator('[data-game-art]')).toHaveAttribute('data-game-art',b.id);
  if(['adult','juvenile'].includes(b.stage))await expect(profile.locator('.game-profile-portrait .game-sprite')).toHaveAttribute('data-pose','left');
  const images=profile.locator('.game-profile-portrait img');
  for(const image of await images.all())await expect(image).toHaveJSProperty('complete',true);
  expect(await images.evaluateAll(images=>images.every(image=>image.naturalWidth>0))).toBe(true);
}
async function fits(page){
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  for(const selector of ['.game-panel-overlay > .game-panel','.game-profile-card-screen','.game-profile-card','.game-profile-heading','.game-name-form','.game-profile-details']){
    expect(await page.locator(selector).evaluate(el=>el.scrollWidth<=el.clientWidth+1),selector).toBe(true);
  }
  const bounds=await page.locator('.game-profile-portrait').evaluate(el=>{
    const box=el.getBoundingClientRect(),image=el.querySelector('.game-pose-window')||el.querySelector('.game-sprite'),r=image?.getBoundingClientRect();
    return {width:box.width,height:box.height,fits:!r||(r.left>=box.left-1&&r.right<=box.right+1&&r.top>=box.top-1&&r.bottom<=box.bottom+1)};
  });
  expect(bounds.width).toBeGreaterThan(65);expect(bounds.height).toBeGreaterThan(70);expect(bounds.fits).toBe(true);
}
async function shot(page,info,label,target){
  await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await expect(page.locator('.game-logo-intro')).toHaveCount(0);
  await target.scrollIntoViewIfNeeded();await expect(target).toBeInViewport();
  const path=info.outputPath(`${label}.png`);await page.screenshot({path});await info.attach(label,{path,contentType:'image/png'});
}
for(const kind of ['fresh','manual-omochi'])test(`profile ${kind}: actual identity survives repeated close, dialog, reopen and reload without save changes`,async({page},info)=>{
  const world=fixture(kind);await start(page,world,{width:390,height:844});await openProfile(page);
  await identity(page,world,world.birds[0]);await shot(page,info,`${kind}-profile`,page.locator('.game-profile-heading'));
  for(let i=0;i<2;i++){
    await page.locator('#game-profile-open-bird').click();await expect(page.locator('.game-bird-sheet')).toBeVisible();
    await expect(page.locator('#game-sheet-close')).toBeFocused();await page.keyboard.press('Escape');
    await expect(page.locator('.game-profile-card-screen')).toBeVisible();
    await returnHome(page);await openProfile(page);await identity(page,world,world.birds[0]);expect(await record(page)).toEqual(world);
  }
  await page.reload();await ready(page);await openProfile(page);await identity(page,world,world.birds[0]);expect(await record(page)).toEqual(world);
});
for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1440,height:900}])test(`profile A composition, lower sections, care dialog and keyboard routes at ${size.width}x${size.height}`,async({page},info)=>{
  const world=fixture();await start(page,world,size);await openProfile(page,'b2');const b=world.birds[1];await identity(page,world,b);await fits(page);
  for(const [label,selector]of [['portrait','.game-profile-portrait'],['identity','.game-profile-identity'],['likes','.game-profile-likes'],['actions','.game-profile-actions'],['rename','.game-name-form']])await shot(page,info,`profile-${size.width}-${label}`,page.locator('.game-profile-card-screen').locator(selector));
  const details=page.locator('.game-profile-details');await details.locator(':scope > summary').click();
  for(const [label,selector]of [['facts','.game-facts'],['meters','.game-meters'],['memory','.game-last-memory']]){
    const target=details.locator(selector);if(await target.count())await shot(page,info,`profile-${size.width}-${label}`,target);
  }
  const milestones=details.locator('.game-milestones');if(await milestones.count()){await milestones.locator('summary').click();await shot(page,info,`profile-${size.width}-milestones`,milestones.locator('ul'));}
  await shot(page,info,`profile-${size.width}-routes`,page.locator('.game-profile-card-screen .game-links'));
  await shot(page,info,`profile-${size.width}-disclosure`,page.locator('.game-profile-disclosure'));await fits(page);
  const action=page.locator('#game-profile-open-bird');await action.focus();await page.keyboard.press('Enter');
  await expect(page.locator('.game-bird-sheet')).toBeVisible();await expect(page.locator('#game-sheet-title')).toHaveText(b.name);
  await shot(page,info,`profile-${size.width}-care-heading`,page.locator('.game-sheet-heading'));
  await shot(page,info,`profile-${size.width}-care-controls`,page.locator('.game-care-actions'));
  await page.locator('.game-sheet-talk > summary').click();await shot(page,info,`profile-${size.width}-talk-controls`,page.locator('.game-talk-choices'));
  await page.keyboard.press('Escape');await expect(page.locator('.game-bird-sheet')).not.toBeVisible();await identity(page,world,b);
  await page.locator('.game-profile-card-screen [data-game-panel="family"]').click();await expect(page.locator('.game-app')).toHaveAttribute('data-panel','family');
  await page.locator('.game-panel-overlay [data-game-panel="profile"]').click();await identity(page,world,b);
  await page.locator('.game-profile-card-screen [data-game-panel="relations"]').click();await expect(page.locator('.game-app')).toHaveAttribute('data-panel','relations');
  await returnHome(page);await openProfile(page,'b3');await identity(page,world,world.birds[2]);expect(await record(page)).toEqual(world);
  await returnHome(page);await openRoster(page);await expect(page.locator('.game-roster-card[data-game-select="b3"]')).toHaveAttribute('aria-pressed','true');
  await page.locator('.game-roster-card[data-game-select="b2"]').focus();await page.keyboard.press('Space');await identity(page,world,b);expect(await record(page)).toEqual(world);
});
test('profile A stages, visitors, departed and deceased birds retain actual controls and save equality',async({page},info)=>{
  const world=fixture();await start(page,world,{width:390,height:844});
  for(const id of ['b4','b5','b6','b7','b9','b10']){
    const b=world.birds.find(b=>b.id===id);await openProfile(page,id);await identity(page,world,b);await fits(page);
    await shot(page,info,`state-${id}-profile`,page.locator('.game-profile-heading'));
    if(b.home==='visitor'){await expect(page.locator('.game-profile-card-screen [data-game-action="adopt"]')).toBeVisible();await expect(page.locator('.game-profile-card-screen [data-home-goodbye]')).toBeVisible();}
    await page.locator('#game-profile-open-bird').click();
    if(b.home==='departed'||!['juvenile','adult'].includes(b.stage)||b.needs.energy>=100)await expect(page.locator('#game-talk-call')).toBeDisabled();else await expect(page.locator('#game-talk-call')).toBeEnabled();
    await shot(page,info,`state-${id}-controls`,page.locator('.game-care-actions'));await returnHome(page);expect(await record(page)).toEqual(world);
  }
  const deceased=fixture('deceased');await record(page,deceased);await page.reload();await ready(page);await openProfile(page,'b2');await identity(page,deceased,deceased.birds[1]);
  await shot(page,info,'deceased-profile',page.locator('.game-profile-heading'));await page.locator('#game-profile-open-bird').click();
  await expect(page.locator('#game-sheet-health')).toHaveAttribute('data-game-panel','memorial');await expect(page.locator('#game-care-feed')).toBeDisabled();await expect(page.locator('#game-talk-call')).toBeDisabled();
  await shot(page,info,'deceased-controls',page.locator('.game-care-actions'));await page.locator('#game-sheet-health').click();await expect(page.locator('.life-memorial-gallery')).toBeVisible();expect(await record(page)).toEqual(deceased);
});
test('profile A draft isolation, peer refresh, selection, manual rename and reload',async({page},info)=>{
  const world=fixture();await start(page,world,{width:390,height:844});await openProfile(page,'b2');
  const input=page.locator('#game-name');await input.fill('保存前の名前');await returnHome(page);await openProfile(page,'b3');await expect(input).toHaveValue(LONG_NAME);
  await returnHome(page);await openProfile(page,'b2');await expect(input).toHaveValue('保存前の名前');
  await page.locator('.game-profile-details > summary').click();await input.scrollIntoViewIfNeeded();await input.focus();await input.evaluate(el=>el.setSelectionRange(2,4));
  const panel=page.locator('.game-panel-overlay > .game-panel'),scroll=await panel.evaluate(el=>el.scrollTop);
  const peer=await record(page);renameBird(peer,'b3','別の子の新しい名前');bumpRevision(peer);validated(peer);await record(page,peer);
  // A save-neutral UI poll must not discard the still-local input draft.
  await expect.poll(async()=>page.locator('.game-profile-card-screen').evaluate(()=>document.querySelector('#game-name').value)).toBe('保存前の名前');
  await page.waitForTimeout(3400);await expect(input).toBeFocused();await expect(input).toHaveValue('保存前の名前');
  expect(await input.evaluate(el=>el.selectionStart)).toBe(2);expect(await panel.evaluate(el=>el.scrollTop)).toBeCloseTo(scroll,0);await expect(page.locator('.game-profile-details')).toHaveAttribute('open','');expect(await record(page)).toEqual(peer);
  await input.fill('おもち');await page.keyboard.press('Tab');await expect(page.locator('.game-name-form button[type="submit"]')).toBeFocused();await page.keyboard.press('Enter');await expect(page.locator('.game-profile-heading h3')).toHaveText('おもち');
  const after=await record(page);validated(after);expect(after.birds.find(b=>b.id==='b2').naming.source).toBe('manual');expect(after.seed).toBe(peer.seed);expect(after.lifecycle).toEqual(peer.lifecycle);expect(after.encounters).toEqual(peer.encounters);expect(after.encounters.gardenFriends).toEqual(peer.encounters.gardenFriends);
  await shot(page,info,'manual-name-saved',page.locator('.game-name-feedback'));await page.reload();await ready(page);await openProfile(page,'b2');await identity(page,after,after.birds.find(b=>b.id==='b2'));
});
test('profile natural-habits article route and browser back preserve the world',async({page})=>{
  const world=fixture('fresh');await start(page,world,{width:390,height:844});await openProfile(page);const link=page.locator('.game-profile-card-screen [data-game-article]');
  await link.click();await expect(page).toHaveURL(/\/encyclopedia\/[^/]+\/$/);expect(await record(page)).toEqual(world);
  await page.goBack();await ready(page);await openProfile(page);await identity(page,world,world.birds[0]);expect(await record(page)).toEqual(world);
});

test('profile care action commits exactly the existing engine result and updates the actual condition',async({page},info)=>{
  const world=fixture('fresh');await start(page,world,{width:390,height:844});await openProfile(page);await page.locator('#game-profile-open-bird').click();
  await page.locator('.game-sheet-talk > summary').click();const expected=structuredClone(world),result=talkToBird(expected,'b1','水浴びしよう',NOW);validated(expected);
  await page.locator('#game-talk-1').click();await expect(page.locator('.game-reply')).toHaveText(result.answer);
  expect(await record(page)).toEqual(expected);await shot(page,info,'profile-real-talk',page.locator('.game-reply'));
  await page.locator('#game-sheet-close').click();await identity(page,expected,expected.birds[0]);await expect(page.locator('.game-profile-card-screen [data-game-article]')).toHaveAttribute('data-game-article','bathing');await shot(page,info,'profile-updated-condition',page.locator('.game-profile-now'));expect(await record(page)).toEqual(expected);
});
