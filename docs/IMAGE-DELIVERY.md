# Garden and encounter notebook image delivery

`npm run build` generates WebP delivery copies using the pinned Sharp development dependency. There is no client-side conversion and no new runtime service.

- Nine original garden PNGs retain their complete dimensions and layout anchors. The delivered `.screen.webp` copies total 4,214,852 bytes versus 25,822,185 bytes for the PNGs (83.7% less).
- Thirty individual bird PNGs retain their own artwork, color and alpha channel. Full-resolution `.screen.webp` copies are used for details and garden visitors. The 384px `.thumb.webp` copies used in the notebook total 1,057,386 bytes versus 40,920,757 bytes for the PNGs (97.4% less).
- The original PNG files remain in the source and distribution. No photos under `finches/photos` are processed. Photo URLs, exact bytes, creator/license links and no-derivatives display restrictions are unchanged.
- `dist/encounter-image-sizes.json` records the exact dimensions and file sizes for each build. These are asset-byte comparisons, not a claim that every device's total page load is reduced by the same percentage.

The notebook requests only cards near its own scroll viewport, with an eager fallback when IntersectionObserver is unavailable. Reserved image sizes prevent layout jumps. Decoded images are reused across refreshes while the new discovery state, alternative text and pose attributes are applied.

The garden shows a preparation message until its background and bird layers decode. Failed or stalled image requests expose a retry after at most 20 seconds. Navigation stays available; stale completion cannot update a newer view. Reduced-motion disables the loading animation. This presentation code never reads or writes a game save.

Verification: focused Node tests and `playwright.garden-loading.config.js` cover loading/failure/retry, decoded actor readiness, late navigation, scroll refresh, original photographs, saved-world equality, and reduced motion in mobile Chromium, mobile WebKit and desktop Chromium. Existing friendship/cage tests also protect shared illustration consumers.
