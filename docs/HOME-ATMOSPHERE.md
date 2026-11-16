# 暮らしの呼吸

## 第1段階：確定済みのおうち

`home-atmosphere.js` は既存worldから都度作る読み取り専用投影。保存形式・世話・報酬・乱数・時間進行の条件には使わない。食事の80/60の表示帯は幸福度でも報酬条件でもなく、100から99へ下がっても同じ情景を保つための表示上の区切り。

生きている家族の食事平均と元気の最低値、清潔と落とし物、選択個体・成長・場所・健康を参照する。既存家具の形・色・仕上げの中で粒を描き、器の台に少数の殻を置く。床汚れは既存表示だけを使う。水の義務や新しい状態はない。

保存エラー/memory、危険/病気、独自画面の順に装飾より優先。プレビューには投影を渡さない。死亡個体、卵・雛、来訪者は家族の空腹を代弁しない。背景・鳥画像・音源は変更しない。

公開済み b66f7bdee6f011dd6238b11a8ba17a15674e39c9 を別ディレクトリで再buildし、旧保護baselineと照合。候補との64差分を5本の表示ソースとキャッシュURLのみと検査した記録が `home-atmosphere-1-output-audit.json`。新投影を保護対象へ追加した。

## 検査記録（公開前）

- 純粋投影・24家具・健康/死亡・world交換：Node 6件成功。
- 構文・コンテンツcheck成功。
- 初回全Nodeは2,140件中2,138成功。後半build終了前の実行による2件は完成出力で再検査し9件すべて成功。完成build後の全件再実行とCIで最終確認する。
- Chrome for Testing：新規320/375/402px 3件、既存家具/ナビ7件成功。プレビュー分離、画像decode、同じ保存、横画面を含む。
- 正式なChrome/WebKit CI、マージ、本番sealed dist照合は未完了。手動dispatchはPR baseと方式が違うため範囲チェックで停止。検査除外・baseの偽装はしない。
- iPhone 17 Pro、およびiPhone 7 / iOS 15.8.8の実機確認は未実施。最新WebKitと旧iOS実機は同一視しない。

第1公開の検査・公開照合後、世話の前後反応、静かな動き、暮らし全体の仕上げを順に別PRで公開する。

## Release 1 published

PR #214 was merged by the owner as e6244218fe906fb5430416edcd55b6bde0ddb94e. Main CI run 43805636140 passed build, all 2142 Node tests, 20 Chrome/WebKit cases, verify and deploy. The official sealed artifact ZIP digest was dba7c7054c02135ac1c867d0c236f8778c2d4691eba2a90f6eb3094ec0badcd3; its SOURCE_SHA, tar checksum and all 577 protected files were verified. Seventeen live files including both home backgrounds, white pose/care art and miniature navigation matched the sealed dist. Public URL: https://djnaoyaman.github.io/buncho-ureshi/game/ .

An additional local Chrome-for-Testing check against production could not navigate because this cloud browser reported ERR_CERT_AUTHORITY_INVALID. Certificate verification was not disabled. Formal prepublication Chrome/WebKit checks succeeded; physical iPhones remain unverified. Check the actual equipped dish, sparse feed, room background and unchanged navigation on those devices.

## Release 2

Ephemeral responses use only completed durable transaction results. No response is stored, and no engine, reward, history, clock or RNG logic changes. Feed pecks, touch preens, speech tilts, then the existing atlas rests. Full touch/speech can respond without adding rewards; an unchanged full feeding does not invent a meal. Family care includes only changed individuals. Cleaning and collecting use the same room daylight, without duplicating floor soil. Failed saves/memory mode never claim a durable success. Selection, navigation, hidden/pagehide, world/revision replacement and disposal cancel the response and restore the original care portrait. Reduced motion/pause/settings show a static resting response.

The focused family-care browser tests still expected the old per-action uncapped rewards (86/42/56 Gems). Running the unchanged prior engine confirms 20 initial + 10 daily extra = 30 Gems, for both 2 and 6 residents. These assertions now use 30; the action, focus, identities, history, save and concurrent-tab assertions remain. No failed test was excluded. The native CDP multi-touch case already requires a Chromium touch project and is inapplicable to the prescribed desktop Chrome/WebKit lane.

