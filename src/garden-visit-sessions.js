import { GARDEN_IDS, gardenById } from './data/gardens.js';

// Per-garden encounter sessions. The active garden keeps the
// existing queue/active fields; only inactive gardens are parked here.
const fields = ['scene', 'turn', 'nextTurn', 'nextTick', 'lastGuest', 'guestGardenId'];
const copy = value => value === null ? null : { ...value };

function snapshot(state, gardenId = state.garden.id) {
  return {
    gardenId,
    ...Object.fromEntries(fields.map(key => [key, state.garden[key]])),
    queue: [...state.queue],
    active: copy(state.active),
  };
}

function empty(gardenId) {
  return {
    gardenId, scene: gardenById(gardenId).scene,
    turn: 0, nextTurn: 1, nextTick: 0,
    lastGuest: null, guestGardenId: null, queue: [], active: null,
  };
}

function restore(state, session) {
  for (const key of fields) state.garden[key] = session[key];
  state.queue = [...session.queue];
  state.active = copy(session.active);
}

/** Call only after the old schema validates, as part of its explicit upgrade.
 * Legacy saves can already be in B while a guest is still assigned to A.
 * Keep that exact guest and conversation in A; B starts with its own clock.
 */
export function initializeGardenVisitSessions(state) {
  if (Object.hasOwn(state, 'gardenSessions')) return false;
  state.gardenSessions = [];
  const origin = state.garden.guestGardenId;
  if (origin !== null && origin !== state.garden.id) {
    const pending = snapshot(state, origin);
    // The old schema lost the origin's selected scene when the user left it.
    // Restore its standard scene, never invent a new encounter or rewind a step.
    pending.scene = gardenById(origin).scene;
    state.gardenSessions.push(pending);
    const destination = empty(state.garden.id);
    destination.scene = state.garden.scene;
    restore(state, destination);
  }
  return true;
}

/** Switches the projection only. Caller validates, increments visits/revision,
 * and controls open/closed state in the same existing transaction.
 */
export function switchGardenVisitSession(state, gardenId) {
  if (!GARDEN_IDS.includes(gardenId)) return false;
  if (gardenId === state.garden.id) return false;
  if (!Array.isArray(state.gardenSessions)) throw new Error('Upgrade garden visits before switching.');
  const next = state.gardenSessions.find(session => session.gardenId === gardenId) || empty(gardenId);
  const remaining = state.gardenSessions.filter(session => session.gardenId !== gardenId);
  remaining.push(snapshot(state));
  state.gardenSessions = remaining;
  restore(state, next);
  state.garden.id = gardenId;
  return true;
}

/** Read-only location lookup lets invitations and the notebook respect a guest
 * waiting in another garden, rather than duplicating or discarding that guest.
 */
export function pendingGardenGuestLocation(state, guestId) {
  if (state.queue.includes(guestId) || state.active?.id === guestId) return state.garden.guestGardenId;
  return state.gardenSessions?.find(session => session.queue.includes(guestId) || session.active?.id === guestId)?.gardenId || null;
}

/** Only completed lingerers may move after a new arrival or explicit invitation.
 * Pending scripts and discovery/friendship records are never touched here.
 */
export function clearCompletedGardenGuest(state, guestId) {
  if (state.garden.lastGuest === guestId) state.garden.lastGuest = null;
  for (const session of state.gardenSessions || []) {
    if (session.lastGuest === guestId) session.lastGuest = null;
  }
}

export function gardenVisitSessionFields() {
  return ['gardenId', ...fields, 'queue', 'active'];
}
