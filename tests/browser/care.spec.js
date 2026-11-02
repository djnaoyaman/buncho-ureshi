import { test, expect } from '@playwright/test';
import legacyWorld from '../fixtures/v1-world.json' with {type:'json'};
import { createWorld, advanceTicks, adoptBird, validateWorld } from '../../src/engine.js';
const DB='buncho-ureshi-garden-v1',now=Date.UTC(2026,10,2,12);
function fixture({stage='adult',home='resident',sound=false}={}){
  const w=createWorld(now,5402);advanceTicks(w,1);adoptBird(w,'b2','こめ');w.paused=true;w.lastUpdated=now;w.care.cleanliness=15;w.settings.careSound=sound;w.birds[0].needs.food=40;w.birds[0].mood=60;w.birds[0].stage=stage;w.birds[0].home=home;return validateWorld(w);
}
async function record(page,value){return page.evaluate(({dbName,value})=>new Promise((resolve,reject)=>{const open=indexedDB.open(dbName,1);open.onupgradeneeded=()=>open.result.createObjectStore('world');open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,tx=db.transaction('world',value?'readwrite':'readonly'),store=tx.objectStore('world'),request=value?store.put(value,'current'):store.get('current');tx.oncomplete=()=>{db.close();resolve(value||request.result);};tx.onerror=()=>{db.close();reject(tx.error);};};}),{dbName:DB,value});}
async function seed(page,w=fixture()){await page.goto('');await record(page,w);await page.goto('game/');await expect(page.locator('.game-app')).toBeVisible();await page.locator('[data-game-details="home-care"] summary').click();}
async function tab(page,name){await page.locator(`[data-game-panel="${name}"]`).first().click();}
async function downloadText(download){const stream=await download.createReadStream();if(!stream)throw Error('No download stream');const chunks=[];for await(const chunk of stream)chunks.push(Buffer.from(chunk));return Buffer.concat(chunks).toString('utf8');}
async function trackNativeAudio(page){await page.addInitScript(()=>{
  const Native=window.AudioContext||window.webkitAudioContext;window.__careAudio={contexts:0,starts:0,active:0,closed:0,resumes:0,resolved:0,resumeErrors:[],states:[]};
  if(!Native){window.__careAudio.unavailable=true;return;}
  // Observe real native instances, as in the studio audit. Do not rely on
  // WebIDL constructors preserving a JavaScript subclass's method overrides.
  const Tracked=new Proxy(Native,{construct(Target,args){
    const audio=Reflect.construct(Target,args);window.__careAudio.contexts++;window.__careNativeContext=audio;window.__careAudio.states.push(audio.state);audio.addEventListener('statechange',()=>window.__careAudio.states.push(audio.state));
    const resume=audio.resume.bind(audio);audio.resume=()=>{window.__careAudio.resumes++;return resume().then(value=>{window.__careAudio.resolved++;return value;},error=>{window.__careAudio.resumeErrors.push(String(error));throw error;});};
    const create=audio.createOscillator.bind(audio),close=audio.close.bind(audio);
    audio.createOscillator=()=>{const osc=create(),start=osc.start.bind(osc);osc.start=(...args)=>{window.__careAudio.starts++;window.__careAudio.active++;return start(...args);};osc.addEventListener('ended',()=>window.__careAudio.active--);return osc;};
    audio.close=()=>{window.__careAudio.closed++;return close();};return audio;
  }});
  Object.defineProperty(window,'AudioContext',{configurable:true,value:Tracked});
});}
async function holdAudio(page){await page.addInitScript(()=>{
  window.__careStarts=0;const gates=[];window.__releaseCareAudio=()=>gates.splice(0).forEach(release=>release());
  class Param{setValueAtTime(){}linearRampToValueAtTime(){}exponentialRampToValueAtTime(){}cancelScheduledValues(){}}
  class HeldContext{constructor(){this.state='suspended';this.currentTime=0;this.destination={};}resume(){return new Promise(resolve=>gates.push(()=>{if(this.state!=='closed')this.state='running';resolve();}));}createOscillator(){return{frequency:new Param(),connect(){},disconnect(){},start(){window.__careStarts++;},stop(){}};}createGain(){return{gain:new Param(),connect(){},disconnect(){}};}close(){this.state='closed';return Promise.resolve();}}
  Object.defineProperty(window,'AudioContext',{configurable:true,value:HeldContext});
});}
test.beforeEach(async({page})=>{await page.addInitScript(value=>{Date.now=()=>value;},now);await page.route(/youtube|youtu\.be|googlevideo|ytimg/i,r=>r.abort());});

test('an existing v1 device save migrates in place without advancing paused family history',async({page})=>{
  const legacy=structuredClone(legacyWorld);legacy.paused=true;legacy.lastUpdated=now;
  await seed(page,legacy);const migrated=await record(page);
  expect(migrated.version).toBe(3);expect(migrated.worldId).toBe(legacy.worldId);expect(migrated.tick).toBe(legacy.tick);
  expect(migrated.birds.map(({care,...bird})=>bird)).toEqual(legacy.birds);expect(migrated.events).toEqual(legacy.events);
  expect(migrated.care).toEqual({cleanliness:100,lastCleanTick:null});expect(migrated.settings.careSound).toBe(false);
  expect(migrated.birds.every(b=>b.care.lastFedTick===null&&b.care.lastPetTick===null)).toBe(true);
  await page.reload();await expect(page.locator('.game-app')).toBeVisible();expect(await record(page)).toEqual(migrated);
});

