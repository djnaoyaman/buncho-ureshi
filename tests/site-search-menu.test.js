import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Window } from 'happy-dom';

test('site search opens first and follows visual viewport without changing the game menu', async () => {
  const window = new Window({
    url: 'https://djnaoyaman.github.io/buncho-ureshi/omochi/',
    settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, disableJavaScriptEvaluation: true },
  });
  const viewport = new window.EventTarget();
  Object.assign(viewport, { height: 664, offsetTop: 0, scale: 1 });
  Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true });
  window.speechSynthesis = { cancel() {} };
  for (const key of ['window', 'document', 'location', 'history', 'navigator', 'localStorage', 'matchMedia', 'Image', 'FormData']) {
    Object.defineProperty(globalThis, key, { configurable: true, value: key === 'window' ? window : key === 'matchMedia' ? window.matchMedia.bind(window) : window[key] });
  }
  window.document.write(await readFile(new URL('../dist/omochi/index.html', import.meta.url), 'utf8'));
  await import('../src/app.js?site-search-menu');
  const doc = window.document, menu = doc.querySelector('#menu'), toggle = doc.querySelector('#menu-toggle');
  menu.getBoundingClientRect = () => ({ top: 80 });
  assert.equal(menu.firstElementChild.id, 'site-search');
  assert.equal(doc.querySelector('#global-query').getAttribute('enterkeyhint'), 'search');
  toggle.click();
  assert.equal(menu.hidden, false);
  assert.equal(menu.style.getPropertyValue('--site-menu-max-height'), '572px');
  viewport.height = 300;
  viewport.dispatchEvent(new window.Event('resize'));
  assert.equal(menu.style.getPropertyValue('--site-menu-max-height'), '208px');
  viewport.offsetTop = 30;
  viewport.dispatchEvent(new window.Event('scroll'));
  assert.equal(menu.style.getPropertyValue('--site-menu-max-height'), '238px');
  menu.scrollTop = 500;
  toggle.click();
  assert.equal(menu.hidden, true);
  toggle.click();
  assert.equal(menu.scrollTop, 0);
  doc.body.dataset.world = 'buncho';
  viewport.height = 600;
  viewport.dispatchEvent(new window.Event('resize'));
  assert.equal(menu.style.getPropertyValue('--site-menu-max-height'), '238px');
  delete doc.body.dataset.world;
  Object.defineProperty(window, 'visualViewport', { value: undefined, configurable: true });
  window.dispatchEvent(new window.Event('resize'));
  assert.equal(menu.style.getPropertyValue('--site-menu-max-height'), `${window.innerHeight - 92}px`);
  toggle.click();
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  await window.happyDOM.close();
});
