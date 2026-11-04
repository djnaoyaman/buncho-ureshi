import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createWorld} from '../src/engine.js';
import {mountEncounterPanel} from '../src/encounter-controller.js';

function fixture(t){
 const win=new Window(),doc=win.document;
 doc.body.innerHTML='<main></main>';
 let world=createWorld(Date.now());world.paused=true;
 const root=doc.querySelector('main');
 const controller=mountEncounterPanel(root,{getWorld:()=>world,transact:async fn=>fn(world),initialMode:'garden'});
 t.after(()=>{controller.destroy();win.happyDOM.abort();});
 return {win,doc,root,controller,setWorld:w=>world=w};
}
for(const name of ['friends','about','companions'])test(`host redraw preserves ${name} dock scroll before its nodes are detached`,t=>{
 const f=fixture(t);
 for(const top of [180,420,250]){
  const pane=f.root.querySelector(`[data-garden-details="${name}"]`);pane.open=true;pane.scrollTop=top;
  f.doc.dispatchEvent(new f.win.CustomEvent('buncho-game-will-render'));
  // Browsers clear scroll offsets when the host overlay is replaced. Emulate
  // that layout effect explicitly: happy-dom does not have a layout engine.
  pane.scrollTop=0;
  f.controller.refresh();
  const restored=f.root.querySelector(`[data-garden-details="${name}"]`);
  assert.equal(restored.open,true);assert.equal(restored.scrollTop,top);
 }
});
test('an independent controller refresh uses the current reader position, not a stale host snapshot',t=>{
 const f=fixture(t),pane=f.root.querySelector('[data-garden-details="friends"]');pane.open=true;pane.scrollTop=180;
 f.doc.dispatchEvent(new f.win.CustomEvent('buncho-game-will-render'));pane.scrollTop=0;f.controller.refresh();
 f.root.querySelector('[data-garden-details="friends"]').scrollTop=330;f.controller.refresh();
 assert.equal(f.root.querySelector('[data-garden-details="friends"]').scrollTop,330);
});
test('changing garden starts with closed tools rather than old scroll and disclosure state',async t=>{
 const f=fixture(t),pane=f.root.querySelector('[data-garden-details="friends"]');pane.open=true;pane.scrollTop=260;
 f.doc.dispatchEvent(new f.win.CustomEvent('buncho-game-will-render'));pane.scrollTop=0;
 await f.controller.garden('mizukagami');
 assert.equal(f.root.querySelector('[data-garden-details="friends"]').open,false);
 assert.equal(f.root.querySelector('[data-garden-details="friends"]').scrollTop,0);
});
