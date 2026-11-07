/**
 * Standalone, hand-drawn vector icon set for 暮らしのメニュー.
 * No application source or route behaviour is changed by this module.
 * 32-unit grid · 1.65-unit rounded strokes · no external assets or IDs.
 */
const PAPER = 'var(--menu-icon-paper, #fffaf1)';
const APRICOT = 'var(--menu-icon-apricot, #e8b69f)';
const SAGE = 'var(--menu-icon-sage, #b5cbb3)';
const INK = 'currentColor';

export const LIFE_MENU_ITEMS = Object.freeze([
  ['health', '健康・お留守番'],
  ['profile', '文鳥の紹介'],
  ['relations', '関係図'],
  ['family', '家系図'],
  ['roster', '名簿'],
  ['notebook', '庭の鳥図鑑'],
  ['diary', '日記'],
  ['memorial', '思い出の庭'],
  ['settings', '保存・設定'],
  ['help', 'あそびかた'],
].map(item => Object.freeze(item)));

const shapes = Object.freeze({
  health: `<path fill="${APRICOT}" d="M16 27.1C13.7 25.5 3.8 18.7 3.8 11.2c0-3.9 2.7-6.5 6.1-6.5 2.7 0 4.5 1.5 6.1 3.6 1.6-2.1 3.4-3.6 6.1-3.6 3.4 0 6.1 2.6 6.1 6.5 0 7.5-9.9 14.3-12.2 15.9Z"/>
    <path fill="${PAPER}" stroke-width="1.5" d="M13.6 10.3h4.8v4h4v4.8h-4v4h-4.8v-4h-4v-4.8h4Z"/>`,
  profile: `<path fill="${PAPER}" d="M7.1 21.8 4 25.7l6.9-1.9c2.9 1.7 7.1 1.5 9.6-.6 3.1-2.6 3.7-6 3-10.4.7-4.6-2-8.1-6-8.1-4.1 0-6.9 3.1-6.6 7.2-3.8 1.5-5.7 5.8-3.8 9.9Z"/>
    <path fill="${APRICOT}" d="m23.7 10.5 4.5 2.2-4.5 2.2Z"/>
    <path fill="${SAGE}" d="M9.1 16.1c2.5-1.7 6.1-1.4 8.2.7-.7 3.3-3.7 4.9-7 3.7"/>
    <circle fill="${INK}" stroke="none" cx="19.7" cy="10.5" r="1.15"/>
    <path d="M13.6 25v3h-2.2m7.5-3.5V28h2.2"/>`,
  relations: `<path fill="${APRICOT}" stroke-width="1.4" d="M16 11.2c-1.1-.8-4.1-2.8-4.1-4.8 0-2.6 2.8-3.1 4.1-.9 1.3-2.2 4.1-1.7 4.1.9 0 2-3 4-4.1 4.8Z"/>
    <path fill="${PAPER}" d="M3.7 20.5c0-4.6 1.7-7.9 5-7.9 2.8 0 4.4 2.2 4.4 5.2v3.7c0 3.7-1.9 5.7-5 5.7-2.6 0-4.4-1.8-4.4-4.7v-2Z"/>
    <path fill="${SAGE}" d="M28.3 20.5c0-4.6-1.7-7.9-5-7.9-2.8 0-4.4 2.2-4.4 5.2v3.7c0 3.7 1.9 5.7 5 5.7 2.6 0 4.4-1.8 4.4-4.7v-2Z"/>
    <path fill="${APRICOT}" stroke-width="1.4" d="m13.1 17.2 2.9 1.5-2.9 1.5Zm5.8 0L16 18.7l2.9 1.5Z"/>
    <circle fill="${INK}" stroke="none" cx="9.5" cy="17.2" r=".9"/><circle fill="${INK}" stroke="none" cx="22.5" cy="17.2" r=".9"/>
    <path d="M5.1 21.7c2.2.5 4.1-.4 4.7-2m17.1 2c-2.2.5-4.1-.4-4.7-2"/>`,
  family: `<path d="M8.2 12.4v5.2h15.6v-5.2M16 17.6v4"/>
    <rect x="3.6" y="3.8" width="9.2" height="9.2" rx="4.4" fill="${PAPER}"/>
    <rect x="19.2" y="3.8" width="9.2" height="9.2" rx="4.4" fill="${SAGE}"/>
    <rect x="11.4" y="21" width="9.2" height="8.3" rx="4" fill="${APRICOT}"/>
    <path fill="${INK}" stroke="none" d="m6.6 8.1 1.6 1.5 1.6-1.5Zm15.6 0 1.6 1.5 1.6-1.5Zm-7.8 17 1.6 1.5 1.6-1.5Z"/>
    <path d="M5.9 6.7h.1m4.4 0h.1m10.9 0h.1m4.4 0h.1m-12.3 17h.1m4.4 0h.1" stroke-width="1.45"/>`,
  roster: `<path fill="${PAPER}" d="M7 4h15.7A2.3 2.3 0 0 1 25 6.3v19.4a2.3 2.3 0 0 1-2.3 2.3H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/>
    <path fill="${APRICOT}" d="M25 7h2.5v5H25Zm0 8h2.5v5H25Z"/>
    <path fill="${SAGE}" d="M10.1 14.6c-.7-3.6.9-6.1 3.4-6.1s4.1 2.5 3.4 6.1c-1.9 1.6-4.9 1.6-6.8 0Z"/>
    <path fill="${INK}" stroke="none" d="m12.3 11.7 1.2 1.1 1.2-1.1Z"/>
    <path d="M9.8 20h10.4m-10.4 4h7.1M5 9H2.8M5 16H2.8M5 23H2.8"/>`,
  notebook: `<path fill="${PAPER}" d="M16 7.3C12.3 4.8 7.4 4.1 3.7 5.2v20.5c4.1-1 8.6-.4 12.3 2.1 3.7-2.5 8.2-3.1 12.3-2.1V5.2C24.6 4.1 19.7 4.8 16 7.3Z"/>
    <path fill="${SAGE}" d="M16 7.3c3.7-2.5 8.6-3.2 12.3-2.1v20.5c-4.1-1-8.6-.4-12.3 2.1Z"/>
    <path fill="${APRICOT}" stroke-width="1.4" d="M7.3 14.9c-1.1-3 .3-5.2 2.5-5.2 1.4 0 2.2.7 2.7 2l2.1 1.1-2.1 1.1c.1 3.7-3.1 4.5-5.2 2.7l-1.5.6Z"/>
    <circle cx="10.7" cy="11.9" r=".55" fill="${INK}" stroke="none"/>
    <path d="M7.1 21.1h5m7.8-9.7 4.5-.7m-4.5 5.4 4.5-.7m-4.5 5.4 4.5-.7" stroke-width="1.5"/>`,
  diary: `<path fill="${PAPER}" d="M8.1 4.1h16.8a2 2 0 0 1 2 2V28H8.1a3.5 3.5 0 0 1-3.5-3.5V7.6a3.5 3.5 0 0 1 3.5-3.5Z"/>
    <path fill="${SAGE}" d="M8.1 4.1H10v20.4H8.1a3.5 3.5 0 0 0-3.5 3.5V7.6a3.5 3.5 0 0 1 3.5-3.5Z"/>
    <path fill="${APRICOT}" d="M20 4.1h4v10.1l-2-1.8-2 1.8Z"/>
    <path d="M14 16.9h8M14 20.7h5.5M8.1 24.5h18.8"/>
    <path d="M4.6 24.5A3.5 3.5 0 0 0 8.1 28"/>`,
  memorial: `<path fill="${PAPER}" d="M5 27.5V13a8 8 0 0 1 16 0v14.5Z"/>
    <path fill="${APRICOT}" stroke-width="1.4" d="M13 18.1c-.9-.6-3.9-2.6-3.9-4.5 0-2.3 2.6-2.9 3.9-.9 1.3-2 3.9-1.4 3.9.9 0 1.9-3 3.9-3.9 4.5Z"/>
    <path d="M2.8 27.5h25.9M10 22h6M25.7 25.7v-7.6"/>
    <path fill="${SAGE}" d="M25.7 23.6c-3.2.1-4.4-1.5-4.3-3.2 2.4-.1 3.7 1 4.3 3.2Z"/>
    <path fill="${APRICOT}" stroke-width="1.35" d="M25.7 13.2c-2-2.2-4.4.8-2.2 2.4-2 2 1.2 4.3 2.5 2 1.7 1.9 4.1-.9 2-2.4 1.3-2-1.2-3.4-2.3-2Z"/>`,
  settings: `<path d="M4 8h24M4 16h24M4 24h24"/>
    <rect x="8" y="4.7" width="5.7" height="6.6" rx="2.3" fill="${APRICOT}"/>
    <rect x="18.3" y="12.7" width="5.7" height="6.6" rx="2.3" fill="${PAPER}"/>
    <rect x="11" y="20.7" width="5.7" height="6.6" rx="2.3" fill="${SAGE}"/>`,
  help: `<path fill="${PAPER}" d="M16 3.8C8.5 3.8 3.8 8.3 3.8 14.9c0 3.2 1.2 5.8 3.3 7.7l-.9 5.6 5.6-2.6c1.3.4 2.7.5 4.2.5 7.5 0 12.2-4.5 12.2-11.2S23.5 3.8 16 3.8Z"/>
    <path d="M12 11.6c.1-2 1.5-3.3 3.8-3.3 2.3 0 3.9 1.3 3.9 3.3 0 3-3.7 3.1-3.7 6.1" stroke-width="2"/>
    <circle fill="${APRICOT}" cx="16" cy="21.2" r="1.35" stroke-width="1.4"/>`,
});

/** Decorative SVG: the menu's unchanged visible text remains its accessible name. */
export function renderLifeMenuIcon(name) {
  if (!Object.hasOwn(shapes, name)) throw new RangeError(`Unknown life menu icon: ${name}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" class="life-menu-icon" data-life-menu-icon="${name}" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${shapes[name]}</svg>`;
}
