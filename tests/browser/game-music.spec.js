import {test,expect} from '@playwright/test';
const audioDiagnostics=new WeakMap();
test.afterEach(async({page},info)=>{
 const events=audioDiagnostics.get(page);if(!events)return;
 let snapshot;try{snapshot=await page.evaluate(()=>({probe:window.__musicProbe,status:document.querySelector('.game-music')?.dataset.status,message:document.querySelector('.game-music-status')?.textContent}));}catch(error){snapshot={unavailable:String(error)};}
 await info.attach('native-audio-diagnostics',{body:Buffer.from(JSON.stringify({events,snapshot},null,2)),contentType:'application/json'});
});
async function audioProbe(page,{holdFirstActivation=false}={}){
 const events=[];audioDiagnostics.set(page,events);
 page.on('console',message=>{const text=message.text();if(text.startsWith('BUNCHO_AUDIO_AUDIT ')){try{events.push(JSON.parse(text.slice(19)));}catch{events.push({parseError:text});}}});
 page.on('pageerror',error=>events.push({type:'pageerror',message:String(error)}));
 await page.addInitScript(({holdFirstActivation})=>{
 window.__musicProbe={contexts:0,started:0,stopped:0,active:0,oscillators:0,decoded:[],connected:0};
 const report=(type,fields={})=>console.debug('BUNCHO_AUDIO_AUDIT '+JSON.stringify({type,at:performance.now(),timeOrigin:performance.timeOrigin,...fields}));
 const C=window.AudioContext||window.webkitAudioContext;if(!C){report('unavailable');return;}
 const Tracked=new Proxy(C,{construct(Target,args){
  const audio=Reflect.construct(Target,args),id=++window.__musicProbe.contexts;
  // Test-only promise gate: the real resume still happens synchronously in the
  // trusted gesture. Hold its observed completion beyond the production deadline.
  let held=holdFirstActivation&&id===1;const releases=[];
  let proto=audio,stateGetter;while(proto&&!stateGetter){stateGetter=Object.getOwnPropertyDescriptor(proto,'state')?.get;proto=Object.getPrototypeOf(proto);}
  const nativeState=()=>stateGetter.call(audio);
  if(held){Object.defineProperty(audio,'state',{configurable:true,get:()=>held?'suspended':nativeState()});window.__releaseMusicActivation=()=>{held=false;report('fixture-activation-released',{id,state:nativeState()});releases.splice(0).forEach(resolve=>resolve());};}
  const state=()=>({id,state:nativeState(),currentTime:audio.currentTime});report('context-created',state());
  audio.addEventListener('statechange',()=>report('statechange',state()));
  const resume=audio.resume.bind(audio);audio.resume=()=>{report('resume-called',state());let pending;try{pending=resume();}catch(error){report('resume-threw',{...state(),error:String(error)});throw error;}return Promise.resolve(pending).then(async value=>{report('native-resume-resolved',state());if(held)await new Promise(resolve=>releases.push(resolve));report('resume-delivered',state());return value;},error=>{report('resume-rejected',{...state(),error:String(error)});throw error;});};
  const decode=audio.decodeAudioData.bind(audio);audio.decodeAudioData=async bytes=>{report('decode-start',{...state(),bytes:bytes.byteLength});try{const b=await decode(bytes);const ch=b.getChannelData(0);let peak=0;for(let i=0;i<ch.length;i+=113)peak=Math.max(peak,Math.abs(ch[i]));window.__musicProbe.decoded.push({duration:b.duration,peak});report('decode-done',{...state(),duration:b.duration,peak});return b;}catch(error){report('decode-rejected',{...state(),error:String(error)});throw error;}};
  const createSource=audio.createBufferSource.bind(audio);audio.createBufferSource=()=>{const s=createSource(),start=s.start.bind(s),stop=s.stop.bind(s);let live=false;s.start=(...args)=>{try{const result=start(...args);live=true;window.__musicProbe.started++;window.__musicProbe.active++;report('source-start',{...state(),scheduled:args[0]??null});return result;}catch(error){report('source-start-threw',{...state(),error:String(error)});throw error;}};s.stop=(...args)=>{const result=stop(...args);if(live){live=false;window.__musicProbe.active--;window.__musicProbe.stopped++;}report('source-stop',{...state(),scheduled:args[0]??null});return result;};return s;};
  const createGain=audio.createGain.bind(audio);audio.createGain=()=>{const g=createGain(),connect=g.connect.bind(g);g.connect=(...args)=>{const result=connect(...args);if(args[0]===audio.destination)window.__musicProbe.connected++;return result;};return g;};
  const createOsc=audio.createOscillator.bind(audio);audio.createOscillator=()=>{const o=createOsc(),start=o.start.bind(o);o.start=(...args)=>{const result=start(...args);window.__musicProbe.oscillators++;report('oscillator-start',state());return result;};return o;};
  const close=audio.close.bind(audio);audio.close=()=>{report('close-called',state());return close();};return audio;
 }});
 Object.defineProperty(window,'AudioContext',{configurable:true,value:Tracked});
 if(window.webkitAudioContext)Object.defineProperty(window,'webkitAudioContext',{configurable:true,value:Tracked});
 const observe=()=>{const music=document.querySelector('.game-music');if(!music)return;const publish=()=>report('music-ui',{status:music.dataset.status,message:music.querySelector('.game-music-status')?.textContent});publish();new MutationObserver(publish).observe(music,{attributes:true,attributeFilter:['data-status'],childList:true,subtree:true});};
 // The app is a module, so wait for its asynchronously mounted music control.
 const mountObserver=new MutationObserver(()=>{if(document.querySelector('.game-music')){mountObserver.disconnect();observe();}});mountObserver.observe(document,{childList:true,subtree:true});
 },{holdFirstActivation});
}
test('first real game tap enables original music; four tracks decode, switch, mute and route cleanup',async({page},info)=>{
 test.setTimeout(150000);
 await audioProbe(page);await page.setViewportSize({width:390,height:900});await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 expect(await page.evaluate(()=>__musicProbe.contexts)).toBe(0);
 await expect(page.locator('[data-game-open-bird]')).toBeVisible();await page.locator('#menu-toggle').click();await expect.poll(()=>page.evaluate(()=>__musicProbe.contexts)).toBe(2);await expect(page.locator('#site-search')).toHaveCount(0);await expect(page.locator('#menu [data-world-action=music]')).toBeVisible();await page.keyboard.press('Escape');
 await page.locator('[data-game-open-bird]').click();await expect(page.locator('.game-music')).toHaveAttribute('data-status','playing',{timeout:30000});
 await page.locator('[data-game-care="pet"]').click();await expect.poll(()=>page.evaluate(()=>__musicProbe.oscillators)).toBeGreaterThan(0);
 await page.locator('[data-game-close-bird]').click();await page.locator('.game-music summary').click();
 for(const id of ['meadow','orchard','lakeside','village']){
  await page.locator(`[data-music="${id}"]`).click();await expect(page.locator('.game-music')).toHaveAttribute('data-status','playing',{timeout:30000});await expect(page.locator(`[data-music="${id}"]`)).toHaveAttribute('aria-pressed','true');
 }
 const probe=await page.evaluate(()=>__musicProbe);expect(probe.decoded.length).toBeGreaterThanOrEqual(4);expect(probe.decoded.every(x=>x.duration>30&&x.peak>.001)).toBe(true);expect(probe.connected).toBeGreaterThan(3);expect(probe.active).toBe(1);
 await info.attach('game-audio-world-390',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
 await page.locator('[data-music-off]').click();expect(await page.evaluate(()=>__musicProbe.active)).toBe(0);await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await page.locator('[data-game-open-bird]').click();expect(await page.evaluate(()=>__musicProbe.started)).toBe(0);
 await page.locator('[data-game-care-sound]').uncheck();await page.locator('[data-game-close-bird]').click();await page.reload();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await page.locator('[data-game-open-bird]').click();await expect(page.locator('[data-game-care-sound]')).not.toBeChecked();await page.locator('[data-game-close-bird]').click();
 await page.locator('.game-music summary').click();await page.locator('[data-music="meadow"]').click();await expect(page.locator('.game-music')).toHaveAttribute('data-status','playing',{timeout:30000});await page.locator('.game-world-exit').click();await expect(page.locator('#article-grid')).toBeVisible();await expect(page.locator('#site-search')).toHaveCount(1);expect(await page.evaluate(()=>__musicProbe.active)).toBe(0);
});
test('rapid song selection and OFF while loading never leave a later unwanted loop',async({page})=>{
 await audioProbe(page);await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await page.locator('.game-music summary').click();
 await page.locator('[data-music="orchard"]').click();await page.locator('[data-music="lakeside"]').click();await page.locator('[data-music="village"]').click();await page.locator('[data-music-off]').click();await expect(page.locator('.game-music')).toHaveAttribute('data-status','off');await page.waitForTimeout(600);expect(await page.evaluate(()=>__musicProbe.active)).toBe(0);
 await page.locator('[data-music="village"]').click();await expect(page.locator('.game-music')).toHaveAttribute('data-status','playing',{timeout:30000});await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));expect(await page.evaluate(()=>__musicProbe.active)).toBe(0);await expect(page.locator('.game-music')).toHaveAttribute('data-status','paused');
});

