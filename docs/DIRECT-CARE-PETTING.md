# Direct care petting

The household care sheet replaces its labeled pet action tile with the original upper portrait enlarged into one unframed petting bird. The sheet contains exactly one bird image, above its name and food/name-call controls. Drag a finger, pen or primary mouse button over that bird and release. At least 48 CSS pixels of travel within the bird's displayed sprite are required. A tap, stationary hold, or leaving and re-entering the sprite does not count as a completed stroke. Sparse movement events still work: this is distance-based, not frame-count-based.

Each completed gesture calls the existing care transaction once. Existing energy limits, Gold/Gems rules, revision checks, local persistence and world/bird identity protection remain unchanged. No save schema or autonomous game-rule change is introduced. Petting a catalog bird still uses the separate catalog friendship operation; direct household care never changes catalog affection.

Enter or Space on the named bird provides a keyboard and assistive-technology alternative. Repeated keydown is suppressed. A pointer click does not substitute for a stroke. Pointer cancellation, lost capture, a second touch, focus leaving the window, closing the sheet, switching birds, world replacement and teardown discard incomplete gestures. An already accepted transaction retains the existing exact-once persistence and stale-feedback/audio guards.

The image preserves its native aspect ratio. The sheet remains internally scrollable at short viewport heights, with controls outside the gesture surface. Keyboard care and other controls do not wait for image loading. Motion-off and reduced-motion settings retain the static feedback without adding a new animation. This is a fictional game, not advice to handle a real bird.

Verification: focused DOM/unit coverage plus dedicated Chromium touch, WebKit touch and actual Chrome tests in `playwright.care-petting.config.js`. Screenshots, native Chromium touch and keyboard checks distinguish real browser acceptance from DOM emulation. Full publication results are recorded in the PR.

The single care portrait uses new natural-history illustrations in the same drawn style as the garden finches. Adult and juvenile white, sakura, silver and cinnamon birds retain their own color and growth-stage mapping; chicks use their own illustration, and eggs keep the existing egg asset. Room and garden pose atlases are not replaced. A whole-sheet image-count assertion prevents the former header miniature and enlarged lower image from being rendered together.
