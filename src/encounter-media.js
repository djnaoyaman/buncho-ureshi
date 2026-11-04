/** Presentation-only image loading. No world, storage, random or reward changes. */
export function mountEncounterMedia(root) {
  const win = root.ownerDocument.defaultView;
  let alive = true, observer = null, retained = new Map(), cleanups = [], timers = [];
  const clear = () => { observer?.disconnect(); observer = null; cleanups.splice(0).forEach(fn => fn()); timers.splice(0).forEach(id => win.clearTimeout(id)); };
  function sceneState() {
    const retryButton = root.querySelector(':scope > .finch-media-retry');
    if (retryButton) retryButton.hidden = !root.querySelector('.finch-media[data-media-state=error]');
    const scene = root.querySelector('.finch-garden-stage');
    if (!scene) return;
    const images = [...scene.querySelectorAll('img')];
    const failed = images.some(img => img.dataset.mediaResult === 'error');
    const ready = images.every(img => img.dataset.mediaResult === 'ready');
    scene.dataset.sceneState = failed ? 'error' : ready ? 'ready' : 'loading';
    scene.setAttribute('aria-busy', String(!failed && !ready));
    const status = scene.querySelector('.finch-garden-loading');
    if (!status) return;
    status.hidden = ready;
    status.querySelector('[data-media-label]').textContent = failed ? '庭の絵を読み込めなかったよ。もう一度試してね。' : '小鳥たちが庭を準備しているよ…';
    status.querySelector('[data-media-retry]').hidden = !failed;
  }
  function bind(img) {
    const frame = img.closest('.finch-media');
    let current = true, timeout = null;
    const finish = result => {
      if (!alive || !current || !root.contains(img)) return;
      if (timeout !== null) win.clearTimeout(timeout);
      img.dataset.mediaResult = result;
      if (frame) {
        frame.dataset.mediaState = result;
        const label = frame.querySelector('[data-media-label]');
        if (label) label.textContent = result === 'error' ? '絵を読み込めなかったよ' : '読み込み中…';
      }
      sceneState();
    };
    const loaded = () => {
      if (!img.naturalWidth) return finish('error');
      if (typeof img.decode === 'function') img.decode().then(() => finish('ready'), () => finish('error'));
      else finish('ready');
    };
    const failed = () => finish('error');
    img.addEventListener('load', loaded); img.addEventListener('error', failed);
    cleanups.push(() => { current = false; img.removeEventListener('load', loaded); img.removeEventListener('error', failed); });
    const start = () => {
      if (!current || !alive) return;
      if (!img.getAttribute('src') && img.dataset.mediaSrc) img.src = img.dataset.mediaSrc;
      if (img.dataset.mediaResult === 'error') return finish('error');
      if (frame && img.dataset.mediaResult !== 'ready') { frame.dataset.mediaState = 'pending'; const label = frame.querySelector('[data-media-label]'); if (label) label.textContent = '読み込み中…'; }
      if (img.complete && img.naturalWidth && img.dataset.mediaResult === 'ready') return finish('ready');
      img.dataset.mediaStarted ||= String(Date.now());
      // Absolute deadline survives polling/redraws; navigation never waits for it.
      timeout = win.setTimeout(() => finish('error'), Math.max(0, 20000 - (Date.now() - Number(img.dataset.mediaStarted))));
      timers.push(timeout);
      if (img.complete && img.getAttribute('src')) return img.naturalWidth ? loaded() : failed();
    };
    if (img.dataset.mediaLazy === 'true' && !img.getAttribute('src') && win.IntersectionObserver) observer.observe(img);
    else start();
    img._startEncounterMedia = start;
    cleanups.push(() => { delete img._startEncounterMedia; });
  }
  function refresh() {
    clear();
    if (!alive) return;
    if (win.IntersectionObserver) observer = new win.IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) { observer.unobserve(entry.target); entry.target._startEncounterMedia?.(); }
    }, { root: root.querySelector('.finch-catalog') || root, rootMargin: '120px' });
    for (let img of root.querySelectorAll('img[data-media-src], .finch-garden-stage img')) {
      const key = img.dataset.mediaSrc || img.getAttribute('src');
      const old = retained.get(key)?.shift();
      if (old && old !== img) {
        // Reuse the decoded bytes, never the old discovery/pose/accessibility state.
        const loading = new Set(['src', 'data-media-result', 'data-media-started']);
        for (const attribute of [...old.attributes]) if (!loading.has(attribute.name)) old.removeAttribute(attribute.name);
        for (const attribute of [...img.attributes]) if (!loading.has(attribute.name)) old.setAttribute(attribute.name, attribute.value);
        img.replaceWith(old); img = old;
      }
      bind(img);
    }
    retained.clear();
    sceneState();
  }
  const retry = event => {
    const button = event.target.closest('[data-media-retry]');
    if (!button || !root.contains(button)) return;
    const scene = button.closest('.finch-garden-stage') || root;
    for (const img of scene.querySelectorAll('img')) if (img.dataset.mediaResult === 'error') {
      const src = img.dataset.mediaSrc || img.getAttribute('src');
      delete img.dataset.mediaResult; delete img.dataset.mediaStarted;
      img.removeAttribute('src'); img.src = src;
    }
    refresh();
  };
  root.addEventListener('click', retry);
  return {
    preserve() {
      retained.clear();
      for (const img of root.querySelectorAll('img[data-media-src], .finch-garden-stage img')) {
        const key = img.dataset.mediaSrc || img.getAttribute('src');
        if (!retained.has(key)) retained.set(key, []);
        retained.get(key).push(img);
      }
      clear();
    },
    refresh,
    destroy() { alive = false; clear(); retained.clear(); root.removeEventListener('click', retry); },
  };
}
