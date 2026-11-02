/** Original, brief synthetic game chirp. Never a recording or a real bird voice.
 * No context is created until unlockFromGesture() is explicitly invoked.
 */
export function createCareAudio({ Context = globalThis.AudioContext || globalThis.webkitAudioContext } = {}) {
  let enabled = false, disposed = false, context = null, generation = 0;
  let ready = Promise.resolve(false);
  const active = new Set();
  function stopNodes() {
    for (const entry of active) {
      try { entry.gain.gain.cancelScheduledValues(context?.currentTime || 0); entry.gain.gain.setValueAtTime(0, context?.currentTime || 0); } catch {}
      try { entry.osc.stop(); } catch {}
      try { entry.osc.disconnect(); entry.gain.disconnect(); } catch {}
    }
    active.clear();
  }
  function cancel() { generation++; ready = Promise.resolve(false); stopNodes(); }
  function setEnabled(value) {
    const next = value === true && !disposed;
    if (!next) cancel();
    enabled = next;
  }
  function unlockFromGesture() {
    if (!enabled || disposed || typeof Context !== 'function') return Promise.resolve(false);
    const token = generation;
    try {
      if (!context) context = new Context();
      const resumed = context.state === 'running' ? undefined : context.resume();
      ready = Promise.resolve(resumed).then(() => enabled && !disposed && token === generation && context.state === 'running', () => false);
    } catch { ready = Promise.resolve(false); }
    return ready;
  }
  async function chirp(isCurrent = () => true) {
    const token = generation, activation = ready;
    if (!enabled || disposed || !context || !isCurrent()) return false;
    if (!(await activation) || !enabled || disposed || token !== generation || context.state !== 'running' || !isCurrent()) return false;
    // Two soft upward notes, under 0.3 seconds in total; no ongoing scheduler.
    try {
      const start = context.currentTime + 0.005;
      for (const [offset, low, high] of [[0, 1300, 1900], [.13, 1650, 2250]]) {
        const osc = context.createOscillator(), gain = context.createGain();
        const entry = { osc, gain }; active.add(entry);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(low, start + offset);
        osc.frequency.exponentialRampToValueAtTime(high, start + offset + .07);
        gain.gain.setValueAtTime(0, start + offset);
        gain.gain.linearRampToValueAtTime(.035, start + offset + .012);
        gain.gain.exponentialRampToValueAtTime(.0001, start + offset + .10);
        osc.connect(gain); gain.connect(context.destination);
        osc.onended = () => { active.delete(entry); try { osc.disconnect(); gain.disconnect(); } catch {} };
        osc.start(start + offset); osc.stop(start + offset + .11);
      }
      return true;
    } catch { stopNodes(); return false; }
  }
  function close() {
    if (disposed) return;
    disposed = true; enabled = false; cancel();
    try { const closing = context?.close(); closing?.catch?.(() => {}); } catch {}
    context = null;
  }
  return { setEnabled, unlockFromGesture, chirp, cancel, close };
}
