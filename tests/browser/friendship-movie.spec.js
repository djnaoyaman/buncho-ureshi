import {test,expect} from '@playwright/test';
import {createWorld,validateWorld} from '../../src/engine.js';
const at=Date.UTC(2026,10,18,9),id='eurasian-tree-sparrow',other='gouldian-finch',media='friendship-eurasian-tree-sparrow-v2.mp4';
function fixture(points,pilot=id){
 const w=createWorld(at,2026);w.paused=true;w.settings.motion=false;w.encounters.nextId=3;
 w.encounters.discoveries=[pilot,other].map((id,i)=>({id,firstTick:0,lastTick:0,visits:1,instanceId:i+1}));
 w.encounters.friendship=[{id:pilot,petPoints:points-10},{id:other,petPoints:90}];return validateWorld(w);
}
async function record(page,value){return page.evaluate(w=>new Promise((resolve,reject)=>{
 const r=indexedDB.open('buncho-ureshi-garden-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('world');r.onerror=()=>reject(r.error);
 r.onsuccess=()=>{const db=r.result,tx=db.transaction('world',w?'readwrite':'readonly'),s=tx.objectStore('world'),q=w?s.put(w,'current'):s.get('current');tx.oncomplete=()=>{db.close();resolve(q.result)};tx.onerror=()=>reject(tx.error)};
}),value);}
async function menu(page,id){
 const toggle=page.locator('.game-scene-controls-toggle'),button=page.locator('#game-nav-open');
 if(!await button.isVisible())await toggle.click();
 await button.click();await page.locator('#game-menu-'+id).click();
}
async function start(page,width,height,points,pilot=id){
 const w=fixture(points,pilot);await page.setViewportSize({width,height});
 await page.addInitScript(n=>{Date.now=()=>n;localStorage.setItem('buncho.music.v1','{"enabled":false}');localStorage.setItem('buncho.care-sound-choice.v1','{"explicit":true,"enabled":false}');},at);
 await page.goto('');await record(page,w);await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 if(await page.locator('#game-welcome-close').isVisible())await page.locator('#game-welcome-close').click();
 return w;
}
async function bird(page,id){await menu(page,'notebook');await page.locator(`[data-encounter-page="${id}"]`).click();}
const offer='[data-friendship-movie-offer]',pilotOpen=`[data-friendship-movie-open="${id}"]`,dialog='[data-friendship-movie]';
test('committed 99 to 100 offers once without opening; rewatch decodes exact portrait MP4',async({page})=>{
 const requests=[];page.on('request',r=>{if(r.url().includes(media))requests.push(r.url())});
 await start(page,320,568,99);await bird(page,id);
 await expect(page.locator('[data-finch-points]')).toHaveText('99');
 await expect(page.locator(pilotOpen)).toHaveCount(0);
 expect(requests).toEqual([]);
 await page.locator('[data-encounter-rub]').press('Enter');
 await expect(page.locator('[data-finch-points]')).toHaveText('100');
 await expect(page.locator(offer)).toBeVisible();
 await expect(page.locator(dialog)).toHaveCount(0);expect(requests).toEqual([]);
 await page.locator('[data-friendship-movie-dismiss]').click();await expect(page.locator(offer)).toHaveCount(0);
 await page.locator('.game-friendship-movie-card '+pilotOpen).click();
 const video=page.locator(dialog+' video');await expect(video).toBeVisible();
 expect(await video.evaluate(v=>v.paused&&!v.autoplay)).toBe(true);
 const metadata=await video.evaluate(async v=>{
  if(v.readyState<1)await new Promise((resolve,reject)=>{v.addEventListener('loadedmetadata',resolve,{once:true});v.addEventListener('error',()=>reject(new Error('Failed media decode')),{once:true});v.preload='metadata';v.load()});
  return {width:v.videoWidth,height:v.videoHeight,seconds:v.duration,paused:v.paused};
 });
 expect(metadata).toEqual({width:720,height:1280,seconds:15,paused:true});
 const before=await record(page);await page.locator(dialog+' [data-ending-close]').click();
 await expect(page.locator(dialog)).toHaveCount(0);
 expect(await record(page)).toEqual(before);
 await expect(page.locator(offer)).toHaveCount(0);
 await page.locator('.game-panel-overlay[open] [data-game-close-panel]').click();
 await menu(page,'diary');await expect(page.locator(pilotOpen)).toBeVisible();
});
test('recorded 100+ unlocks the bird card but does not create an offer; unrelated bird stays unchanged',async({page})=>{
 const w=await start(page,390,844,100);await bird(page,id);
 await expect(page.locator(pilotOpen)).toBeVisible();
 await expect(page.locator('.game-friendship-movie-card')).toContainText('城北中央公園');
 await expect(page.locator(offer)).toHaveCount(0);
 await expect(page.locator(dialog)).toHaveCount(0);
 await page.locator('[data-encounter-back]').click();await page.locator(`[data-encounter-page="${other}"]`).click();
 await expect(page.locator('[data-finch-points]')).toHaveText('100');
 await expect(page.locator('[data-friendship-movie-open]')).toHaveCount(0);
 expect((await record(page)).encounters.friendship).toEqual(w.encounters.friendship);
});
for(const [pilot,license] of [['eurasian-bullfinch','3.0'],['hawfinch','3.0'],['tricolored-munia','2.0']]){
 test(pilot+' own bird entry links exact edition and decodes without playing',async({page})=>{
  await start(page,390,844,99,pilot);await bird(page,pilot);
  const card=page.locator('.game-friendship-movie-card');
  await expect(page.locator('[data-finch-points]')).toHaveText('99');
  await expect(card.locator('[data-friendship-movie-open]')).toHaveCount(0);
  await page.locator('[data-encounter-rub]').press('Enter');
  await expect(page.locator('[data-finch-points]')).toHaveText('100');
  await expect(page.locator(offer)).toBeVisible();
  await expect(page.locator(dialog)).toHaveCount(0);
  await page.locator('[data-friendship-movie-dismiss]').click();
  await expect(card.getByRole('link',{name:'CC BY '+license,exact:true})).toHaveAttribute('href','https://creativecommons.org/licenses/by/'+license+'/');
  await expect(page.locator(offer)).toHaveCount(0);
  await card.locator('[data-friendship-movie-open="'+pilot+'"]').click();
  const video=page.locator(dialog+' video');await expect(video).toBeVisible();
  expect(await video.evaluate(async v=>{
   if(v.readyState<1)await new Promise((resolve,reject)=>{v.addEventListener('loadedmetadata',resolve,{once:true});v.addEventListener('error',()=>reject(new Error('Failed media decode')),{once:true});v.preload='metadata';v.load()});
   return {file:new URL(v.currentSrc).pathname.split('/').at(-1),width:v.videoWidth,height:v.videoHeight,seconds:v.duration,paused:v.paused};
  })).toEqual({file:'friendship-'+pilot+'-v1.mp4',width:720,height:1280,seconds:15,paused:true});
  const before=await record(page);await page.locator(dialog+' [data-ending-close]').click();
  expect(await record(page)).toEqual(before);
  await page.locator('.game-panel-overlay[open] [data-game-close-panel]').click();
  await menu(page,'diary');await expect(page.locator('[data-friendship-movie-open="'+pilot+'"]')).toBeVisible();
 });
}
