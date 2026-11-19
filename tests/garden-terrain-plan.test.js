import test from 'node:test';
import assert from 'node:assert/strict';
import { terrainFor, terrainLayout, terrainPlan, terrainFrame, inside } from '../src/garden-terrain-plan.js';
import { GARDENS } from '../src/data/gardens.js';

const ids=['yuyake','bird-eurasian-bullfinch','bird-white-winged-crossbill','bali-terrace','java-rice','bird-diamond-firetail','bird-zebra-finch','kazaguruma'];
const actors=n=>Array.from({length:n},(_,i)=>({id:'bird'+i,width:70,height:82.35,labelWidth:38,labelHeight:18,point:[.2+i*.15,.7],movable:true,flight:i===0}));
for(const id of ids) test(id+' routes stay grounded, separated and continuous without changing inputs',()=>{
  for(const width of [320,375,390,402,430]){
    const bg=GARDENS.find(g=>g.id===id).background,h=844,w=h*bg.width/bg.height;
    const plane={left:(width-w)/2,top:0,width:w,height:h},clip={left:0,top:180,right:width,bottom:780};
    for(const count of [1,2,3,5,6,10]){
      const input=actors(count),before=JSON.stringify(input),layout=terrainLayout(id,input,plane,clip);
      assert.equal(JSON.stringify(input),before);
      if(count===10){assert.equal(layout,null);continue;}
      if(!layout)continue;
      for(const a of layout){assert.ok(a.width>=44);assert.ok(inside(a.point,terrainFor(id).surfaces[terrainFor(id).primary]));}
      const saved=JSON.stringify(layout);
      for(let cycle=0;cycle<4;cycle++){
        const plan=terrainPlan(id,layout,plane,clip,[],cycle);
        assert.equal(JSON.stringify(layout),saved);
        if(!plan)continue;
        if(id==='bird-eurasian-bullfinch')assert.equal(plan.flight,false);
        if(plan.flight)assert.equal(plan.id,'bird0');
        let previous=null;
        for(let t=0;t<26000;t+=16){
          const f=terrainFrame(plan,t);assert.ok(f.point.every(Number.isFinite));
          if(!f.wing)assert.ok(Object.values(terrainFor(id).surfaces).some(p=>inside(f.point,p)));
          if(previous)assert.ok(Math.hypot(...f.point.map((v,i)=>v-previous.point[i]))<.015);
          previous=f;
        }
        assert.deepEqual(terrainFrame(plan,0).point,plan.from);
        assert.deepEqual(terrainFrame(plan,25000).point,plan.from);
      }
    }
  }
});
test('only eight gardens opt in; blocked, narrow, crowded and unknown surfaces stay static',()=>{
  for(const g of GARDENS)assert.equal(!!terrainFor(g.id),ids.includes(g.id));
  const p={left:0,top:0,width:390,height:844},c={left:0,top:0,right:390,bottom:844};
  assert.equal(terrainLayout('yuyake',actors(10),p,c),null);
  assert.equal(terrainLayout('yuyake',actors(3),p,c,[c]),null);
  assert.equal(terrainLayout('yuyake',actors(3),p,{...c,right:90}),null);
  assert.equal(terrainPlan('komorebi',actors(2),p,c),null);
  assert.equal(terrainPlan('yuyake',actors(2).map(a=>({...a,point:[.5,.2]})),p,c),null);
});
test('non-white/young birds use native ground gestures; presentation never draws random numbers',()=>{
  const saved=Math.random;Math.random=()=>{throw Error('No RNG in presentation');};
  try{
    const p={left:0,top:0,width:390,height:844},c={left:0,top:0,right:390,bottom:844};
    const layout=terrainLayout('yuyake',actors(1).map(a=>({...a,flight:false})),p,c);
    assert.ok(layout);const plan=terrainPlan('yuyake',layout,p,c);assert.ok(plan);assert.equal(plan.flight,false);
  }finally{Math.random=saved;}
});
