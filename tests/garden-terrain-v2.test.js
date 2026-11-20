import test from 'node:test';
import assert from 'node:assert/strict';
import {terrainFor,terrainLayout,terrainPlan,terrainFrame,actorBox,inside} from '../src/garden-terrain-plan.js';
import {GARDEN_TERRAIN_V2} from '../src/data/garden-terrain-v2.js';
import {GARDENS} from '../src/data/gardens.js';
const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
for(const id of Object.keys(GARDEN_TERRAIN_V2))test(`v2 ${id}: five real identities remain separated, routed continuously and input immutable`,()=>{
 for(const width of [320,375,390,402,430]){
  const bg=GARDENS.find(g=>g.id===id).background,h=844,w=h*bg.width/bg.height;
  const plane={left:(width-w)/2,top:0,width:w,height:h},clip={left:0,top:160,right:width,bottom:815};
  const actors=Array.from({length:5},(_,i)=>({id:'identity'+i,width:64,height:75,labelWidth:i===4?85:50,labelHeight:18,point:[.25+i*.12,.7],movable:i!==4,flight:i===0}));
  const original=JSON.stringify(actors),savedRandom=Math.random;Math.random=()=>{throw Error('game RNG touched');};
  try{
   const layout=terrainLayout(id,actors,plane,clip);assert.ok(layout,`${id} ${width} requires five-bird layout`);
   assert.equal(JSON.stringify(actors),original);assert.deepEqual(layout.map(a=>a.id).sort(),actors.map(a=>a.id).sort());
   assert.ok(Math.max(...layout.map(a=>a.point[1]))-Math.min(...layout.map(a=>a.point[1]))>.035,'not one row');
   for(const a of layout){assert.ok(inside(a.point,terrainFor(id).surfaces[a.surface]));assert.ok(a.width>=44&&a.height>=44);}
   const snapshot=JSON.stringify(layout);
   for(let cycle=0;cycle<6;cycle++){
    const plan=terrainPlan(id,layout,plane,clip,[],cycle);assert.ok(plan,'safe native gesture remains available');
    assert.equal(JSON.stringify(layout),snapshot);assert.notEqual(plan.id,'identity4','no invented resident species poses');
    let last=null;
    for(let t=0;t<=26000;t+=20){
     const f=terrainFrame(plan,t),a=layout.find(a=>a.id===plan.id),r=actorBox(a,f.point,plane,f.lift,plan.flight);
     assert.ok(r.left>=clip.left&&r.right<=clip.right&&r.top>=clip.top&&r.bottom<=clip.bottom);
     assert.ok(!layout.filter(b=>b.id!==a.id).some(b=>overlap(r,actorBox(b,b.point,plane))),'complete bird/button/label stays clear');
     if(!f.wing)assert.ok(Object.values(terrainFor(id).surfaces).some(poly=>inside(f.point,poly)));
     if(last)assert.ok(Math.hypot((f.point[0]-last.point[0])*w,(f.point[1]-last.point[1])*h)<12,'no teleport, including cycle wrap');last=f;
    }
    assert.deepEqual(terrainFrame(plan,0).point,terrainFrame(plan,25999).point);
   }
  }finally{Math.random=savedRandom;}
 }
});
test('v2 graph is exactly four gardens and retains distinct legal surfaces and priorities',()=>{
 assert.deepEqual(Object.keys(GARDEN_TERRAIN_V2),['yuyake','bird-eurasian-bullfinch','bird-white-winged-crossbill','bali-terrace']);
 assert.deepEqual(Object.values(GARDEN_TERRAIN_V2).map(g=>g.order[0]),['preen','step','depth','flight']);
 for(const [id,g] of Object.entries(GARDEN_TERRAIN_V2))for(const e of g.edges){
  const t=terrainFor(id);assert.ok(inside(e.a,t.surfaces[e.surface||e.from]));assert.ok(inside(e.b,t.surfaces[e.surface||e.to]));
  if(e.motion!=='flight')for(let n=0;n<=100;n++)assert.ok(inside(e.a.map((v,i)=>v+(e.b[i]-v)*n/100),t.surfaces[e.surface]));
 }
});
test('compact 375x667 bullfinch five-bird layout prunes dead ends without shrinking targets or surfaces',()=>{
 const plane={left:-.1875,top:0,width:375.375,height:667},clip={left:0,top:0,right:375,bottom:667},obstacles=[{left:10,top:8,right:299,bottom:58},{left:10,top:62,right:365,bottom:124},{left:68,top:599,right:365,bottom:667}];
 const actors=['gf-komorebi-1','gf-shrine-grove-2','gf-komorebi-2','gf-hanadokei-1','b1'].map((id,i)=>({id,width:67.5,height:79.421875,labelWidth:[47,47,36,47,36][i],labelHeight:18,point:[[.2355,.4499],[.763,.4499],[.2355,.6643],[.763,.6643],[.4993,.6643]][i],movable:true,flight:i===2||i===4}));
 const input=JSON.stringify(actors),layout=terrainLayout('bird-eurasian-bullfinch',actors,plane,clip,obstacles);assert.ok(layout);assert.equal(layout.length,5);assert.equal(JSON.stringify(actors),input);
 for(const a of layout){assert.ok(a.width>=44&&a.height>=44);assert.ok(inside(a.point,terrainFor('bird-eurasian-bullfinch').surfaces[a.surface]));const box=actorBox(a,a.point,plane);assert.ok(!obstacles.some(o=>overlap(box,o)));assert.ok(!layout.some(b=>b!==a&&overlap(box,actorBox(b,b.point,plane))));}
 assert.ok(terrainPlan('bird-eurasian-bullfinch',layout,plane,clip,obstacles));
});
