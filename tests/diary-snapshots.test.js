import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {Window} from 'happy-dom';
import {diaryIntroSnapshot,diaryRowSnapshot,normalizedDiaryRows,normalizeDiaryText} from './fixtures/diary-snapshots.js';

const expectedIntro={intro:['done'],overlays:0};
const expectedRow=[{names:['おもち 白'],sprites:[{stage:'adult',color:'white'}]}];
function fixture(t){
  const window=new Window();t.after(()=>window.close());
  const document=window.document;document.body.setAttribute('data-game-intro','done');
  document.body.innerHTML='<li><figcaption>おもち 白</figcaption><span class="game-sprite" data-stage="adult" data-color="white"></span></li>';
  return {document,row:document.querySelector('li')};
}
const intro=document=>diaryIntroSnapshot([...document.querySelectorAll('body, .game-logo-intro')]);
const rows=elements=>normalizedDiaryRows(diaryRowSnapshot(elements));

test('diary snapshots accept exactly one ready body and one matching row',t=>{
  const {document,row}=fixture(t);assert.deepEqual(intro(document),expectedIntro);assert.deepEqual(rows([row]),expectedRow);
});

for(const [name,change] of [
  ['missing body',elements=>elements.splice(0,1)],
  ['duplicate body',elements=>elements.push(elements[0].cloneNode(true))],
  ['missing intro attribute',elements=>elements[0].removeAttribute('data-game-intro')],
  ['unfinished intro',elements=>elements[0].setAttribute('data-game-intro','loading')],
  ['wrong intro whitespace',elements=>elements[0].setAttribute('data-game-intro',' done ')],
  ['remaining overlay',elements=>{const overlay=elements[0].ownerDocument.createElement('div');overlay.className='game-logo-intro';elements.push(overlay);}],
  ['duplicate overlays',elements=>{const overlay=elements[0].ownerDocument.createElement('div');overlay.className='game-logo-intro';elements.push(overlay,overlay.cloneNode());}]
])test(`diary intro rejects ${name}`,t=>{
  const {document}=fixture(t),elements=[document.body];change(elements);assert.notDeepEqual(diaryIntroSnapshot(elements),expectedIntro);
});

for(const [name,change] of [
  ['missing row',elements=>elements.splice(0,1)],
  ['duplicate rows',elements=>elements.push(elements[0].cloneNode(true))],
  ['missing caption',elements=>elements[0].querySelector('figcaption').remove()],
  ['duplicate captions',elements=>elements[0].append(elements[0].querySelector('figcaption').cloneNode(true))],
  ['missing sprite',elements=>elements[0].querySelector('.game-sprite').remove()],
  ['duplicate sprites',elements=>elements[0].append(elements[0].querySelector('.game-sprite').cloneNode(true))],
  ['wrong name',elements=>elements[0].querySelector('figcaption').textContent='別の鳥'],
  ['wrong stage',elements=>elements[0].querySelector('.game-sprite').setAttribute('data-stage','chick')],
  ['missing stage',elements=>elements[0].querySelector('.game-sprite').removeAttribute('data-stage')],
  ['wrong color',elements=>elements[0].querySelector('.game-sprite').setAttribute('data-color','silver')],
  ['missing color',elements=>elements[0].querySelector('.game-sprite').removeAttribute('data-color')],
  ['attribute whitespace',elements=>elements[0].querySelector('.game-sprite').setAttribute('data-color',' white ')]
])test(`diary identity rejects ${name}`,t=>{
  const {row}=fixture(t),elements=[row];change(elements);assert.notDeepEqual(rows(elements),expectedRow);
});

test('diary names normalize actual and expected whitespace like Playwright',t=>{
  const {row}=fixture(t),actual='\u200b おもち\u00ad\n\t 白\u00a0',expected='\tおもち\u3000白 \u200b';
  row.querySelector('figcaption').textContent=actual;
  assert.equal(normalizeDiaryText(actual),'おもち 白');assert.equal(normalizeDiaryText(expected),'おもち 白');
  assert.deepEqual(rows([row]),[{names:[normalizeDiaryText(expected)],sprites:[{stage:'adult',color:'white'}]}]);
  assert.equal(normalizeDiaryText('A\u200dB'),'A\u200dB');assert.notEqual(normalizeDiaryText('Ed'),normalizeDiaryText('ED'));
});

test('diary caption text retains Playwright descendant, hidden, input and shadow semantics',t=>{
  const {row,document}=fixture(t),caption=row.querySelector('figcaption');
  caption.innerHTML='おもち<!-- ignored --><span hidden> 白</span><script>ignore</script><style>ignore</style><noscript>ignore</noscript><input type="button" value=" button"><input type="submit" value=" submit"><input type="reset" value=" reset">';
  const host=document.createElement('span');host.attachShadow({mode:'open'}).textContent=' shadow';caption.append(host);
  assert.deepEqual(rows([row])[0].names,['おもち 白 button submit reset shadow']);
});

test('diary row snapshots retain matches and duplicates inside open shadow roots',t=>{
  const {row,document}=fixture(t),host=document.createElement('div');row.append(host);
  const shadow=host.attachShadow({mode:'open'});shadow.append(row.querySelector('figcaption'),row.querySelector('.game-sprite'));
  assert.deepEqual(rows([row]),expectedRow);
  shadow.append(shadow.querySelector('figcaption').cloneNode(true));assert.notDeepEqual(rows([row]),expectedRow);
  shadow.lastChild.remove();shadow.append(shadow.querySelector('.game-sprite').cloneNode(true));assert.notDeepEqual(rows([row]),expectedRow);
});

test('diary snapshots reread missing, inserted, changed and removed DOM every call',t=>{
  const {document,row}=fixture(t),first=rows([row]);row.querySelector('figcaption').textContent='別の鳥';
  assert.deepEqual(first,expectedRow);assert.notDeepEqual(rows([row]),expectedRow);
  const caption=row.querySelector('figcaption');caption.remove();assert.deepEqual(rows([row])[0].names,[]);
  caption.textContent='おもち 白';row.append(caption);assert.deepEqual(rows([row]),expectedRow);
  document.body.insertAdjacentHTML('beforeend','<div class="game-logo-intro"></div>');assert.notDeepEqual(intro(document),expectedIntro);
  document.querySelector('.game-logo-intro').remove();assert.deepEqual(intro(document),expectedIntro);
});

test('diary evaluateAll callbacks serialize without importing module closures',t=>{
  const {document,row}=fixture(t),copy=fn=>runInNewContext(`(${fn.toString()})`);
  assert.deepEqual(JSON.parse(JSON.stringify(copy(diaryIntroSnapshot)([document.body]))),expectedIntro);
  assert.deepEqual(normalizedDiaryRows(JSON.parse(JSON.stringify(copy(diaryRowSnapshot)([row])))),expectedRow);
});
