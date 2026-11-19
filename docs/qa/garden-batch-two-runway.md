# Five approved garden recordings — batch two

This BGM-only release updates garden 15 松ぼっくりの回廊, 20 こだまの新緑庭, 8 葦の手紙, 9 栗いろの実り庭, and 12 赤い線の草みち. Current catalogue and garden-plan IDs are matched before editing. Names, visuals, other 30 records, every existing audio asset, runtime players, heartbeats, bird/encounter sounds, saves, scores and RNG remain unchanged.

## Provenance and processing

All five source files were materialized in this consumer environment through current Library helpers, with version 0 identity retained. Each SHA-256 exactly matches the supplied approved source hash. The JSON manifest records filenames, Library/file IDs, version, bytes, duration, source hash and provided generation references. No new generation, purchase or substitute recording was used. Style descriptions are production intent: organ flute pipes, original wordless forest humming, and timbral inspiration from đàn bầu/đàn tranh, mbira and kora. This is not a claim of authentic regional performance, of bird origin, or of reproducing another song, singer or traditional text.

The unchanged renderer reproduces the processing:

`python scripts/music35/prepare_runway_five.py ORIGINAL_DIRECTORY docs/qa/garden-batch-two-runway.json`

Only a short raised-cosine blend from the loop end into the original pre-roll before its start, and constant gain, are applied. The period is not shortened. No pitch shift, time stretch, composition replacement, compression or limiting is used. PCM16 WAV avoids encoder padding; 20ms cyclic prefix/suffix and existing loopStart/startOffset .02 exclude guards at initial playback and recovery.

| Garden | Original seconds | Selected original interval | Period / estimated pulse | Crossfade | Gain | Final LUFS / dBTP | Bytes |
|---|---:|---|---|---:|---:|---|---:|
| 松ぼっくりの回廊 | 76.852167 | 22.640000–48.240000 | 25.600000s / ~75 BPM, 32 beats | 40ms | -8.4dB | -19.0 / -8.5 | 4522940 |
| こだまの新緑庭 | 181.968917 | 47.860000–70.717143 | 22.857143s / ~84 BPM, 32 beats | 40ms | -7.4dB | -19.0 / -7.5 | 4039100 |
| 葦の手紙 | 158.197500 | 68.640000–94.270000 | 25.630000s / ~75 BPM, 32 beats | 40ms | -7.5dB | -19.0 / -7.5 | 4528232 |
| 栗いろの実り庭 | 128.078292 | 54.690000–76.023333 | 21.333333s / ~90 BPM, 32 beats | 20ms | -7.1dB | -19.0 / -6.8 | 3770300 |
| 赤い線の草みち | 174.027708 | 139.830000–161.163333 | 21.333333s / ~90 BPM, 32 beats | 40ms | -7.5dB | -19.0 / -7.6 | 3770300 |

## Phrase/boundary evidence and limits

Pulse/bar descriptions are estimates, not a certified score or exact melody/chord transcription. Candidate selection compares pitch-class energy and onset progression in four- and six-second endpoint windows, as well as local samples and phase. Merely avoiding a click or silence does not establish perceived musical naturalness. The organ has less exact rhythmic recurrence than the others; its selection favors the broader pitch progression over the highest local/attack score. Its four-/six-second pitch similarity is ~.931/.938 and onset correlation ~.732/.755. Earlier-start alternatives have stronger local rhythm but weaker broad pitch progression; a longer 38.4s alternative did not improve the combined broad-context result.

葦 required a measured 25.630s period: forcing an exact 25.600s nominal tempo reduced four-second onset agreement to ~.604. The selected measured period and boundary recover ~.965 onset correlation and ~.978 pitch similarity without time-stretching the recording. The other three have strong four-second repeated progression. All candidates avoid terminal fades; 32 estimated beats preserve a recurring musical segment without transferring the entire long source. These metrics do not guarantee full-melody identity or subjective listening quality.

