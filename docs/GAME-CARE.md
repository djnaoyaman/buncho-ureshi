# Care, encounters and versioned saves

This is a fictional game, not instructions for feeding, breeding or touching a real bird. The actual female Omochi's voice, personality and preferences are not invented. The game keeps its existing autonomous personality/needs/relationship/memory loop, family generations, near-kin breeding restrictions and ten-resident garden.

## Visible care

- Fullness reuses `bird.needs.food`: higher means fuller, 0–100. The selected juvenile/adult resident or visitor can receive +20, capped at 100, with a persistent two-tick cooldown. Eggs, chicks and departed birds cannot receive direct care.
- Fictional petting adds up to four mood points and a short cheerful text/optional note cue, with a one-tick cooldown. Real birds may dislike touching; the interface says not to force it.
- Cleanliness is cosmetic, 0–100. Normal simulated ticks lower it; free cleaning restores 100. A small central floor polygon reaches at most .22 yellow alpha. Bird plumage, branches, nest, bowls, text and the entire scene are not yellow-filtered. Dirt causes no illness, relationship penalty, payment or absence punishment.
- Existing autonomous self-care continues. Offline progress remains bounded to 576 ticks. Long absence does not create death or a punishment loop. Repeated same-tick care cannot bypass cooldowns through reloads or another tab.

## Sound and motion

The saved sound preference defaults to false. Only the user's enabled, successful pet action can start the original short synthetic two-note chirp. It is not an animal recording or Omochi's actual voice. Loading, migration, import, catch-up and enabling a preference do not play sound. Explicit gesture activation is required. Immediate mute, selection/world/route changes and teardown stop or cancel pending audio. A stale action/unlock more than 1.5 seconds old is dropped. Unsupported audio leaves the textual response functional. Motion-off, pause and reduced-motion settings suppress the brief opacity cue; birds are not pulled off their perches.

## Schema version 2

The existing v1 database name, store, key and locks remain unchanged. Valid v1 worlds are strictly validated before adding v2 defaults: `settings.careSound`, `world.care.cleanliness/lastCleanTick`, and each bird's `care.lastFedTick/lastPetTick`. Migration is persisted even when zero simulated ticks elapsed. Unknown future versions and malformed/falsy stored records fail closed, preserving the existing data. Old v1 clients reject v2 rather than overwriting it; the UI asks old open tabs to reload. A production rollback must retain the v2 reader and save format: do not redeploy a v1-only engine over migrated saves. Disable or correct the affected care presentation/action while preserving the v2 schema and all existing family data.

Imports retain the 4 MB UTF-8 limit, strict lineage/reference/time validation, explicit replacement confirmation and delayed-file/stale-world guards. Care feedback is not accidentally returned as the world. Saved actions use captured immutable bird/world IDs. Unsaved local name/talk drafts survive background refresh even after focus moves to a submit button, are cleared after successful submission, and cannot transfer into another world reusing the same bird ID. A different world triggers rendering even if its revision happens to match the old world's revision.

## Reference-game adaptation

The reference's core individual states, autonomous encounters, directional friendship, gentle refusal/reconciliation, pairing, event logs and memory-driven responses are implemented within this site's bird game. Accepted current play/bath partners are placed on nearby real anchors; historical mates are not glued together. Pairing remains autonomous after mutual thresholds, not a confession-choice UI. The game intentionally does not implement fantasy RGB-changing food, gemstone excretion/currency, a 2–4 resident limit, a retro-circle redesign or a single downloadable HTML file. None of those is advertised as a completed feature.

## Verification boundary

Tests cover strict v1/v2 migration, exact old-engine autonomous parity, corruption/large imports, blood relationships, repeat-click and multitab serialization, dirty-draft preservation, stale care/audio cancellation, native audio scheduling, floor-only opacity, controls and image geometry. Node/DOM results are not actual browser or audible-human acceptance. Exact release CI and public-browser results are recorded separately; field performance, physical-device sound and real-bird behavior are not inferred from automation.
