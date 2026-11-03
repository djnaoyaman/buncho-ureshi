# Game audio

The four original user-provided pastoral WAV loops are served unchanged from this origin. Only the selected track is fetched and decoded. A single decode lane coalesces stale requests; one decoded buffer is cached. Switching fades the old loop before the next begins. OFF is immediate; hiding/leaving the game stops playback.

New music preferences are armed by default, but no AudioContext or sound starts on page load. A trusted game click unlocks native audio before asynchronous work. Explicit music OFF persists. Device/browser activation and output availability still apply.

Care audio is an original synthetic short chirp, not a real recording of Omochi. Feeding, petting, cleaning and valid conversation can respond after successful durable actions. Stale selection, hidden page, failed save, mute and route exit suppress late feedback.

The old save default was careSound=false without choice provenance. The current request changes the default to ON. At mount, unmarked old values become ON; a separate device preference (`buncho.care-sound-choice.v1`, explicit:true) records subsequent deliberate choices and takes priority when importing another world. A current-session mute is immediate even if storage is unavailable; browser storage failures may prevent preference persistence. Existing bird/Gem/family data and save version remain unchanged.

The game shell is independently styled from the editorial website. No sound is forced around browser autoplay rules. Automated native audio tests inspect decoded nonzero PCM and scheduled output graph, not a claim of physical iPhone or human listening verification.
