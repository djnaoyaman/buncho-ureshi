import test from 'node:test';
import assert from 'node:assert/strict';
import {createGardenActors} from '../src/garden-actor-state.js';
import {createGardenTrailRuntime} from '../src/garden-trail-runtime.js';
const box=(left,right,top,bottom)=>({left,right,top,bottom});
const footprint={...box(-26,20.24,-50.7,20),parts:[box(-23.76,20.24,-50.7,1.3),box(-26,18,5,16)]};
const plane={left:0,top:0,width:375,height:667},clip=box(0,375,0,667);
const pose=[[139,540],[259,524],[187,532],[139,468],[91,452],[243,452],[187,460],[291,452],[139,396],[267,380]];
const seats=pose.map(([x,y],i)=>({id:'seat'+i,p:[x/375,y/667]}));
const defs=pose.map((_,i)=>({id:'bird'+i,movable:i===6}));
const opts={pocket:true,minDistance:7.99,maxDistance:36.01};
const setup=(controls=[])=>{
 const model=createGardenActors('pockets'),runtime=createGardenTrailRuntime('bird-masked-finch',model);
 const measurement={plane,clip,controls,footprints:new Map(defs.map(a=>[a.id,footprint])),envelope:footprint};
 model.reconcile(defs,seats);
 runtime.sync({generation:'pockets',measurement});
 return {model,runtime};
};
test('#34 pocket supplies a real measured hop and reserves its new surveyed point before movement',()=>{
 const {model,runtime}=setup();
 assert.equal(runtime.localHop(seats),null);
 let preflight=0;
 const hop=runtime.localHop([],{...opts,paintable(a){preflight++;return a.route.hops.length>=2;}});
 assert.ok(hop);assert.ok(preflight>0);
 assert.equal(hop.id,'bird6');
 assert.equal(model.actors.get(hop.id).state,'hop');
 assert.equal(model.reservations.get(hop.target),hop.id);
 assert.equal(model.actors.get(hop.id).node,'seat6');
 assert.equal(runtime.localHop([],opts),null,'a second route cannot displace the existing reservation');
});
test('#34 pocket vetoes obstructed sweeps and unsupported renderer paths without reservations',()=>{
 const veto=setup();
 assert.equal(veto.runtime.localHop([],{...opts,paintable:()=>false}),null);
 assert.equal(veto.model.reservations.size,0);
 const blocked=setup([clip]);
 assert.equal(blocked.runtime.localHop([],opts),null);
 assert.equal(blocked.model.reservations.size,0);
});
