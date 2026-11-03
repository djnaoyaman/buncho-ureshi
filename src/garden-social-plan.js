import { presentationSeed } from './bird-poses.js';

export const SOCIAL_PERIOD = 28000;
const finiteRect = r => r && ['left', 'right', 'top', 'bottom'].every(k => Number.isFinite(r[k])) && r.right > r.left && r.bottom > r.top;
const intersects = (a, b, gap = 6) => a.left < b.right + gap && a.right + gap > b.left && a.top < b.bottom + gap && a.bottom + gap > b.top;
const inside = (r, clip) => r.left >= clip.left && r.right <= clip.right && r.top >= clip.top && r.bottom <= clip.bottom;
const shifted = (r, x) => ({ ...r, left: r.left + x, right: r.right + x });
const swept = (r, x) => ({ ...r, left: r.left + Math.min(x, 0), right: r.right + Math.max(x, 0) });
const smooth = t => { const p = Math.max(0, Math.min(1, t)); return p * p * (3 - 2 * p); };

/** Input rectangles are immutable, unshifted viewport bounds (including labels).
 * Only one pair moves at once; all remaining birds/visitor/UI are obstacles.
 * The caller supplies the visible terrain clip, not the larger cover-image plane.
 * Existing overlap is never "repaired" by animation: unsafe candidates are skipped.
 */
export function chooseGardenPair(birds, clip, { obstacles = [], cycle = 0, maxTravel = 20 } = {}) {
  if (!finiteRect(clip)) return null;
  const present = birds.filter(b => finiteRect(b.rect));
  const available = present.filter(b => !b.locked && (b.kind === 'friend' || b.kind === 'household'));
  const options = [];
  for (let i = 0; i < available.length; i++) for (let j = i + 1; j < available.length; j++) {
    let a = available[i], b = available[j];
    if (a.rect.left > b.rect.left) [a, b] = [b, a];
    const height = Math.min(a.rect.bottom - a.rect.top, b.rect.bottom - b.rect.top);
    if (Math.abs(a.rect.bottom - b.rect.bottom) > Math.min(28, height * .3)) continue;
    const gap = b.rect.left - a.rect.right;
    // Keep potential partners local, not opposite sides of the entire garden.
    if (gap < 10 || gap > 96) continue;
    const blockers = [...present.filter(x => x !== a && x !== b).map(x => x.rect), ...obstacles].filter(finiteRect);
    let travel = Math.min(Number.isFinite(maxTravel) ? Math.max(0, Math.min(maxTravel, 40)) : 20, (gap - 8) / 2);
    while (travel >= 4) {
      const sa = swept(a.rect, travel), sb = swept(b.rect, -travel);
      if (inside(sa, clip) && inside(sb, clip) && !intersects(sa, sb) && blockers.every(r => !intersects(sa, r) && !intersects(sb, r))) break;
      travel -= 1;
    }
    if (travel < 4) continue;
    // Reserve both perspective growth and the complete airborne/depth envelope.
    const pad = Math.ceil(Math.max(a.rect.bottom - a.rect.top, b.rect.bottom - b.rect.top, a.rect.right - a.rect.left, b.rect.right - b.rect.left) * .015);
    const envelope = (r, x) => { const q = swept(r, x); return { left: q.left - pad, right: q.right + pad, top: q.top - pad - 7, bottom: q.bottom + pad + 4 }; };
    let depth = 0, hop = 0;
    for (let candidate = travel; candidate >= 4; candidate -= 1) {
      const sa = envelope(a.rect, candidate), sb = envelope(b.rect, -candidate);
      if (inside(sa, clip) && inside(sb, clip) && !intersects(sa, sb, 8) && blockers.every(r => !intersects(sa, r) && !intersects(sb, r))) {
        travel = candidate; depth = 4; hop = 3; break;
      }
    }
    options.push({ a: a.id, b: b.id, travel, gap, depth, hop, seed: presentationSeed(`${a.id}:${b.id}`) });
  }
  options.sort((a, b) => a.gap - b.gap || a.seed - b.seed);
  if (!options.length) return null;
  const index = Math.max(0, Math.floor(Number.isFinite(cycle) ? cycle : 0)) % options.length;
  return options[index];
}

