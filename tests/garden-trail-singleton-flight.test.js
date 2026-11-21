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

function edgeSingleton(garden,extra=[]){
 const m=createGardenActors('edge-interior-flight'),rt=createGardenTrailRuntime(garden,m);
 const wings={left:-76,right:76,top:-68,bottom:24},defs=[{id,movable:true,canFly:true},...extra];
 const plane={left:-45,top:0,width:492,height:874};
 const measurement={plane,clip:{left:0,top:0,right:402,bottom:874},controls:[],envelope:wings,
  footprints:new Map(defs.map(a=>[a.id,shape])),flightFootprints:new Map(defs.map(a=>[a.id,wings]))};
 m.reconcile(defs,rt.nodes);rt.sync({generation:1,measurement});
 return {m,rt,measurement,a:m.actors.get(id)};
}
for(const [id2,catalogue,old] of [
 [10,'bird-tricolored-munia',[{id:'near',p:[.27,.65]}]],
 [14,'bird-long-tailed-paradise-whydah',[{id:'offered',p:[.64,.52]}]],
])test('#'+id2+' reserves an actual interior hop before a safe whole flight if its existing single route is unavailable',()=>{
 const {m,rt,measurement,a}=edgeSingleton(catalogue),origin=a.node;
 const d=Math.hypot((old[0].p[0]-a.p[0])*492,(old[0].p[1]-a.p[1])*874);
 assert.equal(d>=64&&d<=148,id2===14);
 assert.equal(rt.singletonFlight(old),null);
 let probes=0;
 const admit={paintable:()=>{probes++;return true;}};
 const first=rt.singletonInterior(admit);
 assert.ok(first?.ingress);assert.ok(probes>1);
 assert.equal(a.node,origin);assert.equal(m.reservations.get(first.target),id);
 m.advance(2000,[],{safe:()=>false});
 assert.equal(a.node,first.target);assert.equal(m.reservations.size,0);
 rt.sync({generation:1,measurement});
 assert.equal(rt.singletonInterior(admit)?.action,'wait');
 m.advance(10001,[],{safe:()=>false});
 const second=rt.singletonInterior(admit);
 assert.equal(second?.action,'fly');assert.notEqual(second.target,a.node);
 assert.equal(m.reservations.get(second.target),id);
 const phases=new Set();
 for(let t=10001;t<=15000&&a.route;t+=40){m.advance(t,[],{safe:()=>false});if(a.state==='fly')phases.add(a.phase);}
 assert.ok(['rise','flap','contact'].every(phase=>phases.has(phase)));
 assert.equal(a.node,second.target);assert.equal(m.reservations.size,0);
});
test('interior remedy is solo-only and untouched off #10/#14; explicit paint failure commits nothing',()=>{
 assert.equal(edgeSingleton('bird-zebra-finch').rt.singletonInterior(),null);
 assert.equal(edgeSingleton('bird-tricolored-munia',[{id:'other',movable:true,canFly:true}]).rt.singletonInterior(),null);
 const {rt,m,a}=edgeSingleton('bird-long-tailed-paradise-whydah');
 const before=structuredClone(a);
 assert.equal(rt.singletonInterior({paintable:()=>false}),null);
 assert.deepEqual(a,before);assert.equal(m.reservations.size,0);
});

