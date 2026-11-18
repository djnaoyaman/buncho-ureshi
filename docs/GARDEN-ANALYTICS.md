# 庭・天敵のGA4計測

対象: property 555087245 / stream 16336714371 / G-VVFMFGKXNL。既存 GTM-W9SQSCBT を維持。GA管理設定変更なし。

## 定義

- `garden_active_time`: 共通抽選クロックが受理した有効表示時間の累計が 3, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600 秒に達するごとに1回。非表示・非対象画面・中断・長いサンプル間隔・帰宅選択待ちは元のクロックと同じ扱い。抽選に必要な連続滞在時間とは別の、ページ内累計。
- `garden_predator_arrival`: 新しいカラス/猛禽の来訪が保存された後に1回。抽選当選やカラスの到着前警告では送らない。`predator_kind=crow|raptor`, `encounter_safety=safe|danger` は保存された来訪の実際の状態から判定。
- `garden_first_predator`: このゲームページで初めて成立した来訪に1回。`active_seconds` はそこまでの累計有効秒数。
- `garden_predator_outcome`: 猛禽への明示的な `stay`、`home`、`friendly` 化、活動終了 `ended`。カラス表示中の帰宅も `home`。保存成功後のみ送信。`ended` は終了一般であり死亡率とは解釈しない。
- `rule_version`: 実際の確率・再抽選間隔・危険な猛禽の間隔から生成する。PR #229 統合後のmainでは `entry_35_60_threat_86400_v1`。頻度担当の35%・60秒変更が入れば自動的に対応する版になる。これらの定数を本変更は変更しない。
- `measurement_scope=page`: 累積時計・初遭遇フラグ・送出上限はゲームのマウント単位。再読込ではリセットし、保存中の既存来訪は新規来訪として再送しない。復元した猛禽への選択結果は記録されるため、結果数と同ページ新規来訪数は一致するとは限らない。セッション横断の初遭遇時間ではない。

累計の `active_seconds` をイベント横断で合計して滞在時間にしない。初遭遇時間は `garden_first_predator` に絞って平均を取り、未遭遇ページも含めた傾向は節目ごとの到達数と来訪数を見る。1時間以降は節目を送らず、秒数は86400上限、全庭イベントは1マウント200件上限。

## プライバシーと送信制限

追加パラメータは固定列挙値・ルール版・制限付き整数のみ。氏名、文鳥名、自由文、保存ID、個体ID、庭ID、保存時刻、乱数は送信しない。比較用IDはトランザクション前後のメモリ内でのみ使用し、保存形式は変えない。送信例外は捕捉する。

既存を含む全計測は https://djnaoyaman.github.io/buncho-ureshi/ 配下だけ。庭イベントは /buncho-ureshi/game/ に限定。localhost、別host、webdriver、クエリ `qa` / `test` / `debug` / `analytics` のいずれかがある場合、または localStorage `buncho.analytics.disabled=1` の場合はタグの読込もイベントのキューも停止。QAクエリはsessionStorageに保持し、同じタブのページ移動でも停止を維持。ストレージ判定不能も停止する。本番の手動QAは必ず `?qa=1` を付けて新しく開く（既に読み込まれたタグは後から無効化できないため）。

## GA4の後日登録候補（今回は変更していない）

イベントスコープのカスタムディメンション: `predator_kind`, `encounter_safety`, `outcome`, `rule_version`, `measurement_scope`, `milestone_seconds`。
イベントスコープのカスタム指標: `active_seconds`（単位: 秒）。イベント数は標準指標を利用する。管理画面登録は別作業。

## 検査と公開ゲート

- 専用作業ツリー `buncho-analytics`、ブランチ `codex/garden-analytics-local`。初期基準 `8bb37a3bf6e255befc0a612298a385d0b475fea4`、PR #229 統合後の基準 `86ee58acad4564d8f33f0fc917b186ebe4ad011b`、開始時と再確認時のopen PRは0件。checkoutに `.agents/skills` は存在せず `AGENTS.md` を使用。
- 追加計測・天敵制御・実ホスト保存統合の集中検査54件成功。非表示/復帰、長時間中断、再読込、重複、保存失敗、計測例外を含む。Happy DOM / fake-indexeddb の結果はブラウザ確認ではない。
- 全Node・ビルド検査結果は最終作業報告を参照。保護出力581ファイルを元mainの独立ビルドと照合した差分は `garden-analytics-output-audit.json`。許可ソース以外はキャッシュURLだけの変更と機械比較し、新計測モジュールを保護対象に追加した。基準mainと候補を独立生成した出力比較に加え、保存成立箇所・乱数呼出し・定数不変を別途差分レビューした。
- Chrome系: 利用可能なChromiumは socket() Operation not permitted により起動前に失敗。Chrome for Testing配布zip取得にも失敗。WebKit本体は取得できたが共有ライブラリ不足で起動失敗。Safari実機は未検証（AGENTS.mdによりユーザー担当）。
- `npx playwright test -c playwright.analytics.config.js` と指定の天敵ブラウザ検査は、ブラウザ利用可能な環境で実行が必要。全外部リクエストを捕捉/遮断し、本番originのページ/素材はローカル候補に差し替える。実際の公開GTMスクリプトを用いた送出形式・送信先検査は、GitHub Actions run 44298555801 のChrome/WebKit双方で成功。G-VVFMFGKXNL、イベント名、数値パラメータ、ルール版を検証し、収集要求はすべて送信前に遮断した。初回端末案内・URL解決と非同期保存完了を待つ検査修正を含めた最終全体結果はPR #231の最新CIを参照。

公開は全必須CIの成功と、最終コミット・競合・差分の再確認後に行う。物理Safariの確認は自動WebKit検査と区別する。
