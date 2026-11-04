import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeedbackTimer,feedbackDuration} from '../src/game-feedback.js';
function harness(){let tasks=[],cleared=0;const t=createFeedbackTimer(()=>cleared++,{schedule(fn,ms){const task={fn,ms};tasks.push(task);return task;},cancel(task){task.cancelled=true;}});return {t,tasks,get cleared(){return cleared;}};}
test('short notices have four seconds; longer text gets up to eight',()=>{assert.equal(feedbackDuration('青菜入れを飾ったよ。'),4000);assert.equal(feedbackDuration('あ'.repeat(30)),5400);assert.equal(feedbackDuration('あ'.repeat(100)),8000);});
test('normal feedback expires once',()=>{const h=harness();h.t.set('飾ったよ');h.tasks[0].fn();assert.equal(h.cleared,1);});
test('repeating an action starts fresh; stale timer cannot clear newer text',()=>{const h=harness();h.t.set('飾ったよ');h.t.set('飾ったよ');assert.equal(h.tasks[0].cancelled,true);h.tasks[0].fn();assert.equal(h.cleared,0);h.tasks[1].fn();assert.equal(h.cleared,1);});
test('clearing and unmount cancel pending expiry',()=>{const h=harness();h.t.set('test');h.t.set('');h.tasks[0].fn();assert.equal(h.cleared,0);h.t.set('next');h.t.destroy();h.tasks[1].fn();assert.equal(h.cleared,0);});
test('critical persistent message has no deadline and cancels old notice',()=>{const h=harness();h.t.set('普通');h.t.set('事故',{persistent:true});assert.equal(h.tasks.length,1);h.tasks[0].fn();assert.equal(h.cleared,0);});
