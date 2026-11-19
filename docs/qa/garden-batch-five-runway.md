# Approved recordings #23/#24/#25/#27/#28

Base: `32899c5011b80c00e65523d3b052d0764b0eccd2`. Five Library version-0 originals were materialized in this consumer environment with current Library helpers. Owner-supplied SHA256, returned bytes, duration, 44.1kHz stereo and complete ffmpeg decode verified. Originals remain preserved; no generation or purchase. Producer-described directions are tres-inspired, panduri-inspired, Hardanger-fiddle-inspired, string quartet and UK dub. These describe intent, not certification of regional performance or a connection to bird habitats. Names and images remain unchanged.

| Garden | Source interval, seconds | Period | Constant gain |
|---|---:|---:|---:|
| #23 黄色い翼の河原 | 5.795011–16.461678 | 10.666667s | −6.7dB |
| #24 紅の丘の庭 | 9.030000–63.887143 | 54.857143s | −7.1dB |
| #25 雪どけの実り庭 | 65.274989–118.608322 | 53.333333s | −8.6dB |
| #27 白い翼のトウヒ園 | 8.880000–38.420000 | 29.540000s | −6.5dB |
| #28 紅の穂先の小道 | 97.470000–135.870000 | 38.400000s | −5.6dB |

40ms raised-cosine end blend into original pre-roll preserves the exact selected period. 20ms cyclic PCM guards, loopStart and initial/resumed startOffset 0.02s, explicit loopEnd. Each final measures −19.0 LUFS, true peaks below −5.7dBFS. No limiter, resynthesis, pitch shift, time stretch or end-fade restart. Original Library IDs/file IDs/version/bytes/SHA256 and exact sample cuts are in `garden-batch-five-runway.json`; decoded loudness, final hashes and boundary metrics are in `garden-batch-five-signal-review.json`. Reproduce with `python scripts/music35/prepare_runway_five.py ORIGINAL_DIRECTORY docs/qa/garden-batch-five-runway.json`.

## Selection evidence and limits

Compared multi-second chroma and spectral-flux recurrence, dominant pitch windows, local energy and 40ms phase correlation. These are signal measurements, not subjective hearing or complete musical transcription. Estimated pulse counts and retained catalogue meter are not a certified score.

#23 initially had only ~0.801 six-second pitch similarity in the16s candidate. Expanded search plus exact-period refinement found10.666667s (~16 pulses at90 BPM), six-second pitch/onset~0.982/~0.979 with matched C→F dominant windows. This short phrase was selected for stronger musical recurrence rather than file-size alone. #24 keeps54.857143s (~64 pulses at70 BPM), pitch/onset~0.969/~0.948, D#→D# windows, positive phase~0.779. #25 keeps53.333333s (~64 pulses at72 BPM), stronger pitch correspondence than the40s alternative and more development, pitch/onset~0.944/~0.879, matched C→A windows. Its40ms phase correlation~0.189 is weaker, so decoded seam/output tests remain necessary; the boundary energy difference is~1.35dB. #27 retains29.54s (~32 pulses at65 BPM), pitch/onset~0.966/~0.806, G→B windows; no tempo warping. #28 keeps38.4s (~48 pulses at75 BPM), pitch/onset~0.995/~0.999, A→C windows and phase~0.978. It preserves the original dub texture rather than turning it into the other tracks' instrumentation.

No specific failed candidate remains after selection, but technical agreement is not a guarantee of subjectively natural transitions. Subjective hearing, physical iPhone/Safari including iOS15, cellular latency and real-device memory remain unverified.

## Verification and delivery

Chrome/WebKit each track44.1/48kHz native decode/output and three rendered cycles; actual elapsed44.1kHz two cycles and48kHz three cycles without simulated endings or accelerated time. Initial/stop/resume/garden/crow/raptor return, mute/restore and no overlap/residual output. Actual game320/375/402px checks correct routing and all3 B icons. Existing music and heartbeat/save regressions remain. Finish build before parallel Node/browser readers; never rebuild underneath tests. Counts/results are recorded in PR and private release evidence.

Five PCM16 files total32,986,516 bytes, largest9,683,900 bytes. These are phrase selections, not whole102–180s recordings. Existing selected-track-only fetch, serialized decode and one-track decoded cache are unchanged. Largest48kHz Float32 stereo buffer is about21.1MB excluding transient buffers. Production start timing is measured separately and does not establish cellular or physical-device performance.

Other30 catalogue rows, all75 existing audio assets and3 B icons, engine/save/score/RNG and UI remain unchanged. Protected#26/#30/#35 preserved. No credits UI or later batch. Baseline updates require byte comparison with the prior sealed release and an explicit five-row/new-asset allowlist.

## Music-only recovery

Restore only these five catalogue rows from base32899c5011b80c00e65523d3b052d0764b0eccd2 using the retained oldMP3s. Audit regenerated protected output against the last sealed release, run required checks and publish a reversal PR. Never restore the entire old tree or roll back user saves.
