// Safari 15 (including iPhone 7) has no container query length units.
// Keep the same artwork/foot geometry using measured CSS pixels, without
// reading or modifying the player's save. Modern browsers retain native units.
export const SCENE_CONTAINERS = '.game-main,.finch-garden-stage,.game-home-preview-viewport,.expedition-keepsake-art,.caretaker-recruitment-sign';
function measure(node) {
    const win=node.ownerDocument.defaultView;
    const rect = node.getBoundingClientRect(), css = win.getComputedStyle(node);
    const n = key => parseFloat(css[key]) || 0;
    const width = rect.width - n('borderLeftWidth') - n('borderRightWidth') - n('paddingLeft') - n('paddingRight');
    const height = rect.height - n('borderTopWidth') - n('borderBottomWidth') - n('paddingTop') - n('paddingBottom');
    // Hidden dialogs are measured by ResizeObserver when opened, not as 0px.
    if (width > 0) node.style.setProperty('--game-cqw', `${width / 100}px`);
    if (height > 0) node.style.setProperty('--game-cqh', `${height / 100}px`);
  }
// Media readiness must not precede compatibility geometry on a fresh redraw.
export function syncSceneUnits(node) {
  if(!node)return;
  const win=node.ownerDocument.defaultView;
  if(win.CSS?.supports?.('width','1cqw')&&win.CSS?.supports?.('height','1cqh'))return;
  measure(node);
}
export function mountSceneUnits(root) {
  const doc = root.ownerDocument, win = doc.defaultView;
  if (win.CSS?.supports?.('width', '1cqw') && win.CSS?.supports?.('height', '1cqh')) return () => {};
  const scope = doc.body, tracked = new Map();
  let alive = true, frame = 0;
  function restore(node, previous) {
    for (const [key, value] of previous) {
      if (value) node.style.setProperty(key, value); else node.style.removeProperty(key);
    }
  }
  const resize = win.ResizeObserver ? new win.ResizeObserver(entries => {
    if (alive) for (const entry of entries) measure(entry.target);
  }) : null;
  function refresh() {
    frame = 0;
    if (!alive) return;
    for (const [node, previous] of tracked) if (!scope.contains(node)) {
      resize?.unobserve(node); restore(node, previous); tracked.delete(node);
    }
    for (const node of scope.querySelectorAll(SCENE_CONTAINERS)) {
      if (!tracked.has(node)) {
        tracked.set(node, ['--game-cqw', '--game-cqh'].map(key => [key, node.style.getPropertyValue(key)]));
        resize?.observe(node);
      }
      measure(node);
    }
  }
  function schedule() { if (alive && !frame) frame = win.requestAnimationFrame(refresh); }
  // Only child changes: setting measured styles must not retrigger observation.
  const mutations = new win.MutationObserver(schedule);
  mutations.observe(scope, { childList: true, subtree: true });
  win.addEventListener('resize', schedule);
  win.addEventListener('pageshow', schedule);
  win.visualViewport?.addEventListener('resize', schedule);
  doc.addEventListener('buncho-game-panel', schedule);
  refresh();
  return () => {
    alive = false;
    if (frame) win.cancelAnimationFrame(frame);
    mutations.disconnect(); resize?.disconnect();
    win.removeEventListener('resize', schedule); win.removeEventListener('pageshow', schedule);
    win.visualViewport?.removeEventListener('resize', schedule);
    doc.removeEventListener('buncho-game-panel', schedule);
    for (const [node, previous] of tracked) restore(node, previous);
    tracked.clear();
  };
}
