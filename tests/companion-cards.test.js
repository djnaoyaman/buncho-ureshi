import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createWorld,createBird,serializeWorld,parseSave,validateWorld} from '../src/engine.js';
import {encounterSystem as system} from '../src/encounters.js';
import {gardenCompanionRoster} from '../src/data/gardens.js';
import {companionPreferences,createCompanionDraft,eligibleCompanions,renderCompanionSettings} from '../src/garden-companion-ui.js';
import {mountEncounterPanel} from '../src/encounter-controller.js';
const NOW=Date.UTC(2026,10,6),guard=w=>({worldId:w.worldId,revision:w.revision}),clone=structuredClone;
const next=()=>new Promise(resolve=>setTimeout(resolve,0));
function fixture(t,options={}){
 const win=new Window(),doc=win.document;doc.body.innerHTML='<main></main>';let world=createWorld(NOW);world.paused=true;
 for(const [name,color] of [['ゆず','cinnamon'],['ころり','sakura'],['はつゆき','white'],['はちみつ','cinnamon'],['べーぐる','silver']])createBird(world,{name,color,stage:'adult',home:'resident'});
 system.enterGarden(world,guard(world));options.seed?.(world);let calls=0;
 const root=doc.querySelector('main');const panel=mountEncounterPanel(root,{getWorld:()=>world,transact:async fn=>{calls++;if(options.transact)return options.transact(fn,world);return fn(world);},initialMode:'garden',crowRandom:()=>1});
 t.after(()=>{panel.destroy();win.happyDOM.abort();});
 const q=selector=>root.querySelector(selector),open=()=>{q('[data-garden-details=companions]').open=true;},click=async selector=>{q(selector).click();await next();};
 return {win,doc,root,panel,q,open,click,get w(){return world;},replace:w=>world=w,get calls(){return calls;}};
}
function withoutPreferences(world){const c=clone(world);delete c.revision;delete c.encounters.gardenFriends.accompany;delete c.encounters.gardenFriends.companions;return c;}

