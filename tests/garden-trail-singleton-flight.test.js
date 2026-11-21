import test from 'node:test';
import assert from 'node:assert/strict';
import {createGardenActors} from '../src/garden-actor-state.js';
import {createGardenTrailRuntime} from '../src/garden-trail-runtime.js';
import {createGardenTrailAdapter} from '../src/garden-trail-adapter.js';
import {trailTerrainFor} from '../src/data/garden-trail-terrain.js';
const garden='bird-zebra-finch',id='lead';
const shape={left:-24,right:24,top:-54,bottom:20};
const wings={left:-46,right:46,top:-68,bottom:24};
const seat={id:'dry-contact',p:[.57,.646]};
function setup({controls=[],peers=[]}={}){
 const m=createGardenActors('natural-trail-flight'),rt=createGardenTrailRuntime(garden,m);
 const defs=[{id,movable:true,canFly:true},...peers];
 const geometry={plane:{left:0,top:0,width:430,height:760},clip:{left:0,top:0,right:430,bottom:760},controls,
   envelope:wings,footprints:new Map(defs.map(a=>[a.id,shape])),flightFootprints:new Map(defs.map(a=>[a.id,wings]))};
 m.reconcile(defs,rt.nodes);rt.sync({generation:1,measurement:geometry});
 return {m,rt,geometry,a:m.actors.get(id)};
}
test('a blocked authored crossing can still fly to a dry local contact with real native phases and reservation',()=>{
 const {m,rt,a}=setup({controls:[{left:0,right:430,top:525,bottom:760}]});
 assert.equal(rt.request(id,'fly'),true);assert.equal(rt.run(),null);
 assert.deepEqual(rt.singletonFlight([seat]),{id,target:seat.id,action:'fly'});
 assert.equal(m.reservations.get(seat.id),id);
 const phases=new Set();
 for(let t=0;t<2350&&a.route;t+=33){m.advance(t,[],{safe:()=>false});if(a.state==='fly')phases.add(a.phase);}
 assert.ok(['rise','flap','contact'].every(phase=>phases.has(phase)), [...phases].join());
 assert.equal(a.node,seat.id);assert.equal(m.reservations.size,0);
});
test('unfit wings, out-of-dry-ground destination, another occupant, or predator do not launch',()=>{
 const blocked=setup({controls:[{left:168,right:185,top:355,bottom:520}]});
 const before=structuredClone(blocked.a);
 assert.equal(blocked.rt.singletonFlight([{id:'wet',p:[.30,.52]},seat]),null);
 assert.deepEqual(blocked.a,before);assert.equal(blocked.m.reservations.size,0);
 assert.equal(setup({peers:[{id:'other',movable:true,canFly:true}]}).rt.singletonFlight([seat]),null);
 const locked=setup();
 locked.rt.sync({generation:1,measurement:locked.geometry,predator:true});
 assert.equal(locked.rt.singletonFlight([seat]),null);
});
test('a local flight disposition is tracked even without an authored lane ticket',()=>{
 const {rt,m,geometry,a}=setup();
 assert.ok(rt.singletonFlight([seat]));
 const sync=rt.sync({generation:1,measurement:geometry,predator:true});
 assert.deepEqual(sync.disposition,[{id,kind:'native-safe-recovery'}]);
 assert.deepEqual(rt.recover([id],{reduced:true}),[]);
 assert.equal(a.node,seat.id);assert.equal(m.reservations.size,0);
});
test('a lone denied queued walk can become flight when the atlas is ready, while no lock is taken early',()=>{
 const a=createGardenTrailAdapter(garden,{intersectsLane:()=>false,protects:()=>false,validate:x=>x.action==='fly'});
 const [A]=trailTerrainFor(garden).entryCandidates;
 const actor={id,p:A,phase:'ground',height:0,movable:true,canFly:false};
 a.sync({epoch:1,actors:[actor]});assert.equal(a.enqueue(id,'walk'),true);assert.equal(a.admit(),null);
 a.sync({epoch:1,actors:[{...actor,canFly:true}]});assert.equal(a.enqueue(id,'fly'),true);
 assert.equal(a.admit()?.action,'fly');
});

test('sampled renderer guard can decline a valid swept path before any native reservation',()=>{
 const {m,rt,a}=setup();
 let saw=false;
 const before=structuredClone(a);
 assert.equal(rt.singletonFlight([seat],{paintable:candidate=>{saw=candidate.route.target===seat.id;return false;}}),null);
 assert.equal(saw,true);assert.deepEqual(a,before);assert.equal(m.reservations.size,0);
});
