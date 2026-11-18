import test from 'node:test';import assert from 'node:assert/strict';import {Window} from 'happy-dom';
import {createWorld,serializeWorld} from '../src/engine.js';
import {renderFoodChoice} from '../src/food-choice-ui.js';import {renderLifeCarePanel} from '../src/life-care-ui.js';import {renderGameHelp} from '../src/game-help.js';
test('new explanation diagrams are semantic, ruby readings are visual only and saved worlds remain byte-identical',()=>{
 const w=createWorld(1800000000000);w.birds[0].stage='juvenile';const before=serializeWorld(w);
 const win=new Window();win.document.body.innerHTML=renderFoodChoice(w.birds[0],w.lifecycle.seenAt)+renderLifeCarePanel(w)+renderGameHelp();
 assert.equal(serializeWorld(w),before);assert.equal(win.document.querySelectorAll('script,[onerror]').length,0);
 const lists=win.document.querySelectorAll('ol.kids-steps');assert(lists.length>=4);for(const ol of lists){assert(ol.children.length>=2);assert([...ol.children].every(li=>li.tagName==='LI'));}
 const readings=win.document.querySelectorAll('rt');assert(readings.length>100);for(const rt of readings){assert.equal(rt.getAttribute('aria-hidden'),'true');assert(rt.textContent);assert.equal(rt.parentElement.tagName,'RUBY');}
 assert.equal(win.document.querySelector('[data-game-details=food-rules]').open,false);
 const text=win.document.body.cloneNode(true);text.querySelectorAll('rt').forEach(e=>e.remove());
 for(const fact of ['24時間','20%','12 Gold','24 Gold','寿命','5分の1'])assert(text.textContent.includes(fact),fact);
 win.happyDOM.close();
});
