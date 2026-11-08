import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Window} from 'happy-dom';
import sharp from 'sharp';
import {renderPreservationBox} from '../src/preservation-box.js';

function dom(t){
  const window=new Window({settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableJavaScriptEvaluation:true}});
  t.after(()=>window.happyDOM.abort());
  window.document.body.innerHTML=renderPreservationBox();
  return window.document;
}
test('native controls keep one copy of every existing hook and exact labels',t=>{
  const d=dom(t);
  assert.equal(d.querySelectorAll('[data-game-action=export]').length,1);
  assert.equal(d.querySelector('[data-game-action=export]').textContent,'保存ファイルを書き出す');
  assert.equal(d.querySelector('[data-game-action=export]').type,'button');
  assert.equal(d.querySelectorAll('#game-import').length,1);
  const input=d.querySelector('#game-import');
  assert.equal(input.type,'file');assert.equal(input.accept,'application/json,.json');assert.equal(input.multiple,false);assert.equal(input.disabled,false);
  assert.equal(d.querySelector('label[for=game-import]').textContent,'保存ファイルを読み込む（今の庭と入れ替え）');
  assert.equal(d.querySelector('#game-reset-open').dataset.gameAction,'reset-state');
  assert.equal(d.querySelector('#game-reset-open').textContent,'リセットするものを選ぶ');
  assert.equal(d.querySelectorAll('button').length,2);
});
test('overwrite warning is before input, visible without another details toggle and described',t=>{
  const d=dom(t), warning=d.querySelector('#game-preservation-warning'),input=d.querySelector('#game-import');
  assert.match(warning.textContent,/今の庭と入れ替わります/);
  assert.ok(warning.compareDocumentPosition(input)&4);
  assert.equal(warning.closest('details,[hidden]'),null);
  assert.equal(input.getAttribute('aria-describedby'),'game-preservation-warning game-preservation-validation');
  assert.match(d.querySelector('#game-preservation-validation').textContent,/形式・版・血縁・人数/);
  assert.match(d.body.textContent,/ほかの端末へは自動で同期しません/);
});
test('reference art is noninteractive, fully sized and meaningfully described',t=>{
  const d=dom(t),img=d.querySelector('img');
  assert.equal(img.closest('button,a,[role=button]'),null);
  assert.equal(img.getAttribute('tabindex'),null);
  assert.equal(img.width,1312);assert.equal(img.height,1199);
  assert.match(img.alt,/白文鳥.*陶器調/);
  assert.equal(d.querySelector('figcaption').textContent,'思い出の保管箱');
});
test('all headings and descriptions resolve; no hidden or fake controls',t=>{
  const d=dom(t),ids=[...d.querySelectorAll('[id]')].map(n=>n.id);
  assert.equal(new Set(ids).size,ids.length);
  for(const n of d.querySelectorAll('[aria-labelledby],[aria-describedby]')){
    for(const attr of ['aria-labelledby','aria-describedby'])for(const id of (n.getAttribute(attr)||'').split(' ').filter(Boolean))assert.ok(d.getElementById(id));
  }
  assert.equal(d.querySelector('script,iframe,[onclick],[onchange],[hidden],[role=button]'),null);
  assert.equal(d.querySelector('[role=status],[role=alert]'),null,'feedback stays in the application, not duplicated');
});
test('renderer cannot inject untrusted VM text or markup; arbitrary inputs are not used',()=>{
  const expected=renderPreservationBox();
  for(const value of [null,{}, {status:'',error:''}, {busy:true}, {error:'<img src=x onerror=alert(1)>'.repeat(100)}, {status:'読み込みませんでした。'.repeat(200)}])assert.equal(renderPreservationBox(value),expected);
});
test('render has no storage, file reading, event, clock or mutation dependencies',async()=>{
  const source=await readFile(new URL('../src/preservation-box.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\b(?:localStorage|indexedDB|fetch|FileReader|Date|Math|addEventListener|confirm|setTimeout)\b/);
  assert.doesNotMatch(source,/^import\s/m);
  assert.equal(renderPreservationBox(),renderPreservationBox());
});
test('exact source art bytes and intrinsic dimensions retained',async()=>{
  const bytes=await readFile(new URL('../public/assets/preservation/preservation-box-B-v1.png',import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),'9edca842e31045437c9d7edd85018127647df892f71acbe775e7578971689bb5');
  const info=await sharp(bytes).metadata();assert.equal(info.width,1312);assert.equal(info.height,1199);assert.equal(info.hasAlpha,true);
});
test('CSS remains scoped, wraps text, keeps native focus and art uncropped',async()=>{
  const css=await readFile(new URL('../src/preservation-box.css',import.meta.url),'utf8');
  assert.match(css,/overflow-wrap:anywhere/);assert.match(css,/:focus-visible/);assert.match(css,/object-fit:contain/);
  assert.doesNotMatch(css,/display:none|overflow:hidden|position:fixed|font-family/);
  assert.ok(css.split('\n').filter(l=>l.includes('{')&&!l.startsWith('@')).every(l=>l.startsWith('.game-preservation')));
});
