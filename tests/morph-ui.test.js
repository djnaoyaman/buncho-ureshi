import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Window } from 'happy-dom';
import { prepareMorphAtlas, renderMorphOverview, renderMorphProfile, renderMorphComparison, renderMorphPhoto, renderMorphRuby, filterMorphProfiles, buildMorphSearchIndex, morphSpeechText, bindMorphAtlas } from '../src/morph-ui.js';

import { morphAtlas as raw } from '../src/data/morphs.js';
import { morphPhotos as photos } from '../src/data/morph-photos.js';
const data = prepareMorphAtlas(raw, photos);
const plainText = element => { const copy = element.cloneNode(true); copy.querySelectorAll('rt,rp').forEach(node => node.remove()); return copy.textContent; };
function dom(html, route = 'colors/') {
  const window = new Window({ url: 'https://example.test/buncho-ureshi/' + route, settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, disableJavaScriptEvaluation: true } });
  window.document.body.innerHTML = '<main></main>';
  const root = window.document.querySelector('main'); root.innerHTML = html;
  return { window, root, close: () => window.happyDOM.abort() };
}

test('authoritative adaptation is non-mutating and retains six profiles, five color categories, and fourteen honest gaps', () => {
  const before = JSON.stringify(raw);
  const prepared = prepareMorphAtlas(raw, photos);
  assert.equal(JSON.stringify(raw), before);
  assert.equal(prepared.profiles.length, 6);
  assert.equal(filterMorphProfiles(prepared).length, 5);
  assert.equal(prepared.terms.length, 14);
  assert(prepared.terms.every(term => term.photoIds.length === 0 && term.photoGap));
  for (const profile of prepared.profiles) {
    assert.equal(profile.levels.length, 3);
    assert.equal(profile.features.length, 4);
    assert(profile.photo.caveat === profile.confidence);
    assert(profile.photo.caption === profile.photoNotes[profile.photoIds[0]]);
    assert(profile.nameRuby.includes('<ruby>'));
  }
});

test('overview pre-renders five photo profiles, a separate juvenile comparison, terminology, glossary, and every anchor target', async () => {
  const { root, close } = dom(renderMorphOverview(data));
  try {
    assert.equal(root.querySelectorAll('.morph-card').length, 5);
    assert.equal(root.querySelectorAll('.morph-age-card').length, 4);
    assert.equal(root.querySelectorAll('.morph-term').length, 14);
    assert.equal(root.querySelectorAll('.morph-term img').length, 0);
    assert.equal(root.querySelectorAll('.morph-gap').length, 14);
    assert.equal(root.querySelectorAll('.morph-glossary>div').length, raw.glossary.length);
    assert(plainText(root).includes(raw.coverage.claim));
    assert(plainText(root).includes('別々の生物の種ではありません'));
    for (const link of root.querySelectorAll('.morph-toc a')) {
      assert.equal(new URL(link.href).pathname, '/buncho-ureshi/colors/');
      assert(root.querySelector(new URL(link.href).hash));
    }
    assert(root.querySelector('noscript'));
  } finally { await close(); }
});

