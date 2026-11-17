# Third collection ending — approved release

The owner approved `omochi-ending03-preview40.mp4` for deployment. The public copy is losslessly remuxed for WebKit compatibility, never re-encoded:

- `public/game-endings/omochi-ending03-approved-40.mp4`
- Approved source SHA256 `07f3c56a3a71a6287bec79ef9c5fbe6b7cb34a80881e7fcaa29d6f736589940e`
- Delivery SHA256 `dbc8d5e51b20e859ad3c631741aa9b489171343e655825c87e521900c377f1d8`
- 5,589,207 bytes; 40 seconds; 720 × 1280, 24 fps; H264 / AAC stereo 48 kHz.
- Runway-generated fictional garden, not field-recorded wildlife. Original mathematically synthesized score, no third-party music samples. Shared logo, Zen Old Mincho text, furigana, thanks and credit retained.

Five registered crow species and the existing `crows` achievement ID/condition remain unchanged. Existing completed histories are not reset. The movie uses the same explicit sound/play gesture and viewport player as endings one and two. No save schema, economy, family, names, bird identity, PRNG or achievement logic changes.

The owner allowed briefly passing background/foreground birds. B/C retain their original motion; frame inspection found occlusion, not fusion. D uses its stable final 2.5 seconds at half-speed, avoiding the earlier malformed bill. A uses its first 3 seconds. The planned shadow and matching preening action were not reproduced; the actual on-screen prose does not claim them. These limitations were disclosed before approval.

Independent frame/identity and final subtitle inspection completed; full decode succeeded. Subjective audio audition and a physical iPhone test were not performed. Browser native media decoding/play/pause/seek/ended tests are playback plumbing checks, not a claim to have watched or heard the whole film.

## Compatibility correction
Original bytes stalled in native WebKit at approximately 0.17 seconds, independently of game state or muted audio. Stream-copy remux changes seven container metadata bytes only. Every video/audio packet payload, PTS, DTS and duration is identical (2,836 packets); see ending03-compatibility-remux.json. Chrome and WebKit standalone tests are followed by the game lifecycle gate. This is not a newly generated or re-encoded film.
