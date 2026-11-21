import assert from 'node:assert/strict';
import test from 'node:test';
import {createGardenActorMotion,selectFootholds} from '../src/garden-actor-motion.js';
import {inside} from '../src/garden-terrain-plan.js';
import {actorTerrainFor} from '../src/data/garden-actor-terrain.js';
const box=(l,t,w,h)=>({left:l,top:t,right:l+w,bottom:t+h,width:w,height:h});
const collides=(r,b)=>r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom+20>b.top;
const terrain=actorTerrainFor('bird-japanese-grosbeak');
function fixture(count){
 let clip=box(0,0,402,874), plane=box(-44.94,0,491.875,874), births=0, jog=null, leaf=null;
 const nodes=Array.from({length:count},(_,i)=>({
  dataset:{gardenActorId:'b'+i},style:{},
  querySelector:()=>null,getBoundingClientRect:()=>box(0,0,64,75),
  getAttribute(name){return name==='style'?'native-'+i:null;},
  setAttribute(name,value){this.style={};this.native=value;},
  removeAttribute(attr){delete this.dataset[attr.replace(/^data-/,'').replace(/-(\w)/g,(_,ch)=>ch.toUpperCase())];},
  parentElement:{append(){}},
 }));
 const planeNode={querySelectorAll:()=>nodes,getBoundingClientRect:()=>plane};
 const slide={getBoundingClientRect:()=>clip};
 const stage={dataset:{gardenId:'bird-japanese-grosbeak',sceneState:'ready'},querySelector:s=>s.endsWith('plane')?planeNode:slide,getBoundingClientRect:()=>clip};
 const win={CSS:{supports:()=>true},innerWidth:402,innerHeight:874};
 const root={dataset:{},querySelector:s=>s.endsWith('stage')?stage:null,querySelectorAll:s=>[
  ...(jog&&s.includes('.garden-jog-cylinder > button[data-jog-center]')?[{getBoundingClientRect:()=>jog}]:[]),
  ...(leaf&&s.includes('.leaf-gift > summary')?[{getBoundingClientRect:()=>leaf}]:[]),
 ],ownerDocument:{defaultView:win,createElement(){births++;return {style:{},setAttribute(){},remove(){}};}}};
 const a=createGardenActorMotion(root);
 return {nodes,stage,births:()=>births,step:(time=100,opts={})=>a.step(time,true,new Map(),opts),
  layout:(c,p,j=null,l=null)=>{clip=c;plane=p;win.innerWidth=c.width;win.innerHeight=c.height;jog=j;leaf=l;},
  inspect(){
   for(const b of nodes){
    const p=[parseFloat(b.style.left)/100,parseFloat(b.style.top)/100];
    assert.ok(inside(p,terrain.surface),b.dataset.gardenActorId);
    const width=parseFloat(b.style.width),height=parseFloat(b.style.height);
    assert.ok(width>=44);
    assert.equal(b.style.marginBlockStart,'0px'); // see style model below
    const x=plane.left+p[0]*plane.width,y=plane.top+p[1]*plane.height;
    const r=box(x-width*.54,y-height*.975,width,height);
    assert.ok(r.left>=clip.left+2&&r.right<=clip.right-2&&r.top>=clip.top+2&&r.bottom+20<=clip.bottom-2);
    for(const obstacle of [jog,leaf])if(obstacle)assert.ok(!collides(r,obstacle),JSON.stringify({r,obstacle}));
   }
   assert.equal(new Set(nodes.map(n=>n.dataset.actorNode)).size,nodes.length);
  }};
}
test('authored exact fallback finds complete packing when preferred greedy blocks two valid ends',()=>{
 const candidates=[{x:5},{x:0},{x:10}];
 assert.deepEqual(selectFootholds(candidates,2,(a,b)=>Math.abs(a.x-b.x)>6).map(n=>n.x),[0,10]);
});
test('five at trace portrait plane, then genuine shortage removes stale fit once, then recovers same IDs',()=>{
 const f=fixture(5),ids=f.nodes.map(n=>n.dataset.gardenActorId);
 f.step();f.inspect();
 f.layout(box(0,0,80,100),box(0,0,80,100));
 assert.equal(f.step(),false);assert.equal(f.stage.dataset.actorMotion,'insufficient-space');
 assert.ok(f.nodes.every(n=>n.native&&n.style.transform===undefined));
 const n=f.births();f.step();assert.equal(f.births(),n);
 f.layout(box(0,0,402,874),box(-44.94,0,491.875,874));
 f.step(5000,{geometryOnly:true});f.inspect();
 assert.deepEqual(f.nodes.map(n=>n.dataset.gardenActorId),ids);
 assert.ok(f.nodes.every(n=>n.dataset.actorState==='rest'&&n.dataset.actorPhase==='ground'));
});
test('ten at real trace landscape plane, avoid projected jog and leaf obstacle model',()=>{
 const f=fixture(10);
 // Plane from exact WebKit trace. Only observed hit centers were recorded,
 // so the control rectangles below are model fixtures, not claimed measured.
 f.layout(box(0,0,667,375),box(0,-621.406,667,1185.141),box(250,80,165,23),box(467,113,23,24));
 f.step();f.inspect();
});

