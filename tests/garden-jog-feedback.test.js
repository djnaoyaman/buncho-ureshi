import test from 'node:test';
import assert from 'node:assert/strict';
import {createGardenJogFeedback} from '../src/garden-jog-feedback.js';
import {audioRig} from './audio-fixture.js';
function fixture(options={}){
 const rig=audioRig(options),vibrations=[],timers=new Map();let time=0,enabled=true,active=true,serial=0;
 const feedback=createGardenJogFeedback({Context:rig.Context,navigator:{vibrate:value=>vibrations.push(value)},getSound:()=>enabled,isActive:()=>active,now:()=>time,setTimer:fn=>{timers.set(++serial,fn);return serial;},clearTimer:id=>timers.delete(id)});
 return {rig,feedback,vibrations,timers,advance:value=>{time+=value;},mute:()=>{enabled=false;},hide:()=>{active=false;},settle:()=>{const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());}};
}
test('lazy audio: initialization and non-gesture callbacks remain silent',()=>{
 const f=fixture();f.feedback.step();f.feedback.settled();f.settle();assert.equal(f.rig.contexts.length,0);assert.deepEqual(f.vibrations,[]);f.feedback.close();
});
test('wood detents are short, soft, rate-limited; settled tone is debounced',async()=>{
 const f=fixture();f.feedback.gesture();await Promise.resolve();f.feedback.step();assert.equal(f.rig.starts,2);assert.deepEqual(f.vibrations,[8]);
 f.feedback.step();f.advance(84);f.feedback.step();assert.equal(f.rig.starts,2);f.advance(1);f.feedback.step();assert.equal(f.rig.starts,4);
 f.feedback.settled();f.feedback.settled();assert.equal(f.timers.size,1);f.settle();assert.equal(f.rig.starts,6);
 assert(f.rig.contexts[0].gains.every(g=>g.gain.events.filter(x=>x[0]==='linear').every(x=>x[1]<=.024)));
 f.feedback.close();
});
test('rapid new input cancels the pending confirmation, not navigation',async()=>{
 const f=fixture();f.feedback.gesture();await Promise.resolve();f.feedback.step();f.feedback.settled();f.feedback.gesture();assert.equal(f.timers.size,0);f.settle();assert.equal(f.rig.starts,2);f.feedback.close();
});
test('existing mute suppresses audio without adding a switch or blocking optional vibration',()=>{
 const f=fixture();f.mute();f.feedback.gesture();f.feedback.step();f.feedback.settled();f.settle();assert.equal(f.rig.contexts.length,0);assert.deepEqual(f.vibrations,[8]);f.feedback.close();
});
test('muting, leaving, interruption and teardown prevent delayed confirmed notes',async()=>{
 for(const action of ['mute','hide','cancel','close']){const f=fixture();f.feedback.gesture();await Promise.resolve();f.feedback.settled();if(action==='mute'||action==='hide')f[action]();else f.feedback[action]();f.settle();assert.equal(f.rig.starts,0);f.feedback.close();}
});
test('missing or denied browser audio and vibration never throw or hold selection',async()=>{
 for(const navigator of [{},{vibrate(){throw Error('denied');}}]){const f=createGardenJogFeedback({Context:null,navigator});f.gesture();f.step();f.settled();f.close();}
 const f=fixture({reject:true});f.feedback.gesture();await Promise.resolve();await Promise.resolve();f.feedback.step();assert.equal(f.rig.starts,0);f.feedback.close();
});
test('late resume never queues an old detent or plays on its own',async()=>{
 const f=fixture({held:true});f.feedback.gesture();f.feedback.step();assert.equal(f.rig.starts,0);f.feedback.cancel();f.rig.gate.resolve();await Promise.resolve();f.settle();assert.equal(f.rig.starts,0);f.feedback.close();
});
