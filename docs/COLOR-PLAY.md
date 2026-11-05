# Color Play presentation, review revision 3

The accepted A reference is a unified cream interface with broad organic curves, large primary circular actions, a quieter secondary navigation row, bold rounded typography and coral/yellow/mint/deep-green surfaces. The first preview changed colors but did not recreate that hierarchy. This revision changes the UI layout to match it.

## Protected scope

Game features, action handlers, rules, storage/schema, saves and all living artwork files are unchanged. No new actions from the provisional concept are invented. The original game.css remains intact before the appended UI layer. app.js only replaces the decorative game-title image with an accessible text wordmark. game.js adds that existing title to the caption layout obstacle list and changes only decoration display labels and the decorative markup inside its existing single-draw button. No gameplay or persistence code changes. The scene coordinate plane, birds' size/shape/crops and animations remain intact. The existing owner illustration is moved upward only while the larger controls are open, preserving its size/shape/animation and avoiding concealment behind the new dock.

Every existing menu route, bird selection, clean/pause, visitor dismissal, care/conversations, decoration/filter/draw, notebook, twelve gardens, family, warnings, settings, save/export/import and reset cancellation remains reachable. The existing scenic mode is not reset or changed. Short-height screens retain compact controls rather than forcing the tall three-row composition.

## Verification

- npm run check and npm test.
- Static guard prevents CSS rules that modify living artwork. Position-only owner adjustment is explicitly checked.
- Palette text contrast remains WCAG AA.
- Color Play browser tests exercise five viewport sizes on Chromium touch, WebKit touch and desktop Chrome, including saved-state/reload/export, invalid import and reset cancellation.
- Artwork source, rendered size, crop, transform and animation are compared with the theme removed. Positions may change only as UI presentation; engine coordinate planes and gameplay are not modified.
- Relevant existing independent browser gates and actual screenshots are reviewed. Broad legacy failures are tracked separately, not described as a clean full-suite pass.

Publication and merge remain on hold for the user's review of actual implementation screenshots.


## Purpose-led review proposal

This is a preview proposal, not a publication approval. The user requested purposeful color, shape and scale, with clear dark outlines, retro-modern arches and restrained Memphis geometry. Arbitrary menu-position colors are superseded by explicit action IDs:

- Mint: support and care, including health, treatment, caretaking and feeding.
- Coral: contact and relationships, including naming/conversation, family and relationship views.
- Yellow: discovery and records, including the notebook, profiles, diary, roster and help. Memorial navigation belongs to records; its reading surface remains quiet.
- Lavender: creation, decorating and the existing decoration gacha.
- Deep green: navigation and settings. Selected navigation also has an underline, so hue is not the only state cue.

Large circular controls mark the three frequent home entry points. Smaller horizontal controls are secondary actions or navigation. Dark outlines and short solid shadows identify operable controls; informational cards stay flat. Arch-shaped headings group a screen without adding an action. Small dot strips stay at discovery-header edges, away from text and living artwork. Disabled controls lose their raised shadow.

Health removes the redundant inner frame, widens the reading surface, groups existing care information and gives narrow screens full-width contract buttons. No warning, deadline, price, limit, action or explanatory text is removed. The gacha uses the unified name お飾りガチャ and a capsule-machine treatment for the existing ガチャをまわす button, with 1回 · 20 Gems always shown. Its cost, probability, availability, refunds and result logic are unchanged. Phone notebook cards use two columns; original art sources, proportions and the existing 85px image height remain.

The light garden header/footer use a yellow-tinted discovery surface rather than unfinished-looking white. The original scene art and actor plane remain untouched.

Additional browser checks use synthetic saves to exercise actual pointer-based hospital treatment, caretaker purchase/limits and reload, exact gacha results against the unchanged engine, and two-column notebook navigation. These checks supplement existing lifecycle, decoration and responsive gates.
