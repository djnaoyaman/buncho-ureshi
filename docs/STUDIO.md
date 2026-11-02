# 文鳥アート工房

## Scope and identity

Original implementation in `src/studio.js` and `src/studio.css`. No Westie photographs, name profile, music recordings, analytics code, logo, or source code were copied from OMOCHI TOUCH. Its white Westie is distinct from the real female white Java sparrow おもち. All studio photos are general Java sparrows, not the user's pet. Illustrations are original Canvas paths.

## Current OMOCHI TOUCH source inspection — 2026-11-02 UTC

Read-only repository inspection through the GitHub connector:
- `app.js`: blob `96c27c88521542f9c4f711578b82fb3bab5ce429`.
- `style.css`: blob `8823fab8e868d3ef7151e4896237491b75f61fd4`.
- `music.js`: blob `45a16b261f72dd0ce086890ce94ac471cabac6c0`.
- `sound.js`: blob `32b67a612c05797514e79af311de1e8945ecd5e7`.
- `index.html`: blob `d08bfce5432a5a416c1e6382da89b189ad613707`.
- `README.md`: blob `c4294c9b5d47590fa3b1721aa242d07dec01408d`.

Sources: https://github.com/djnaoyaman/omochi-touch and https://djnaoyaman.github.io/omochi-touch/

The reference's current source has 24 procedural backgrounds, eight palettes, photo/cutout layer placement, scale/rotation (including two-pointer pinch/twist), stacking/duplicate/delete, text content and text color, undo, reversible reset, local composition saving, PNG preview/download, conditional file Web Share, responsive CSS and keyboard arrows. Its music uses a visible user-triggered YouTube player with selection/next/previous/stop/mute. Its UI SFX uses Web Audio step-specific synthesized tones. We made no request to YouTube.

Photo color controls and redo were not found in the inspected current code; these must not be described as inherited existing functionality. Source inspection is not a live behavior test.

Live URL retrieval via the web tool failed, and direct HTTP retrieval timed out on this executor. Local browser access was unavailable. The owner must record the later isolated CI browser inspection in the repository QA report; this document does not claim a live screen or playback verification.

## Feature inheritance and additions

| Reference concept | Bird studio implementation |
|---|---|
| Photo and silhouette composition | Local licensed bird photos plus original white/gray/silver/cinnamon/juvenile Java sparrow cutout-like vector silhouettes, leaves, branches, flowers, ribbon, medallion, nest, egg and text |
| Procedural backgrounds | Eight new botanical Art Nouveau backgrounds, not reference patterns |
| Eight palettes | Eight original ivory/sage/blossom/pond palettes |
| Text and text color | Short title, movable/editable 48-character text layers, layer color; applied edits only |
| Transform / layering | Pointer drag, keyboard arrows, equivalent move/scale/rotate buttons, range controls, front/back, duplicate, delete |
| Undo / reset | Fifty-step undo and new redo; confirmation/cancel and reversible empty-page reset |
| PNG and conditional Web Share | Exact 1400×1400 or 1400×1750 PNG, preview and download; conditional file share with explicit download fallback |
| Music selection and SFX | Three original procedural melodies, stage-specific synthesized SFX, explicit opt-in, volume/mute/stop; no service, recording, autoplay or paid AI |
| Touch / responsive | Pointer capture for dragging; canvas-only touch-action; scroll outside; mobile layouts and 44px controls |
| New templates and game handoff | Six distinct compositions; optional family, hatching, date/name/event seed |
| New photo tint and clipping | Rectangle, circular and leaf-shaped cropping without aspect distortion; color overlay 0–80%, clearly marked as art rather than encyclopedia feather color |
| New attribution-safe exports | Author, original source, exact supplied license and license URL, modification notice drawn into every export for each unique photo |

The reference supports two-pointer pinch/twist. This studio's touch move and accessible scale/rotation controls are intentionally separate; it does not claim pinch-to-scale.

## Integration

