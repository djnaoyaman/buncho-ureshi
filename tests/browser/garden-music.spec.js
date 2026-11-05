import {test,expect} from '@playwright/test';

// This fixture enables readiness ONLY in an in-memory copy. It uses the production
// player, native AudioContext/decodeAudioData and unchanged real MP3/WAV responses.
// It does not prove subjective listening, physical iOS playback, or release readiness.
const GARDEN_IDS=['komorebi','mizukagami','komugi','hanadokei','kazaguruma','yuyake','tsukiakari','shrine-grove','onsen','java-rice','bali-terrace','paris-unrest'];
const ORIGINAL_IDS=['meadow','orchard','lakeside','village'];

async function mountNativeGardenFixture(page,sampleRate=null){
 await page.goto('credits/');
 await page.evaluate(async sampleRate=>{
  const [{createGameMusic,MUSIC_TRACKS},{GARDEN_ASSETS}]=await Promise.all([
   import(new URL('src/game-music.js',document.baseURI).href),
   import(new URL('src/data/garden-assets.js',document.baseURI).href),
  ]);
  const Native=window.AudioContext||window.webkitAudioContext;
  if(typeof Native!=='function')throw Error('Native AudioContext is unavailable');
  const probe={contexts:0,decoded:[],starts:[],connections:0,trusted:[],requests:[]};
  const decodedIds=new WeakMap();let context,outputAnalyser;
  class AuditedContext extends Native{
   constructor(){super(sampleRate?{sampleRate}:{});context=this;probe.contexts++;}
   async decodeAudioData(bytes){
    const decoded=await super.decodeAudioData(bytes),samples=decoded.getChannelData(0);let peak=0,sum=0,count=0;
    for(let i=0;i<samples.length;i+=97){const value=samples[i];peak=Math.max(peak,Math.abs(value));sum+=value*value;count++;}
    const index=probe.decoded.length;decodedIds.set(decoded,index);
    probe.decoded.push({duration:decoded.duration,sampleRate:decoded.sampleRate,length:decoded.length,peak,rms:Math.sqrt(sum/count)});return decoded;
   }
   createBufferSource(){
    const source=super.createBufferSource(),start=source.start.bind(source),stop=source.stop.bind(source);let record;
    source.start=(when=0,...rest)=>{record={decoded:decodedIds.get(source.buffer),at:Math.max(this.currentTime,when),stopAt:null,ended:false,loop:source.loop,loopStart:source.loopStart,loopEnd:source.loopEnd};probe.starts.push(record);return start(when,...rest);};
    source.stop=(when=0)=>{if(record)record.stopAt=Math.max(this.currentTime,when);return stop(when);};
    source.addEventListener('ended',()=>{if(record)record.ended=true;});return source;
   }
   createGain(){const gain=super.createGain(),connect=gain.connect.bind(gain);gain.connect=(...args)=>{if(args[0]===this.destination){probe.connections++;outputAnalyser=this.createAnalyser();outputAnalyser.fftSize=2048;connect(outputAnalyser);outputAnalyser.connect(this.destination);return outputAnalyser;}return connect(...args);};return gain;}
  }
  const assets=structuredClone(GARDEN_ASSETS),originalFlags=Object.fromEntries(Object.entries(GARDEN_ASSETS).map(([id,a])=>[id,a.music.releaseReady]));
  for(const asset of Object.values(assets))asset.music.releaseReady=true;
  const root=document.createElement('section');root.id='native-garden-music-fixture';
  root.style.cssText='position:fixed;inset:0;z-index:2147483647;overflow:auto;background:white;color:black;padding:24px;display:block';
  const title=document.createElement('h1');title.textContent='Native garden music verification';root.append(title);
  const status=document.createElement('pre');status.id='garden-music-fixture-state';root.append(status);
  const storageValues=new Map(),storage={getItem:key=>storageValues.get(key)||null,setItem:(key,value)=>storageValues.set(key,value)};
  const player=createGameMusic({base:new URL('.',document.baseURI).href,gardenAssets:assets,Context:AuditedContext,storage,onChange:state=>{status.textContent=JSON.stringify(state);},fetcher:(url,options)=>{probe.requests.push(url);return fetch(url,options);}});
  const add=(id,label,action)=>{const button=document.createElement('button');button.id=id;button.type='button';button.textContent=label;button.style.cssText='display:inline-block;min-width:120px;min-height:44px;margin:5px';button.addEventListener('click',event=>{probe.trusted.push(event.isTrusted);if(event.isTrusted)void action();});root.append(button);};
  add('garden-music-auto','庭にあわせる',()=>player.playAutoFromGesture());
  add('garden-music-off','音楽をオフ',()=>player.off());
  add('garden-music-leave','家へ戻る',()=>player.setGarden(null,'fixture-world'));
  for(const [id,asset] of Object.entries(assets))add(`garden-music-${id}`,id,()=>player.setGarden(id,'fixture-world'));
  for(const track of MUSIC_TRACKS)add(`garden-fixed-${track.id}`,track.title,()=>player.playFromGesture(track.id));
  document.body.append(root);
  window.__gardenMusicFixture={player,probe,originalFlags,assets,output:()=>{if(!outputAnalyser)return 0;const samples=new Float32Array(outputAnalyser.fftSize);outputAnalyser.getFloatTimeDomainData(samples);return Math.sqrt(samples.reduce((sum,x)=>sum+x*x,0)/samples.length);},snapshot:()=>({state:player.state(),contexts:probe.contexts,decoded:probe.decoded,starts:probe.starts,connections:probe.connections,trusted:probe.trusted,requests:probe.requests,active:probe.starts.filter(s=>!s.ended&&s.at<=(context?.currentTime||0)&&(s.stopAt===null||s.stopAt>(context?.currentTime||0))).length})};
  status.textContent=JSON.stringify(player.state());
 },sampleRate);
}
async function playing(page,selected){
 await expect.poll(()=>page.evaluate(()=>{const s=window.__gardenMusicFixture.player.state();return {status:s.status,selected:s.selected,error:s.error};}),{timeout:30000}).toEqual({status:'playing',selected,error:''});
 await expect.poll(()=>page.evaluate(()=>window.__gardenMusicFixture.snapshot().active),{timeout:10000}).toBe(1);
}

