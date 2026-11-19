# Final garden music batch: 29 / 31 / 32 / 33 / 34

Base: f03185ffec57541182dc3085acc8e15fbd055ddf. Only these five routes and the necessary independent Bach attribution change. Unified garden credits UI remains deferred.

| Garden | Original interval / period | Gain | Delivery |
|---|---|---|---|
| 29 tsukiakari | 102.8049886621–126.8049886621 s / 24 s | −5 dB | PCM WAV |
| 31 hanadokei | supplied BWV645 bars 2–22, 70 s | +4.2 dB | 192 kbps MP3 |
| 32 onsen | 33.0449886621–94.7592743764 s / 61.7142857143 s | −7.4 dB | PCM WAV |
| 33 bali-terrace | 71.8649886621–83.0930588376 s / 11.2280701754 s | −9.2 dB | PCM WAV |
| 34 bird-masked-finch | 81.1–141.1 s / 60 s | −6.8 dB | PCM WAV |

Original Library identities, versions, checksums and delivery settings are in `garden-batch-six-runway.json` and `garden-bach645.json`. Original downloads are retained outside the repository. The four Runway recordings are not re-composed or time-stretched. Period-preserving 40 ms joins and 20 ms cyclic guards avoid terminal fades; playback starts at the guard end. Bach uses the supplied lossless master of the identical independent performance, not a new performance or the unused Runway waltz. Its existing cyclic tail is retained, with 20 ms guards and explicit 0.02–70.02 s loop.

Signal comparison includes several seconds of pitch-class and onset-envelope context. Approximate pulse estimates are 80 / 70 / 85.5 / 80 BPM for 29 / 32 / 33 / 34; these are not certified score transcriptions. For 33, a longer 56.92 s candidate had weaker onset recurrence (~0.646); the chosen 11.228 s candidate improved onset (~0.950) and pitch-class (~0.986) agreement. Other selected pitch/onset comparisons are ~0.995/0.995, ~0.933/0.890 and ~0.996/0.998. Detailed numerical evidence is in `garden-batch-six-signal-review.json`. These measures support boundary selection but do not prove subjective musical naturalness. No subjective listening claim is made.

Four WAVs total 27,713,032 bytes; Bach MP3 is 1,682,746 bytes. Only the selected track is requested. No shared audio-engine change is required. Integrated level is approximately −19 LUFS (Bach −19.3), with negative true-peak headroom. Browser checks must verify actual decoded 44.1/48 kHz output and real elapsed two/three periods, routing, transitions, mute, encounter resume and mobile widths without shortening elapsed time.

## Bach source and limited license scope

J. S. Bach, Wachet auf, ruft uns die Stimme, BWV645 (public-domain composition); Bart Golsteijn's ©2006 Mutopia 601 digital edition/MIDI, CC BY-SA 2.5. Official LY/MIDI downloads were byte-compared with the supplied package. The provided score image was inspected for the excerpt/repeat; no complete note-by-note authenticity claim is made. Ornaments are simplified, synthetic organ registration/room are used, and no existing recording, soundfont or recorded samples are used. Public `audio/gardens35/bach-bwv645-license.html` links the source, license, changes, MP3 and compact source archive. Both generated static and dynamic existing credits pages link it. ShareAlike applies only to this independent audio/adaptation and associated licensed materials, not the game or unrelated music.

## Protection and recovery

`garden-batch-six-output-audit.json` compares every prior protected file with the prior sealed release before updating the baseline. Only the five routing entries, necessary credits content, their cache references and seven new public files are allowed. Other 30 garden entries and all previously shipped audio/image assets are compared unchanged; save, score, RNG, birds, heartbeats, encounters and B icons are outside this change.

To revert only this release, revert its merge commit on current main, retain intervening unrelated work, regenerate and explicitly audit the protected output against the previous sealed artifacts, then rerun required tests and publish the resulting sealed commit. Do not restore or roll back user saves. The prior five audio files remain shipped for recovery.

Physical iPhone/Safari, iOS 15 hardware, mobile-network latency/device memory, and subjective listening are not verified by automated WebKit or signal analysis. Exact local/CI/published verification counts and hashes belong in the PR and release evidence after completion.

## Integration defect caught before release

The first browser pass caught the existing SPA router intercepting the new independent attribution HTML link and displaying the application 404. Both credits links now explicitly use `target="_self"`, an existing router escape, to perform a normal same-tab document navigation. The original click/content/license/download/back assertions remain intact; Node checks also protect the escape attribute. No global navigation or music engine behavior changes.
