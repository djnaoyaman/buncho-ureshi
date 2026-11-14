import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {createWorld} from '../src/engine.js';
import {encounterSystem} from '../src/encounters.js';
import {GARDEN_IDS} from '../src/data/gardens.js';
import {leafEventStatus,leafEventToken,startLeafEvent} from '../src/garden-leaf-event.js';
import {renderLeafGift} from '../src/garden-leaf-event-ui.js';
import {renderFinchGarden} from '../src/encounter-ui.js';
function ready(){const w=createWorld(Date.UTC(2026,10,14,8));for(const id of GARDEN_IDS){encounterSystem.selectGarden(w,id,leafEventToken(w));if(leafEventStatus(w).available)return w;}throw Error('no story');}
test('real garden DOM and CSS place the story above the stage with contained scrolling',()=>{
 const win=new Window(),w=ready();
 win.document.head.innerHTML='<style>'+readFileSync('src/encounter-ui.css','utf8')+readFileSync('src/game.css','utf8')+'</style>';
 win.document.body.dataset.world='buncho';win.document.body.innerHTML='<div class="game-encounter-host">'+renderFinchGarden(w)+'</div>';
 const card=win.document.querySelector('.finch-garden > .leaf-gift'),style=win.getComputedStyle(card),stage=win.getComputedStyle(win.document.querySelector('.finch-garden-stage'));
 assert.equal(stage.position,'absolute');assert.equal(style.position,'absolute');assert.equal(style.zIndex,'6');assert.equal(style.overflowY,'visible');assert.equal(style.touchAction,'pan-y');
 assert.ok(card.querySelector('[data-leaf-start]'));assert.equal(card.open,false);card.open=true;assert.equal(win.getComputedStyle(card.querySelector('.garden-story-header')).position,'sticky');
 // DOM/CSS regression only: no browser layout or real-device acceptance claimed.
 win.happyDOM.abort();
});
test('blocked story retains explanation but never offers mutations',()=>{
 for(const [change,message] of [[w=>{w.paused=true;},/おやすみ/],[w=>{w.encounters.active={id:'sparrow'};},/おきゃくさま/],[w=>{w.encounters.raptor.active={id:'black-kite'};},/ほかの とり/],[w=>{w.encounters.crow.active={id:'crow'};},/ほかの とり/]]){
 const w=ready();change(w);const before=structuredClone(w),html=renderLeafGift(w);assert.match(html,/data-leaf-unavailable/);assert.match(html,message);assert.doesNotMatch(html,/data-leaf-(start|choice|complete|display)[ =>]/);assert.deepEqual(w,before);
 }
});
test('missing actors and a story in another garden explain how to continue',()=>{
 const w=ready();w.encounters.gardenFriends.visits.find(v=>v.gardenId===w.encounters.garden.id).friendIds=[];
 assert.match(renderLeafGift(w),/べつの にわ/);
 const a=ready();startLeafEvent(a,leafEventToken(a));encounterSystem.selectGarden(a,GARDEN_IDS.find(id=>id!==a.leafEvent.entry.gardenId),leafEventToken(a));assert.match(renderLeafGift(a),/にっきから/);assert.doesNotMatch(renderLeafGift(a),/data-leaf-choice=/);
 encounterSystem.leaveGarden(a,leafEventToken(a));assert.equal(renderLeafGift(a),'');
});
