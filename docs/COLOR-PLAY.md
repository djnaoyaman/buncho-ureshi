# Color Play presentation, revision 2

The accepted A reference is a unified cream interface with broad organic curves, large primary circular actions, a quieter secondary navigation row, bold rounded typography and coral/yellow/mint/deep-green surfaces. The first preview changed colors but did not recreate that hierarchy. This revision changes the UI layout to match it.

## Protected scope

Game features, action handlers, rules, storage/schema, saves and all living artwork files are unchanged. No new actions from the provisional concept are invented. The original game.css remains intact before the appended UI layer. app.js only replaces the decorative game-title image with an accessible text wordmark. game.js only adds that existing title to the caption layout obstacle list, so a caption cannot cover it. No gameplay or persistence code changes. The scene coordinate plane, birds' size/shape/crops and animations remain intact. The existing owner illustration is moved upward only while the larger controls are open, preserving its size/shape/animation and avoiding concealment behind the new dock.

Every existing menu route, bird selection, clean/pause, visitor dismissal, care/conversations, decoration/filter/draw, notebook, twelve gardens, family, warnings, settings, save/export/import and reset cancellation remains reachable. The existing scenic mode is not reset or changed. Short-height screens retain compact controls rather than forcing the tall three-row composition.

## Verification

- npm run check and npm test.
- Static guard prevents CSS rules that modify living artwork. Position-only owner adjustment is explicitly checked.
- Palette text contrast remains WCAG AA.
- Color Play browser tests exercise five viewport sizes on Chromium touch, WebKit touch and desktop Chrome, including saved-state/reload/export, invalid import and reset cancellation.
- Artwork source, rendered size, crop, transform and animation are compared with the theme removed. Positions may change only as UI presentation; engine coordinate planes and gameplay are not modified.
- Relevant existing independent browser gates and actual screenshots are reviewed. Broad legacy failures are tracked separately, not described as a clean full-suite pass.

Publication and merge remain on hold for the user's review of actual implementation screenshots.