test('care feed increases displayed fullness and free cleaning resets the floor without duplicate same-tick changes',async({page})=>{
  await seed(page);await expect(page.locator('[data-game-fullness]')).toHaveText('40 / 100');await expect(page.locator('[data-game-care-sound]')).not.toBeChecked();
  await page.locator('[data-game-care="feed"]').click();await expect(page.locator('[data-game-fullness]')).toHaveText('60 / 100');const fed=await record(page);
  await page.locator('[data-game-care="feed"]').click();await page.locator('[data-game-care="feed"]').click();await expect(page.locator('.game-care-feedback')).toContainText('さっき食べた');expect(await record(page)).toEqual(fed);
  await page.locator('[data-game-care="clean"]').click();await expect(page.locator('[data-game-cleanliness-value]')).toHaveText('100 / 100');await expect(page.locator('.game-floor-soil')).toHaveCSS('opacity','0');
  const clean=await record(page);await page.locator('[data-game-care="clean"]').click();expect(await record(page)).toEqual(clean);expect(clean.birds[0].color).toBe('white');
  await page.reload();await expect(page.locator('[data-game-fullness]')).toHaveText('60 / 100');await expect(page.locator('[data-game-cleanliness-value]')).toHaveText('100 / 100');
});

test('care sound opt-in schedules a short native synthetic chirp or reports unavailable native output; mute and reload stay silent',async({page},info)=>{
  await trackNativeAudio(page);await seed(page);expect(await page.evaluate(()=>window.__careAudio.contexts)).toBe(0);
  await page.locator('[data-game-care-sound]').check();await expect.poll(async()=> (await record(page)).settings.careSound).toBe(true);expect(await page.evaluate(()=>window.__careAudio.starts)).toBe(0);
  await page.locator('[data-game-care="pet"]').click();await expect(page.locator('.game-care-feedback')).toContainText('ぴっ');
  // No false audible claim: missing browser audio must retain explicit text fallback.
  const unavailable=await page.evaluate(()=>window.__careAudio.unavailable);
  if(unavailable)await expect(page.locator('.game-message')).toContainText('合成音を鳴らせません');
  else {
    await expect.poll(()=>page.evaluate(()=>window.__careAudio.starts===2||document.querySelector('.game-message')?.textContent.includes('合成音を鳴らせません')),{timeout:4000}).toBe(true);
    const native=await page.evaluate(()=>({audit:window.__careAudio,state:window.__careNativeContext?.state,time:window.__careNativeContext?.currentTime,hidden:document.hidden,message:document.querySelector('.game-message')?.textContent}));
    if(native.audit.starts===0){
      // This is a verified capability boundary, not a skipped sound assertion:
      // an actually running native graph must still produce exactly two notes.
      expect(native.state).toBe('suspended');expect(native.time).toBe(0);expect(native.hidden).toBe(false);
      expect(native.audit.resumes).toBeGreaterThan(0);expect(native.audit.resolved).toBe(0);expect(native.audit.states).not.toContain('running');
      await expect(page.locator('.game-message')).toContainText('合成音を鳴らせません');
      info.annotations.push({type:'native-audio-output-unavailable',description:'Real context stayed suspended at time 0; unresolved resume produced bounded explicit silent fallback, not audible acceptance.'});
    }else {expect(native.audit.starts).toBe(2);expect(native.state).toBe('running');}
    console.log('NATIVE_CARE_AUDIO_RESULT',JSON.stringify(native));
  }
  await page.locator('[data-game-care-sound]').uncheck();await expect.poll(()=>page.evaluate(()=>window.__careAudio.active)).toBe(0);await expect.poll(async()=> (await record(page)).settings.careSound).toBe(false);
  const starts=await page.evaluate(()=>window.__careAudio.starts);await page.locator('[data-game-care="pet"]').click();await expect(page.locator('.game-care-feedback')).toContainText('ひとやすみ');expect(await page.evaluate(()=>window.__careAudio.starts)).toBe(starts);
  await page.reload();await expect(page.locator('.game-app')).toBeVisible();expect(await page.evaluate(()=>window.__careAudio.starts)).toBe(0);expect(await page.evaluate(()=>window.__careAudio.contexts)).toBe(0);
});

