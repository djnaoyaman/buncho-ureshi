# Saved pet-point response

The approved preview uses a 420ms, ±2px, ±0.5° portrait movement without sound.
The encounter panel uses this same response for normal garden records, crow
records and raptor records (including photo view where that view is pettable).
It does not animate travelling garden actors or modify their positioning.

The response runs only after the injected transaction resolves, its pet result
reports a change, and the committed target's pet-point total equals the positive
increase observed inside that transaction. World, view, target and generation
must still match. Failed writes, capped points and departed targets do not react.
The response reads world state only; all awarding, RNG and save rules are unchanged.

A new response cancels the preceding animation. Re-render, hidden/pagehide,
view blocking, disposal and OS reduced-motion changes cancel it. Game motion off,
pause, hidden, blocking and an active ending suppress new responses. Original
inline styles and existing transforms remain intact; no animation state is saved.

Validation: pure presentation tests cover duration, frame bounds, base transform,
read-only state, cancellation and missing/throwing animation APIs. Chrome/WebKit
exercise real store commits and reload, positive/failed/capped points for all
three pet paths, in-flight repeated input, target changes, OS/game motion settings,
real pointer rubbing, frame-observed movement and 320/375/402px layout. Browser
checks are automation, not an iPhone or iOS 15 hardware test.

The protected baseline update is checked against the preceding live hashes.
Only encounter-controller.js and the new encounter-pet-response.js contain
product changes; other changed protected files contain cache-version changes only.

WebKit follow-up: media emulation is now awaited until matchMedia reports the
requested preference before pet input. The portrait container is animated rather
than the reused decoded IMG, preserving protected photo transform:none!important
and image styles. Real frame progress remains asserted; it is not replaced with
an animation-registration assertion. The extra protected-image-style case keeps
point gain and visible movement assertions. This also isolates the effect from
image reuse; the original CI-only missing frame is not claimed as conclusively
reproduced locally.
