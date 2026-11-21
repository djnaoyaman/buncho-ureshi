import test from 'node:test';
import assert from 'node:assert/strict';
import {trailTerrainFor} from '../src/data/garden-trail-terrain.js';
import {createTrailClearance,pitchTrailStandingSeats,contourTrailStandingSeats} from '../src/garden-trail-clearance.js';
const box=(left,right,top,bottom)=>({left,right,top,bottom});
const footprint={...box(-26,20.24,-50.7,20),parts:[box(-23.76,20.24,-50.7,1.3),box(-26,18,5,16)]};
const plane={left:0,top:0,width:375,height:667},clip=box(0,375,0,667);
const actors=Array.from({length:10},(_,i)=>({id:'bird'+i}));
function measured(id,controls=[]){
 const surface=trailTerrainFor(id).surface,footprints=new Map(actors.map(a=>[a.id,footprint]));
 const c=createTrailClearance(id,{plane,clip,controls,footprints});
 const standingPairFits=(a,n,b,m)=>!c.placementConflicts({...a,p:n.p},{...b,p:m.p});
 const canPlace=(a,n,prior)=>c.canStand(a,n.p)&&[...prior].every(([id,b])=>id===a.id||standingPairFits(a,n,{id},b));
 return {actors,plane,clip,surface,footprints,baseWidth:44,baseHeight:52,standingPairFits,canPlace,safePoint:p=>c.canStand(actors[0],p)};
}
test('#08 contour can place ten separated 44px native targets with painted labels where a shared pitch cannot',()=>{
 const shape=measured('bird-red-avadavat');
 assert.equal(pitchTrailStandingSeats({...shape,accept:()=>true}),null);
 let probes=0;
 const plan=contourTrailStandingSeats({...shape,accept(full){probes++;return full.size===10;}});
 assert.equal(plan?.size,10);
 assert.equal(probes,1);
 assert.ok(actors.every(a=>shape.canPlace(a,plan.get(a.id),plan)));
 assert.deepEqual(contourTrailStandingSeats({...shape,accept:()=>true}),plan);
});
test('#10 contour is bounded and cannot bypass UI, measured peer constraints or native refusal',()=>{
 const shape=measured('bird-tricolored-munia');
 assert.equal(contourTrailStandingSeats({...shape,accept:()=>false,maxProbes:1}),null);
 assert.equal(contourTrailStandingSeats({...shape,accept:()=>true,maxWork:5}),null);
 assert.equal(contourTrailStandingSeats({...shape,accept:()=>true,standingPairFits:()=>false}),null);
 assert.equal(contourTrailStandingSeats({...measured('bird-tricolored-munia',[clip]),accept:()=>true}),null);
});
