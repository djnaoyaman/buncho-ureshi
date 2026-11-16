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
