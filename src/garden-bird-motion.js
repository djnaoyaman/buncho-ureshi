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

function refresh(root, elapsed) {
  for (const sprite of root.querySelectorAll('.garden-bird-sprite[data-garden-bird-id]')) {
    const pose = gardenBirdPose(sprite.dataset.gardenBirdId, elapsed);
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

/** Poll host settings once a second; hidden/reduced-motion views have no timer.
 * Inactive time is discarded. Only decorative crop geometry is ever changed. */
export function mountGardenBirdMotion(root, { enabled = () => true } = {}) {
  const document = root.ownerDocument, window = document.defaultView;
  const motion = window?.matchMedia?.('(prefers-reduced-motion: reduce)');
  const clock = createPoseClock(() => window?.performance?.now?.() ?? Date.now());
  const allowed = () => !document.hidden && !motion?.matches;
  let timer = null, disposed = false;
  const tick = () => {
    if (disposed) return;
    const active = allowed() && root.isConnected && !!enabled();
    const elapsed = clock.advance(active);
    if (active) refresh(root, elapsed);
  };
  const sync = () => {
    if (disposed) return;
    clock.hold();
    if (!allowed()) {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
    } else if (timer === null) {
      clock.advance(root.isConnected && !!enabled());
      timer = window.setInterval(tick, 1000);
    }
  };
  document.addEventListener('visibilitychange', sync);
  if (motion?.addEventListener) motion.addEventListener('change', sync);
  else motion?.addListener?.(sync);
  sync();
  return () => {
    if (disposed) return;
    disposed = true;
    if (timer !== null) window.clearInterval(timer);
    timer = null;
    clock.hold();
    document.removeEventListener('visibilitychange', sync);
    if (motion?.removeEventListener) motion.removeEventListener('change', sync);
    else motion?.removeListener?.(sync);
  };
}
