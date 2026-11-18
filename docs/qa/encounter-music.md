# Encounter music

Source: user-approved 30.772-second stereo MP3 previews. No additional generation or purchase. Original SHA256 and derivative measurements are recorded in encounter-music-pcm.json.

Processing: decode with FFmpeg to float32 stereo 44.1kHz; remove the first 2646 samples (60ms, including the detected ~51ms initial silence). Blend the final 11025 samples with the first 11025 using a linear 0→1 weight, discard those first 11025 samples, and quantize with round(sample × 32767) to PCM16 WAV. Result: 30.462244898 seconds. The last sample connects to its original next sample at the loop boundary. This avoids MP3 encoder padding and an added silence gap. The 250ms transition is a technical crossfade, not a verified musical phrase boundary.

Peak PCM is below 0.407. The lowest 20ms RMS exceeds 0.0052 (crow) / 0.0154 (raptor); exact WAV hashes, sample format, cyclic RMS and seam bounds are covered by Node tests. Subjective listening to the processed loops has not been performed by the agent; the user approved the original previews. Physical iPhone/Safari listening remains a manual check.

The music scene is read-only world presentation state. Crow warning/visiting and any active raptor (including friendly visits) override the normal target. They are not offered as persistent selections. Scene events are authoritative once received, so older panel-only garden events cannot reset a fixed choice. Departure, warning cancellation and home restore the current underlying selection. Explicit OFF persists; pause/background/ending invalidate pending work and require a fresh trusted gesture. Late decode results recheck generation, current target and running context. One decode lane and one cached buffer remain.

No lottery probability, damage, cooldown, save schema or game RNG changes. PR229 separately edits predator frequency; its merged main (86ee58a) is integrated unchanged and all gates are rerun. The protected baseline was compared to all 581 original main build files before updating: only four implementation modules and cache version references differ.

Independent review found and verified fixes for panel-induced fixed→auto selection, OFF while paused, and interrupted-context late decode. The reviewer independently reran all 122 music/UI tests successfully. Browser tests use real native AudioContext in Chrome/WebKit and isolated test saves; they do not prove physical Safari behavior.
