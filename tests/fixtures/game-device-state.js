import { GAME_DEVICE_CHOICE_KEY } from '../../src/game-environment.js';

// Existing regression suites exercise the unchanged game after the real user
// choice to continue on an unsupported device. First-visit policy tests override
// this with an empty storage state and test the announcement itself.
export function gameDeviceTestState() {
  const origin = new URL(process.env.PUBLIC_URL || 'http://127.0.0.1:4173/').origin;
  return { cookies: [], origins: [{ origin, localStorage: [{ name: GAME_DEVICE_CHOICE_KEY, value: 'continue' }] }] };
}
