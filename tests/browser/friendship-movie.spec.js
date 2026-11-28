import {test,expect} from '@playwright/test';
import {createWorld,validateWorld} from '../../src/engine.js';
import {GAME_DEVICE_CHOICE_KEY} from '../../src/game-environment.js';
const at=Date.UTC(2026,10,18,9),id='eurasian-tree-sparrow',other='masked-finch',media='friendship-eurasian-tree-sparrow-logo09.mp4';
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
async function petForOnePoint(page){
 const rub=page.locator('[data-encounter-rub]');
 // Native keyboard petting counts a full second of repeated input, not one tap.
 await rub.press('Enter');
 await page.waitForTimeout(525);
 await rub.press('Enter');
 await page.waitForTimeout(525);
 await rub.press('Enter');
}
async function bird(page,id){await menu(page,'notebook');await page.locator(`[data-encounter-page="${id}"]`).click();}
const offer='[data-friendship-movie-offer]',pilotOpen=`[data-friendship-movie-open="${id}"]`,dialog='[data-friendship-movie]';
test('committed 99 to 100 offers once without opening; rewatch decodes exact portrait MP4',async({page})=>{
 const requests=[];page.on('request',r=>{if(r.url().includes('friendship-'+id+'-'))requests.push(r.url())});
 await start(page,320,568,99);await bird(page,id);
 await expect(page.locator('[data-finch-points]')).toHaveText('99');
 await expect(page.locator(pilotOpen)).toHaveCount(0);
 expect(requests).toEqual([]);
 await petForOnePoint(page);
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
 expect(requests.length).toBeGreaterThan(0);
 expect(requests.every(url=>new URL(url).pathname.endsWith('/'+media))).toBe(true);
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
for(const [pilot,license] of [['eurasian-bullfinch','3.0'],['hawfinch','3.0'],['tricolored-munia','2.0'],['gouldian-finch','pixabay'],['red-crossbill','nps'],['red-avadavat','2.0'],['eurasian-siskin','pixabay'],['common-redpoll','2.0'],['zebra-finch','2.0'],['diamond-firetail','4.0'],['red-throated-parrotfinch','4.0']]){
 test(pilot+' own bird entry links exact edition and decodes without playing',async({page})=>{
  await start(page,390,844,99,pilot);await bird(page,pilot);
  const card=page.locator('.game-friendship-movie-card');
  await expect(page.locator('[data-finch-points]')).toHaveText('99');
  await expect(card.locator('[data-friendship-movie-open]')).toHaveCount(0);
  await petForOnePoint(page);
  await expect(page.locator('[data-finch-points]')).toHaveText('100');
  await expect(page.locator(offer)).toBeVisible();
  await expect(page.locator(dialog)).toHaveCount(0);
  await page.locator('[data-friendship-movie-dismiss]').click();
  if(license==='pixabay'){
   await expect(card.getByRole('link',{name:'Pixabay Content License',exact:true})).toHaveAttribute('href','https://pixabay.com/service/terms/');
   await expect(card).toContainText('撮影地：原典に記載なし');
   if(pilot==='eurasian-siskin')await expect(card.getByRole('link',{name:'原典',exact:true})).toHaveAttribute('href','https://pixabay.com/videos/siskins-garden-birds-bird-feeder-2226/');
  }else if(license==='nps'){
   await expect(card.getByRole('link',{name:'Public Domain（原典の権利表示）',exact:true})).toHaveAttribute('href','https://www.nps.gov/media/video/view.htm?id=7aee6259-50b8-49e3-8536-d78ab098df87');
   await expect(card).toContainText('ロングマイア・メドウ');
  }else await expect(card.getByRole('link',{name:'CC BY '+license,exact:true})).toHaveAttribute('href','https://creativecommons.org/licenses/by/'+license+'/');
  if(pilot==='red-avadavat'){
   await expect(card.getByRole('link',{name:'原典',exact:true})).toHaveAttribute('href','https://www.flickr.com/photos/krishnacolor/51482148959/');
   await expect(card).toContainText('インド・テランガーナ州');
  }
  if(pilot==='red-throated-parrotfinch'){
   await expect(card).toContainText('実写ではなく、写真を参考にした生成映像');
   await expect(card.getByRole('link',{name:'Ben Keen（映像のもとになった写真）',exact:true})).toHaveAttribute('href','https://www.inaturalist.org/observations/324096623');
   await expect(card.getByRole('link',{name:'CC0',exact:true})).toHaveAttribute('href','https://creativecommons.org/publicdomain/zero/1.0/');
   await expect(card.getByRole('link',{name:'Lennart Hudel（姿の確認に使った写真）',exact:true})).toHaveAttribute('href','https://www.inaturalist.org/observations/69886942');
  }
  if(pilot==='diamond-firetail'){
   await expect(card).toContainText('実写ではなく、写真を参考にした生成映像');
   await expect(card.getByRole('link',{name:'Andrew Allen',exact:true})).toHaveAttribute('href','https://commons.wikimedia.org/wiki/File:Stagonopleura_guttata_49654460.jpg');
   await expect(card.getByRole('link',{name:'CC BY 2.0',exact:true})).toHaveAttribute('href','https://creativecommons.org/licenses/by/2.0/');
  }
  if(pilot==='zebra-finch'){
   await expect(card).toContainText('実写ではなく、写真を参考にした生成映像');
   await expect(card.getByRole('link',{name:'CC0',exact:true})).toHaveAttribute('href','https://creativecommons.org/publicdomain/zero/1.0/');
  }
  if(pilot==='common-redpoll'){
   await expect(card.getByRole('link',{name:'原典',exact:true})).toHaveAttribute('href','https://commons.wikimedia.org/wiki/File:Common_redpolls_(Acanthis_flammea).webm');
   await expect(card).toContainText('ワショー郡ドライバレー');
  }
  await expect(page.locator(offer)).toHaveCount(0);
  await card.locator('[data-friendship-movie-open="'+pilot+'"]').click();
  const video=page.locator(dialog+' video');await expect(video).toBeVisible();
  if(pilot==='zebra-finch'||pilot==='diamond-firetail'||pilot==='red-throated-parrotfinch')await expect(page.locator(dialog+' [role=status]')).toContainText('写真を参考にした生成映像');
  expect(await video.evaluate(async v=>{
   if(v.readyState<1)await new Promise((resolve,reject)=>{v.addEventListener('loadedmetadata',resolve,{once:true});v.addEventListener('error',()=>reject(new Error('Failed media decode')),{once:true});v.preload='metadata';v.load()});
   return {file:new URL(v.currentSrc).pathname.split('/').at(-1),width:v.videoWidth,height:v.videoHeight,seconds:v.duration,paused:v.paused};
  })).toEqual({file:'friendship-'+pilot+'-logo09.mp4',width:720,height:1280,seconds:15,paused:true});
  const before=await record(page);await page.locator(dialog+' [data-ending-close]').click();
  expect(await record(page)).toEqual(before);
  await page.locator('.game-panel-overlay[open] [data-game-close-panel]').click();
  await menu(page,'diary');await expect(page.locator('[data-friendship-movie-open="'+pilot+'"]')).toBeVisible();
 });
}

test.describe('released mini films actually play',()=>{
 const origin='https://djnaoyaman.github.io';
 test.use({baseURL:origin+'/buncho-ureshi/',storageState:{cookies:[],origins:[{origin,localStorage:[{name:GAME_DEVICE_CHOICE_KEY,value:'continue'}]}]}});
 for(const pilot of ['diamond-firetail','red-throated-parrotfinch']){
  test(pilot+' plays visible frames through the published bird-card control',async({page},info)=>{
   await start(page,390,844,100,pilot);await bird(page,pilot);
   const before=await record(page), selector=`[data-friendship-movie="${pilot}"]`;
   await page.locator(`.game-friendship-movie-card [data-friendship-movie-open="${pilot}"]`).click();
   const d=page.locator(selector),v=d.locator('video');await expect(v).toBeVisible();
   expect(await v.evaluate(el=>el.paused&&!el.autoplay&&el.currentTime===0)).toBe(true);
   await d.locator('[data-ending-play]').click();
   await expect.poll(()=>v.evaluate(el=>el.currentTime),{timeout:22000}).toBeGreaterThan(3.4);
   const observed=await v.evaluate(el=>{
    const canvas=document.createElement('canvas');canvas.width=96;canvas.height=170;
    const ctx=canvas.getContext('2d');ctx.drawImage(el,0,0,96,170);
    const patch=ctx.getImageData(12,32,72,100).data;
    return {playing:!el.paused,dimensions:[el.videoWidth,el.videoHeight],seconds:el.duration,colors:new Set(patch).size,
      time:el.currentTime,file:new URL(el.currentSrc).pathname.split('/').at(-1),publishedOrigin:new URL(el.currentSrc).hostname};
   });
   expect(observed).toMatchObject({playing:true,dimensions:[720,1280],seconds:15,file:`friendship-${pilot}-logo09.mp4`,publishedOrigin:'djnaoyaman.github.io'});
   expect(observed.colors).toBeGreaterThan(12);
   expect(observed.time).toBeGreaterThan(3.4);
   await info.attach('visible decoded frame',{body:await v.screenshot(),contentType:'image/png'});
   await info.attach('production playback evidence',{body:JSON.stringify(observed),contentType:'application/json'});
   console.log('Verified production playback', info.project.name, pilot, JSON.stringify(observed));
   await d.locator('[data-ending-close]').click();
   await expect(d).toHaveCount(0);
   expect(await record(page)).toEqual(before);
  });
 }
});

for(const [pilot,licenseLabel,licenseUrl] of [
 ['evening-grosbeak','CC BY-SA 3.0','https://creativecommons.org/licenses/by-sa/3.0/'],
 ['brambling','CC BY-SA 3.0 NL','https://creativecommons.org/licenses/by-sa/3.0/nl/deed.en']
])test(pilot+' separates the approved 09 title card from its attributed 15s real footage',async({page})=>{
 const file='friendship-'+pilot+'-cc-by-sa.mp4',req=[];
 page.on('request',r=>{if(r.url().includes(file))req.push(r.url());});
 await start(page,390,844,99,pilot);await bird(page,pilot);
 const card=page.locator('.game-friendship-movie-card'),open=card.locator('[data-friendship-movie-open="'+pilot+'"]');
 await expect(page.locator('[data-finch-points]')).toHaveText('99');
 await expect(open).toHaveCount(0);
 await petForOnePoint(page);
 await expect(page.locator('[data-finch-points]')).toHaveText('100');
 await expect(page.locator(offer)).toBeVisible();
 await expect(page.locator(dialog)).toHaveCount(0);
 expect(req).toEqual([]);
 await page.locator('[data-friendship-movie-dismiss]').click();
 await expect(card.getByRole('link',{name:licenseLabel,exact:true})).toHaveAttribute('href',licenseUrl);
 await expect(card.getByRole('link',{name:'映像のみ（MP4）'})).toHaveAttribute('href',new RegExp(file+'$'));
 const before=await record(page);
 await open.click();
 const modal=page.locator(dialog),cover=modal.locator('.game-ending-independent-cover'),video=modal.locator('video');
 await expect(cover).toBeVisible();
 await expect(cover).toHaveAttribute('src',new RegExp(pilot+'-card-logo09[.]webp$'));
 await expect.poll(()=>cover.evaluate(x=>x.complete&&x.naturalWidth===720)).toBeTruthy();
 await expect(video).toBeHidden();
 expect(await video.evaluate(v=>v.paused&&!v.autoplay)).toBe(true);
 await modal.locator('[data-ending-play]').click();
 await expect(video).toBeVisible();
 await expect(cover).toBeHidden();
 try{
  await expect.poll(()=>video.evaluate(v=>v.currentTime)).toBeGreaterThan(2);
 }catch(error){
  const media=await video.evaluate(v=>({time:v.currentTime,paused:v.paused,ready:v.readyState,network:v.networkState,buffered:Array.from({length:v.buffered.length},(_,i)=>[v.buffered.start(i),v.buffered.end(i)]),muted:v.muted,visibility:getComputedStyle(v).visibility,error:v.error?.message}));
  console.error(pilot+' playback state:',JSON.stringify(media));throw error;
 }
 expect(await video.evaluate(v=>[v.videoWidth,v.videoHeight,v.duration])).toEqual([720,1280,15]);
 expect(req.length).toBeGreaterThan(0);
 await modal.locator('[data-ending-close]').click();
 await expect(modal).toHaveCount(0);
 expect(await record(page)).toEqual(before);
 await page.locator('.game-panel-overlay[open] [data-game-close-panel]').click();
 await menu(page,'diary');
 await expect(page.locator('[data-friendship-movie-open="'+pilot+'"]')).toBeVisible();
});