`mountStudio(root, {photos, birdSvg, seed})` returns a cleanup function. Include `src/studio.css` from the page stylesheet list. `birdSvg` is accepted for host compatibility; the canvas uses original matching bird anatomy paths so screen and export remain identical.

`photos` records require `{id, src, alt, author, source, license, licenseUrl, credit, artAllowed}`. Only `artAllowed: true` and exact supported license labels (`CC0`, `CC BY 2.0`, `CC BY 3.0`, `CC BY 4.0`) are admitted. Image URLs must use HTTP(S), have no credentials, share the page origin, point inside the base-relative `photos/` directory and end in WebP/PNG/JPEG. Blob, SVG, unrelated same-origin paths, duplicate photo IDs, oversized metadata and credential-bearing source/license URLs are rejected. Authors are limited to 512 characters, URLs to 2,048 and optional title/credit/modification/alt metadata to 1,024 each. Hosts should pass normalized base-aware image URLs. A leading `/photos/` path is resolved against document.baseURI; the host must set the GitHub Pages subpath base.

`seed` supports `{title, name, names, birds:[{name,color,stage}], event, date}`. Family data comes from the fictional game, never actual pet observations. The first five plain-object bird records are used. Valid game names, white/sakura/silver/cinnamon colors and egg/chick/juvenile/adult stages are retained. Unsupported colors/stages fall back to white/adult, and names are normalized to the 16-character bound; supplied values are never interpreted as drawing instructions. Each family name is also an editable visible text layer that is drawn into PNG exports. A seed starts the family composition and saves it into the one studio slot. A valid preceding saved composition is retained as the first undo entry, and the UI explains that it can be restored. The new card includes the supplied family title and memorial information. Checking every selection in a 128-bird, 10,000-hour game roster produced valid cards with at most four birds and ten total items: only the selected bird, parents and partner are handed off, not the entire roster.

Important selectors for browser QA:
- `[data-studio="canvas"]`, `[data-studio="layers"]`, `[data-studio="title"]`.
- `[data-template="0"]` through `"5"`.
- `[data-material="bird-white"]`, `[data-photo="<photo id>"]`.
- `[data-action="undo|redo|reset|export|share|play|stop|mute|sfx"]`.
- `[data-studio="export-preview"]`, `[data-studio="download"]`.

## Persistence, limits, and licensing

The versioned `buncho-ureshi-studio-v1` localStorage slot holds at most 36 items, six unique photo sources, 50 undo snapshots (memory only), 36 title characters and 48 characters per text layer. Stored text is limited to 64,000 UTF-16 code units before parsing, with strict known-field and item validation. Invalid or oversized saved data is preserved unchanged: automatic saving remains suspended until the user confirms “作り直す.” Cancelling reset leaves those bytes intact; a temporary working composition can still be exported as PNG. Names and user text are always drawn with Canvas or assigned as textContent, never injected into HTML. Literal angle brackets and entity-like text in author credits are preserved rather than silently stripped. No automatic uploads or cross-device synchronization.

All photo inputs are same-origin and every required photo finishes loading and, where supported, `Image.decode()` before export. A 15-second timeout covers load/decode; errors block export instead of silently omitting photographs. Cleanup cancels pending image waits immediately and removes their listeners. Revision checks prevent exporting a stale composition while edits or decoding are pending. Held-pointer movement invalidates a prepared export immediately, not only on pointer release. Layer/control commands and undo/reset settle an active drag first, so a later pointer-cancel cannot discard unrelated edits. Selection outlines are excluded from PNG. Old object URLs, timers, audio context, image callbacks and DOM listeners are released on cleanup.

