import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Window } from 'happy-dom';
import { morphAtlas } from '../src/data/morphs.js';
import { morphPhotos, newMorphPhotos } from '../src/data/morph-photos.js';
import { photos } from '../src/data/photos.js';
import { articles } from '../src/data/articles.js';
import { PAGE_CATALOG, routeMetadata, BASE_PATH, PRODUCTION_ORIGIN } from '../src/metadata.js';
import { prepareMorphAtlas, renderMorphOverview, renderMorphProfile } from '../src/morph-ui.js';

const base = BASE_PATH, home = PRODUCTION_ORIGIN + base;
const routes = ['colors/', ...morphAtlas.profiles.map(profile => `colors/${profile.id}/`)];
const read = route => readFile(new URL('../dist/' + route, import.meta.url), 'utf8');
const plain = node => {const copy = node.cloneNode(true); copy.querySelectorAll('rt,rp').forEach(n => n.remove()); return copy.textContent;};
function windowAt(route = '') {return new Window({url:home + route,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableJavaScriptEvaluation:true}});}

test('atlas direct static routes share the complete SPA renderer, metadata, breadcrumbs, source credits and secure local assets', async () => {
  const data = prepareMorphAtlas(morphAtlas, morphPhotos);
  const sitemap = await read('sitemap.xml');
  for (const route of routes) {
    const html = await read(route + 'index.html'), window = windowAt(route);
    try {
      window.document.write(html); const d = window.document, meta = routeMetadata(route);
      const profile = morphAtlas.profiles.find(p => route === `colors/${p.id}/`);
      assert(html.includes(profile ? renderMorphProfile(profile.id, data, {base}) : renderMorphOverview(data, {base})), route + ' shared full-body renderer');
      assert.equal(d.querySelectorAll('main h1').length, 1);
      assert.equal(d.title, meta.title);
      assert.equal(d.querySelector('link[rel="canonical"]').href, home + route);
      assert.equal(d.querySelector('meta[property="og:type"]').content, profile ? 'article' : 'website');
      assert.equal(d.querySelector('meta[property="og:url"]').content, meta.canonical);
      assert.equal(d.querySelector('meta[name="description"]').content, meta.description);
      assert.equal(d.querySelector('meta[name="robots"]').content, 'index, follow, max-image-preview:large');
      assert.equal(d.documentElement.dataset.ruby, 'on');
      assert(d.querySelector('main ruby rt'));
      const graph = JSON.parse(d.querySelector('#site-jsonld').textContent)['@graph'];
      assert.deepEqual(JSON.parse(d.querySelector('#site-jsonld').textContent), meta.structuredData);
      assert.equal(graph.find(n => n['@type'] === 'BreadcrumbList').itemListElement.at(-1).item, home + route);
      if (profile) {
        const learning = graph.find(n => n['@type'] === 'LearningResource');
        assert.equal(learning.name, profile.name); assert.equal(learning.dateModified, profile.reviewedAt);
        assert.deepEqual(learning.citation, profile.sources.map(source => source.url));
        assert.equal(learning.image.length, profile.photoIds.length);
        for (const item of learning.image) {assert(item.license.startsWith('https://'));assert(item.creditText);assert(item.acquireLicensePage.startsWith('https://'));}
        const content = plain(d.querySelector('main'));
        for (const text of [profile.summary, profile.confidence, profile.ageNotes, ...profile.levels.map(level=>level.text), ...Object.values(profile.photoNotes)]) assert(content.includes(text), profile.id + ': ' + text);
      } else assert.equal(graph.find(n => n['@type'] === 'ItemList').numberOfItems, 6);
      for (const image of d.querySelectorAll('main img')) {assert(image.getAttribute('src').startsWith(base + 'photos/')); assert(Number(image.width) > 0);assert(Number(image.height) > 0);}
      for (const anchor of d.querySelectorAll('.morph-toc a')) assert.equal(new URL(anchor.href).pathname, base + route);
      assert(sitemap.includes(`<loc>${home + route}</loc>`));
      assert(!/<script[^>]+src="https?:/.test(html));
      assert.equal(d.querySelectorAll('a[href^="javascript:"],img[src^="http"]').length, 0);
    } finally {await window.happyDOM.close();}
  }
});

test('atlas assets, LLM files and credits preserve independent-photo counts, exact licenses and documented missing photographs', async () => {
  assert.equal(articles.length, 37); assert.equal(photos.length, 42);
  assert.equal(morphAtlas.profiles.filter(p => p.kind === 'color-profile').length, 5);
  assert.equal(morphAtlas.profiles.filter(p => p.kind === 'age-comparison').length, 1);
  assert.equal(newMorphPhotos.length, 1); assert.equal(morphPhotos.length, 14);
  assert.equal(newMorphPhotos[0].artAllowed, false);
  for (const photo of morphPhotos) {
    const file = await readFile(new URL('../public' + photo.src, import.meta.url));
    assert.equal(createHash('sha256').update(file).digest('hex'), photo.sha256, photo.id);
    assert.equal(file.subarray(0, 4).toString(), 'RIFF'); assert.equal(file.subarray(8, 12).toString(), 'WEBP');
    if (photo.id !== newMorphPhotos[0].id) assert(photos.some(p => p.id === photo.id && p.sha256 === photo.sha256));
  }
  for (const filename of ['llms.txt', 'llms-full.txt']) {
    const text = await read(filename);
    assert(text.includes('独立した実写写真は42点'));assert(text.includes('既存の記事は37件'));
    assert(text.includes(morphAtlas.coverage.claim)); assert(!text.includes('<ruby>'));
    for (const profile of morphAtlas.profiles) assert(text.includes(home + `colors/${profile.id}/`));
  }
  const full = await read('llms-full.txt');
  for (const profile of morphAtlas.profiles) {assert(full.includes(profile.confidence)); for(const source of profile.sources) assert(full.includes(source.url));}
  for (const term of morphAtlas.terminology) {assert(full.includes(term.photoStatus));assert(full.includes(term.text));}
  assert(full.includes('3.000秒'));assert(full.includes('CC BY-SA 3.0'));
  const window = windowAt('credits/');
  try {window.document.write(await read('credits/index.html')); const content = plain(window.document.querySelector('main')); assert(content.includes('静止画 1点')); assert(content.includes(newMorphPhotos[0].credit)); assert(content.includes('工房の素材には含めません'));}
  finally {await window.happyDOM.close();}
  assert.equal(PAGE_CATALOG.filter(entry => entry[4]).length, 6);
});

test('integrated SPA atlas navigation, search, filters, comparison reset, speech and interrupted navigation preserve settings and privacy', async () => {
  const window = windowAt(), spoken = []; let stopped = 0;
  window.speechSynthesis = {cancel:()=>{stopped++;},speak:u=>spoken.push(u.text)};
  window.SpeechSynthesisUtterance = class {constructor(text){this.text=text;}};
  const keys = ['window','document','location','history','navigator','localStorage','matchMedia','Image','FormData','SpeechSynthesisUtterance','speechSynthesis'];
  const originals = new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  for (const key of keys) Object.defineProperty(globalThis,key,{configurable:true,value:key==='window'?window:key==='matchMedia'?window.matchMedia.bind(window):window[key]});
  try {
    window.localStorage.setItem('buncho-settings',JSON.stringify({ruby:false,motion:false}));
    window.localStorage.setItem('buncho-observations',JSON.stringify([{date:'2026-11-02',note:'private observation'}]));
    window.document.write(await read('index.html'));
    await import('../src/app.js?morph-integration');
    const d = window.document;
    const navigate = route => {const link=d.createElement('a');link.href=base+route;d.body.append(link);link.click();link.remove();};
    const change = (node,value) => {node.value=value;node.dispatchEvent(new window.Event('change',{bubbles:true}));};
    assert(d.querySelector('.morph-discovery-link'));
    navigate('encyclopedia/'); assert(d.querySelector('.morph-discovery-link'));assert.equal(d.querySelectorAll('.article-card').length,37);
    d.querySelector('.morph-discovery-link').click();assert.equal(location.pathname,base+'colors/');
    assert.equal(d.querySelectorAll('[data-morph-card]').length,5);
    const query=d.querySelector('[data-morph-query]');query.value='NO_MATCH_123';query.dispatchEvent(new window.Event('input',{bubbles:true}));
    assert.equal(d.querySelectorAll('[data-morph-card]').length,0);
    d.querySelector('[data-morph-reset]').click();assert.equal(d.querySelectorAll('[data-morph-card]').length,5);assert.equal(d.activeElement,query);
    assert.equal(d.querySelector('#morph-compare'),null);
    assert.equal(d.querySelector('[data-morph-compare-id]'),null);
    navigate('colors/silver/');assert.equal(d.querySelector('[data-morph-profile]').dataset.morphProfile,'silver');
    const oldSpeak=d.querySelector('[data-morph-speak]');oldSpeak.click();assert.equal(spoken.length,1);assert(!spoken[0].includes('<'));assert(spoken[0].includes('シルバー'));
    const before=stopped;navigate('colors/');assert(stopped>before);oldSpeak.click();assert.equal(spoken.length,1);
    history.replaceState({},'',base+'colors/cinnamon/');window.dispatchEvent(new window.PopStateEvent('popstate'));
    assert.equal(d.querySelector('[data-morph-profile]').dataset.morphProfile,'cinnamon');assert.equal(d.querySelector('link[rel=canonical]').href,home+'colors/cinnamon/');
    navigate('?q=シルバー'); assert(d.querySelector(`#search-morph-results a[href="${base}colors/silver/"]`));
    navigate('colors/not-real/');assert.equal(d.querySelector('meta[name=robots]').content,'noindex, follow');
    navigate('credits/');assert.equal(d.querySelectorAll('.credits-grid>figure').length,42);assert(d.querySelector('#morph-derived-heading'));
    assert.equal(d.documentElement.dataset.ruby,'on');assert.equal(d.documentElement.dataset.motion,'off');
    assert.equal(JSON.parse(window.localStorage.getItem('buncho-observations'))[0].note,'private observation');
    assert(![...Array(window.localStorage.length)].map((_,i)=>window.localStorage.key(i)).some(key=>key.startsWith('morph')));
  } finally {await window.happyDOM.close();for(const [key,descriptor] of originals) descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];}
});
