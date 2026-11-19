import { GARDEN_MOTION_TERRAIN } from './data/garden-motion-terrain.js';
import { presentationSeed } from './bird-poses.js';

export const TERRAIN_PERIOD = 26000;
export const terrainFor = id => GARDEN_MOTION_TERRAIN[id] || null;
export function inside(point, polygon) {
  let found = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [x, y] = polygon[i], [a, b] = polygon[j];
    if ((y > point[1]) !== (b > point[1]) && point[0] < (a - x) * (point[1] - y) / (b - y) + x) found = !found;
  }
  return found;
}
const overlaps = (a, b, gap = 5) => a.left < b.right + gap && a.right > b.left - gap && a.top < b.bottom + gap && a.bottom > b.top - gap;
const fits = (r, c) => r.left >= c.left + 3 && r.right <= c.right - 3 && r.top >= c.top + 3 && r.bottom <= c.bottom - 3;
export function actorBox(actor, point, plane, lift = 0, flight = false) {
  const x = plane.left + point[0] * plane.width, y = plane.top + point[1] * plane.height - lift;
  const width = flight ? actor.width * 1.54 : Math.max(actor.width, actor.labelWidth);
  return { left: x - width * .54, right: x + width * .46, top: y - actor.height * (flight ? 1.08 : .975), bottom: y + actor.height * .025 + actor.labelHeight };
}
/** Ground the actual roster, never the reference cast. All-or-nothing: do not
 * push a neighbour off its surface to make an animation possible. */
export function terrainLayout(id, actors, plane, clip, obstacles = []) {
  const terrain = terrainFor(id);
  if (!terrain || !actors.length || actors.length > 6 || !plane?.width || !plane?.height || !clip) return null;
  const polygon = terrain.surfaces[terrain.primary];
  const lo = Math.max(Math.min(...polygon.map(p => p[0])) * plane.width + plane.left, clip.left + 4);
  const hi = Math.min(Math.max(...polygon.map(p => p[0])) * plane.width + plane.left, clip.right - 4);
  const room = (hi - lo) / actors.length - 10;
  if (room < 44) return null;
  const sorted = [...actors].sort((a, b) => a.point[0] - b.point[0] || a.point[1] - b.point[1] || a.id.localeCompare(b.id));
  const result = sorted.map((a, i) => {
    const width = Math.min(a.width, room), height = a.height * width / a.width;
    const x = (lo + (hi - lo) * (i + .5) / sorted.length - plane.left) / plane.width;
    const ys = [];
    for (let y = Math.min(...polygon.map(p => p[1])) + .006; y <= Math.max(...polygon.map(p => p[1])) - .006; y += .002) {
      if (inside([x - .008, y], polygon) && inside([x + .008, y], polygon)) ys.push(y);
    }
    if (!ys.length) return null;
    // Stay away from the painted ledge. This is a terrain projection, not a
    // saved relocation; bird identity and source art remain unchanged.
    const y = ys[Math.floor(ys.length / 2)];
    return { ...a, width, height, point: [x, y] };
  });
  if (result.some(a => !a)) return null;
  const boxes = result.map(a => actorBox(a, a.point, plane));
  if (boxes.some((r, i) => !fits(r, clip) || obstacles.some(o => overlaps(r, o)) || boxes.some((b, j) => i !== j && overlaps(r, b)))) return null;
  return result;
}

/** Every sampled route includes the complete button/label and the wider wing
 * envelope. The planner never consumes game RNG or changes its input. */
export function terrainPlan(id, actors, plane, clip, obstacles = [], cycle = 0) {
  const terrain = terrainFor(id);
  if (!terrain || !actors?.length) return null;
  const order = [...actors].filter(a => a.movable).sort((a, b) => presentationSeed(a.id + ':' + cycle) - presentationSeed(b.id + ':' + cycle));
  for (const a of order) {
    const from = a.point, surface = Object.values(terrain.surfaces).find(p => inside(from, p));
    if (!surface) continue;
    const options = [];
    if (terrain.flight && a.flight) for (const dx of [-.12, .12, 0]) for (const dy of [0, -.16, .16]) {
      if (!dx && !dy) continue;
      options.push({ to: [from[0] + dx, from[1] + dy], flight: true, lift: Math.min(plane.width * .087, 65) });
    }
    for (const dx of [-18, 18, -8, 8]) options.push({ to: [from[0] + dx / plane.width, from[1] - 4 / plane.height], flight: false, lift: 3 });
    for (const option of options) {
      if (!Object.values(terrain.surfaces).some(p => inside(option.to, p))) continue;
      const others = actors.filter(b => b.id !== a.id).map(b => actorBox(b, b.point, plane));
      let safe = true;
      for (let n = 0; n <= 80 && safe; n++) {
        const t = n / 80, point = from.map((v, i) => v + (option.to[i] - v) * t);
        const lift = option.lift * Math.sin(Math.PI * t), r = actorBox(a, point, plane, lift, option.flight);
        safe = (option.flight || inside(point, surface)) && fits(r, clip) && ![...obstacles, ...others].some(o => overlaps(r, o, 6));
      }
      if (safe) return { id: a.id, from: [...from], ...option };
    }
  }
  return null;
}
export function terrainFrame(plan, elapsed) {
  if (!plan) return null;
  const t = Math.max(0, elapsed % TERRAIN_PERIOD), duration = plan.flight ? 900 : 1800;
  const leg = t >= 14000 ? -1 : 1, begin = leg === 1 ? 4000 : 14000;
  const u = Math.max(0, Math.min(1, (t - begin) / duration));
  const progress = leg === 1 ? u : 1 - u, air = u > 0 && u < 1;
  return { point: plan.from.map((v, i) => v + (plan.to[i] - v) * progress),
    lift: air ? plan.lift * Math.sin(Math.PI * u) : 0,
    wing: plan.flight && air, phase: u, moving: air,
    pose: (plan.to[0] - plan.from[0]) * leg < 0 ? 'left' : 'right' };
}
