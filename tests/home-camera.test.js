import test from 'node:test';
import assert from 'node:assert/strict';
import {fieldPositions,HOME_NEST_VISUAL_RATIO,HOME_VISIBLE_STAGE_HEIGHT,homeCropOffset,homeRoomHopClear} from '../src/field-visuals.js';
import {gameBirdSvg} from '../src/game.js';
const bird=(id,stage)=>({id,stage,color:'white',action:{kind:stage==='egg'||stage==='chick'?'nest':'rest'}});
test('home camera retains the approved initial offset and clamps both manual ends',()=>{
 const g={width:390,planeWidth:633,left:185.37};assert.equal(homeCropOffset(g,null),185.37);
 assert.equal(homeCropOffset(g,-5),0);assert.equal(homeCropOffset(g,7),243);assert.equal(homeCropOffset(g,.5),121.5);
 assert.equal(homeCropOffset({width:1200,planeWidth:1200,left:0},.5),0);
});
test('nest-body size uses alpha height, egg:chick ratio is consistent at one depth, and no actor is invented',()=>{
 const input=[bird('a','adult'),bird('c','chick'),bird('e','egg')],before=structuredClone(input);
 for(const variant of ['tall','wide'])for(const f of [.35,.65,.95]){
  const p=fieldPositions(input,variant,'home',f);
  assert.deepEqual([...p.keys()].sort(),['a','c','e']);assert.equal(p.get('c').interactive,false);
  const c=p.get('c').width*HOME_VISIBLE_STAGE_HEIGHT.chick,e=p.get('e').width*HOME_VISIBLE_STAGE_HEIGHT.egg;
  assert.ok(Math.abs(e/c-HOME_NEST_VISUAL_RATIO.egg/HOME_NEST_VISUAL_RATIO.chick)<1e-10);
  assert.equal(p.get('c').y,p.get('e').y);
  assert.equal(fieldPositions(input,variant,'friend',f).get('c').width,fieldPositions(input,variant,'friend').get('c').width);
 }
 assert.deepEqual(input,before);
 assert.match(gameBirdSvg('white','chick','left',true),/home-chick-dehalo-v1\.webp/);
 assert.match(gameBirdSvg('white','chick'),/game-art\/chick\.webp/);
 assert.doesNotMatch(gameBirdSvg('white','adult','left',true),/home-chick/);
});
test('home hops use old/new full rectangles; insufficient lanes retain the native dissolve',()=>{
 const box=(l,t,r,b)=>({left:l,top:t,right:r,bottom:b});
 const clip=box(0,0,390,844),from=box(10,80,55,130),to=box(70,80,115,130);
 assert.equal(homeRoomHopClear(from,to,[box(140,70,190,125)],clip),true);
 assert.equal(homeRoomHopClear(from,to,[box(56,82,69,125)],clip),false);
 assert.equal(homeRoomHopClear(from,to,[box(59,60,62,65)],clip),true);
 assert.equal(homeRoomHopClear(from,to,[box(59,67,62,84)],clip),false);
 assert.equal(homeRoomHopClear(from,box(-1,81,44,131),[],clip),false);
});
