import test from 'node:test';
import assert from 'node:assert/strict';
import {createGardenJogFeedback} from '../src/garden-jog-feedback.js';
import {audioRig} from './audio-fixture.js';

function rig(options={}) {
 const audio=audioRig(options), timers=new Map(), vibration=[];let clock=0,id=0,enabled=true,active=true;
 const feedback=createGardenJogFeedback({Context:audio.Context,navigator:{vibrate:value=>vibration.push(value)},getSound:()=>enabled,isActive:()=>active,now:()=>clock,setTimer:fn=>{timers.set(++id,fn);return id;},clearTimer:id=>timers.delete(id)});
 return {audio,feedback,vibration,set time(v){clock=v;},set enabled(v){enabled=v;},set active(v){active=v;},flush(){const callbacks=[...timers.values()];timers.clear();callbacks.forEach(fn=>fn());}};
}
test('review: audio lazy until gesture, stepping throttled, settled sound coalesced',async()=>{
 const r=rig();r.feedback.step();r.feedback.settled();r.flush();assert.equal(r.audio.contexts.length,0);assert.equal(r.vibration.length,0);
 r.feedback.gesture();await Promise.resolve();r.feedback.step();assert.equal(r.audio.starts,2);assert.deepEqual(r.vibration,[8]);
 r.time=84;r.feedback.step();assert.equal(r.audio.starts,2);r.time=85;r.feedback.step();assert.equal(r.audio.starts,4);
 r.feedback.settled();r.feedback.settled();r.flush();assert.equal(r.audio.starts,6);r.feedback.close();
});
test('review: canceled, hidden, muted and destroyed settle callbacks stay silent',async()=>{
 const r=rig();r.feedback.gesture();await Promise.resolve();r.feedback.settled();r.feedback.cancel();r.flush();assert.equal(r.audio.starts,0);
 r.feedback.gesture();r.feedback.settled();r.active=false;r.flush();assert.equal(r.audio.starts,0);
 r.active=true;r.feedback.gesture();r.feedback.settled();r.enabled=false;r.flush();assert.equal(r.audio.starts,0);
 r.enabled=true;r.feedback.gesture();r.feedback.settled();r.feedback.close();r.flush();r.feedback.gesture();r.feedback.step();assert.equal(r.audio.starts,0);assert.equal(r.audio.contexts[0].closes,1);
});
test('review: delayed audio activation does not replay historical step',async()=>{
 const r=rig({held:true});r.feedback.gesture();r.feedback.step();assert.equal(r.audio.starts,0);
 r.audio.gate.resolve();await Promise.resolve();await Promise.resolve();assert.equal(r.audio.starts,0);r.feedback.close();
});
test('review: unsupported or denied hardware does not throw',()=>{
 const r=createGardenJogFeedback({Context:undefined,navigator:{vibrate(){throw Error('denied');}}});
 assert.doesNotThrow(()=>{r.gesture();r.step();r.cancel();r.close();});
});

// Exercise the production gate itself against a real DOM tree, without a browser.
// The outdoors panel is an open, non-modal dialog, not an obstruction.
test('review: open garden host permits feedback; additional dialogs suppress it', async t=>{
 const {Window}=await import('happy-dom');
 const {readFile}=await import('node:fs/promises');
 const source=await readFile(new URL('../src/encounter-controller.js',import.meta.url),'utf8');
 const expression=source.match(/getSound,isActive:\(\)=>\s*(.+?)\}\);/s)?.[1];
 assert.ok(expression,'production feedback active predicate exists');
 const win=new Window(),doc=win.document;
 t.after(()=>win.happyDOM.close());
 const host=doc.createElement('dialog'),root=doc.createElement('div');
 host.className='game-panel-overlay';host.append(root);doc.body.append(host);host.show();
 const check=new Function('alive','root','mode','doc',`return (${expression});`);
 assert.equal(check(true,root,'garden',doc),true,'garden host dialog must not mute itself');
 const modal=doc.createElement('dialog');doc.body.append(modal);modal.showModal();
 assert.equal(check(true,root,'garden',doc),false,'sibling modal blocks feedback');
 modal.close();assert.equal(check(true,root,'garden',doc),true);
 root.append(modal);modal.showModal();assert.equal(check(true,root,'garden',doc),false,'nested additional modal also blocks feedback');
 modal.close();assert.equal(check(true,root,'notebook',doc),false);assert.equal(check(false,root,'garden',doc),false);
 root.remove();assert.equal(check(true,root,'garden',doc),false);
});