test('#14 pending solo pair survives fresh measured bindings and native hop cooldown',()=>{
 const {m,rt,measurement,a}=edgeSingleton('bird-long-tailed-paradise-whydah');
 const ingress=rt.singletonInterior();
 assert.ok(ingress?.ingress);
 // New rendered DOM delivers fresh measured maps in the same garden both
 // during ingress and while the original native eight-second cooldown runs.
 rt.sync({generation:1,measurement:structuredClone(measurement)});
 assert.equal(rt.singletonInterior({resumeOnly:true})?.action,'wait');
 m.advance(2000,[],{safe:()=>false});
 assert.equal(a.node,ingress.target);
 assert.equal(a.phase,'ground');
 assert.equal(a.cooldown,10000);
 for(const now of [3100,6100,9100]){
  m.advance(now,[],{safe:()=>false});
  rt.sync({generation:1,measurement:structuredClone(measurement)});
  assert.equal(rt.singletonInterior({resumeOnly:true})?.action,'wait');
  assert.equal(a.node,ingress.target);
  assert.equal(m.reservations.size,0);
 }
 m.advance(10000,[],{safe:()=>false});
 const takeoff=rt.singletonInterior({resumeOnly:true});
 assert.equal(takeoff?.action,'fly');
 assert.equal(m.reservations.get(takeoff.target),id);
 const phases=new Set();
 for(let t=10000;t<=14500&&a.route;t+=40){m.advance(t,[],{safe:()=>false});if(a.state==='fly')phases.add(a.phase);}
 assert.ok(['rise','flap','contact'].every(phase=>phases.has(phase)));
 assert.equal(a.node,takeoff.target);
 assert.equal(m.reservations.size,0);
});
test('pending solo flight rechecks changed native controls and can never commit an unsafe cached reservation',()=>{
 const {m,rt,measurement,a}=edgeSingleton('bird-long-tailed-paradise-whydah');
 const ingress=rt.singletonInterior();assert.ok(ingress?.ingress);
 m.advance(2000,[],{safe:()=>false});assert.equal(a.node,ingress.target);
 m.advance(10000,[],{safe:()=>false});
 const changed={...measurement,controls:[{left:0,top:0,right:402,bottom:874}]};
 rt.sync({generation:1,measurement:changed});
 const before=structuredClone(a);
 assert.equal(rt.singletonInterior({resumeOnly:true}),null);
 assert.deepEqual(a,before);
 assert.equal(m.reservations.size,0);
});

test('#10 authored edge flight must pass renderer before reservation; normal refusal frees the safe interior fallback',()=>{
 const geometry=()=>{
  const run=edgeSingleton('bird-tricolored-munia');
  const wings={left:-45,right:45,top:-68,bottom:24};
  const measurement={...run.measurement,envelope:wings,flightFootprints:new Map([[id,wings]])};
  run.rt.sync({generation:1,measurement});
  return run;
 };
 // The real authored #10 lane can pass the measured wing sweep while the
 // inherited 64px sampled renderer adds a larger side margin at the gate.
 const paint=(m,route)=>route.state!=='fly'||m.sampleRoute(route).every(f=>{
  const x=-45+492*f.p[0];
  return x-64*.54-64*.65>=2&&x+64*.46+64*.65<=400;
 });
 const base=geometry();
 assert.equal(base.rt.request(id,'fly'),true);
 const lane=base.rt.run();
 assert.equal(lane?.action,'fly');
 assert.equal(paint(base.m,base.a),false);
 assert.equal(base.m.reservations.get(lane.target),id);

 const {m,rt,a}=geometry();
 const before=structuredClone(a);
 assert.equal(rt.request(id,'fly'),true);
 let invoked=0;
 const guard=route=>{invoked++;return paint(m,route);};
 assert.equal(rt.run({paintable:guard}),null);
 assert.equal(invoked,1);
 assert.deepEqual(a,before);assert.equal(m.reservations.size,0);
 const ingress=rt.singletonInterior({paintable:guard});
 assert.ok(ingress?.ingress,'normal lane refusal must not block a proven interior place');
 assert.equal(m.reservations.get(ingress.target),id);
 assert.equal(a.node,before.node,'only its native route may move the source');
 m.advance(2000,[],{safe:()=>false});
 assert.equal(a.node,ingress.target);
 assert.equal(rt.singletonInterior({paintable:guard,resumeOnly:true})?.action,'wait');
 m.advance(10000,[],{safe:()=>false});
 const flight=rt.singletonInterior({paintable:guard,resumeOnly:true});
 assert.equal(flight?.action,'fly');
 assert.equal(m.reservations.get(flight.target),id);
 m.advance(14600,[],{safe:()=>false});
 assert.equal(a.node,flight.target);
 assert.equal(m.reservations.size,0);
});
