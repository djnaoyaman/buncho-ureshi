import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld} from '../src/engine.js';
import {renderFoodChoice} from '../src/food-choice-ui.js';
test('food choice is optional, free, transparent, and hides for dependent/dead birds',()=>{
 const w=createWorld(1800000000000),b=w.birds[0];b.stage='juvenile';
 const html=renderFoodChoice(b,w.lifecycle.seenAt,{selectedFood:'pellet'});
 assert.match(html,/ペレットごはん/);assert.match(html,/value="pellet" selected/);assert.match(html,/すべて無料/);assert.match(html,/寿命や健康は変わりません/);assert.match(html,/実時間24時間に1回/);
 assert.equal(renderFoodChoice(b,w.lifecycle.seenAt,{alive:false}),'');b.stage='chick';assert.equal(renderFoodChoice(b,w.lifecycle.seenAt),'');
});
test('adult never promises growth and cooldown is derived from committed stamp',()=>{
 const w=createWorld(1800000000000),b=w.birds[0];assert.match(renderFoodChoice(b,w.lifecycle.seenAt),/成鳥は成長時間が変わりません/);
 b.stage='juvenile';b.foodGrowth={bonusTicks:100,lastBonusAt:w.lifecycle.seenAt,lastFood:'pellet'};
 const before=JSON.stringify(w);assert.match(renderFoodChoice(b,w.lifecycle.seenAt),/あと約24実時間/);
 assert.equal(JSON.stringify(w),before);
});

test('legacy percentages reflect actual rounded gain and visitor young birds are not called adults',()=>{const w=createWorld(1800000000000),b=w.birds[0];b.stage='juvenile';b.growthPace='legacy';let html=renderFoodChoice(b,w.lifecycle.seenAt);assert.match(html,/約−2.1%/);assert.doesNotMatch(html,/約−4%/);b.home='visitor';html=renderFoodChoice(b,w.lifecycle.seenAt);assert.match(html,/友達は、成長の後押しの対象外/);assert.doesNotMatch(html,/成鳥は/);});
