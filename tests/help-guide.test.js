import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {Window} from 'happy-dom';
import {renderGameHelp} from '../src/game-help.js';
import {renderGameHelp as baseline} from './fixtures/help-guide-baseline.js';
function dom(markup) {const w = new Window(); w.document.body.innerHTML = markup; return w.document.body;}
function plain(el) {const copy=el.cloneNode(true);copy.querySelectorAll('rt').forEach(n=>n.remove());return copy.textContent;}
for (const holidayCoverageKnown of [true,false]) {
 test(`preserves the existing guide and safety facts alongside the reviewed child-friendly updates (holiday coverage ${holidayCoverageKnown})`,()=>{
  const original=dom(baseline({holidayCoverageKnown})), result=dom(renderGameHelp({holidayCoverageKnown}));
  assert.equal(result.querySelector('h3').innerHTML,original.querySelector('h3').innerHTML);
  const oldSteps=[...original.querySelectorAll('ol>li')];
  const newSteps=[...result.querySelectorAll('.game-help-guide-explanation')];
  assert.equal(newSteps.length,5);
  oldSteps.forEach((li,i)=>{
   assert.equal(newSteps[i].querySelector('h4').innerHTML,li.querySelector('strong').innerHTML);
   if(i!==3)assert.equal(newSteps[i].querySelector('p').innerHTML,li.innerHTML.split('<br>')[1]);else{const text=plain(newSteps[i]);for(const fact of ['家族が6羽','独立の相談','「いいよ」とえらんだときだけ','家系図と思い出に残る','また友達として招ける'])assert.ok(text.includes(fact),fact);}
  });
  const additions=result.querySelectorAll('[data-game-cleanliness-help]');assert.equal(additions.length,1);
  assert.equal(plain(additions[0]),'そうじをして床が100になると、20までへるのは、ほんとうの時間で約36時間だよ。物語を止めているあいだは、床もよごれないよ。留守から戻ったら、体調も見てあげよう。');
  const growth=result.querySelectorAll('[data-game-growth-help]');assert.equal(growth.length,1);
  assert.match(plain(growth[0]),/約5時間36分.*約11時間12分.*約3日半.*更新前からいる/s);
  // The approved care/life rules intentionally change these two blocks;
  // preserve the story disclosure exactly and assert every changed fact separately.
  for(const key of ['help-care','help-life']){const text=plain(result.querySelector(`[data-game-details="${key}"]`));
   assert.match(text,key==='help-care'?/24時間で30ずつ、40まで/:/留守のあいだ.*それだけで亡くならない/s);
   if(key==='help-care'){for(const fact of ['30 Gems','10 Gems','30 Gold','元気がいっぱいでも'])assert(text.includes(fact),fact);}
   else for(const fact of ['10年','3日間','24時間','12 Gold','24 Gold','寿命と事故'])assert(text.includes(fact),fact);
  }
  assert.equal(result.querySelector('[data-game-details="help-story"]').outerHTML,original.querySelector('[data-game-details="help-story"]').outerHTML);
  assert.equal(result.querySelector(':scope > section > p').innerHTML,original.querySelector(':scope > section > p').innerHTML);
  const unannotated=result.cloneNode(true);unannotated.querySelectorAll('ruby').forEach(n=>n.remove());
  assert.doesNotMatch(unannotated.textContent,/[一-龠々]/);
  assert.doesNotMatch(result.innerHTML,/[{}]/);
  assert([...result.querySelectorAll('ruby')].every(r=>r.querySelector('rt')?.textContent));
 });
}
test('five ordered cards have native disclosure controls and four decorative curves',()=>{
 const root=dom(renderGameHelp()), cards=[...root.querySelectorAll('.game-help-guide-map > li')];
 assert.equal(cards.length,5);
 const names=['ながめる','むかえる','おはなし','かぞく','おもいで'];
 cards.forEach((card,i)=>{
  assert.equal(card.querySelector('.game-help-guide-number').textContent,`0${i+1}`);
  assert.match(plain(card),new RegExp(names[i]));
  const details=card.querySelector('details');
  assert.equal(details.firstElementChild.tagName,'SUMMARY');
  assert.equal(details.dataset.gameDetails,`help-guide-step-${i+1}`);
  assert(details.querySelector('h4')); assert.equal(details.open,false);
 });
 assert.equal(root.querySelectorAll('a,button').length,0);
 assert.equal(root.querySelectorAll('details').length,8);
 assert.equal(root.querySelectorAll('h3').length,1); assert.equal(root.querySelectorAll('h4').length,5);
 const curves=root.querySelectorAll('svg');assert.equal(curves.length,4);
 curves.forEach(s=>{assert.equal(s.getAttribute('aria-hidden'),'true');assert.equal(s.getAttribute('focusable'),'false');});
 const img=root.querySelector('img');assert.equal(img.alt,'');assert(existsSync(new URL('../public/'+img.getAttribute('src').slice(2),import.meta.url)));
});
test('only authored content is rendered, with no executable or untrusted input interpolation',()=>{
 const marker='<img src=x onerror="alert(1)"><script>alert(1)</script>';
 const root=dom(renderGameHelp({holidayCoverageKnown:marker,name:marker,html:marker}));
 assert.equal(root.querySelectorAll('script,iframe,object,embed,style').length,0);
 for(const node of root.querySelectorAll('*')) for(const attr of node.attributes) {
  assert(!/^on/i.test(attr.name));assert(!/javascript:|data:text\/html/i.test(attr.value));
 }
 assert(!root.innerHTML.includes(marker));
 const source=readFileSync(new URL('../src/game-help.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/innerHTML|insertAdjacentHTML|eval\(|new Function/);
});
test('deadline, cost, care schedule and safety remain unchanged',()=>{
 const text=plain(dom(renderGameHelp()));
 for(const expected of ['24時間で30ずつ','40まで','10年','3日間','24時間','12 Gold','24 Gold','家族が6羽','「いいよ」とえらんだときだけ','むりにさわらない','録音したものではない','AIの絵','ゲームの外へ送ることもない','お手本ではない','本物のおもちは、女の子の白文鳥']) assert(text.includes(expected),expected);
 assert.match(text,/物語を止めても、おなかと元気の時間は止まらない/);
 assert.doesNotMatch(text,/ガチャ|エド|12時間/);
 assert.doesNotMatch(text,/この年の祝日/);
 assert.match(plain(dom(renderGameHelp({holidayCoverageKnown:false}))),/この年の祝日は、まだゲームに入っていない/);
});
test('CSS stays local and keeps one all-viewport layout without font replacement',()=>{
 const css=readFileSync(new URL('../src/game-help-guide.css',import.meta.url),'utf8');
 assert.doesNotMatch(css,/@media|@font-face|font-family|url\(/);
 for(const rule of css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{[^{}]*\}/g)) {
  for(const selector of rule[1].split(',')) assert(selector.trim().startsWith('.game-help'),selector);
 }
 assert.match(css,/:focus-visible/);assert.match(css,/pointer-events: none/);
});
