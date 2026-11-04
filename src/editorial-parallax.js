import { editorialPhotoFocus } from './editorial-photo-focus.js';

export function photoDrift(center, viewport, limit = 32, speed = .18) {
  if (!Number.isFinite(center) || !Number.isFinite(viewport) || viewport <= 0) return 0;
  return Math.max(-limit, Math.min(limit, (viewport / 2 - center) * speed));
}

// The rectangle is the conservative extent of the birds visible in the source,
// including heads, tails and feet. Never move it outside the fixed mask.
export function photoMotionPlan(width, height, bounds, target = 32) {
  const still = { scale: 1, x: 0, y: 0, limit: 0, axis: 'static' };
  if (!(width > 0 && height > 0) || !Array.isArray(bounds) || bounds.length !== 4 ||
      bounds.some(v => !Number.isFinite(v) || v < 0 || v > 1) || bounds[0] >= bounds[2] || bounds[1] >= bounds[3]) return still;
  const range = (size, low, high, scale) => {
    const extra = size * (scale - 1) / 2;
    const min = Math.max(-extra, -(size / 2 + (low - .5) * size * scale));
    const max = Math.min(extra, size - (size / 2 + (high - .5) * size * scale));
    return max + .001 >= min ? [min, Math.max(min, max)] : null;
  };
  let horizontal = still, vertical = still;
  for (let step = 1; step <= 24; step++) {
    const scale = 1 + step / 100, x = range(width, bounds[0], bounds[2], scale), y = range(height, bounds[1], bounds[3], scale);
    if (!x || !y) continue;
    const dx = Math.min(target, (x[1] - x[0]) / 2), dy = Math.min(target, (y[1] - y[0]) / 2);
    const base = { scale, x: (x[0] + x[1]) / 2, y: (y[0] + y[1]) / 2 };
    if (dx > horizontal.limit) horizontal = { ...base, limit: dx, axis: 'x' };
    if (dy > vertical.limit) vertical = { ...base, limit: dy, axis: 'y' };
  }
  // Prefer clear vertical depth when safe. Edge-tight portraits pan sideways
  // instead of clipping their feet; photographs tight on both axes stay intact.
  const best = vertical.limit >= 20 || vertical.limit >= horizontal.limit ? vertical : horizontal;
  return best.limit >= 4 ? best : still;
}

export function bindEditorialParallax(grid, { enabled = true } = {}) {
  if (!grid || !enabled) return () => {};
  const doc = grid.ownerDocument, win = doc.defaultView;
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  if (!win.IntersectionObserver || !win.MutationObserver) return () => {};
  const visible = new Set(), images = new Set(), plans = new Map();
  let raf = 0, disposed = false;
  const allowed = () => !reduced.matches && !doc.hidden;
  const reset = () => {
    for (const image of images) {
      for (const key of ['--photo-scale', '--photo-shift-x', '--photo-shift-y', '--photo-pan-limit']) image.style.removeProperty(key);
      delete image.dataset.photoPan;
    }
    plans.clear(); delete grid.dataset.photoParallax;
  };
  const paint = () => {
    raf = 0;
    if (disposed || !allowed()) { reset(); return; }
    const compact = win.innerWidth <= 600;
    const updates = [...visible].filter(mask => mask.isConnected).map(mask => {
      const image = mask.querySelector('img'), rect = mask.getBoundingClientRect();
      const id = image.getAttribute('src').match(/(photo-\d+)\.webp(?:\?|$)/)?.[1];
      let cached = plans.get(mask);
      if (!cached || cached.width !== rect.width || cached.height !== rect.height) {
        cached = { width: rect.width, height: rect.height, plan: photoMotionPlan(rect.width, rect.height, editorialPhotoFocus[id], compact ? 28 : 32) };
        plans.set(mask, cached);
      }
      const plan = cached.plan, drift = photoDrift(rect.top + rect.height / 2, win.innerHeight, plan.limit, compact ? .16 : .18);
      return { image, plan, x: plan.x + (plan.axis === 'x' ? drift : 0), y: plan.y + (plan.axis === 'y' ? drift : 0) };
    });
    grid.dataset.photoParallax = 'on';
    for (const { image, plan, x, y } of updates) {
      image.dataset.photoPan = plan.axis;
      image.style.setProperty('--photo-scale', String(plan.scale));
      image.style.setProperty('--photo-pan-limit', String(plan.limit));
      image.style.setProperty('--photo-shift-x', `${x.toFixed(3)}px`);
      image.style.setProperty('--photo-shift-y', `${y.toFixed(3)}px`);
    }
  };
  const schedule = () => {
    if (disposed || raf) return;
    if (!allowed()) { reset(); return; }
    raf = win.requestAnimationFrame(paint);
  };
  const observer = new win.IntersectionObserver(entries => {
    for (const entry of entries) entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target);
    schedule();
  }, { rootMargin: '160px' });
  const refresh = () => {
    observer.disconnect(); visible.clear(); reset(); images.clear();
    for (const mask of grid.querySelectorAll('.article-cover-window')) {
      const image = mask.querySelector('img'); if (image) { images.add(image); observer.observe(mask); }
    }
    schedule();
  };
  const resized = () => { plans.clear(); schedule(); };
  const mutation = new win.MutationObserver(refresh);
  mutation.observe(grid, { childList: true });
  win.addEventListener('scroll', schedule, { passive: true });
  win.addEventListener('resize', resized, { passive: true });
  doc.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', schedule);
  refresh();
  return () => {
    disposed = true; if (raf) win.cancelAnimationFrame(raf);
    observer.disconnect(); mutation.disconnect(); visible.clear(); reset(); images.clear();
    win.removeEventListener('scroll', schedule); win.removeEventListener('resize', resized);
    doc.removeEventListener('visibilitychange', schedule); reduced.removeEventListener('change', schedule);
  };
}
