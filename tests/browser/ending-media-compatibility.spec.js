import {test,expect} from '@playwright/test';
// Isolate native decoding from game state, fake wall clocks and fullscreen.
for(const [name,file] of [['crow','omochi-ending03-approved-40.mp4'],['garden','omochi-ending02-revised-87.mp4']])for(const muted of [true,false])test(`${name} native standalone media muted=${muted}`,async({page},info)=>{
 await page.goto('');const src=new URL(`game-endings/${file}`,page.url()).href;
 await page.setContent('<video controls playsinline style="width:180px;height:320px"></video><button>Play</button>');
 await page.evaluate(({src,muted})=>{const v=document.querySelector('video');v.src=src;v.muted=muted;window.samples=[];v.__frames=0;const f=()=>{v.__frames++;v.requestVideoFrameCallback(f);};v.requestVideoFrameCallback(f);for(const e of ['play','playing','pause','waiting','stalled','error'])v.addEventListener(e,()=>window.samples.push({event:e,time:v.currentTime,paused:v.paused,ready:v.readyState,error:v.error?.message}));document.querySelector('button').onclick=()=>v.play().catch(e=>window.samples.push({playError:String(e)}));},{src,muted});
 await page.getByRole('button',{name:'Play'}).click();await page.waitForTimeout(8000);
 const state=await page.evaluate(()=>{const v=document.querySelector('video');return{time:v.currentTime,frames:v.__frames,paused:v.paused,ready:v.readyState,error:v.error?.message||null,events:window.samples};});
 await info.attach('native-standalone-diagnostics',{body:JSON.stringify(state,null,2),contentType:'application/json'});console.log(name,muted,JSON.stringify(state));expect(state.error).toBeNull();expect(state.time).toBeGreaterThan(1);expect(state.frames).toBeGreaterThan(10);
});
