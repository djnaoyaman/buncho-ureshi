import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {renderHome} from '../src/home.js';

for(const base of ['/', '/buncho-ureshi/']){
 test(`home GAME is an accessible single entry before EXPLORE (${base})`,()=>{
  const window=new Window();
  const html=renderHome({photos:[],articles:[],quizzes:[],url:p=>base+p,image:()=>'',atlasDoor:()=>'',esc:s=>s});
  window.document.body.innerHTML=html;
  const doc=window.document;
  const game=doc.querySelector('.art-game');
  assert.equal(game.nextElementSibling.className,'art-index section');
  assert.equal(game.querySelector('.art-section-label span').textContent,'GAME');
  assert.equal(doc.getElementById(game.getAttribute('aria-labelledby')).tagName,'H2');
  const logo=game.querySelector('h2 img');
  assert.equal(logo.alt,'おもちの文鳥ぐらし');
  assert.equal(logo.getAttribute('src'),base+'game-art/game-title.png');
  assert.equal(game.querySelector('p').textContent,'文鳥と暮らし、庭でいろんな鳥たちに出会うゲーム。');
  const link=game.querySelector('a');
  assert.equal(link.getAttribute('href'),base+'game/');
  assert.match(link.textContent,/ゲームであそぶ/);
  assert.equal(link.querySelector('span').getAttribute('aria-hidden'),'true');
  assert.equal(doc.querySelectorAll(`a[href="${base}game/"]`).length,1);
  assert.equal(doc.querySelectorAll('.art-door').length,3);
  assert.equal(doc.querySelector('.art-index').getAttribute('aria-label'),'3つの楽しみ');
  assert.deepEqual([...doc.querySelectorAll('.art-door')].map(a=>a.getAttribute('href')),['encyclopedia/','omochi/','studio/'].map(p=>base+p));
  window.happyDOM.abort();
 });
}
test('home GAME uses fluid columns, constrained logo and mobile single column without new motion',async()=>{
 const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
 assert.match(css,/\.art-game-content\{display:grid;grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
 assert.match(css,/\.art-game-logo\{display:block;width:min\(100%,480px\);height:auto/);
 assert.match(css,/@media\(max-width:600px\)\{\s*\.art-game\{[^}]+\}\s*\.art-game-content\{grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/\.art-game-link\{max-width:100%;min-height:48px/);
 assert.match(css,/:focus-visible\s*\{/);
});