test('new and parsed worlds keep off as the initial choice without schema changes',()=>{
 const w=createWorld(NOW),before=clone(w);const html=renderCompanionSettings(w);
 assert.deepEqual(companionPreferences(w),{accompany:false,companions:[]});assert.match(html,/data-garden-accompany="false" aria-pressed="true"/);assert.match(html,/data-garden-companion="b1"[^>]*disabled/);assert.match(html,/今回のおでかけ/);assert.match(html,/次から使う初期設定/);assert.deepEqual(w,before);assert.deepEqual(companionPreferences(parseSave(serializeWorld(w))),companionPreferences(w));
});
test('atomic preference save changes only two existing fields and revision, once',()=>{
 const w=createWorld(NOW);system.enterGarden(w,guard(w));const before=withoutPreferences(w),revision=w.revision;
 assert.deepEqual(system.chooseOutingPreferences(w,{accompany:true,companions:['b1']},guard(w),companionPreferences(w)),{changed:true});
 assert.equal(w.revision,revision+1);assert.deepEqual(withoutPreferences(w),before);assert.deepEqual(gardenCompanionRoster(w),[]);validateWorld(w);
 const saved=clone(w);assert.equal(system.chooseOutingPreferences(w,companionPreferences(w),guard(w)).resumed,true);assert.deepEqual(w,saved);
 system.leaveGarden(w,guard(w));system.enterGarden(w,guard(w));assert.deepEqual(gardenCompanionRoster(w).map(b=>b.birdId),['b1']);
 const loaded=parseSave(serializeWorld(w));assert.deepEqual(companionPreferences(loaded),{accompany:true,companions:['b1']});assert.deepEqual(loaded.encounters.gardenFriends.attendees,['b1']);
});
test('invalid, stale and conflicting preferences are rejected without partial mutation',()=>{
 const w=createWorld(NOW);const dead=createBird(w,{home:'departed',stage:'adult'});for(const prefs of [null,{accompany:'yes',companions:['b1']},{accompany:true,companions:[]},{accompany:false,companions:['b1','b1']},{accompany:true,companions:['missing']},{accompany:true,companions:[dead.id]}]){
 const before=clone(w);assert.equal(system.chooseOutingPreferences(w,prefs,guard(w)).changed,false);assert.deepEqual(w,before);}
 const before=clone(w);assert.equal(system.chooseOutingPreferences(w,{accompany:true,companions:['b1']},{...guard(w),revision:-1}).changed,false);assert.deepEqual(w,before);
 assert.equal(system.chooseOutingPreferences(w,{accompany:true,companions:['b1']},guard(w),{accompany:true,companions:[]}).reason,'preferences-changed');assert.deepEqual(w,before);
});
test('cards use each eligible family bird name, color and life stage; names are escaped',()=>{
 const w=createWorld(NOW);const young=createBird(w,{name:'<友達 & "子">',color:'silver',stage:'juvenile',home:'resident'});young.stage='juvenile';const egg=createBird(w,{stage:'egg',home:'resident'});egg.stage='egg';createBird(w,{home:'departed',stage:'adult'});
 const html=renderCompanionSettings(w);assert.equal(eligibleCompanions(w).length,2);assert.match(html,/juvenile-silver\.webp/);assert.match(html,/&lt;友達 &amp; &quot;子&quot;&gt;/);assert.doesNotMatch(html,/<友達/);assert.equal((html.match(/data-garden-companion=/g)||[]).length,2);
});
test('mode and face choices are draft-only, clear, keyboard-focusable and saved together',async t=>{
 const f=fixture(t);f.open();const before=clone(f.w);assert.ok(f.q('[data-garden-companion=b1]').disabled);
 await f.click('[data-garden-accompany="true"]');assert.ok(f.q('[data-garden-companions-save]').disabled);
 f.q('[data-garden-companion=b1]').focus();await f.click('[data-garden-companion=b1]');assert.equal(f.doc.activeElement?.dataset.gardenCompanion,'b1');
 assert.equal(f.q('[data-garden-companion=b1]').getAttribute('aria-pressed'),'true');assert.match(f.q('.finch-companion-card-state').textContent,/いっしょ/);assert.match(f.q('.finch-companion-saved').textContent,/お留守番/);assert.deepEqual(f.w,before);assert.equal(f.calls,0);
 f.panel.refresh();assert.equal(f.q('[data-garden-companion=b1]').getAttribute('aria-pressed'),'true');assert.equal(f.doc.activeElement?.dataset.gardenCompanion,'b1');
 await f.click('[data-garden-companions-save]');assert.equal(f.calls,1);assert.deepEqual(companionPreferences(f.w),{accompany:true,companions:['b1']});assert.match(f.q('.finch-companion-feedback').textContent,/覚えたよ/);assert.match(f.q('.finch-companion-current').textContent,/お留守番/);
});
test('a fifth selected bird is refused and deselection permits an explicit replacement',async t=>{
 const f=fixture(t);f.open();await f.click('[data-garden-accompany="true"]');for(const id of ['b1','b2','b3','b4','b5'])await f.click(`[data-garden-companion=${id}]`);
 assert.equal(f.q('[data-garden-companion=b5]').getAttribute('aria-pressed'),'false');assert.match(f.q('.finch-companion-feedback').textContent,/4羽まで/);assert.match(f.q('.finch-companion-count').textContent,/4 \/ 4/);
 await f.click('[data-garden-companion=b2]');await f.click('[data-garden-companion=b5]');await f.click('[data-garden-companions-save]');assert.deepEqual(f.w.encounters.gardenFriends.companions,['b1','b3','b4','b5']);
});
test('turning off retains the remembered faces and does not remove current attendees',async t=>{
 const f=fixture(t,{seed:w=>{system.chooseOutingPreferences(w,{accompany:true,companions:['b1','b2']},guard(w));system.leaveGarden(w,guard(w));system.enterGarden(w,guard(w));}});f.open();const before=withoutPreferences(f.w);
 await f.click('[data-garden-accompany="false"]');assert.match(f.q('[data-garden-companion=b1] .finch-companion-card-state').textContent,/覚えている/);await f.click('[data-garden-companions-save]');assert.deepEqual(companionPreferences(f.w),{accompany:false,companions:['b1','b2']});assert.deepEqual(withoutPreferences(f.w),before);assert.match(f.q('.finch-companion-current').textContent,/おもち、ゆず/);
 system.selectGarden(f.w,'mizukagami',guard(f.w));assert.deepEqual(f.w.encounters.gardenFriends.attendees,['b1','b2']);system.leaveGarden(f.w,guard(f.w));system.enterGarden(f.w,guard(f.w));assert.deepEqual(f.w.encounters.gardenFriends.attendees,[]);
});
test('closing the panel discards drafts, reopening shows saved settings and causes no write',async t=>{
 const f=fixture(t);f.open();await f.click('[data-garden-accompany="true"]');await f.click('[data-garden-companion=b1]');f.q('[data-garden-details=companions]').open=false;await next();f.open();await next();assert.equal(f.q('[data-garden-accompany="false"]').getAttribute('aria-pressed'),'true');assert.equal(f.q('[data-garden-companion=b1]').getAttribute('aria-pressed'),'false');assert.equal(f.calls,0);
});
test('garden navigation, notebook and host replacement discard only the unsaved draft',async t=>{
 for(const action of ['garden','notebook','replace']){const f=fixture(t);f.open();await f.click('[data-garden-accompany="true"]');await f.click('[data-garden-companion=b1]');if(action==='garden')await f.panel.garden('mizukagami');if(action==='notebook'){f.panel.notebook();await f.panel.garden();}if(action==='replace'){const nextWorld=createWorld(NOW+10);f.replace(nextWorld);f.panel.refresh();await f.panel.garden();}f.open();await next();assert.equal(f.q('[data-garden-accompany="false"]').getAttribute('aria-pressed'),'true');assert.deepEqual(f.w.encounters.gardenFriends.companions,[]);}
});
test('unrelated revision changes do not lose the draft or prevent its atomic save',async t=>{
 const f=fixture(t);f.open();await f.click('[data-garden-accompany="true"]');await f.click('[data-garden-companion=b1]');f.w.revision++;f.panel.refresh();await f.click('[data-garden-companions-save]');assert.deepEqual(companionPreferences(f.w),{accompany:true,companions:['b1']});
});
test('a newer choice in another tab wins; stale local draft cannot overwrite it',async t=>{
 const f=fixture(t);f.open();await f.click('[data-garden-accompany="true"]');await f.click('[data-garden-companion=b1]');system.chooseOutingPreferences(f.w,{accompany:true,companions:['b2']},guard(f.w));const before=clone(f.w);f.panel.refresh();await f.click('[data-garden-companions-save]');assert.deepEqual(f.w,before);assert.match(f.q('.finch-companion-feedback').textContent,/別の画面/);assert.equal(f.q('[data-garden-companion=b2]').getAttribute('aria-pressed'),'true');
});
test('failed persistence leaves saved preferences intact and offers the same draft for retry',async t=>{
 let fail=true;const f=fixture(t,{transact:(fn,w)=>{if(fail)throw Error('disk full');return fn(w);}});f.open();const before=clone(f.w);await f.click('[data-garden-accompany="true"]');await f.click('[data-garden-companion=b1]');await f.click('[data-garden-companions-save]');assert.deepEqual(f.w,before);assert.equal(f.q('[data-garden-companion=b1]').getAttribute('aria-pressed'),'true');assert.match(f.q('.finch-companion-feedback').textContent,/覚えられなかった/);fail=false;await f.click('[data-garden-companions-save]');assert.equal(f.w.encounters.gardenFriends.accompany,true);
});
test('a bird leaving while the editor is open invalidates the entire save, not half of it',async t=>{
 const f=fixture(t);f.open();await f.click('[data-garden-accompany="true"]');await f.click('[data-garden-companion=b2]');f.w.birds.find(b=>b.id==='b2').home='departed';const before=clone(f.w);await f.click('[data-garden-companions-save]');assert.deepEqual(f.w,before);assert.match(f.q('.finch-companion-feedback').textContent,/家族の様子/);assert.equal(f.q('[data-garden-companion=b2]'),null);
});
test('repeated save clicks are serialized and no-op save leaves the revision unchanged',async t=>{
 let release;const f=fixture(t,{transact:(fn,w)=>new Promise(resolve=>release=()=>resolve(fn(w)))});f.open();await f.click('[data-garden-accompany="true"]');await f.click('[data-garden-companion=b1]');f.q('[data-garden-companions-save]').click();f.q('[data-garden-companions-save]').click();assert.equal(f.calls,1);release();await next();const before=clone(f.w);f.q('[data-garden-companions-save]').click();release();await next();assert.deepEqual(f.w,before);
});
test('queued saves cannot mutate a replacement world, a destroyed controller or a new view',async t=>{
 for(const action of ['replace','destroy','notebook']){let release;const f=fixture(t,{transact:(fn,w)=>new Promise(resolve=>release=()=>resolve(fn(action==='replace'?f.w:w)))});f.open();await f.click('[data-garden-accompany="true"]');await f.click('[data-garden-companion=b1]');const original=f.w,before=clone(original);f.q('[data-garden-companions-save]').click();if(action==='replace'){f.replace(createWorld(NOW+1));f.panel.refresh();}else f.panel[action]();const current=clone(f.w);release();await next();assert.deepEqual(original,before);assert.deepEqual(f.w,current);}
});
test('active crow warning survives draft edits and preference saving',async t=>{
 const f=fixture(t,{seed:w=>{w.paused=false;system.chooseOutingPreferences(w,{accompany:true,companions:['b1']},guard(w));system.leaveGarden(w,guard(w));system.enterGarden(w,guard(w));}});f.q('.finch-garden-stage').dataset.sceneState='ready';assert.equal(f.panel.startCrowWarning('large-billed-crow'),true);f.open();const before=withoutPreferences(f.w);await f.click('[data-garden-accompany="false"]');await f.click('[data-garden-companions-save]');assert.equal(f.panel.hasCrowPending(),true);assert.ok(f.q('[data-crow-phase=warning]'));assert.deepEqual(withoutPreferences(f.w),before);
});
