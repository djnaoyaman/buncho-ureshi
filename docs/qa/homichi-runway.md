# 白い帽子の穂道 — approved Runway loop

The unique current match for the owner's “穂道” is garden 06 in `garden35-plan.js`: **白い帽子の穂道**, resident ヘキチョウ, garden `bird-white-headed-munia`, theme `garden-bird-white-headed-munia`. Names and IDs remain unchanged. The owner approved “穂道 - 穂をなでる風.mp3” for loop preparation and deployment. Its Library version 0, original file ID, SHA-256, 660360 bytes and generation reference are recorded in `homichi-runway.json`. The consumer environment materialized this exact item through current Library helpers; no new generation or purchase occurred.

## Choice and limitations

The source decodes to 27.193469 seconds at stereo 44.1kHz. Its last seconds have an explicit fade: per-second RMS around 24/25/26 seconds is −18.9/−24.1/−34.5 dBFS. The ~25.263-second recurrence reaches that fade, so merely restarting the complete file or using the highest similarity candidate is unsuitable.

The selected interval is **6.980–19.6114966 seconds**, 557049 samples / 12.6314966 seconds, approximately 16 beats at 76 BPM (the onset analysis also finds the double-time pulse around 150–152 BPM). This is an estimated beat grid, not a transcribed score or certified meter. A 1.2-second neighborhood around the two endpoints has normalized pitch-class spectral similarity ~0.927 and onset correlation ~0.960. The strongest pitch-class component on both sides of both endpoints is C; that describes spectral energy, not a complete chord or melody transcription. Both endpoints sit in sustained matching material, avoiding the terminal fade and a timing-shortening edit.

Broader four-second context does **not** reproduce the whole harmony identically (pitch-class similarity roughly 0.65–0.68 for this half-period, despite strong rhythmic recurrence). The decision uses a recurring boundary within a ~16-beat segment, not a claim that the entire original melody repeats after 16 beats. No subjective listening was performed: native audio playback, waveform/output measurements and pitch/onset analysis are available, but this agent has no subjective hearing assessment. Technical continuity is not a guarantee of perceived melodic or harmonic naturalness. Physical iPhone/Safari testing is also unperformed.

## Minimal processing

The existing verified renderer accepts this manifest as an optional argument; its default five-recording behavior remains unchanged:

`python scripts/music35/prepare_runway_five.py ORIGINAL_DIRECTORY docs/qa/homichi-runway.json`

Only the last 3528 samples (80ms) blend into the original pre-roll preceding the selected start, with a raised-cosine weight. The period is preserved exactly. The overlap has positive correlation ~0.384; mixed power is +0.52dB relative to the incoherent blend expectation, not severe phase cancellation. Constant gain is −7dB, with no time stretch, pitch shift, composition replacement, compression or limiting. The final PCM measures −19.10 LUFS integrated and −6.40dBTP; its sample seam delta is 0.00238037 before browser resampling.

PCM16 WAV contains the existing 20ms cyclic prefix/suffix. `loopStartSeconds` and `startOffsetSeconds` are both .02, with explicit loop end. The production player's existing adapter already supports these fields, so no player, save, score, probability, sound-effect or heartbeat code changes are needed. The new asset is 2,235,296 bytes; its single decoded float buffer is ~4.47MB at 44.1kHz (~4.87MB at 48kHz), smaller than the prior 48-second track's ~16.9MB. Switching can briefly retain old and new buffers; these figures are not whole-application memory measurements. Fetch/decode serialization, one selected buffer cache and existing timeout/mute/restore behavior are preserved. Slow mobile networks and physical iPhone memory behavior are unverified.

## Checks and rollback

The targeted native Chrome/WebKit suite checks 44.1/48kHz decode, three offline rendered cycles, three complete real-time cycles without restarting, start offsets, actual output, garden switches, crow/raptor priority and return, mute, pause/resume, and real game routing at 320/375/402px. Existing music and pet feedback suites retain sound/heartbeat/persistence coverage. The six guard fixtures explicitly verify the original five and this recording; the remaining 29 tracks still require zero loop offset. Other 34 catalogue entries and all prior audio assets are compared against published base `0ee8f6f` without changes. Final results are recorded in the PR and release evidence.

For BGM-only rollback, create a new PR from then-current main and restore only this garden's metadata from `0ee8f6f` to `audio/gardens35/garden-06.mp3`. Keep both files for cached clients. No player code or user saves need reverting. Rebuild, audit the actual protected-output/cache-version delta against that current main, run required aggregate/scoped audio checks, deploy and compare production routing/audio hashes. Do not reset main or blindly restore an old shared baseline over later unrelated changes. Rollback has not been executed.
