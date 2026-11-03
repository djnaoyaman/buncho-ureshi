import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { mountGardenBirdMotion, renderGardenBirdSprite } from '../src/garden-bird-motion.js';
const rect=(left,top,width,height)=>({left,top,right:left+width,bottom:top+height,width,height});
async function fixture(t, width=390) {
 const w=new Window(),d=w.document,root=d.createElement('section');
 root.innerHTML=`<div class="finch-garden"><div class="finch-garden-stage"><div class="finch-garden-slide"><div class="finch-garden-image-plane"><button class="finch-garden-friend">${renderGardenBirdSprite('white','a')}</button><button class="finch-garden-household">${renderGardenBirdSprite('sakura','b')}</button><button class="finch-garden-visitor">visitor</button></div></div></div><details><summary>Tools</summary></details></div>`;
 d.body.append(root);
 for(const n of root.querySelectorAll('.finch-garden-stage,.finch-garden-slide')) n.getBoundingClientRect=()=>rect(0,0,width,400);
 const [a,b,visitor]=root.querySelectorAll('button');
 a.getBoundingClientRect=()=>rect(45,140,64,80); b.getBoundingClientRect=()=>rect(155,140,64,80); visitor.getBoundingClientRect=()=>rect(260,40,50,60);
 const intervals=new Map(),rafs=new Map(),mediaListeners=new Set(); let now=0,id=0,hidden=false,enabled=true;
 const media={matches:false,addEventListener:(_t,f)=>mediaListeners.add(f),removeEventListener:(_t,f)=>mediaListeners.delete(f)};
 Object.defineProperty(d,'hidden',{get:()=>hidden}); Object.defineProperty(w.performance,'now',{value:()=>now,configurable:true});
 w.matchMedia=()=>media; w.setInterval=(f,ms)=>{assert.equal(ms,1000);intervals.set(++id,f);return id;}; w.clearInterval=id=>intervals.delete(id);
 w.requestAnimationFrame=f=>{rafs.set(++id,f);return id;};w.cancelAnimationFrame=id=>rafs.delete(id);
 const dispose=mountGardenBirdMotion(root,{enabled:()=>enabled});
 t.after(async()=>{dispose();await w.happyDOM.close();});
 return {w,d,root,a,b,visitor,intervals,rafs,dispose,step(ms=1000){now+=ms;const callbacks=[...intervals.values(),...rafs.values()];rafs.clear();for(const f of callbacks)f();assert.ok(intervals.size+rafs.size<=1);},hide(v){hidden=v;d.dispatchEvent(new w.Event('visibilitychange'));},reduce(v){media.matches=v;for(const f of mediaListeners)f();},enable(v){enabled=v;},event(node,type){node.dispatchEvent(new w.Event(type,{bubbles:true}));}};
}
for(const width of [320,390]) test(`${width}px geometry fixture uses one scheduler, whole targets and unchanged DOM`,async t=>{
 const f=await fixture(t,width),image=f.a.querySelector('img'),sprite=f.a.firstElementChild,visitor=f.visitor.outerHTML;
 let clicks=0;f.b.addEventListener('click',()=>clicks++);
 for(let n=0;n<6;n++)f.step();
 assert.equal(f.rafs.size,1);assert.equal(f.intervals.size,0);
 const before=parseFloat(f.a.style.translate);f.step(16);assert.ok(parseFloat(f.a.style.translate)>before);
 assert.equal(f.a.firstElementChild,sprite);assert.equal(f.a.querySelector('img'),image);assert.equal(f.visitor.outerHTML,visitor);
 f.b.click();assert.equal(clicks,1);
 for(let n=0;n<300;n++)f.step(16);
 assert.equal(f.rafs.size,0);assert.equal(f.intervals.size,1);
 assert.ok(parseFloat(f.a.style.translate)<=20);assert.ok(parseFloat(f.b.style.translate)>=-20);
});
test('pointer and focused household hold current position and poses without catch-up',async t=>{
 const f=await fixture(t);for(let n=0;n<6;n++)f.step();
 const pos=f.b.style.translate,pose=f.b.firstElementChild.dataset.pose;
 f.event(f.b,'pointerover');f.event(f.b,'pointerdown');for(let n=0;n<10;n++)f.step();
 assert.equal(f.b.style.translate,pos);assert.equal(f.b.firstElementChild.dataset.pose,pose);assert.equal(f.rafs.size,0);
 f.event(f.b,'pointerout');for(let n=0;n<3;n++)f.step();assert.equal(f.b.style.translate,pos);
 f.event(f.d,'pointercancel');f.d.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'Tab',bubbles:true}));f.b.focus();for(let n=0;n<3;n++)f.step();assert.equal(f.b.style.translate,pos);
 f.b.blur();f.step();assert.equal(f.b.style.translate,pos);f.step();assert.notEqual(f.b.style.translate,pos);
});
test('tools, care sheet, pause, hidden and reduced motion suspend and cleanup restores styles',async t=>{
 const f=await fixture(t);for(let n=0;n<6;n++)f.step();const pos=f.a.style.translate;
 const details=f.root.querySelector('details');details.open=true;f.step(16);for(let n=0;n<5;n++)f.step();assert.equal(f.a.style.translate,pos);
 details.open=false;const sheet=f.d.createElement('dialog');sheet.className='game-bird-sheet';sheet.setAttribute('open','');f.d.body.append(sheet);f.step();assert.equal(f.a.style.translate,pos);sheet.remove();
 f.enable(false);f.step();assert.equal(f.a.style.translate,pos);
 f.hide(true);assert.equal(f.rafs.size+f.intervals.size,0);f.step(60000);f.hide(false);f.reduce(true);assert.equal(f.rafs.size+f.intervals.size,0);
 f.enable(true);f.reduce(false);f.step(16);assert.ok(Math.abs(parseFloat(f.a.style.translate)-parseFloat(pos))<.2);
 f.dispose();f.dispose();assert.equal(f.rafs.size+f.intervals.size,0);assert.equal(f.a.style.translate,'');
 f.event(f.a,'pointerover');f.hide(true);f.hide(false);assert.equal(f.rafs.size+f.intervals.size,0);
});
test('replaced roster restores old nodes and starts new presentation without stale offsets',async t=>{
 const f=await fixture(t);for(let n=0;n<6;n++)f.step();assert.notEqual(f.a.style.translate,'');
 const old=f.a,clone=old.cloneNode(true);clone.querySelector('.garden-bird-sprite').dataset.gardenBirdId='new-roster-bird';clone.style.removeProperty('translate');clone.getBoundingClientRect=old.getBoundingClientRect;old.replaceWith(clone);f.step(16);
 assert.equal(old.style.translate,'');assert.equal(parseFloat(clone.style.translate),0);
});
test('resize defers geometry rebasing under a pointer and safely rejects new overlap',async t=>{
 const f=await fixture(t);for(let n=0;n<6;n++)f.step();const pos=f.a.style.translate;
 f.event(f.a,'pointerover');f.b.getBoundingClientRect=()=>rect(90,140,64,80);f.w.dispatchEvent(new f.w.Event('resize'));
 f.step();assert.equal(f.a.style.translate,pos);
 f.event(f.a,'pointerout');f.step();assert.equal(f.a.style.translate,'');assert.equal(f.b.style.translate,'');
 assert.equal(f.rafs.size,0);assert.equal(f.intervals.size,1);
});
test('same bird nodes replaced every 2 seconds retain social elapsed time and approach',async t=>{
 const f=await fixture(t);let sawApproach=false;
 for(let seconds=1;seconds<=12;seconds++) {
  if(seconds%2===0) for(const old of f.root.querySelectorAll('.finch-garden-friend,.finch-garden-household')) {
   const next=old.cloneNode(true);next.style.removeProperty('translate');next.getBoundingClientRect=old.getBoundingClientRect;old.replaceWith(next);
  }
  f.step(1000);
  const current=f.root.querySelector('.finch-garden-friend');
  if(seconds>=5&&parseFloat(current.style.translate)>0)sawApproach=true;
 }
 assert.equal(sawApproach,true);
 assert.ok(parseFloat(f.root.querySelector('.finch-garden-friend').style.translate)>0);
});
test('actual garden navigation resets presentation even when actor IDs remain identical',async t=>{
 const f=await fixture(t);for(let n=0;n<6;n++)f.step();assert.ok(parseFloat(f.a.style.translate)>0);
 f.root.querySelector('.finch-garden-stage').dataset.gardenId='another-garden';f.step(16);
 assert.equal(parseFloat(f.a.style.translate),0);
});

