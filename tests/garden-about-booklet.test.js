import test from 'node:test';
import {originalAbout} from './fixtures/garden-about-baseline.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {renderGardenAboutBooklet} from '../src/garden-about-booklet.js';
import {GARDENS} from '../src/data/gardens.js';
import {CROW_RULES} from '../src/garden-crows.js';
import {RAPTOR_RULES} from '../src/garden-raptors.js';
import {createWorld,serializeWorld} from '../src/engine.js';
const vm=p=>({name:p.name,description:p.description,landform:p.landform,art:{src:'/buncho-ureshi/'+p.background.src.replace(/\.png$/,'.screen.webp'),width:p.background.width,height:p.background.height,alt:p.description}});
for(const place of GARDENS)test(`${place.id}: three chapters preserve actual identity, description and image`,()=>{
 const window=new Window(),doc=window.document;doc.body.innerHTML=renderGardenAboutBooklet(vm(place));
 const outer=doc.querySelector('details');assert.equal(outer.dataset.gardenDetails,'about');assert.equal(outer.getAttribute('name'),'garden-tools');assert.equal(outer.open,false);
 assert.equal(outer.querySelector(':scope > summary').textContent,'庭のこと');
 assert.equal(doc.querySelector('h4').textContent,place.name);assert.ok(doc.body.textContent.includes(place.description));
 assert.deepEqual([...doc.querySelectorAll('h5')].map(e=>e.textContent),['01どんな庭？','02空からの来客','03この庭について']);
 assert.equal(doc.querySelector('img').getAttribute('src'),vm(place).art.src);assert.equal(doc.querySelector('img').alt,place.description);
 assert.ok(doc.querySelector('figcaption').textContent.includes(place.landform));
 const warning=doc.querySelector('.garden-about-booklet__warning');assert.equal(warning.closest('details'),outer,'danger is not nested in optional rules');
 assert.ok(warning.textContent.includes('1分以内'));assert.ok(warning.textContent.includes('事故死'));assert.equal(doc.querySelectorAll('[role=alert]').length,0,'general rules are not a live warning');
 const rules=doc.querySelector('[data-garden-details=about-rules]');assert.equal(rules.getAttribute('name'),null);assert.equal(rules.open,false);outer.open=true;rules.open=true;outer.open=false;outer.open=true;assert.equal(rules.open,true);
 window.happyDOM.close();
});
test('all old explanatory sentences are retained, with targetless distinction',()=>{
 const original=originalAbout;
 const oldText=original.replace(/<[^>]+>/g,'').replace('${esc(place.description)}','').replace('庭のこと','');
 const window=new Window();window.document.body.innerHTML=renderGardenAboutBooklet(vm(GARDENS[0]));
 const text=window.document.body.textContent.replace(/\s/g,'');
 for(const sentence of oldText.split('。').filter(Boolean))assert.ok(text.includes(sentence),sentence);
 assert.ok(text.includes('主人公の同行なしで始まった来訪には標的がなく'));assert.ok(text.includes('途中から別の文鳥を標的にすることはありません'));
 assert.ok(text.includes(`${CROW_RULES.dwellMs/60000}分`));assert.ok(text.includes(`${RAPTOR_RULES.warningMs/60000}分以内`));
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
 assert.deepEqual([...js.matchAll(/import \{([^}]+)\}/g)].map(x=>x[1]),['CROW_RULES','RAPTOR_RULES']);
 const css=readFileSync(new URL('../src/garden-about-booklet.css',import.meta.url),'utf8');assert.doesNotMatch(css,/font-family|position:\s*fixed|overflow:\s*hidden|display:\s*none/);
 for(const selector of css.split('}').map(s=>s.slice(s.lastIndexOf('}')+1)).filter(s=>s.includes('{')&&!s.includes('@media'))){assert.ok(selector.includes('.garden-about-booklet'));}
});