test('CSS controls-rise margin offsets rendered anchor, so animated ownership zeros it',()=>{
 const height=64*1000/850,foot=180;
 const modelTop=foot-height*.975;
 const cssComputedNativeMargin=-48;
 assert.equal(Math.round((modelTop+cssComputedNativeMargin)-modelTop),-48);
 const f=fixture(5);f.step();
 assert.ok(f.nodes.every(n=>n.style.marginBlockStart==='0px'));
});

for(const reduced of [true,false])test(reduced?'visible reduced motion runs a standalone geometry-only frame':'active motion shares its already scheduled RAF with resize and observer',async t=>{
 const {Window}=await import('happy-dom');
 const {mountGardenBirdMotion}=await import('../src/garden-bird-motion.js');
 const window=new Window(),doc=window.document,root=doc.createElement('div');
 doc.body.append(root);
 let clip=box(0,0,402,874), plane=box(-44.94,0,491.875,874), callback, observer;
 Object.defineProperty(doc,'hidden',{value:false,configurable:true});
 Object.defineProperty(window,'innerWidth',{get:()=>clip.width,configurable:true});
 Object.defineProperty(window,'innerHeight',{get:()=>clip.height,configurable:true});
 window.matchMedia=()=>({matches:reduced,addEventListener(){},removeEventListener(){}});
 let id=0;const raf=new Map();
 window.requestAnimationFrame=f=>{raf.set(++id,f);return id;};
 window.cancelAnimationFrame=n=>raf.delete(n);
 window.setInterval=()=>assert.fail('reduced motion must not start playback interval');
 window.ResizeObserver=class{
  constructor(f){callback=f;observer=this;this.targets=[];}
  observe(n){this.targets.push(n);}
  disconnect(){this.targets=[];}
 };
 root.innerHTML='<section class="finch-garden"><div class="finch-garden-stage" data-scene-state="ready" data-garden-id="bird-japanese-grosbeak"><div class="finch-garden-slide"><div class="finch-garden-image-plane"><button class="finch-garden-household" data-garden-actor-id="b1"></button></div></div></div></section>';
 const stage=root.querySelector('.finch-garden-stage'),slide=root.querySelector('.finch-garden-slide'),image=root.querySelector('.finch-garden-image-plane'),bird=root.querySelector('button');
 stage.getBoundingClientRect=slide.getBoundingClientRect=()=>clip;
 image.getBoundingClientRect=()=>plane;
 bird.getBoundingClientRect=()=>box(0,0,64,75);
 const dispose=mountGardenBirdMotion(root);t.after(async()=>{dispose();await window.happyDOM.close();});
 assert.deepEqual(observer.targets,[stage,image]);assert.equal(raf.size,reduced?0:1);
 const oldRAF=[...raf.keys()][0];
 clip=box(0,0,667,375);plane=box(0,-621.406,667,1185.141);
 window.dispatchEvent(new window.Event('resize'));callback([{target:stage,contentRect:clip}]);callback([{target:image,contentRect:plane}]);
 assert.equal(raf.size,1);
 const [n,f]=[...raf][0];if(!reduced)assert.equal(n,oldRAF);
 raf.delete(n);f();assert.equal(raf.size,reduced?0:1);
 assert.equal(stage.dataset.actorMotion,reduced?'held':'active');assert.equal(bird.dataset.actorPhase,'ground');assert.equal(root.querySelector('button'),bird);
 callback([{target:stage,contentRect:clip},{target:image,contentRect:plane}]);assert.equal(raf.size,reduced?0:1);
 window.dispatchEvent(new window.Event('resize'));assert.equal(raf.size,1);
 Object.defineProperty(doc,'hidden',{value:true,configurable:true});doc.dispatchEvent(new window.Event('visibilitychange'));assert.equal(raf.size,0);
 Object.defineProperty(doc,'hidden',{value:false,configurable:true});window.dispatchEvent(new window.Event('resize'));assert.equal(raf.size,1);
 dispose();assert.equal(raf.size,0);assert.deepEqual(observer.targets,[]);
 doc.body.removeChild(root);callback([{target:image}]);assert.equal(raf.size,0);
});
