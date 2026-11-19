import {test,expect} from '@playwright/test';
const ids=['bird-white-headed-munia'];
async function mount(page,rate){
 await page.goto('credits/');
 await page.evaluate(async({rate,ids})=>{
  const base=new URL('.',document.baseURI).href;
  const [{createGameMusic},{GARDEN35_MUSIC}]=await Promise.all([import(base+'src/game-music.js'),import(base+'src/data/garden35-music.js')]);
  const Native=window.AudioContext||window.webkitAudioContext;let context,analyser;
  const starts=[],buffers=[],requests=[];
  class Context extends Native{
   constructor(){super({sampleRate:rate});context=this;analyser=this.createAnalyser();analyser.fftSize=2048;analyser.connect(this.destination);}
   async decodeAudioData(bytes){const b=await super.decodeAudioData(bytes);buffers.push(b);return b;}
   createGain(){const g=super.createGain(),connect=g.connect.bind(g);g.connect=node=>connect(node===this.destination?analyser:node);return g;}
   createBufferSource(){const s=super.createBufferSource(),start=s.start.bind(s),stop=s.stop.bind(s);let row;
    s.start=(when=0,offset=0)=>{row={at:Math.max(this.currentTime,when),end:Infinity,startOffset:offset,loopStart:s.loopStart,loopEnd:s.loopEnd,buffer:buffers.indexOf(s.buffer),rate:s.buffer.sampleRate};starts.push(row);start(when,offset);};
    s.stop=(when=0)=>{if(row)row.end=Math.max(this.currentTime,when);stop(when);};return s;
   }
  }
  const values=new Map();const p=createGameMusic({base,Context,storage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},fetcher:async(...args)=>{requests.push(args[0]);return fetch(...args);}});
  const host=document.createElement('main');host.style='position:fixed;inset:0;z-index:999999;background:white;overflow:auto';document.body.replaceChildren(host);
  let garden=ids[0];const scene=encounter=>p.setScene({gardenId:garden,worldId:'test',encounter});
  const actions={other:()=>{garden='komorebi';return scene(null);},play:()=>p.playCurrentFromGesture(),off:()=>p.off(),pause:()=>p.pause(),crow:()=>scene('crow'),raptor:()=>scene('raptor'),return:()=>scene(null),mute:()=>p.setVolume(0),volume:()=>p.setVolume(.18)};
  for(const id of ids)actions[id]=()=>{garden=id;return scene(null);};
  for(const [id,fn] of Object.entries(actions)){const b=document.createElement('button');b.id=id;b.textContent=id;b.style='min-height:44px;max-width:100%';b.onclick=e=>{if(e.isTrusted)void fn();};host.append(b);}
  window.five={p,starts,requests,values,time:()=>context.currentTime,catalog:GARDEN35_MUSIC,output:()=>{const a=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(a);return Math.sqrt(a.reduce((sum,x)=>sum+x*x,0)/a.length);},active:()=>starts.filter(s=>s.at<=context.currentTime&&s.end>context.currentTime).length,
   render:async()=>{const results=[];for(const row of starts.slice(0,ids.length)){
    const b=buffers[row.buffer],period=row.loopEnd-row.loopStart,Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;
    const offline=new Offline(2,Math.ceil((period*3+.05)*rate),rate),s=offline.createBufferSource();s.buffer=b;s.loop=true;s.loopStart=row.loopStart;s.loopEnd=row.loopEnd;s.connect(offline.destination);s.start(0,row.startOffset);
    const out=await offline.startRendering();for(let c=0;c<2;c++){const a=out.getChannelData(c);for(let cycle=1;cycle<=3;cycle++){
     const k=Math.round(period*cycle*rate),radius=Math.round(.01*rate);let sum=0,peak=0;for(let i=k-radius;i<k+radius;i++){sum+=a[i]*a[i];peak=Math.max(peak,Math.abs(a[i]));}
     results.push({track:row.buffer,channel:c,cycle,jump:Math.abs(a[k]-a[k-1]),rms:Math.sqrt(sum/(radius*2)),peak});
    }}
   }return results;}};
 },{rate,ids});
}
async function playing(page,id){await expect.poll(()=>page.evaluate(()=>five.p.state().selected+':'+five.p.state().status)).toBe(id+':playing');await expect.poll(()=>page.evaluate(()=>five.active())).toBe(1);}
for(const rate of [44100,48000])test(`approved Homichi loop, three native rendered cycles and scene recovery at ${rate} Hz`,async({page},info)=>{
 test.setTimeout(180000);await page.setViewportSize({width:375,height:667});await mount(page,rate);
 await page.locator('#bird-white-headed-munia').click();expect(await page.evaluate(()=>five.requests.length)).toBe(0);
 await page.locator('#play').click();
 for(const id of ids){if(id!==ids[0])await page.locator(`#${id}`).click();await playing(page,'garden-'+id);await expect.poll(()=>page.evaluate(()=>five.output())).toBeGreaterThan(.0001);
  const r=await page.evaluate(id=>({start:five.starts.at(-1),m:five.catalog[id],url:five.requests.at(-1)}),id);
  expect(r.url.endsWith(r.m.asset)).toBe(true);expect(r.start.rate).toBe(rate);expect(r.start.startOffset).toBe(.02);expect(r.start.loopStart).toBe(.02);expect(r.start.loopEnd).toBe(r.m.loopEndSeconds);
 }
 const rendered=await page.evaluate(()=>five.render());expect(rendered).toHaveLength(6);for(const r of rendered){expect(r.jump).toBeLessThan(.03);expect(r.rms).toBeGreaterThan(.004);expect(r.peak).toBeLessThan(.98);}
 await info.attach('five-three-cycle-native-PCM',{body:Buffer.from(JSON.stringify(rendered)),contentType:'application/json'});
 for(const encounter of ['crow','raptor']){await page.locator('#'+encounter).click();await playing(page,'encounter-'+encounter);await page.locator('#return').click();await playing(page,'garden-bird-white-headed-munia');expect(await page.evaluate(()=>five.starts.at(-1).startOffset)).toBe(.02);}
 await page.locator('#other').click();await playing(page,'garden-komorebi');await page.locator('#bird-white-headed-munia').click();await playing(page,'garden-bird-white-headed-munia');
 await page.locator('#mute').click();await expect.poll(()=>page.evaluate(()=>five.output())).toBeLessThan(.00001);expect(await page.evaluate(()=>five.active())).toBe(1);
 await page.locator('#volume').click();await expect.poll(()=>page.evaluate(()=>five.output())).toBeGreaterThan(.0001);
 await page.locator('#pause').click();await page.locator('#bird-white-headed-munia').click();expect(await page.evaluate(()=>five.active())).toBe(0);
 await page.locator('#play').click();await playing(page,'garden-bird-white-headed-munia');expect(await page.evaluate(()=>five.starts.at(-1).startOffset)).toBe(.02);
 await page.locator('#off').click();await page.locator('#bird-white-headed-munia').click();expect(await page.evaluate(()=>five.active())).toBe(0);expect(await page.evaluate(()=>five.p.state().enabled)).toBe(false);
 await page.evaluate(()=>five.p.dispose());
});
for(const id of ids)test(`real-time output crosses three complete loops without restarting: ${id}`,async({page},info)=>{
 test.setTimeout(100000);await mount(page,48000);await page.locator('#'+id).click();await page.locator('#play').click();await playing(page,'garden-'+id);
 const result=await page.evaluate(async()=>{
  const row=five.starts[0],period=row.loopEnd-row.loopStart,windows=[[],[],[]];
  await new Promise(resolve=>{const timer=setInterval(()=>{const elapsed=five.time()-row.at;for(let i=0;i<3;i++)if(Math.abs(elapsed-period*(i+1))<.12)windows[i].push(five.output());if(elapsed>3*period+.15){clearInterval(timer);resolve();}},10);});
  return {period,windows,starts:five.starts.length,active:five.active(),state:five.p.state()};
 });
 expect(result.starts).toBe(1);expect(result.active).toBe(1);expect(result.state.status).toBe('playing');for(const window of result.windows){expect(window.length).toBeGreaterThan(2);expect(Math.min(...window)).toBeGreaterThan(.0001);}
 await info.attach('three-realtime-loop-boundaries',{body:Buffer.from(JSON.stringify(result)),contentType:'application/json'});await page.evaluate(()=>five.p.dispose());
});
for(const width of [320,375,402])test(`actual game Homichi garden routing and music settings at ${width}px`,async({page})=>{
 test.setTimeout(180000);await page.setViewportSize({width,height:width===320?568:844});
 for(const id of ids){
  await page.goto('credits/');await page.evaluate(async id=>{
   const base=new URL('.',document.baseURI).href;const [{createWorld},{openGameStore},{GARDENS}]=await Promise.all([import(base+'src/engine.js'),import(base+'src/game-store.js'),import(base+'src/data/gardens.js')]);
   const w=createWorld(Date.now());w.encounters.garden.open=true;w.encounters.garden.id=id;w.encounters.garden.scene=GARDENS.find(g=>g.id===id).scene;w.field.place='park';w.settings.motion=false;w.settings.careSound=false;
   const store=await openGameStore();await store.transact(()=>w);store.close();localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:true,mode:'auto',selected:'meadow',volume:.18}));
  },id);
  await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done');
  await page.locator('.game-scene-controls-toggle').click();await expect(page.locator('.game-music')).toHaveAttribute('data-status','playing',{timeout:20000});
  const title=await page.evaluate(async id=>(await import(new URL('src/data/garden35-music.js',document.baseURI))).GARDEN35_MUSIC[id].title,id);
  await expect(page.locator('.game-music-current')).toContainText(title);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.evaluate(()=>document.dispatchEvent(new CustomEvent('buncho-world-action',{detail:'settings'})));
  await expect(page.locator('[data-music-auto]')).toHaveAttribute('aria-pressed','true');
  await page.locator('[data-music-choose]').click();const choice=page.locator('[data-music="garden-'+id+'"]').last();await expect(choice).toHaveAttribute('aria-pressed','false');await choice.click();await expect(choice).toHaveAttribute('aria-pressed','true');await expect(page.locator('.game-music-current')).toContainText(title);
  await page.locator('[data-music-off]').click();await expect(page.locator('.game-music')).toHaveAttribute('data-status','off');
 }
});