test('separate game menu has only world controls, restores site search, and keeps keyboard focus on repeated entry',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));});
 await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 for(let visit=0;visit<2;visit++){
  await expect(page.locator('#site-search')).toHaveCount(0);await expect(page.locator('.game-world-exit')).toBeVisible();await expect(page.locator('.site-footer')).toBeHidden();await page.locator('#menu-toggle').click();await expect(page.locator('[data-world-action]')).toHaveCount(3);await expect(page.locator('#menu nav a')).toHaveCount(0);
  await page.locator('[data-world-action=settings]').click();await expect(page.locator('.game-settings h3')).toBeFocused();await expect(page.locator('#menu')).toBeHidden();await page.locator('#menu-toggle').click();await page.locator('[data-world-action=help]').click();await expect(page.locator('.game-help h3')).toBeFocused();
  await page.locator('#menu-toggle').click();await page.locator('[data-world-action=music]').click();await expect(page.locator('.game-music')).toHaveAttribute('open','');await expect(page.locator('[data-music]').first()).toBeFocused();await page.keyboard.press('Escape');await expect(page.locator('.game-music summary')).toBeFocused();
  await page.locator('.game-world-exit').click();await expect(page.locator('#article-grid')).toBeVisible();await expect(page.locator('#site-search')).toHaveCount(1);await expect(page.locator('.site-footer')).toBeVisible();await page.locator('#menu-toggle').click();await expect(page.locator('#site-search')).toBeVisible();await page.locator('#menu-toggle').click();
  await page.goBack();await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await expect(page.locator('.world-menu-extras')).toHaveCount(1);
 }
});

