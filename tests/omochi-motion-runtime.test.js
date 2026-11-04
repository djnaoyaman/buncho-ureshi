import test from 'node:test';import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {mountGardenFlight,flightEnvelopeSafe} from '../src/omochi-motion-runtime.js';import {planMotion} from '../src/omochi-motion-plan.js';
const clip={left:0,top:0,right:600,bottom:500};const plan=planMotion({from:{x:100,y:300},to:{x:300,y:300},mode:'flight',duration:2400,lift:80,bounds:clip});
test('actor plus label must fit entire flight corridor and avoid obstacles',()=>{const r={left:50,right:150,top:200,bottom:330};assert.equal(flightEnvelopeSafe(r,plan,clip),true);assert.equal(flightEnvelopeSafe(r,plan,clip,[{left:200,right:250,top:130,bottom:180}]),false);assert.equal(flightEnvelopeSafe({...r,top:20},plan,clip),false)});
test('explicit identity preserves other white birds, hit target, input and pause state; disposal restores styles',async()=>{const w=new Window(),d=w.document,root=d.createElement('section');let cb,id=0,enabled=true,reduced=false;w.requestAnimationFrame=f=>{cb=f;return ++id};w.cancelAnimationFrame=()=>{cb=null};w.setTimeout=f=>{cb=f;return ++id};w.clearTimeout=()=>{cb=null};w.matchMedia=()=>({get matches(){return reduced}});Object.defineProperty(d,'hidden',{value:false,configurable:true});root.innerHTML='<button data-garden-household="omochi" style="z-index:7"><span class="garden-bird-sprite"></span><span>おもち</span></button><button data-garden-household="other"><span class="garden-bird-sprite">白文鳥</span></button><input value="途中">';d.body.append(root);const button=root.firstElementChild,other=button.nextElementSibling,input=root.querySelector('input'),frames=[];const stop=mountGardenFlight({root,birdId:'omochi',plan,enabled:()=>enabled,renderFrame:(sprite,f)=>{sprite.dataset.frame=f;frames.push(f)}});try{for(let t=0;t<=1200;t+=20)cb(t);assert.notEqual(button.style.translate,'0px 0px');assert.equal(other.style.translate,'');assert.equal(root.firstElementChild,button);assert.equal(input.value,'途中');const previous=button.style.translate;enabled=false;cb(5000);assert.equal(button.style.translate,previous);reduced=true;enabled=true;cb(5010);assert.equal(button.style.translate,previous);assert.ok(frames.includes(17)&&frames.includes(18)&&frames.some(f=>f>=19&&f<=22));stop();assert.equal(button.style.translate,'');assert.equal(button.style.zIndex,'7');assert.equal(cb,null)}finally{stop();await w.happyDOM.close()}});
test('hidden/reduced motion have no scheduler; touch focus resumes; completed route uses idle polling',async()=>{
 const w=new Window(),d=w.document,root=d.createElement('section');root.innerHTML='<button data-garden-household="b1"><span class="garden-bird-sprite">TEST</span></button>';d.body.append(root);
 let time=0,hidden=false,id=0;const rafs=new Map(),timers=new Map(),listeners=new Set(),media={matches:false,addEventListener:(_t,f)=>listeners.add(f),removeEventListener:(_t,f)=>listeners.delete(f)};
 Object.defineProperty(d,'hidden',{get:()=>hidden,configurable:true});Object.defineProperty(w.performance,'now',{value:()=>time,configurable:true});
 w.matchMedia=()=>media;w.requestAnimationFrame=f=>{rafs.set(++id,f);return id};w.cancelAnimationFrame=n=>rafs.delete(n);w.setTimeout=f=>{timers.set(++id,f);return id};w.clearTimeout=n=>timers.delete(n);
 const stop=mountGardenFlight({root,birdId:'b1',plan,renderFrame:()=>{}}),bird=root.firstElementChild;
 const step=delta=>{time+=delta;const jobs=[...rafs.values(),...timers.values()];rafs.clear();timers.clear();for(const f of jobs)f(time);assert.ok(rafs.size+timers.size<=1)};
 try{
  for(let i=0;i<20;i++)step(20);const before=bird.style.translate;
  hidden=true;d.dispatchEvent(new w.Event('visibilitychange'));assert.equal(rafs.size+timers.size,0);time+=60000;hidden=false;d.dispatchEvent(new w.Event('visibilitychange'));step(16);assert.equal(bird.style.translate,before);
  media.matches=true;for(const f of listeners)f();assert.equal(rafs.size+timers.size,0);media.matches=false;for(const f of listeners)f();
  bird.dispatchEvent(new w.PointerEvent('pointerdown',{pointerType:'touch',bubbles:true}));bird.focus();step(20);const held=bird.style.translate;bird.dispatchEvent(new w.PointerEvent('pointerup',{pointerType:'touch',bubbles:true}));step(20);step(20);assert.notEqual(bird.style.translate,held);
  for(let i=0;i<200;i++)step(20);assert.equal(rafs.size,0);assert.equal(timers.size,1);
  stop();assert.equal(rafs.size+timers.size,0);assert.equal(listeners.size,0);
 }finally{stop();await w.happyDOM.close()}
});
test('DOM redraw holds flight position and pointer lock until release',async()=>{
 const w=new Window(),d=w.document,root=d.createElement('section');
 root.innerHTML='<button data-garden-household="b1"><span class="garden-bird-sprite">original</span></button><input value="未保存の入力">';d.body.append(root);
 let time=0,id=0;const jobs=new Map();Object.defineProperty(w.performance,'now',{value:()=>time,configurable:true});Object.defineProperty(d,'hidden',{value:false,configurable:true});w.matchMedia=()=>({matches:false});
 w.requestAnimationFrame=w.setTimeout=f=>{jobs.set(++id,f);return id};w.cancelAnimationFrame=w.clearTimeout=n=>jobs.delete(n);
 const step=()=>{time+=20;const pending=[...jobs.values()];jobs.clear();for(const f of pending)f(time)};
 const stop=mountGardenFlight({root,birdId:'b1',plan,renderFrame:(el,frame)=>{el.dataset.frame=String(frame)}});
 try{
  for(let i=0;i<50;i++)step();let bird=root.firstElementChild;const position=bird.style.translate,frame=bird.firstElementChild.dataset.frame;
  bird.dispatchEvent(new w.PointerEvent('pointerdown',{bubbles:true,pointerType:'touch'}));step();
  const replacement=d.createElement('button');replacement.dataset.gardenHousehold='b1';replacement.innerHTML='<span class="garden-bird-sprite">refreshed</span>';bird.replaceWith(replacement);bird=replacement;
  step();assert.equal(bird.style.translate,position);assert.equal(bird.firstElementChild.dataset.frame,frame);
  for(let i=0;i<20;i++)step();assert.equal(bird.style.translate,position);assert.equal(root.querySelector('input').value,'未保存の入力');
  d.dispatchEvent(new w.PointerEvent('pointerup',{bubbles:true,pointerType:'touch'}));step();step();assert.notEqual(bird.style.translate,position);
  stop();assert.equal(bird.style.translate,'');assert.equal(bird.firstElementChild.textContent,'refreshed');
 }finally{stop();await w.happyDOM.close()}
});
test('invalid corridor geometry fails closed',()=>{
 const rect={left:50,right:150,top:200,bottom:330};
 for(const invalid of [{...plan,lift:NaN},{...plan,from:{}},{...plan,to:{x:Infinity,y:1}},{...plan,lift:-1}])assert.equal(flightEnvelopeSafe(rect,invalid,clip),false);
});

