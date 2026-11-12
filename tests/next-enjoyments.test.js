import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {nextEnjoyments,renderNextEnjoyments} from '../src/game-next-goals.js';
import {createWorld,createBird,DECOR_SLOTS,DECOR_COLORS,DECOR_TIERS} from '../src/engine.js';
import {encounterSystem} from '../src/encounters.js';
import {readFileSync} from 'node:fs';
const now=Date.UTC(2026,10,11);
test('new world suggestions cover four independent interests without revealing an unseen name or changing any save field',()=>{
 const w=createWorld(now),before=structuredClone(w),goals=nextEnjoyments(w);
 assert.deepEqual(goals.map(g=>g.id),['meeting','friendship','collection','family']);assert.equal(goals[0].progress,`出会い 0 / ${encounterSystem.catalog.length}`);assert.ok(goals[0].encounterId);assert.equal(goals[1].encounterId,undefined);assert.match(goals[1].text,/まずは庭/);assert.match(goals[2].progress,/\/ 216$/);assert.equal(goals[3].progress,'いまは第1世代');assert.deepEqual(w,before);
 const entry=encounterSystem.catalog.find(e=>e.id===goals[0].encounterId);assert.ok(!goals[0].text.includes(entry.name));
});
test('closest known friendship and waiting first encounter are derived without sorting the source records',()=>{
 const w=createWorld(now),entries=encounterSystem.catalog.slice(0,4),states=[{discovered:true,points:10},{discovered:true,points:90},{discovered:false,ready:true},{discovered:false}];
 const system={catalog:entries,status:(_,id)=>states[entries.findIndex(e=>e.id===id)]},before=structuredClone(w),goals=nextEnjoyments(w,{system});
 assert.equal(goals[0].encounterId,entries[2].id);assert.equal(goals[1].encounterId,entries[1].id);assert.match(goals[1].text,/あと10ポイント/);assert.deepEqual(w,before);assert.equal(states[0].points,10);
});
test('completed discoveries, friendship and collection celebrate completion instead of asking for nonexistent targets',()=>{
 const w=createWorld(now);w.decor.lifetimePoints=1000;w.decor.inventory=DECOR_SLOTS.flatMap(s=>DECOR_TIERS.flatMap(t=>DECOR_COLORS.map(c=>({id:`${s.id}-${c.id}-${t.id}`,slot:s.id,tier:t.id,color:c.id}))));
 const system={catalog:encounterSystem.catalog,status:()=>({discovered:true,points:100})},goals=nextEnjoyments(w,{system});
 assert.equal(goals[0].encounterId,undefined);assert.match(goals[0].text,/読み返して/);assert.equal(goals[1].encounterId,undefined);assert.match(goals[1].text,/みんな大のなかよし/);assert.match(goals[2].text,/全部そろった/);assert.equal(goals[2].slotId,undefined);
});
test('fully owned unlocked tiers point to the real next unlock, not another draw',()=>{
 const w=createWorld(now);w.decor.inventory=DECOR_SLOTS.flatMap(s=>DECOR_COLORS.map(c=>({id:`${s.id}-${c.id}-cozy`,slot:s.id,tier:'cozy',color:c.id})));
 const goal=nextEnjoyments(w)[2];assert.equal(goal.slotId,undefined);assert.match(goal.text,/Lv.3/);assert.match(goal.text,/今の仕上げはそろった/);
});
test('living resident growth keeps its pace and name while archived birds do not become tasks',()=>{
 const w=createWorld(now),b=createBird(w,{stage:'chick',home:'resident',name:'育つ子'});w.birds[0].generation=2;const before=structuredClone(w),goal=nextEnjoyments(w)[3];assert.match(goal.text,/育つ子は今「ひな」。次は「幼鳥」/);assert.equal(goal.progress,'いまは第3世代');assert.deepEqual(w,before);
 b.home='departed';assert.doesNotMatch(nextEnjoyments(w)[3].text,/育つ子/);
});
test('rendering escapes names, keeps native disclosure and routes only through suggestion controls',()=>{
 const w=createWorld(now),b=createBird(w,{stage:'chick',home:'resident'});b.name='<img src=x onerror=alert(1)>';const before=structuredClone(w),win=new Window();try{
 win.document.body.innerHTML=renderNextEnjoyments(w);assert.equal(win.document.querySelector('details').open,false);assert.equal(win.document.querySelectorAll('[data-next-goal]').length,4);assert.equal(win.document.querySelectorAll('img,script,[data-game-panel]').length,0);assert.equal(win.document.querySelectorAll('[data-goal-panel]').length,4);assert.ok(win.document.body.textContent.includes(b.name));assert.deepEqual(w,before);
 }finally{win.happyDOM.abort();}
});
test('built suggestion module and its dependencies share the current game cache version',()=>{
 const game=readFileSync(new URL('../dist/src/game.js',import.meta.url),'utf8');
 const goals=readFileSync(new URL('../dist/src/game-next-goals.js',import.meta.url),'utf8');
 const version=game.match(/\.\/game-next-goals\.js\?v=([a-f0-9]{12})/);
 assert.ok(version,'game imports the versioned suggestion module');
 for(const module of ['engine','encounters'])assert.ok(goals.includes(`./${module}.js?v=${version[1]}`),`${module} uses the same cache version`);
});
