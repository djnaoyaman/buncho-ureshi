import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseGardenPair, gardenPairFrame, movedGardenRect, SOCIAL_PERIOD } from '../src/garden-social-plan.js';
const rect = (left, top=80, width=64, height=80) => ({ left, top, right:left+width, bottom:top+height });
const clip={left:0,top:0,right:400,bottom:300};
const birds=[{id:'a',kind:'friend',rect:rect(60)},{id:'b',kind:'household',rect:rect(180)}];
const allowed=new Set(['left','right','back','preen','peck','tilt','rest']);

test('chooses a measurable approach with bounded travel and deterministic identity',()=>{
 const p=chooseGardenPair(birds,clip);
 assert.deepEqual(p,chooseGardenPair(birds,clip)); assert.equal(p.travel,20);
 assert.equal(chooseGardenPair(birds,clip,{maxTravel:30}).travel,22);
 assert.equal(chooseGardenPair(birds,clip,{maxTravel:Infinity}).travel,20);
 assert.equal(chooseGardenPair(birds,clip,{maxTravel:0}),null);
});
test('visitor and family portraits never become actors',()=>{
 for(const kind of ['visitor','family','unknown']) assert.equal(chooseGardenPair([birds[0],{...birds[1],kind}],clip),null);
});
test('interaction locks exclude a pair, and locked birds still block movement',()=>{
 assert.equal(chooseGardenPair([birds[0],{...birds[1],locked:true}],clip),null);
 assert.equal(chooseGardenPair([...birds,{id:'lock',kind:'friend',locked:true,rect:rect(135)}],clip),null);
});
test('visitor bounds and UI obstacles prevent overlap throughout the sweep',()=>{
 assert.equal(chooseGardenPair(birds,clip,{obstacles:[rect(132)]}),null);
 assert.ok(chooseGardenPair(birds,clip,{obstacles:[rect(300)]}));
});
test('invalid, clipped, already overlapping and vertically distant pairs stay still',()=>{
 assert.equal(chooseGardenPair(birds,null),null);
 assert.equal(chooseGardenPair(birds,{...clip,left:65}),null);
 assert.equal(chooseGardenPair([birds[0],{...birds[1],rect:rect(100)}],clip),null);
 assert.equal(chooseGardenPair([birds[0],{...birds[1],rect:rect(180,180)}],clip),null);
 assert.equal(chooseGardenPair([birds[0],{...birds[1],rect:rect(NaN)}],clip),null);
});
test('all samples retain hitbox clearance, clip, approved poses and travel bounds',()=>{
 const p=chooseGardenPair(birds,clip,{maxTravel:40});
 for(let cycle=0;cycle<8;cycle++) for(let t=0;t<SOCIAL_PERIOD;t+=17){
  const f=gardenPairFrame(p,t,cycle),a=movedGardenRect(birds[0].rect,f.a.x),b=movedGardenRect(birds[1].rect,f.b.x);
  assert.ok(a.right+8<=b.left+1e-9); assert.ok(a.left>=clip.left&&b.right<=clip.right);
  assert.ok(allowed.has(f.a.pose)&&allowed.has(f.b.pose));
  assert.ok(f.a.x>=0&&f.a.x<=p.travel&&f.b.x<=0&&f.b.x>=-p.travel);
 }
});
test('choreography is continuous at each movement phase boundary',()=>{
 const p=chooseGardenPair(birds,clip);
 for(let cycle=0;cycle<4;cycle++) for(const t of [4000,8000,10000,13000,13500,16000,20000,28000]) {
  const before=gardenPairFrame(p,t-.001,cycle),after=gardenPairFrame(p,t,cycle);
  assert.ok(Math.abs(before.a.x-after.a.x)<.001,`${cycle}/${t}`);
 }
});
test('only one in four cycles quarrels; quiet preen and rest return to exact anchors',()=>{
 const p=chooseGardenPair(birds,clip);
 assert.deepEqual(new Set(Array.from({length:4},(_,c)=>gardenPairFrame(p,11000,c).kind)),new Set(['greeting','preen','nudge','quarrel']));
 for(let c=0;c<4;c++) {
  const f=gardenPairFrame(p,24000,c); assert.equal(f.a.x,0); assert.equal(f.b.x,-0);
  assert.deepEqual(new Set([f.a.pose,f.b.pose]),new Set(['preen','rest']));
 }
});
test('no RNG use, input mutation or invalid-time contamination',()=>{
 const frozen=birds.map(b=>Object.freeze({...b,rect:Object.freeze({...b.rect})}));
 const old=Math.random; Math.random=()=>{throw new Error('world RNG must not be touched');};
 try {const p=chooseGardenPair(frozen,clip);assert.deepEqual(gardenPairFrame(p,NaN),gardenPairFrame(p,0));assert.deepEqual(gardenPairFrame(p,-999),gardenPairFrame(p,0));}
 finally {Math.random=old;}
 assert.equal(gardenPairFrame(null),null); assert.equal(gardenPairFrame({travel:Infinity}),null);
});
test('depth, perspective and staggered hops stay within the reserved envelope and are continuous',()=>{
 const p=chooseGardenPair(birds,clip);assert.equal(p.depth,4);assert.equal(p.hop,3);
 let hop=false,stagger=false;
 for(let t=0;t<28000;t+=13){const f=gardenPairFrame(p,t);for(const b of [f.a,f.b]){assert.ok(Math.abs(b.y)<=4);assert.ok(b.hop>=-3&&b.hop<=0);assert.ok(b.scale>=.988&&b.scale<=1.012);}if(f.a.hop<-.1)hop=true;if(Math.abs(f.a.hop-f.b.hop)>.1)stagger=true;}
 assert.ok(hop&&stagger);
 for(const time of [4000,4550,4970,6050,6470,8000,13000,13500,16000,16550,16970,18050,18470,20000,28000]){
  const a=gardenPairFrame(p,time-.001),b=gardenPairFrame(p,time);for(const key of ['y','hop','scale'])assert.ok(Math.abs(a.a[key]-b.a[key])<.001);
 }
});
test('limited vertical clearance safely falls back to grounded horizontal motion',()=>{
 const p=chooseGardenPair(birds,{...clip,top:80,bottom:160});assert.ok(p);assert.equal(p.depth,0);assert.equal(p.hop,0);
});
