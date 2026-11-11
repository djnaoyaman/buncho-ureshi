import {syncRelaxedCare,applyRelaxedCare,reconcileRelaxedCare} from './care-rules.js';
/** Real-JST care opportunities, deliberately independent of the fast story clock.
 * Call only inside the existing fresh-state transaction; persist changes/revision there.
 * No schema version, Gem balance, family, story PRNG or encounter writes in this module.
 */
const HOUR = 3600000, DAY = 24 * HOUR, JST = 9 * HOUR;
const MAX_TIME = 253402268399999; // Last millisecond of year 9999 in JST.
export const HOLIDAY_CALENDAR = Object.freeze({
  source: 'https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html',
  checkedAt: '2026-11-02', firstYear: 2026, lastYear: 2027,
  // All dates listed by Cabinet Office, including substitute and citizens' holidays.
  dates: Object.freeze([
    '2026-01-01','2026-01-12','2026-02-11','2026-02-23','2026-03-20','2026-04-29',
    '2026-05-03','2026-05-04','2026-05-05','2026-05-06','2026-07-20','2026-08-11',
    '2026-09-21','2026-09-22','2026-09-23','2026-10-12','2026-11-03','2026-11-23',
    '2027-01-01','2027-01-11','2027-02-11','2027-02-23','2027-03-21','2027-03-22',
    '2027-04-29','2027-05-03','2027-05-04','2027-05-05','2027-07-19','2027-08-11',
    '2027-09-20','2027-09-23','2027-10-11','2027-11-03','2027-11-23'
  ])
});
const holidays = new Set(HOLIDAY_CALENDAR.dates);
const validTime = n => Number.isSafeInteger(n) && n >= 0 && n <= MAX_TIME;
function time(n) { if (!validTime(n)) throw new Error('端末の日時を確認してください。'); return n; }
function dateInfo(now) {
  const d = new Date(time(now) + JST), year = d.getUTCFullYear();
  const date = d.toISOString().slice(0, 10), weekday = d.getUTCDay();
  return {date, year, weekend: weekday === 0 || weekday === 6,
    holiday: year >= HOLIDAY_CALENDAR.firstYear && year <= HOLIDAY_CALENDAR.lastYear ? holidays.has(date) : null};
}
export function careDay(now) {
  const info = dateInfo(now);
  return {...info, hours: info.weekend || info.holiday === true ? [7, 12, 17, 20] : [7, 17, 20], holidayCoverageKnown: info.holiday !== null};
}
/** latest boundary includes yesterday's 20:00 before 07:00; all values are UTC ms. */
export function careWindow(now) {
  time(now);
  const midnight = Math.floor((now + JST) / DAY) * DAY - JST;
  const today = careDay(now);
  const boundaries = today.hours.map(hour => midnight + hour * HOUR);
  const at = boundaries.filter(t => t <= now).at(-1) ?? midnight - 4 * HOUR;
  const nextAt = boundaries.find(t => t > now) ?? midnight + DAY + 7 * HOUR;
  return {at, nextAt, date: today.date, holidayCoverageKnown: today.holidayCoverageKnown,
    coverageMessage: today.holidayCoverageKnown ? '' : 'この年の祝日データは未収録です。12時のお世話は土日のみ対応しています。'};
}
export function validateCareSchedule(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== 2 || !['seenAt','windowAt'].every(key => {
        const d = Object.getOwnPropertyDescriptor(value, key); return d && 'value' in d && (key === 'seenAt' ? validTime(d.value) : Number.isSafeInteger(d.value) && d.value >= -DAY && d.value <= MAX_TIME);
      }) || value.windowAt > value.seenAt || careWindow(Math.max(0, value.windowAt)).at !== value.windowAt)
    throw new Error('お世話の時刻が不正です。');
  return value;
}
/** Pure additive initialization. Keep every existing stat, setting and balance intact. */
export function initializeCareSchedule(world, now) {
  time(now);
  if (world.careSchedule !== undefined) { validateCareSchedule(world.careSchedule); return false; }
  world.careSchedule = {seenAt: now, windowAt: careWindow(now).at};
  return true;
}
const careable = b => b.home !== 'departed' && ['juvenile','adult'].includes(b.stage);
const renew = n => Math.min(n, Math.max(40, n - 40));
/** Returns changed metadata even if no bird needs renewal: caller MUST persist it.
 * Pause stops story simulation, not real care slots. Long absence opens one slot only.
 */
