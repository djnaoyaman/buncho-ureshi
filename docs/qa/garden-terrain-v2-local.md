# Four-garden v2 integration (local candidate)

Base: 91b53af5eff91ebe3929c179db006bf18360b14e. Branch feat/garden-terrain-v2.
The 35-entry inventory records the exact IDs and names. The v2 four are all
among the eight published light-motion gardens. After these four, 31 remain:
java-rice / bird-diamond-firetail / bird-zebra-finch / kazaguruma next, then 27
individually surveyed gardens. No second batch is enabled by this change.

Contract: source-image-normalized surface polygons, named directed edges,
explicit flight-only cross-surface connections, terrain-specific priority order,
existing foreground masks. No fixed demo cast, new art, tint, world mutation,
random draw, fade, or rearranging neighbours to accommodate an animation.
The initial layout uses actual native buttons and measured button/name bounds;
minimum hit dimensions remain 44px. It is established during scene readiness.
Routes start at that layout and return continuously to it before another route
is chosen. With no legal translation, an existing native pose is used; without
a legal layout the existing safe static presentation is retained.

The native button, label, listeners, target and keyboard identity remain intact.
Transform-only travel is enabled only for the four v2 gardens; the old ground
four keep their prior inline transform representation. Existing scheduler gates
still govern hidden, OS reduced-motion, settings, sheet, focus and predators.
Only adult white birds can use the existing white flight parts. Visitors without
native pose sprites are not assigned invented gestures. 'Dispute' currently
falls back to a native peck; no fake social or aggression event is generated.

Important limits: this does NOT yet claim the standalone demo's full two-bird
choreography. Runtime spacing can reject a translation allowed in the fixed
HTML composition. Normal five-bird actual pixels/visible behavior and remaining
full regressions must pass before proposing a PR. Headless software rendering
is not an iPhone/GPU performance measurement.

All assets/audio/save/RNG modules stay unchanged. A prior sealed dist audit
allows only terrain plan/motion substantive edits, the added graph and cache
URL changes. The protected baseline is updated only after this comparison.
Rollback is this independent presentation change only; never roll back saves.

Local findings/tests and any remaining failures are in
/workspace/reports/garden-terrain-v2/. No push/PR/publication has occurred.

## Fixed candidate checks (in progress)

`npm run check`: passed. Full Node: 2,410 passed, zero failures/skips
(350,525.85 ms). Build and non-game renewal completed; 704-file fixed dist
manifest is retained in the report directory. Do not rebuild during browser QA.
Eight unchanged sparse-white-flight/focus assertions passed in Chrome/WebKit.
The 400-case related browser run and additional mobile touch/audio cases are
still running; these are not represented as passed until their reports finish.

Normal-play comparison uses isolated five-bird saves, actual entry UI, real
wall time, and no clock or predator-RNG interception. Each old/new pair starts
with identical world JSON. Continuous in-page observation avoids screenshot
latency: Chrome first visible pose/position change in the candidate was
0.87–1.43 seconds after entry versus 3.90–5.35 seconds in the published version.
WebKit includes actual warning suppression and image readiness delays; no
unconditional three-second guarantee is claimed. In one forest observation the
crow warning suppressed the first gesture. Controlled geometry tests are
reported separately from these ordinary-entry observations.

Normal frame captures were visually inspected for the four actual backgrounds,
five native birds, ground planes, full bodies and labels. No user save/device
was used. Current WebKit is not iPhone Safari 15.8.8. The extra no-dvh test only
simulates that feature decision, not an old browser engine. Hardware GPU and
mobile-network behavior remain unmeasured.

## Release hold: old-feature height synchronization

Additional 375x667 / 402x874 actual touch/rotation/audio checks: 16/16 passed.
The separate no-dvh feature simulation: Chrome 2/2 passed, WebKit 0/2.
Identical published-base comparison produced the same stale 844px shell
height, but candidate's two foreground birds become offscreen at 375x667
where the old layout's birds remain visible. This is an exposed compatibility
regression even though the underlying height race predates the candidate.
Do not publish or relax these assertions. See report `release-blocker.md`,
`no-dvh-comparison.json` and both versions' retained failure traces.
The shell/viewport fix is not silently mixed into this motion candidate.

## Final local result — NOT ready for release

Related browser run: 399 passed / 1 failed / 0 skipped, 29.4 minutes.
Failure: WebKit `surveyed terrain bali-terrace 402`, existing hit assertion
at garden-terrain-motion.spec.js:10:103. Trace shows revision4→6 during locator
resolution; stale ElementHandle is plausible but not established. No retry,
assertion relaxation or product fix was used to make this case green.
Additional ordinary touch/rotation/audio:16/16. Feature simulation:2/4;
published-base comparison also2/4, with extra candidate clipping at375x667.
These are separate outcomes, not successful full acceptance.

487 existing media files are byte-identical to the published sealed base.
The 704-file candidate manifest was rechecked. The worktree dist has been
made independent again after temporary disk deduplication, without byte changes.
Some unchanged public assets remain hardlinked to the old worktree: do not
modify those in place; replace via a new file if a future authorized task needs
an asset edit. This task never edits them.

No push, PR, CI run, merge or deployment. Main/publication remain91b53af.
Resolve the two recorded blockers before proposing publication. Remaining31
gardens, new birds/gardens, original HTML, BGM and booklets are untouched.