Attribution footer includes each unique photograph's original title, author, required credit wording, source URL, license and license URL, upstream preparation, and applicable local modifications. Photo source and license URLs are preserved, not truncated. Footer size is measured before export; if all required lines cannot fit while retaining a usable artwork region, PNG creation is refused with a useful instruction to reduce photos or choose portrait. It never exports clipped credits or negative artwork geometry. The six longest actual catalog-photo credits fit in the square layout under the mock measurement fixture; actual font metrics and pixels still require browser verification. The asset collector is responsible for supplying accurate metadata and only `artAllowed` works compatible with cropping, tinting and user export. The initial catalog admits 26 art photos under CC BY 2.0/3.0/4.0 or CC0. All CC BY-SA photographs remain encyclopedia-only. Photo-03 also remains encyclopedia-only because this release does not bundle a Javanese font for its exact author credit. No author name is silently transliterated. Keep this constraint for later photo additions unless a compatible export-license scheme is implemented and explained. Do not claim public domain for all output or silently strip the footer. The site credits page now also displays each photograph’s original title, author, supplied credit, acquisition date, preparation/modification text, source and license links as literal escaped text.

## QA status — pre-CI snapshot, 2026-11-02 03:51 UTC

This is the local preparation record. The site-wide aggregate passed 56 of 56 Node tests, all 26 JavaScript syntax checks and the 46-route build. Playwright discovered 120 cases but had not executed them. Later real-browser and public results must be recorded against their exact source commit; the local mock checks below are not that evidence.

Completed locally: a mock-DOM/Canvas integration run exercised mount, title/text escaping and selected-text editing, photo addition/tint/clipping, undo/redo/reset, PNG-blob generation path and credit text, Web Share fallback, portrait state, unsupported-audio fallback, and cleanup. The mock is not a browser or pixel test.

Completed locally: JavaScript syntax check and pure Node assertions for all six valid templates, eight backgrounds/eight palettes, game seed names/date/event, unique item IDs, rejection of malformed version/background/coordinates/size/color/duplicate IDs/title/kind, and whitelisted photo IDs.

Additional read-only mock review checked all 26 eligible photographs individually: every title/author/credit/license/source/license URL/preparation field reached Canvas text, all corresponding local files existed, and every loaded image URL stayed same-origin. Object-URL accounting across repeated exports, edits, ordinary cleanup and delayed `toBlob` completion after teardown was 29 created and 29 revoked, with zero remaining. No external font/image service is required. These observations do not prove actual Canvas pixel output or browser security behavior.

The module exports pure `makeStudioTemplate` and `validateStudioState` helpers for direct Node assertions. Final visual and interaction verification belongs in the site's exact-commit QA report. Required browser flows: six templates; all backgrounds/palettes; photo add, tint, move, scale, rotation, layers/delete; title/text injection safety; undo/redo/reset; reload; drag cancellation; keyboard arrows; square and portrait PNG dimensions and actual credit pixels; share fallback/cancel; audio opt-in/mute/stop; layout at 320/375/390/768/1024/1440px and landscape. Do not report an untested browser/device as passed.


## Repeatable test files

- `tests/studio.test.js`: all 13 Node tests passed locally. The original six cover template structure, all 16 color/stage handoffs with visible names, save validation, photo licensing, mock edit/export/reset behavior and prior-work restoration. Seven adversarial regressions additionally cover unknown/oversized saves and confirmed reset; unsafe/duplicate photo inputs; literal attribution and oversized credit-footer refusal; complete geometry for the six longest real-photo credits; stale PNGs and interrupted drags; cancellation of pending image listeners; and decode failure. These observe state and Canvas calls, not actual PNG pixels.
- `tests/browser/studio.spec.js`: ten real Playwright scenarios, expanded across Chromium/Firefox/WebKit. These cover templates/palettes/backgrounds/local anchors, transforms and reload, reset cancel/confirm/undo/redo, drag cancellation/keyboard, touch alternatives, square and portrait PNG decoding and credit pixels, audio lifecycle, interrupted navigation, and game memorial export. They are registered successfully but were not executed in this executor.
- `tests/browser/reference.spec.js`: opt-in, Chromium-only read-only OMOCHI TOUCH inspection. Set `REFERENCE_QA=1`. Only the existing public site path is allowed; YouTube, analytics, and all other external requests are aborted. Captures 390/1280px screenshots and tests backgrounds, palettes, undo, reset cancel/confirm, and PNG export. Not yet executed.