export function syncCareSchedule(world, now) {
  time(now);
  if(world.careRules)return syncRelaxedCare(world,now);
  if (world.careSchedule === undefined) return {changed: initializeCareSchedule(world, now), renewed: false, rollback: false};
  validateCareSchedule(world.careSchedule);
  const state = world.careSchedule;
  if (now < state.seenAt) return {changed: false, renewed: false, rollback: true};
  const windowAt = careWindow(now).at, renewed = windowAt > state.windowAt;
  const changed = now !== state.seenAt || renewed;
  if (renewed) {
    for (const bird of world.birds.filter(careable)) {
      bird.needs.food = renew(bird.needs.food);
      bird.needs.energy = renew(bird.needs.energy);
    }
    state.windowAt = windowAt;
  }
  state.seenAt = now;
  return {changed, renewed, rollback: false};
}
/** Mutates just the requested bar; caller owns messages/actions/memories/rewards/revision.
 * Name/pet/talk share ONE energy pool, not three separately farmable cooldowns.
 */
export function applyScheduledCare(world, birdId, kind, now, text = '') {
  if (!['feed','name','pet','talk'].includes(kind)) throw new Error('お世話の種類が不正です。');
  const bird = world.birds.find(b => b.id === birdId);
  if (!bird || !careable(bird)) return {changed:false, reason:'unavailable', gemAward:0};
  if(world.careRules)return applyRelaxedCare(world,bird,kind,now,text);
  const sync = syncCareSchedule(world, now);
  const stat = kind === 'feed' ? 'food' : 'energy', before = bird.needs[stat];
  const nextAt = careWindow(world.careSchedule.seenAt).nextAt;
  if (kind === 'talk' && !String(text).trim()) return {changed:false, scheduleChanged:sync.changed, reason:'empty', gemAward:0, before, after:before, nextAt};
  if (before >= 100) return {changed:false, scheduleChanged:sync.changed, reason:'full', gemAward:0, before, after:before, nextAt};
  const after = Math.min(100, before + 20);
  bird.needs[stat] = after;
  return {changed:true, scheduleChanged:sync.changed, reason:'success', before, after, nextAt, gemAward:kind === 'feed' ? 6 : 5};
}
/** Same-world stale import must not reopen already-completed care. Whole-world restore
 * still restores its own Gem balance, never add rewards here. Different-world imports
 * are intentional replacement; device-wide/server anti-cheat is not claimed.
 */
export function reconcileImportedCare(incoming, current, now) {
  time(now);
  if(incoming.careRules&&current.careRules)return reconcileRelaxedCare(incoming,current,now);
  const same = incoming.worldId === current.worldId;
  const local = current.careSchedule ? validateCareSchedule(current.careSchedule) : null;
  const imported = incoming.careSchedule ? validateCareSchedule(incoming.careSchedule) : null;
  const effective = Math.max(now, imported?.seenAt ?? now, same ? local?.seenAt ?? now : now);
  const result = syncCareSchedule(incoming, effective);
  if (same && local) {
    // Compare both worlds at the same real slot without mutating persisted current.
    const snapshot = {birds:current.birds.map(b=>({...b,needs:{...b.needs}})), careSchedule:{...local}};
    syncCareSchedule(snapshot, effective);
    for (const b of incoming.birds) {
      const previous = snapshot.birds.find(x=>x.id===b.id);
      if (previous && careable(previous) && careable(b)) {
        b.needs.food = Math.max(b.needs.food, previous.needs.food);
        b.needs.energy = Math.max(b.needs.energy, previous.needs.energy);
      }
    }
  }
  return result;
}
/** Existing false means OFF (legacy choice/default indistinguishable: favor consent). */
export function careSoundDefault(value) { return value === false ? false : true; }
export function visitorCapacity(world) {
  const count = world.birds.filter(b=>b.home === 'visitor').length + (world.encounters?.cageVisitors?.length || 0);
  return {count, available:Math.max(0,6-count), canInvite:count < 6};
}
/** Compatibility repair only after full schema validation by the writer. Keep oldest
 * six invitations; overflow remains known birds, accessible through park/friend views.
 */
export function moveOverflowVisitorsToPark(world) {
  const guests = world.birds.filter(b=>b.home === 'visitor').sort((a,b)=>a.arrivedTick-b.arrivedTick || a.id.localeCompare(b.id));
  const moved = guests.slice(6);
  for (const b of moved) b.home = 'departed';
  return moved.map(b=>b.id);
}