test.describe('twelve garden MP3 native playback, test-only readiness preview',()=>{
 test.skip(({browserName})=>browserName==='firefox','This new scope targets native Chrome, Edge and WebKit.');
 test.setTimeout(180000);
 test.afterEach(async({page})=>{await page.evaluate(()=>window.__gardenMusicFixture?.player.dispose());});

 for(const sampleRate of [44100,48000])test(`all twelve real MP3s produce output PCM at ${sampleRate} Hz with sample-safe loop bounds`,async({page},info)=>{
  await mountNativeGardenFixture(page,sampleRate);
  expect(await page.evaluate(()=>window.__gardenMusicFixture.snapshot().contexts)).toBe(0);
  await page.locator('#garden-music-komorebi').click();
  expect(await page.evaluate(()=>window.__gardenMusicFixture.snapshot().contexts)).toBe(0);
  await page.locator('#garden-music-auto').click();
  for(const id of GARDEN_IDS){
   if(id!=='komorebi')await page.locator(`#garden-music-${id}`).click();
   await playing(page,`garden-${id}`);
   await expect.poll(()=>page.evaluate(()=>window.__gardenMusicFixture.output()),{timeout:10000}).toBeGreaterThan(.0001);
   const result=await page.evaluate(id=>{const fixture=window.__gardenMusicFixture,snapshot=fixture.snapshot(),start=snapshot.starts.at(-1),decoded=snapshot.decoded[start.decoded];return {music:fixture.assets[id].music,start,decoded,state:snapshot.state,active:snapshot.active};},id);
   expect(result.state.mode).toBe('auto');expect(result.active).toBe(1);expect(result.start.loop).toBe(true);
   expect(result.start.loopStart).toBeCloseTo(result.music.loopStartSeconds,8);
   expect(result.decoded.sampleRate).toBe(sampleRate);
   expect(result.start.loopEnd).toBeLessThanOrEqual(result.decoded.duration);
   expect(Math.abs(result.start.loopEnd-result.music.loopEndSeconds)).toBeLessThanOrEqual(1/sampleRate+1e-12);
   expect(result.music.loopEndSeconds-result.decoded.duration).toBeLessThanOrEqual(1/sampleRate+1e-12);
   expect(result.decoded.duration).toBeLessThan(result.music.loopEndSeconds+.1);
   expect(result.decoded.peak).toBeGreaterThan(.001);expect(result.decoded.rms).toBeGreaterThan(.0001);
  }
  const report=await page.evaluate(()=>({snapshot:window.__gardenMusicFixture.snapshot(),originalFlags:window.__gardenMusicFixture.originalFlags}));
  expect(report.snapshot.decoded).toHaveLength(12);expect(report.snapshot.connections).toBe(12);
  expect(report.snapshot.requests).toHaveLength(12);expect(report.snapshot.requests.every(url=>/audio\/gardens\/[^/]+\.mp3$/.test(url))).toBe(true);
  expect(report.snapshot.trusted.every(Boolean)).toBe(true);
  expect(Object.values(report.originalFlags)).toEqual(Array(12).fill(false));
  await info.attach('twelve-garden-native-audio-measurements',{body:Buffer.from(JSON.stringify(report,null,2)),contentType:'application/json'});
 });

 test('garden arrival replaces each fixed choice, OFF dominates and home restores chosen original',async({page},info)=>{
  await mountNativeGardenFixture(page);
  for(const id of ORIGINAL_IDS){
   await page.locator('#garden-music-leave').click();
   await page.locator(`#garden-fixed-${id}`).click();await playing(page,id);
   const before=await page.evaluate(()=>window.__gardenMusicFixture.snapshot().requests.length);
   await page.locator('#garden-music-onsen').click();await playing(page,'garden-onsen');
   expect(await page.evaluate(()=>window.__gardenMusicFixture.snapshot().requests.length)).toBe(before+1);
   expect(await page.evaluate(()=>window.__gardenMusicFixture.player.state().mode)).toBe('auto');
   const arrived=await page.evaluate(()=>window.__gardenMusicFixture.snapshot().starts.length);
   await page.locator('#garden-music-onsen').click();
   expect(await page.evaluate(()=>window.__gardenMusicFixture.snapshot().starts.length)).toBe(arrived);
  }
  await page.locator('#garden-music-auto').click();await playing(page,'garden-onsen');
  await page.locator('#garden-music-leave').click();await playing(page,'village');
  await page.locator('#garden-music-off').click();
  const requests=await page.evaluate(()=>window.__gardenMusicFixture.snapshot().requests.length);
  for(const id of ['komorebi','mizukagami','onsen'])await page.locator(`#garden-music-${id}`).click();
  await expect.poll(()=>page.evaluate(()=>window.__gardenMusicFixture.snapshot().active)).toBe(0);
  const report=await page.evaluate(()=>window.__gardenMusicFixture.snapshot());
  expect(report.state.enabled).toBe(false);expect(report.state.status).toBe('off');expect(report.requests).toHaveLength(requests);
  await info.attach('garden-fixed-off-native-audio',{body:Buffer.from(JSON.stringify(report,null,2)),contentType:'application/json'});
 });

 test('rapid auto changes keep only latest real garden decode and OFF cancels a pending selection',async({page},info)=>{
  await mountNativeGardenFixture(page);await page.locator('#garden-music-auto').click();await playing(page,'meadow');
  // Delay real response delivery, not the bytes/decoder. This exercises the native
  // player's stale network/decode queue without replacing any recording.
  await page.route('**/audio/gardens/*.mp3',async route=>{try{const response=await route.fetch();await new Promise(resolve=>setTimeout(resolve,250));await route.fulfill({response});}catch(error){if(!/abort|cancel|closed|disposed|invalid interception/i.test(String(error)))throw error;}});
  const previousStarts=await page.evaluate(()=>window.__gardenMusicFixture.snapshot().starts.length);
  await page.locator('#garden-music-komorebi').click();await page.locator('#garden-music-mizukagami').click();await page.locator('#garden-music-onsen').click();
  await playing(page,'garden-onsen');
  const latest=await page.evaluate(()=>window.__gardenMusicFixture.snapshot());
  expect(latest.starts.length).toBe(previousStarts+1);expect(latest.active).toBe(1);
  const endpoint=await page.evaluate(()=>window.__gardenMusicFixture.assets.onsen.music.loopEndSeconds);
  expect(latest.starts.at(-1).loopEnd).toBeCloseTo(endpoint,8);
  await page.locator('#garden-music-komugi').click();await page.locator('#garden-music-off').click();await page.waitForTimeout(500);
  const stopped=await page.evaluate(()=>window.__gardenMusicFixture.snapshot());
  expect(stopped.state.status).toBe('off');expect(stopped.active).toBe(0);expect(stopped.starts).toHaveLength(latest.starts.length);
  await info.attach('garden-rapid-native-audio',{body:Buffer.from(JSON.stringify(stopped,null,2)),contentType:'application/json'});
 });
});

