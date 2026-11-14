import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createWorld,validateWorld} from '../src/engine.js';
import {encounterSystem} from '../src/encounters.js';
import {expeditionToken} from '../src/garden-expedition.js';
import {mountEncounterPanel} from '../src/encounter-controller.js';
test('both event entrances are icon-only and close/escape return focus without changing saves',()=>{
 const w=createWorld(Date.UTC(2026,10,14,8));encounterSystem.selectGarden(w,'komorebi',expeditionToken(w));
 const win=new Window();win.document.body.innerHTML='<div id="root"></div>';const root=win.document.querySelector('#root');
 let escapedToParent=false;win.document.addEventListener('keydown',event=>{if(event.key==='Escape')escapedToParent=true;});
 const panel=mountEncounterPanel(root,{getWorld:()=>w,initialMode:'garden',transact:async fn=>{fn(w);validateWorld(w);}});
 try {for(const name of ['leaf-gift','expedition']){let card=root.querySelector(`[data-garden-details="${name}"]`),summary=card.querySelector('summary');assert.equal(summary.textContent.trim(),'');assert.ok(summary.querySelector('svg'));assert.ok(summary.getAttribute('aria-label'));const before=structuredClone(w);card.open=true;card.querySelector('[data-garden-story-close]').click();assert.equal(card.open,false);assert.equal(win.document.activeElement,summary);panel.refresh();card=root.querySelector(`[data-garden-details="${name}"]`);assert.equal(card.open,false);card.open=true;card.querySelector('[data-garden-story-close]').dispatchEvent(new win.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(card.open,false);assert.deepEqual(w,before);assert.equal(escapedToParent,false);}}
 finally {panel.destroy();win.happyDOM.abort();}
});
