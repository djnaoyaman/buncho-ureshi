import test from 'node:test';
import assert from 'node:assert/strict';
import {GARDEN_TRAIL_TERRAIN} from '../src/data/garden-trail-terrain.js';
import {GARDEN_ACTOR_TERRAIN} from '../src/data/garden-actor-terrain.js';
import {createGardenTrailAdapter} from '../src/garden-trail-adapter.js';
import {inside} from '../src/garden-terrain-plan.js';
const point=(id,p)=>({id,p,phase:'ground',height:0,route:null,movable:true,canFly:true});
const geometry={intersectsLane:()=>false,validate:()=>true,protects:(p,{lock})=>!!lock&&p.slot===lock.to};
test('all seven surveyed trail shapes stay outside the eleven Type① cases and preserve authored polygons',()=>{
 assert.deepEqual(Object.values(GARDEN_TRAIL_TERRAIN).map(g=>g.number),[7,8,10,12,14,28,34]);
 for(const [id,g] of Object.entries(GARDEN_TRAIL_TERRAIN)){
  assert.equal(GARDEN_ACTOR_TERRAIN[id],undefined);
  const [A,B]=g.entryCandidates,p=[A,...g.lane,B];
  for(let i=1;i<p.length;i++)for(let j=0;j<=100;j++)assert(inside(p[i-1].map((v,k)=>v+(p[i][k]-v)*j/100),g.surface),id);
 }
});
test('no fabricated bays in 08/34; each of the other five uses its own surveyed branch under live geometry checks',()=>{
 for(const [id,g] of Object.entries(GARDEN_TRAIL_TERRAIN)){
  const [p,q]=g.entryCandidates, A=point('lead',p),B=point('resident',q);
  const a=createGardenTrailAdapter(id,geometry);
  a.sync({epoch:1,actors:[A,B]});assert(a.enqueue(A.id,'walk'));const command=a.admit();
  if(!g.pullouts.length){assert.equal(command,null,id);continue;}
  assert.equal(command.kind,'yield');assert.deepEqual(command.path,[q,g.pullouts[0]]);
  assert.equal(a.finish(command.token,false,B),true);
 }
});

test('measured geometry refuses occluded reservations, peer sweeps and missing footprints without model mutations',async()=>{
 const {createTrailClearance}=await import('../src/garden-trail-clearance.js');
 const [p,q]=GARDEN_TRAIL_TERRAIN['bird-zebra-finch'].entryCandidates;
 const pose={left:-22,right:22,top:-60,bottom:22};
 const plane={left:-10,top:0,width:400,height:740},clip={left:0,top:0,right:380,bottom:740};
 const footprints=new Map([['owner',pose],['guest',pose]]);
 const safe=createTrailClearance('bird-zebra-finch',{plane,clip,controls:[],footprints});
 const guest=point('guest',GARDEN_TRAIL_TERRAIN['bird-zebra-finch'].lane[1]);
 const origin=point('owner',p),dest={id:'B',p:q};
 const owner={...origin,route:{from:p,to:q,hops:[p,...GARDEN_TRAIL_TERRAIN['bird-zebra-finch'].lane,q],height:.012}};
 assert.equal(safe.safe(owner,dest,'hop',new Map()),true);
 assert.equal(safe.safe(owner,dest,'hop',new Map([[guest.id,guest]])),false);
 assert.equal(safe.intersectsLane(guest,pose),true);
 assert.equal(safe.safe({...owner,id:'missing'},dest,'hop',new Map()),false);
 const withUI=createTrailClearance('bird-zebra-finch',{plane,clip,controls:[{left:145,right:215,top:500,bottom:535}],footprints});
 assert.equal(withUI.safe(owner,dest,'hop',new Map()),false);
 assert.equal(owner.p,p);
});

test('native runtime chooses and commits actual #07 flight, prevents a new tap box taking its corridor',async()=>{
 const {createGardenActors}=await import('../src/garden-actor-state.js');
 const {createGardenTrailRuntime}=await import('../src/garden-trail-runtime.js');
 const m=createGardenActors('trail browser-pending'),rt=createGardenTrailRuntime('bird-zebra-finch',m);
 const def={id:'white-resident',movable:true,canFly:true};
 m.reconcile([def],rt.nodes);
 const a=m.actors.get(def.id), envelope={left:-14,top:-28,right:14,bottom:10};
 const measurement={plane:{left:-15,top:0,width:420,height:740},clip:{left:0,top:0,right:390,bottom:740},
  controls:[],footprints:new Map([[a.id,envelope],['guest',envelope]]),envelope};
 assert.equal(rt.request(a.id,'fly'),false); // no measured generation
 rt.sync({generation:1,measurement});
 assert.equal(rt.request(a.id,'fly'),true);assert.equal(rt.run().action,'fly');
 assert.equal(a.state,'fly');assert.equal(m.reservations.get('B'),a.id);
 assert.equal(rt.canPlace({id:'guest'},rt.nodes[1],m.actors),false);
 assert.equal(rt.sync({generation:1,measurement,predator:true}).disposition[0]?.id,a.id);
 assert.equal(rt.run(),null);
});

