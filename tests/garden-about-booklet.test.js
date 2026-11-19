import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {renderGardenAboutBooklet} from '../src/garden-about-booklet.js';
import {GARDENS} from '../src/data/gardens.js';
import {CROW_RULES} from '../src/garden-crows.js';
import {PREDATOR_ENTRY_RULES} from '../src/garden-predator-clock.js';
import {RAPTOR_RULES} from '../src/garden-raptors.js';
import {createWorld,serializeWorld} from '../src/engine.js';
const vm=p=>({name:p.name,description:p.description,landform:p.landform,art:{src:'/buncho-ureshi/'+p.background.src.replace(/\.png$/,'.screen.webp'),width:p.background.width,height:p.background.height,alt:p.description}});
for(const place of GARDENS)test(`${place.id}: three chapters preserve actual identity, description and image`,()=>{
 const window=new Window(),doc=window.document;doc.body.innerHTML=renderGardenAboutBooklet(vm(place));
 const outer=doc.querySelector('details');assert.equal(outer.dataset.gardenDetails,'about');assert.equal(outer.getAttribute('name'),'garden-tools');assert.equal(outer.open,false);
 assert.equal(outer.querySelector(':scope > summary').textContent,'庭のこと');
 assert.equal(doc.querySelector('h4').textContent,place.name);assert.ok(doc.body.textContent.includes(place.description));
 assert.deepEqual([...doc.querySelectorAll('h5')].map(e=>e.textContent),['01どんな庭？','02空から来る鳥','03この庭について']);
 assert.equal(doc.querySelector('img').getAttribute('src'),vm(place).art.src);assert.equal(doc.querySelector('img').alt,place.description);
 assert.ok(doc.querySelector('figcaption').textContent.includes(place.landform));
 const warning=doc.querySelector('.garden-about-booklet__warning');assert.equal(warning.closest('details'),outer,'danger is not nested in optional rules');
 assert.ok(warning.textContent.includes('1分以内'));assert.ok(warning.textContent.includes('事故で命をなくします'));assert.equal(doc.querySelectorAll('[role=alert]').length,0,'general rules are not a live warning');
 const rules=doc.querySelector('[data-garden-details=about-rules]');assert.equal(rules.getAttribute('name'),null);assert.equal(rules.open,false);outer.open=true;rules.open=true;outer.open=false;outer.open=true;assert.equal(rules.open,true);
 window.happyDOM.close();
});
test('plain language retains every safety, timing and target rule without hiding the return instruction',()=>{
 const window=new Window();window.document.body.innerHTML=renderGardenAboutBooklet(vm(GARDENS[0]));
 const doc=window.document,text=doc.body.textContent.replace(/\s/g,''),duration=ms=>ms%60000===0?`${ms/60000}分`:`${ms/1000}秒`;
 for(const phrase of ['主人公がいないときに来た鳥は、安全にながめられる','そのとちゅうから、ほかの文鳥がねらわれることはない',
 '全部の鳥を合わせて24時間に1回まで','安全な出会いでずかんをふやせる','元気が半分になる','おうちでお世話すると、また元気になる',
 'ずかんは消えない','おうちでるす番している文鳥は、ねらわれない','ミサゴとなかよしの鳥は、おそってこない',
 '帰るかどうかをえらんでいる間は、時間が止まる','「残る」をえらぶと、のこり時間が動きだす','のこり10秒','「今すぐ帰る」',
 'ゲームの画面が見えていない間は止まる','画面を読みこみなおしても、のこり時間はそのまま','画面を閉じるだけでは、あぶない鳥は消えない',
 'いっしょに行く鳥を変えても、お知らせは消えない','鳥が来たときにいっしょにいる主人公だけ'])assert.ok(text.includes(phrase),phrase);
 assert.ok(text.includes(`${duration(PREDATOR_ENTRY_RULES.dwellMs)}すごす`));assert.ok(text.includes(`${duration(PREDATOR_ENTRY_RULES.retryMs)}ごと`));
 assert.ok(text.includes(`毎回${PREDATOR_ENTRY_RULES.chance*100}%`));assert.ok(text.includes(`カラス${PREDATOR_ENTRY_RULES.crowWeight}：もうきん${PREDATOR_ENTRY_RULES.raptorWeight}`));
 assert.ok(text.includes('事故が起きるわりあいではない'));
 assert.ok(text.includes(`次のカラスまで${duration(CROW_RULES.cooldownMs)}`));assert.ok(text.includes(`かげが出てから${duration(CROW_RULES.warningMs)}`));
 assert.ok(text.includes(`${duration(RAPTOR_RULES.visitCooldownMs)}たつ`));assert.ok(text.includes(`${duration(RAPTOR_RULES.warningMs)}以内`));
 const warning=doc.querySelector('.garden-about-booklet__warning');assert.equal(warning.getAttribute('aria-label'),'もうきんのお知らせが出たとき');assert.equal(warning.querySelector('h6').textContent,'ワシ・タカなどのお知らせが出たら');assert.match(warning.querySelector('li:nth-child(2)').textContent,/もうきんのお知らせで「残る」/);assert.equal(warning.closest('details').dataset.gardenDetails,'about');assert.equal(warning.querySelectorAll('ol>li').length,3);assert.match(warning.querySelector('li').textContent,/「おうちへ戻る」を押そう/);
 const frequency=doc.querySelector('[data-garden-details=about-frequency]');assert.equal(frequency.open,false);assert.equal(doc.querySelector('[data-garden-details=about-rules]').open,false);
 window.happyDOM.close();
});
test('pure renderer escapes text, refuses external art and preserves frozen VM and world bytes',()=>{
 const world=createWorld(1000,42),before=serializeWorld(world),model=vm(GARDENS[0]);Object.freeze(model.art);Object.freeze(model);
 assert.equal(renderGardenAboutBooklet(model),renderGardenAboutBooklet(model));assert.equal(serializeWorld(world),before);
 const window=new Window();window.document.body.innerHTML=renderGardenAboutBooklet({name:'<img src=x onerror=evil()>',description:'<script>evil()</script>',landform:'&',art:{src:'https://example.com/x.png'}});
 assert.equal(window.document.querySelectorAll('img,script').length,0);assert.ok(window.document.body.textContent.includes('<script>evil()</script>'));window.happyDOM.close();
});
test('renderer imports only rule constants and has no state, event handlers, clocks or writable APIs; CSS is scoped',()=>{
 const js=readFileSync(new URL('../src/garden-about-booklet.js',import.meta.url),'utf8');assert.doesNotMatch(js,/Date\.|Math\.random|localStorage|indexedDB|fetch\(|addEventListener|\bonclick=/);
 assert.deepEqual([...js.matchAll(/import \{([^}]+)\}/g)].map(x=>x[1]),['renderGardenTrackCredit','PREDATOR_ENTRY_RULES','CROW_RULES','RAPTOR_RULES']);
 const css=readFileSync(new URL('../src/garden-about-booklet.css',import.meta.url),'utf8');assert.doesNotMatch(css,/font-family|position:\s*fixed|overflow:\s*hidden|display:\s*none/);
 for(const selector of css.split('}').map(s=>s.slice(s.lastIndexOf('}')+1)).filter(s=>s.includes('{')&&!s.includes('@media'))){assert.ok(selector.includes('.garden-about-booklet'));}
});
