import test from 'node:test';
import assert from 'node:assert/strict';
import {trailTerrainFor} from '../src/data/garden-trail-terrain.js';
import {readTrailGeometry} from './fixtures/garden-trail-geometry-browser.js';
const id='bird-zebra-finch',survey=trailTerrainFor(id);
const r=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
const elm=(box,extra)=>({getBoundingClientRect:()=>box,...extra});

function withDocument(birds,opts,fn){
 const {stageReady='ready',visibleControl=false}=opts;
 const plane=elm(r(-85,-105,550,978),{querySelectorAll:()=>birds});
 const slide=elm(r(0,0,375,667),{});
 const stage=elm(r(0,0,375,667),{dataset:{gardenId:id,sceneState:stageReady},querySelector:q=>q.endsWith('plane')?plane:slide});
 const dock=elm(r(10,595,355,59),{className:'finch-garden-dock'}),control=elm(r(150,462,106,68),{className:'jog'});
 const globals={document:{querySelector:()=>stage,querySelectorAll:()=>visibleControl?[dock,control]:[dock],
  elementFromPoint:()=>birds[0]},innerWidth:375,innerHeight:667};
 try{Object.assign(globalThis,globals);fn();}
 finally {for(const key of Object.keys(globals))delete globalThis[key];}
}
const specimen=(id,left)=>elm(r(left,500,44,52),{dataset:{gardenActorId:id},querySelector:()=>elm(r(left,548,48,16),{}),contains:e=>e?.dataset?.gardenActorId===id});

test('uses negative cover offsets, keeps clipped control geometry explicit even with an empty roster',()=>{
 withDocument([],{},()=>{
  const out=readTrailGeometry({id,survey});
  assert.deepEqual(out.clip,{left:0,right:375,top:0,bottom:667});
  assert.deepEqual(out.endpoints.start,[-85+.333*550,-105+.636*978]);
  assert.equal(out.controls.length,1);
  assert.deepEqual(out.native,[]);assert.deepEqual(out.sweeps,[]);
 });
});
test('flags intersecting route intervals and native hit occlusion instead of resetting the current bird',()=>{
 const birds=[specimen('lead',147),specimen('visitor',159),...Array.from({length:8},(_,i)=>specimen('other'+i,i*44))];
 withDocument(birds,{visibleControl:true},()=>{
  const out=readTrailGeometry({id,survey});
  assert.equal(out.native.length,10);assert.equal(out.native[0].hit,true);assert.equal(out.native[1].hit,false);
  assert.ok(out.sweeps[0].lane.some(s=>s.controls.includes(1)&&s.actors.includes('visitor')));
  assert.ok(out.sweeps[0].lane.every(s=>!s.actors.includes('lead')));
  assert.equal(birds[0].dataset.gardenActorId,'lead');
 });
});
test('does not measure stale, unready, wrong-garden DOM',()=>{
 withDocument([],{stageReady:'loading'},()=>assert.equal(readTrailGeometry({id,survey}),null));
 withDocument([],{},()=>assert.equal(readTrailGeometry({id:'wrong',survey}),null));
});