test('music volume label and slider fit one row at 320px',async({page},info)=>{
 await page.setViewportSize({width:320,height:568});await page.addInitScript(()=>{localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:false}));localStorage.setItem('buncho.care-sound-choice.v1',JSON.stringify({explicit:true,enabled:false}));});
 await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');await page.locator('.game-music summary').click();
 const label=page.locator('.game-music-volume>span'),slider=page.locator('.game-music-volume input');await expect(label).toHaveText('音量');await expect(label).toHaveCSS('white-space','nowrap');const a=await label.boundingBox(),b=await slider.boundingBox();expect(b.width).toBeGreaterThan(80);expect(a.x+a.width).toBeLessThanOrEqual(b.x);expect(Math.abs(a.y+a.height/2-b.y-b.height/2)).toBeLessThan(2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);await info.attach('game-music-volume-320',{body:await page.screenshot(),contentType:'image/png'});
});


test('expired first activation stays silent until a real track retry then all four original WAVs play',async({page})=>{
 test.setTimeout(150000);await audioProbe(page,{holdFirstActivation:true});
 await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
 await page.locator('.game-music summary').click();
 await expect(page.locator('.game-music')).toHaveAttribute('data-status','error',{timeout:12000});
 await expect(page.locator('.game-music-status')).toHaveText('もう一度、曲をタップしてください');
 expect(await page.evaluate(()=>__musicProbe.started)).toBe(0);expect(await page.evaluate(()=>__musicProbe.decoded.length)).toBe(0);
 await page.evaluate(()=>window.__releaseMusicActivation());
 // Settling the old native resume must not recover by itself or play stale audio.
 await expect.poll(()=>audioDiagnostics.get(page).some(event=>event.type==='resume-delivered'&&event.id===1)).toBe(true);
 expect(await page.evaluate(()=>__musicProbe.started)).toBe(0);await expect(page.locator('.game-music')).toHaveAttribute('data-status','error');
 for(const id of ['meadow','orchard','lakeside','village']){
  await page.locator(`[data-music="${id}"]`).click();await expect(page.locator('.game-music')).toHaveAttribute('data-status','playing',{timeout:30000});await expect(page.locator(`[data-music="${id}"]`)).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(()=>__musicProbe.active)).toBe(1);
 }
 const probe=await page.evaluate(()=>__musicProbe);expect(probe.decoded).toHaveLength(4);expect(probe.decoded.every(buffer=>buffer.duration>30&&buffer.peak>.001)).toBe(true);expect(probe.started).toBe(4);expect(probe.connected).toBe(4);
 await page.locator('[data-music-off]').click();expect(await page.evaluate(()=>__musicProbe.active)).toBe(0);
 await page.locator('.game-world-exit').click();await expect(page.locator('#article-grid')).toBeVisible();expect(await page.evaluate(()=>__musicProbe.active)).toBe(0);
});
