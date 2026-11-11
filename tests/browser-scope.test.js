import test from 'node:test';import assert from 'node:assert/strict';
import {selectBrowserChecks} from '../scripts/browser-scope.mjs';
const base='abc',path='tests/browser/game.spec.js',review={base,tests:[path],reason:'保存と画面の連携が変わるため対象ケースだけ確認'};
test('docs and CI-only changes do not start unrelated browsers',()=>assert.deepEqual(selectBrowserChecks({changed:['docs/plan.md','.github/workflows/pages.yml'],base,review}).tests,[]));
test('runtime changes require a current explicit review, not an old selection',()=>{for(const changed of [['src/game.js'],['src/game.js','.github/browser-checks.json']])assert.throws(()=>selectBrowserChecks({changed,base:'other',review}));});
test('reviewed runtime change selects exact tests or an explained non-browser decision',()=>{const changed=['src/engine.js','.github/browser-checks.json'];assert.deepEqual(selectBrowserChecks({changed,base,review}).tests,[path]);assert.deepEqual(selectBrowserChecks({changed,base,review:{...review,tests:[],reason:'時刻計算のみで画面は不変。単体検査で境界を確認'}}).tests,[]);});
test('missing cases and command injection cannot be silently ignored or executed',()=>{for(const tests of [['tests/browser/missing.spec.js'],['tests/browser/x.spec.js;echo bad'],[path,path]])assert.throws(()=>selectBrowserChecks({changed:['src/game.js','.github/browser-checks.json'],base,review:{...review,tests},exists:p=>p===path}));});
test('manual full request can retain focused checks for the same source',()=>assert.deepEqual(selectBrowserChecks({changed:[],base,review,full:true}).tests,[path]));
