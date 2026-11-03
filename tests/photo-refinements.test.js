import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Window } from 'happy-dom';
import { morphAtlas } from '../src/data/morphs.js';
import { morphPhotos } from '../src/data/morph-photos.js';
import { prepareMorphAtlas, renderMorphOverview, bindMorphAtlas } from '../src/morph-ui.js';
import { quizzes } from '../src/data/quizzes.js';
import { articles } from '../src/data/articles.js';
const data = prepareMorphAtlas(morphAtlas, morphPhotos);
const read = f => readFile(new URL('../'+f, import.meta.url),'utf8');
function atlas(){const w=new Window();w.document.body.innerHTML=renderMorphOverview(data,{base:'/buncho-ureshi/'});return w;}
test('initial color browse contains no repeated image URLs and preserves five accurately named colors',()=>{
 const w=atlas(),d=w.document;const urls=[...d.querySelectorAll('img')].map(i=>i.src);assert.equal(new Set(urls).size,urls.length);
 assert.equal(d.querySelectorAll('[data-morph-card]').length,5);assert.equal(d.querySelectorAll('[data-morph-page]').length,2);
 assert.equal(d.querySelector('#morph-compare').open,false);assert.equal(d.querySelector('[data-morph-comparison]').children.length,0);
 assert(d.querySelector('#morph-sources details:not([open])'));w.happyDOM.abort();
});
test('compare opens only when requested, closes without duplicate hidden pictures, and tears down',()=>{
 const w=atlas(),root=w.document.querySelector('.morph-atlas');root.querySelector('#morph-compare').scrollIntoView=()=>{};
 const end=bindMorphAtlas(root,{data});root.querySelector('[data-morph-compare-id="silver"]').click();
 const panel=root.querySelector('#morph-compare');assert(panel.open);assert.equal(root.querySelectorAll('.morph-comparison').length,2);
 panel.open=false;panel.dispatchEvent(new w.Event('toggle'));assert.equal(root.querySelector('[data-morph-comparison]').children.length,0);end();w.happyDOM.abort();
});
test('all thirty questions have titled learning destinations, before-question and answer hooks',async()=>{
 assert.equal(quizzes.length,30);for(const q of quizzes)assert(articles.find(a=>a.id===q.articleId)?.title);
 const source=await read('src/app.js');assert(source.includes('この問題を学べるページ'));assert(source.includes('ここを読むとわかる'));assert(source.includes('learning?.title'));
 assert(source.includes('target="_blank" rel="noopener">${esc(learning?.title'));
});
test('expanded menu is one titled descriptive link per destination and sources use native accordions',async()=>{
 const html=await read('dist/index.html'),w=new Window();w.document.write(html);const links=[...w.document.querySelectorAll('#menu nav a')];assert.equal(links.length,10);for(const a of links){assert(a.querySelector('strong')?.textContent);assert(a.querySelector('span')?.textContent)}
 const source=await read('src/app.js');assert(source.includes('<details id="sources"'));assert(source.includes('class="body-topic-link"'));w.happyDOM.abort();
});
test('rendered encyclopedia cards use distinct photographs; body renders text-only related topics; quiz links keep current answer intact',async()=>{
 const w=new Window({url:'https://djnaoyaman.github.io/buncho-ureshi/encyclopedia/',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableJavaScriptEvaluation:true}});
 for(const k of ['window','document','location','history','navigator','localStorage','matchMedia','Image','FormData'])Object.defineProperty(globalThis,k,{configurable:true,value:k==='window'?w:k==='matchMedia'?w.matchMedia.bind(w):w[k]});
 w.document.write(await read('dist/encyclopedia/index.html'));await import('../src/app.js?photo-refinement-test');const d=w.document;
 const covers=[...d.querySelectorAll('.article-card img')].map(i=>i.src);assert.equal(new Set(covers).size,covers.length);assert.equal(d.querySelectorAll('.article-card').length,37);
 function go(route){const a=d.createElement('a');a.href='/buncho-ureshi/'+route;d.body.append(a);a.click();a.remove()}
 go('body/');assert.equal(d.querySelectorAll('.body-topic-link img').length,0);assert.equal(d.querySelectorAll('.body-topic-link').length,8);d.querySelector('[data-part="eye"]').click();assert(d.querySelector('#part-detail svg'));
 go('challenge/');assert(d.querySelector('.quiz-learning a').textContent.includes(articles.find(a=>a.id===quizzes[0].articleId).title));d.querySelector('[data-answer="0"]').click();assert(d.querySelector('.quiz-learning-result').textContent.includes('ここを読むとわかる'));assert(d.querySelector('.quiz-learning-result a').target==='_blank');w.happyDOM.abort();
});
