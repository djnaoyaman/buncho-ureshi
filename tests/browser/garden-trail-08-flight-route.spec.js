import {test,expect} from '@playwright/test';
import {setup,snapshotGarden} from '../fixtures/garden-terrain-browser.js';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';

test.use({hasTouch:true,trace:'off',screenshot:'off',video:'off'});
test.setTimeout(150000);
for(const color of ['white','sakura','cinnamon','silver'])test('#08 real path and paint '+color,async({page},info)=>{
 let verdict='setup';
 try{
  await page.addInitScript(()=>{
   let bird=null,stage=null,route=null,queued=false;
   const decode=new Map(),visible=e=>!!e&&getComputedStyle(e).visibility==='visible'&&e.getBoundingClientRect().width>0;
   const remember=(img,key)=>{
    if(!img.complete||!img.naturalWidth||decode.has(key))return;
    decode.set(key,img.decode().then(()=>key,()=>null));
   };
   const read=()=>{
    queued=false;
    const b=document.querySelector('[data-garden-household=b1]'),s=document.querySelector('.finch-garden-stage');
    const state=b?.dataset.actorState,phase=b?.dataset.actorPhase,target=b?.dataset.actorLanding;
    if(!route&&state==='fly'&&target){
     bird=b;stage=s;route={source:b.dataset.actorNode,target,phases:{},result:null};
    }
    if(!route||route.result)return route;
    if(/geometry-blocked|trail-blocked-geometry|trail-needs-recovery/.test(s?.dataset.actorMotion??'')){route.result='geometry-rejected';return route;}
    if(b!==bird||s!==stage){route.result='scene-replaced';return route;}
    if(target&&target!==route.target){route.result='rerouted';return route;}
    if(!target&&phase==='ground'){route.result=b.dataset.actorNode===route.target?'landed':'wrong-contact';return route;}
    if(state!=='fly'||!target)return route;
    if(phase)route.phases[phase]??=performance.now();
    if(!['rise','flap'].includes(phase))return route;
    const sp=b.querySelector('.garden-bird-sprite'),canvas=sp?.querySelector('.garden-actor-flight');
    if(!visible(canvas)||!sp?.querySelector('[data-terrain-flight-active]'))return route;
    const w=canvas.querySelector('[data-white-flight-frame]'),parts=[...canvas.querySelectorAll('[data-texture]')];
    if(w){
     if(visible(w)&&w.dataset.frame)remember(w,'white:'+w.dataset.frame);
    }else if(parts.length===4&&parts.every(p=>p.dataset.texture===sp.dataset.color&&visible(p))){
     const atlas=sp.querySelector('img');if(atlas)remember(atlas,sp.dataset.color);
    }
    return route;
   };
   new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(read);}}).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['data-actor-state','data-actor-phase','data-actor-node','data-actor-landing','data-actor-motion']});
   Object.defineProperty(window,'__qa08Read',{value:read});
   Object.defineProperty(window,'__qa08Paint',{value:()=>Promise.all([...decode.values()])});
  });
  await setup(page,'bird-red-avadavat',402,true,true,{trailPreview:true,height:874,afterOpenMs:0,leadColor:color});
  const beginning=await page.evaluate(()=>performance.now());
  const read=()=>page.evaluate(()=>window.__qa08Read());
  await page.clock.runFor(1000);
  let route;
  verdict='launch-timeout';
  for(let i=0;i<=200;i++){
   route=await read();if(route)break;
   if(i!==200)await page.clock.runFor(100);
  }
  expect(route).toBeTruthy();
  verdict='completion-timeout';
  for(let i=0;i<=46;i++){
   route=await read();if(route.result)break;
   if(i!==46)await page.clock.runFor(100);
  }
  if(route.result&&route.result!=='landed')verdict=route.result;
  expect(route.result).toBe('landed');
  verdict='phase-absent';
  expect(['rise','flap','contact'].every(p=>Object.hasOwn(route.phases,p))).toBe(true);
  verdict='paint-not-visible-decoded';
  let timeout;
  const decoded=await Promise.race([page.evaluate(()=>window.__qa08Paint()),new Promise(resolve=>{timeout=setTimeout(()=>resolve([]),3000);})]).finally(()=>clearTimeout(timeout));
  const available=new Set(decoded.filter(Boolean));
  expect(color==='white'?[...available].filter(x=>x.startsWith('white:')).length>=2:available.has(color)).toBe(true);
  verdict='landing-native';
  const {birds}=await snapshotGarden(page);
  expect(birds).toHaveLength(1);
  expect(birds[0]).toMatchObject({id:'b1',actorNode:route.target,hit:true,centerInViewport:true});
  expect(route.target).not.toBe(route.source);
  verdict=route.phases.contact-beginning>21000?'pass-late-contact':'pass';
 }finally{
  const dir=process.env.TYPE2_CHECKPOINT_DIR,project=info.project.name;
  if(!dir||!['chrome','webkit'].includes(project))throw Error('Named draft runs only');
  writeFileSync(join(dir,project+'-08-route-'+color),verdict+'\n',{mode:0o600,flag:'wx'});
 }
});
