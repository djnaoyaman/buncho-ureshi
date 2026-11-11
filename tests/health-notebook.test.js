// Deliberate active-clock deadline setup; return protection is covered separately.
const advanceTo=(w,at)=>advanceActiveClock(w,at,{present:true});
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {createWorld,createBird,advanceTo as advanceActiveClock,validateWorld} from '../src/engine.js';
import {lifeStatus} from '../src/life-care.js';
import {renderLifeCarePanel} from '../src/life-care-ui.js';
import {gameBirdSvg} from '../src/game.js';
const NOW=Date.UTC(2026,10,4),DAY=86400000;
function seed(){const w=createWorld(NOW,99);w.paused=true;w.economy.gold=w.economy.lifetimeGold=200;return w;}
function view(w){const before=JSON.stringify(w),win=new Window();win.document.body.innerHTML=renderLifeCarePanel(w,{birdSvg:gameBirdSvg});assert.equal(JSON.stringify(w),before);return win.document;}

test('health A puts all living residents before caretaker and game rules',()=>{
 const w=seed();const sick=createBird(w,{home:'resident',color:'sakura'});lifeStatus(w,sick).condition={kind:'injury',sinceAt:NOW,deadlineAt:NOW+DAY};createBird(w,{home:'visitor'});createBird(w,{home:'departed'});
 const doc=view(w),cards=[...doc.querySelectorAll('.life-bird-card')];assert.equal(cards.length,2);assert.equal(cards[0].querySelector('h4').textContent,sick.name);assert.match(doc.querySelector('.life-panel-heading').textContent,/家族 2羽/);assert.match(doc.querySelector('.life-panel-heading').textContent,/通院が必要な子が1羽/);
 const order=[...doc.querySelector('.life-health-notebook').children].map(e=>e.className);assert.ok(order.indexOf('life-bird-grid')<order.indexOf('life-caretaker-fold'));assert.ok(order.indexOf('life-bird-grid')<order.indexOf('life-health-rules'));
 assert.equal(doc.querySelector('.life-caretaker-fold').open,false);assert.match(doc.querySelector('.life-caretaker-fold > summary').textContent,/お留守番の飼育員/);assert.equal(doc.querySelectorAll('[data-life-hire]').length,3);assert.equal(doc.querySelectorAll('[data-life-treat]').length,1);assert.ok(!doc.querySelector('.life-care-warning').closest('details'));
});
test('real saved color and growth stage choose the unchanged sprite assets',()=>{
 for(const color of ['white','sakura','silver','cinnamon'])for(const stage of ['egg','chick','juvenile','adult']){
  const w=seed();w.birds[0].color=color;w.birds[0].stage=stage;const doc=view(w),sprite=doc.querySelector('.life-bird-portrait .game-sprite'),img=sprite.querySelector('img');assert.equal(sprite.dataset.color,color);assert.equal(sprite.dataset.stage,stage);assert.match(img.src,/game-art\//);assert.ok(!img.hasAttribute('onerror'));assert.equal(img.alt,'');
 }
});
test('long names are text, and never create a second portrait or executable markup',()=>{
 const w=seed();w.birds[0].name='長い名前<&"'.repeat(15)+'<img src=x onerror=alert(1)>';const doc=view(w);assert.equal(doc.querySelector('.life-bird-identity h4').textContent,w.birds[0].name);assert.equal(doc.querySelectorAll('.life-bird-card img').length,1);assert.equal(doc.querySelector('[onerror]'),null);
});
test('multiple illness cards and both exact real deadlines remain separate and sorted',()=>{
 const w=seed();const next=createBird(w,{home:'resident'});for(const [b,feed,treat] of [[w.birds[0],1,24],[next,72,1]]){const s=lifeStatus(w,b);s.lastCareAt=NOW+(feed-72)*3600000;s.condition={kind:'injury',sinceAt:NOW,deadlineAt:NOW+treat*3600000};}
 const doc=view(w);assert.match(doc.querySelector('.life-panel-heading').textContent,/通院が必要な子が2羽/);assert.equal(doc.querySelectorAll('.life-deadline-grid').length,2);assert.deepEqual([...doc.querySelectorAll('.life-deadline-grid')].map(e=>e.firstElementChild.dataset.lifeDeadline),['feed','treatment']);assert.equal(doc.querySelectorAll('[data-life-treat]').length,2);
});
test('active caretaker and 30-day limit stay present behind the entry',()=>{
 const w=seed();w.lifecycle.caretaker={fromAt:NOW,until:NOW+29*DAY};const doc=view(w);assert.match(doc.querySelector('.life-caretaker-fold > summary').textContent,/契約中/);assert.match(doc.querySelector('.life-bird-card').textContent,/飼育員がお世話/);assert.match(doc.querySelector('.life-contract').textContent,/29日/);assert.equal(doc.querySelector('[data-life-hire="1"]').disabled,false);assert.equal(doc.querySelector('[data-life-hire="3"]').disabled,true);assert.equal(doc.querySelector('[data-life-hire="7"]').disabled,true);
});
test('a waiting successor remains outside folded rules and can still be chosen',()=>{
 const w=seed();const next=createBird(w,{home:'resident'});lifeStatus(w,'b1').condition={kind:'injury',sinceAt:NOW,deadlineAt:NOW+DAY};advanceTo(w,NOW+DAY);validateWorld(w);const doc=view(w),section=doc.querySelector('.life-protagonist');assert.ok(!section.closest('details'));assert.ok(section.querySelector(`[data-successor-open="${next.id}"]`));assert.match(doc.querySelector('.life-panel-heading').textContent,/家族 1羽/);
});
test('zero residents and insufficient gold never create enabled care actions',()=>{
 const w=seed();w.economy.gold=0;lifeStatus(w,'b1').condition={kind:'injury',sinceAt:NOW,deadlineAt:NOW+DAY};let doc=view(w);assert.equal(doc.querySelector('[data-life-treat]').disabled,true);assert.ok([...doc.querySelectorAll('[data-life-hire]')].every(b=>b.disabled));assert.match(doc.querySelector('.life-bird-card').textContent,/Goldが足りません/);advanceTo(w,NOW+DAY);doc=view(w);assert.match(doc.querySelector('.life-panel-heading').textContent,/家族 0羽/);assert.equal(doc.querySelectorAll('.life-bird-card').length,0);assert.equal(doc.querySelectorAll('[data-life-treat]').length,0);assert.ok([...doc.querySelectorAll('[data-life-hire]')].every(b=>b.disabled));
});
test('A painting is local to health and preserves keyboard target outlines',async()=>{
 const css=await readFile(new URL('../src/life-care.css',import.meta.url),'utf8');const added=css.slice(css.indexOf('/* Approved A:'));assert.ok(added.includes(':focus-visible'));assert.ok(added.includes('min-height:54px'));assert.ok(added.includes('min-height:56px'));assert.ok(added.includes('max-width:360px'));assert.ok(!added.includes('.life-memorial-panel'));assert.ok(!added.includes('display:none!important'));
});

test('browser A fixtures pass real save validation before any remote browser launch',async()=>{
 const {healthNotebookFixture,HEALTH_NOTEBOOK_NOW}=await import('./fixtures/health-notebook.js');
 const {serializeWorld,parseSave}=await import('../src/engine.js');
 for(const longName of [false,true]){const w=healthNotebookFixture({longName});assert.deepEqual(parseSave(serializeWorld(w)),w);assert.equal(w.birds[0].naming.assignedName,w.birds[0].name);assert.equal(lifeStatus(w,'b1').condition.deadlineAt-lifeStatus(w,'b1').condition.sinceAt,86400000);assert.equal(w.economy.gold,longName?0:200);if(!longName)assert.equal(lifeStatus(w,'b1').condition.deadlineAt-HEALTH_NOTEBOOK_NOW,12*3600000);}
});

test('health A separates priority, complete time units and age without duplicating the treatment hint',()=>{
 const w=seed();lifeStatus(w,'b1').condition={kind:'respiratory',sinceAt:NOW,deadlineAt:NOW+DAY};const doc=view(w),card=doc.querySelector('.is-unwell');
 assert.equal(card.querySelector('.life-health-condition').textContent,'呼吸器の病気');assert.match(card.querySelector('.life-bird-age').textContent,/ゲーム内/);assert.equal(card.querySelector('.life-treatment-hint'),null);assert.equal(card.querySelector('[data-life-treat]').nextElementSibling.className,'life-small life-deadline-note');
 assert.equal(card.querySelectorAll('.life-time-unit').length,4);for(const unit of card.querySelectorAll('.life-time-unit'))assert.match(unit.textContent,/^\d+(日|時間|分)$/);
 assert.equal(card.querySelector('.life-deadline-label').textContent,'通院まで（実時間）');assert.equal(card.querySelector('.life-deadline-priority').textContent,'先に必要');
});
