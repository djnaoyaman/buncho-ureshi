import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGardenActors} from '../src/garden-actor-state.js';
import {createGardenTrailRuntime} from '../src/garden-trail-runtime.js';
import {trailTerrainFor} from '../src/data/garden-trail-terrain.js';

const id='bird-masked-finch',terrain=trailTerrainFor(id);
const norm=(x,y)=>[(x+180)/750,(y+731.326809)/(750*1672/940)];
const makeNodes=(rows,prefix)=>rows.map(([x,y],i)=>({id:prefix+i,p:norm(x,y)}));
const gates=makeNodes([[42,125],[106,125]],'shared-gate-');
const parking=makeNodes([[170,53.5],[215.2,53.5],[260.4,53.5],[305.6,53.5],[350.8,53.5],[170,125],[215.2,125],[260.4,125],[305.6,125]],'shared-park-');
const stand={left:-24,right:21,top:-51,bottom:20},wing={left:-39,right:39,top:-60,bottom:25};
const roof=([width,height])=>{
 const paneX=(width-375)/2,paneY=Math.max(150,Math.min((height-157)/2,height-225));
 const plane={left:paneX-180,top:paneY-731.326809,width:750,height:750*1672/940};
 const clip={left:paneX,right:paneX+375,top:paneY,bottom:paneY+157};
 return {plane,clip,controls:[{left:0,right:width,top:0,bottom:150},{left:0,right:width,top:height-68,bottom:height}]};
};
function setup([w,h],firstGate,{count=10,biggerWing=false,blockUI=false,blockPeer=false,predator=false}={}){
 const geometry=roof([w,h]);
 if(blockUI)geometry.controls.push({left:geometry.clip.left+107,right:geometry.clip.left+145,top:geometry.clip.top+20,bottom:geometry.clip.top+110});
 const model=createGardenActors('masked-world',0),runtime=createGardenTrailRuntime(id,model,terrain);
 const roster=Array.from({length:count},(_,i)=>({id:'native-'+i,initialFlight:!i,movable:i<8,canFly:i<8}));
 let seats=[gates[firstGate],...parking];
 if(blockPeer)seats=[...seats.slice(0,-1),{id:'blocking-peer',p:norm(125,125)}];
 model.reconcile(roster,seats,(a,n)=>seats[roster.indexOf(a)]===n);
 const measurement={...geometry,envelope:wing,footprints:new Map(roster.map(a=>[a.id,stand])),
  flightFootprints:new Map(roster.map(a=>[a.id,biggerWing?{...wing,left:-43,right:43}:wing]))};
 runtime.sync({generation:'masked-world',measurement,predator});
 return {model,runtime,roster,seats,measurement};
}
test('masked fixed courtyard keeps exact same reserved flight in both directions and four orientations',()=>{
 for(const viewport of [[375,667],[667,375],[402,874],[874,402]]) for(const direction of [0,1]){
  const {model,runtime,roster,seats,measurement}=setup(viewport,direction);
  assert.equal(model.actors.size,10);
  assert(roster.every((a,i)=>runtime.canPlace(a,seats[i],model.actors)));
  const bird=model.actors.get('native-0'),fits=a=>{
   const q=model.frame(a,a.since+a.route.duration*.5);
   return q.height>0&&runtime.recoveryFits(a,gates[1-direction],model.actors);
  };
  assert.deepEqual(runtime.sharedPaneFlight(gates,{paintable:fits}),{id:bird.id,target:gates[1-direction].id,action:'fly'});
  assert.equal(model.reservations.get(gates[1-direction].id),bird.id);
  assert.equal(runtime.sharedPaneFlight(gates,{paintable:fits}),null);
  model.advance(500,seats,{safe:()=>false});assert.equal(bird.phase,'rise');
  const current=bird.route;
  const rotated=roof([viewport[1],viewport[0]]);
  runtime.sync({generation:'masked-world',measurement:{...measurement,...rotated}});
  assert.equal(model.actors.get(bird.id),bird);assert.equal(bird.route,current);
  assert(runtime.recoveryFits(bird,gates[1-direction],model.actors));
  model.advance(current.duration+1,[...parking,...gates],{safe:()=>false});
  assert.equal(bird.node,gates[1-direction].id);
  assert.equal(bird.height,0);assert.equal(bird.route,null);assert.equal(model.reservations.size,0);
 }
});
test('unproven paint, swollen wings, a control, conflicting resident and outside profile never reserve a #34 flight',()=>{
 for(const options of [{paintable:false},{biggerWing:true},{blockUI:true},{blockPeer:true},{count:9}]){
  const {model,runtime}=setup([375,667],0,options);
  const bird=model.actors.get('native-0');
  assert.equal(runtime.sharedPaneFlight(gates,{paintable:()=>options.paintable!==false}),null,JSON.stringify(options));
  assert.equal(bird.route,null);assert.equal(model.reservations.size,0);
 }
});
