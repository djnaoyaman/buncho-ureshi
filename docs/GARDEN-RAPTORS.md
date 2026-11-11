# Rare raptor visits

This is a fictional game mechanic, not a wildlife encounter or husbandry guide.

## Behavior

- After three continuous foreground seconds in a ready garden, one shared entry lottery has a 25% chance of selecting a crow or raptor. When both families are available, their weights are 5:5, so each has a 12.5% chance in that draw. If only one family is available, it keeps the full 25% chance. This entry lottery draws once per visit, with at least two minutes between draws across garden changes and panel resets in the same game session.
- After two continuous foreground minutes in a ready garden, a separate random source checks once per minute at 1%. It never consumes the world's deterministic random stream.
- A brief host save defers a due sustained check until the next free poll without moving its deadline. Missed checks never accumulate: after one draw, the next remains one full minute later. Scene exclusions and cooldowns retain their existing delay; the entry lottery, saved warning and save format are unchanged.
- Arrival does not require an accompanying protagonist. With no eligible protagonist actually present, the raptor visits for 18 visible seconds with no target and cannot harm household birds. A later attendee or successor never becomes the target of an existing targetless visit. No attacks are redirected to another family bird or a garden NPC.
- One saved arrival per rolling 24 hours, shared by all gardens and nine species. Time moving backwards does not unlock the cap. Existing crow visits and warnings cannot overlap a new raptor event.
- Black Kite, Northern Goshawk, Peregrine Falcon, Ural Owl, Common Kestrel, Japanese Sparrowhawk, Golden Eagle and Brown Hawk-Owl give one full visible minute to return home.
- The warning names the bird, shows remaining seconds, explains the accident risk and provides a home button. The same exit is available in notebook, settings, bird sheet, reset, adoption and draw-result dialogs. Navigation alone does not delete the warning.
- An Osprey only arrives in the water garden (`mizukagami`), catches fish in the presentation and is harmless from the outset. Friendly birds and Osprey are only pictured in their arrival garden and leave after 18 visible seconds.
- Each discovered species can be stroked in its notebook entry. At 100 friendship points that species no longer attacks. Reaching 100 during a warning also makes the current visit harmless.
- A hostile expiry records `accident` through the existing death operation, creates the same memorial record and invokes the existing eldest-living-child succession in one transaction. No family, possessions, currency or history are removed. A warning is bound to the saved protagonist ID and never transfers to a successor.

## Saved clock and safety

The root save remains version 11; the encounter sub-schema moves from 12 to 13 only after validating the old schema. Existing records are unchanged apart from the encounter version. A new targetless arrival uses an explicit null target, a canonical `species:time:none` event ID and nonhostile status. Legacy schemas continue to require real target IDs. Existing targeted warnings retain their exact identity, remaining time, progress timestamp, friendship and cooldown. Older tabs reject encounter version 13 before writing.

Only bounded foreground samples of at most 2.5 seconds advance an active warning. Hidden tabs, offline state, pause and long suspended timer gaps do not catch up. Reload restores the remaining time, not a new minute. Returning home removes the active event, retaining friendship and the 24-hour cap.

Each transaction checks world ID, event ID, remaining time and last progress timestamp. It takes the intersection with the latest committed wall interval, so overlapping tabs do not double-charge time. Unrelated world revisions may advance without invalidating a still-current event. Failed persistence retains the previous saved warning and reports an error; it cannot apply an unsaved death.

Before an arrival commits, changes of world, target, garden, tab visibility, modal or view invalidate the pending draw. Existing warnings are not cancelled by modal or notebook navigation. A short first sampling interval after mounting/resuming is intentionally not treated as elapsed observed time.

A local save is not a tamper-proof server account: manually editing a valid save or deliberately restoring an earlier backup is outside these protections. Unsupported/malformed shapes and impossible hostility records are rejected without overwriting the existing save.

## Artwork and scale

Nine original 900px transparent illustrations use species-specific adult morphology. Male exemplars are stated for Goshawk, Peregrine, Kestrel and Japanese Sparrowhawk. Japanese Black-eared Kite has the reviewed blue-grey feet and cere.

`RAPTOR-ART-ASSETS.json` records exact image hashes, alpha bounds, foot anchors and annotated straight-line projected bill-to-tail lengths. `RAPTOR-JAVA-AXES.json` measures the same axis for all four right-facing Java Sparrow atlas colors. Shared pixels per centimeter use the game's existing Java Sparrow representative length of 14cm. Upright owls do not misuse a horizontal bounding box as their body length. Natural poses, illustration projection and individual size differences remain approximations, not literal specimen measurements.

Unknown notebook entries show each species' actual silhouette, without its name. Osprey is in a distinct harmless water-bird section rather than being labeled an attacking enemy.

## Validation

Pure tests cover exact expiry, save round trips, old schema migration, malformed data, rollback clocks, daily quota, multiple tabs, species friendship, Osprey habitat, crow exclusion, target replacement, accident graves and succession.

Controller tests cover visible dwell, hidden/offline/pause/suspension, all menu navigation, queued transaction interruption, failed saves, per-species keyboard petting and the host's transaction busy state. Browser tests exercise all nine illustrations in the real game, tiny screens, foot/scale geometry, safe return, reload, modal escape, accident succession and the live lottery clock. The `Garden raptor encounters` workflow runs Chrome and WebKit and saves screenshots/traces.

## 2026-11-11 警告と回避の案内

確率・時計・標的・事故・保存形式は維持し、説明と警告の見せ方だけを更新。
来訪の25%抽選と事故判定を区別し、カラスの影から6秒・猛禽の警告から1分を案内する。
猛禽の残り時間が10秒以下なら、見出しを「すぐおうちへ！」、既存の帰宅ボタンを
「今すぐ帰る」に変更する。点滅・音・新しい自動操作は追加しない。
毎秒の表示更新は既存ボタンを置き換えず、キーボードのフォーカスを維持する。
主人公の同行なし・なかよし・ミサゴは危険表示を出さない既存ルールのまま。
庭のことには来訪の抽選、被害、帰宅操作、猛禽警告が再読込後も続くことを記載する。

合成保存で、10秒境界・保存不変・既存の標的なし表示を検査。
Chrome/WebKitで狭い画面・横画面、警告更新中のフォーカスと帰宅後の生存を確認する。
公開は必須検査とPages成功、配信ソースの照合後に完了とする。
