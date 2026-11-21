import assert from 'node:assert/strict';
import test from 'node:test';
import {createGardenActors} from '../src/garden-actor-state.js';
import {trailTerrainFor} from '../src/data/garden-trail-terrain.js';

const {entryCandidates:[A,B],lane,pullouts:[bay]}=trailTerrainFor('bird-zebra-finch');
const path=[A,...lane,B],nodes=[{id:'A',p:A},{id:'X',p:[.8,.82]},{id:'B',p:B},{id:'bay',p:bay}];
const defs=[{id:'owner',movable:true},{id:'partner',movable:true}];
const env={safe:()=>true,width:375,planeHeight:667};
function setup(){
 const m=createGardenActors('authored #07');
 m.reconcile(defs,nodes);
 return m;
}

test('exact surveyed bends are traversed and touched in both directions; candidates are validation and runtime samples',()=>{
 for(const reverse of [false,true]){
  const m=setup(),origin=nodes[reverse?2:0],target=nodes[reverse?0:2];
  const owner=m.actors.get('owner'); owner.p=[...origin.p];owner.node=origin.id;
  const points=reverse?[...path].reverse():path;
  let sampled,validated;
  assert.equal(m.beginHopPath('owner',target,points,{...env,safe:a=>{
   validated=a.route; sampled=m.sampleRoute(a); return true;
  }}),true);
  assert.equal(owner.route,validated);
  assert.deepEqual(m.sampleRoute(owner),sampled);
  assert.equal(m.reservations.get(target.id),'owner'); assert.equal(owner.node,origin.id);
  for(const p of points)assert.ok(sampled.some(f=>Math.hypot(p[0]-f.p[0],p[1]-f.p[1])<1e-10&&Math.abs(f.height)<1e-10));
  assert.ok(sampled.some(f=>f.height>.011));
  const {dx,...landed}=sampled.at(-1);assert(Number.isFinite(dx));
  assert.deepEqual(landed,{p:target.p,height:0,phase:'contact'});
  m.advance(owner.end,nodes,{...env,safe:()=>false});
  assert.deepEqual(owner.p,target.p); assert.equal(owner.node,target.id);assert.equal(m.reservations.size,0);
 }
});

test('native validation refusal and invalid endpoints leave the actor and reservations unchanged',()=>{
 const m=setup(),owner=m.actors.get('owner'), before=structuredClone(owner);
 let calls=0;
 assert.equal(m.beginHopPath('owner',nodes[2],[A,bay],{...env,safe:()=>{calls++;return true;}}),false);
 assert.equal(calls,0);
 assert.equal(m.beginHopPath('owner',nodes[2],path,{...env,safe:a=>{calls++;return !m.sampleRoute(a).some(f=>Math.abs(f.p[0]-lane[0][0])<1e-10&&Math.abs(f.p[1]-lane[0][1])<1e-10);}}),false);
 assert.equal(calls,1);
 assert.deepEqual(owner,before);
 assert.equal(m.reservations.size,0);
});

test('origin and destination occupancy still gate native moves; arrival and removal retain identity',()=>{
 const m=setup(),owner=m.actors.get('owner'), partner=m.actors.get('partner');
 assert.equal(m.beginHopPath('owner',nodes[2],path,env),true);
 assert.equal(m.beginHopPath('partner',nodes[2],[nodes[1].p,B],env),false);
 assert.equal(m.beginHopPath('partner',nodes[0],[nodes[1].p,A],env),false);
 m.reconcile([...defs,{id:'guest'}],nodes);
 assert.equal(m.actors.get('guest').node,'bay');
 assert.equal(m.actors.get('owner'),owner);
 m.reconcile(defs.slice(1),nodes);
 assert.equal(m.reservations.size,0); assert.equal(m.actors.get('partner'),partner);
});

test('per-hop sweep refuses between-frame stationary overlaps and asynchronous crossings',async()=>{
 const {sweptHopSpans,conflictSweeps}=await import('../src/garden-actor-path.js');
 const body=([x,y],lift)=>({left:x-.001,right:x+.001,top:y-.001-lift,bottom:y+.001-lift});
 const mover=sweptHopSpans([[0,.5],[.5,.5],[1,.5]],body,.07);
 assert.equal(conflictSweeps(mover,[body([.123,.5],0)]),true);
 const crossing=sweptHopSpans([[.123,.3],[.123,.5],[.123,.7]],body,.02);
 assert.equal(conflictSweeps(mover,crossing),true);
 assert.equal(conflictSweeps(mover,[body([.123,.3],0)]),false);
});
test('rounded flight still measures actual simulated path and refuses before reserving a blocked bend',()=>{
 const m=setup(),a=m.actors.get('owner');a.canFly=true;
 const flight={...env,height:.055};
 assert.equal(m.beginFlightPath(a.id,nodes[2],path,{...flight,safe:c=>!m.sampleRoute(c).some(f=>f.height>.05)}),false);
 assert.equal(m.reservations.size,0);
 assert.equal(m.beginFlightPath(a.id,nodes[2],path,flight),true);
 const sample=m.sampleRoute(a);
 for(const phase of ['crouch','push','rise','flap','brake','feet','contact','fold'])assert.ok(sample.some(s=>s.phase===phase),phase);
 assert.deepEqual(sample[0].p,A);assert.deepEqual(sample.at(-1).p,B);assert.equal(sample.at(-1).height,0);
 const crossing=sample.find(f=>Math.abs(f.p[1]-.69)<.003);
 assert.ok(crossing&&Math.abs(crossing.p[0]-.46)<.019,JSON.stringify(crossing));
 assert.ok(sample.some(f=>f.dx<0)&&sample.some(f=>f.dx>0));
});
