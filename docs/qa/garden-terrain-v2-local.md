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
allows terrain plan/motion, the compatibility repairs documented below, the
added graph and otherwise cache URL changes. The protected baseline is updated only after this comparison.
Rollback is this independent presentation change only; never roll back saves.

Local findings/tests and any remaining failures are in
/workspace/reports/garden-terrain-v2/. No push/PR/publication has occurred.

## Historical failures and repair evidence

The first fixed candidate passed check/build and 2,410 Node tests. Its related
browser run was 399/400 (29.4 minutes), with the island402 WebKit hit assertion
failing. The trace showed revision4→6 across locator/ElementHandle resolution;
this is evidence of a measurement race, not proof of that historical failure's
complete cause. Measurement now selects the current plane and revision within
one browser task. A detached-plane negative control reproduces the false hit,
and a real occluder still fails. Eight committed redraws with actual native taps
are tested at both phone widths in both engines; no retry waits for hit success.

A separate no-dvh simulation exposed old measured-height latency: candidate
foreground birds could be offscreen before resize notification. Fixed top/bottom
edges now track the layout immediately; the measured visual viewport inset
still accommodates keyboards. The stale visualViewport height is distinguished
from a current keyboard inset. Tests assert actual overlay geometry, all five
hits, and real taps, not a CSS variable that may legitimately lag. The unchanged
published control still failed both WebKit cases under these assertions.

Container-query-unit simulation then found a separate real zero-plane bug:
a freshly redrawn scene could become media-ready before the compatibility
measurement's animation frame. Synchronous compatibility dimensions now precede
media readiness. Modern browsers retain native container units. These narrowly
scoped common compatibility fixes change no world or music state; other31
motion plans remain unchanged.

Focused repaired checks:32/32 Chrome/WebKit passed (2.9 minutes), including
both negative controls, 32 actual redraw/tap operations, both no-dvh widths,
all four gardens without cqw/cqh, and the existing iphone15-scene regressions.
A subsequent pixel review found the 375x667 bullfinch layout could exhaust its
search and fall back to the old floating arrangement, even though hits passed.
A forward feasibility check now prunes branches where a remaining bird has no
legal position. It preserves the 2,500-node budget, surfaces, 8px separation
and >=44px targets. The captured real geometry is a new Node regression;
mobile tests now also require grounded initial/restored five-bird layouts.
The interrupted intermediate full run had 146 passed, 2 interrupted, 290 not
run; it is not counted as a final pass. Intermediate Node was 2,412/2,412.
Final fixed-build checks must pass before Ready/merge; see the PR's CI results.

Normal-play comparison used isolated five-bird saves, actual entry UI, real
wall time, and no clock or predator-RNG interception. Each old/new pair started
with identical world JSON. Continuous in-page observation avoided screenshot
latency: Chrome first visible pose/position change was 0.87–1.43 seconds versus
3.90–5.35 seconds in the published version. WebKit includes warning suppression
and image readiness delays; no unconditional three-second guarantee is claimed.
Controlled geometry fixtures are separate from these ordinary observations.

Actual frame captures were visually inspected for four backgrounds, five birds,
labels and unobscured buttons. No user save/device was used. Current WebKit is
not iPhone Safari15.8.8. No-dvh and no-cqw/cqh only simulate feature decisions,
not an old engine. Hardware GPU, real iPhones and mobile networks are untested.

704-file fixed dist and prior sealed baseline hashes are recorded externally.
487 existing media files are byte-identical. The protected baseline audit allows
terrain plan/motion, the added graph, the compatibility fixes above and otherwise
only cache URL changes. Test assertions and historical failure traces remain.
Do not rebuild during browser QA. Unchanged assets may be hardlinked to the
prior seal for disk capacity: replace/detach before any future rebuild/edit.

No push, PR, CI, merge or deployment as of this record. Remaining31 gardens,
new birds/gardens, source HTML, BGM and booklets are untouched.

## Repaired fixed-build candidate

check/build passed; full Node 2,413/2,413 passed (314,619.59 ms).
Focused Chrome/WebKit mobile/redraw/compatibility tests:46/46 passed (6.9m).
The repaired WebKit375x667 image shows five birds on the slab rather than the
old floating fallback. The remaining400 browser cases are running on the same
704-file build; no rebuild overlaps QA. PR CI must also pass before release.

The subsequent full regression exposed a test-helper compatibility error:
adding diagnostic revision to the ordinary geometry object made unchanged
static scenes fail deep equality as normal saves advanced revision4→8.
The trace's only differing field was revision. Atomic measurement remains;
revision/connected/front metadata is now opt-in for the new diagnostic tests.
All original geometry/style/hit comparisons and the new revision/tap/occlusion
checks remain. This repair changes tests only; the fixed product bytes do not
change. A final same-head CI and complete related browser run are still required.
