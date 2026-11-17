# 第1作「どこへ行っても、帰る場所」

## 承認素材
2026-11-17 01:06 UTCの「これOK」に基づく修正版。旧素材73a693...は採用しない。
Library ID: libfile_fde3_f-342b12ddd2888191bd3d02e6e2ff44cc_1e5190e96ae0819195a4cad3042d859b
File ID: file_00000000e13c81fdacf4845225b1c43e
正式ファイル名: buncho-ending-01-rich-final-review.mp4 / version 0
SHA256: b32329f433baeb466c4b592ed998c81f3502880cc3cbecc7b058bfb01f09a2b4

消費側へ現行Library手順で取得し、元ファイルにLibrary属性を保持。public/game-endingsへ同じバイト列を配置した。追加生成・購入・再圧縮・映像音楽編集は行っていない。720×1280、9:16、約38秒、H.264 Main level3.1/yuv420p、AAC。全編映像/音声decode成功。実ピクセルの場面一覧と謝辞拡大で「おもちの文鳥ぐらし」、娘さんの「やってみたい」、感謝、2行の「企画・プロデュース」「みやざきなおや」を確認。フォントは承認版に焼き込まれたZen Old Minchoで、サイト全体のフォントを変更しない。

音声はトラック・全decode・非無音信号（平均-21.5dB、最大-6.3dB）を検査。ブラウザではクリック後の実メディア再生、muted=false、再生時刻進行を検査する。これは主観的な実試聴の代替ではなく、こちらで試聴したとは主張しない。承認済み音楽を含む元MP4と同一のhashを保持する。

## 保存と達成
root v20→v21が互換性境界。collectionEndings v2とentry構造は維持する。純粋変換はrootversionだけを変更し、名前・個体・家系・日時・報酬・RNG・既存達成・視聴状態・lease・revisionを変更しない。root17〜20は旧3IDのみ許可、新ID混入を拒否。旧v20クライアントはv21を保存前に拒否する。

新garden-tourは固定35庭の既存visitsがそれぞれ1以上で達成。35種の鳥を見つける既存gardenとは独立。既に訪問済みなら再訪不要。純粋なparse/exportでは達成を付けず、正常なfresh transactionで一度だけpendingを記録する。認識時tickは過去の訪問日時とは呼ばない。固定作品であり、実際の訪問順・同行個体や亡くなった鳥を復元した映像ではない。

既存3作品の表示順を保ち、新作を末尾に追加。日記から再視聴できる。初回も再視聴も新作は明示ボタンから音声と映像を開始。close/skip/deferred、playing/started、ended/completedを分離し完了を降格しない。pagehide、hidden、横向き注意で一時停止し、復帰時に勝手に音を再開しない。既存BGM停止連携を利用。動画は全画面領域でcontain表示し、9:16の文字や絵を切り落とさない。

v20原本は既存storeの初回退避機構で保全し、設定から書き出せる。既にある退避を上書きしないので『現在の庭の直前コピー』とは限らない。memoryには永続的退避はない。import/reset/restoreは既存の置換ルールを維持し、異なる庭の進捗を合算しない。quota/abort時は新達成を成功表示しない。

## 検査とレビュー
既存全Node/check/buildを維持。凍結公開v20 engine/storeで拒否を確認し、歴史版のID注入、0/1/34/35庭、単一庭100万回、同時2タブ、backup quota/abort/local失敗と再試行、旧backup非上書き、import/reset/restore、memory、lease、4作品順序、動画失敗・ended保存再試行を追加。

Chrome/WebKitは新作の実MP4再生と音声開始、320/375/402px、説明と操作の非重複・44px、pagehide/横向き停止、日記再視聴、実ended、再読込、未達成を検査し、既存保存管理・操作復帰も継続。WebKitはiPhone7/iOS15.8.8の実機検査とは別。利用者の実機目視・試聴は本人担当。

別担当との設計3往復に続き実装もレビュー。狭幅の操作重なりは新作限定のflow配置で修正、透明部分はpointer-events:none、pagehide/view障害時の停止とlistener解除、空のbirds配列でのimport名前参照fallbackを修正。

出力監査: docs/garden-tour-output-audit.json。前回sealed dist578ファイルを照合し、5実装ファイルとcache URL変更、および承認MP4追加だけを許可。既存動画3本、画像、その他音源は不変。

実装レビュー3往復の結果: 版境界と条件分離の確認→狭幅の操作重なり/pagehide/空active配列の指摘と修正→最終差分と検査行列の確認。別担当が関連35件を独立実行し全件成功。未完ブラウザと正式CIの成功を公開前条件とし、実機・主観的試聴の合格とは扱っていない。

初回PR CIではWebKit402の再視聴でcurrentTime値がほぼ0のままという検査失敗が発生。traceと実画像では後続場面を描画していた。製品はcurrentTimeに依存しないため、再視聴開始の検査をrequestVideoFrameCallbackによる複数フレーム提示とtrusted native endedへ変更し、自然終了・completed保存・再読込の条件を維持する。ケース除外や動画イベントの合成はしない。
