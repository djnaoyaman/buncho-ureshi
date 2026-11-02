# Verification record and acceptance ledger

**Historical pre-CI snapshot: 2026-11-02 03:51 UTC.** The final local checks below passed before the application source commit. At this checkpoint, remote CI, Pages deployment and public real-browser acceptance had not yet been established. This is a timestamped preparation record, not a permanent statement about deployment status. For subsequent results, inspect the exact commit in [GitHub Actions](https://github.com/djnaoyaman/buncho-ureshi/actions/workflows/pages.yml) and its release evidence. Publication requires successful verification, deployment and public-URL tests for that commit.

## Repository creation resolved; publication is still pending

- `djnaoyaman/buncho-ureshi` returned GitHub API 404 before work began. The user has now created this **new Public repository**. No existing site was overwritten.
- The initial README commit on `main` is `601eb4ea8fbbf57375b96c01a9ef5fe31f6f156f`. Connector repository reads and a blob write have succeeded. A blob write alone does not put the application on `main` or publish a website.
- At this record's checkpoint, the project source and CI workflow have not yet been committed to remote `main`. The exact source commit, Actions verification, Pages configuration/deployment and public-URL checks remain to be established.
- Earlier supported cloud-browser attempts to open GitHub creation crashed Chromium with error code 9, including one ordinary reload after recovering temporary disk space. That history is not a claim that repository creation remains blocked; the user's creation resolved it. Local real-browser acceptance has not been executed.
- No token extraction, organization DevTools bypass, existing-site workflow reuse or modification of another site was attempted.

## Checks actually completed locally

- JavaScript syntax checks passed for 26 application, build-script, unit and browser-test files.
- Data validation: 37 unique articles, 42 unique photo files, 30 valid quizzes, 10 photo quizzes, valid references and ruby markup.
- Photograph pixels inspected by source collector; 42 distinct hashes, 5.6 MB total still images, maximum image edge 1200px. Seven distinct real-photo crop regions for the body explorer were visually checked against source pixels, with full-photo context and credit links. These are crops of the existing photographs, not seven extra photos and not a browser-layout pass. The ear crop explicitly says the ear opening is hidden by feathers. Audio/video checked with a decoder and representative frame; 12.1-second VP8/Vorbis original source.
- Engine tests: initial female white Omochi and male visitor, autonomous pair/egg/hatch/growth/later generations, sibling/parent/grandparent/cousin exclusion, deterministic bounded catch-up, pause/backward clock, save roundtrip, hostile imports, immutable IDs and dynamic names, stateful conversation, directed relationships, long-term bounds.
- Five additional deterministic 10,000-game-hour runs each reached 128 preserved birds and 5–10 generations, with natural saves of approximately 397–427 KB. A 20,000-hour run remained bounded. A dense bounded relationship fixture round-tripped at 3,136,457 UTF-8 bytes, below the shared 4,000,000-byte import/export limit. These are simulation tests, not years of observed browser use.
- Studio pure-state and mock-DOM checks are described in STUDIO.md. These are not pixel or actual-browser evidence.
- Static production build passed: 46 HTML routes under `/buncho-ureshi/`, sitemap, robots, custom 404, local styles/scripts/photos/media/icons. All 37 article bodies, deeper explanations, sources and dates are visible static HTML outside `noscript`; all 46 routes have checked title/canonical/OGP metadata and specific visible introductions. PNG OGP and icons were visually inspected; Japanese OGP glyphs were repaired with installed Japanese fonts.
- A real local HTTP-server test passed: an unknown nested route returns the custom HTML with HTTP status 404, noindex and a home link; home and a representative article return HTTP 200. This is not a public Pages check.
- Integrated DOM tests passed for site-wide search across nine main sections and articles, direct search URLs, history restoration, empty/no-results states, selected-part crops and literal complete photo credits. Game SVG assertions confirm distinct egg, chick, juvenile and adult silhouettes for every supported feather color.
- Final aggregate local run passed **56 of 56 Node tests**, with no failed or skipped cases. Breakdown: engine 18, store 7, game UI 5, game silhouettes 1, studio 13, integrated app 3, content 4 and static SEO/HTTP 5. DOM/Canvas emulators are identified separately below.
- Playwright discovery registered **120 cases**. **They were not executed at this checkpoint; discovery is not a browser pass.**

### 03:56 UTC — bounded touch-emulation QA addendum

Discovery now registers **124 cases**: the existing 120 cases plus four dedicated mobile smoke cases. `android-touch` uses the Pixel 7 Chromium preset; `iphone-touch` uses the iPhone 13 WebKit preset. Each project runs only `mobile.spec.js`, not the full desktop suite. Its studio and game scenarios also create a corresponding Galaxy Tab S9 or iPad (7th generation) touch context. They exercise native Playwright taps on editing controls, photo/PNG download, visitor adoption and naming, conversation, JSON export, and reload persistence.

These are configured browser/device emulations, **not physical Android/iOS device results**. Native touch drag and pinch are not claimed: ordinary mouse/pointer dragging remains separately covered, while touch uses move/scale/rotate controls. No CDP or DevTools route is used. The new spec and project configuration pass syntax and discovery checks only; all real-browser execution remains pending the exact-commit CI run.


## Adversarial regression evidence

| Executed suite | Passed | Coverage added or confirmed |
| --- | ---: | --- |
| `tests/engine.test.js` | 18 | UTF-8 import/export cap; unknown and oversized nested data; pre-clone object bounds and no serialization hooks; invalid clocks; counter rollover; event chronology and parentage; dense relationship round-trip; existing autonomous and kinship tests |
| `tests/game-store.test.js` | 7 | Forty concurrent IndexedDB edits without loss; one shared elapsed interval; transactional rejection; blocked/failed database preservation and late-open cleanup; stable existing localStorage backend; locked-local serialization; explicit memory-only mode |
| `tests/game-ui.test.js` | 5 | Reversed file-read completion still applies the latest request; teardown cancels pending import; old UI commands cannot rename a reused bird ID after another tab changes `worldId`; settings disclosures remain open after mutations; failed initial validation closes the database and preserves the save |
| `tests/studio.test.js` | 13 | Strict bounded saves; corrupt-save preservation; unsafe/duplicate photo rejection; literal credit preservation and oversized-footer refusal; held-pointer/stale-PNG races; interrupted drag retention; pending-load cleanup and decode failure; prior template/export/state regressions |
| `tests/game-visuals.test.js` | 1 | Four distinct stage silhouettes for each feather color; original SVG without external images or executable content |
| `tests/app.test.js` | 3 | Learning/quiz/observation flows; corrupt local state and injection safety; site-wide search/history/empty results; seven selected-photo crops and complete literal page credits |
| `tests/content.test.js` | 4 | Required encyclopedia content/levels; unique local photo files; linked quiz explanations; truthful real-Omochi identity |
| `tests/seo.test.js` | 5 | All-route metadata; visible static article content; route-specific introductions; custom 404 markup; actual local HTTP responses |

The game uses a shared 4 MB byte limit in its engine and file picker. Existing IndexedDB failure never silently falls back to a different world, and an existing locked-local world retains its backend. Request tokens, world identity checks and teardown guards prevent obsolete asynchronous work from mutating a replacement garden.

Studio saves are capped at 64,000 UTF-16 code units before parsing, with known-field and per-item validation. Invalid saved text stays unchanged until the user confirms reset. Photo admission is restricted to eligible known licenses and same-origin image files inside the base-relative `photos/` directory. Required literal credits are preserved, and export is blocked if the complete footer cannot fit. Drag edits invalidate prepared PNGs immediately; photo decoding is awaited and pending image work is cancelled on cleanup. Source-level touch targets for palette, contents and range controls are at least 44px.

The six longest actual catalog-photo credits were checked through Canvas draw calls and baseline geometry, not rendered pixels. An additional bounded review checked all 26 eligible photographs for complete exported metadata, all 128 roster selections for valid family seeds (at most four birds and ten items), and export object-URL cleanup (29 created, 29 revoked, zero remaining, including delayed encoding after teardown). HappyDOM and fake-indexeddb are emulators; these tests do not establish browser painting, native downloads, real sharing, speech playback, device touch behavior or true cross-tab browser acceptance.

## Browser/production checks pending

The normal isolated GitHub Actions runner will install Chromium, Firefox and WebKit. This managed local environment does not permit substituting a separately launched automation browser for an unavailable supported preview route. No browser or device was listed as passed at this pre-CI checkpoint.

Prepared specs cover:

- Widths 320, 375, 390, 768, 1024, 1440px with short/long heights; no horizontal document overflow; home/encyclopedia/studio/game screenshots.
- All main routes directly and after reload, representative article routes, images decoded, page-specific canonical metadata.
- Search/filter/favorites/ruby persistence, menu Escape, browser Back, all quiz answers/explanations, observations, keyboard focus, speech API calls.
- Game visitor name/adopt, 10,000 simulated hours via gated QA control, family/roster/diary bounds, rename, stateful conversation, repeated-click selection identity, export/import/malformed files, atomic two-tab updates, pause, family-card handoff, rapid navigation cleanup.
- Studio template/material/photo/transform/tint/clip/text controls, undo/redo, reset, square and portrait downloads, full attribution, sharing fallback and opt-in audio.
- Read-only current OMOCHI TOUCH visual/interaction comparison, with all YouTube-related requests aborted. Source inspection alone is not counted as a live screen check.
- The workflow repeats applicable tests against the real public GitHub Pages URL after deployment. Remote deployment success without the public checks is not completion.

## Acceptance ledger

| User requirement                                      | Implementation / evidence                                                                                                                 | Release gate                                                 |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Formal title and original Art Nouveau botanical world | User-selected refined 04 raster logo (see BRAND-04.md), plant stems/leaf motifs, sage/ivory/rose/gold, original bird illustrations; full accessible name; OGP/icons | Browser pixels pending                                       |
| Middle-school depth with grade-one entry              | 37 three-level entries, ruby and glossary, TTS; short summary/large photo; captions and missions                                          | Source/data and integrated DOM tests passed; browser pending |
| All encyclopedia sections | Classification/home/wild life/history/food/growth, seven verified photo crop regions with context/credits, colors/young, behavior/voice, safe home care, truthful Omochi room | Content and crop DOM checks passed; browser layout pending |
| 30+ unique licensed real photos                       | 42; individual source/author/license/date/modification/usage ledger; no generated photos; local files                                     | Provenance and duplicate checks passed                       |
| Genuine bird sound                                    | One original licensed 12-second video with real audio, controls/no autoplay, not Omochi; synth sounds separately disclosed                | Decoder passed; playback browser pending                     |
| Omochi identity                                       | Only female/white/pet/name asserted; age/traits/real photos unknown; illustrations labeled; local user-authored observations distinct     | Content test passed                                          |
| 20+ quizzes                                           | 30 questions, including 10 real-photo prompts, explanations, article links and missions                                                   | Data tests passed; UI pending                                |
| Existing OMOCHI TOUCH inspection                      | Current five source blobs and README inspected; precise inherited/additional feature table                                                | Live-screen comparison pending                               |
| Full art editor                                       | 6 templates, 8 backgrounds/palettes, 26 eligible photos, original materials, all transforms/layers/text/tint/clip, undo/redo/reset        | Pure/mock checks passed; real PNG/browser pending            |
| Square/portrait export, sharing, credits              | 1400×1400 / 1400×1750, same-origin photo decoding, author/source/license/modifications in output, fallback download                       | Real file/pixel verification pending                         |
| Opt-in sound controls                                 | Original procedural BGM choices + stage SFX, volume/mute/stop, no external music player                                                   | Mock passed; browser pending                                 |
| Autonomous behavior rather than dialogue slideshow    | Weighted choices depend on personality/needs/relations/memories; directed reactions and causal event log                                  | Engine tests passed                                          |
| Family generations and close-kin exclusions           | Outside visitors, pair/egg/growth conditions, parents/immutable IDs, known-shared-ancestry exclusion                                      | Multigeneration engine tests passed                          |
| All game screens | Shared habitat; four distinct original growth-stage drawings; profiles/conversation; relations, family, diary, roster, help/settings | SVG and DOM assertions passed; browser pixels/interaction pending |
| Bounded absence / no punishment                       | Sequential 576-tick maximum catch-up, self-care, no death, pause, limits documented                                                       | Engine tests passed                                          |
| Safe persistence/import/multitab | v1 schema, shared 4 MB cap, strict references/kinship/chronology, atomic store, retained backend and import/world identity guards | Engine/store/UI emulation passed; true multitab browser pending |
| Cross-function links                                  | Actions→articles; profile/family/milestone→art seed                                                                                       | Integration browser pending                                  |
| Search, favorites, local settings | Search across nine main sections and articles, query/history/empty states, categories, saved favorites/ruby/motion, contents and related links | Integrated DOM tests passed; actual browser checks pending |
| SEO and accessibility | 46-route metadata; 37 visible static articles; sitemap/custom HTTP 404/icons; keyboard/labels/focus/reduced-motion, no login | Static/DOM/local HTTP passed; browser/a11y pending |
| Source organization and maintenance docs              | README, ASSETS, SOURCES, STUDIO, QA; separate data/modules/build/test files                                                               | Present                                                      |
| New Public repository and Pages | User-created Public repository confirmed; connector read/blob write verified; workflow prepared locally | Source commit and Pages deployment pending |
| Exact-commit final CI and live URL verification | Build→unit→3-engine browser→deploy→public test workflow | Not run for application source; initial remote README commit only |

## Remaining factual/material limitations

Real photographs and observations of the family's Omochi have not been provided, intentionally not fabricated. Game feather colors are illustrative rather than genetic. Speech quality/availability and native file sharing depend on the actual device. At the lifetime roster limit (128) the same garden continues relationships but no longer adds birds; names and family links remain preserved rather than growing without bound. No real-device or live-site pass was established in this historical pre-CI snapshot; later results must be tied to the exact released commit.
