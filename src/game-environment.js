// Presentation preferences are deliberately separate from every saved world.
export const GAME_DEVICE_CHOICE_KEY = 'buncho-game-device-choice-v1';
export const GAME_VIEW_EVENT = 'buncho-game-view-visibility';

export function supportsGameDevice(win) {
  const nav = win.navigator || {}, ua = nav.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  if (/Android/i.test(ua) && (nav.maxTouchPoints > 0 || /Mobile|Tablet/i.test(ua))) return true;
  if (/Mac/i.test(`${ua} ${nav.platform || ''}`) && nav.maxTouchPoints > 1) return true;
  // Touch laptops and large/small desktop windows are not silently locked.
  return nav.userAgentData?.mobile === true;
}

export function portraitGameDevice(win) {
  // The keyboard changes the visual/layout viewport, not the physical direction.
  const type = win.screen?.orientation?.type;
  if (/^(portrait|landscape)-/.test(type || '')) return type.startsWith('portrait');
  if (typeof win.orientation === 'number') return Math.abs(win.orientation) !== 90;
  const screen = win.screen;
  if (screen?.width > 0 && screen?.height > 0) return screen.height >= screen.width;
  return !win.matchMedia?.('(orientation: landscape)').matches;
}

/** Mount the game once, after the announcement. Rotation never destroys drafts,
 * closes existing game dialogs, replaces the world, or writes a game preference. */
