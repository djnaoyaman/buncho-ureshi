import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createWorld} from '../src/engine.js';
import {arriveGardenRaptor,raptorToken} from '../src/garden-raptors.js';
import {renderRaptorNotice,updateRaptorNotice} from '../src/garden-raptor-ui.js';
import {renderCrowNotice} from '../src/garden-crow-ui.js';
import {renderGardenAboutBooklet} from '../src/garden-about-booklet.js';
const now=Date.UTC(2026,10,11);
test('urgent threshold uses remaining observed time, preserves focused exit and never writes the world',()=>{
 const w=createWorld(now);w.encounters.garden.open=true;w.field.place='park';w.encounters.gardenFriends.attendees=['b1'];
 arriveGardenRaptor(w,'black-kite',now,{...raptorToken(w),gardenId:w.encounters.garden.id});
 const win=new Window();try{
  w.encounters.raptor.active.remainingMs=10001;win.document.body.innerHTML=renderRaptorNotice(w);
  const home=win.document.querySelector('button');home.focus();assert.equal(win.document.querySelector('[data-raptor-notice]').dataset.raptorUrgent,'false');
  w.encounters.raptor.active.remainingMs=10000;const before=structuredClone(w);updateRaptorNotice(win.document.body,w);
  assert.equal(win.document.querySelector('[data-raptor-notice]').dataset.raptorUrgent,'true');assert.equal(home.textContent,'今すぐ帰る');assert.equal(win.document.activeElement,home);assert.equal(win.document.querySelector('[data-raptor-seconds]').textContent,'10');assert.deepEqual(w,before);
  updateRaptorNotice(win.document.body,w);assert.equal(win.document.activeElement,home);
 }finally{win.happyDOM.abort();}
});
test('shadow and garden guide distinguish arrival odds, escape time and consequences without mutation',()=>{
 const w=createWorld(now),before=structuredClone(w),notice=renderCrowNotice(w,{warning:'large-billed-crow',now});
 assert.match(notice,/6秒でカラスが来る/);assert.match(notice,/来る前に/);assert.doesNotMatch(notice,/事故死/);
 const guide=renderGardenAboutBooklet({name:'庭',description:'創作の庭'});
 assert.match(guide,/事故の確率ではありません/);assert.match(guide,/2分ごとに25%/);assert.match(guide,/危険な来訪は全種類合わせて24時間に1回まで/);assert.match(guide,/次のカラスまで10分/);assert.doesNotMatch(guide,/1分ごとに1%/);assert.match(guide,/残り10秒/);assert.match(guide,/おうちで留守番している文鳥は狙われません/);assert.deepEqual(w,before);
});
