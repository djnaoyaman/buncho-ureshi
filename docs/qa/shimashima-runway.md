# しましま風の庭 — approved Runway recording

Garden 07 in `garden35-plan.js` is キンカチョウの「しましま風の庭」: garden `bird-zebra-finch`, theme `garden-bird-zebra-finch`. Names, IDs and visuals remain unchanged. The owner approved “しましま風の庭 - 風のしまもよう.mp3” for sequential loop preparation and deployment. `shimashima-runway.json` records the exact Library ID/version 0, file ID, 746250 bytes, source SHA-256 and supplied Runway task reference. The consumer workspace materialized the authorized source using current Library helpers; no generation, purchase or replacement recording was used.

## Interval and musical evidence

The source is 30.772167 seconds by ffprobe (30.7722449 seconds decoded at stereo 44.1kHz). Its last seconds fade: per-second RMS near 27/28/29 seconds is −19.1/−26.9/−29.4 dBFS. Full-file restarting and a 24-second candidate reaching that fade were rejected.

The selected interval is **5.730–24.930 seconds**, exactly 846720 samples / 19.2 seconds. The onset autocorrelation has a strong ~50 BPM half-time pulse and ~100 BPM candidate, consistent with a 32-beat interval at approximately 100 BPM. This is an estimated pulse/phrase length, not a certified transcription. A shorter 9.6-second candidate has strong recurrence but retains less of the approved recording. The 19.2-second interval preserves roughly eight estimated four-beat bars and stays before the terminal fade.

This decision uses more than a sample boundary: the four-second endpoint context has pitch-class spectral similarity ~0.913 and onset correlation ~0.893. Six-second context is ~0.862 / ~0.854; local 1.2-second context is ~0.898 / ~0.814. One-second windows immediately before and after both endpoints share a strongest A# pitch-class component. Endpoint 200ms RMS values are approximately −15.14 and −15.37 dBFS. These are evidence of compatible pitch-energy and rhythmic progression, not a complete chord or melody transcription or a subjective listening guarantee. The alternate 4.28-second start has a higher local score but worse four-second pitch progression (~0.822), so it was not selected merely for the smoothest local match.

## Processing and size

Reproduce with the existing renderer, unchanged by this PR:

`python scripts/music35/prepare_runway_five.py ORIGINAL_DIRECTORY docs/qa/shimashima-runway.json`

Only the final 1764 samples (40ms) blend into the original pre-roll before the selected start with a raised-cosine weight. The loop period is not shortened. Overlap correlation is +0.292 and mixed power versus the incoherent expectation is +0.34dB, with no severe cancellation identified. Constant gain is −8dB. There is no pitch shift, time stretch, new synthesis, compression or limiting.

The PCM16 WAV includes the existing 20ms cyclic prefix/suffix. `startOffsetSeconds` and `loopStartSeconds` are .02, `loopEndSeconds` is 19.22; initial play and recovery skip the prefix. Existing player support is reused without runtime changes. Final size is 3,393,980 bytes, integrated loudness −18.8 LUFS, true peak −8.1 dBTP, sample seam delta 0.00320435. SHA-256: `ad53ec3e2011901fc92bcc389b84f06dda55969bd2b81d236b594596b58f4fa8`.

Only the selected recording is loaded through the existing serialized fetch/decode and one-selected-buffer cache. A decoded stereo float buffer is approximately 6.79MB at 44.1kHz / 7.39MB at 48kHz; switching can briefly retain old and new buffers. These are buffer estimates, not whole-application memory measurements. The old garden-07 MP3 remains available for cached clients and rollback. Other 34 garden records and all previously referenced audio files are checked byte-for-byte against base `1a7f0d4`.

## Verification and limitations

The scoped native Chrome/WebKit tests check 44.1/48kHz decode/output and three offline-rendered cycles, three actual real-time cycles at 48kHz, initial offset, garden switch, crow/raptor priority and recovery, mute, pause/resume and off. Real-game 320/375/402px tests check routing/settings/overflow. Existing music and saved pet-heartbeat suites remain in scope. Aggregate check/build/all Node and the final commit's CI remain required. Production verification compares the sealed commit/build, all delivered files, the exact audio hash and mobile browser smoke results; final counts are recorded in the PR and release report.

Subjective listening, physical iPhone/Safari and slow mobile networks are unverified. Native browser output and signal continuity do not establish a human judgment of musical naturalness. No full-melody or exact harmony transcription is claimed. No user PC browser or real player save is used.

## BGM-only rollback

From then-current main, create a new PR restoring only `bird-zebra-finch` metadata from base `1a7f0d4` to `audio/gardens35/garden-07.mp3`. Retain both assets for cached clients. Rebuild, audit the real cache-version/protected-file delta against that main, rerun aggregate/scoped music checks, deploy and verify live hashes/routing. No save rollback or runtime rollback is needed. Do not reset main or overwrite later unrelated changes with an old shared baseline. Rollback was documented, not executed. Other garden releases and icon work are outside this PR.
