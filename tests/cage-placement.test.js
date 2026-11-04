import test from 'node:test';
import assert from 'node:assert/strict';
import {DECOR_SLOTS, DECOR_COLORS, DECOR_TIERS, createWorld, serializeWorld, parseSave} from '../src/engine.js';
import {furnitureSceneSvg, furnitureSvg, friendFurnishing} from '../src/field-visuals.js';
const mount={perch:'perch',feed:'wall',water:'wall',greens:'wall',shellgrit:'wall',bath:'floor',paper:'floor',swing:'ceiling',toy:'ceiling'};
test('all 216 existing furnishings have a physical mount without changing collectible artwork',()=>{
 const ids=new Set();
 for(const slot of DECOR_SLOTS)for(const color of DECOR_COLORS)for(const [i,tier] of DECOR_TIERS.entries()){
  const scene=furnitureSceneSvg(slot.id,color.hex,i+1),product=furnitureSvg(slot.id,color.hex,i+1);
  ids.add(`${slot.id}-${color.id}-${tier.id}`);
  assert(scene.includes(`data-scene-mount="${mount[slot.id]}"`));
  assert.equal(scene.includes('data-scene-fixture="wall"'),mount[slot.id]==='wall');
  assert(!product.includes('data-scene-fixture'));
  assert(!scene.includes('undefined'));
 }
 assert.equal(ids.size,216);
});
test('mounting is render-only: legacy inventory, equipped IDs, bird data and friend tastes survive',()=>{
 const w=createWorld(Date.UTC(2026,10,4));
 w.decor.lifetimePoints=9999;
 w.decor.inventory=DECOR_SLOTS.flatMap(s=>DECOR_COLORS.flatMap(c=>DECOR_TIERS.map(t=>({id:`${s.id}-${c.id}-${t.id}`,slot:s.id,color:c.id,tier:t.id}))));
 for(const s of DECOR_SLOTS)w.decor.equipped[s.id]=`${s.id}-rose-special`;
 const saved=serializeWorld(w),copy=parseSave(saved);
 assert.deepEqual(copy.decor,w.decor);assert.deepEqual(copy.birds,w.birds);
 for(const s of DECOR_SLOTS){const f=friendFurnishing(w.birds[0],s.id,DECOR_COLORS,DECOR_TIERS);assert.equal(f.slot,s.id);assert(furnitureSceneSvg(f.slot,DECOR_COLORS.find(c=>c.id===f.color).hex,1).includes(`data-scene-mount="${mount[s.id]}"`));}
 assert.equal(serializeWorld(w),saved);
});
