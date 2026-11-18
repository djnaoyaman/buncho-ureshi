import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {nextEnjoyments,renderNextEnjoyments,nextGardenStory,endingEnjoyment} from '../src/game-next-goals.js';
import {createWorld,createBird,DECOR_SLOTS,DECOR_COLORS,DECOR_TIERS} from '../src/engine.js';
import {encounterSystem} from '../src/encounters.js';
import {readFileSync} from 'node:fs';
const now=Date.UTC(2026,10,11);
test('new world suggestions cover four independent interests without revealing an unseen name or changing any save field',()=>{
 const w=createWorld(now),before=structuredClone(w),goals=nextEnjoyments(w);
 assert.deepEqual(goals.map(g=>g.id),['meeting','friendship','collection','family','story','endings']);assert.equal(goals[0].progress,`出会い 0 / ${encounterSystem.catalog.length}`);assert.ok(goals[0].encounterId);assert.equal(goals[1].encounterId,undefined);assert.match(goals[1].text,/まずは庭/);assert.match(goals[2].progress,/\/ 216$/);assert.equal(goals[3].progress,'いまは第1世代');assert.deepEqual(w,before);
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
 win.document.body.innerHTML=renderNextEnjoyments(w);assert.equal(win.document.querySelector('details').open,false);assert.equal(win.document.querySelectorAll('[data-next-goal]').length,6);assert.equal(win.document.querySelectorAll('img,script,[data-game-panel]').length,0);assert.equal(win.document.querySelectorAll('[data-goal-panel]').length,6);assert.ok(win.document.body.textContent.includes(b.name));assert.deepEqual(w,before);
 }finally{win.happyDOM.abort();}
});
test('built suggestion module and its dependencies share the current game cache version',()=>{
 const game=readFileSync(new URL('../dist/src/game.js',import.meta.url),'utf8');
 const goals=readFileSync(new URL('../dist/src/game-next-goals.js',import.meta.url),'utf8');
 const version=game.match(/\.\/game-next-goals\.js\?v=([a-f0-9]{12})/);
 assert.ok(version,'game imports the versioned suggestion module');
 for(const module of ['engine','encounters'])assert.ok(goals.includes(`./${module}.js?v=${version[1]}`),`${module} uses the same cache version`);
});

test('story invitation never advances state and gives paused or dangerous play precedence',()=>{
 const w=createWorld(now);let before=structuredClone(w);nextGardenStory(w);assert.deepEqual(w,before);
 w.paused=true;assert.equal(nextGardenStory(w).panel,'settings');assert.equal(nextGardenStory(w).story,undefined);
 w.paused=false;w.encounters.active={id:'busy'};assert.equal(nextGardenStory(w).story,null);assert.match(nextGardenStory(w).text,/先に庭/);
});
test('unfinished stories return to their actual garden and take precedence over new collecting',()=>{
 const w=createWorld(now);w.expedition.entries.push({path:'brook',completedTick:null,gardenId:'java-rice'});
 const g=nextGardenStory(w);assert.equal(g.story,'expedition');assert.equal(g.gardenId,'java-rice');assert.match(g.text,/途中/);
 w.showcase={active:{completedTick:null,gardenId:'komorebi'},entries:[],purchases:[]};assert.equal(nextGardenStory(w).story,'showcase');assert.equal(nextGardenStory(w).gardenId,'komorebi');
 const before=structuredClone(w);renderNextEnjoyments(w);assert.deepEqual(w,before);
});
test('friend preparation, free exploration, showcase and optional shop are connected',()=>{
 const w=createWorld(now);w.leafEvent.entry={completedTick:0};
 assert.match(nextGardenStory(w).text,/あと2羽/);
 w.encounters.gardenFriends.regulars[0].lastInteractionTick=0;assert.match(nextGardenStory(w).text,/あと1羽/);
 w.encounters.gardenFriends.regulars[1].lastInteractionTick=0;assert.equal(nextGardenStory(w).story,'expedition');
 w.expedition.entries.push({path:'brook',completedTick:0});assert.equal(nextGardenStory(w).story,'showcase');
 w.showcase={active:null,entries:['song','discovery','style'].map(theme=>({theme})),purchases:[]};
 w.expedition.entries.push({path:'grove',completedTick:0},{path:'flower',completedTick:0});
 assert.equal(nextGardenStory(w).story,'shop');assert.match(nextGardenStory(w).text,/Goldを使わない/);
 w.showcase.purchases=['bell','frame','ribbon'].map(itemId=>({itemId}));assert.equal(nextGardenStory(w).story,'showcase');assert.match(nextGardenStory(w).text,/何度でも無料/);
});
test('ending route includes only the four real conditions and never asks for injury or death',()=>{
 const w=createWorld(now),g=endingEnjoyment(w);assert.equal(g.panel,'diary');assert.equal(g.progress,'映画 0 / 4');assert.match(g.text,/庭の鳥との出会い 0\/35/);assert.doesNotMatch(g.text,/死亡|病気に|事故に/);
 const win=new Window();try{win.document.body.innerHTML=renderNextEnjoyments(w);const other=win.document.querySelector('[data-game-details=next-goals-other]');assert.equal(other.open,false);assert.equal(other.querySelectorAll('[data-next-goal]').length,5);assert.equal(win.document.querySelector('[data-next-goal]').dataset.nextGoal,'story');}finally{win.happyDOM.abort();}
});
test('a real leaf to expedition to showcase playthrough produces truthful invitations',async()=>{
 const {GARDEN_IDS}=await import('../src/data/gardens.js');
 const {leafEventStatus,leafEventToken,startLeafEvent,chooseLeafEvent,completeLeafEvent}=await import('../src/garden-leaf-event.js');
 const {expeditionToken,startExpedition,chooseExpedition,completeExpedition}=await import('../src/garden-expedition.js');
 const {validateWorld}=await import('../src/engine.js');
 const w=createWorld(now,31);
 for(const id of GARDEN_IDS){encounterSystem.selectGarden(w,id,leafEventToken(w));if(leafEventStatus(w).available)break;}
 assert.equal(nextGardenStory(w).story,'leaf-gift');startLeafEvent(w,leafEventToken(w));chooseLeafEvent(w,'display',leafEventToken(w));
 assert.match(nextGardenStory(w).text,/また訪ねる/);assert.equal(nextGardenStory(w).gardenId,w.leafEvent.entry.gardenId);
 encounterSystem.leaveGarden(w,leafEventToken(w));encounterSystem.enterGarden(w,leafEventToken(w));completeLeafEvent(w,leafEventToken(w));
 const actors=w.encounters.gardenFriends.regulars.slice(0,2);for(const a of actors)a.lastInteractionTick=0;
 assert.equal(nextGardenStory(w).story,'expedition');startExpedition(w,'brook',actors.map(a=>a.id),expeditionToken(w));
 assert.match(nextGardenStory(w).text,/途中/);chooseExpedition(w,'look',expeditionToken(w));completeExpedition(w,expeditionToken(w));
 const before=structuredClone(w);assert.equal(nextGardenStory(w).story,'showcase');assert.match(nextGardenStory(w).text,/参加は無料/);validateWorld(w);assert.deepEqual(w,before);
});
