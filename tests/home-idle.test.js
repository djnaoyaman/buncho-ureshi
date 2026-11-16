import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,DECOR_COLORS} from '../src/engine.js';
import {homeAtmosphere,homeIdlePose} from '../src/home-atmosphere.js';
import {furnitureSvg} from '../src/field-visuals.js';
test('individual rest is pure, deterministic and keeps actual social/action priority',()=>{
 const w=createWorld(12345),b=w.birds[0];b.action.kind='rest';b.action.target=null;b.needs.energy=40;assert.equal(homeIdlePose(w,b),'rest');b.needs.energy=b.needs.food=100;
 const before=JSON.stringify(w);const poses=Array.from({length:100},(_,i)=>homeIdlePose(w,b,i*1000));assert(poses.includes('rest'));assert(poses.includes('preen'));assert.deepEqual(poses,Array.from({length:100},(_,i)=>homeIdlePose(w,b,i*1000)));assert.equal(JSON.stringify(w),before);
 for(const kind of ['eat','play','talk','bath','nest']){b.action.kind=kind;assert.equal(homeIdlePose(w,b),null);}b.action.kind='rest';b.action.target='b2';assert.equal(homeIdlePose(w,b),null);b.action.target=null;
 for(const home of ['visitor','departed']){b.home=home;assert.equal(homeIdlePose(w,b),null);}b.home='resident';assert.equal(homeIdlePose(w,b,0,false),null);w.field.place='friend';assert.equal(homeIdlePose(w,b),null);
});
test('water uses existing geometry in every material; decoration previews are unchanged',()=>{
 const w=createWorld(12345),a=homeAtmosphere(w);
 for(const slot of ['water','bath'])for(const color of DECOR_COLORS)for(const tier of [1,2,3]){
  const plain=furnitureSvg(slot,color.hex||color,tier),actual=furnitureSvg(slot,color.hex||color,tier,a);
  assert.match(actual,/class="game-home-water"/);assert.equal(actual.replaceAll('class="game-home-water" ',''),plain);
 }
 assert.doesNotMatch(furnitureSvg('feed','#a6c6b2',1,a),/game-home-water/);
});
