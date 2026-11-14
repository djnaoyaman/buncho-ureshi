// One-shot, same-tab handoff across the separate game/site documents.
// Never touches game saves or the persisted studio composition.
const MAX_CHARS = 16000;
const MAX_AGE = 5 * 60 * 1000;
const key = base => `buncho-studio-transfer:${base}`;
export function stageStudioTransfer(storage, base, seed, now = Date.now()) {
  try {
    if (!seed || typeof seed !== 'object' || Array.isArray(seed)) return false;
    const value = JSON.stringify({ seed, at: now });
    if (value.length > MAX_CHARS) return false;
    storage.setItem(key(base), value);
    return storage.getItem(key(base)) === value;
  } catch { return false; }
}
export function takeStudioTransfer(storage, base, now = Date.now()) {
  try {
    const raw = storage.getItem(key(base));
    storage.removeItem(key(base));
    if (!raw || raw.length > MAX_CHARS) return null;
    const value = JSON.parse(raw);
    if (!Number.isFinite(value.at) || now < value.at || now - value.at > MAX_AGE || !value.seed || typeof value.seed !== 'object' || Array.isArray(value.seed)) return null;
    return value.seed;
  } catch { return null; }
}
