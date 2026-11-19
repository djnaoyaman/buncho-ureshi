# Five owner-approved Runway garden recordings

Scope: only the first five entries of the existing 35-garden catalogue. Names, menu labels and theme IDs stay unchanged. Original files, Library IDs/version 0 and SHA-256 hashes are recorded in `garden-five-runway.json`. Originals were materialized into the consuming cloud environment through the Library transfer helper and verified before rendering. The owner approved these recordings and deployment; no new generation or purchase was used. We do not assert that their external samples/composition rights were independently audited.

## Loop decisions

| Garden | Original interval (seconds, rounded) | Period | Estimated beat grid | End blend | Constant gain |
|---|---:|---:|---:|---:|---:|
| 足立区梅島公園 | 5.650–27.470 | 21.820 | ~88 BPM / 32 beats | 80 ms | −5.6 dB |
| 虹の草原 | 4.603–20.088 | 15.485 | ~62 BPM / 16 beats | 60 ms | −5.2 dB |
| ふたつの輪の木陰 | 0.482–28.728 | 28.246 | ~68 BPM / 32 beats | 60 ms | −7.1 dB |
| 白つぶの草庭 | 3.525–19.529 | 16.004 | ~120 BPM / 32 beats | 80 ms | −6.9 dB |
| 水辺の星くず | 5.640–20.197 | 14.557 | ~66 BPM / 16 beats | 100 ms | −8.2 dB |

These are estimates from onset autocorrelation, local onset recurrence and pitch-class spectrum comparison, not a hand-transcribed score. Near-boundary recurrence (onset correlation / normalized chroma similarity over ~0.75 s) was approximately .997/.998, .999/.992, .976/.924, .996/.996 and .981/.956 respectively. In particular, #5's proposed long interval reaches its terminal fade; the shorter recurring interval avoids that fade and has substantially stronger local recurrence. #4's 16-second interval has stronger local harmonic recurrence than the proposed 24-second interval. Similarity metrics do not prove a subjectively seamless melody or harmony.

The reproducible renderer `scripts/music35/prepare_runway_five.py` verifies all original hashes, decodes stereo 44.1 kHz and preserves the selected recording. A raised-cosine blend replaces only the final 60–100 ms with the original pre-roll immediately preceding the start. The period is **not shortened** by the crossfade. Overlap phase/power checks found no severe cancellation: mixed power relative to the incoherent blend expectation ranges from −0.63 to +0.89 dB. No time stretching, pitch shifting, composition, instrument substitution, compressor or limiter is applied. Constant gain brings the recordings close to the existing garden tracks' approximately −19 LUFS, while retaining their original dynamics.

PCM16 WAV avoids MP3 padding and another lossy encoding. Each file has a 20 ms cyclic prefix/suffix for 48 kHz resampling. The optional `startOffsetSeconds` passes through the garden adapter; both initial playback and encounter return start at 20 ms, and loop only the central interval. The existing source scheduling, pause, mute, gain and one-buffer cache remain unchanged. The five WAVs total about 17 MB; the largest is ~5 MB, with ~10 MB decoded float PCM. Assets are fetched on demand, never all preloaded. Old five MP3s remain available for already-cached clients. The other 30 recordings and catalogue records are unchanged.

## Verification and limits

Tests use the production catalogue without overriding readiness. Native Chrome/WebKit decode at 44.1/48 kHz and render three cycles with OfflineAudioContext, checking both channels at all boundaries for signal and sample discontinuity. Separate real-time AudioContext tests run each recording across two complete periods without restarting and sample actual output around each boundary. These are decoded/output-signal checks, **not subjective listening**. Real game tests cover all five routes at 320/375/402 px; existing music/encounter/petting suites cover settings and effects coexistence. Node tests verify exact PCM guards, hashes and optional offset isolation. The one-output-sample resampling tests use the absolute loop endpoint (including the prefix) instead of incorrectly treating the loop period as the file's endpoint; rejection of two or more missing endpoint samples remains tested.

No human/subjective audition or physical iPhone test was performed in this environment. User approval applies to the original recordings, not a claimed audition of these processed boundaries. Native output, numerical seam measurements and recurring beat/chroma evidence support the selected joins but cannot guarantee subjective musical preference. Automated WebKit is not iOS 15 hardware. Final CI and production hash verification are recorded in the PR/release report.
