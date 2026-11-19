# Approved garden recording batch #17/#18/#19/#21/#22

Base: `cf0853f4d298f5d00e9218f722b14a65030283cf`. Five version-0 originals were materialized into this consumer workspace through the current Library helper. Exact owner-supplied SHA256, returned bytes, 44.1kHz stereo and complete ffmpeg decode verified. The originals remain preserved; no generation or purchase. #22 uses the newly requested bachata recording (SHA256 be0a66496b6cf1da2cc29a733143a0f6e5a2ac87fa07b7572ba6fddedad90953), not the previous funk candidate. No other Library item was changed.

The producer-described directions are woodwind quintet, impressionist chamber music, santur-inspired timbre, koto-inspired timbre and bachata-inspired music. These describe intent, not certification of authentic regional performance or a connection to a bird habitat. The supplied UNESCO URL could not be inspected automatically because it presented a human-verification challenge; no bypass was attempted or historical claim inferred.

| Garden | Source interval, seconds | Loop seconds | Constant gain |
|---|---:|---:|---:|
| #17 ハンノキの黄緑園 | 4.115011–49.115011 | 45.000000 | -7.7 dB |
| #18 芽吹きの口笛庭 | 26.520000–88.234286 | 61.714286 | -7.7 dB |
| #19 木の実の石庭 | 25.840000–55.360000 | 29.520000 | -7.3 dB |
| #21 落ち葉の小径 | 7.910000–21.624286 | 13.714286 | -2.0 dB |
| #22 木の実の小さな広場 | 29.475011–62.202290 | 32.727279 | -6.4 dB |

All five: 40ms raised-cosine blend into original pre-roll, exact period retained, 20ms cyclic PCM guards, loopStart and initial/resumed startOffset 0.02s, explicit loopEnd. No new samples, pitch shifting, time stretching, dynamics flattening or end-fade restart. Each final file measures −19.0 LUFS. Exact sample cuts, Library IDs/file IDs/version/bytes/source hashes are in `garden-batch-four-runway.json`; final hashes, full-decode loudness/peak and boundary analysis are in `garden-batch-four-signal-review.json`. Reproduce with `python scripts/music35/prepare_runway_five.py ORIGINAL_DIRECTORY docs/qa/garden-batch-four-runway.json`.

## Selection evidence and limits

Compared 1.2/4/6/8-second chroma and spectral-flux windows around both boundaries, dominant pitch windows, 40ms phase correlation and local energy. Candidate cut points were refined without changing the phrase period; low-slope adjacent samples and positive phase correlation avoid the preceding batch’s boundary-slope problem. This is signal evidence, not full melodic/harmonic transcription or subjective audition. Estimated tempo/pulse counts and retained catalogue meter are not a certified score.
#17 keeps a 45s recurrence (~72 pulses at96 BPM) with matched A→F dominant windows. #18 retains a longer61.714s recurrence (~72 pulses at70 BPM), stronger rhythmic recurrence than the48s alternative; refined points match F→F. #19 keeps29.52s (~32 pulses at65.04 BPM), matching F#→D windows and strong pitch/onset recurrence.
#21 initial16–64s candidates had weak six-second pitch similarity (~0.76 for17.14s); expanding the period search found the13.714s phrase. Final boundaries retain six-second pitch similarity~0.960/onset~0.983, G→G dominant windows and balanced level. It is selected for phrase recurrence, not merely small size. #22 retains the observed32.727s recurrence (~60 pulses at110 BPM), with very strong six-second chroma/onset recurrence~0.997/~0.999 and A#→A# windows. No arbitrary conversion to a conventional bar count or genre claim based on those numbers.

## Verification and scope

Focused Chrome/WebKit: each track44.1/48kHz native decode/output and three rendered cycles; actual elapsed44.1kHz two cycles and48kHz three cycles, without simulated endings/time acceleration. Each verifies first play, stop/resume, garden and crow/raptor return, mute/restore, no overlap/residual output. Actual game320/375/402px covers all five routes and B icon loading. Existing encounter and four-heartbeat/care tests remain. Fixed build only: finish render/build before Node/browser readers start. Local/CI/publication counts and live checks are recorded in the PR/release report.

Delivery: five guarded PCM16 files total 32,259,520 bytes; largest 10,893,500 bytes. They are phrase segments rather than whole100–183s recordings. Existing player fetches/cache-retains only the chosen decoded track and serializes decode. Largest48kHz Float32 stereo buffer is about23.7MB excluding transient buffers. Measure production click-to-playing, but do not equate cloud timing with mobile-network/device memory performance.

Only five catalogue rows and new WAV files change runtime content. Other30 gardens including protected#26/#30/#35, all existing audio and B icons, audio engine, game/save/score/RNG and UI sources are unchanged. No credits UI or later batch included.

Subjective hearing and physical iPhone/Safari (including iOS15) remain unverified. Automated WebKit and numerical waveform checks are not guarantees of those. No specific failed musical candidate remains after refinement; do not claim subjective naturalness.

## Music-only rollback

Restore only these five catalogue rows from the base using retained old MP3 assets, audit regenerated protected output against the last sealed release, run required checks, then publish a reversal PR. Do not replace the whole newer tree or roll back user saves.
