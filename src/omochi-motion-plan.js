// Private, presentation-only prototype. No save, reward, engine or DOM writes.
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = x => x * x * (3 - 2 * x);
const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
export function planMotion({from, to, mode = 'walk', duration = 2400, lift = 100, bounds, margin = 0}) {
  if (!finitePoint(from) || !finitePoint(to) || !['walk', 'flight'].includes(mode) || !Number.isFinite(duration) || duration < 400 || !Number.isFinite(lift) || lift < 0) return null;
  if (!bounds || !['left', 'right', 'top', 'bottom'].every(k => Number.isFinite(bounds[k])) || !Number.isFinite(margin) || margin < 0) return null;
  const inside = p => p.x >= bounds.left + margin && p.x <= bounds.right - margin && p.y >= bounds.top + margin && p.y <= bounds.bottom - margin;
  if (!inside(from) || !inside(to)) return null;
  const safeLift = mode === 'flight' ? Math.min(lift, Math.min(from.y, to.y) - bounds.top - margin) : 0;
  return Object.freeze({from: Object.freeze({...from}), to: Object.freeze({...to}), mode, duration, lift: safeLift});
}
export function sampleMotion(plan, elapsed, {enabled = true, reducedMotion = false} = {}) {
  if (!plan) return null;
  if (!enabled || reducedMotion) return {x: plan.from.x, y: plan.from.y, frame: 1, phase: 'held', done: false};
  const t = clamp(Number.isFinite(elapsed) ? elapsed / plan.duration : 0, 0, 1);
  const airborne = plan.mode === 'flight' ? clamp((t - .12) / .78, 0, 1) : t;
  const travel = smooth(airborne);
  const x = plan.from.x + (plan.to.x - plan.from.x) * travel;
  const y = plan.from.y + (plan.to.y - plan.from.y) * travel - plan.lift * Math.sin(Math.PI * airborne) ** 2;
  let frame = 1, phase = 'idle';
  if (t > 0 && t < 1 && plan.mode === 'walk') {frame = [9, 1, 10, 1][Math.floor(elapsed / 150) % 4]; phase = 'walking-candidate';}
  if (t > 0 && t < 1 && plan.mode === 'flight') {
    if (t < .12) {frame = 17; phase = 'takeoff-preparation';}
    else if (t < .22) {frame = 18; phase = 'takeoff';}
    else if (t < .78) {frame = [19, 20, 21, 22][Math.floor((elapsed - plan.duration * .22) / 110) % 4]; phase = 'flight-candidate';}
    else if (t < .9) {frame = 23; phase = 'landing';}
    else {frame = 24; phase = 'ground-contact';}
  }
  return {x, y, frame, phase, done: t === 1};
}
export function createActiveClock() {
  let last = null, elapsed = 0, wasActive = false;
  return {get elapsed() {return elapsed;}, tick(now, active) {if (last !== null && active && wasActive && Number.isFinite(now) && now >= last) elapsed += Math.min(now - last, 50); last = Number.isFinite(now) ? now : null; wasActive = !!active; return elapsed;}, reset() {last = null; elapsed = 0; wasActive = false;}};
}