## Release 2 published

PR #215 merged as b52e050ee38a9256d2f622bf0a12ccefc41783e4. Main CI 43812697178 passed build, check, all Node tests, focused Chrome/WebKit, verify and deploy. Sealed artifact ZIP digest: 37643e544e3de3fa28ea9616d19b14e796e85e013d3da4a44b8c673a6fd73a13. SOURCE_SHA, tar checksum and all 578 protected files verified; 18 live files matched, including backgrounds, bird art, navigation, response module, engine and store. URL: https://djnaoyaman.github.io/buncho-ureshi/game/ . Physical iPhones unverified.

## Release 3

Actual equipped water/bath fill geometry receives gentle opacity variation; no new bowl or displaced reflection is overlaid. Preview artwork stays unchanged. Existing atlas rest/preen poses follow individual energy and only an actual rest action; social targets, illness, guests, young and non-home locations retain existing behavior. The existing active presentation clock supplies independent deterministic variation. No audio or new interval is added. Hidden, pagehide, pause, reduced motion, settings and higher-priority screens suppress motion.

## Release 3 published

PR #216 merged as 02e7db85466672f96a16c98dfedf8a8eb09c7679. Main CI 43822651802 passed build/check/Node, Chrome/WebKit, verify and deploy. Sealed ZIP digest: 99ed88d05cc21e96267aa966119a1666409fb4bab3267d012020b0568a83bcd4. SOURCE_SHA, inner checksum and 578 protected files verified. All 18 sampled live files match this sealed build. Public URL: https://djnaoyaman.github.io/buncho-ureshi/game/ . Physical iPhones unverified.

## Release 4

The existing device/orientation notice now immediately suspends decorative motion and cancels transient care responses, restoring the original portrait without replacing the form or its draft. Returning to the view resumes only current-world poses. Listener cleanup is paired with mount disposal. The selected guest's actual illness also takes priority over decorative atmosphere. Engine/save/rewards/RNG/audio remain unchanged. Continuity checks cover treatment, caretaker expiry, clock reversal, restored worlds, nests/empty homes, independent panels, friend return, emulated phone rotation, drafts/focus and saved state. Prior full Node coverage protects garden events, succession, diary, gacha and endings; visual projection never changes their conditions.

### Release 4 publication gate and follow-up

PR #217 passed all 2,156 Node tests and 42 Chrome/WebKit cases (CI 43824332229), then merged as 2ca18f626ff1963f4c82a27686ced4683ed22ff4. Main CI 43825415673 correctly blocked publication: 41 browser cases passed, but WebKit at 375px lost the native disclosure click before rotation. The trace places that click at the 850ms care-gesture timeout, which replaced the entire sheet. The 1,200ms and 3,400ms new response timers also performed unnecessary full renders. This is a product interaction race, not an infrastructure failure. Production remains at release 3 until the corrected build passes every gate.

The follow-up updates only transient pose subtrees/attributes and removes completed gesture marks in place; none of those three timers replaces the input or disclosure. The original failed test remains unchanged. A new regression asserts node identity at settling and completion, native disclosure opening, draft/focus and exact saved-world preservation. The output audit compares all 578 files of the unpublished but verified main artifact and allows only game.js functional changes plus cache URLs. No baseline or test exception hides the failure.

PR #218 passed Node 2,156 and Chrome/WebKit 44 (43826997233), then merged as 4cb33a772cfcd51fd1499c90edc2ab08b8f41d2e. Main CI 43828154458 exposed a separate test-design race in the cleaning case: the normal 3-second poll clears two dirtySinceAt values and increments revision after cleaning, while the expected world represented only the clean transaction. Freezing Date.now did not freeze browser timers. The test now controls browser time for individual receipt assertions, then explicitly advances 3 seconds and compares the entire world to advanceObservedWorld, including exposure reset and revision +1. No product file or protected baseline changes in this correction; all cases remain required. Both failed main runs correctly prevented publication.