export function mountGameEnvironment(root, { start, exitURL } = {}) {
  const doc = root.ownerDocument, win = doc.defaultView, body = doc.body;
  const supported = supportsGameDevice(win);
  const priorDevice = body.getAttribute('data-game-device');
  const priorBlocked = body.getAttribute('data-game-view-blocked');
  let alive = true, started = false, cleanup = null, accepted = false, blocked = false, returnFocus = null;
  try { accepted = win.localStorage.getItem(GAME_DEVICE_CHOICE_KEY) === 'continue'; } catch { /* Continue still works without preference storage. */ }
  body.dataset.gameDevice = supported ? 'touch' : 'other';
  const notice = doc.createElement('dialog');
  notice.className = 'game-environment-notice';
  notice.setAttribute('aria-labelledby', 'game-environment-title');
  notice.setAttribute('aria-describedby', 'game-environment-description');
  notice.innerHTML = '<div class="game-environment-card"><p class="game-environment-kicker">おもちの文鳥ぐらし</p><h2 id="game-environment-title" tabindex="-1"></h2><p id="game-environment-description"></p><label class="game-environment-remember"><input type="checkbox" data-game-device-remember>このブラウザでは次回から案内を省略する</label><div class="game-environment-actions"><button type="button" data-game-device-continue>このまま遊ぶ</button><a data-game-device-exit>文鳥図鑑へ戻る</a></div></div>';
  const title = notice.querySelector('h2'), description = notice.querySelector('#game-environment-description');
  const remember = notice.querySelector('.game-environment-remember');
  const continueButton = notice.querySelector('[data-game-device-continue]');
  notice.querySelector('a').href = exitURL;
  body.append(notice);
  const review = !supported ? doc.createElement('button') : null;
  if (review) {
    review.type = 'button'; review.textContent = '対応端末の案内';
    review.setAttribute('data-game-device-review', '');
    review.addEventListener('click', reviewChoice);
  }
  let reviewFocused = false;
  function placeReview() {
    const settings = started && root.querySelector('.game-settings');
    if (review && settings) { settings.append(review); if (reviewFocused) review.focus({ preventScroll: true }); }
    reviewFocused = false;
  }
  const beforeRender = () => { reviewFocused = !!review && doc.activeElement === review; review?.remove(); };
  doc.addEventListener('buncho-game-panel', placeReview);
  doc.addEventListener('buncho-game-will-render', beforeRender);
  function setBlocked(next) {
    if (blocked === next) return;
    blocked = next;
    if (next) body.dataset.gameViewBlocked = notice.dataset.reason;
    else body.removeAttribute('data-game-view-blocked');
    doc.dispatchEvent(new win.CustomEvent(GAME_VIEW_EVENT, { detail: { blocked: next } }));
  }
  function refresh() {
    if (!alive || !root.isConnected) return;
    const reason = !supported && !accepted ? 'device' : supported && !portraitGameDevice(win) ? 'orientation' : '';
    if (reason) {
      const changed = notice.dataset.reason !== reason;
      notice.dataset.reason = reason;
      title.textContent = reason === 'device' ? 'スマートフォン・タブレットで遊んでね' : '端末を縦に戻してください';
      description.textContent = reason === 'device'
        ? '「おもちの文鳥ぐらし」は、スマートフォン・タブレットの縦向きに合わせたゲームです。この環境は対応対象外ですが、「このまま遊ぶ」から続けられます。'
        : 'このゲームは縦向きで遊べます。端末を縦に戻すと、開いていた画面に戻ります。';
      remember.hidden = continueButton.hidden = reason !== 'device';
      setBlocked(true);
      if (!notice.open) {
        if (started && doc.activeElement !== body) returnFocus = { node: doc.activeElement, id: doc.activeElement?.id };
        notice.showModal(); title.focus();
      }
      else if (changed) title.focus();
      return;
    }
    if (notice.open) {
      notice.close();
      const target = returnFocus?.node?.isConnected ? returnFocus.node : returnFocus?.id ? doc.getElementById(returnFocus.id) : null;
      if (target?.isConnected && target.getClientRects().length) target.focus();
      else if (returnFocus) (root.querySelector('.game-panel-overlay[open] [data-game-close-panel]') || doc.querySelector('.game-scene-controls-toggle'))?.focus();
      returnFocus = null;
    }
    delete notice.dataset.reason;
    setBlocked(false);
    if (!started) { started = true; cleanup = start?.(); }
    placeReview();
  }
  function proceed() {
    if (!alive || notice.dataset.reason !== 'device') return;
    accepted = true;
    if (notice.querySelector('input').checked) {
      try { win.localStorage.setItem(GAME_DEVICE_CHOICE_KEY, 'continue'); } catch { /* No save or reset fallback. */ }
    }
    refresh();
  }
  function reviewChoice() {
    if (!alive) return;
    accepted = false; notice.querySelector('input').checked = false;
    try { win.localStorage.removeItem(GAME_DEVICE_CHOICE_KEY); } catch { /* Only this notice preference. */ }
    const menu = doc.querySelector('#menu'); if (menu) menu.hidden = true;
    doc.querySelector('#menu-toggle')?.setAttribute('aria-expanded', 'false');
    refresh();
  }
  const cancel = event => event.preventDefault();
  continueButton.addEventListener('click', proceed);
  notice.addEventListener('cancel', cancel);
  win.addEventListener('resize', refresh);
  win.addEventListener('orientationchange', refresh);
  win.screen?.orientation?.addEventListener?.('change', refresh);
  refresh();
  return () => {
    alive = false;
    win.removeEventListener('resize', refresh);
    win.removeEventListener('orientationchange', refresh);
    win.screen?.orientation?.removeEventListener?.('change', refresh);
    continueButton.removeEventListener('click', proceed);
    notice.removeEventListener('cancel', cancel);
    review?.removeEventListener('click', reviewChoice); review?.remove();
    doc.removeEventListener('buncho-game-panel', placeReview);
    doc.removeEventListener('buncho-game-will-render', beforeRender);
    if (notice.open) notice.close();
    setBlocked(false);
    notice.remove();
    if (priorDevice === null) body.removeAttribute('data-game-device'); else body.setAttribute('data-game-device', priorDevice);
    if (priorBlocked === null) body.removeAttribute('data-game-view-blocked'); else body.setAttribute('data-game-view-blocked', priorBlocked);
    if (typeof cleanup === 'function') cleanup();
  };
}