test('all six static profiles expose exact diagnostic text, all source captions, confidence, three levels and checked date', async () => {
  for (const profile of data.profiles) {
    const { root, close } = dom(renderMorphProfile(profile.id, data), 'colors/' + profile.id + '/');
    try {
      assert.equal(root.querySelectorAll('h1').length, 1);
      assert.equal(root.querySelectorAll('.morph-learning-first').length, 1);
      assert.equal(root.querySelectorAll('.morph-learning>details').length, 2);
      assert(root.querySelector('.morph-learning>details[open]'));
      assert(plainText(root).includes(profile.confidence));
      assert(plainText(root).includes(profile.reviewedAt));
      assert.equal(root.querySelectorAll('.morph-photo').length, profile.photoIds.length);
      for (const id of profile.photoIds) {
        const photo = photos.find(item => item.id === id);
        assert(photo);
        const image = [...root.querySelectorAll('img')].find(image => image.getAttribute('src') === '/buncho-ureshi/' + photo.src.replace(/^\//, ''));
        assert(image, profile.id + ':' + id);
        assert.equal(Number(image.getAttribute('width')), photo.width);
        assert.equal(Number(image.getAttribute('height')), photo.height);
        assert(plainText(root).includes(profile.photoNotes[id]));
        assert(plainText(root).includes(photo.author));
        assert(plainText(root).includes(photo.license));
        assert([...root.querySelectorAll('a')].some(a => a.href === photo.source));
      }
      for (const link of root.querySelectorAll('.morph-toc a')) {
        assert.equal(new URL(link.href).pathname, '/buncho-ureshi/colors/' + profile.id + '/');
        assert(root.querySelector(new URL(link.href).hash));
      }
    } finally { await close(); }
  }
});

test('cinnamon explicitly remains a video-derived still, silver is not invented light/dark classification, and pied is not pedigree-certified', async () => {
  const specimen = dom(renderMorphProfile('cinnamon', data));
  const cinnamon = plainText(specimen.root);
  await specimen.close();
  assert(cinnamon.includes('3.000'));
  assert(photos.find(photo => photo.id === 'morph-cinnamon-video-still').frameTimeSeconds === 3);
  assert(cinnamon.includes('動画由来'));
  assert(cinnamon.includes('CC BY-SA 3.0'));
  assert(cinnamon.includes('独立写真'));
  assert(data.profiles.find(p => p.id === 'silver').photo.caveat === data.profiles.find(p => p.id === 'silver').confidence);
  assert(data.profiles.find(profile => profile.id === 'sakura-pied').photo.caveat.includes('撮影者による血統認定はない'));
  assert(data.profiles.find(profile => profile.id === 'juvenile').photo.caption.includes('孵化後七日という意味ではありません'));
});

test('search normalizes fullwidth/case, searches aliases and has six real route entries without adding terms as finished profiles', () => {
  assert.deepEqual(filterMorphProfiles(data, 'ごましお').map(p => p.id), ['sakura-pied']);
  assert(filterMorphProfiles(data, 'ｓｉｌｖｅｒ').some(p => p.id === 'silver'));
  assert.equal(filterMorphProfiles(data, '存在しない組合せ').length, 0);
  assert.deepEqual(filterMorphProfiles(data, '', 'white').map(p => p.id), ['white']);
  const index = buildMorphSearchIndex(data);
  assert.equal(index.length, 6);
  assert(index.every(entry => entry.url.startsWith('/buncho-ureshi/colors/')));
  assert(index.some(entry => entry.id === 'juvenile'));
  assert(!index.some(entry => entry.id === 'cream'));
});

test('escaping blocks injected markup, protocol URLs and arbitrary trusted-field HTML', async () => {
  const dirty = structuredClone(data);
  dirty.profiles[0].name = '<img src=x onerror=alert(1)>';
  dirty.profiles[0].nameRuby = undefined;
  dirty.profiles[0].summaryRuby = '<ruby onclick="bad()">危険<rt>きけん</rt></ruby><script>bad()</script>';
  dirty.photos[0].source = 'javascript:alert(1)';
  const { root, close } = dom(renderMorphProfile('normal', dirty));
  try {
    assert.equal(root.querySelectorAll('script,[onclick],[onerror]').length, 0);
    assert(![...root.querySelectorAll('a')].some(a => a.getAttribute('href')?.startsWith('javascript:')));
    assert(plainText(root).includes('<script>bad()</script>'));
    assert.equal(renderMorphRuby('<ruby>白<rt>しろ</rt></ruby>'), '<ruby>白<rt>しろ</rt></ruby>');
    assert(renderMorphRuby('<iframe src="https://bad.test"></iframe>').startsWith('&lt;iframe'));
    assert(renderMorphPhoto('missing-photo', dirty).includes('確認'));
    assert(!renderMorphPhoto('missing-photo', dirty).includes('<img'));
  } finally { await close(); }
});

test('scoped binding filters, resets, submits and compares without replacing controls or moving focus unexpectedly', async () => {
  const { root, window, close } = dom(renderMorphOverview(data));
  const teardown = bindMorphAtlas(root, { data });
  try {
    const query = root.querySelector('[data-morph-query]'), filter = root.querySelector('[data-morph-filter]');
    query.value = 'ごましお'; query.dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.equal(root.querySelectorAll('.morph-card').length, 1);
    assert.equal(root.querySelector('[data-morph-card]').dataset.morphCard, 'sakura-pied');
    assert.strictEqual(root.querySelector('[data-morph-query]'), query);
    root.querySelector('[data-morph-reset]').click();
    assert.equal(root.querySelectorAll('.morph-card').length, 5);
    assert.equal(query.value, ''); assert.equal(filter.value, 'all');
    filter.value = 'silver'; filter.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.equal(root.querySelectorAll('.morph-card').length, 1);
    const submitted = root.querySelector('[data-morph-filter-form]').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    assert.equal(submitted, false);
    const a = root.querySelector('[data-morph-compare="a"]'), b = root.querySelector('[data-morph-compare="b"]');
    a.value = 'white'; b.value = 'white'; a.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.equal(root.querySelectorAll('.morph-comparison').length, 0);
    assert(root.querySelector('[data-morph-compare-status]').textContent.includes('ちがう'));
    b.value = 'silver'; b.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.equal(root.querySelectorAll('.morph-comparison').length, 2);
    root.querySelector('[data-morph-compare-id="silver"]').click();
    assert.equal(a.value, 'silver'); assert.notEqual(a.value, b.value);
    assert.equal(root.querySelectorAll('.morph-comparison').length, 2);
    teardown(); teardown();
    query.value = 'ごましお'; query.dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.equal(root.querySelector('[data-morph-card]').dataset.morphCard, 'silver');
  } finally { teardown(); await close(); }
});

test('TTS callbacks receive plain explanation, stay root-scoped, stop on demand and teardown, and errors leave text readable', async () => {
  const { root, window, close } = dom(renderMorphProfile('white', data), 'colors/white/');
  const spoken = []; let stops = 0;
  const teardown = bindMorphAtlas(root, { data, speak: text => spoken.push(text), stopSpeech: () => stops++ });
  try {
    root.querySelector('[data-morph-speak]').click();
    assert.equal(spoken.length, 1); assert(!spoken[0].includes('<rt>')); assert(spoken[0].includes('白文鳥'));
    const outside = window.document.createElement('button'); outside.dataset.morphSpeak = 'white'; window.document.body.append(outside); outside.click();
    assert.equal(spoken.length, 1);
    root.querySelector('[data-morph-stop]').click(); assert.equal(stops, 1);
    root.querySelector('[data-morph-speak]').click(); teardown(); assert.equal(stops, 2);
    root.querySelector('[data-morph-speak]').click(); assert.equal(spoken.length, 2);
    assert(morphSpeechText('white', data).includes('白文鳥'));
    assert.equal(morphSpeechText('not-a-profile', data), '');
    const failTeardown = bindMorphAtlas(root, { data, speak: () => { throw new Error('unsupported'); } });
    root.querySelector('[data-morph-speak]').click();
    assert(root.querySelector('[data-morph-speech-status]').textContent.includes('文章はそのまま'));
    failTeardown();
  } finally { teardown(); await close(); }
});

test('stylesheet explicitly retains full photo framing, visible ruby, responsive single columns and reduced motion', async () => {
  const css = await readFile(new URL('../src/morph-ui.css', import.meta.url), 'utf8');
  assert(css.includes('object-fit:contain!important'));
  assert(!css.includes('object-fit:cover'));
  assert(css.includes('display:ruby-text!important'));
  assert(css.includes('@media(max-width:560px)'));
  assert(css.includes('prefers-reduced-motion:reduce'));
});


test('ruby field labels use inline text flow and put only controls on the next row', async () => {
  const css = await readFile(new URL('../src/morph-ui.css', import.meta.url), 'utf8');
  assert.match(css, /\.morph-atlas label\{display:block;min-width:0;/);
  assert.match(css, /\.morph-atlas label>input,\.morph-atlas label>select\{display:block;margin-block-start:8px;/);
  assert(!/\.morph-atlas label\{[^}]*display:(?:grid|flex)/.test(css));
  assert(css.includes('display:ruby-text!important'));
});