for(const cancel of ['selection','route','mute'])test(`care pending audio is discarded after ${cancel}`,async({page})=>{
  await holdAudio(page);await seed(page,fixture({sound:true}));await page.locator('[data-game-care="pet"]').click();await expect.poll(async()=> (await record(page)).birds[0].mood).toBe(64);expect(await page.evaluate(()=>window.__careStarts)).toBe(0);
  if(cancel==='selection')await page.locator('[data-game-scene-choose]').selectOption('b2');
  if(cancel==='route'){await page.locator('#menu-toggle').click();await page.locator('#menu a[href$="encyclopedia/"]').click();await expect(page.locator('#article-grid')).toBeVisible();}
  if(cancel==='mute')await page.locator('[data-game-care-sound]').uncheck();
  await page.evaluate(()=>window.__releaseCareAudio());await page.waitForTimeout(50);expect(await page.evaluate(()=>window.__careStarts)).toBe(0);
});

test('care unavailable stages explain disabled actions and retain their natural stage artwork',async({page})=>{
  for(const options of [{stage:'egg'},{stage:'chick'},{home:'departed'}]){
    await seed(page,fixture(options));if(options.home){await tab(page,'roster');await page.locator('[data-game-select="b1"]').click();}
    await expect(page.locator('[data-game-care="feed"]')).toBeDisabled();await expect(page.locator('[data-game-care="pet"]')).toBeDisabled();
    await expect(page.locator('#game-care-explanation')).toContainText(options.home?'別の庭に巣立った':'巣で育つ時間');
    if(options.stage)await expect(page.locator('.game-profile-heading .game-sprite')).toHaveAttribute('data-stage',options.stage);
  }
});

test('care export preserves v2 values, cancelled import is exact, confirmed import with sound preference never autoplays',async({page})=>{
  await trackNativeAudio(page);await seed(page);await page.locator('[data-game-care="feed"]').click();await expect(page.locator('[data-game-fullness]')).toHaveText('60 / 100');await tab(page,'settings');
  const downloadEvent=page.waitForEvent('download');await page.locator('[data-game-action="export"]').click();const exported=validateWorld(JSON.parse(await downloadText(await downloadEvent)));expect(exported.version).toBe(3);expect(exported.birds[0].needs.food).toBe(60);expect(exported.care.cleanliness).toBe(15);expect(exported.settings.careSound).toBe(false);
  const next=fixture({sound:true});next.worldId+='-import';next.birds[0].needs.food=73;next.care.cleanliness=44;
  const file={name:'care.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(next))},before=await record(page);
  page.once('dialog',dialog=>dialog.dismiss());await page.locator('#game-import').setInputFiles(file);await expect(page.locator('#game-import')).toHaveValue('');expect(await record(page)).toEqual(before);
  page.once('dialog',dialog=>dialog.accept());await page.locator('#game-import').setInputFiles(file);await expect(page.locator('.game-message')).toContainText('復元');expect((await record(page)).worldId).toBe(next.worldId);expect(await page.evaluate(()=>window.__careAudio.starts)).toBe(0);
  await tab(page,'garden');await expect(page.locator('[data-game-fullness]')).toHaveText('73 / 100');await expect(page.locator('[data-game-cleanliness-value]')).toHaveText('44 / 100');await expect(page.locator('[data-game-care-sound]')).toBeChecked();
});

for(const width of [320,768,1440])test(`care controls and floor-only tint fit ${width}px without changing bird contacts`,async({page},info)=>{
  await page.setViewportSize({width,height:950});await page.emulateMedia({reducedMotion:'reduce'});await seed(page);
  await page.locator('.game-room img').evaluateAll(async images=>{await Promise.all(images.map(image=>image.decode()));await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));});
  const before=await page.locator('.game-room-bird').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.birdId,style:node.getAttribute('style'),src:node.querySelector('img').src,filter:getComputedStyle(node.querySelector('img')).filter})));
  expect(before.every(b=>b.filter==='none')).toBe(true);const floor=page.locator('.game-floor-soil');expect(Number(await floor.evaluate(node=>getComputedStyle(node).opacity))).toBeGreaterThan(0);expect(Number(await floor.evaluate(node=>getComputedStyle(node).opacity))).toBeLessThanOrEqual(.22);await expect(floor).toHaveAttribute('aria-hidden','true');await expect(floor).toHaveCSS('pointer-events','none');await expect(floor).toHaveCSS('z-index','1');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  if(info.project.name==='chromium')await page.locator('.game-room').screenshot({path:info.outputPath(`care-floor-dirty-${width}.png`),animations:'disabled'});
  await page.locator('[data-game-care="clean"]').click();await expect(floor).toHaveCSS('opacity','0');
  expect(await page.locator('.game-room-bird').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.birdId,style:node.getAttribute('style'),src:node.querySelector('img').src,filter:getComputedStyle(node.querySelector('img')).filter})))).toEqual(before);
  await page.locator('[data-game-care="pet"]').click();await expect(page.locator('.game-app')).toHaveAttribute('data-care-motion','off');await expect(page.locator('.game-care-feedback').last()).toContainText('ぴっ');
  await page.locator('.game-room img').evaluateAll(async images=>{await Promise.all(images.map(image=>image.decode()));await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));});
  if(info.project.name==='chromium'){await page.locator('.game-room').screenshot({path:info.outputPath(`care-floor-clean-${width}.png`),animations:'disabled'});await page.locator('.game-care').screenshot({path:info.outputPath(`care-controls-${width}.png`),animations:'disabled'});}
});
