# Four surveyed gardens

Scope: `yuyake`, `bird-eurasian-bullfinch`, `bird-white-winged-crossbill`,
`bali-terrace`. Names, art, music, booklet, world schema, scoring and RNG are
unchanged. Other 31 gardens continue through the existing social planner.

Source: Library `libfile_fde3_f-81a585678a4c81918545d47eaca55c09_1e5190e96ae0819195a4cad3042d859b`,
version 0, 56,258 bytes, SHA256
`470f2008b4ba3a816aa1426e0d26ea90a97f2b77f1cc5188762075e03b675717`.
The separately supplied four-garden HTML was inspected along with all four
actual backgrounds. Its fixed cast, demo buttons, positions and tint parameters
are not used. Source-image polygons and same-image foreground masks are used.
The source reference's 19,058-frame check is reference validation, not game QA.

The real roster is grounded in source-image coordinates before the loading
screen reveals it. Horizontal identity order is retained. Native art scales
uniformly only when spacing requires it; buttons remain at least 44 px.
No partial packing or removal of birds is used. Insufficient room, more than
six birds or unusable cropped terrain keeps the existing static placement.
Routes start at these live positions, check the entire button/label and wing
envelope, and return without rerolling identities or game randomness.
Routine saved-world redraws retain the presentation clock and route.

Flight uses only the supplied white adult Java sparrow textures, cut from
`white-poses.webp` SHA256
`8e6c308ddeed1f6a2675b7f884fb01dddf99c3d85cee0e052ecc335fdbb4dec0`.
Other colors, juveniles and unrelated visitors cannot use them. No colors are
filtered. Auxiliary textures load only for a proposed flight; failed/pending
decode keeps a native ground action. The bullfinch garden has no flight route.
Decorative masks/flight layers are CSS backgrounds, so they cannot enter the
existing essential-image loading gate. Shadows are independent ground marks.

Menus, keyboard focus, pointer interaction, pause, reduced motion, hidden tabs,
orientation notice and predator scenes hold the motion. Native buttons retain
their targets and event handlers throughout. No demo control or extra sound is
introduced. The existing one-scheduler idle/RAF mechanism is retained.

Rollback: revert this independent release, rebuild using its parent protected
baseline, and publish through the required checks. This restores the prior
presentation only; no save migration or rollback is needed. Do not revert
earlier BGM or booklet releases.

Remaining gardens require their own image/terrain survey and species-compatible
assets. Group by verified terrain, not by applying these four masks elsewhere.
Real iPhone Safari, physical touch and subjective visual acceptance remain
separate from automated Chrome/WebKit tests.

Scope evidence: `docs/qa/garden-motion-four-scope.json` links the two authorized
renderer/scheduler changes to the previous published hashes. Older music tests
retain all audio/catalog and gameplay assertions and follow this explicit
successor for those two files only. The prior sealed build comparison allows
those two source changes, seven new presentation files and cache URL changes;
all other protected bytes match. A local 630-state rendering comparison
(35 requests × 18 states, legacy fixtures on valid old gardens) found 564 exact
prior markups and 66 differing only by the white-adult eligibility attribute.
Inputs were unchanged. The full test and production results are recorded after
completion; a running check is not a pass.

This release uses safe single-bird hops/flights and native atlas gestures.
It does not transplant the demo's fixed pair choreography or fixed three-bird
cast. Dense live rosters may have no safe translation; they retain native poses.
