import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createTrailClearance,packTrailStandingSeats} from '../src/garden-trail-clearance.js';
const plane={left:0,top:0,width:375,height:667};
const part=(left,right,top,bottom)=>({left,right,top,bottom});
const hit=part(-24,20,-50,2),label=part(15,35,3,14);
const envelope={...part(-24,35,-50,20),parts:[hit,label]};
const actor=(id,x,y=.66)=>({id,p:[x,y],route:null});
const clearance=(shapes=new Map([['a',envelope],['b',envelope]]),controls=[])=>createTrailClearance('bird-zebra-finch',
 {plane,clip:part(0,375,0,667),controls,footprints:shapes});
const a=actor('a',.36),b=actor('b',.48);

test('simultaneous stationary 44px targets keep actual art and label boxes, not phantom rectangle corners',()=>{
 const c=clearance();
 assert.ok(c.canStand(a,a.p)&&c.canStand(b,b.p));
 assert.equal(c.placementConflicts(a,b),false);
 assert.equal(c.placementConflicts(a,actor('b',.45)),true,'overlapping 44px target remains blocked');
 const shiftedUp=actor('b',.48,.678);
 assert.equal(c.placementConflicts(a,shiftedUp),true,'earlier painted label overlapping later body remains blocked');
});
test('dry ground, controls, malformed components and a moving peer retain conservative full envelopes',()=>{
 const block=part(162,169,420,428);
 assert.equal(clearance(undefined,[block]).canStand(a,a.p),false,'the clip/UI contract still reserves the whole envelope');
 assert.equal(clearance().canStand(a,[.1,.66]),false);
 const c=clearance();
 const moved={...b,state:'hop',route:{from:b.p,to:[.5,.67],height:.009}};
 assert.ok(c.sweptRoute(moved)?.length);
 assert.equal(c.placementConflicts(a,moved),true,'route rejects full-envelope collision');
 const invalid={...envelope,parts:[{left:-30,right:20,top:-50,bottom:2}]};
 assert.equal(clearance(new Map([['a',invalid],['b',envelope]])).placementConflicts(a,b),true);
});
test('bounded full standing pack still must pass genuine all-native hit callback',()=>{
 const c=clearance();
 const seats=[{id:'A',p:a.p},{id:'B',p:b.p}],actors=[a,b];
 const request={actors,seats,preferred:new Map(),canPlace(actor,seat,previous){
  const candidate={...actor,p:seat.p};
  return c.canStand(candidate,seat.p)&&
    [...previous].every(([id,other])=>!c.placementConflicts(candidate,{id,p:other.p}));
 }};
 let count=0;
 assert.equal(packTrailStandingSeats({...request,accept(){count++;return false;}}),null);
 assert.ok(count>0);
 const p=packTrailStandingSeats({...request,accept(full){return full.get('a')===seats[0];}});
 assert.equal(p.get('b'),seats[1]);
});

test('ten safe uneven rows fit measured parts, while the former filled envelope cannot fit',()=>{
 const seats=[
  ...[.37,.49,.61].map(x=>[x,.585]),
  ...[.32,.445,.57,.695].map(x=>[x,.687]),
  ...[.37,.49,.61].map(x=>[x,.789]),
 ].map((p,i)=>({id:'seat'+i,p}));
 const actors=seats.map(s=>({id:'bird'+s.id}));
 const preferred=new Map(seats.map((s,i)=>[actors[i].id,s]));
 const fullOnly={...envelope};delete fullOnly.parts;
 function fit(shape){
  const c=clearance(new Map(actors.map(a=>[a.id,shape])));
  return packTrailStandingSeats({actors,seats,preferred,canPlace(a,n,p){
   const at={...a,p:n.p};
   return c.canStand(a,n.p)&&
    [...p].every(([id,s])=>!c.placementConflicts(at,{id,p:s.p}));
  },accept(plan){return plan.size===10;}});
 }
 assert.equal(fit(fullOnly),null);
 assert.deepEqual(fit(envelope),preferred);
});
