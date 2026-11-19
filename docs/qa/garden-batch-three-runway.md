# Five approved garden recordings (#10, #11, #13, #14, #16)

Base: `cc66d13f6485b249129a2186857d5f24e3ef5d5a` (B navigation icons). Owner authorization covers this batch through publication. No generation, replacement recording, new sample, save migration, or audio-engine change.

Original Library version 0, file IDs, sizes, hashes, generation IDs and exact reproducible sample cuts are in `garden-batch-three-runway.json`. Originals were materialized into the consumer workspace with the current Library helper, fully decoded, and compared to all five supplied SHA256 values. The private original files remain preserved. Reproduce with `python scripts/music35/prepare_runway_five.py ORIGINAL_DIRECTORY docs/qa/garden-batch-three-runway.json`.

| Garden | Original interval (s) | Loop (s) | Approximate pulse / period | Gain |
|---|---:|---:|---|---:|
| #10 三色の穂波 | 16.040–36.250 | 20.210 | ~95 BPM / ~32 pulses | −7.6 dB |
| #11 うろこ模様の草原 | 34.357732–68.643447 | 34.285714 | ~112 BPM / 64 pulses | −5.5 dB |
| #13 長い尾の風舞台 | 31.560–91.930 | 60.370 | ~71.56 BPM / ~72 pulses | −7.3 dB |
| #14 尾羽の夕風庭 | 18.045–78.045 | 60.000 | ~64 BPM / 64 pulses | −7.7 dB |
| #16 金いろの森の食卓 | 4.400–52.400 | 48.000 | ~80 BPM / 64 pulses | −5.3 dB |

Pulse estimates and catalogue meter are playback metadata, not a certified transcription. No source tempo stretching or variation is applied. Chamber dialogue, house rhythm, kantele-inspired plucking, duduk-inspired sustained melody and jazz/hip-hop retain their distinct recordings. No claim of authentic regional performance or bird habitat association.

## Boundary selection and limits

Compared spectral-flux recurrence and normalized chroma over 1.2/4/6/8-second windows around both cut points, including dominant one-second pitch classes before/after. These are pitch-class and rhythm evidence, not complete harmonic/melodic transcription or subjective listening. Detailed measurements are in `garden-batch-three-signal-review.json`.

#10 preserves the measured ~20.21-second recurrence; dominant classes G→F match on both sides. #11 keeps a 64-pulse span instead of the shorter half-period; F→C# and strong onset recurrence match. #13's ~30-second alternative had substantially weaker six-second pitch recurrence (~0.76); the 60.37-second recurrence retains the longer phrase, with A#→F on both sides and six-second chroma ~0.966. #14 retains the 60-second phrase; moving both boundaries 125ms from the initial 17.920s candidate improves 40ms waveform correlation from negative (~−0.53) to positive (~0.67) without changing its period. #16's 48-second span retains more instrumental dialogue and stronger six-second recurrence than the shorter 36-second alternative; F→G matches.

All use 40ms raised-cosine blending into the original pre-roll, preserving the exact period, plus 20ms cyclic PCM guards. Initial and resumed playback start at 0.02s; loop ends are explicit. Constant gain yields −19.0 LUFS per track, true peaks −5.3 dBFS or lower. No limiter, added silence, melody rewrite, or end-fade restart. Full ffmpeg decode and waveform checks passed. Technical evidence did not identify a failed musical candidate; subjective naturalness remains unverified, not guaranteed.

## Delivery and verification

PCM16 stereo 44.1kHz guarded loops total 39,349,012 bytes; each 3.57–10.66 MB. This is a deliberate phrase-length tradeoff, not distribution of complete 99–161s sources. The existing player fetches only the selected track. Largest decoded stereo Float32 buffer is about 23.2 MB at 48kHz, excluding temporary decode/crossfade allocations. Cloud browser loading/decoding is tested; slow cellular start latency and real iPhone memory pressure are not certified. Existing player cache/lifecycle behavior is unchanged.

The new focused browser suite retains native 44.1/48kHz decode/output, three OfflineAudioContext cycles and three actual elapsed cycles per track, plus scene/mute/stop/recovery checks and 320/375/402px game routing. Per-test timeout is 240 seconds because three 60.37s cycles alone require 181.11 seconds. No boundary assertions are weakened. Required aggregate Node/check/build and related encounter/heartbeat checks run against a fixed dist; do not rebuild while tests read it. Final local/CI/publication counts and hashes are recorded in the PR and release report.

No subjective audition or real iPhone Safari inspection is claimed. Automated WebKit is not iOS 15. User PC browsers are not used.

## Scope and rollback

Only five catalogue rows and five new WAV assets change runtime content. All thirty other rows, existing audio assets, B icons, game/save/score/RNG and audio-engine sources remain unchanged. Retained old MP3s permit a music-only rollback: restore these five catalogue entries from the base, regenerate and audit protected output against the last sealed release, run the same required checks, then publish a separate reversal PR. Never roll back user saves or replace the complete tree with an old checkout.

Initial native browser checks found #11 boundary delta 0.0435 (44.1kHz) / 0.0519 (48kHz), above the unchanged 0.03 limit. Shifted both cut points −2.268ms to a lower-slope source sample, preserving the period, then rerendered and restarted aggregate verification on fixed output. Initial interrupted suites are not counted as passes.
