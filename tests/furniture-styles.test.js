import test from 'node:test';
import assert from 'node:assert/strict';
import {furnitureSvg,furnitureSceneSvg} from '../src/field-visuals.js';
import {furnitureMaterials} from '../src/furniture-styles.js';
import {DECOR_SLOTS,DECOR_COLORS} from '../src/engine.js';
import {readFileSync} from 'node:fs';
test('all 216 art finishes have valid stroke values and explicit style identity',()=>{
 for(const slot of DECOR_SLOTS)for(const color of DECOR_COLORS)for(const [i,style] of ['warm','mid-century','gold'].entries()){
  const svg=furnitureSvg(slot.id,color.hex,i+1);assert(svg.includes(`data-furniture-style="${style}"`));
  for(const [,value] of svg.matchAll(/stroke-width="([^"]+)"/g))assert(Number.isFinite(Number(value))&&Number(value)>0,`${slot.id} ${style}: ${value}`);
  for(const [,value] of svg.matchAll(/stroke="([^"]+)"/g))assert(/^(none|#[a-f\d]{6}|url\(#.+\))$/i.test(value),value);
  assert.equal(svg.replace(/viewBox="[^"]+"/,''),furnitureSceneSvg(slot.id,color.hex,i+1).replace(/viewBox="[^"]+"/,'').replace(' data-scene-art="true"',''));
 }
});
test('mid-century floor plinths and hanging furniture retain separate support geometry',()=>{
 for(const slot of ['feed','bath','shellgrit','greens','water'])assert(furnitureSvg(slot,'#8fbea6',2).includes('scale(1 .88)'));
 for(const [slot,color] of [['water','#beb0dc'],['greens','#edd88a'],['perch','#8fbea6'],['swing','#8fbea6'],['toy','#8fbea6'],['paper','#8fbea6']])assert(!furnitureSvg(slot,color,2).includes('scale(1 .88)'));
 for(const slot of ['swing','toy'])for(const color of DECOR_COLORS)for(const tier of [1,2,3])assert(furnitureSvg(slot,color.hex,tier).includes('cy="13"'),'roof hook retained');
});
test('mid-century uses deep colors and walnut while gold finish keeps natural contact wood',()=>{
 const warm=furnitureMaterials(0,'#8fbea6',1),mid=furnitureMaterials(0,'#8fbea6',2),gold=furnitureMaterials(0,'#8fbea6',3);
 assert.notEqual(warm.body,mid.body);assert.notDeepEqual(warm.wood,mid.wood);assert.equal(gold.body,'#d7ae48');assert.deepEqual(warm.wood,gold.wood);
 const build=readFileSync(new URL('../scripts/build.mjs',import.meta.url),'utf8');assert(build.includes('"furniture-styles.js"'));assert(build.includes('.replaceAll("./furniture-styles.js", `./furniture-styles.js?v=${gameVersion}`)'));
});
