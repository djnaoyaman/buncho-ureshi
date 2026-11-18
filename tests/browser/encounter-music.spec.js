import {test,expect} from '@playwright/test';
async function fixture(page,sampleRate=44100){
 await page.goto('credits/');
 await page.evaluate(async sampleRate=>{
  const {createGameMusic}=await import(new URL('src/game-music.js',document.baseURI));
  const Native=window.AudioContext||window.webkitAudioContext;const probe={starts:[],decoded:[]};let ctx;
  class Context extends Native{
   constructor(){super({sampleRate});ctx=this;}
   async decodeAudioData(bytes){const b=await super.decodeAudioData(bytes);const a=b.getChannelData(0);probe.decoded.push({duration:b.duration,rate:b.sampleRate,peak:Math.max(...a.subarray(10000,20000).map(Math.abs)),seam:Math.abs(a[0]-a.at(-1))});return b;}
   createBufferSource(){const s=super.createBufferSource(),start=s.start.bind(s),stop=s.stop.bind(s);let row;
    s.start=(when=0)=>{row={at:Math.max(this.currentTime,when),stopAt:Infinity,loop:s.loop};probe.starts.push(row);return start(when);};
    s.stop=(when=0)=>{if(row)row.stopAt=Math.max(this.currentTime,when);return stop(when);};return s;
   }
  }
  const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
  const p=createGameMusic({base:new URL('.',document.baseURI).href,Context,storage});
  const host=document.createElement('div');host.style='position:fixed;inset:0;background:white;z-index:999999';document.body.append(host);
  const scene=encounter=>p.setScene({gardenId:null,worldId:'native-fixture',encounter});
  for(const [id,fn]of Object.entries({play:()=>p.playCurrentFromGesture(),crow:()=>scene('crow'),raptor:()=>scene('raptor'),leave:()=>scene(null),off:()=>p.off(),pause:()=>p.pause(),fixed:()=>p.playFromGesture('village')})){
   const b=document.createElement('button');b.id=id;b.textContent=id;b.onclick=e=>{if(e.isTrusted)void fn();};host.append(b);
  }
  window.music={p,probe,scene,values,snapshot:()=>({state:p.state(),active:probe.starts.filter(s=>s.at<=ctx.currentTime&&s.stopAt>ctx.currentTime).length,probe})};
 },sampleRate);
}
const playing=async(page,id)=>{await expect.poll(()=>page.evaluate(()=>music.p.state().selected+':'+music.p.state().status)).toBe(id+':playing');await expect.poll(()=>page.evaluate(()=>music.snapshot().active)).toBe(1);};
for(const rate of [44100,48000])test(`native encounter WAV loops and priority at ${rate} Hz`,async({page},info)=>{
 await fixture(page,rate);await page.locator('#crow').click();expect(await page.evaluate(()=>music.probe.starts.length)).toBe(0);
 await page.locator('#play').click();await playing(page,'encounter-crow');await page.locator('#fixed').click();await playing(page,'encounter-crow');
 expect(await page.evaluate(()=>JSON.parse(music.values.get('buncho.music.v1')).selected)).toBe('village');
 await page.locator('#raptor').click();await playing(page,'encounter-raptor');
 const report=await page.evaluate(()=>music.snapshot());for(const d of report.probe.decoded){expect(d.duration).toBeGreaterThan(30.4);expect(d.peak).toBeGreaterThan(.001);expect(d.rate).toBe(rate);expect(d.seam).toBeLessThan(.03);}expect(report.probe.starts.every(s=>s.loop)).toBe(true);
 await page.locator('#leave').click();await playing(page,'village');await page.locator('#pause').click();await page.locator('#crow').click();expect(await page.evaluate(()=>music.snapshot().active)).toBe(0);
 await page.locator('#play').click();await playing(page,'encounter-crow');await page.locator('#off').click();await page.locator('#raptor').click();expect(await page.evaluate(()=>music.snapshot().active)).toBe(0);
 await info.attach('native-encounter-pcm',{body:Buffer.from(JSON.stringify(report)),contentType:'application/json'});await page.evaluate(()=>music.p.dispose());
});
test('actual crow controller announces warning and cancellation',async({page})=>{
 await page.goto('credits/');
 await page.evaluate(async()=>{
  const base=new URL('.',document.baseURI).href;
  const [{createWorld},{mountEncounterPanel},{arriveGardenCrow}]=await Promise.all(['engine','encounter-controller','garden-crows'].map(x=>import(base+'src/'+x+'.js')));
  const w=createWorld(Date.now());w.encounters.garden.open=true;w.encounters.gardenFriends.accompany=true;w.encounters.gardenFriends.attendees=[w.protagonist.birdId];w.encounters.gardenFriends.companions=[w.protagonist.birdId];
  const root=document.createElement('main');document.body.replaceChildren(root);window.warnings=[];
  const panel=mountEncounterPanel(root,{getWorld:()=>w,initialMode:'garden',sharedPredatorClock:true,base,onCrowWarning:v=>warnings.push(v),transact:async fn=>fn(w)});
  window.encounter={panel,w,arriveGardenCrow};
 });
 await expect(page.locator('.finch-garden-stage')).toHaveAttribute('data-scene-state','ready');
 expect(await page.evaluate(()=>encounter.panel.startCrowWarning('large-billed-crow'))).toBe(true);
 expect(await page.evaluate(()=>warnings.at(-1))).toBe(true);await page.evaluate(()=>encounter.panel.notebook());expect(await page.evaluate(()=>warnings.at(-1))).toBe(false);
 await page.evaluate(()=>encounter.panel.destroy());
});

