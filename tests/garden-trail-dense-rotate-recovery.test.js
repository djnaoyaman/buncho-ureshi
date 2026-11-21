import test from 'node:test';
import assert from 'node:assert/strict';
import {clippedDenseCoverRecovery} from '../src/garden-actor-motion.js';
import {createGardenActors} from '../src/garden-actor-state.js';
const roster=Array.from({length:10},(_,i)=>({id:'actor'+i,movable:i===0}));
const seats=roster.map((_,i)=>({id:'original'+i,p:[.30+i*.022,.65]}));
const stops=roster.map((_,i)=>({id:'reflow'+i,p:[.31+i*.022,.70]}));
function scene(){
 const model=createGardenActors('rotate',0);
 model.reconcile(roster,seats);
 assert.equal(model.beginHopPath('actor0',{id:'flight-target',p:[.32,.66]},[[.30,.65],[.32,.66]],{width:375,planeHeight:667,safe:()=>true}),true);
 const actors=[...model.actors.values()];
 const next=new Map(actors.map((a,i)=>[a.id,stops[i]]));
 return {model,actors,next};
}
test('changed cover may rehouse clipped ten actors only after an entire approved plan',()=>{
 const {model,actors,next}=scene(), oldRefs=[...actors],oldEnd=actors[1].end;
 const result=clippedDenseCoverRecovery({changedAxis:true,actors,routeFits:()=>false,currentFits:a=>a.id!=='actor0',
  replace(){assert.equal(model.reservations.get('flight-target'),'actor0');return model.placeStanding(next);}});
 assert.equal(result,true);
 assert.deepEqual([...model.actors.values()],oldRefs);
 assert.equal(model.actors.get('actor1').end,oldEnd);
 assert.equal(model.actors.get('actor0').route,null);
 assert.equal(model.reservations.size,0);
 assert.deepEqual([...model.actors.values()].map(a=>a.node),stops.map(s=>s.id));
});
test('same-view, visibly legal, unoccluded, or native-refused replacements keep prior route and reservation',()=>{
 const {model,actors}=scene(),routes={changedAxis:true,actors,routeFits:()=>false,currentFits:a=>a.id!=='actor0'};
 const shouldNever=()=>{assert.fail('must preserve existing route');};
 assert.equal(clippedDenseCoverRecovery({...routes,changedAxis:false,replace:shouldNever}),false);
 assert.equal(clippedDenseCoverRecovery({...routes,routeFits:()=>true,replace:shouldNever}),false);
 assert.equal(clippedDenseCoverRecovery({...routes,currentFits:()=>true,replace:shouldNever}),false);
 assert.equal(clippedDenseCoverRecovery({...routes,actors:actors.slice(0,9),replace:shouldNever}),false);
 assert.equal(clippedDenseCoverRecovery({...routes,replace:()=>false}),false);
 assert.ok(model.actors.get('actor0').route);
 assert.equal(model.reservations.get('flight-target'),'actor0');
});
