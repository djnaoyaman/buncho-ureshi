import { chooseGardenPair, gardenPairFrame, SOCIAL_PERIOD } from './garden-social-plan.js';
import { createPoseClock, poseGeometry, presentationSeed } from './bird-poses.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const sequence = Object.freeze(['left', 'tilt', 'preen', 'right', 'back', 'peck', 'rest']);
const reset = 'display:block;margin:0;padding:0;border:0;border-radius:0;background:none;transform:none;top:auto;left:auto;right:auto;bottom:auto;height:auto;max-width:none;box-shadow:none;font-size:0;line-height:0;';

/** An independent presentation clock, never the world's random number stream. */
export function gardenBirdPose(id, elapsed = 0) {
  const seed = presentationSeed(id), hold = 3000 + seed % 3001;
  const time = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  return sequence[(Math.floor(time / hold) + (seed >>> 8)) % sequence.length];
}

function styles(geometry) {
  const { window: frame, atlasImage: image, clip } = geometry;
  return {
    frame: `${reset}position:absolute;overflow:hidden;left:${frame.left * 100}%;top:${frame.top * 100}%;width:${frame.width * 100}%;height:${frame.height * 100}%;${clip ? `clip-path:polygon(${clip.map(point => `${point[0]}% ${point[1]}%`).join(',')});` : ''}`,
    image: `${reset}position:absolute;max-width:none;height:auto;object-fit:fill;transform:none;animation:none;transition:none;left:${image.left * 100}%;top:${image.top * 100}%;width:${image.width * 100}%;`,
  };
}

/** Native atlas crops share a fixed foot at (54%, 97.5%) in an 850:1000 box.
 * The host sizes/positions that box and owns the button and its visible label. */
export function renderGardenBirdSprite(color, id, { base = '/buncho-ureshi/', pose = gardenBirdPose(id) } = {}) {
  const geometry = poseGeometry(color, 'adult', pose), style = styles(geometry);
  return `<span class="garden-bird-sprite" data-garden-bird-id="${escape(id)}" data-color="${geometry.color}" data-pose="${geometry.pose}" data-foot-x="${geometry.footX}" data-foot-y="${geometry.footY}" aria-hidden="true" style="${reset}position:relative;width:var(--garden-bird-width,100%);aspect-ratio:850 / 1000;overflow:visible;pointer-events:none;animation:none;transition:none"><span class="garden-bird-pose-window" style="${style.frame}"><img src="${escape(base + 'game-art/' + geometry.asset + '.' + geometry.extension)}" alt="" width="${geometry.width}" height="${geometry.height}" draggable="false" decoding="sync" style="${style.image}"></span></span>`;
}

function refresh(root, elapsed, overrides = new Map()) {
  for (const sprite of root.querySelectorAll('.garden-bird-sprite[data-garden-bird-id]')) {
    if(sprite.closest('.finch-crow-scale-scene,.finch-raptor-scale-scene'))continue; // Measured side profile for the shared length scale.
    const pose = overrides.get(sprite)?.pose ?? gardenBirdPose(sprite.dataset.gardenBirdId, elapsed);
    if (pose === sprite.dataset.pose) continue;
    const frame = sprite.querySelector('.garden-bird-pose-window'), image = frame?.querySelector('img');
    if (!frame || !image) continue;
    const geometry = poseGeometry(sprite.dataset.color, 'adult', pose), style = styles(geometry);
    // Keep the decoded atlas, button, label, focus and all event handlers intact.
    frame.setAttribute('style', style.frame);
    image.setAttribute('style', style.image);
    sprite.dataset.pose = geometry.pose;
    sprite.dataset.footX = geometry.footX;
    sprite.dataset.footY = geometry.footY;
  }
}

/** One scheduler: a 1s idle poll OR RAF during bounded movement, never both.
 * Translation belongs to the complete button, preserving hit target and art.
 * All state below is presentation-only and discarded when the garden closes. */
