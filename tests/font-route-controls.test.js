import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('route labels stay accessible while the two existing icons remain the only artwork',()=>{
 const css=read('src/game.css');
 assert.match(css,/\.game-route-label\s*\{[^}]*clip-path: inset\(50%\)/);
 assert.match(css,/\[data-game-close-panel\]\[data-home-icon\]::before/);
 assert.match(css,/width: 48px!important; min-width: 48px/);
 assert(!css.includes('.game-app[data-panel="outdoors"] .game-overlay-head [data-game-close-panel]'));
 assert.match(read('src/game.js'),/data-home-icon aria-label="おうちへ" title="おうちへ"/);
});
test('garden notebook label uses the requested two centered lines without changing its action',async()=>{
 const source=read('src/encounter-ui.js');
 const markup=source.match(/<button type="button" data-encounter-back aria-label="庭の鳥図鑑">.*?<\/button>/)[0];
 const window=new Window();window.document.body.innerHTML=markup;
 const button=window.document.querySelector('button');
 assert.deepEqual([...button.children].map(s=>s.textContent),['庭の鳥','図鑑']);
 assert.equal(button.textContent,'庭の鳥図鑑');assert(button.hasAttribute('data-encounter-back'));
 assert.match(read('src/game.css'),/\[data-encounter-back\] > span \{[^}]*text-align: center/);
 await window.happyDOM.close();
});
test('typography is route scoped, locally rendered and preserves intentional existing hierarchy',()=>{
 const css=read('src/game.css').split('/* Typography and route controls:')[1];
 assert(css.includes('--game-font: "Hiragino Maru Gothic ProN"'));assert(!css.includes('@font-face'));assert(!css.includes('url('));
 assert(css.includes('line-height: 1.8'));assert(css.includes('font-size: var(--game-text-control)'));
});
test('final garden button cascade wins over legacy compact header rules',async()=>{
 const window=new Window();const doc=window.document;doc.body.dataset.world='buncho';
 doc.body.innerHTML='<div class="game-encounter-host"><section class="finch-garden"><header><button data-encounter-back><span>庭の鳥</span><span>図鑑</span></button></header></section></div>';
 const style=doc.createElement('style');style.textContent=read('src/game.css');doc.head.append(style);
 const result=window.getComputedStyle(doc.querySelector('button'));
 assert.equal(result.minWidth,'64px');assert.equal(result.minHeight,'48px');assert.equal(result.textAlign,'center');assert.equal(result.lineHeight,'1.35');
 await window.happyDOM.close();
});
