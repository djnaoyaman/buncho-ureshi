import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createWorld,createBird,validateWorld} from '../src/engine.js';
import {lifeStatus} from '../src/life-care.js';
import {renderLifeCarePanel,renderMemorialPanel,renderProtagonistSummary} from '../src/life-care-ui.js';
const NOW=Date.UTC(2026,10,5);
function seed(){const w=createWorld(NOW);w.paused=true;w.birds[0].home='departed';lifeStatus(w,'b1').death={cause:'accident',at:NOW,tick:0};return w;}
function doc(html){const window=new Window();window.document.body.innerHTML=html;return window.document;}
test('childless summary offers existing family but not an ordinary visitor, without mutation',()=>{
 const w=seed(),family=createBird(w,{home:'resident',name:'すず'}),friend=createBird(w,{home:'visitor'}),before=JSON.stringify(w);
 const d=doc(renderProtagonistSummary(w));assert.equal(d.querySelectorAll('[data-successor-open]').length,1);assert.ok(d.querySelector(`[data-successor-open="${family.id}"]`));assert.equal(d.querySelector(`[data-successor-open="${friend.id}"]`),null);assert.match(d.body.textContent,/確認するまで代替わりしません/);assert.equal(JSON.stringify(w),before);validateWorld(w);
});
test('health and memorial provide the same manual choice and preserve both existing care deadlines',()=>{
 const w=seed(),b=createBird(w,{home:'resident'});lifeStatus(w,b).condition={kind:'injury',sinceAt:NOW,deadlineAt:NOW+86400000};
 for(const render of [renderLifeCarePanel,renderMemorialPanel])assert.ok(doc(render(w)).querySelector(`[data-successor-open="${b.id}"]`));
 const d=doc(renderLifeCarePanel(w));assert.equal(d.querySelectorAll('[data-life-deadline]').length,2);assert.match(d.body.textContent,/ごはんと通院は、それぞれ必要/);validateWorld(w);
});
test('no living family gives an honest empty state without any reset, resurrection or replacement action',()=>{
 const w=seed();createBird(w,{home:'visitor'});const before=JSON.stringify(w),d=doc(renderProtagonistSummary(w));
 assert.equal(d.querySelectorAll('button').length,0);assert.match(d.body.textContent,/選べる家族もいません/);assert.match(d.body.textContent,/メニューの操作はそのまま/);assert.equal(JSON.stringify(w),before);
});
test('living direct-child egg keeps automatic priority instead of offering another family member',()=>{
 const w=seed(),father=createBird(w,{home:'resident',sex:'male'});createBird(w,{home:'resident',stage:'egg',parents:['b1',father.id],generation:1});
 const d=doc(renderProtagonistSummary(w));assert.equal(d.querySelectorAll('[data-successor-open]').length,0);assert.match(d.body.textContent,/子の卵がかえるのを待っています/);validateWorld(w);
});
test('only a former-family egg is disabled with a hatch explanation, never a queued selection',()=>{
 const w=seed(),mom=createBird(w,{home:'departed',sex:'female'}),dad=createBird(w,{home:'departed',sex:'male'}),egg=createBird(w,{home:'departed',stage:'egg',parents:[mom.id,dad.id],generation:1});
 const d=doc(renderProtagonistSummary(w));assert.equal(d.querySelectorAll('[data-successor-open]').length,1);assert.equal(d.querySelector(`[data-successor-open="${egg.id}"]`).disabled,true);assert.match(d.body.textContent,/自動では交代しません/);assert.deepEqual(w.protagonist.familySelections,[]);validateWorld(w);
});
test('full-home former family explains capacity without eviction and links family consultation',()=>{
 const w=seed();for(let i=0;i<6;i++)createBird(w,{home:'resident'});const away=createBird(w,{home:'departed'});away.milestones.push({kind:'adopt',otherId:null,tick:0});
 const d=doc(renderProtagonistSummary(w));assert.equal(d.querySelector(`[data-successor-open="${away.id}"]`).disabled,true);assert.match(d.body.textContent,/家族の空きが必要/);assert.ok(d.querySelector('[data-game-panel="family"]'));validateWorld(w);
});
test('candidate names are escaped in both labels and the surrounding summary',()=>{
 const w=seed();createBird(w,{home:'resident',name:'<img x>'});const d=doc(renderProtagonistSummary(w));assert.equal(d.querySelectorAll('img').length,0);assert.match(d.body.textContent,/<img x>を次の主人公に選ぶ/);
});
test('a returning illness at the supported clock ceiling explains why selection is unavailable',()=>{
 const w=seed(),away=createBird(w,{home:'departed'}),max=253402268399999;away.milestones.push({kind:'adopt',otherId:null,tick:0});w.lifecycle.seenAt=max;
 lifeStatus(w,away).condition={kind:'injury',sinceAt:max-2*86400000,deadlineAt:max-86400000};
 const d=doc(renderProtagonistSummary(w));assert.equal(d.querySelector(`[data-successor-open="${away.id}"]`).disabled,true);assert.match(d.body.textContent,/通院時間を確保できません/);assert.deepEqual(w.protagonist.familySelections,[]);validateWorld(w);
});
