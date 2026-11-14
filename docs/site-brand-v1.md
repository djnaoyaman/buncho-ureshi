# Non-game brand refresh, 2026-11-14

Owner selected art-poster OGP option 03 and plump white Java sparrow icon 05.
Started only after PR #197 production verification, from e134b6d6fccd0a8b8d971f3983d5c79a4997b6d0.

- `public/site-brand-v1/bird-05-master.webp`: generated production rendition of approved icon 05 (illustration, not a real bird photograph).
- `poster-background.webp`: generated background only, based on approved option 03.
- `ogp-artposter.svg`: native layout references the approved original `brand/wordmark-04-transparent.webp`; no AI-redrawn logo is published.
- `scripts/site-brand-assets.mjs`: derives opaque install icons, mask-safe padded icon, small favicons, ICO and the PNG social card.
- Existing root brand assets, game icons, game manifest, game OGP and game save/logic remain untouched. Only non-game routes select new social/icon URLs; site manifest identity/start/scope unchanged.
- Existing per-page titles, canonical URLs and descriptions preserved. All non-game pages intentionally use selected shared brand poster; page-specific photo covers were not selected.
- Static metadata, image formats/dimensions/opacity and original-logo inclusion checked; Chrome and Safari-compatible WebKit exercise direct links, reload, back/forward, site/game separation and storage preservation. Actual iOS installed icons and external platform cache refresh are not simulated by these checks.
