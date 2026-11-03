// Move the complete photographic plate, never zoom or clip the bird inside it.
export function photoDrift(center, viewport, limit = 8) {
  if (!Number.isFinite(center) || !Number.isFinite(viewport) || viewport <= 0) return 0;
  return Math.max(-limit, Math.min(limit, (viewport / 2 - center) / viewport * limit * 2));
}
export function bindEditorialParallax(grid, { enabled = true } = {}) {
  if (!grid) return () => {};
  const win = grid.ownerDocument.defaultView, doc = grid.ownerDocument;
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const visible = new Set(), offsets = new Map();
  let raf = 0, disposed = false;
  const allowed = () => enabled && !reduced.matches && !doc.hidden;
  const reset = () => { for (const frame of offsets.keys()) frame.style.removeProperty('--photo-drift'); offsets.clear(); delete grid.dataset.photoParallax; };
  const paint = () => {
    raf = 0;
    if (disposed || !allowed()) { reset(); return; }
    grid.dataset.photoParallax = 'on';
    // Read every rectangle before writing any transforms, to avoid layout thrash.
    const changes = [...visible].filter(f => f.isConnected).map(frame => {
      const rect = frame.getBoundingClientRect();
      const center = rect.top - (offsets.get(frame) || 0) + rect.height / 2;
      return [frame, photoDrift(center, win.innerHeight)];
    });
    for (const [frame, offset] of changes) { offsets.set(frame, offset); frame.style.setProperty('--photo-drift', `${offset.toFixed(2)}px`); }
  };
  const schedule = () => { if (disposed || raf) return; if (!allowed()) { reset(); return; } raf = win.requestAnimationFrame(paint); };
  // Older browsers retain a static, fully visible photo instead of a scroll loop.
  if (!win.IntersectionObserver || !win.MutationObserver) return () => {};
  const observer = new win.IntersectionObserver(entries => {
    for (const entry of entries) entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target);
    schedule();
  }, { rootMargin: '80px' });
  const refresh = () => {
    observer.disconnect(); visible.clear(); reset();
    for (const frame of grid.querySelectorAll('.article-cover-frame')) observer.observe(frame);
    schedule();
  };
  const mutation = new win.MutationObserver(refresh);
  mutation.observe(grid, { childList: true });
  win.addEventListener('scroll', schedule, { passive: true });
  win.addEventListener('resize', schedule, { passive: true });
  doc.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', schedule);
  refresh();
  return () => {
    disposed = true; if (raf) win.cancelAnimationFrame(raf);
    observer.disconnect(); mutation.disconnect(); visible.clear(); reset();
    win.removeEventListener('scroll', schedule); win.removeEventListener('resize', schedule);
    doc.removeEventListener('visibilitychange', schedule); reduced.removeEventListener('change', schedule);
  };
}
