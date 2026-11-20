# 型① #256 の公開後byte照合

今回のリリース識別子 `garden-actors-type-one-pr256` が前のmain commitにはなく、現在のmainに入ったpushだけを選択する。識別子は `.github/pages-byte-verification.json` に保存し、後続の無関係なpush・workflow_dispatch・PRでは公開URLを取得しない。前のmain SHAが不明・ゼロ・不正ならfailし、範囲を推測しない。この選択はmerge/squashどちらでもファイル内容で判断する。通常の同一run再実行では同じbeforeを用いる。

既存build/browser/verify/deployの条件、権限、Actions artifact封印、main公開の直列化は変更しない。追加のverify_liveはbuildの選択とverify/deployの成功後だけ、contents:readで実行。同じrunの `verified-build-${github.sha}` を正規download-artifactで取得し、SHA256SUMSとSOURCE_SHAを再検査して復元する。再buildや別runの成果物の代用はない。外部環境へ成果物を取り出さない。既存のartifact retentionはそのまま。

取得先は `https://djnaoyaman.github.io/buncho-ureshi/` の固定パスのみ。環境変数やCLIから別URLを指定できない。復元distの全通常ファイル（空ファイル・.nojekyll・音声・原画を含む）について対応するURLを1回GETする。パス脱出、symlink、空inventoryを拒否。リダイレクト・別URL・成功までの再試行は使わない。4並列、各応答30秒、job20分。200応答のbyte数とSHA256が全件一致しなければ失敗。取得本文はstreamで処理し、保存・uploadしない。ログ/summaryは件数と合否のみ。

通常の `npm test` が `tests/*.test.js` を実行するため、PRでも照合と範囲判定の検査が必須buildに含まれる。検査はlocalhost fixtureで固定公開URLを模した応答を使い、本番へ通信しない。正常、同サイズ改変、短い/過大応答、404/503、redirect不追従、timeout、一部失敗、空inventory/symlink、並列上限、パス境界、実git履歴による今回/後続/PRの判定、既存公開gate/権限、別SOURCE_SHA・破損tarの拒否を検査する。

公開後に失敗した場合はすでに公開済みである。runを失敗にするが、自動rollback・再公開は行わない。CDN遅延/ネットワーク不良でも不合格になる。全件照合は約0.5GBのGETを伴う。distにない旧ファイルの残留や、同じbyteを持つ別commitの識別までは保証しない。実ゲームのタップ・BGM・画面回転スモーク、実機iPhone/旧iOS/GPUの確認を代替しない。

外部artifact/log取得のForbiddenを解消する変更ではない。外部での再試行や代替経路は使わない。初回のActions内公開後ジョブ自体はmain公開まで未実行であり、ローカル検査やPR CI成功と区別する。
