# 文鳥の羽色ずかん — Integrated module and QA contract

**Scope:** the atlas is integrated locally into the application, route metadata, static build, menus, search and credits. Game, studio, engine, storage and branding source files were not changed. Publication is handled separately by the owning task; this document does not claim browser or production verification.

## Files

- `morph-ui.js` — dependency-free ES module: pure HTML renderers, authoritative-schema adapter, search-index output, and scoped interaction binding.
- `morph-ui.css` — scoped `.morph-atlas` styles; reuses the site's existing ivory/sage/green/serif variables. Original botanical divider only; no new or changed site logo.
- `morph-ui.test.js` — repeatable pure-render and Happy DOM contract tests against the checked-in authoritative data. This is not browser pixel QA.

## Data contract and imports

The reviewed authoritative inventory is checked into `src/data/`:

```js
import { morphAtlas } from './data/morphs.js';
import { morphPhotos } from './data/morph-photos.js';
import {
  prepareMorphAtlas,
  renderMorphOverview,
  renderMorphProfile,
  bindMorphAtlas,
  buildMorphSearchIndex,
} from './morph-ui.js';

const data = prepareMorphAtlas(morphAtlas, morphPhotos);
const options = { base: '/buncho-ureshi/' };
```

`prepareMorphAtlas` is pure and does not mutate the supplied records. It adapts the actual fields `nameHtml`, `summaryHtml`, `levels[].html`, `diagnostics[].html`, `ageNotesHtml`, `comparisonTipsHtml`, `missionHtml`, `confidenceHtml`, `photoNotesHtml`, and terminology `html` to explicitly designated ruby fields. Only attribute-free `ruby`, `rt`, and `rp` tags can become markup; everything else is escaped. Ordinary titles, names, URLs, source records and user search input are never trusted HTML.

The released dataset has five core color profiles (`normal`, `sakura-pied`, `white`, `silver`, `cinnamon`) and a separate `juvenile` age-comparison profile. All six can be rendered as detail routes. The overview's filter grid contains the five core profiles, while the growth section has the juvenile comparisons and a dedicated link. All six can be compared through the two selectors and appear in the exported search index. Fourteen terminology entries remain a clearly separate **no-photo** index; none becomes a fake completed photo profile.

## Static pre-render and SPA integration

These calls do not access `window`, `document`, storage or network:

```js
const overview = renderMorphOverview(data, options); // /colors/
const profile = renderMorphProfile('silver', data, options); // /colors/silver/
const index = buildMorphSearchIndex(data, options);
```

They return their own H1, breadcrumb, content, local table of contents and sources. Do not add a second page H1 around them. Link `morph-ui.css` after the global site stylesheet. `src/app.js` owns SPA route selection, search and teardown. `src/metadata.js` owns the seven atlas metadata entries, canonical URLs, breadcrumbs, a six-item overview list and profile LearningResource data. `scripts/build.mjs` uses these exact renderers for all seven static routes, links them in navigation, sitemap and both LLM files, and includes derivative-image credits. `renderMorphProfile` renders a useful not-found message for an unknown ID; the host should still use its proper 404 routing/status policy.

For a mounted SPA view:

```js
root.innerHTML = renderMorphOverview(data, options);
const cleanup = bindMorphAtlas(root, {
  data,
  ...options,
  speak: text => speak(text),       // existing host TTS, user click only
  stopSpeech: () => speechSynthesis?.cancel(),
  onAnnounce: text => announce(text),
});
// Call before replacing/removing this root:
cleanup();
```

The same binding works on a detail view. It registers four listeners **on the supplied root only**, never global document handlers. Teardown is idempotent, removes all listeners, and stops speech it started. If TTS is managed by another host binding, the pure HTML exposes `[data-morph-speak="id"]` / `[data-morph-stop]`; do not add a second handler when supplying these callbacks. Playback failure leaves the text readable. Native selects, form submission, links, buttons and details are keyboard-operable without custom key traps.

No localStorage, account, upload, tracking or persistence is used. Search/filter changes preserve the controls and focus. Selecting the same comparison twice produces an explicit request for two different names, not duplicated content. A separate comparison-reset button restores the initial pair and focuses the first selector; filter reset does not silently change the comparison. A card's compare button selects that profile, selects a different second profile when necessary, moves to the comparison section, and focuses the first selector.

All local table-of-contents URLs include the exact page pathname. They remain on the detail route under the existing `<base href="/buncho-ureshi/">` instead of incorrectly jumping to the site root.

## Photo integrity and factual caveats