/** Sample a selected pair in local active time. No DOM, RNG, save or reward calls.
 * Gentle greeting and parallel preening dominate; a brief disagreement occurs
 * once in four cycles. All trajectories return exactly to their anchors.
 */
export function gardenPairFrame(pair, elapsed = 0, cycle = 0) {
  if (!pair || !Number.isFinite(pair.travel) || pair.travel < 0 || pair.travel > 40) return null;
  const t = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0) % SOCIAL_PERIOD;
  const turn = Math.max(0, Math.floor(Number.isFinite(cycle) ? cycle : 0));
  const kind = ['greeting', 'preen', 'nudge', 'quarrel'][(pair.seed + turn) % 4];
  const reverse = ((pair.seed >>> 3) + turn) % 2 === 1;
  let amount = 0, phase = 'observe', aPose = 'right', bPose = 'left';
  if (t >= 4000 && t < 8000) { amount = smooth((t - 4000) / 4000); phase = 'approach'; }
  else if (t >= 8000 && t < 10000) { amount = 1; phase = 'notice'; bPose = 'tilt'; }
  else if (t >= 10000 && t < 13000) {
    amount = 1; phase = kind;
    if (kind === 'preen') { aPose = 'preen'; bPose = 'rest'; }
    else if (kind === 'greeting') { aPose = 'tilt'; bPose = 'tilt'; }
    else { aPose = 'peck'; bPose = kind === 'quarrel' ? 'back' : 'tilt'; }
  } else if (t >= 13000 && t < 16000) {
    phase = 'response'; amount = kind === 'quarrel' ? .55 : .85;
    aPose = kind === 'quarrel' ? 'back' : 'tilt'; bPose = kind === 'preen' ? 'preen' : 'left';
  } else if (t >= 16000 && t < 20000) {
    phase = 'retreat'; amount = .85 * (1 - smooth((t - 16000) / 4000));
    if (kind === 'quarrel') amount = .55 * (1 - smooth((t - 16000) / 4000));
    aPose = 'left'; bPose = 'right';
  } else if (t >= 20000) { phase = 'settle'; aPose = 'preen'; bPose = 'rest'; }
  // Response shifts interpolate over 500ms rather than teleporting hit targets.
  if (t >= 13000 && t < 13500) amount = 1 - (1 - amount) * smooth((t - 13000) / 500);
  if (reverse && ['notice', 'preen', 'nudge', 'quarrel', 'response', 'settle'].includes(phase)) {
    const flip = p => p === 'left' ? 'right' : p === 'right' ? 'left' : p;
    [aPose, bPose] = [flip(bPose), flip(aPose)];
  }
  const depth = Math.min(4, Math.max(0, pair.depth || 0)) * amount * (reverse ? -1 : 1);
  // Two short, staggered hops during approach and retreat; zero velocity at ends.
  const hopAt = offset => {
    const base = phase === 'approach' ? 4000 : phase === 'retreat' ? 16000 : -10000;
    const local = t - base - offset;
    for (const start of [550, 2050]) if (local >= start && local <= start + 420) return -Math.min(3, Math.max(0, pair.hop || 0)) * Math.sin(Math.PI * (local - start) / 420) ** 2;
    return 0;
  };
  const action = (id, x, y, pose, offset) => ({ id, x, y, pose, hop: hopAt(offset), scale: 1 + y * .003 });
  return { kind, phase, a: action(pair.a, pair.travel * amount, depth, aPose, reverse ? 220 : 0), b: action(pair.b, -pair.travel * amount, -depth, bPose, reverse ? 0 : 220) };
}

export function movedGardenRect(rect, x) { return shifted(rect, x); }
