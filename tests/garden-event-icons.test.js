import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {encounterSystem} from '../src/encounters.js';
import {createWorld} from '../src/engine.js';
import {renderLeafGift} from '../src/garden-leaf-event-ui.js';
import {renderExpedition} from '../src/garden-expedition-ui.js';
import {renderShowcase} from '../src/garden-showcase-ui.js';
test('selected event entrance artwork stays decorative, text-free and save-neutral',async()=>{
 const w=createWorld(Date.UTC(2026,10,15,12));encounterSystem.selectGarden(w,'komorebi',{worldId:w.worldId,revision:w.revision});
 const before=JSON.stringify(w),win=new Window();
 try{for(const [render,choice] of [[renderLeafGift,'1A'],[renderExpedition,'2B'],[renderShowcase,'02']]){
  win.document.body.innerHTML=render(w);
  const summary=win.document.querySelector('summary'),svg=summary.querySelector('svg');
  assert.equal(summary.textContent,'');assert.ok(summary.getAttribute('aria-label'));
  assert.equal(svg.getAttribute('data-event-icon'),choice);assert.equal(svg.getAttribute('viewBox'),'0 0 100 100');
  assert.equal(svg.getAttribute('aria-hidden'),'true');assert.equal(svg.getAttribute('focusable'),'false');
  assert.equal(svg.querySelectorAll('image,foreignObject,script').length,0);
  assert.ok(win.document.querySelector('[data-garden-story-close]'));
 }
 assert.equal(JSON.stringify(w),before);
 }finally{await win.happyDOM.close();}
});
