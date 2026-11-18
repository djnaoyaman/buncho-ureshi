import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
import {mountSceneUnits} from '../src/game-scene-units.js';
function fixture(native=false) {
 const win=new Window(); Object.defineProperty(win,'CSS',{value:{supports:()=>native}});
 win.document.body.innerHTML='<div id="root"><main class="game-main"><div class="game-room"></div></main></div>';
 const stage=win.document.querySelector('main');
 stage.getBoundingClientRect=()=>({width:375,height:667});
 return {win,stage,root:win.document.querySelector('#root')};
}
// Observe the scheduled measurement, rather than assuming a loaded CI worker
// must deliver requestAnimationFrame within a fixed 40ms wall-clock sleep.
async function measured(element,expected){
 const deadline=Date.now()+2000;
 while(element.style.getPropertyValue('--game-cqw')!==expected&&Date.now()<deadline)await new Promise(r=>setTimeout(r,5));
 assert.equal(element.style.getPropertyValue('--game-cqw'),expected);
}
test('legacy scene uses measured dimensions without reading or changing any save',async()=>{
 const {win,stage,root}=fixture(); const sentinel='{"birds":["おもち"],"gems":1639}';win.localStorage.setItem('save',sentinel);
 const stop=mountSceneUnits(root);
 assert.equal(stage.style.getPropertyValue('--game-cqw'),'3.75px');
 assert.equal(stage.style.getPropertyValue('--game-cqh'),'6.67px');
 assert.equal(win.localStorage.getItem('save'),sentinel);
 stage.getBoundingClientRect=()=>({width:320,height:568});win.dispatchEvent(new win.Event('resize'));
 await measured(stage,'3.2px');
 stop();assert.equal(stage.style.getPropertyValue('--game-cqw'),'');assert.equal(win.localStorage.getItem('save'),sentinel);await win.happyDOM.close();
});
test('newly rendered scenes and preview containers measured; detached nodes cleaned up',async()=>{
 const {win,stage,root}=fixture();stage.style.setProperty('--game-cqw','9px');const stop=mountSceneUnits(root);
 const preview=win.document.createElement('div');preview.className='game-home-preview-viewport';preview.getBoundingClientRect=()=>({width:200,height:300});root.append(preview);
 await measured(preview,'2px');
 preview.remove();await measured(preview,'');
 stop();assert.equal(stage.style.getPropertyValue('--game-cqw'),'9px');await win.happyDOM.close();
});
test('native engines retain native container geometry and avoid observers',async()=>{
 const {win,stage,root}=fixture(true);const stop=mountSceneUnits(root);assert.equal(stage.style.length,0);stop();await win.happyDOM.close();
});
test('all game container units have a measured compatibility adapter, including inline bird coordinates',()=>{
 for(const file of ['game.css','encounter-ui.css','game-keepsake-card.css','caretaker-recruitment.css','encounter-ui.js']) {
  const text=readFileSync(new URL('../src/'+file,import.meta.url),'utf8');
  const withoutFallbacks=text.replace(/var\(--game-cq([wh]),1cq[wh]\)/g,'MEASURED');
  assert.doesNotMatch(withoutFallbacks,/\d+cq[wh]/,file);
 }
});
