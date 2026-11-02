import test from 'node:test';
import assert from 'node:assert/strict';
import { createCareAudio } from '../src/care-audio.js';
import { audioRig } from './audio-fixture.js';

test('care audio is default-off, lazy and gesture-unlocked; enabling/reloading alone never starts a source',async()=>{
  const rig=audioRig(),audio=createCareAudio({Context:rig.Context});
  assert.equal(await audio.chirp(),false);assert.equal(await audio.unlockFromGesture(),false);assert.equal(rig.contexts.length,0);
  audio.setEnabled(true);assert.equal(rig.contexts.length,0);assert.equal(await audio.chirp(),false);
  assert.equal(await audio.unlockFromGesture(),true);assert.equal(rig.starts,0);
  assert.equal(await audio.chirp(),true);assert.equal(rig.starts,2);
  const context=rig.contexts[0];assert(context.nodes.every(n=>n.type==='sine'));assert(context.nodes.every(n=>n.stops[0]-n.starts[0]<=.111));
  assert(context.gains.every(g=>g.gain.events.some(e=>e[0]==='linear'&&e[1]===.035)));
  audio.close();audio.close();assert.equal(context.closes,1);assert.equal(await audio.chirp(),false);
});

test('mute cancels active oscillators immediately and suppresses delayed resume and queued chirps',async()=>{
  const pending=audioRig({held:true}),audio=createCareAudio({Context:pending.Context});audio.setEnabled(true);
  const unlock=audio.unlockFromGesture(),chirp=audio.chirp();audio.setEnabled(false);pending.gate.resolve();assert.equal(await unlock,false);assert.equal(await chirp,false);assert.equal(pending.starts,0);
  audio.setEnabled(true);assert.equal(await audio.chirp(),false);await audio.unlockFromGesture();await audio.chirp();assert.equal(pending.starts,2);
  audio.setEnabled(false);assert(pending.contexts[0].nodes.every(n=>n.stops.includes(undefined)));assert(pending.contexts[0].gains.every(g=>g.gain.events.some(e=>e[0]==='set'&&e[1]===0)));
  audio.close();
});

test('selection/route cancellation, stale guards and teardown prevent old asynchronous audio from starting',async()=>{
  for(const end of ['cancel','close']){
    const rig=audioRig({held:true}),audio=createCareAudio({Context:rig.Context});audio.setEnabled(true);audio.unlockFromGesture();const pending=audio.chirp();audio[end]();rig.gate.resolve();assert.equal(await pending,false);assert.equal(rig.starts,0);audio.close();
  }
  const rig=audioRig(),audio=createCareAudio({Context:rig.Context});audio.setEnabled(true);await audio.unlockFromGesture();assert.equal(await audio.chirp(()=>false),false);assert.equal(rig.starts,0);audio.close();
});

test('missing or denied audio capability degrades to silent feedback without rejected promises',async()=>{
  const absent=createCareAudio({Context:null});absent.setEnabled(true);assert.equal(await absent.unlockFromGesture(),false);assert.equal(await absent.chirp(),false);absent.close();
  const rig=audioRig({reject:true}),audio=createCareAudio({Context:rig.Context});audio.setEnabled(true);assert.equal(await audio.unlockFromGesture(),false);assert.equal(await audio.chirp(),false);assert.equal(rig.starts,0);audio.close();
});
