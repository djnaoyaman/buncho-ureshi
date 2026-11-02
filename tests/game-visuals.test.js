import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { gameBirdSvg } from '../src/game.js';

test('original bird artwork has distinct stages and adult colors without locking old path shapes', async () => {
  const window=new Window();
  try {
    const stages=['egg','chick','juvenile','adult'];
    for(const color of ['white','sakura','silver','cinnamon']) {
      const drawings=stages.map(stage=>gameBirdSvg(color,stage));
      assert.equal(new Set(drawings).size,4);
      drawings.forEach((markup,i)=>{
        const root=window.document.createElement('div');root.innerHTML=markup;
        assert.equal(root.children.length,1);
        const svg=root.firstElementChild;
        assert.equal(svg.tagName.toLowerCase(),'svg');
        assert.equal(svg.getAttribute('data-stage'),stages[i]);
        assert.equal(svg.getAttribute('viewBox'),'0 0 120 100');
        assert.notEqual(svg.getAttribute('preserveAspectRatio'),'none');
        assert.equal(svg.getAttribute('aria-hidden'),'true');
        assert.equal(svg.querySelectorAll('image, script, foreignObject, [href], [onclick], [onload]').length,0);
        assert.doesNotMatch(markup,/NaN|Infinity|undefined/);
        if(stages[i]!=='egg') for(const part of ['body','wing','bill','eye','feet','tail']) {
          assert.ok(svg.querySelector(`[data-part="${part}"]`),`${color} ${stages[i]} must include a deliberate ${part} shape`);
        }
      });
    }
    assert.equal(new Set(['white','sakura','silver','cinnamon'].map(color=>gameBirdSvg(color,'adult'))).size,4);
  } finally { await window.happyDOM.close(); }
});
