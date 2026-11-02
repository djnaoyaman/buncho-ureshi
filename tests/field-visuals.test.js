import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,createBird,DECOR_SLOTS,DECOR_COLORS,DECOR_TIERS} from '../src/engine.js';
import {friendFurnishing,fieldPositions,furnitureSvg} from '../src/field-visuals.js';
test('NPC cage style is stable, host-specific and independent of player equipment',()=>{
 const w=createWorld(100),a=createBird(w),b=createBird(w);
 const appearance=host=>DECOR_SLOTS.map(s=>friendFurnishing(host,s.id,DECOR_COLORS,DECOR_TIERS));const before=appearance(a);
 w.decor.equipped.toy='toy-rose-special';w.decor.points=0;assert.deepEqual(appearance(a),before);assert.notDeepEqual(appearance(b),before);
 for(const item of before){assert(DECOR_COLORS.some(c=>c.id===item.color));assert(DECOR_TIERS.some(t=>t.id===item.tier));assert(furnitureSvg(item.slot).startsWith('<svg'));}
});
test('field social partners use nearby physical contacts at both responsive sizes',()=>{
 const w=createWorld(100);for(let i=1;i<12;i++)createBird(w,{home:i<10?'resident':'visitor'});
 w.birds[0].action={kind:'play',target:'b12',startedTick:0};w.birds[11].action={kind:'play',target:'b1',startedTick:0};
 for(const size of ['wide','tall'])for(const place of ['home','park']){const p=fieldPositions(w.birds,size,place);assert.equal(p.size,12);const a=p.get('b1'),b=p.get('b12');assert(Math.hypot(a.x-b.x,a.y-b.y)<.35);assert.equal(new Set([...p.values()].map(p=>`${p.x}:${p.y}`)).size,12);}
});
test('one through ten nest-bound young have disjoint proportional sprite planes',()=>{
 for(let count=1;count<=10;count++)for(const variant of ['wide','tall']){
 const birds=Array.from({length:count},(_,i)=>({id:`b${i+1}`,stage:i%2?'egg':'chick',action:{kind:'nest'}}));const positions=[...fieldPositions(birds,variant).values()],aspect=variant==='tall'?.75:1.6;
 for(let i=0;i<count;i++)for(let j=i+1;j<count;j++){const a=positions[i],b=positions[j],bounds=p=>({left:p.x-p.width*.54,right:p.x+p.width*.46,top:p.y-p.width/.85*aspect*.975,bottom:p.y+p.width/.85*aspect*.025}),x=bounds(a),y=bounds(b);assert(!(Math.min(x.right,y.right)>Math.max(x.left,y.left)&&Math.min(x.bottom,y.bottom)>Math.max(x.top,y.top)),`${variant} ${count}: ${i}/${j}`);}
 }
});
