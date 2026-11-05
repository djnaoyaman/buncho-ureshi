# Color Play presentation

The accepted A direction uses coral, yellow, mint, deep green and cream, flat rounded controls, and gently curved card surfaces. It retains the existing screens rather than treating the concept picture's provisional content as a feature list.

## Scope

The only production change is a final scoped paint-only section in `src/game.css`. It changes backgrounds, colors, border colors/radii, shadows, focus/accent colors and the navigation icons' shadow filter. No JavaScript, markup, data, storage, rules, assets, living character shapes/sizes, animation, coordinate planes, hit targets, layout dimensions, visibility, scrolling, or timing changes.

Preserved screens include home, twelve gardens, care, conversations, friends, family/relations, diary, roster, decoration and its collection, encounter notebook/stories, health/caretaker, memorial, owner editor, music, settings, help and every confirmation dialog. Existing first-visit and collapsed-controls behavior stays unchanged.

Warnings retain their meaning, countdowns and escape rows. Notebook button gaps, short-height layouts, safe-area positioning, keyboard focus, direct petting, family pan/zoom, filters, accessible names and image credits remain intact. The protagonist and every other living illustration keep their original bytes and geometry.

## Verification

- `npm run check` and `npm test`.
- `tests/color-play.test.js` restricts the layer to scoped paint properties and verifies WCAG AA contrast for the palette's text pairs.
- `npx playwright test --config=playwright.color-play.config.js` tests actual menu routes, saved-state preservation and reload, care, decoration, twelve-garden navigation and hit targets in Chromium touch, WebKit touch and desktop Chrome.
- Screen sizes: 320×240, 320×568, 390×844, 844×390 and 1280×800. The browser artifact includes actual-screen screenshots for visual inspection. Home, care and garden artwork geometry, transforms, images and animation names are also compared with the paint layer temporarily removed.
- Existing independent workflows separately verify notebook spacing, direct petting, short controls, decoration scrolling, family, crowded home and warning escape paths without duplicating those long suites in the Color Play job. Existing repository release workflows still run. Report pre-existing broad regression failures separately; a focused pass is not a full-suite pass.
