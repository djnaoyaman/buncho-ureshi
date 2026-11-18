// Explicit allowlists prevent saved names, free text and identifiers being sent.
const events = new Set(['content_view','navigation_select','game_start','game_panel_view','game_care','game_gacha','game_travel','game_decorate','game_friend_invite','studio_open','studio_edit_start','studio_material_add','studio_export','studio_download','studio_share','garden_active_time','garden_predator_arrival','garden_first_predator','garden_predator_outcome']);
const keys = new Set(['site_area','content_type','destination','panel','action','machine','tier','material_type','format','source']);
// Fail closed in local previews, automation and explicitly opted-out QA sessions.
export function measurementAllowed(win = window) {
  try {
    const u = new URL(win.location.href);
    if (['qa', 'test', 'debug', 'analytics'].some(k => u.searchParams.has(k))) {
      win.sessionStorage.setItem('buncho.analytics.qa', '1');
      return false;
    }
    return u.protocol === 'https:' && u.hostname === 'djnaoyaman.github.io'
      && u.pathname.startsWith('/buncho-ureshi/') && !win.navigator?.webdriver
      && win.sessionStorage?.getItem('buncho.analytics.qa') !== '1'
      && win.localStorage.getItem('buncho.analytics.disabled') !== '1';
  } catch { return false; }
}
const predatorEnums = {
  predator_kind: ['crow','raptor'], encounter_safety: ['safe','danger'],
  outcome: ['home','stay','friendly','ended'], measurement_scope: ['page'],
};
const numericKeys = new Set(['active_seconds','milestone_seconds']);
export function trackEvent(name, params = {}) {
  try {
    if (!events.has(name) || typeof window === 'undefined' || !measurementAllowed(window)) return;
    const predator = name.startsWith('garden_');
    if (predator && window.location.pathname !== '/buncho-ureshi/game/') return;
    const data = { send_to: 'G-VVFMFGKXNL' };
    for (const [key, value] of Object.entries(params)) {
      if (predator && predatorEnums[key]?.includes(value)) data[key] = value;
      if (predator && key === 'rule_version' && typeof value === 'string' && /^entry_\d+_\d+_threat_\d+_v1$/.test(value)) data[key] = value;
      if (predator && numericKeys.has(key) && Number.isInteger(value) && value >= 0 && value <= 86400) data[key] = value;
      if (keys.has(key) && typeof value === 'string' && /^[a-z0-9_-]{1,40}$/.test(value)) data[key] = value;
    }
    window.dataLayer = window.dataLayer || [];
    const gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    gtag('event', name, data);
  } catch { /* Measurement must never interrupt play or saving. */ }
}
export function trackContentView(route) {
  const area = route === 'game/' ? 'game' : route === 'studio/' ? 'studio' : 'site';
  trackEvent('content_view', { site_area: area, content_type: route.split('/')[0] || 'home' });
}
if (typeof document !== 'undefined') {
  let panel;
  document.addEventListener('buncho-game-panel', event => {
    if (event.detail === panel) return;
    panel = event.detail;
    trackEvent('game_panel_view', { site_area: 'game', panel });
  });
  document.addEventListener('buncho-game-ready', () => { trackEvent('game_start', { site_area: 'game' }); });
  document.addEventListener('click', event => {
    const a = event.target.closest?.('a[href]');
    if (!a) return;
    const url = new URL(a.href, document.baseURI);
    if (url.origin !== location.origin || url.pathname === location.pathname) return;
    const destination = url.pathname.endsWith('/game/') ? 'game' : url.pathname.endsWith('/studio/') ? 'studio' : null;
    if (destination) trackEvent('navigation_select', { site_area: location.pathname.endsWith('/game/') ? 'game' : location.pathname.endsWith('/studio/') ? 'studio' : 'site', destination });
  });
}
