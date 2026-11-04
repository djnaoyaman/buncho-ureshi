import assert from 'node:assert/strict';
import test from 'node:test';
import {furnitureSvg,furnitureSceneSvg,furnitureFormName,FURNITURE_FORMS,fieldPositions,friendFurnishing} from '../src/field-visuals.js';
import {createWorld,DECOR_SLOTS,DECOR_COLORS,DECOR_TIERS,validateWorld,serializeWorld,parseSave,equipDecoration} from '../src/engine.js';
test('all 216 furniture variants have distinct forms, matching scene geometry and lossless saved ownership',()=>{
const w=createWorld(100),items=DECOR_SLOTS.flatMap(s=>DECOR_COLORS.flatMap(c=>DECOR_TIERS.map(t=>({id:`${s.id}-${c.id}-${t.id}`,slot:s.id,color:c.id,tier:t.id}))));
w.decor.inventory=structuredClone(items);w.decor.lifetimePoints=9999;
validateWorld(w);const save=serializeWorld(w);let count=0;
for(const s of DECOR_SLOTS){
 assert.equal(FURNITURE_FORMS[s.id].length,8);assert.equal(new Set(FURNITURE_FORMS[s.id]).size,8);
 const distinct=[];
 for(const c of DECOR_COLORS){
  const tierShapes=[];
  for(let t=1;t<=3;t++){
   const a=furnitureSvg(s.id,c.hex,t),b=furnitureSceneSvg(s.id,c.hex,t);
   assert(a.startsWith('<svg'));assert.equal(a,furnitureSvg(s.id,c.hex,t));assert(!/NaN|Infinity|undefined|null/.test(a));
   assert.equal(a.replace(/viewBox="[^"]+"/,'').replace(/ data-scene-art="true"/,''),b.replace(/viewBox="[^"]+"/,'').replace(/ data-scene-art="true"/,'').replace(/ data-scene-mount="[^"]+"/,'').replace(/<g data-scene-fixture="wall"[\s\S]*?<\/g>/,''),'catalog and scene must use identical geometry');
   assert(a.includes('aria-hidden="true"'));assert(a.includes('focusable="false"'));assert(a.includes('data-item-art="atelier-v3"'));assert(furnitureFormName(s.id,c.hex));
   const geometry=[...a.matchAll(/<(?:path|rect|circle|ellipse)\b[^>]*>/g)].map(x=>x[0].replace(/(?:fill|stroke)="[^"]*"/g,'').replace(/id="[^"]*"/g,'')).join('');tierShapes.push(geometry);count++;
  }
  assert.equal(new Set(tierShapes).size,3,`${s.id}/${c.id}: tier detail must change actual drawing`);
  distinct.push(tierShapes[0]);
 }
 assert.equal(new Set(distinct).size,8,`${s.id}: 8 real geometry forms, not recolors`);
}
assert.equal(serializeWorld(w),save,'art must never mutate world state');
for(const item of items){equipDecoration(w,item.id);const round=parseSave(serializeWorld(w));assert.deepEqual(round.decor.inventory,items);assert.equal(round.decor.equipped[item.slot],item.id);}
assert.equal(items.length,216);assert.equal(new Set(items.map(i=>i.id)).size,216);
assert(!furnitureSvg('water','url(javascript:alert(1))',3).includes('javascript'));

});