| Garden number | Four-second pitch / onset | Six-second pitch / onset | Crossfade phase correlation / mixed power vs incoherent expectation |
|---|---|---|---|
| 8 | 0.978 / 0.965 | 0.979 / 0.961 | 0.307 / +0.48 dB |
| 9 | 0.997 / 0.997 | 0.997 / 0.996 | 0.940 / +1.09 dB |
| 12 | 0.990 / 0.969 | 0.960 / 0.939 | 0.619 / +0.83 dB |
| 15 | 0.931 / 0.732 | 0.938 / 0.755 | 0.678 / +0.83 dB |
| 20 | 0.993 / 0.994 | 0.948 / 0.978 | 0.638 / +0.81 dB |

## Transfer and verification

Five WAVs total approximately 20.63 MB, but the existing player fetches/decodes only the selected track and keeps its single selected buffer cache; it does not preload all five. Each file is approximately 3.77–4.53 MB; the largest decoded stereo float buffer is approximately 9.86 MB at 48kHz. Switching may temporarily hold old and new buffers. These are asset/buffer estimates, not a physical-phone memory benchmark. Existing serialized decode, timeout, gain transitions, mute and interruption logic are unchanged.

The scoped Chrome/WebKit suite tests each recording independently at 44.1/48kHz for native decode/output, three offline-rendered cycles, correct first/return offset, garden switches, crow/raptor recovery, mute, pause/resume and off. Each track also crosses three complete real-time cycles at 48kHz without source restarting. Each of 320/375/402px real-game checks covers all five garden IDs and settings. Existing general music and saved pet-heartbeat suites remain required. Aggregate check/all Node/build, final-commit CI and production artifact/audio/UI checks are recorded in the PR and release evidence.

Subjective listening, physical iPhone/Safari, slow mobile networks and whole-app memory are not verified. Native browser output and signal checks are not claimed as subjective listening. User PC browsers and actual player saves are not used. No concrete failing musical seam was identified in the analyses; hearing limitations remain explicit.

## BGM-only rollback

From then-current main, restore only the affected garden metadata from base `4efc71d` to the retained original garden-08/09/12/15/20 MP3s, in a new PR. Leave both old and new assets available for cached clients. Rebuild, audit actual protected-output/cache-version changes against that current main, rerun aggregate/scoped checks, deploy and compare production audio/routing. Do not reset main, roll back player saves, or overwrite unrelated later baseline changes. This procedure is documented, not executed. Icon B and subsequent songs are outside this release.

## Exact source and finished hashes

- 松ぼっくりの回廊: source `4822b52657c5e67d98f068c456164b80344d7b10eb00ae42197ddcab22627ad5`; served WAV `aa255c66cbf538d76130f905e7d58166f5626a70645af0e1c3590673d3c3cd3c`.
- こだまの新緑庭: source `13cf73c0b8910e15747485b55aee0dcb343a48c47ee48f9d52959f12d37e1a00`; served WAV `4373ae86650bb1a080c2c432ace3df82ee0f9727767fff39deb679d163101539`.
- 葦の手紙: source `2c98ba083db06b3ace32c479ac198e94fde053f49c6bb3c37bd97bd0f758540b`; served WAV `55f17196f2f4db34b96462dc1bbd46f54d16e1cf3af58c6ea4daaddb2216e84a`.
- 栗いろの実り庭: source `6e705c314ae85196ccbac9668ce6e65022226dd288a46f7de1605c13afefac25`; served WAV `ef873efd1c769e83d096672b67991ac847eed0ee7cf48ad7fa95abea030c0383`.
- 赤い線の草みち: source `4868950cf07495166ee12b05d70c24bfc1398ab3883090080387fa1beacc6c64`; served WAV `14c36438f6d31bbcf7277996a7a0795ca8251aaa9f4b49bb57d9885a97fcbe51`.