test('ten-slot seating keeps current nine slots untouched or refuses the arrival atomically',async()=>{
 const {assignTrailSeats}=await import('../src/garden-trail-clearance.js');
 const slots=Array.from({length:10},(_,i)=>({id:'n'+i,p:[.4+i*.02,.74]}));
 const actors=Array.from({length:10},(_,i)=>({id:'b'+i,movable:true}));
 const retained=new Map(actors.slice(0,9).map((a,i)=>[a.id,slots[i]]));
 const granted=assignTrailSeats({actors,seats:slots,retained,canPlace:()=>true});
 assert.equal(granted.get('b9'),slots[9]);
 for(const [id,slot] of retained)assert.equal(granted.get(id),slot);
 assert.equal(assignTrailSeats({actors,seats:slots,retained,canPlace:()=>false}),null);
 assert.equal(retained.size,9);
});

test('garden preview gate is a private mount argument, does not alter normal markup, and matches #07 only',async()=>{
 const {renderGardenStage}=await import('../src/encounter-ui.js');
 const {worldFor}=await import('./fixtures/garden-about-world.js');
 const {actorTerrainForStage}=await import('../src/garden-actor-motion.js');
 const w=worldFor('attending','bird-zebra-finch');
 const a=renderGardenStage(w,{now:w.wallMs}),b=renderGardenStage(w,{now:w.wallMs,previewGardenTrail:false});
 assert.equal(a,b);assert.doesNotMatch(a,/data-garden-trail-preview|data-garden-actor-id/);
 const privateStage=renderGardenStage(w,{now:w.wallMs,previewGardenTrail:true});
 assert.match(privateStage,/data-garden-trail-preview="true"/);
 assert.match(privateStage,/data-garden-actor-id="b1"/);
 assert.equal(actorTerrainForStage({dataset:{gardenId:'bird-zebra-finch'}}),null);
 assert.equal(actorTerrainForStage({dataset:{gardenId:'bird-zebra-finch',gardenTrailPreview:'true'}}).number,7);
 assert.equal(actorTerrainForStage({dataset:{gardenId:'bird-red-avadavat',gardenTrailPreview:'true'}}),null);
 assert.equal(actorTerrainForStage({dataset:{gardenId:'java-rice',gardenTrailPreview:'true'}}),GARDEN_ACTOR_TERRAIN['java-rice']);
});

test('reduced motion lands the affected bird at its same target with no unrelated state or RNG mutation',async()=>{
 const {createGardenActors}=await import('../src/garden-actor-state.js');
 const {createGardenTrailRuntime}=await import('../src/garden-trail-runtime.js');
 const model=createGardenActors('recovery'),rt=createGardenTrailRuntime('bird-zebra-finch',model);
 const def={id:'lead',movable:true,canFly:true},peer={id:'observer',movable:false};
 model.reconcile([def],rt.nodes);
 model.reconcile([def,peer],[{id:'stand',p:[.76,.8]},...rt.nodes]);
 const a=model.actors.get(def.id),observer=model.actors.get(peer.id),before=structuredClone(observer);
 const envelope={left:-10,top:-25,right:10,bottom:5},geometry={plane:{left:0,top:0,width:430,height:740},clip:{left:0,top:0,right:430,bottom:740},controls:[],
  footprints:new Map([[def.id,envelope],[peer.id,envelope]]),envelope};
 rt.sync({generation:1,measurement:geometry});assert(rt.request(def.id,'fly'));assert(rt.run());
 const actual=a.route.target,occupied={...geometry,controls:[{left:245,top:524,right:295,bottom:602}]};
 rt.sync({generation:1,measurement:occupied});assert.deepEqual(rt.recover([def.id],{reduced:true}),[def.id]);
 assert.equal(model.reservations.get(actual),def.id);
 rt.sync({generation:1,measurement:geometry});assert.deepEqual(rt.recover([def.id],{reduced:true}),[]);
 assert.equal(a.node,actual);assert.equal(model.reservations.size,0);
 assert.equal(model.actors.get(peer.id),observer);assert.deepEqual(observer,before);
});
