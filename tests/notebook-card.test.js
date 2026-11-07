import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createWorld,serializeWorld} from '../src/engine.js';
import {createEncounterSystem} from '../src/encounters.js';
import {ENCOUNTER_CATALOG} from '../src/data/encounter-catalog.js';
import {renderEncounterPage,renderJavaBaselinePage} from '../src/encounter-ui.js';
import {mountEncounterPanel} from '../src/encounter-controller.js';
import {inviteFixture} from './fixtures/garden-invitation.js';
const system=createEncounterSystem(ENCOUNTER_CATALOG),entry=system.catalog[0],now=Date.UTC(2026,10,7);
function seed(){const w=createWorld(now);inviteFixture(system,w,entry.id);system.open(w,entry.id,{worldId:w.worldId,revision:w.revision});for(const step of entry.steps)system.act(w,w.encounters.active.instanceId,step.action,{worldId:w.worldId,revision:w.revision});return w;}
function dom(html){const win=new Window();win.document.body.innerHTML=html;return win.document;}
test('A card orders portrait, view switch, live friendship and optional reading without changing saves',()=>{
 const w=seed(),before=serializeWorld(w),d=dom(renderEncounterPage(w,entry.id,{system}));
 const card=d.querySelector('.finch-record-card'),children=[...card.children];
 for(const [a,b] of [['figure','.finch-view-toggle'],['.finch-view-toggle','[data-finch-friendship]'],['[data-finch-friendship]','.finch-record-description']])assert.ok(children.indexOf(card.querySelector(a))<children.indexOf(card.querySelector(b)));
 assert.equal(card.querySelectorAll('[data-encounter-rub]').length,1);
 assert.equal(card.querySelector('.finch-friendship-rules').open,false);
 assert.match(card.querySelector('.finch-friendship-rules').textContent,/6羽/);
 assert.equal(card.querySelector('[data-encounter-invite-cage]').disabled,true);
 assert.match(card.querySelector('[data-encounter-view=art]').textContent,/✓/);
 assert.equal(serializeWorld(w),before);
});
test('photo keeps its original credit, unaltered rendering and matching selected marker',()=>{
 const w=seed(),d=dom(renderEncounterPage(w,entry.id,{system,showPhoto:true})),photo=d.querySelector('.finch-photo');
 assert.ok(photo);assert.ok(photo.querySelector(`a[href="${entry.photo.source}"]`));
 assert.match(photo.textContent,new RegExp(entry.photo.creator.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.equal(photo.querySelector('img').style.objectFit,'contain');
 assert.equal(photo.querySelector('img').style.filter,'none');
 assert.match(d.querySelector('[data-encounter-view=photo]').textContent,/✓/);
 assert.equal(d.querySelectorAll('.finch-record-portrait').length,0);
});
test('unknown entries stay hidden and baseline species does not gain fictional friendship',()=>{
 const w=createWorld(now),unknown=dom(renderEncounterPage(w,entry.id,{system}));
 assert.equal(unknown.querySelector('h3').textContent,'庭からの小さな便り');assert.match(unknown.body.textContent,/まだ出会っていない鳥/);
 assert.equal(unknown.querySelector('[data-finch-friendship]'),null);
 const baseline=dom(renderJavaBaselinePage(w));assert.ok(baseline.querySelector('.finch-record-card'));
 assert.equal(baseline.querySelector('[data-encounter-rub]'),null);assert.equal(baseline.querySelector('.finch-friendship-rules'),null);
});
test('active pet refresh retains rules disclosure and illustration node',async t=>{
 const w=seed(),win=new Window(),root=win.document.createElement('div');win.document.body.append(root);
 const panel=mountEncounterPanel(root,{system,getWorld:()=>w,transact:async fn=>fn(w)});t.after(()=>panel.destroy());panel.entry(entry.id);
 const rules=root.querySelector('.finch-friendship-rules'),art=root.querySelector('[data-encounter-rub]');rules.open=true;
 art.getBoundingClientRect=()=>({left:0,top:0,right:300,bottom:300});art.dispatchEvent(new win.PointerEvent('pointerdown',{bubbles:true,button:0,isPrimary:true,pointerId:1,clientX:50,clientY:50}));win.document.dispatchEvent(new win.PointerEvent('pointermove',{bubbles:true,pointerId:1,clientX:100,clientY:50}));await new Promise(r=>setTimeout(r,20));
 assert.equal(root.querySelector('[data-encounter-rub]'),art);assert.equal(root.querySelector('.finch-friendship-rules'),rules);assert.equal(rules.open,true);
 assert.ok(Number(root.querySelector('[data-finch-points]').textContent)>10);
});
test('reading survives same-bird refresh, photo toggle, host replacement and keyboard pet; never another entry or world',async t=>{
 let w=seed();const win=new Window(),root=win.document.createElement('div');win.document.body.append(root);
 const panel=mountEncounterPanel(root,{system,getWorld:()=>w,transact:async fn=>fn(w)});t.after(()=>panel.destroy());panel.entry(entry.id);
 const open=()=>{for(const d of root.querySelectorAll('[data-notebook-reading]'))d.open=true;root.querySelector('[data-notebook-reading=description]>summary').focus();};
 const check=()=>{assert.ok([...root.querySelectorAll('[data-notebook-reading]')].every(d=>d.open));assert.equal(root.querySelectorAll('[data-notebook-reading]').length,3);};
 open();w.revision++;panel.refresh();check();assert.equal(win.document.activeElement.parentElement.dataset.notebookReading,'description');
 root.querySelector('[data-encounter-view=photo]').click();check();
 open();win.document.dispatchEvent(new win.CustomEvent('buncho-game-will-render'));root.replaceChildren();panel.refresh();check();assert.equal(win.document.activeElement.parentElement.dataset.notebookReading,'description');
 root.querySelector('[data-encounter-rub]').dispatchEvent(new win.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await new Promise(r=>setTimeout(r,20));check();
 panel.entry(system.catalog[1].id);assert.equal(root.querySelector('[data-notebook-reading]'),null);panel.entry(entry.id);assert.ok([...root.querySelectorAll('[data-notebook-reading]')].every(d=>!d.open));
 open();w=createWorld(now+1);panel.refresh();assert.equal(root.querySelector('.finch-record-card'),null);panel.destroy();
});

test('same-bird source links retain keyboard focus and scroll after refresh and host replacement',t=>{
 const w=seed(),win=new Window(),root=win.document.createElement('div');win.document.body.append(root);
 const panel=mountEncounterPanel(root,{system,getWorld:()=>w,transact:async fn=>fn(w)});t.after(()=>panel.destroy());panel.entry(entry.id);
 const sources=root.querySelector('[data-notebook-reading=sources]');sources.open=true;const link=sources.querySelector('a[href]'),href=link.getAttribute('href');link.focus();root.scrollTop=100;
 w.revision++;panel.refresh();assert.equal(win.document.activeElement.getAttribute('href'),href);assert.equal(root.scrollTop,100);assert.equal(root.querySelector('[data-notebook-reading=sources]').open,true);
 win.document.dispatchEvent(new win.CustomEvent('buncho-game-will-render'));root.replaceChildren();panel.refresh();assert.equal(win.document.activeElement.getAttribute('href'),href);assert.equal(root.scrollTop,100);
});
