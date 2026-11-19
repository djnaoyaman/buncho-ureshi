# Approved four sounds and three hearts (PR 237)

The selected Library comparison is `omochi-happy-heartbeat-four-options.mp4`, version 0, Library ID `libfile_fde3_f-67c076d9347c8191803425230160382e_1e5190e96ae0819195a4cad3042d859b`.

The four choices reuse exact PCM from that video's final pre-AAC, loudness-adjusted master. They are not a new synthesis approximating the approved sounds. `pet-sound-provenance.json` records the approved MP4/master hashes, extraction positions and each PCM hash. PCM16 is converted exactly to Float32 by division by 32768, played at 48000 Hz and unity gain. Each buffer is 1.25 seconds including its original release/silence. No new gain, pitch, envelopes, resampling or sound assets from third parties are introduced. The module is 640171 bytes, approximately 377 KB gzip, loaded with the game module graph; decoded samples/buffers are bounded to four cached choices.

1. Wood: 330/392 Hz, onsets 0/.20s, exponential wooden partials.
2. Bell: 659/880/988 Hz, onsets 0/.16/.43s, bright harmonic partials.
3. Marimba: 392/523/659 Hz, onsets 0/.23/.39s, decaying FM attack.
4. Warm breath: 262/294/330/349 Hz, onsets 0/.15/.48/.63s, soft harmonics and original low-level seeded noise.

These are the original comparison synthesis descriptions; runtime plays the retained master PCM rather than regenerating them. Encoded comparison loudness was -24.02 to -24.00 LUFS; maximum true peak -10.68 dBTP. This is not subjective listening or physical-device loudness validation.

Selection uses one presentation-only `crypto.getRandomValues()` uint32 sample (or an independent full-period 32-bit LCG fallback if crypto is unavailable) and four equal intervals [0,.25), [.25,.5), [.5,.75), [.75,1). No species/world argument, gameplay Math.random call, world RNG call, persistence or rewards are involved. Both uint32 paths map their four quarters equally; no modulo bias. The existing committed-positive-delta and same-target checks still control feedback. Mute suppresses sound and selection; game/OS reduced motion suppresses only visuals. New sources replace old sources; BGM uses its existing separate player unchanged.

Three 30px rose-colored hearts replace the notes, preserving separate starts and left-up/up/right-up paths, 8px/2deg/540ms portrait movement, 1100ms heart duration and 0/100/200ms stagger. No new demo is needed. The user subsequently authorized deployment; release remains gated on the final required checks and production artifact verification.

Verification includes quarter-interval boundaries, exact PCM hashes and every sample after decoding; all four choices across normal birds/crows/raptors in native Chrome/WebKit; unchanged world seed and unrelated state; original save/reload/failure/cap/target/slow-save/burst/mute/motion/BGM/320/375/402px checks; original photo pending/retry/style/credit/keyboard protection. Results are reported with the final commit. WebKit automation is not iPhone 7/iOS 15 or iPhone 17 Pro testing. Subjective listening remains unperformed.