test('touch release and restored focus resume while keyboard Tab focus remains frozen',async t=>{
 const f=await fixture(t);for(let n=0;n<6;n++)f.step();
 const touch=type=>f.b.dispatchEvent(new f.w.PointerEvent(type,{pointerType:'touch',bubbles:true}));
 touch('pointerover');touch('pointerdown');f.b.focus();const before=f.b.style.translate;
 f.step();assert.equal(f.b.style.translate,before);
 touch('pointerup');f.b.blur();f.b.focus();f.step();f.step();
 assert.notEqual(f.b.style.translate,before,'touch-restored focus must not freeze motion');
 f.d.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'Tab',bubbles:true}));
 const keyboard=f.b.style.translate;for(let n=0;n<4;n++)f.step();assert.equal(f.b.style.translate,keyboard);
});
test('depth and hops use uniform whole-button scale, sprite-only lift and restore all owned styles',async t=>{
 const f=await fixture(t);for(let n=0;n<5;n++)f.step();
 let sawHop=false,sawDepth=false;
 for(let n=0;n<160;n++){f.step(16);const y=parseFloat(f.a.style.translate.split(' ')[1]);if(Math.abs(y)>0)sawDepth=true;if(parseFloat(f.a.firstElementChild.style.translate.split(' ')[1])<-.1)sawHop=true;assert.ok(Math.abs(y)<=4);assert.ok(Math.abs(parseFloat(f.a.style.scale)-1)<=.0121);}
 assert.equal(sawDepth,true);assert.equal(sawHop,true);
 const sprite=f.a.firstElementChild;f.dispose();for(const prop of ['translate','scale','transform-origin','z-index'])assert.equal(f.a.style.getPropertyValue(prop),'');assert.equal(sprite.style.translate,'');
});
