import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createWorld} from '../src/engine.js';
import {renderFoodChoice} from '../src/food-choice-ui.js';
const bodyText=html=>html.replace(/<rt[^>]*>.*?<\/rt>/g,'').replace(/<[^>]+>/g,'');
test('food choice offers short steps, free meals and folded accurate rules without changing saves',()=>{
 const w=createWorld(1800000000000),b=w.birds[0];b.stage='juvenile';const before=JSON.stringify(w);
 const html=renderFoodChoice(b,w.lifecycle.seenAt,{selectedFood:'pellet'}),text=bodyText(html),window=new Window();window.document.body.innerHTML=html;
 assert.match(html,/value="pellet" selected/);assert.match(text,/どれも無料/);assert.match(text,/寿命（生きられる時間）や健康はかわりません/);assert.match(text,/24時間（1日）に1回/);assert.match(text,/おとなになるまでのまちじかんが少しみじかく/);
 assert.equal(window.document.querySelectorAll('ol.kids-steps>li').length,2);assert.equal(window.document.querySelector('[data-game-details=food-rules]').open,false);
 for(const rt of window.document.querySelectorAll('rt'))assert.equal(rt.getAttribute('aria-hidden'),'true');
 for(const option of window.document.querySelectorAll('option')){assert.equal(option.children.length,0);assert.doesNotMatch(option.textContent,/[\u4e00-\u9fff]/);}
 assert.equal(JSON.stringify(w),before);assert.equal(renderFoodChoice(b,w.lifecycle.seenAt,{alive:false}),'');b.stage='chick';assert.equal(renderFoodChoice(b,w.lifecycle.seenAt),'');window.happyDOM.abort();
});
test('adult and visitor explanations do not promise growth; cooldown comes from committed time',()=>{
 const w=createWorld(1800000000000),b=w.birds[0];assert.match(bodyText(renderFoodChoice(b,w.lifecycle.seenAt)),/この子はもうおとな/);assert.doesNotMatch(renderFoodChoice(b,w.lifecycle.seenAt),/まちじかん やく/);
 b.stage='juvenile';b.foodGrowth={bonusTicks:100,lastBonusAt:w.lifecycle.seenAt,lastFood:'pellet'};
 const before=JSON.stringify(w);assert.match(bodyText(renderFoodChoice(b,w.lifecycle.seenAt)),/あと約24時間/);assert.match(bodyText(renderFoodChoice(b,w.lifecycle.seenAt)),/あなたの時計/);assert.equal(JSON.stringify(w),before);
 b.home='visitor';const text=bodyText(renderFoodChoice(b,w.lifecycle.seenAt));assert.match(text,/あそびに来た友だちは、ごはんをかえても育つはやさはかわりません/);assert.doesNotMatch(text,/この子はもうおとな/);assert.doesNotMatch(text,/まちじかん やく/);
});
test('legacy food options retain actual rounded percentages and make zero gains explicit',()=>{
 const w=createWorld(1800000000000),b=w.birds[0];b.stage='juvenile';b.growthPace='legacy';const html=renderFoodChoice(b,w.lifecycle.seenAt);
 assert.match(html,/まちじかん やく2.1% みじかく/);assert.doesNotMatch(html,/まちじかん やく4%/);assert.match(html,/<option value="greens">あおなをそえたごはん · いつものはやさ<\/option>/);assert.match(bodyText(html),/もともとはやく育つ子は、数字が小さく/);
});
test('growth cap is explained without implying more clicks can accelerate further',()=>{
 const w=createWorld(1800000000000),b=w.birds[0];b.stage='juvenile';b.foodGrowth={bonusTicks:873,lastBonusAt:w.lifecycle.seenAt,lastFood:'pellet'};const text=bodyText(renderFoodChoice(b,w.lifecycle.seenAt));assert.match(text,/これ以上みじかくなりません/);assert.match(text,/ぜんぶ合わせても20%まで/);assert.match(text,/たくさんはやくは育ちません/);
});
