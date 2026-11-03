import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { poseGeometry, presentationSeed } from '../src/bird-poses.js';
import { gardenBirdPose, renderGardenBirdSprite, mountGardenBirdMotion } from '../src/garden-bird-motion.js';

test('garden choices hold real distinct poses for 3–6 seconds without randomness', () => {
  const initial = new Set();
  for (let index = 0; index < 30; index++) {
    const id = `garden-${index}`, hold = 3000 + presentationSeed(id) % 3001;
    const first = gardenBirdPose(id, 0);
    initial.add(first);
    assert.equal(gardenBirdPose(id, hold - 1), first);
    assert.notEqual(gardenBirdPose(id, hold), first);
    assert.equal(new Set(Array.from({ length: 7 }, (_, step) => gardenBirdPose(id, step * hold))).size, 7);
    assert.equal(gardenBirdPose(id, NaN), first);
    assert.equal(gardenBirdPose(id, -500), first);
  }
  assert.ok(initial.size >= 4, 'birds begin in varied, unsynchronized poses');
});

test('all garden crop windows keep feet anchored and reuse the native atlas geometry', async () => {
  const window = new Window();
  try {
    for (const color of ['white', 'sakura', 'silver', 'cinnamon']) {
      for (const pose of ['left', 'right', 'back', 'preen', 'peck', 'tilt', 'rest']) {
        const template = window.document.createElement('template');
        template.innerHTML = renderGardenBirdSprite(color, 'friend', { base: '/custom/', pose });
        const sprite = template.content.firstElementChild, frame = sprite.firstElementChild, image = frame.firstElementChild;
        const geometry = poseGeometry(color, 'adult', pose), [x, y] = geometry.crop;
        assert.equal(image.getAttribute('src'), `/custom/game-art/${color}-poses.webp`);
        assert.equal(sprite.getAttribute('aria-hidden'), 'true');
        assert.equal(image.getAttribute('alt'), '');
        assert.equal(sprite.style.aspectRatio, '850 / 1000');
        assert.ok(Math.abs(parseFloat(frame.style.left) / 100 * 850 + (geometry.footX - x) * geometry.scale - 459) < 1e-8);
        assert.ok(Math.abs(parseFloat(frame.style.top) / 100 * 1000 + (geometry.footY - y) * geometry.scale - 975) < 1e-8);
        assert.match(frame.style.clipPath, /^polygon\(/);
        assert.equal(image.style.transform, 'none');
      }
    }
    const template = window.document.createElement('template');
    template.innerHTML = renderGardenBirdSprite('unknown', '"><script>bad</script>', { pose: 'missing' });
    assert.equal(template.content.querySelectorAll('script').length, 0);
    assert.equal(template.content.firstElementChild.dataset.gardenBirdId, '"><script>bad</script>');
    assert.equal(template.content.firstElementChild.dataset.color, 'white');
    assert.equal(template.content.firstElementChild.dataset.pose, 'left');
  } finally { await window.happyDOM.close(); }
});

async function fixture(t) {
  const window = new Window(), document = window.document, root = document.createElement('section');
  const callbacks = new Map(), listeners = new Set();
  let now = 0, next = 0, hidden = false, enabled = true, dispose;
  const media = { matches: false, addEventListener: (_type, listener) => listeners.add(listener), removeEventListener: (_type, listener) => listeners.delete(listener) };
  Object.defineProperty(document, 'hidden', { get: () => hidden, configurable: true });
  Object.defineProperty(window.performance, 'now', { value: () => now, configurable: true });
  window.matchMedia = () => media;
  window.setInterval = (callback, delay) => { assert.equal(delay, 1000); callbacks.set(++next, callback); return next; };
  window.clearInterval = id => callbacks.delete(id);
  root.innerHTML = `<button aria-label="友達とおしゃべり">${renderGardenBirdSprite('white', 'friend')}<span class="label">友達</span></button><input value="入力中">`;
  document.body.append(root);
  t.after(async () => { dispose?.(); await window.happyDOM.close(); });
  return {
    window, document, root, callbacks, listeners,
    mount() { dispose = mountGardenBirdMotion(root, { enabled: () => enabled }); return dispose; },
    step(ms = 1000) { now += ms; for (const callback of [...callbacks.values()]) callback(); },
    enable(value) { enabled = value; },
    hide(value) { hidden = value; document.dispatchEvent(new window.Event('visibilitychange')); },
    reduce(value) { media.matches = value; for (const listener of listeners) listener(); },
  };
}

test('pose timer changes only crop styles and preserves image, buttons, labels and focus', async t => {
  const f = await fixture(t);
  const button = f.root.querySelector('button'), image = f.root.querySelector('img'), label = f.root.querySelector('.label'), input = f.root.querySelector('input'), sprite = f.root.querySelector('.garden-bird-sprite');
  let clicks = 0;
  button.addEventListener('click', () => clicks++);
  input.focus();
  const first = sprite.dataset.pose, src = image.getAttribute('src');
  f.mount();
  for (let i = 0; i < 6; i++) f.step();
  assert.notEqual(sprite.dataset.pose, first);
  assert.equal(f.root.querySelector('button'), button);
  assert.equal(f.root.querySelector('img'), image);
  assert.equal(image.getAttribute('src'), src);
  assert.equal(f.root.querySelector('.label'), label);
  assert.equal(label.textContent, '友達');
  assert.equal(f.document.activeElement, input);
  assert.equal(input.value, '入力中');
  button.click();
  assert.equal(clicks, 1);
});

test('pause, hidden and reduced motion freeze poses without catching up, and cleanup removes timers/listeners', async t => {
  const f = await fixture(t), dispose = f.mount(), sprite = f.root.querySelector('.garden-bird-sprite');
  const first = sprite.dataset.pose;
  f.enable(false);
  for (let i = 0; i < 40; i++) f.step();
  assert.equal(sprite.dataset.pose, first);
  f.enable(true); f.step();
  assert.equal(sprite.dataset.pose, first);
  f.hide(true);
  assert.equal(f.callbacks.size, 0);
  f.step(86400000); f.hide(false);
  assert.equal(f.callbacks.size, 1);
  assert.equal(sprite.dataset.pose, first);
  f.reduce(true);
  assert.equal(f.callbacks.size, 0);
  f.step(86400000); f.reduce(false);
  f.step();
  assert.equal(sprite.dataset.pose, first);
  for (let i = 0; i < 5; i++) f.step();
  assert.notEqual(sprite.dataset.pose, first);
  const last = sprite.dataset.pose;
  dispose(); dispose();
  assert.equal(f.callbacks.size, 0);
  assert.equal(f.listeners.size, 0);
  f.hide(true); f.hide(false); f.reduce(true); f.reduce(false); f.step(5000);
  assert.equal(f.callbacks.size, 0);
  assert.equal(sprite.dataset.pose, last);
});

test('mounting hidden or reduced-motion gardens does not schedule or change poses', async t => {
  const f = await fixture(t);
  f.hide(true); f.reduce(true);
  const before = f.root.innerHTML;
  f.mount();
  assert.equal(f.callbacks.size, 0);
  f.step(60000);
  assert.equal(f.root.innerHTML, before);
  f.hide(false);
  assert.equal(f.callbacks.size, 0);
  f.reduce(false);
  assert.equal(f.callbacks.size, 1);
});
