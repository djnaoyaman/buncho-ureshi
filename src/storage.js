export function readLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw.length > 200000) return fallback;
    const value = JSON.parse(raw);
    if (Array.isArray(fallback)) return Array.isArray(value) ? value : fallback;
    if (fallback && typeof fallback === "object")
      return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : fallback;
    return typeof value === typeof fallback ? value : fallback;
  } catch {
    return fallback;
  }
}
export function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
