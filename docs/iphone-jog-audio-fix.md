# iPhone garden dial audio activation

The dial previously attempted AudioContext.resume() on pointerdown, but touch activation on iOS can require release. Pending audio was discarded before resume resolved.

This patch retries resume synchronously in trusted pointerup/touchend handlers. Only the newest tone requested within 250 ms may play when resume resolves. Cancel, hidden panel, mute, and disposal suppress pending sounds. Release does not clear the scheduled settled tone. No sound settings, game balance or saved data change.

Validation: Node/DOM tests exercise delayed and rejected activation, release events, stale audio, mute/cancel/hidden/disposed lifecycle and listener teardown. Real iPhone audio and browser playback have not been verified. No real browser operation was performed, per task constraint.
