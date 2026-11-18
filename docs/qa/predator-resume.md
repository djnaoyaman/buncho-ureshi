# Predator lottery and interrupted arrival

The normal game uses one 35% draw, at most once per 60 seconds after a miss.
Both available families split that draw equally. Three continuous ready foreground
seconds, crow arrival 10 minutes, raptor arrival 2 minutes and dangerous raptor
arrival 24 hours remain unchanged. Legacy standalone family clocks are unchanged.

A winning draw becomes a pending species, not a new saved encounter. The host
journals the attempt under `buncho-predator-attempt-v1:<worldId>` in sessionStorage,
separate from the world, revision, PRNG and exported save. A miss deadline is also
journaled. Navigation, hidden state and delayed polling reset foreground dwell,
not the pending species. After return, the same species can resume after three
ready seconds; crows start a full six-second warning again. A selected osprey waits
for its water garden rather than being replaced with another species.

The selection is journaled before it can be presented. If writing the journal
fails, the same in-memory selection remains unissued; it can be persisted on a
later attempt. Failure to read the journal stops new draws until it can be read,
without blocking a saved raptor event's existing countdown. No world schema is
changed. Session storage is tab-scoped: reload survives, permanently closing the
tab ends this pending opportunity; it is not a cross-device or cross-tab queue.

A committed arrival of either family retires an older pending ticket. The next
fresh draw waits 60 seconds from that acknowledgement (and all existing family
cooldowns). Live transactions retain their existing garden/target/revision,
mutual-exclusion and cooldown checks. Fresh peer changes take precedence. Saved
arrival state therefore also handles the crash window between arrival commit and
journal acknowledgement. Saving failure never counts as arrival, never halves
energy and never records a visit; retry restarts foreground dwell without RNG.
Older tabs still use the old lottery timing, but the unchanged world format and
atomic arrival rules remain interoperable. Updating all tabs is needed for the
new rate everywhere.

Validation covers deterministic 35% boundary/equal weights, 60-second misses,
reset/reload/persistence failure, water restriction, hidden resume, full warnings,
failed world writes, competing crow/raptor arrivals, and repeated host recreation.
Browser tests use 320/375/402 widths with real document navigation and reload,
asserting one saved crow arrival, one energy change and no extra random draws.
Chrome/WebKit automation does not constitute iPhone hardware or iOS 15 testing.
