import test from 'node:test';
import assert from 'node:assert/strict';
import {packTrailStandingSeats,createTrailClearance} from '../src/garden-trail-clearance.js';
import {conflictSweeps} from '../src/garden-actor-path.js';
const id='bird-zebra-finch';

test('the only large visitor spot is assigned first, with no overlaps, ten IDs, and the measured 44px native footprint',()=>{
 const actors=Array.from({length:10},(_,i)=>({id:'b'+i}));
 const p=actors.map((a,i)=>({id:'s'+i,p:[.3+(i%4)*.12,.60+Math.floor(i/4)*.1]}));
 const footprints = new Map(actors.map(a=>[a.id,{left:-23.76,right:20.24,top:-51,bottom:18}]));
 footprints.set('b9',{left:-23.76,right:20.24,top:-80,bottom:18});
 const actual = createTrailClearance(id,{plane:{left:0,top:0,width:420,height:770},clip:{left:0,top:0,right:420,bottom:770},controls:[],footprints});
 const byID = new Map(actors.map(a=>[a.id,a]));
 const canPlace = (a,n,others)=>{
  if(a.id==='b9'&&n.id!=='s0')return false;
  if(!actual.canStand(a,n.p))return false;
  const proposed=actual.sweptRoute({...a,p:n.p});
  return [...others].every(([id,spot])=>!conflictSweeps(proposed,actual.sweptRoute({...byID.get(id),p:spot.p})));
 };
 const result=packTrailStandingSeats({actors,seats:p,preferred:new Map(),canPlace});
 assert.equal(result.size,10);assert.equal(result.get('b9').id,'s0');
 assert.equal(new Set([...result.values()].map(n=>n.id)).size,10);
 for(const [actor,spot] of result)assert.equal(canPlace(byID.get(actor),spot,new Map([...result].filter(([id])=>id!==actor))),true);
});

test('valid native preferred seat is retained while clipped seat is replaced atomically',()=>{
 const actors=[{id:'a'},{id:'b'}],seats=[{id:'left',p:[.4,.6]},{id:'right',p:[.5,.7]}];
 const preferred=new Map([['a',seats[0]],['b',{id:'covered',p:[.6,.8]}]]);
 const before=structuredClone(preferred);
 const result=packTrailStandingSeats({actors,seats,preferred,canPlace:(a,n)=>n.id!=='covered'});
 assert.deepEqual([...result],[['a',seats[0]],['b',seats[1]]]);
 assert.deepEqual(preferred,before);
 assert.equal(packTrailStandingSeats({actors,seats:seats.slice(0,1),preferred,canPlace:(a,n)=>n.id!=='covered'}),null);
 assert.deepEqual(preferred,before);
});

test('real complete-plan hit rejection can fall through to another plan and cannot be silently accepted',()=>{
 const actors=[{id:'a'}],seats=[{id:'covered',p:[.4,.6]},{id:'open',p:[.5,.7]},{id:'unprobed',p:[.6,.7]}];
 const attempts=[];
 const plan=packTrailStandingSeats({actors,seats,preferred:new Map(),canPlace:()=>true,maxProbes:2,accept(plan){
  const n=plan.get('a');attempts.push(n.id);return n.id==='open';
 }});
 assert.equal(plan.get('a').id,'open');assert.deepEqual(attempts,['covered','open']);
 const refused=packTrailStandingSeats({actors,seats,preferred:new Map(),canPlace:()=>true,maxProbes:2,accept(plan){return plan.get('a').id==='unprobed';}});
 assert.equal(refused,null);
});
