import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GARDEN_MOTION_TERRAIN} from '../src/data/garden-motion-terrain.js';
import {terrainLayout,terrainPlan} from '../src/garden-terrain-plan.js';
const scope=JSON.parse(readFileSync(new URL('../docs/qa/garden-ground-motion-scope.json',import.meta.url)));
test('second ground batch preserves the exact published first four terrain definitions and surveyed art',()=>{
 for(const [id,terrain] of Object.entries(scope.priorTerrain))assert.deepEqual(GARDEN_MOTION_TERRAIN[id],terrain);
 for(const row of scope.newTerrain){
  assert.equal(createHash('sha256').update(readFileSync(new URL('../'+row.image,import.meta.url))).digest('hex'),row.sha256);
  assert.deepEqual(GARDEN_MOTION_TERRAIN[row.id],row.terrain);
  assert.equal(row.terrain.flight,false);assert.equal(row.terrain.mask,undefined);
 }
 assert.equal(Object.keys(GARDEN_MOTION_TERRAIN).length,8);
});
test('each added surface supports a sparse short ground route but refuses crowded layout without RNG',()=>{
 const p={left:0,top:0,width:475,height:844},c={left:0,top:180,right:475,bottom:780};
 const bird={id:'b1',width:70,height:82.35,labelWidth:38,labelHeight:18,point:[.5,.74],movable:true,flight:true};
 const before=JSON.stringify(bird),random=Math.random;Math.random=()=>{throw Error('presentation must not consume RNG');};
 try{for(const row of scope.newTerrain){
  const layout=terrainLayout(row.id,[bird],p,c);assert.ok(layout,row.id);
  const plan=terrainPlan(row.id,layout,p,c);assert.ok(plan,row.id);assert.equal(plan.flight,false);
  assert.ok(Math.abs(plan.to[0]-plan.from[0])*p.width<=18.0001);
  assert.equal(terrainLayout(row.id,Array.from({length:8},(_,i)=>({...bird,id:'b'+i})),p,c),null);
 }}finally{Math.random=random;}
 assert.equal(JSON.stringify(bird),before);
});