- All images come from the supplied inventory, with exact source filenames and intrinsic dimensions. `object-fit: contain` is explicit; there is no cover-crop, zoom, color filter, generated substitute, or rounded clipping mask.
- Photo title, author, required supplied credit, license and linked license/source appear with every use. Detailed source URL, preparation/modification and acquisition date remain in a keyboard-accessible disclosure.
- `photoNotes` and `confidence`, with their authored ruby variants, are visible beside the photograph, not hidden in metadata or only in the source list.
- Sakura/pied is a description of visible mottling, not an invented pedigree/genetic certification.
- The silver photograph remains simply “Silver,” with unverified light/dark subdivisions explicitly unresolved.
- Cinnamon uses the released **3.000-second video-derived still**, with CC BY-SA 3.0 attribution and the video's extraction details. It is not counted as a new independent photograph or described as a confirmed adult. The inventory remains `artAllowed:false`; this UI does not add it to the studio.
- Juvenile captions preserve “seven days after fledging,” never “seven days old.” Photographs of separate birds are not presented as one individual's time series.
- Terms without verified reusable photographs show the exact `photoStatus` gap, no illustration, generated photo, substituted morph, or dead “view photo” button.
- The atlas's honest coverage claim is printed on the overview. It does not claim to exhaust every named morph.

## Validation and remaining browser checks

Run from the project root:

```sh
npm run check
npm test
npm run build
npx playwright test tests/browser/morphs.spec.js --list
```

`tests/morph-ui.test.js` has 9 pure-render/scoped-DOM tests. `tests/morph-integration.test.js` adds 3 tests for exact static/SPA renderer parity, SEO/security, actual asset hashes, counts, source licenses, LLM coverage, integrated navigation/search/compare reset/speech and unchanged private settings. Existing empty site-search coverage now expects ten main sections, including the atlas. `tests/browser/morphs.spec.js` registers 10 cases across Chromium, Firefox and WebKit (30 executions). Listing tests does not execute a browser.

Tests cover non-mutating adaptation, five-plus-one organization, fourteen photo gaps, all six static profiles and source captions, three reading levels, exact evidence caveats, normalized alias search, six real search routes, unsafe-string/protocol escaping, form/filter/reset behavior, comparison including same-selection handling, scoped TTS/error/teardown behavior, and CSS guards for full framing/visible ruby/reduced motion.

Not claimed as done here: browser pixel layout, real keyboard focus rendering, real speech playback, image decode/network behavior, or responsive screenshots. Before publication, run the owning task's supported isolated browser CI; the atlas suite covers 320/375/768/1440px and the existing site suite covers additional orientation/device widths. Check that the full real photographs remain visible, long ruby headings do not overflow, footer credits wrap, native compare selectors work, source links point correctly, no horizontal overflow occurs, and direct profile reloads match SPA rendering. Check `normal`, `sakura-pied`, `white`, `silver`, `cinnamon` and `juvenile`, plus a missing route. Do not report an untested browser as verified.

## Integrated browser evidence plan

The browser suite checks direct URLs and reloads for all seven atlas routes, native Back/Forward, overview and encyclopedia discoverability, global search, profile filters and zero results, repeated equal comparison selection and reset, scoped speech callbacks and navigation teardown, always-visible ruby, no-JavaScript static text, actual photo decoding and full-frame display, and exact sources/caveats. Widths are 320, 375, 768 and 1440 pixels. Each Chromium route/width records a viewport PNG; the 375px overview also records a full-page PNG. These are expected CI outputs, not pre-existing screenshots. Native device speech availability is not simulated as successful playback.

Counts remain 37 encyclopedia articles and 42 independent photographs. New routes add five color/pattern profiles and one age-comparison profile, plus the overview. The one additional image is a CC BY-SA 3.0 video-derived still, not a 43rd independently captured photograph. The 14 no-photo terminology entries are not counted as full photo profiles.

## Local verification (2026-11-02)

- `npm run check`: 35 JavaScript files passed; existing content remains 37 articles, 42 photos and 30 quizzes.
- `npm test`: 72 tests passed, 0 failed (including 12 atlas-focused tests).
- `npm run build`: 53 static index pages, plus 404, sitemap and LLM outputs.
- `npx playwright test tests/browser/morphs.spec.js --list`: 30 registered executions; listing only, no browser launched.
- `git diff --check`: passed.

Exact-commit Actions execution, screenshot review, publication and public-route verification remain the release owner's responsibility. The existing Omochi-photo-unprovided wording was deliberately left unchanged for the separately planned artwork correction.
