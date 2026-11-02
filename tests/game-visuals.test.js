import test from 'node:test';
import assert from 'node:assert/strict';
import { gameBirdSvg } from '../src/game.js';

test('egg, chick, juvenile and adult have distinct original silhouettes', () => {
  const stages=['egg','chick','juvenile','adult'];
  for(const color of ['white','sakura','silver','cinnamon']) {
    const drawings=stages.map(stage=>gameBirdSvg(color,stage));
    assert.equal(new Set(drawings).size,4);
    drawings.forEach((svg,i)=>{
      assert.match(svg,new RegExp(`data-stage="${stages[i]}"`));
      assert.match(svg,/viewBox="0 0 120 100"/);
      assert.match(svg,/aria-hidden="true"/);
      assert.doesNotMatch(svg,/<(?:image|script)|href=/);
    });
  }
  const chick=gameBirdSvg('white','chick'),juvenile=gameBirdSvg('white','juvenile'),adult=gameBirdSvg('white','adult');
  assert.match(chick,/rx="26" ry="21"/); // Small rounded body.
  assert.match(chick,/M35 68 26 73 38 77/); // Short nestling tail.
  assert.match(juvenile,/rx="30" ry="24"/);
  assert.match(juvenile,/#b4a591/); // Brown juvenile plumage.
  assert.match(juvenile,/M96 39 110 44 97 50Z/); // Shorter dark bill.
  assert.match(adult,/rx="32" ry="26"/);
  assert.match(adult,/M96 38 115 43 97 51Z/);
  assert.match(adult,/#d75854/);
});