export function mountGardenBirdMotion(root, { enabled = () => true, maxTravel = 20 } = {}) {
  const document = root.ownerDocument, window = document.defaultView;
  const motion = window?.matchMedia?.('(prefers-reduced-motion: reduce)');
  const clock = createPoseClock(() => window?.performance?.now?.() ?? Date.now());
  const selector = '.finch-garden-image-plane > .finch-garden-friend, .finch-garden-image-plane > .finch-garden-household';
  const hover = new Set(), pressed = new Set(), owned = new Map();
  let timer = null, raf = null, disposed = false, pair = null, actors = [], pairCycle = -1, invalid = true, semanticKey = null, observedStage = null, keyboardFocus = true;
  const allowed = () => !document.hidden && !motion?.matches;
  const interacting = () => actors.some(b => hover.has(b.node) || pressed.has(b.node) || (keyboardFocus && b.node.contains(document.activeElement)));
  const sheetOpen = () => !!document.querySelector('.game-bird-sheet[open]') || !!root.querySelector('.finch-garden details[open], details[open]');
  const clearSchedule = () => {
    if (timer !== null) window.clearInterval(timer);
    if (raf !== null) window.cancelAnimationFrame(raf);
    timer = raf = null;
  };
  const restore = () => {
    for (const [node, values] of owned) for (const [name, value] of Object.entries(values)) {
      if (value) node.style.setProperty(name, value); else node.style.removeProperty(name);
    }
    owned.clear(); pair = null; pairCycle = -1;
  };
  const box = node => {
    const r = node.getBoundingClientRect(), label = node.querySelector(':scope > .finch-friend-name, :scope > span:not(.garden-bird-sprite)');
    const l = label?.getBoundingClientRect();
    return { left: Math.min(r.left, l?.left ?? r.left), right: Math.max(r.right, l?.right ?? r.right), top: Math.min(r.top, l?.top ?? r.top), bottom: Math.max(r.bottom, l?.bottom ?? r.bottom) };
  };
  const rebuild = (nodes, cycle) => {
    restore();
    actors = nodes.map(node => ({ node, id: node.querySelector('.garden-bird-sprite')?.dataset.gardenBirdId, kind: node.matches('.finch-garden-household') ? 'household' : 'friend', rect: box(node) }));
    const stage = root.querySelector('.finch-garden-stage'), slide = root.querySelector('.finch-garden-slide');
    if (stage !== observedStage) { observer?.disconnect(); if (stage) observer?.observe(stage); observedStage = stage; }
    const r = stage?.getBoundingClientRect(), s = slide?.getBoundingClientRect();
    const clip = r && s && { left: Math.max(r.left, s.left), right: Math.min(r.right, s.right), top: Math.max(r.top, s.top), bottom: Math.min(r.bottom, s.bottom) };
    const obstacles = [...root.querySelectorAll('.finch-garden-visitor, .finch-garden-family, .finch-garden-selector, .finch-garden-dock')].map(box);
    pair = chooseGardenPair(actors, clip, { obstacles, cycle, maxTravel });
    pairCycle = cycle; invalid = false;
  };
  const schedule = moving => {
    if (disposed || !allowed()) { clearSchedule(); return; }
    if (moving && window.requestAnimationFrame) {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      if (raf === null) raf = window.requestAnimationFrame(() => { raf = null; tick(); });
    } else {
      if (raf !== null) window.cancelAnimationFrame(raf);
      raf = null;
      if (timer === null) timer = window.setInterval(tick, 1000);
    }
  };
  const tick = () => {
    if (disposed) return;
    const nodes = [...root.querySelectorAll(selector)];
    const garden = root.matches?.('.finch-garden') ? root : root.querySelector('.finch-garden');
    const nextKey = JSON.stringify([
      garden?.dataset.gardenWorld ?? '', root.querySelector('.finch-garden-stage')?.dataset.gardenId ?? '',
      nodes.map(node => [node.matches('.finch-garden-household') ? 'household' : 'friend', node.querySelector('.garden-bird-sprite')?.dataset.gardenBirdId ?? '']).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    ]);
    const sceneChanged = semanticKey !== null && semanticKey !== nextKey;
    semanticKey = nextKey;
    const changed = sceneChanged || nodes.length !== actors.length || nodes.some((n, i) => n !== actors[i]?.node);
    if (changed) {
      restore();
      for (const node of hover) if (!nodes.includes(node)) hover.delete(node);
      for (const node of pressed) if (!nodes.includes(node)) pressed.delete(node);
      actors = nodes.map(node => ({ node })); invalid = true;
      // Routine world renders replace DOM, not the ongoing social presentation.
      if (sceneChanged) clock.reset();
    }
    const active = allowed() && root.isConnected && !!enabled() && !interacting() && !sheetOpen();
    const elapsed = clock.advance(active);
    if (!active) { schedule(false); return; }
    const cycle = Math.floor(elapsed / SOCIAL_PERIOD), local = elapsed % SOCIAL_PERIOD;
    if (invalid || pairCycle !== cycle) rebuild(nodes, cycle);
    const frame = gardenPairFrame(pair, local, cycle), overrides = new Map();
    if (frame) for (const action of [frame.a, frame.b]) {
      const actor = actors.find(b => b.id === action.id), sprite = actor?.node.querySelector('.garden-bird-sprite');
      if (!actor || !sprite) continue;
      if (!owned.has(actor.node)) owned.set(actor.node, Object.fromEntries(['translate', 'scale', 'transform-origin', 'z-index'].map(k => [k, actor.node.style.getPropertyValue(k)])));
      if (!owned.has(sprite)) owned.set(sprite, { translate: sprite.style.getPropertyValue('translate') });
      actor.node.style.setProperty('translate', `${action.x.toFixed(3)}px ${action.y.toFixed(3)}px`);
      actor.node.style.setProperty('scale', Math.max(action.scale, root.querySelector('[data-garden-density=compact]') ? 1 : .988).toFixed(4));
      actor.node.style.setProperty('transform-origin', '54% 97.5%');
      actor.node.style.setProperty('z-index', action.y > 0 ? '3' : '2');
      sprite.style.setProperty('translate', `0px ${action.hop.toFixed(3)}px`);
      overrides.set(sprite, action);
    }
    refresh(root, elapsed, overrides);
    const moving = !!frame && ((local >= 4000 && local < 8000) || (local >= 13000 && local < 13500) || (local >= 16000 && local < 20000));
    schedule(moving);
  };
  const sync = () => { if (!disposed) { clock.hold(); clearSchedule(); if (allowed()) { clock.advance(root.isConnected && !!enabled() && !interacting() && !sheetOpen()); schedule(false); } } };
  const target = event => event.target?.closest?.(selector);
  const lock = event => {
    const node = target(event); if (!node) return;
    if (event.type === 'pointerover' && event.pointerType !== 'touch') hover.add(node);
    if (event.type === 'focusin' && !keyboardFocus) return;
    if (event.type === 'pointerdown') pressed.add(node);
    clock.hold(); schedule(false);
  };
  const unlock = event => {
    const node = target(event);
    if (event.type === 'pointerout' && node && !node.contains(event.relatedTarget)) hover.delete(node);
    if (event.type === 'pointerup' || event.type === 'pointercancel') { pressed.clear(); if (event.pointerType === 'touch') hover.clear(); }
    clock.hold();
  };
  const modality = event => { keyboardFocus = event.type === 'keydown'; if (keyboardFocus) { clock.hold(); schedule(false); } };
  document.addEventListener('pointerdown', modality, true);
  document.addEventListener('keydown', modality, true);
  const resize = () => { invalid = true; clock.hold(); };
  document.addEventListener('visibilitychange', sync);
  for (const type of ['pointerover', 'pointerdown', 'focusin']) root.addEventListener(type, lock);
  for (const type of ['pointerout', 'focusout']) root.addEventListener(type, unlock);
  for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, unlock);
  window.addEventListener('resize', resize);
  const observer = window.ResizeObserver ? new window.ResizeObserver(resize) : null;
  observedStage = root.querySelector('.finch-garden-stage'); if (observedStage) observer?.observe(observedStage);
  if (motion?.addEventListener) motion.addEventListener('change', sync); else motion?.addListener?.(sync);
  sync();
  return () => {
    if (disposed) return;
    disposed = true; clearSchedule(); clock.hold(); restore(); observer?.disconnect();
    document.removeEventListener('visibilitychange', sync);
    document.removeEventListener('pointerdown', modality, true);
    document.removeEventListener('keydown', modality, true);
    for (const type of ['pointerover', 'pointerdown', 'focusin']) root.removeEventListener(type, lock);
    for (const type of ['pointerout', 'focusout']) root.removeEventListener(type, unlock);
    for (const type of ['pointerup', 'pointercancel']) document.removeEventListener(type, unlock);
    window.removeEventListener('resize', resize);
    if (motion?.removeEventListener) motion.removeEventListener('change', sync); else motion?.removeListener?.(sync);
  };
}