test('full game raptor arrival, settings fixed choice, pause and home restore',async({page})=>{
 await page.goto('credits/');
 await page.evaluate(async()=>{
  const base=new URL('.',document.baseURI).href;
  const [{createWorld},{arriveGardenRaptor,raptorToken},{openGameStore}]=await Promise.all(['engine','garden-raptors','game-store'].map(x=>import(base+'src/'+x+'.js')));
  const w=createWorld(Date.now());w.encounters.garden.open=true;w.field.place='park';w.settings.motion=false;w.settings.careSound=false;
  w.encounters.gardenFriends.accompany=true;w.encounters.gardenFriends.attendees=['b1'];w.encounters.gardenFriends.companions=['b1'];
  arriveGardenRaptor(w,'black-kite',Date.now(),{...raptorToken(w),gardenId:w.encounters.garden.id});
  const store=await openGameStore();await store.transact(()=>w);store.close();localStorage.setItem('buncho.music.v1',JSON.stringify({enabled:true,mode:'fixed',selected:'village',volume:.1}));
 });
 await page.goto('game/');await expect(page.locator('body')).toHaveAttribute('data-game-intro','done',{timeout:15000});
 await page.locator('[data-raptor-choice=stay]').click();
 await page.locator('.game-scene-controls-toggle').click();await expect(page.locator('.game-music')).toHaveAttribute('data-status','playing',{timeout:15000});
 await expect(page.locator('.game-music-current')).toContainText('空に落ちる影');
 await page.evaluate(()=>document.dispatchEvent(new CustomEvent('buncho-world-action',{detail:'settings'})));
 await page.locator('[data-music-choose]').click();await page.locator('[data-music=village]').click();await expect(page.locator('.game-music-current')).toContainText('空に落ちる影');
 await page.locator('[data-game-action=pause]').last().click();await expect(page.locator('.game-music')).toHaveAttribute('data-status','paused');
 await page.locator('[data-music-off]').click();await expect(page.locator('.game-music')).toHaveAttribute('data-status','off');
 await page.locator('[data-game-action=pause]').last().click();
 await page.locator('[data-game-raptor-home]').first().click();await expect(page.locator('[data-raptor-notice]')).toHaveCount(0);
 await page.evaluate(()=>document.dispatchEvent(new CustomEvent('buncho-world-action',{detail:'settings'})));
 await page.locator('[data-music-choose]').click();await page.locator('[data-music=village]').click();
 await expect(page.locator('.game-music')).toHaveAttribute('data-status','playing');await expect(page.locator('.game-music-current')).toContainText('村のワルツ');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('buncho.music.v1')).mode)).toBe('fixed');
});
