import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,createBird,DECOR_COLORS} from '../src/engine.js';
import {homeAtmosphere} from '../src/home-atmosphere.js';
import {renderHomeScene} from '../src/home-scene.js';
import {furnitureSceneSvg,furnitureSvg} from '../src/field-visuals.js';
const frozen=o=>{if(o&&typeof o==='object'){Object.freeze(o);for(const v of Object.values(o))frozen(v);}return o;};
test('projection is read-only including revision, RNG and every saved byte',()=>{
 const w=createWorld(12345);createBird(w,{home:'visitor'});const before=JSON.stringify(w);frozen(w);
 for(const food of [undefined])for(const place of ['home','park','friend'])for(const panel of ['garden','diary','memorial','decorate'])for(const memory of [true,false])homeAtmosphere(w,{place,panel,memory,selectedId:'b1'});
 assert.equal(JSON.stringify(w),before);
});
test('broad quiet band is separate from full care; mixed family and infants',()=>{
 const w=createWorld(12345),b=w.birds[0];b.needs.food=100;b.needs.energy=100;w.care.cleanliness=100;w.gems.droppings=[];
 const before=homeAtmosphere(w);b.needs.food=99;b.needs.energy=99;assert.equal(homeAtmosphere(w).state,before.state);assert.equal(homeAtmosphere(w).feed,before.feed);
 const other=createBird(w,{home:'resident'});other.needs.food=40;other.needs.energy=40;assert.equal(homeAtmosphere(w).state,'resting');
 other.home='visitor';assert.equal(homeAtmosphere(w).state,'quiet');b.stage='egg';assert.equal(homeAtmosphere(w).state,'nest');b.home='departed';assert.equal(homeAtmosphere(w).state,'empty');
});
test('storage, danger and independent screens suppress decoration; motion holds',()=>{
 const w=createWorld(12345);w.encounters.raptor.active={hostile:true};
 assert.equal(homeAtmosphere(w,{error:true}).state,'storage');assert.equal(homeAtmosphere(w).state,'health');
 w.encounters.raptor.active=null;
 for(const options of [{memory:true},{ending:true},{place:'friend'},{panel:'diary'}])assert.equal(homeAtmosphere(w,options).visible,false);
 for(const options of [{hidden:true},{motion:false}])assert.equal(homeAtmosphere(w,options).animate,false);
 w.paused=true;assert.equal(homeAtmosphere(w).animate,false);
});
test('all 24 equipped feeder forms use their existing vessel and preview stays pristine',()=>{
 const w=createWorld(12345);w.birds[0].needs.food=40;const a=homeAtmosphere(w);
 for(const c of DECOR_COLORS)for(const tier of [1,2,3]){
  const normal=furnitureSceneSvg('feed',c.hex,tier),live=furnitureSceneSvg('feed',c.hex,tier,a);
  assert(live.includes('game-feed-hulls'));assert(!normal.includes('game-feed-hulls'));assert.notEqual(live,normal);
  assert.equal((live.match(/<svg /g)||[]).length,1);assert.equal(furnitureSvg('feed',c.hex,tier).includes('game-feed-hulls'),false);
 }
 const html=renderHomeScene({base:'/',furniture:'fixture'});assert(!html.includes('game-home-daylight'));
 assert(renderHomeScene({base:'/',furniture:'fixture',atmosphere:a}).includes('game-home-daylight'));
});
