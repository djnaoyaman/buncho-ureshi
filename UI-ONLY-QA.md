# DO NOT MERGE — UI-only verification

This temporary branch exists only to inspect the game interface and save safety.
It does not deploy, and contains none of the four original WAV recordings.
Playwright intercepts `/audio/*.wav` with an in-memory silent test fixture.
This is not a replacement production soundtrack and cannot establish actual BGM quality,
original recording decode, audible playback, or seamless looping.

The original recording-specific spec and asset metadata are absent from this QA tree.
They remain preserved only on the separate actual release candidate.
Music fixture IDs/titles/files here are generic A/B/C/D, not production tracks.
It remains mandatory against the real recordings on the actual release candidate.
Native synthesized care audio remains covered by its existing browser smoke test.
All source/save tests and non-BGM browser scenarios remain enabled.

No private reference screenshots, original production brief, user saves, or unpublished
Omochi photograph are included. Do not merge this test fixture or workflow into production.
