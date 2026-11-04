import test from 'node:test';
import assert from 'node:assert/strict';
import {planMotion, sampleMotion, createActiveClock} from '../src/omochi-motion-plan.js';
const bounds = {left:0, top:0, right:1000, bottom:700};
const make = mode => planMotion({from:{x:200,y:600},to:{x:800,y:500},mode,bounds,margin:50,lift:160});
test('walking and flight reach their exact anchors without modifying inputs',()=>{
  for(const mode of ['walk','flight']) {const p=make(mode),copy=JSON.stringify(p);assert.equal(sampleMotion(p,0).x,200);const end=sampleMotion(p,1e6);assert.equal(end.x,800);assert.equal(end.y,500);assert.equal(end.frame,1);assert.equal(end.done,true);assert.equal(JSON.stringify(p),copy);}
});
test('flight has genuine airborne translation and separate preparation/landing phases',()=>{
  const p=make('flight');assert.equal(sampleMotion(p,100).frame,17);assert.equal(sampleMotion(p,400).frame,18);assert.ok(sampleMotion(p,1200).y<400);assert.equal(sampleMotion(p,2000).frame,23);assert.equal(sampleMotion(p,2300).frame,24);
});
test('all sampled routes remain in the reserved stage envelope',()=>{
  for(const mode of ['walk','flight']) {const p=make(mode);for(let t=0;t<=2400;t+=2){const s=sampleMotion(p,t);assert.ok(s.x>=50&&s.x<=950&&s.y>=50&&s.y<=650);assert.ok(Number.isInteger(s.frame)&&s.frame>=1&&s.frame<=24);}}
});
test('invalid and clipped destinations do not create a motion plan',()=>{
  assert.equal(planMotion({from:{x:5,y:5},to:{x:800,y:500},bounds,margin:50}),null);assert.equal(planMotion({from:{x:NaN,y:5},to:{x:800,y:500},bounds}),null);assert.equal(sampleMotion(null,10),null);
});
test('motion-off and reduced-motion never advance or flap the bird',()=>{
  for(const flags of [{enabled:false},{reducedMotion:true}]){const s=sampleMotion(make('flight'),1200,flags);assert.deepEqual([s.x,s.y,s.frame,s.phase],[200,600,1,'held']);}
});
test('active clock discards background intervals and caps discontinuities',()=>{
  const c=createActiveClock();c.tick(0,true);c.tick(16,true);assert.equal(c.elapsed,16);c.tick(10000,false);c.tick(10016,true);assert.equal(c.elapsed,16);c.tick(1e6,true);assert.equal(c.elapsed,66);c.reset();assert.equal(c.elapsed,0);
});
test('flight preparation stays on the initial perch and contact stays on destination',()=>{
 const p=make('flight');for(const t of [0,50,200,280]){const s=sampleMotion(p,t);assert.equal(s.x,p.from.x);assert.equal(s.y,p.from.y)}
 for(const t of [2160,2250,2399,2400]){const s=sampleMotion(p,t);assert.equal(s.x,p.to.x);assert.ok(Math.abs(s.y-p.to.y)<1e-9)}
});

